(() => {
  const checkoutButtonId = "pawpassPlusCheckout";

  async function getSubscription() {
    const client = window.PawPassBackend?.client;
    if (!client) return null;

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await client
      .from("subscriptions")
      .select("status,cancel_at_period_end,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  function isPlusActive(subscription) {
    return ["active", "trialing"].includes(String(subscription?.status || "").toLowerCase());
  }

  async function injectUpgradeRow() {
    const view = document.getElementById("view");
    if (!view || !location.hash.toLowerCase().includes("settings")) return;
    const card = view.querySelector(".settings-card");
    if (!card) return;

    let row = document.getElementById("pawpassPlusRow");
    if (!row) {
      row = document.createElement("div");
      row.id = "pawpassPlusRow";
      row.className = "setting-row";
      card.prepend(row);
    }

    row.innerHTML = `
      <div>
        <b>PawPass Plus</b>
        <small>Checking your membership…</small>
      </div>
      <button class="btn btn-primary" id="${checkoutButtonId}" type="button" disabled>Checking…</button>
    `;

    try {
      const subscription = await getSubscription();
      if (isPlusActive(subscription)) {
        row.innerHTML = `
          <div>
            <b>PawPass Plus</b>
            <small>Your PawPass Plus membership is active</small>
          </div>
          <span class="status-pill">✓ Active</span>
        `;
      } else {
        row.innerHTML = `
          <div>
            <b>PawPass Plus</b>
            <small>Unlock PawPass Plus for $4.99/month</small>
          </div>
          <button class="btn btn-primary" id="${checkoutButtonId}" type="button">Upgrade</button>
        `;
      }
    } catch (error) {
      console.error("Could not check PawPass Plus status", error);
      row.innerHTML = `
        <div>
          <b>PawPass Plus</b>
          <small>Could not verify membership. Refresh and try again.</small>
        </div>
        <button class="btn btn-primary" id="${checkoutButtonId}" type="button">Upgrade</button>
      `;
    }
  }

  async function startCheckout(button) {
    if (!window.PawPassBackend?.client) {
      throw new Error("Payments are available only for signed-in PawPass accounts.");
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

      const { data, error } = await window.PawPassBackend.client.functions.invoke("create-checkout-session", {
        body: {}
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Stripe Checkout did not return a payment link.");
      window.location.assign(data.url);
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      const message = error?.message || "Could not start checkout.";
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3200);
      } else {
        alert(message);
      }
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest(`#${checkoutButtonId}`);
    if (button) startCheckout(button);
  });

  window.addEventListener("hashchange", () => setTimeout(injectUpgradeRow, 0));
  new MutationObserver(() => {
    if (!document.getElementById("pawpassPlusRow")) injectUpgradeRow();
  }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(injectUpgradeRow, 0);
})();
