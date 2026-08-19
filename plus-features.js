(() => {
  const ACTIVE_STATUSES = new Set(["active", "trialing"]);
  const CACHE_MS = 30000;
  let cached = { value: null, checkedAt: 0 };

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3200);
    } else {
      alert(message);
    }
  }

  async function hasPlus({ force = false } = {}) {
    const now = Date.now();
    if (!force && cached.value !== null && now - cached.checkedAt < CACHE_MS) {
      return cached.value;
    }

    const client = window.PawPassBackend?.client;
    if (!client) {
      cached = { value: false, checkedAt: now };
      return false;
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      cached = { value: false, checkedAt: now };
      return false;
    }

    const { data, error } = await client
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    const value = ACTIVE_STATUSES.has(String(data?.status || "").toLowerCase());
    cached = { value, checkedAt: now };
    return value;
  }

  function isEmergencyNavigation(target) {
    return Boolean(target.closest('[data-view="emergency"]'));
  }

  function isHealthExport(target) {
    const button = target.closest("button");
    if (!button) return false;
    const row = button.closest(".setting-row");
    if (!row) return false;
    return /export health records/i.test(row.textContent || "") || /^export$/i.test(button.textContent.trim());
  }

  async function guardPremiumClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    let feature = null;
    if (isEmergencyNavigation(target)) feature = "Emergency tools and lost-pet sharing";
    else if (isHealthExport(target)) feature = "Health record export";
    if (!feature) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      if (await hasPlus()) {
        // Re-dispatch the same intent after verification, bypassing this guard once.
        if (isEmergencyNavigation(target)) {
          location.hash = "#emergency";
        } else {
          target.closest("button")?.click();
        }
        return;
      }
      showToast(`${feature} is included with PawPass Plus. Upgrade in Settings to unlock it.`);
      if (!location.hash.toLowerCase().includes("settings")) {
        setTimeout(() => { location.hash = "#settings"; }, 350);
      }
    } catch (error) {
      console.error("Could not verify PawPass Plus access", error);
      showToast("We couldn't verify your PawPass Plus access. Please try again.");
    }
  }

  // Capture before app.js handlers so locked features cannot run first.
  document.addEventListener("click", guardPremiumClick, true);

  window.PawPassPlus = {
    isActive: options => hasPlus(options),
    refresh: () => hasPlus({ force: true }),
    clearCache: () => { cached = { value: null, checkedAt: 0 }; }
  };
})();
