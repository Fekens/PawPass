const seed = {
  user: { name: "Alex Morgan", email: "alex@pawpass.app" },
  pets: [{ id: 1, name: "Milo", animal: "🐕", breed: "Golden Retriever", age: "3 years", weight: "31 kg", birthday: "May 14, 2023", microchip: "985 141 003 829 104", status: "Healthy" }],
  tasks: [
    { id: 1, type: "Medication", title: "Heartworm tablet", date: "Today", time: "8:00 AM", notes: "Give with breakfast", done: true },
    { id: 2, type: "Feeding", title: "Evening meal", date: "Today", time: "6:30 PM", notes: "2 cups of dry food", done: false },
    { id: 3, type: "Grooming", title: "Brush Milo's coat", date: "Today", time: "7:00 PM", notes: "Focus behind the ears", done: false },
    { id: 4, type: "Medication", title: "Flea & tick prevention", date: "Tomorrow", time: "9:00 AM", notes: "Monthly topical treatment", done: false },
    { id: 5, type: "Vet appointment", title: "Annual wellness visit", date: "Aug 15", time: "10:30 AM", notes: "Greenwood Veterinary Clinic", done: false }
  ],
  records: [
    { type: "Vaccination", title: "Rabies vaccine", date: "May 14, 2026", notes: "Valid through May 2029 · Greenwood Veterinary Clinic" },
    { type: "Vaccination", title: "DHPP booster", date: "May 14, 2026", notes: "Next booster due May 2027" },
    { type: "Medical record", title: "Annual wellness exam", date: "Aug 18, 2025", notes: "Excellent overall health · 31 kg" }
  ]
};

const icons = { Dashboard:"⌂", Pets:"♧", Health:"✚", Schedule:"◷", Emergency:"⌖", Settings:"⚙", Medication:"💊", Feeding:"🥣", Grooming:"✦", "Vet appointment":"🩺", Vaccination:"💉", "Medical record":"📋" };
const nav = ["Dashboard","Pets","Health","Schedule","Emergency","Settings"];
let state = JSON.parse(localStorage.getItem("pawpass-data") || "null") || structuredClone(seed);
let authMode = "signup";

const $ = (s) => document.querySelector(s);
const save = () => localStorage.setItem("pawpass-data", JSON.stringify(state));
const toast = (message) => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2400); };
const viewName = () => (location.hash.replace("#","") || "dashboard").toLowerCase();
const esc = (text="") => String(text).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

function buildNav(){
  const html = nav.map(n=>`<button class="nav-item" data-view="${n.toLowerCase()}"><span>${icons[n]}</span>${n}</button>`).join("");
  $("#sideNav").innerHTML=html; $("#mobileNav").innerHTML=html;
}
function enterApp(){ $("#welcome").classList.add("hidden"); $("#app").classList.remove("hidden"); if(!location.hash) location.hash="dashboard"; render(); }
function openAuth(mode){
  authMode=mode; const signup=mode==="signup"; $("#authTitle").textContent=signup?"Create your account":"Welcome back";
  $("#authSubtitle").textContent=signup?"One simple home for a lifetime of care.":"Your pet's care plan is waiting.";
  $("#nameField").style.display=signup?"block":"none"; $("#authSubmit").textContent=signup?"Create account":"Log in";
  $("#switchAuth").innerHTML=signup?`Already have an account? <button data-switch="login">Log in</button>`:`New to PawPass? <button data-switch="signup">Create account</button>`;
  $("#authDialog").showModal();
}
function dateHeading(){ return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric"}).format(new Date()); }
function firstName(){ return state.user.name.split(" ")[0] || "there"; }
function taskRow(t){
  const theme = t.type==="Medication"||t.type==="Vaccination"?"coral":"mint";
  return `<div class="care-task ${t.done?"done":""}"><button class="complete" data-complete="${t.id}" aria-label="Mark ${esc(t.title)} complete">${t.done?"✓":""}</button><span class="type-icon ${theme}">${icons[t.type]||"◷"}</span><div class="task-info"><b>${esc(t.title)}</b><small>${esc(t.notes)}</small></div><div class="task-time"><b>${esc(t.time||"All day")}</b><small>${esc(t.date)}</small></div></div>`;
}
function petCard(p){ return `<article class="card pet-card"><div class="pet-card-top"><span>${p.animal}</span><b class="health-badge">● ${esc(p.status)}</b></div><div class="pet-details"><div><h3>${esc(p.name)}</h3><p>${esc(p.breed)}</p></div><div class="pet-stats"><div><b>${esc(p.age)}</b><small>AGE</small></div><div><b>${esc(p.weight)}</b><small>WEIGHT</small></div></div></div></article>`; }
function dashboard(){
  const today=state.tasks.filter(t=>t.date==="Today"), done=today.filter(t=>t.done).length;
  return `<div class="dashboard-grid"><div><section class="welcome-card"><div><p class="eyebrow">YOUR DAILY PAWPRINT</p><h3>You're doing great, ${esc(firstName())}.</h3><p>${done===today.length?"Milo's care is all wrapped up for today!":"Just a few little things left on Milo's care plan today."}</p></div><span class="welcome-pet">🐕</span></section><div class="section-head"><div><h3>Today's care</h3><p>${done} of ${today.length} tasks complete</p></div><button class="link-btn" data-add="task">+ Add task</button></div><div class="task-list">${today.map(taskRow).join("")||`<div class="empty-state"><span>🐾</span><p>A clear day for happy adventures.</p></div>`}</div><div class="section-head"><div><h3>Coming up</h3><p>The next few things on your radar</p></div><button class="link-btn" data-view="schedule">Full schedule →</button></div><div class="task-list">${state.tasks.filter(t=>t.date!=="Today").slice(0,3).map(taskRow).join("")}</div></div><aside class="side-column"><div class="section-head"><div><h3>Your companion</h3><p>Everything looks good</p></div></div>${state.pets.map(petCard).join("")}<div class="section-head"><h3>Quick add</h3></div><div class="quick-grid"><button data-add="Medication"><span>💊</span>Medication</button><button data-add="Vet appointment"><span>🩺</span>Vet visit</button><button data-add="Feeding"><span>🥣</span>Feeding</button><button data-add="Grooming"><span>✦</span>Grooming</button></div></aside></div>`;
}
function pets(){ return `<div class="page-head"><div><h3>Your pets</h3><p>The lovely faces at the heart of your PawPass.</p></div><button class="btn btn-primary" id="addPet">+ Add a pet</button></div><div class="pets-grid">${state.pets.map(petCard).join("")}<article class="card empty-state"><span>＋</span><h3>Another best friend?</h3><p>Add their profile to keep their care organized too.</p></article></div>`; }
function records(){ return `<div class="page-head"><div><h3>Health records</h3><p>Vaccinations, visits, and medical history in one safe place.</p></div><button class="btn btn-primary" data-add="Medical record">+ Add record</button></div><div class="records-grid">${state.records.map(r=>`<article class="card record"><div class="record-top"><span class="record-icon ${r.type==="Vaccination"?"coral":"mint"}">${icons[r.type]}</span><span class="status-pill">● Current</span></div><h4>${esc(r.title)}</h4><p>${esc(r.notes)}</p><footer><span>${esc(r.type)}</span><b>${esc(r.date)}</b></footer></article>`).join("")}</div>`; }
function schedule(){ const groups=["Medication","Vet appointment","Grooming","Feeding","Vaccination"]; return `<div class="page-head"><div><h3>Care schedule</h3><p>Every routine and reminder, beautifully organized.</p></div><button class="btn btn-primary" data-add="task">+ New reminder</button></div>${groups.map(g=>{const tasks=state.tasks.filter(t=>t.type===g);return tasks.length?`<div class="section-head"><div><h3>${icons[g]} ${g}${g.endsWith("g")?"":"s"}</h3><p>${tasks.length} scheduled</p></div></div><div class="task-list">${tasks.map(taskRow).join("")}</div>`:""}).join("")}`; }
function emergency(){ const p=state.pets[0]; return `<div class="page-head"><div><h3>Lost-pet profile</h3><p>Important information ready to share when every second counts.</p></div><button class="btn btn-primary" id="shareEmergency">Share profile</button></div><section class="card emergency"><p class="eyebrow">IF I'M LOST, PLEASE HELP ME HOME</p><div class="emergency-grid"><div class="emergency-pet">${p.animal}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.breed)} · ${esc(p.age)} · Friendly</p><div class="detail-grid"><div><small>OWNER</small><b>${esc(state.user.name)}</b></div><div><small>CALL ANYTIME</small><b>(555) 014-PAWS</b></div><div><small>MICROCHIP</small><b>${esc(p.microchip)}</b></div><div><small>HOME AREA</small><b>North Greenwood</b></div></div></div></div></section><div class="section-head"><div><h3>Emergency notes</h3><p>Visible on the shared profile</p></div></div><div class="card settings-card"><p>Milo is friendly and responds to his name. He may be nervous around traffic. Please call Alex immediately and offer water if it is safe to do so.</p></div>`; }
function settings(){ return `<div class="page-head"><div><h3>Settings</h3><p>Manage your account and PawPass preferences.</p></div></div><div class="card settings-card"><div class="setting-row"><div><b>Profile</b><small>${esc(state.user.name)} · ${esc(state.user.email)}</small></div><button class="link-btn">Edit</button></div><div class="setting-row"><div><b>Care notifications</b><small>Reminders are turned on</small></div><button class="link-btn">Manage</button></div><div class="setting-row"><div><b>Export health records</b><small>Download a portable copy of Milo's history</small></div><button class="link-btn" id="exportData">Export</button></div><div class="setting-row"><div><b>Reset demo data</b><small>Restore the original PawPass sample</small></div><button class="link-btn danger" id="resetData">Reset</button></div><div class="setting-row"><div><b>Log out</b><small>Return to the welcome page</small></div><button class="link-btn" id="logout">Log out</button></div></div>`; }
function render(){
  const route=viewName(), map={dashboard:dashboard,pets,health:records,schedule,emergency,settings};
  $("#dateLabel").textContent=dateHeading(); $("#pageTitle").textContent=route==="dashboard"?`Good morning, ${firstName()}`:nav.find(n=>n.toLowerCase()===route)||"PawPass";
  document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===route));
  $("#view").innerHTML=(map[route]||dashboard)();
}
function openItem(type="Medication") { const f=$("#itemForm"); f.reset(); f.elements.type.value=type==="task"?"Medication":type; f.elements.date.value=new Date().toISOString().slice(0,10); $("#itemDialog").showModal(); }

document.addEventListener("click",e=>{
  const auth=e.target.closest("[data-auth]"); if(auth) openAuth(auth.dataset.auth);
  if(e.target.closest("#demoBtn")) enterApp();
  const sw=e.target.closest("[data-switch]"); if(sw){ $("#authDialog").close(); openAuth(sw.dataset.switch); }
  const close=e.target.closest("[data-close]"); if(close) close.closest("dialog").close();
  const go=e.target.closest("[data-view]"); if(go) location.hash=go.dataset.view;
  const add=e.target.closest("[data-add]"); if(add) openItem(add.dataset.add);
  const complete=e.target.closest("[data-complete]"); if(complete){ const t=state.tasks.find(x=>x.id==complete.dataset.complete); t.done=!t.done; save(); render(); toast(t.done?"Nice work — task complete!":"Task moved back to your list"); }
  if(e.target.closest("#shareEmergency")){ navigator.clipboard?.writeText(location.href); toast("Emergency profile link copied"); }
  if(e.target.closest("#exportData")){ const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="pawpass-records.json";a.click();toast("Your records are ready"); }
  if(e.target.closest("#resetData")){ state=structuredClone(seed);save();render();toast("Demo data restored"); }
  if(e.target.closest("#logout")){ $("#app").classList.add("hidden");$("#welcome").classList.remove("hidden");history.replaceState(null,"",location.pathname); }
  if(e.target.closest("#addPet")) toast("Pet profile creator is next on our care plan");
});
$("#authForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.target);if(authMode==="signup"&&fd.get("name"))state.user.name=fd.get("name");state.user.email=fd.get("email");save();$("#authDialog").close();enterApp();toast(authMode==="signup"?"Welcome to PawPass!":"Welcome back!");});
$("#itemForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target),type=f.get("type"),raw=f.get("date"),d=new Date(raw+"T12:00:00"),today=new Date();let label=d.toDateString()===today.toDateString()?"Today":d.toLocaleDateString("en-US",{month:"short",day:"numeric"});let time=f.get("time")?new Date(`2000-01-01T${f.get("time")}`).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"All day";const item={type,title:f.get("title"),date:label,time,notes:f.get("notes")||"No additional notes"};if(type==="Medical record"||type==="Vaccination")state.records.unshift(item);else state.tasks.push({...item,id:Date.now(),done:false});save();$("#itemDialog").close();render();toast(`${type} added to Milo's care plan`);});
window.addEventListener("hashchange",render); buildNav();
