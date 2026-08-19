/* Production persistence/auth adapter. Demo mode never contacts Supabase. */
window.PawPassBackend = (() => {
  const cfg = window.PAWPASS_CONFIG || {};
  const publishableKey = cfg.supabasePublishableKey || cfg.supabaseAnonKey;
  const configured = Boolean(cfg.supabaseUrl && publishableKey && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  let mode = localStorage.getItem("pawpass-mode") || "cloud";
  let user = null;
  let cloudHydrated = false;
  let syncQueue = Promise.resolve();
  const demo = () => mode === "demo";
  const setMode = value => { mode = value; localStorage.setItem("pawpass-mode", value); };
  const assertCloud = () => { if (!client) throw new Error("Production accounts are not configured. Use Explore the demo or configure Supabase."); };
  const message = error => { throw new Error(error?.message || "PawPass could not reach the server."); };
  const recoveryRequested = () => new URLSearchParams(location.search).get("type") === "recovery" || location.hash.includes("type=recovery");
  const authRedirectError = () => {
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    return search.get("error_description") || hash.get("error_description") || search.get("error") || hash.get("error") || "";
  };
  const clearAuthRedirect = () => history.replaceState(null, "", location.pathname);

  async function waitForRecoverySession(timeoutMs = 6000) {
    if (!client) return null;
    const first = await client.auth.getSession();
    if (first.error) message(first.error);
    if (first.data.session) return first.data.session;
    return await new Promise(resolve => {
      let settled = false;
      const finish = session => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscription?.unsubscribe();
        resolve(session || null);
      };
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (session && ["PASSWORD_RECOVERY", "SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event)) finish(session);
      });
      const subscription = data.subscription;
      const timer = setTimeout(async () => {
        try {
          const latest = await client.auth.getSession();
          finish(latest.error ? null : latest.data.session);
        } catch { finish(null); }
      }, timeoutMs);
    });
  }

  async function init() {
    cloudHydrated = false;
    if (demo()) return { mode, user: null, data: null };
    if (!client) return { mode, user: null, data: null };
    const isRecovery = recoveryRequested();
    const redirectError = authRedirectError();
    if (redirectError && isRecovery) {
      clearAuthRedirect();
      throw new Error("This password reset link is invalid or has expired. Request a new password reset link and use the newest email.");
    }
    let session;
    if (isRecovery) {
      session = await waitForRecoverySession();
      if (!session) {
        clearAuthRedirect();
        throw new Error("This password reset link is invalid or has expired. Request a new password reset link and use the newest email.");
      }
    } else {
      const { data, error } = await client.auth.getSession();
      if (error) message(error);
      session = data.session;
    }
    user = session?.user || null;
    return { mode, user, data: user && !isRecovery ? await load() : null };
  }

  async function signUp(name, email, password) {
    assertCloud();
    setMode("cloud");
    const emailRedirectTo = `${location.origin}${location.pathname}`;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo }
    });
    if (error) message(error);
    user = data.user;
    return { user, session: data.session, needsConfirmation: !data.session };
  }

  async function signIn(email, password) {
    assertCloud(); setMode("cloud"); const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) message(error); user = data.user; return data;
  }
  async function signOut() { if (client && !demo()) { const { error } = await client.auth.signOut(); if (error) message(error); } user = null; cloudHydrated = false; }
  async function forgot(email) {
    assertCloud();
    const redirectTo = `${location.origin}${location.pathname}?type=recovery`;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) message(error);
  }
  async function resetPassword(password) {
    assertCloud();
    let { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) message(sessionError);
    let session = sessionData.session;
    if (!session && recoveryRequested()) session = await waitForRecoverySession(3000);
    if (!session) {
      clearAuthRedirect();
      throw new Error("Your password reset session is no longer valid. Request a new reset link and use the newest email.");
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) message(error);
    await client.auth.signOut();
    user = null;
    cloudHydrated = false;
    clearAuthRedirect();
  }

  async function load() {
    const tables = ["profiles", "user_settings", "pets", "health_records", "schedules", "emergency_data"];
    const results = await Promise.all(tables.map(table => client.from(table).select("*").then(({data,error}) => { if(error) message(error); return data; })));
    const [profiles, settings, pets, records, tasks, emergency] = results;
    const profile = profiles[0] || {};
    const emergencyPhone = profile.emergency_phone || emergency.find(e => e.contact_phone)?.contact_phone || "";
    const loadedState = {
      user: { name: profile.name || user.user_metadata?.name || "Pet parent", email: user.email, emergencyPhone },
      selectedPetId: settings[0]?.selected_pet_id || pets[0]?.id || null,
      lastView: settings[0]?.last_view || "dashboard",
      preferences: settings[0]?.preferences || {},
      pets: pets.map(p => ({ id:p.id,publicId:p.public_id,name:p.name,species:p.species,animal:p.animal,breed:p.breed,age:p.age,weight:p.weight,birthday:p.birthday,sex:p.sex,photo:p.photo_url||"",microchip:p.microchip||"",allergies:p.allergies||"",medications:p.medications||"",vetName:p.vet_name||"",vetPhone:p.vet_phone||"",medicalNotes:p.medical_notes||"",status:p.status })),
      records: records.map(r => ({ id:r.id,petId:r.pet_id,type:r.record_type,title:r.title,date:r.record_date,notes:r.notes })),
      tasks: tasks.map(t => ({ id:t.id,petId:t.pet_id,type:t.schedule_type,title:t.title,date:t.display_date,time:t.display_time,scheduledAt:t.scheduled_at,notes:t.notes,done:t.done })),
      emergency: Object.fromEntries(emergency.map(e => [e.pet_id, { contactName:e.contact_name,contactPhone:e.contact_phone,notes:e.notes }]))
    };
    cloudHydrated = true;
    return loadedState;
  }
  async function syncNow(state) {
    if (demo() || !client || !user || !cloudHydrated || recoveryRequested()) return;
    const uid=user.id, petIds=state.pets.map(p=>p.id);
    const petResult = state.pets.length ? await client.from("pets").upsert(state.pets.map(p=>({id:p.id,public_id:p.publicId,user_id:uid,name:p.name,species:p.species,animal:p.animal,breed:p.breed,age:p.age||null,weight:p.weight,birthday:p.birthday||null,sex:p.sex,photo_url:p.photo||null,microchip:p.microchip||null,allergies:p.allergies||null,medications:p.medications||null,vet_name:p.vetName||null,vet_phone:p.vetPhone||null,medical_notes:p.medicalNotes||null,status:p.status}))) : {};
    if (petResult.error) message(petResult.error);
    const operations = [
      client.from("profiles").upsert({id:uid,name:state.user.name,emergency_phone:state.user.emergencyPhone||null}),
      client.from("user_settings").upsert({user_id:uid,selected_pet_id:state.selectedPetId||null,last_view:state.lastView||"dashboard",preferences:state.preferences||{}}),
      state.records.length ? client.from("health_records").upsert(state.records.map(r=>({id:r.id,user_id:uid,pet_id:r.petId,record_type:r.type,title:r.title,record_date:r.date,notes:r.notes}))) : Promise.resolve({}),
      state.tasks.length ? client.from("schedules").upsert(state.tasks.map(t=>({id:t.id,user_id:uid,pet_id:t.petId,schedule_type:t.type,title:t.title,display_date:t.date,display_time:t.time,scheduled_at:t.scheduledAt||null,notes:t.notes,done:t.done}))) : Promise.resolve({}),
      state.pets.length ? client.from("emergency_data").upsert(state.pets.map(p=>({pet_id:p.id,user_id:uid,contact_name:state.user.name,contact_phone:state.user.emergencyPhone||null,notes:p.medicalNotes||null}))) : Promise.resolve({})
    ];
    const results=await Promise.all(operations); const failure=results.find(x=>x.error); if(failure) message(failure.error);
    const cleanup = await Promise.all(["pets","health_records","schedules"].map(async table => {
      const local = table==="pets"?petIds:(table==="health_records"?state.records:state.tasks).map(x=>x.id);
      let q=client.from(table).delete().eq("user_id",uid); if(local.length) q=q.not("id","in",`(${local.join(",")})`); return q;
    })); const cleanupFailure=cleanup.find(x=>x.error); if(cleanupFailure) message(cleanupFailure.error);
  }
  function sync(state) {
    if (demo() || !client || !user || !cloudHydrated || recoveryRequested()) return Promise.resolve();
    const snapshot = structuredClone(state);
    syncQueue = syncQueue.catch(() => {}).then(() => syncNow(snapshot));
    return syncQueue;
  }
  async function loadPublicPet(publicId) {
    assertCloud();
    const { data, error } = await client.rpc("get_public_pet", { lookup_id: publicId });
    if (error) message(error);
    if (!data?.length) throw new Error("This pet profile is unavailable.");
    return data[0];
  }
  async function markPetHome(petId) {
    if (demo()) return;
    assertCloud();
    if (!user) throw new Error("Log in as the pet owner to mark this pet as home.");
    const { data, error } = await client.from("pets")
      .update({ status: "Home" })
      .eq("id", petId)
      .eq("user_id", user.id)
      .select("id");
    if (error) message(error);
    if (!data?.length) throw new Error("Only this pet's owner can mark the pet as home.");
  }
  return { configured, demo, setMode, init, signUp, signIn, signOut, forgot, resetPassword, sync, markPetHome, loadPublicPet, client };
})();
