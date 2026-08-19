(() => {
  const monthlyCheckoutButtonId = "pawpassPlusMonthlyCheckout";
  const yearlyCheckoutButtonId = "pawpassPlusYearlyCheckout";
  const plusRowId = "pawpassPlusRow";
  const statusRetryButtonId = "pawpassPlusStatusRetry";
  const params = new URLSearchParams(location.search);
  const checkoutState = params.get("checkout");
  const checkoutSucceeded = checkoutState === "success";
  const checkoutCancelled = checkoutState === "cancelled";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function removeProductionDemoReset() {
    if (window.PawPassBackend?.demo?.()) return;
    const resetButton = document.getElementById("resetData");
    resetButton?.closest(".setting-row")?.remove();
  }

  async function getSubscription() {
    const client = window.PawPassBackend?.client;
    if (!client) return null;
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;
    const { data, error } = await client.from("subscriptions").select("status,cancel_at_period_end,current_period_end").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  function isPlusActive(subscription) {
    return ["active", "trialing"].includes(String(subscription?.status || "").toLowerCase());
  }

  async function getSubscriptionWithRetry() {
    const attempts = checkoutSucceeded ? 8 : 1;
    let subscription = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      subscription = await getSubscription();
      if (isPlusActive(subscription)) return subscription;
      if (attempt < attempts - 1) await sleep(1000);
    }
    return subscription;
  }

  function ensurePlusRow() {
    const view = document.getElementById("view");
    if (!view || !location.hash.toLowerCase().includes("settings")) return null;
    const card = view.querySelector(".settings-card");
    if (!card) return null;
    let row = document.getElementById(plusRowId);
    if (!row) {
      row = document.createElement("div");
      row.id = plusRowId;
      row.className = "setting-row";
      card.prepend(row);
    }
    return row;
  }

  function renderPricingChoice(row) {
    row.innerHTML = `<div><b>PawPass Plus</b><small>Choose $4.99/month or $49.99/year (save $9.89/year)</small></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-ghost" id="${monthlyCheckoutButtonId}" type="button">$4.99/month</button><button class="btn btn-primary" id="${yearlyCheckoutButtonId}" type="button">$49.99/year</button></div>`;
  }

  function cleanCheckoutQuery() {
    if (!checkoutState) return;
    const url = new URL(location.href);
    url.searchParams.delete("checkout");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function showMessage(message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4200);
    } else alert(message);
  }

  async function injectUpgradeRow() {
    removeProductionDemoReset();
    const row = ensurePlusRow();
    if (!row) return;
    row.innerHTML = `<div><b>PawPass Plus</b><small>${checkoutSucceeded ? "Confirming your membership…" : "Checking your membership…"}</small></div><button class="btn btn-primary" type="button" disabled>Checking…</button>`;
    try {
      const subscription = await getSubscriptionWithRetry();
      if (isPlusActive(subscription)) {
        row.innerHTML = `<div><b>PawPass Plus</b><small>Your PawPass Plus membership is active</small></div><span class="status-pill">✓ Active</span>`;
        if (checkoutSucceeded) {
          showMessage("Payment successful — PawPass Plus is now active. Welcome to Plus!");
          cleanCheckoutQuery();
        }
        return;
      }
      if (checkoutSucceeded) {
        row.innerHTML = `<div><b>PawPass Plus</b><small>Your payment completed, but activation is still syncing. Please retry status in a moment.</small></div><button class="btn btn-ghost" id="${statusRetryButtonId}" type="button">Retry status</button>`;
        showMessage("Payment received. PawPass is still confirming your Plus membership.");
        return;
      }
      renderPricingChoice(row);
      if (checkoutCancelled) {
        showMessage("Checkout cancelled — you were not charged.");
        cleanCheckoutQuery();
      }
    } catch (error) {
      console.error("Could not check PawPass Plus status", error);
      row.innerHTML = `<div><b>PawPass Plus</b><small>We couldn't verify your membership yet.</small></div><button class="btn btn-ghost" id="${statusRetryButtonId}" type="button">Retry status</button>`;
    }
  }

  async function startCheckout(button, billingPeriod) {
    if (!window.PawPassBackend?.client) {
      showMessage("Payments are available only for signed-in PawPass accounts.");
      return;
    }
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Opening checkout…";
    try {
      const existing = await getSubscription();
      if (isPlusActive(existing)) {
        await injectUpgradeRow();
        return;
      }
      const { data, error } = await window.PawPassBackend.client.functions.invoke("create-checkout-session", { body: { billing_period: billingPeriod } });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Stripe Checkout did not return a payment link.");
      window.location.assign(data.url);
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      showMessage(error?.message || "Could not start checkout.");
    }
  }

  document.addEventListener("click", event => {
    const monthlyButton = event.target.closest(`#${monthlyCheckoutButtonId}`);
    if (monthlyButton) { startCheckout(monthlyButton, "month"); return; }
    const yearlyButton = event.target.closest(`#${yearlyCheckoutButtonId}`);
    if (yearlyButton) { startCheckout(yearlyButton, "year"); return; }
    if (event.target.closest(`#${statusRetryButtonId}`)) injectUpgradeRow();
  });

  window.addEventListener("hashchange", () => setTimeout(injectUpgradeRow, 0));
  new MutationObserver(() => {
    removeProductionDemoReset();
    if (!document.getElementById(plusRowId)) injectUpgradeRow();
  }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(injectUpgradeRow, 0);
})();
