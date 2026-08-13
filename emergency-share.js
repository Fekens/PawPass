(() => {
  const paramName = 'lost';

  function encodePayload(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodePayload(value) {
    try {
      const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }

  function safe(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function petAge(pet) {
    if (pet.age) return pet.age;
    if (!pet.birthday) return 'Age unknown';
    const dob = new Date(`${pet.birthday}T12:00:00`);
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) years--;
    return years < 1 ? 'Under 1 year' : `${years} year${years === 1 ? '' : 's'}`;
  }

  function publicPayload() {
    const pet = selectedPet();
    if (!pet) return null;
    return {
      v: 1,
      owner: state.user?.name || 'Pet owner',
      pet: {
        name: pet.name || 'Pet',
        species: pet.species || '',
        animal: pet.animal || '🐾',
        breed: pet.breed || '',
        age: petAge(pet),
        sex: pet.sex || 'Unknown',
        microchip: pet.microchip || '',
        allergies: pet.allergies || '',
        medications: pet.medications || '',
        vetName: pet.vetName || '',
        vetPhone: pet.vetPhone || '',
        notes: pet.medicalNotes || ''
      }
    };
  }

  function publicUrl() {
    const payload = publicPayload();
    if (!payload) return null;
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set(paramName, encodePayload(payload));
    return url.toString();
  }

  function renderPublicProfile(payload) {
    const pet = payload?.pet;
    if (!pet) return false;

    const app = document.getElementById('app');
    if (app) app.classList.add('hidden');
    const welcome = document.getElementById('welcome');
    if (!welcome) return false;

    document.title = `${pet.name || 'Lost pet'} — PawPass emergency profile`;
    welcome.classList.remove('hidden');
    welcome.innerHTML = `
      <main class="public-lost-wrap">
        <header class="public-lost-brand"><span class="brand-mark">P</span><b>PawPass</b></header>
        <section class="public-lost-card">
          <p class="eyebrow">IF I'M LOST, PLEASE HELP ME HOME</p>
          <div class="public-lost-hero">
            <div class="public-lost-pet">${safe(pet.animal || '🐾')}</div>
            <div>
              <h1>${safe(pet.name || 'Lost pet')}</h1>
              <p>${safe([pet.breed, pet.age, pet.sex].filter(Boolean).join(' · '))}</p>
            </div>
          </div>
          <div class="public-lost-details">
            <div><small>OWNER</small><b>${safe(payload.owner || 'Pet owner')}</b></div>
            <div><small>VETERINARIAN</small><b>${safe(pet.vetPhone || pet.vetName || 'Not provided')}</b></div>
            <div><small>MICROCHIP</small><b>${safe(pet.microchip || 'Not provided')}</b></div>
            <div><small>ALLERGIES</small><b>${safe(pet.allergies || 'None listed')}</b></div>
            <div><small>MEDICATIONS</small><b>${safe(pet.medications || 'None listed')}</b></div>
            <div><small>SPECIES</small><b>${safe(pet.species || 'Not provided')}</b></div>
          </div>
          <div class="public-lost-notes">
            <small>EMERGENCY NOTES</small>
            <p>${safe(pet.notes || 'No emergency notes provided.')}</p>
          </div>
          <p class="public-lost-footnote">This public emergency profile was shared from PawPass by the pet owner.</p>
        </section>
        <a class="btn btn-dark public-lost-home" href="${safe(location.origin + location.pathname)}">Visit PawPass</a>
      </main>`;

    if (!document.getElementById('publicLostStyles')) {
      const style = document.createElement('style');
      style.id = 'publicLostStyles';
      style.textContent = `
        .public-lost-wrap{min-height:100vh;background:#f7f5ef;padding:32px 18px 56px;display:flex;flex-direction:column;align-items:center;color:#243a40}
        .public-lost-brand{width:min(760px,100%);display:flex;gap:10px;align-items:center;font-size:20px;margin-bottom:24px}
        .public-lost-card{width:min(760px,100%);background:#fff;border-radius:28px;padding:32px;box-shadow:0 18px 50px rgba(36,58,64,.12)}
        .public-lost-hero{display:flex;gap:22px;align-items:center;margin:18px 0 28px}.public-lost-hero h1{font-size:38px;margin:0 0 6px}.public-lost-hero p{margin:0;color:#708086}
        .public-lost-pet{width:126px;height:126px;border-radius:26px;background:#f5cf78;display:grid;place-items:center;font-size:70px;flex:0 0 auto}
        .public-lost-details{display:grid;grid-template-columns:1fr 1fr;gap:12px}.public-lost-details>div{background:#eef7f6;border-radius:16px;padding:16px}.public-lost-details small,.public-lost-notes small{display:block;font-size:11px;letter-spacing:.12em;color:#71868b;margin-bottom:5px}.public-lost-details b{overflow-wrap:anywhere}
        .public-lost-notes{margin-top:18px;border-top:1px solid #e6e8e5;padding-top:18px}.public-lost-notes p{line-height:1.6;margin-bottom:0}.public-lost-footnote{font-size:12px;color:#839095;margin:24px 0 0}.public-lost-home{margin-top:20px;text-decoration:none}
        @media(max-width:560px){.public-lost-card{padding:24px 18px}.public-lost-hero{align-items:flex-start}.public-lost-pet{width:92px;height:92px;font-size:50px}.public-lost-hero h1{font-size:30px}.public-lost-details{grid-template-columns:1fr}}
      `;
      document.head.appendChild(style);
    }
    return true;
  }

  const publicToken = new URLSearchParams(location.search).get(paramName);
  if (publicToken) {
    const payload = decodePayload(publicToken);
    if (payload?.v === 1 && payload.pet) {
      const show = () => renderPublicProfile(payload);
      try { enterApp = show; } catch {}
      try { render = show; } catch {}
      show();
      window.addEventListener('load', show, { once: true });
    }
  }

  document.addEventListener('click', async event => {
    const share = event.target.closest('#shareEmergency');
    if (!share) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = publicUrl();
    if (!url) {
      toast('Add a pet before sharing an emergency profile');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Public emergency profile link copied');
    } catch {
      window.prompt('Copy this public emergency profile link:', url);
    }
  }, true);
})();
