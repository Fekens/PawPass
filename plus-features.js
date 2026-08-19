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
    if (!force && cached.value !== null && now - cached.checkedAt < CACHE_MS) return cached.value;

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

  function exportButton(target) {
    const button = target.closest("button");
    if (!button) return null;
    const row = button.closest(".setting-row");
    if (!row) return null;
    return /export health records/i.test(row.textContent || "") || /^export$/i.test(button.textContent.trim()) ? button : null;
  }

  async function guardPremiumClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = exportButton(target);
    if (button?.dataset.plusVerified === "1") {
      delete button.dataset.plusVerified;
      return;
    }

    let feature = null;
    if (isEmergencyNavigation(target)) feature = "Emergency tools and lost-pet sharing";
    else if (button) feature = "Health record export";
    if (!feature) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      if (await hasPlus()) {
        if (isEmergencyNavigation(target)) {
          location.hash = "#emergency";
        } else if (button) {
          button.dataset.plusVerified = "1";
          button.click();
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

  document.addEventListener("click", guardPremiumClick, true);

  window.PawPassPlus = {
    isActive: options => hasPlus(options),
    refresh: () => hasPlus({ force: true }),
    clearCache: () => { cached = { value: null, checkedAt: 0 }; }
  };
})();
