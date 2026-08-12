/* Production persistence/auth adapter. Demo mode never contacts Supabase. */
window.PawPassBackend = (() => {
  const cfg = window.PAWPASS_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  let mode = localStorage.getItem("pawpass-mode") || "cloud";
  let user = null;
  const demo = () => mode === "demo";
  const setMode = value => { mode = value; localStorage.setItem("pawpass-mode", value); };
  const assertCloud = () => { if (!client) throw new Error("Production accounts are not configured. Use Explore the demo or configure Supabase."); };
  const message = error => { throw new Error(error?.message || "PawPass could not reach the server."); };

  async function init() {
    if (demo()) return { mode, user: null, data: null };
    if (!client) return { mode, user: null, data: null };
    const { data, error } = await client.auth.getSession(); if (error) message(error);
    user = data.session?.user || null;
    return { mode, user, data: user ? await load() : null };
  }
  async function signUp(name, email, password) {
    assertCloud(); setMode("cloud");
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { name } } });
    if (error) message(error); user = data.user;
    return { user, session: data.session, needsConfirmation: !data.session };
  }
  async function signIn(email, password) {
    assertCloud(); setMode("cloud"); const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) message(error); user = data.user; return data;
  }
  async function signOut() { if (client && !demo()) { const { error } = await client.auth.signOut(); if (error) message(error); } user = null; }
  async function forgot(email) { assertCloud(); const redirectTo = `${location.origin}${location.pathname}`; const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo }); if (error) message(error); }
  async function resetPassword(password) { assertCloud(); const { error } = await client.auth.updateUser({ password }); if (error) message(error); }

  async function load() {
    const tables = ["profiles", "user_settings", "pets", "health_records", "schedules", "emergency_data"];
    const results = await Promise.all(tables.map(table => client.from(table).select("*").then(({data,error}) => { if(error) message(error); return data; })));
    const [profiles, settings, pets, records, tasks, emergency] = results;
    const profile = profiles[0] || {};
    return {
      user: { name: profile.name || user.user_metadata?.name || "Pet parent", email: user.email },
      selectedPetId: settings[0]?.selected_pet_id || pets[0]?.id || null,
      lastView: settings[0]?.last_view || "dashboard",
      pets: pets.map(p => ({ id:p.id,name:p.name,species:p.species,animal:p.animal,breed:p.breed,age:p.age,weight:p.weight,birthday:p.birthday,sex:p.sex,photo:p.photo_url||"",microchip:p.microchip||"",allergies:p.allergies||"",medications:p.medications||"",vetName:p.vet_name||"",vetPhone:p.vet_phone||"",medicalNotes:p.medical_notes||"",status:p.status })),
      records: records.map(r => ({ id:r.id,petId:r.pet_id,type:r.record_type,title:r.title,date:r.record_date,notes:r.notes })),
      tasks: tasks.map(t => ({ id:t.id,petId:t.pet_id,type:t.schedule_type,title:t.title,date:t.display_date,time:t.display_time,scheduledAt:t.scheduled_at,notes:t.notes,done:t.done })),
      emergency: Object.fromEntries(emergency.map(e => [e.pet_id, { contactName:e.contact_name,contactPhone:e.contact_phone,notes:e.notes }]))
    };
  }
  async function sync(state) {
    if (demo() || !client || !user) return;
    const uid=user.id, petIds=state.pets.map(p=>p.id);
    const petResult = state.pets.length ? await client.from("pets").upsert(state.pets.map(p=>({id:p.id,user_id:uid,name:p.name,species:p.species,animal:p.animal,breed:p.breed,age:p.age||null,weight:p.weight,birthday:p.birthday||null,sex:p.sex,photo_url:p.photo||null,microchip:p.microchip||null,allergies:p.allergies||null,medications:p.medications||null,vet_name:p.vetName||null,vet_phone:p.vetPhone||null,medical_notes:p.medicalNotes||null,status:p.status}))) : {};
    if (petResult.error) message(petResult.error);
    const operations = [
      client.from("profiles").upsert({id:uid,name:state.user.name}),
      client.from("user_settings").upsert({user_id:uid,selected_pet_id:state.selectedPetId||null,last_view:state.lastView||"dashboard"}),
      state.records.length ? client.from("health_records").upsert(state.records.map(r=>({id:r.id,user_id:uid,pet_id:r.petId,record_type:r.type,title:r.title,record_date:r.date,notes:r.notes}))) : Promise.resolve({}),
      state.tasks.length ? client.from("schedules").upsert(state.tasks.map(t=>({id:t.id,user_id:uid,pet_id:t.petId,schedule_type:t.type,title:t.title,display_date:t.date,display_time:t.time,scheduled_at:t.scheduledAt||null,notes:t.notes,done:t.done}))) : Promise.resolve({}),
      state.pets.length ? client.from("emergency_data").upsert(state.pets.map(p=>({pet_id:p.id,user_id:uid,contact_name:state.user.name,contact_phone:p.vetPhone||null,notes:p.medicalNotes||null}))) : Promise.resolve({})
    ];
    const results=await Promise.all(operations); const failure=results.find(x=>x.error); if(failure) message(failure.error);
    const cleanup = await Promise.all(["pets","health_records","schedules"].map(async table => {
      const local = table==="pets"?petIds:(table==="health_records"?state.records:state.tasks).map(x=>x.id);
      let q=client.from(table).delete().eq("user_id",uid); if(local.length) q=q.not("id","in",`(${local.join(",")})`); return q;
    })); const cleanupFailure=cleanup.find(x=>x.error); if(cleanupFailure) message(cleanupFailure.error);
  }
  return { configured, demo, setMode, init, signUp, signIn, signOut, forgot, resetPassword, sync, client };
})();
