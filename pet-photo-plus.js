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

  function setPreview(url) {
    if (!preview || !url) return;
    preview.innerHTML = `<img src="${url}" alt="Pet profile preview">`;
  }

  async function verifyPlus() {
    if (!window.PawPassPlus?.isActive) return false;
    return window.PawPassPlus.isActive();
  }

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
      setPreview(URL.createObjectURL(file));
    } catch (error) {
      console.error(error);
      input.value = "";
      notify("We couldn't prepare that photo. Please try again.");
    }
  });

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

  window.PawPassPetPhotos = {
    takeUploadedUrl() {
      const value = form.dataset.cloudPetPhoto || uploadedUrl || "";
      uploadedUrl = "";
      return value;
    }
  };
})();
