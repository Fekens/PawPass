(() => {
  const SUPPORT_PHONE_DISPLAY = "(863) 588-6620";
  const SUPPORT_PHONE_TEL = "+18635886620";

  function addSupport() {
    const view = document.getElementById("view");
    if (!view || !location.hash.toLowerCase().includes("settings")) return;
    const card = view.querySelector(".settings-card");
    if (!card || card.querySelector("[data-pawpass-support]")) return;

    const row = document.createElement("div");
    row.className = "setting-row";
    row.setAttribute("data-pawpass-support", "true");
    row.innerHTML = `
      <div>
        <b>PawPass Support</b>
        <small>Need help? Call or text ${SUPPORT_PHONE_DISPLAY}</small>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        <a class="link-btn" href="tel:${SUPPORT_PHONE_TEL}" aria-label="Call PawPass Support at ${SUPPORT_PHONE_DISPLAY}">Call</a>
        <a class="link-btn" href="sms:${SUPPORT_PHONE_TEL}" aria-label="Text PawPass Support at ${SUPPORT_PHONE_DISPLAY}">Text</a>
      </div>
    `;

    const logout = card.querySelector("#logout")?.closest(".setting-row");
    if (logout) card.insertBefore(row, logout);
    else card.appendChild(row);
  }

  const observer = new MutationObserver(addSupport);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(addSupport, 0));
  addSupport();
})();
