(() => {
  const checkoutButtonId = "pawpassPlusCheckout";

  function injectUpgradeRow() {
    const view = document.getElementById("view");
    if (!view || !location.hash.toLowerCase().includes("settings")) return;
    const card = view.querySelector(".settings-card");
    if (!card || document.getElementById(checkoutButtonId)) return;

    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = `
      <div>
        <b>PawPass Plus</b>
        <small>Unlock PawPass Plus for $4.99/month</small>
      </div>
      <button class="btn btn-primary" id="${checkoutButtonId}" type="button">Upgrade</button>
    `;
    card.prepend(row);
  }

  async function startCheckout(button) {
    if (!window.PawPassBackend?.client) {
      throw new Error("Payments are available only for signed-in PawPass accounts.");
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Opening checkout…";

    try {
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
  new MutationObserver(injectUpgradeRow).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(injectUpgradeRow, 0);
})();
