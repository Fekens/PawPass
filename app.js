const seed = {
  user: { name: "Alex Morgan", email: "alex@pawpass.app" },
  selectedPetId: 1,
  pets: [{ id: 1, name: "Milo", species: "dog", animal: "🐕", breed: "Golden Retriever", age: "3 years", weight: "31 kg", birthday: "2023-05-14", sex: "Male", photo: "", microchip: "985 141 003 829 104", allergies: "None known", medications: "Heartworm prevention", vetName: "Greenwood Veterinary Clinic", vetPhone: "(555) 014-7297", medicalNotes: "Friendly and responds to his name.", status: "Healthy" }],
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
const dataStorageKey = "pawpass-data";
const sessionStorageKey = "pawpass-session";
const readStoredData = () => {
  try { return JSON.parse(localStorage.getItem(dataStorageKey) || "null"); }
  catch { return null; }
};
let state = PawPassBackend.demo() ? (readStoredData() || structuredClone(seed)) : structuredClone(seed);
// Keep authentication with the user's data as well as in the legacy standalone
// key.  Some existing PawPass sessions on Pages have the data key but lost the
// session key, which made a reload look like a logout.  The duplicated marker
// also lets those sessions repair the standalone key without touching pet data.
const hasSession = () => PawPassBackend.demo() && (state.authenticated === true || localStorage.getItem(sessionStorageKey) === "active");
const startSession = () => {
  state.authenticated = true;
  localStorage.setItem(sessionStorageKey, "active");
  save();
};
const endSession = () => {
  state.authenticated = false;
  localStorage.removeItem(sessionStorageKey);
  save();
};
let authMode = "signup";
const speciesEmoji = { dog:"🐕", cat:"🐈", bird:"🐦", other:"🐾" };
if (!Array.isArray(state.pets)) state.pets=[];
state.pets.forEach(p=>{ p.species ||= p.animal==="🐈"?"cat":p.animal==="🐦"?"bird":"dog"; p.animal ||= speciesEmoji[p.species]; });
if (!state.pets.some(p=>String(p.id)===String(state.selectedPetId))) state.selectedPetId=state.pets[0]?.id ?? null;

const $ = (s) => document.querySelector(s);
const save = () => {
  if (PawPassBackend.demo()) localStorage.setItem(dataStorageKey, JSON.stringify(state));
  else PawPassBackend.sync(state).catch(error => toast(error.message));
};
const toast = (message) => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2400); };
const viewName = () => (location.hash.replace("#","") || state.lastView || "dashboard").toLowerCase();
const esc = (text="") => String(text).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const selectedPet = () => state.pets.find(p=>String(p.id)===String(state.selectedPetId)) || state.pets[0];
const petVisual = p => p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}">` : esc(p.animal || speciesEmoji[p.species] || "🐾");

function buildNav(){
  const html = nav.map(n=>`<button class="nav-item" data-view="${n.toLowerCase()}"><span>${icons[n]}</span>${n}</button>`).join("");
  $("#sideNav").innerHTML=html; $("#mobileNav").innerHTML=html;
}
function renderPetSwitcher(){
  const box=$("#petSwitcher"), p=selectedPet();
  if(!p){ box.innerHTML=`<button class="side-add-pet" data-pet-add>+ Add your first pet</button>`; return; }
  box.innerHTML=`<div class="pet-avatar">${petVisual(p)}</div><label><span>Current pet</span><select id="activePet" aria-label="Select current pet">${state.pets.map(x=>`<option value="${x.id}" ${String(x.id)===String(p.id)?"selected":""}>${esc(x.name)}</option>`).join("")}</select><small>${esc(p.breed)}</small></label><button data-view="pets" aria-label="Manage pets">›</button>`;
}
function enterApp(){
  if (PawPassBackend.demo()) startSession();
  $("#welcome").classList.add("hidden"); $("#app").classList.remove("hidden");
  const route=viewName();
  if(!nav.some(n=>n.toLowerCase()===route)) location.hash="dashboard";
  else if(!location.hash && route!=="dashboard") location.hash=route;
  else render();
}
function openAuth(mode){
  authMode=mode; const signup=mode==="signup"; $("#authTitle").textContent=signup?"Create your account":"Welcome back";
  $("#authSubtitle").textContent=signup?"One simple home for a lifetime of care.":"Your pet's care plan is waiting.";
  $("#nameField").style.display=signup?"block":"none"; $("#forgotBtn").classList.toggle("hidden",signup); $("#authError").textContent=""; $("#authSubmit").textContent=signup?"Create account":"Log in";
  $("#switchAuth").innerHTML=signup?`Already have an account? <button data-switch="login">Log in</button>`:`New to PawPass? <button data-switch="signup">Create account</button>`;
  $("#authDialog").showModal();
}
function dateHeading(){ return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric"}).format(new Date()); }
function firstName(){ return state.user.name.split(" ")[0] || "there"; }
function taskRow(t){
  const theme = t.type==="Medication"||t.type==="Vaccination"?"coral":"mint";
  return `<div class="care-task ${t.done?"done":""}"><button class="complete" data-complete="${t.id}" aria-label="Mark ${esc(t.title)} complete">${t.done?"✓":""}</button><span class="type-icon ${theme}">${icons[t.type]||"◷"}</span><div class="task-info"><b>${esc(t.title)}</b><small>${esc(t.notes)}</small></div><div class="task-time"><b>${esc(t.time||"All day")}</b><small>${esc(t.date)}</small></div></div>`;
}
function petCard(p, manage=false){ const active=String(p.id)===String(state.selectedPetId); return `<article class="card pet-card ${active?"selected-pet":""}" data-pet-select="${p.id}"><div class="pet-card-top"><span>${petVisual(p)}</span><b class="health-badge">${active?"✓ Selected":"● "+esc(p.status||"Profile ready")}</b></div><div class="pet-details"><div><h3>${esc(p.name)}</h3><p>${esc(p.breed)} · ${esc(p.species||"")}</p></div><div class="pet-stats"><div><b>${esc(displayAge(p))}</b><small>AGE</small></div><div><b>${esc(p.weight)}</b><small>WEIGHT</small></div></div></div>${manage?`<footer class="pet-actions"><button class="link-btn" data-pet-edit="${p.id}">Edit</button><button class="link-btn danger" data-pet-delete="${p.id}">Delete</button></footer>`:""}</article>`; }
function displayAge(p){
  if(p.age) return p.age;
  if(!p.birthday) return "—";
  const dob=new Date(`${p.birthday}T12:00:00`), now=new Date(); let years=now.getFullYear()-dob.getFullYear(); if(now < new Date(now.getFullYear(),dob.getMonth(),dob.getDate())) years--; return years<1?"Under 1 year":`${years} year${years===1?"":"s"}`;
}
function dashboard(){
  const today=state.tasks.filter(t=>String(t.petId)===String(state.selectedPetId)&&t.date==="Today"), done=today.filter(t=>t.done).length, p=selectedPet(), name=p?.name||"your pet";
  return `<div class="dashboard-grid"><div><section class="welcome-card"><div><p class="eyebrow">YOUR DAILY PAWPRINT</p><h3>You're doing great, ${esc(firstName())}.</h3><p>${done===today.length?`${esc(name)}'s care is all wrapped up for today!`:`Just a few little things left on ${esc(name)}'s care plan today.`}</p></div><span class="welcome-pet">${p?petVisual(p):"🐾"}</span></section><div class="section-head"><div><h3>Today's care</h3><p>${done} of ${today.length} tasks complete</p></div><button class="link-btn" data-add="task">+ Add task</button></div><div class="task-list">${today.map(taskRow).join("")||`<div class="empty-state"><span>🐾</span><p>A clear day for happy adventures.</p></div>`}</div><div class="section-head"><div><h3>Coming up</h3><p>The next few things on your radar</p></div><button class="link-btn" data-view="schedule">Full schedule →</button></div><div class="task-list">${state.tasks.filter(t=>String(t.petId)===String(state.selectedPetId)&&t.date!=="Today").slice(0,3).map(taskRow).join("")}</div></div><aside class="side-column"><div class="section-head"><div><h3>Your pets</h3><p>Select a companion</p></div><button class="link-btn" data-pet-add>+ Add</button></div>${state.pets.map(p=>petCard(p)).join("")||`<div class="card empty-state"><p>Add a pet to begin.</p><button class="btn btn-primary" data-pet-add>+ Add a pet</button></div>`}<div class="section-head"><h3>Quick add</h3></div><div class="quick-grid"><button data-add="Medication"><span>💊</span>Medication</button><button data-add="Vet appointment"><span>🩺</span>Vet visit</button><button data-add="Feeding"><span>🥣</span>Feeding</button><button data-add="Grooming"><span>✦</span>Grooming</button></div></aside></div>`;
}
function pets(){ return `<div class="page-head"><div><h3>Your pets</h3><p>The lovely faces at the heart of your PawPass.</p></div><button class="btn btn-primary" data-pet-add>+ Add a pet</button></div><div class="pets-grid">${state.pets.map(p=>petCard(p,true)).join("")}<button class="card empty-state add-pet-card" data-pet-add><span>＋</span><h3>Another best friend?</h3><p>Add their profile to keep their care organized too.</p></button></div>`; }
function records(){ return `<div class="page-head"><div><h3>Health records</h3><p>Vaccinations, visits, and medical history in one safe place.</p></div><button class="btn btn-primary" data-add="Medical record">+ Add record</button></div><div class="records-grid">${state.records.filter(r=>String(r.petId)===String(state.selectedPetId)).map(r=>`<article class="card record"><div class="record-top"><span class="record-icon ${r.type==="Vaccination"?"coral":"mint"}">${icons[r.type]}</span><span class="status-pill">● Current</span></div><h4>${esc(r.title)}</h4><p>${esc(r.notes)}</p><footer><span>${esc(r.type)}</span><b>${esc(r.date)}</b></footer></article>`).join("")}</div>`; }
function schedule(){ const groups=["Medication","Vet appointment","Grooming","Feeding","Vaccination"]; return `<div class="page-head"><div><h3>Care schedule</h3><p>Every routine and reminder, beautifully organized.</p></div><button class="btn btn-primary" data-add="task">+ New reminder</button></div>${groups.map(g=>{const tasks=state.tasks.filter(t=>String(t.petId)===String(state.selectedPetId)&&t.type===g);return tasks.length?`<div class="section-head"><div><h3>${icons[g]} ${g}${g.endsWith("g")?"":"s"}</h3><p>${tasks.length} scheduled</p></div></div><div class="task-list">${tasks.map(taskRow).join("")}</div>`:""}).join("")}`; }
function emergency(){ const p=selectedPet(); if(!p)return `<div class="card empty-state"><span>🐾</span><h3>No pet selected</h3><p>Add a pet to create an emergency profile.</p><button class="btn btn-primary" data-pet-add>+ Add a pet</button></div>`; return `<div class="page-head"><div><h3>Lost-pet profile</h3><p>Important information ready to share when every second counts.</p></div><button class="btn btn-primary" id="shareEmergency">Share profile</button></div><section class="card emergency"><p class="eyebrow">IF I'M LOST, PLEASE HELP ME HOME</p><div class="emergency-grid"><div class="emergency-pet">${petVisual(p)}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.breed)} · ${esc(displayAge(p))} · ${esc(p.sex||"Sex unknown")}</p><div class="detail-grid"><div><small>OWNER</small><b>${esc(state.user.name)}</b></div><div><small>VETERINARIAN</small><b>${esc(p.vetPhone||p.vetName||"Not provided")}</b></div><div><small>MICROCHIP</small><b>${esc(p.microchip||"Not provided")}</b></div><div><small>ALLERGIES</small><b>${esc(p.allergies||"None listed")}</b></div></div></div></div></section><div class="section-head"><div><h3>Emergency notes</h3><p>Visible on the shared profile</p></div></div><div class="card settings-card"><p>${esc(p.medicalNotes||"No emergency notes have been added.")}</p></div>`; }
function settings(){ return `<div class="page-head"><div><h3>Settings</h3><p>Manage your account and PawPass preferences.</p></div></div><div class="card settings-card"><div class="setting-row"><div><b>Profile</b><small>${esc(state.user.name)} · ${esc(state.user.email)}</small></div><button class="link-btn">Edit</button></div><div class="setting-row"><div><b>Care notifications</b><small>Reminders are turned on</small></div><button class="link-btn">Manage</button></div><div class="setting-row"><div><b>Export health records</b><small>Download a portable copy of your pets' history</small></div><button class="link-btn" id="exportData">Export</button></div><div class="setting-row"><div><b>Reset demo data</b><small>Restore the original PawPass sample</small></div><button class="link-btn danger" id="resetData">Reset</button></div><div class="setting-row"><div><b>Log out</b><small>Return to the welcome page</small></div><button class="link-btn" id="logout">Log out</button></div></div>`; }
function render(){
  const route=viewName(), map={dashboard:dashboard,pets,health:records,schedule,emergency,settings};
  if(state.lastView!==route){ state.lastView=route; save(); }
  $("#dateLabel").textContent=dateHeading(); $("#pageTitle").textContent=route==="dashboard"?`Good morning, ${firstName()}`:nav.find(n=>n.toLowerCase()===route)||"PawPass";
  document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===route));
  $("#view").innerHTML=(map[route]||dashboard)();
  renderPetSwitcher();
}
function openItem(type="Medication") { const f=$("#itemForm"); f.reset(); f.elements.type.value=type==="task"?"Medication":type; f.elements.date.value=new Date().toISOString().slice(0,10); $("#itemDialog").showModal(); }
function openPetForm(id){
  const form=$("#petForm"), p=state.pets.find(x=>String(x.id)===String(id)); form.reset(); form.elements.id.value=p?.id||"";
  $("#petDialogTitle").textContent=p?`Edit ${p.name}`:"Add a pet"; $("#petFormError").textContent="";
  ["name","species","breed","birthday","age","sex","weight","microchip","allergies","medications","vetName","vetPhone","medicalNotes"].forEach(k=>form.elements[k].value=p?.[k]||"");
  form.dataset.photo=p?.photo||""; updatePhotoPreview(form.dataset.photo,p?.animal); $("#petDialog").showModal();
}
function updatePhotoPreview(photo, fallback="🐾"){ $("#photoPreview").innerHTML=photo?`<img src="${esc(photo)}" alt="Photo preview">`:esc(fallback||"🐾"); }

document.addEventListener("click",e=>{
  const auth=e.target.closest("[data-auth]"); if(auth) openAuth(auth.dataset.auth);
  if(e.target.closest("#demoBtn")){ PawPassBackend.setMode("demo"); state=readStoredData()||structuredClone(seed); normalizeState(); enterApp(); }
  const sw=e.target.closest("[data-switch]"); if(sw){ $("#authDialog").close(); openAuth(sw.dataset.switch); }
  const close=e.target.closest("[data-close]"); if(close) close.closest("dialog").close();
  const go=e.target.closest("[data-view]"); if(go) location.hash=go.dataset.view;
  const add=e.target.closest("[data-add]"); if(add) openItem(add.dataset.add);
  const addPet=e.target.closest("[data-pet-add]"); if(addPet) openPetForm();
  const editPet=e.target.closest("[data-pet-edit]"); if(editPet){ e.stopPropagation(); openPetForm(editPet.dataset.petEdit); }
  const deletePet=e.target.closest("[data-pet-delete]"); if(deletePet){ e.stopPropagation(); const p=state.pets.find(x=>String(x.id)===deletePet.dataset.petDelete); if(p&&confirm(`Delete ${p.name}'s profile? This cannot be undone.`)){ state.pets=state.pets.filter(x=>x!==p); state.tasks=state.tasks.filter(x=>String(x.petId)!==String(p.id)); state.records=state.records.filter(x=>String(x.petId)!==String(p.id)); delete state.emergency?.[p.id]; if(String(state.selectedPetId)===String(p.id))state.selectedPetId=state.pets[0]?.id??null; save();render();toast(`${p.name}'s profile deleted`); } }
  const selectPet=e.target.closest("[data-pet-select]"); if(selectPet&&!editPet&&!deletePet){ state.selectedPetId=state.pets.find(p=>String(p.id)===selectPet.dataset.petSelect)?.id;save();render();toast(`${selectedPet().name} selected`); }
  const complete=e.target.closest("[data-complete]"); if(complete){ const t=state.tasks.find(x=>x.id==complete.dataset.complete); t.done=!t.done; save(); render(); toast(t.done?"Nice work — task complete!":"Task moved back to your list"); }
  if(e.target.closest("#shareEmergency")){ navigator.clipboard?.writeText(location.href); toast("Emergency profile link copied"); }
  if(e.target.closest("#exportData")){ const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="pawpass-records.json";a.click();toast("Your records are ready"); }
  if(e.target.closest("#resetData")){ if(!PawPassBackend.demo()){toast("Reset is available only in demo mode");return;} state=structuredClone(seed);save();render();toast("Demo data restored"); }
  if(e.target.closest("#logout")){ PawPassBackend.signOut().catch(error=>toast(error.message)); if(PawPassBackend.demo()) endSession(); $("#app").classList.add("hidden");$("#welcome").classList.remove("hidden");history.replaceState(null,"",location.pathname+location.search); }
});
document.addEventListener("change",e=>{ if(e.target.id==="activePet"){state.selectedPetId=state.pets.find(p=>String(p.id)===e.target.value)?.id;save();render();toast(`${selectedPet().name} selected`);} });
$("#petForm").elements.photo.addEventListener("change",e=>{ const file=e.target.files[0]; if(!file)return; if(!file.type.startsWith("image/")){ $("#petFormError").textContent="Please choose an image file.";e.target.value="";return;} if(file.size>2*1024*1024){$("#petFormError").textContent="Please choose a photo smaller than 2 MB.";e.target.value="";return;} const reader=new FileReader();reader.onload=()=>{$("#petForm").dataset.photo=reader.result;updatePhotoPreview(reader.result);};reader.readAsDataURL(file); });
$("#petForm").addEventListener("submit",e=>{e.preventDefault();const form=e.target,f=new FormData(form), birthday=f.get("birthday"),age=f.get("age").trim();if(!birthday&&!age){$("#petFormError").textContent="Enter a date of birth or an age.";form.elements.birthday.focus();return;}const id=f.get("id"), existing=state.pets.find(p=>String(p.id)===String(id));const pet={...(existing||{}),id:existing?.id||Date.now(),name:f.get("name").trim(),species:f.get("species"),animal:speciesEmoji[f.get("species")],breed:f.get("breed").trim(),birthday,age,sex:f.get("sex"),weight:f.get("weight").trim(),photo:form.dataset.photo||"",microchip:f.get("microchip").trim(),allergies:f.get("allergies").trim(),medications:f.get("medications").trim(),vetName:f.get("vetName").trim(),vetPhone:f.get("vetPhone").trim(),medicalNotes:f.get("medicalNotes").trim(),status:existing?.status||"Profile ready"};if(existing)Object.assign(existing,pet);else state.pets.push(pet);state.selectedPetId=pet.id;save();$("#petDialog").close();render();toast(existing?`${pet.name}'s profile updated`:`${pet.name} joined PawPass!`);});
$("#authForm").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.target),button=e.target.querySelector("button[type=submit]"); button.disabled=true; $("#authError").textContent=""; try { if(authMode==="signup"){ const result=await PawPassBackend.signUp(fd.get("name").trim(),fd.get("email"),fd.get("password")); if(result.needsConfirmation){ $("#authDialog").close(); toast("Check your email to confirm your account"); return; } } else await PawPassBackend.signIn(fd.get("email"),fd.get("password")); const boot=await PawPassBackend.init(); state=boot.data||{user:{name:fd.get("name")||"Pet parent",email:fd.get("email")},selectedPetId:null,pets:[],tasks:[],records:[],emergency:{}}; normalizeState(); $("#authDialog").close(); enterApp(); toast(authMode==="signup"?"Welcome to PawPass!":"Welcome back!"); } catch(error){ $("#authError").textContent=error.message; } finally {button.disabled=false;} });
$("#itemForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target),type=f.get("type"),raw=f.get("date"),d=new Date(raw+"T12:00:00"),today=new Date();let label=d.toDateString()===today.toDateString()?"Today":d.toLocaleDateString("en-US",{month:"short",day:"numeric"});let time=f.get("time")?new Date(`2000-01-01T${f.get("time")}`).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"All day";const item={id:Date.now(),petId:state.selectedPetId,type,title:f.get("title"),date:label,time,notes:f.get("notes")||"No additional notes"};if(type==="Medical record"||type==="Vaccination")state.records.unshift(item);else state.tasks.push({...item,done:false});save();$("#itemDialog").close();render();toast(`${type} added to ${(selectedPet()?.name || "your pet")}'s care plan`);});
window.addEventListener("hashchange",()=>{ if(hasSession()) render(); });
function normalizeState(){
  state.pets ||= []; state.tasks ||= []; state.records ||= []; state.emergency ||= {};
  state.pets.forEach(p=>{ p.species ||= p.animal==="🐈"?"cat":p.animal==="🐦"?"bird":"dog"; p.animal ||= speciesEmoji[p.species]; });
  state.tasks.forEach(t=>t.petId ??= state.selectedPetId); state.records.forEach(r=>{r.id ||= Date.now()+Math.floor(Math.random()*1000);r.petId ??= state.selectedPetId;});
  if (!state.pets.some(p=>String(p.id)===String(state.selectedPetId))) state.selectedPetId=state.pets[0]?.id??null;
}
$("#forgotBtn").addEventListener("click",()=>{$("#authDialog").close();$("#resetDialog").showModal();});
$("#resetForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);try{if($("#newPasswordField").classList.contains("hidden")){await PawPassBackend.forgot(f.get("email"));$("#resetDialog").close();toast("Check your email for a reset link");}else{await PawPassBackend.resetPassword(f.get("password"));$("#resetDialog").close();toast("Password updated — you can continue");}}catch(error){$("#resetError").textContent=error.message;}});
async function boot(){buildNav();normalizeState();if(hasSession()){enterApp();return;}try{const result=await PawPassBackend.init();if(result.user&&result.data){state=result.data;normalizeState();enterApp();}if(location.hash.includes("type=recovery")||new URLSearchParams(location.search).get("type")==="recovery"){$("#resetEmailField").classList.add("hidden");$("#newPasswordField").classList.remove("hidden");$("#resetTitle").textContent="Choose a new password";$("#resetForm button").textContent="Update password";$("#resetDialog").showModal();}}catch(error){toast(error.message);}}
boot();
