(() => {
  const BUCKET = "pet-photos";
  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const input = document.querySelector('#petForm input[name="photo"]');
  const form = document.getElementById("petForm");
  const preview = document.getElementById("photoPreview");
  if (!input || !form) return;

  let pendingFile = null;
  let uploadedUrl = "";
  let frameX = 50;
  let frameY = 50;
  let frameZoom = 1;
  let dragging = null;
  let lastHydrationKey = "";
  let hydrationInFlight = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const frameNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function notify(message) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3200);
    } else alert(message);
  }

  function goToUpgrade() {
    document.getElementById("petDialog")?.close();
    location.hash = "#settings";
  }

  function ensureFramingUi() {
    if (!document.getElementById("petPhotoFramingStyles")) {
      const style = document.createElement("style");
      style.id = "petPhotoFramingStyles";
      style.textContent = `
        #photoPreview.has-photo-frame{overflow:hidden;cursor:grab;touch-action:none;user-select:none}
        #photoPreview.has-photo-frame:active{cursor:grabbing}
        #photoPreview.has-photo-frame img{display:block;width:100%;height:100%;object-fit:cover;transform-origin:center center;pointer-events:none}
        .pet-photo-frame-controls{display:none;grid-column:1/-1;gap:7px;margin-top:10px}
        .pet-photo-frame-controls.is-visible{display:grid}
        .pet-photo-frame-controls label{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700}
        .pet-photo-frame-controls input[type="range"]{flex:1}
        .pet-photo-frame-help{margin:0;color:#7c8d87;font-size:11px}
      `;
      document.head.appendChild(style);
    }

    let controls = form.querySelector(".pet-photo-frame-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "pet-photo-frame-controls";
      controls.innerHTML = `
        <p class="pet-photo-frame-help">Drag the photo to reposition it inside the crop.</p>
        <label>Zoom <input type="range" min="1" max="3" step="0.05" value="1" data-photo-zoom aria-label="Pet photo zoom"></label>
      `;
      preview.closest(".photo-field")?.appendChild(controls);
      controls.querySelector("[data-photo-zoom]")?.addEventListener("input", event => {
        frameZoom = clamp(frameNumber(event.target.value, 1), 1, 3);
        applyPreviewFrame();
      });
    }
    return controls;
  }

  function syncFramingUi() {
    const controls = ensureFramingUi();
    const hasPhoto = Boolean(preview?.querySelector("img"));
    controls?.classList.toggle("is-visible", hasPhoto);
    preview?.classList.toggle("has-photo-frame", hasPhoto);
    const zoom = controls?.querySelector("[data-photo-zoom]");
    if (zoom) zoom.value = String(frameZoom);
  }

  function applyFrameToImage(img, x, y, zoom) {
    if (!img) return;
    img.style.objectPosition = `${clamp(frameNumber(x, 50), 0, 100)}% ${clamp(frameNumber(y, 50), 0, 100)}%`;
    img.style.transform = `scale(${clamp(frameNumber(zoom, 1), 1, 3)})`;
    img.style.transformOrigin = "center center";
  }

  function applyPreviewFrame() {
    const img = preview?.querySelector("img");
    if (img) applyFrameToImage(img, frameX, frameY, frameZoom);
    syncFramingUi();
  }

  function frameForPet(pet) {
    return {
      x: clamp(frameNumber(pet?.photoPositionX, 50), 0, 100),
      y: clamp(frameNumber(pet?.photoPositionY, 50), 0, 100),
      zoom: clamp(frameNumber(pet?.photoZoom, 1), 1, 3)
    };
  }

  function loadFrameForPet(pet) {
    const frame = frameForPet(pet);
    frameX = frame.x;
    frameY = frame.y;
    frameZoom = frame.zoom;
    applyPreviewFrame();
  }

  function resetFrame() {
    frameX = 50;
    frameY = 50;
    frameZoom = 1;
    applyPreviewFrame();
  }

  function currentPetFromForm() {
    try {
      const id = form.elements.id?.value;
      if (!id || typeof state === "undefined" || !Array.isArray(state.pets)) return null;
      return state.pets.find(pet => String(pet.id) === String(id)) || null;
    } catch {
      return null;
    }
  }

  function applySavedFraming() {
    try {
      if (typeof state === "undefined" || !Array.isArray(state.pets)) return;
      const petsWithPhotos = state.pets.filter(pet => pet?.photo);
      if (!petsWithPhotos.length) return;
      document.querySelectorAll("img").forEach(img => {
        if (preview?.contains(img)) return;
        const src = img.getAttribute("src") || "";
        const pet = petsWithPhotos.find(candidate => candidate.photo === src);
        if (!pet) return;
        const frame = frameForPet(pet);
        applyFrameToImage(img, frame.x, frame.y, frame.zoom);
      });
    } catch (error) {
      console.error("Could not apply pet photo framing", error);
    }
  }

  async function hydrateCloudFraming() {
    try {
      if (typeof state === "undefined" || !Array.isArray(state.pets) || window.PawPassBackend?.demo?.()) return;
      const client = window.PawPassBackend?.client;
      if (!client || hydrationInFlight) return;
      const key = state.pets.map(pet => pet.id).sort().join(",");
      if (!key || key === lastHydrationKey) return;
      hydrationInFlight = true;
      const { data, error } = await client.from("pets").select("id,photo_position_x,photo_position_y,photo_zoom");
      if (error) throw error;
      (data || []).forEach(row => {
        const pet = state.pets.find(candidate => String(candidate.id) === String(row.id));
        if (!pet) return;
        pet.photoPositionX = clamp(frameNumber(row.photo_position_x, 50), 0, 100);
        pet.photoPositionY = clamp(frameNumber(row.photo_position_y, 50), 0, 100);
        pet.photoZoom = clamp(frameNumber(row.photo_zoom, 1), 1, 3);
      });
      lastHydrationKey = key;
      applySavedFraming();
      const editingPet = currentPetFromForm();
      if (editingPet && document.getElementById("petDialog")?.open) loadFrameForPet(editingPet);
    } catch (error) {
      console.error("Could not load pet photo framing", error);
    } finally {
      hydrationInFlight = false;
    }
  }

  async function persistFrame(pet) {
    if (!pet?.photo) return;
    pet.photoPositionX = Math.round(frameX * 100) / 100;
    pet.photoPositionY = Math.round(frameY * 100) / 100;
    pet.photoZoom = Math.round(frameZoom * 100) / 100;

    if (window.PawPassBackend?.demo?.()) {
      if (typeof save === "function") save();
      applySavedFraming();
      return;
    }

    const client = window.PawPassBackend?.client;
    if (!client) return;
    if (typeof window.PawPassBackend?.sync === "function" && typeof state !== "undefined") {
      await window.PawPassBackend.sync(state);
    }
    const { error } = await client.from("pets").update({
      photo_position_x: pet.photoPositionX,
      photo_position_y: pet.photoPositionY,
      photo_zoom: pet.photoZoom
    }).eq("id", pet.id);
    if (error) throw error;
    applySavedFraming();
  }

  function setPreview(url) {
    if (!preview || !url) return;
    preview.innerHTML = `<img src="${url}" alt="Pet profile preview">`;
    applyPreviewFrame();
  }

  async function verifyPlus() {
    if (!window.PawPassPlus?.isActive) return false;
    return window.PawPassPlus.isActive();
  }

  ensureFramingUi();

  preview?.addEventListener("pointerdown", event => {
    if (!preview.querySelector("img")) return;
    dragging = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: frameX,
      startY: frameY
    };
    preview.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  preview?.addEventListener("pointermove", event => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const width = Math.max(preview.clientWidth, 1);
    const height = Math.max(preview.clientHeight, 1);
    frameX = clamp(dragging.startX - ((event.clientX - dragging.startClientX) / width) * 100, 0, 100);
    frameY = clamp(dragging.startY - ((event.clientY - dragging.startClientY) / height) * 100, 0, 100);
    applyPreviewFrame();
    event.preventDefault();
  });

  const finishDrag = event => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    preview.releasePointerCapture?.(event.pointerId);
    dragging = null;
  };
  preview?.addEventListener("pointerup", finishDrag);
  preview?.addEventListener("pointercancel", finishDrag);

  input.addEventListener("click", async event => {
    try {
      if (await verifyPlus()) return;
      event.preventDefault();
      input.value = "";
      notify("Pet photo uploads are included with PawPass Plus. Upgrade to personalize your pet's profile.");
      setTimeout(goToUpgrade, 450);
    } catch (error) {
      console.error("Could not verify PawPass Plus for pet photo", error);
      event.preventDefault();
      notify("We couldn't verify PawPass Plus right now. Please try again.");
    }
  }, true);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    pendingFile = null;
    uploadedUrl = "";
    if (!file) return;
    try {
      if (!(await verifyPlus())) {
        input.value = "";
        notify("Upgrade to PawPass Plus to upload a pet photo.");
        setTimeout(goToUpgrade, 450);
        return;
      }
      if (!ALLOWED.has(file.type)) {
        input.value = "";
        notify("Please choose a JPG, PNG, WEBP, or GIF image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        input.value = "";
        notify("Pet photos can be up to 5 MB.");
        return;
      }
      pendingFile = file;
      resetFrame();
      setPreview(URL.createObjectURL(file));
    } catch (error) {
      console.error(error);
      input.value = "";
      notify("We couldn't prepare that photo. Please try again.");
    }
  });

  document.addEventListener("click", event => {
    const edit = event.target.closest("[data-pet-edit]");
    if (edit) {
      queueMicrotask(() => loadFrameForPet(currentPetFromForm()));
      return;
    }
    if (event.target.closest("[data-pet-add]")) {
      queueMicrotask(resetFrame);
    }
  });

  const previewObserver = new MutationObserver(() => applyPreviewFrame());
  if (preview) previewObserver.observe(preview, { childList: true });

  const appObserver = new MutationObserver(() => {
    applySavedFraming();
    hydrateCloudFraming();
  });
  appObserver.observe(document.body, { childList: true, subtree: true });

  form.addEventListener("submit", async event => {
    if (!pendingFile) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const saveButton = form.querySelector('button[type="submit"]');
    const oldText = saveButton?.textContent;
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Uploading photo…"; }
    try {
      if (!(await verifyPlus())) throw new Error("PawPass Plus is required for pet photos.");
      const client = window.PawPassBackend?.client;
      if (!client) throw new Error("Photo storage is unavailable.");
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Please log in again before uploading a photo.");
      const ext = (pendingFile.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const petId = form.elements.id?.value || `new-${Date.now()}`;
      const path = `${user.id}/${petId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await client.storage.from(BUCKET).upload(path, pendingFile, { cacheControl: "3600", upsert: false, contentType: pendingFile.type });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from(BUCKET).getPublicUrl(path);
      uploadedUrl = data?.publicUrl || "";
      if (!uploadedUrl) throw new Error("The photo uploaded but no URL was returned.");
      pendingFile = null;
      input.value = "";
      form.dataset.cloudPetPhoto = uploadedUrl;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      delete form.dataset.cloudPetPhoto;
    } catch (error) {
      console.error("Pet photo upload failed", error);
      notify(error.message || "We couldn't upload that pet photo. Please try again.");
    } finally {
      if (saveButton) { saveButton.disabled = false; saveButton.textContent = oldText || "Save Pet"; }
    }
  }, true);

  form.addEventListener("submit", () => {
    queueMicrotask(async () => {
      const dialog = document.getElementById("petDialog");
      if (dialog?.open) return;
      try {
        if (typeof state === "undefined" || !Array.isArray(state.pets)) return;
        const pet = state.pets.find(candidate => String(candidate.id) === String(state.selectedPetId));
        if (!pet?.photo) return;
        await persistFrame(pet);
      } catch (error) {
        console.error("Could not save pet photo framing", error);
        notify("Your pet was saved, but the photo framing could not be saved. Please try editing the pet again.");
      }
    });
  }, true);

  requestAnimationFrame(() => {
    loadFrameForPet(currentPetFromForm());
    applySavedFraming();
    hydrateCloudFraming();
  });

  window.PawPassPetPhotos = {
    takeUploadedUrl() {
      const value = form.dataset.cloudPetPhoto || uploadedUrl || "";
      uploadedUrl = "";
      return value;
    }
  };
})();
