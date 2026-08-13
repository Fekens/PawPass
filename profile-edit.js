(() => {
  function ensureProfileDialog() {
    let dialog = document.getElementById('profileEditDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'profileEditDialog';
    dialog.className = 'modal auth-modal';
    dialog.innerHTML = `
      <button class="modal-close" type="button" data-profile-close aria-label="Close">×</button>
      <div class="auth-logo"><span class="brand-mark">P</span></div>
      <p class="eyebrow centered">YOUR PROFILE</p>
      <h2>Edit profile</h2>
      <p>Update the details shown throughout PawPass.</p>
      <form id="profileEditForm">
        <label>Your name<input name="name" maxlength="80" required autocomplete="name"></label>
        <label>Email address<input name="email" type="email" readonly aria-readonly="true"></label>
        <label>Emergency contact phone<input name="emergencyPhone" type="tel" maxlength="30" autocomplete="tel" placeholder="e.g. (407) 555-1234"></label>
        <p class="field-help">Your login email stays unchanged. Your emergency phone is shown only on a lost-pet profile you choose to share.</p>
        <p id="profileEditError" class="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit">Save changes →</button>
      </form>`;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-profile-close]')) dialog.close();
    });

    dialog.querySelector('#profileEditForm').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      const emergencyPhone = form.elements.emergencyPhone.value.trim();
      const error = dialog.querySelector('#profileEditError');
      error.textContent = '';
      if (!name) {
        error.textContent = 'Enter your name.';
        return;
      }
      try {
        state.user = { ...(state.user || {}), name, emergencyPhone };
        save();
        render();
        dialog.close();
        toast('Profile updated');
      } catch (err) {
        error.textContent = err?.message || 'Could not update your profile.';
      }
    });

    return dialog;
  }

  function ensureNotificationPreferences() {
    state.preferences ||= {};
    if (typeof state.preferences.careNotifications !== 'boolean') state.preferences.careNotifications = true;
    state.preferences.reminderLeadTime ||= 'at-time';
    if (typeof state.preferences.dailySummary !== 'boolean') state.preferences.dailySummary = false;
    return state.preferences;
  }

  function ensureNotificationDialog() {
    let dialog = document.getElementById('careNotificationsDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'careNotificationsDialog';
    dialog.className = 'modal auth-modal';
    dialog.innerHTML = `
      <button class="modal-close" type="button" data-notification-close aria-label="Close">×</button>
      <div class="auth-logo"><span class="brand-mark">P</span></div>
      <p class="eyebrow centered">CARE NOTIFICATIONS</p>
      <h2>Reminder settings</h2>
      <p>Choose how PawPass should organize your care reminders.</p>
      <form id="careNotificationsForm">
        <label>Care reminders
          <select name="enabled">
            <option value="true">On</option>
            <option value="false">Off</option>
          </select>
        </label>
        <label>Reminder timing
          <select name="leadTime">
            <option value="at-time">At the scheduled time</option>
            <option value="15-min">15 minutes before</option>
            <option value="1-hour">1 hour before</option>
            <option value="1-day">1 day before</option>
          </select>
        </label>
        <label>Daily care summary
          <select name="dailySummary">
            <option value="false">Off</option>
            <option value="true">On</option>
          </select>
        </label>
        <p class="field-help">These preferences are saved with your PawPass account. Device push alerts are not enabled yet.</p>
        <button class="btn btn-primary btn-block" type="submit">Save notification settings →</button>
      </form>`;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-notification-close]')) dialog.close();
    });

    dialog.querySelector('#careNotificationsForm').addEventListener('submit', event => {
      event.preventDefault();
      const prefs = ensureNotificationPreferences();
      const form = new FormData(event.currentTarget);
      prefs.careNotifications = form.get('enabled') === 'true';
      prefs.reminderLeadTime = form.get('leadTime');
      prefs.dailySummary = form.get('dailySummary') === 'true';
      save();
      render();
      dialog.close();
      toast(prefs.careNotifications ? 'Care reminders are on' : 'Care reminders are off');
    });

    return dialog;
  }

  document.addEventListener('click', event => {
    const settingsEdit = event.target.closest('[data-profile-edit]');
    if (settingsEdit) {
      const dialog = ensureProfileDialog();
      const form = dialog.querySelector('#profileEditForm');
      form.elements.name.value = state.user?.name || '';
      form.elements.email.value = state.user?.email || '';
      form.elements.emergencyPhone.value = state.user?.emergencyPhone || '';
      dialog.querySelector('#profileEditError').textContent = '';
      dialog.showModal();
      return;
    }

    const notificationManage = event.target.closest('[data-notification-manage]');
    if (notificationManage) {
      const prefs = ensureNotificationPreferences();
      const dialog = ensureNotificationDialog();
      const form = dialog.querySelector('#careNotificationsForm');
      form.elements.enabled.value = String(prefs.careNotifications);
      form.elements.leadTime.value = prefs.reminderLeadTime;
      form.elements.dailySummary.value = String(prefs.dailySummary);
      dialog.showModal();
    }
  });

  const originalSettings = settings;
  settings = function patchedSettings() {
    const prefs = ensureNotificationPreferences();
    return originalSettings()
      .replace(
        '<button class="link-btn">Edit</button>',
        '<button class="link-btn" data-profile-edit>Edit</button>'
      )
      .replace(
        '<div><b>Care notifications</b><small>Reminders are turned on</small></div><button class="link-btn">Manage</button>',
        `<div><b>Care notifications</b><small>Reminders are turned ${prefs.careNotifications ? 'on' : 'off'}</small></div><button class="link-btn" data-notification-manage>Manage</button>`
      );
  };
})();
