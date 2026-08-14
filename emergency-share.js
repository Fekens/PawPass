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

  function smsUrl(recipient, message) {
    // Apple Messages uses an ampersand for the first SMS parameter, while
    // Android and desktop protocol handlers use the standard query marker.
    // iPadOS can identify itself as a Macintosh, so include touch capability.
    const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    const separator = appleMobile ? '&' : '?';
    return `sms:${recipient}${separator}body=${encodeURIComponent(message)}`;
  }

  function foundReportMessage(petName, finderName, finderPhone, message, finderLocation) {
    return [
      `Pet found: ${petName || 'your pet'}`,
      finderName ? `Finder name: ${finderName}` : '',
      finderPhone ? `Finder phone: ${finderPhone}` : '',
      `Message: ${message}`,
      finderLocation ? `Finder location (map): https://maps.google.com/?q=${finderLocation.latitude},${finderLocation.longitude}` : '',
      'Sent from the PawPass lost-pet profile.'
    ].filter(Boolean).join('\n');
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
      v: 2,
      owner: state.user?.name || 'Pet owner',
      ownerPhone: state.user?.emergencyPhone || '',
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

    const ownerPhone = String(payload.ownerPhone || '').trim();
    const phoneHref = ownerPhone.replace(/[^\d+]/g, '');
    const contactActions = phoneHref ? `
      <div class="public-lost-actions">
        <a class="public-lost-action public-lost-call" href="tel:${safe(phoneHref)}">☎ Call Owner</a>
        <a class="public-lost-action public-lost-text" href="sms:${safe(phoneHref)}">✉ Text Owner</a>
      </div>` : '';
    const foundAction = phoneHref ? `
      <button class="public-lost-found" id="reportPetFound" type="button">⌖ Report Pet Found</button>` : '';

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
          ${contactActions}
          ${foundAction}
          <div class="public-lost-details">
            <div><small>OWNER</small><b>${safe(payload.owner || 'Pet owner')}</b></div>
            <div><small>OWNER CONTACT</small><b>${safe(ownerPhone || 'Not provided')}</b></div>
            <div><small>VETERINARIAN</small><b>${safe(pet.vetPhone || pet.vetName || 'Not provided')}</b></div>
            <div><small>MICROCHIP</small><b>${safe(pet.microchip || 'Not provided')}</b></div>
            <div><small>ALLERGIES</small><b>${safe(pet.allergies || 'None listed')}</b></div>
            <div><small>MEDICATIONS</small><b>${safe(pet.medications || 'None listed')}</b></div>
          </div>
          <div class="public-lost-notes">
            <small>EMERGENCY NOTES</small>
            <p>${safe(pet.notes || 'No emergency notes provided.')}</p>
          </div>
          <p class="public-lost-footnote">This public emergency profile was shared from PawPass by the pet owner.</p>
        </section>
        <a class="btn btn-dark public-lost-home" href="${safe(location.origin + location.pathname)}">Visit PawPass</a>
      </main>
      <dialog class="public-found-dialog" id="foundPetDialog" aria-labelledby="foundPetTitle">
        <button class="public-found-close" type="button" aria-label="Close report form">×</button>
        <p class="eyebrow">HELP ${safe(String(pet.name || 'THIS PET').toUpperCase())} GET HOME</p>
        <h2 id="foundPetTitle">Report pet found</h2>
        <p class="public-found-intro">Share a quick update with the owner. Your details are optional and are only added to the text you send.</p>
        <form id="foundPetForm">
          <label>Your name <span>Optional</span><input name="finderName" maxlength="80" autocomplete="name" placeholder="Your name"></label>
          <label>Your phone number <span>Optional</span><input name="finderPhone" type="tel" maxlength="30" autocomplete="tel" inputmode="tel" placeholder="So the owner can reach you"></label>
          <label>Message <textarea name="message" required maxlength="300" rows="4" placeholder="Where is the pet now? Are they safe?"></textarea><small>Up to 300 characters</small></label>
          <div class="public-location-row">
            <button class="public-location-button" id="useFinderLocation" type="button">⌖ Use my current location</button>
            <p id="finderLocationStatus" role="status" aria-live="polite">Location is optional.</p>
            <button class="public-location-remove hidden" id="removeFinderLocation" type="button">Remove location</button>
          </div>
          <p class="public-found-error" id="foundPetError" role="alert"></p>
          <a class="public-found-submit" id="sendFoundReport" href="${safe(smsUrl(phoneHref, `Pet found: ${pet.name || 'your pet'}`))}">Continue to send report →</a>
          <p class="public-found-privacy" id="foundPetSendHelp" role="status" aria-live="polite">PawPass will open your text app with this report. Nothing is stored on this device or shared until you send it.</p>
        </form>
      </dialog>`;

    if (!document.getElementById('publicLostStyles')) {
      const style = document.createElement('style');
      style.id = 'publicLostStyles';
      style.textContent = `
        .public-lost-wrap{min-height:100vh;background:#f7f5ef;padding:32px 18px 56px;display:flex;flex-direction:column;align-items:center;color:#243a40}
        .public-lost-brand{width:min(760px,100%);display:flex;gap:10px;align-items:center;font-size:20px;margin-bottom:24px}
        .public-lost-card{width:min(760px,100%);background:#fff;border-radius:28px;padding:32px;box-shadow:0 18px 50px rgba(36,58,64,.12)}
        .public-lost-hero{display:flex;gap:22px;align-items:center;margin:18px 0 28px}.public-lost-hero h1{font-size:38px;margin:0 0 6px}.public-lost-hero p{margin:0;color:#708086}
        .public-lost-pet{width:126px;height:126px;border-radius:26px;background:#f5cf78;display:grid;place-items:center;font-size:70px;flex:0 0 auto}
        .public-lost-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 18px}.public-lost-action{min-height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-weight:800;text-decoration:none;font-size:16px;padding:12px 16px}.public-lost-call{background:#243a40;color:#fff}.public-lost-text{background:#f4b8c4;color:#243a40}
        .public-lost-found{width:100%;min-height:58px;border:0;border-radius:16px;background:#f5cf78;color:#243a40;font:800 16px 'DM Sans',sans-serif;margin:0 0 22px;cursor:pointer}
        .public-lost-details{display:grid;grid-template-columns:1fr 1fr;gap:12px}.public-lost-details>div{background:#eef7f6;border-radius:16px;padding:16px}.public-lost-details small,.public-lost-notes small{display:block;font-size:11px;letter-spacing:.12em;color:#71868b;margin-bottom:5px}.public-lost-details b{overflow-wrap:anywhere}
        .public-lost-notes{margin-top:18px;border-top:1px solid #e6e8e5;padding-top:18px}.public-lost-notes p{line-height:1.6;margin-bottom:0}.public-lost-footnote{font-size:12px;color:#839095;margin:24px 0 0}.public-lost-home{margin-top:20px;text-decoration:none}
        .public-found-dialog{width:min(520px,calc(100% - 28px));max-height:calc(100vh - 28px);overflow:auto;border:0;border-radius:26px;padding:30px;color:#243a40;box-shadow:0 24px 70px rgba(23,55,47,.3)}.public-found-dialog::backdrop{background:rgba(23,55,47,.78);backdrop-filter:blur(4px)}.public-found-dialog h2{font:800 28px Manrope;margin:7px 0}.public-found-intro{color:#708086;line-height:1.5;margin:0 0 20px}.public-found-close{position:absolute;right:16px;top:14px;width:34px;height:34px;border:0;border-radius:50%;font-size:22px;background:#f1f0ea;color:#243a40}.public-found-dialog form{display:grid;gap:15px}.public-found-dialog label{font-size:12px;font-weight:800}.public-found-dialog label>span{font-weight:500;color:#82908c}.public-found-dialog input,.public-found-dialog textarea{display:block;width:100%;margin-top:7px;border:1px solid #d9ddd7;border-radius:13px;padding:13px;background:#fbfaf6;color:#243a40;font:inherit}.public-found-dialog textarea{resize:vertical}.public-found-dialog label>small{display:block;text-align:right;color:#82908c;margin-top:4px}.public-location-row{border:1px solid #dce8e4;background:#eef7f6;border-radius:14px;padding:8px 12px 11px}.public-location-button{width:100%;min-height:42px;border:0;background:transparent;color:#315f54;font-weight:800;text-align:left;padding:6px 2px;cursor:pointer;touch-action:manipulation}.public-location-button:disabled{opacity:.6}.public-location-row p{font-size:11px;line-height:1.45;color:#708086;margin:3px 2px 0}.public-location-row p.location-error{color:#a13d34}.public-location-remove{min-height:36px;border:0;background:transparent;color:#667975;text-decoration:underline;padding:7px 2px 0;cursor:pointer}.public-found-error{min-height:16px;color:#b54438;font-size:12px;margin:0}.public-found-submit{min-height:54px;border:0;border-radius:15px;background:#243a40;color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;padding:0 16px;cursor:pointer;touch-action:manipulation}.public-found-privacy{color:#82908c;font-size:11px;line-height:1.45;text-align:center;margin:0}
        @media(max-width:560px){.public-lost-wrap{padding:20px 12px 40px}.public-lost-card{padding:24px 18px}.public-lost-hero{align-items:flex-start}.public-lost-pet{width:92px;height:92px;font-size:50px}.public-lost-hero h1{font-size:30px}.public-lost-actions,.public-lost-details{grid-template-columns:1fr}.public-found-dialog{padding:28px 20px 22px}}
      `;
      document.head.appendChild(style);
    }

    const dialog = document.getElementById('foundPetDialog');
    const form = document.getElementById('foundPetForm');
    const sendLink = document.getElementById('sendFoundReport');
    const sendHelp = document.getElementById('foundPetSendHelp');
    let finderLocation = null;
    let locationRequest = 0;
    document.getElementById('reportPetFound')?.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('.public-found-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    const locationButton = document.getElementById('useFinderLocation');
    const locationStatus = document.getElementById('finderLocationStatus');
    const removeLocationButton = document.getElementById('removeFinderLocation');
    locationButton.addEventListener('click', () => {
      const request = ++locationRequest;
      locationStatus.classList.remove('location-error');
      if (!navigator.geolocation) {
        locationStatus.textContent = 'Location is unavailable in this browser. You can still send without it.';
        locationStatus.classList.add('location-error');
        return;
      }
      locationButton.disabled = true;
      locationButton.setAttribute('aria-busy', 'true');
      locationStatus.textContent = 'Waiting for location permission…';
      navigator.geolocation.getCurrentPosition(position => {
        if (request !== locationRequest) return;
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          showLocationFailure('Your browser returned an invalid location. You can still send without it.');
          return;
        }
        finderLocation = {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        };
        locationStatus.textContent = '✓ Location added. The text will include a Google Maps link.';
        locationButton.textContent = '⌖ Update my current location';
        locationButton.disabled = false;
        locationButton.removeAttribute('aria-busy');
        removeLocationButton.classList.remove('hidden');
      }, geolocationError => {
        if (request !== locationRequest) return;
        const denied = geolocationError?.code === 1;
        showLocationFailure(denied
          ? 'Location permission was denied. You can still send the report without it.'
          : 'We could not get your location. You can still send the report without it.');
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    });
    function showLocationFailure(message) {
      locationStatus.textContent = finderLocation ? `${message} Your previously added location is still included.` : message;
      locationStatus.classList.add('location-error');
      locationButton.disabled = false;
      locationButton.removeAttribute('aria-busy');
    }
    removeLocationButton.addEventListener('click', () => {
      locationRequest++;
      finderLocation = null;
      locationButton.disabled = false;
      locationButton.removeAttribute('aria-busy');
      locationButton.textContent = '⌖ Use my current location';
      locationStatus.textContent = 'Location removed. You can send the report without it.';
      locationStatus.classList.remove('location-error');
      removeLocationButton.classList.add('hidden');
    });
    function prepareFoundReport(event) {
      const data = new FormData(form);
      const name = String(data.get('finderName') || '').trim();
      const finderPhone = String(data.get('finderPhone') || '').trim();
      const message = String(data.get('message') || '').trim();
      if (!message) {
        event?.preventDefault();
        document.getElementById('foundPetError').textContent = 'Please add a short message for the owner.';
        form.elements.message.focus();
        return false;
      }
      document.getElementById('foundPetError').textContent = '';
      sendLink.href = smsUrl(phoneHref, foundReportMessage(pet.name, name, finderPhone, message, finderLocation));
      sendHelp.textContent = 'Opening your text app… If no app opens, your browser or device has no SMS handler configured. You can still use Call Owner or Text Owner above.';
      return true;
    }
    // Keep this as a visible, genuine sms: link. A synthetic link.click() can be
    // rejected as an external-protocol launch by mobile and desktop browsers.
    sendLink.addEventListener('click', event => {
      prepareFoundReport(event);
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!prepareFoundReport(event)) return;
      // Enter-key submission has no anchor default action. Pointer and touch
      // users follow the native link above, the most reliable SMS launch path.
      window.location.href = sendLink.href;
    });
    return true;
  }

  function ensureQrButton() {
    const share = document.getElementById('shareEmergency');
    if (!share || document.getElementById('qrEmergency')) return;
    const button = document.createElement('button');
    button.id = 'qrEmergency';
    button.type = 'button';
    button.className = share.className;
    button.textContent = '▦ QR pet tag';
    button.style.marginRight = '10px';
    share.parentNode.insertBefore(button, share);
  }

  function showQrTag() {
    const url = publicUrl();
    const pet = selectedPet();
    if (!url || !pet) {
      toast('Add a pet before creating a QR tag');
      return;
    }
    if (!state.user?.emergencyPhone) {
      toast('Add an emergency contact phone in Settings → Edit first');
      location.hash = 'settings';
      return;
    }

    let dialog = document.getElementById('qrTagDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'qrTagDialog';
      dialog.className = 'auth-dialog';
      document.body.appendChild(dialog);
    }

    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=24&data=${encodeURIComponent(url)}`;
    dialog.innerHTML = `
      <div class="auth-card" style="max-width:480px;text-align:center">
        <button class="dialog-close" type="button" aria-label="Close">×</button>
        <div class="auth-logo"><span class="brand-mark">P</span></div>
        <p class="eyebrow centered">PAWPASS PET TAG</p>
        <h2>${safe(pet.name || 'Pet')} QR code</h2>
        <p>Scan this code to open the public lost-pet profile.</p>
        <img src="${safe(qrImage)}" alt="QR code for ${safe(pet.name || 'pet')} emergency profile" style="width:min(320px,90%);background:#fff;padding:12px;border-radius:18px;margin:10px auto 18px;display:block">
        <div style="display:grid;gap:10px">
          <a class="btn btn-primary btn-block" href="${safe(qrImage)}" target="_blank" rel="noopener">Open / save QR code →</a>
          <button class="btn btn-dark btn-block" id="copyQrLink" type="button">Copy emergency link</button>
        </div>
        <p class="field-help" style="margin-top:14px">If you change the owner contact or ${safe(pet.name || 'your pet')}'s emergency details later, create and print a new QR tag.</p>
      </div>`;
    dialog.querySelector('.dialog-close').onclick = () => dialog.close();
    dialog.querySelector('#copyQrLink').onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('Emergency link copied');
      } catch {
        window.prompt('Copy this emergency link:', url);
      }
    };
    dialog.showModal();
  }

  const publicToken = new URLSearchParams(location.search).get(paramName);
  if (publicToken) {
    const payload = decodePayload(publicToken);
    if ((payload?.v === 1 || payload?.v === 2) && payload.pet) {
      const show = () => renderPublicProfile(payload);
      try { enterApp = show; } catch {}
      try { render = show; } catch {}
      show();
      window.addEventListener('load', show, { once: true });
    }
  } else {
    ensureQrButton();
    window.addEventListener('load', ensureQrButton);
    new MutationObserver(ensureQrButton).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('click', async event => {
    const qr = event.target.closest('#qrEmergency');
    if (qr) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showQrTag();
      return;
    }

    const share = event.target.closest('#shareEmergency');
    if (!share) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = publicUrl();
    if (!url) {
      toast('Add a pet before sharing an emergency profile');
      return;
    }
    if (!state.user?.emergencyPhone) {
      toast('Add an emergency contact phone in Settings → Edit before sharing');
      location.hash = 'settings';
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
