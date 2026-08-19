(() => {
  const STORAGE_KEY = "pawpass-plus-smart-reminders";
  const CARD_ID = "pawpassSmartReminders";
  const styles = document.createElement("style");
  styles.textContent = `
    .smart-reminders-card{margin:20px 0;padding:22px;border-radius:20px;background:linear-gradient(135deg,#fff7f0,#f6fbff);border:1px solid rgba(0,0,0,.06)}
    .smart-reminders-head{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:14px}.smart-reminders-head h3{margin:0}.smart-reminders-head p{margin:4px 0 0;color:#6b7280}
    .smart-reminders-list{display:grid;gap:10px}.smart-reminder{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,.06)}
    .smart-reminder small{display:block;color:#6b7280;margin-top:3px}.smart-reminder-actions{display:flex;gap:8px}.smart-reminders-empty{padding:18px;text-align:center;color:#6b7280;background:#fff;border-radius:14px}
    .smart-reminders-badge{font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;background:#e9fff2;color:#176b3a}
    .smart-reminder-form{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-top:14px}.smart-reminder-form input,.smart-reminder-form select{padding:10px;border:1px solid #d7dbe0;border-radius:10px;background:#fff}
    @media(max-width:760px){.smart-reminder-form{grid-template-columns:1fr}.smart-reminders-head,.smart-reminder{align-items:flex-start}.smart-reminder{flex-direction:column}.smart-reminder-actions{width:100%}}
  `;
  document.head.appendChild(styles);

  const esc = (text="") => String(text).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const write = value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  const cadenceLabel = value => ({daily:"Every day",weekly:"Every week",monthly:"Every month"}[value] || value);

  function nextDue(reminder) {
    const [h,m] = String(reminder.time || "09:00").split(":").map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(h || 0, m || 0, 0, 0);
    if (reminder.cadence === "daily" && next <= now) next.setDate(next.getDate()+1);
    if (reminder.cadence === "weekly") {
      const target = Number(reminder.day || 0);
      let add = (target - now.getDay() + 7) % 7;
      if (add === 0 && next <= now) add = 7;
      next.setDate(now.getDate()+add);
    }
    if (reminder.cadence === "monthly") {
      const targetDay = Math.max(1, Math.min(28, Number(reminder.day || 1)));
      next.setDate(targetDay);
      if (next <= now) { next.setMonth(next.getMonth()+1); next.setDate(targetDay); }
    }
    return next;
  }

  async function render() {
    if (!location.hash.toLowerCase().includes("schedule")) return;
    const view = document.getElementById("view");
    if (!view || document.getElementById(CARD_ID)) return;
    let active = false;
    try { active = await window.PawPassPlus?.isActive(); } catch { return; }
    if (!active) return;

    const reminders = read();
    const card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "smart-reminders-card";
    card.innerHTML = `
      <div class="smart-reminders-head">
        <div><span class="smart-reminders-badge">PAWPASS PLUS</span><h3>Advanced care reminders</h3><p>Create recurring daily, weekly, or monthly reminders.</p></div>
      </div>
      <div class="smart-reminders-list">
        ${reminders.length ? reminders.map(r=>`<div class="smart-reminder" data-smart-id="${esc(r.id)}"><div><b>${esc(r.title)}</b><small>${esc(cadenceLabel(r.cadence))} · ${esc(r.time || "09:00")} · Next: ${esc(nextDue(r).toLocaleString([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))}</small></div><div class="smart-reminder-actions"><button class="btn btn-ghost" data-smart-delete="${esc(r.id)}">Delete</button></div></div>`).join("") : `<div class="smart-reminders-empty">No recurring reminders yet.</div>`}
      </div>
      <form class="smart-reminder-form" id="smartReminderForm">
        <input name="title" required maxlength="80" placeholder="e.g. Heartworm medication">
        <select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
        <input name="time" type="time" value="09:00" required>
        <button class="btn btn-primary" type="submit">+ Add recurring</button>
      </form>`;
    view.prepend(card);
  }

  document.addEventListener("submit", event => {
    const form = event.target.closest("#smartReminderForm");
    if (!form) return;
    event.preventDefault();
    const fd = new FormData(form);
    const reminders = read();
    reminders.push({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title:String(fd.get("title")||"").trim(), cadence:String(fd.get("cadence")||"daily"), time:String(fd.get("time")||"09:00"), day:new Date().getDay()});
    write(reminders);
    document.getElementById(CARD_ID)?.remove();
    render();
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-smart-delete]");
    if (!button) return;
    write(read().filter(r=>String(r.id)!==String(button.dataset.smartDelete)));
    document.getElementById(CARD_ID)?.remove();
    render();
  });

  new MutationObserver(()=>render()).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("hashchange",()=>setTimeout(render,0));
  setTimeout(render,0);
})();
