(() => {
  const SUPPORT_PHONE_DISPLAY = "(407) 504-7466";
  const SUPPORT_PHONE_TEL = "+14075047466";

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
      <a class="link-btn" href="tel:${SUPPORT_PHONE_TEL}" aria-label="Call PawPass Support at ${SUPPORT_PHONE_DISPLAY}">Call</a>
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
