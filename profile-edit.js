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
      <p>Update the name shown throughout PawPass.</p>
      <form id="profileEditForm">
        <label>Your name<input name="name" maxlength="80" required autocomplete="name"></label>
        <label>Email address<input name="email" type="email" readonly aria-readonly="true"></label>
        <p class="field-help">Your login email stays unchanged.</p>
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
      const error = dialog.querySelector('#profileEditError');
      error.textContent = '';
      if (!name) {
        error.textContent = 'Enter your name.';
        return;
      }
      try {
        state.user = { ...(state.user || {}), name };
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

  document.addEventListener('click', event => {
    const settingsEdit = event.target.closest('[data-profile-edit]');
    if (!settingsEdit) return;
    const dialog = ensureProfileDialog();
    const form = dialog.querySelector('#profileEditForm');
    form.elements.name.value = state.user?.name || '';
    form.elements.email.value = state.user?.email || '';
    dialog.querySelector('#profileEditError').textContent = '';
    dialog.showModal();
  });

  const originalSettings = settings;
  settings = function patchedSettings() {
    return originalSettings().replace(
      '<button class="link-btn">Edit</button>',
      '<button class="link-btn" data-profile-edit>Edit</button>'
    );
  };
})();
