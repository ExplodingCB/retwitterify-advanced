/* SPDX-License-Identifier: MPL-2.0 */
(() => {
  "use strict";
  const extension = globalThis.browser || globalThis.chrome;
  const form = document.getElementById("settings");
  const features = document.getElementById("features");
  const status = document.getElementById("status");
  let saved = Birdify.settings();
  function render(options) {
    for (const key of Object.keys(Birdify.defaults)) form.elements.namedItem(key).checked = options[key];
    form.elements.namedItem("enabled").disabled = false;
    features.disabled = !options.enabled;
  }
  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  if (!extension?.storage?.local) {
    message("Preview only. Load the extension in your browser to use these settings.");
    return;
  }
  extension.storage.local.get("settings").then(result => {
    saved = Birdify.settings(result.settings);
    render(saved);
    message(saved.enabled ? "Ready on x.com and twitter.com. Refresh tabs opened before installation." : "Paused. The original appearance is restored.");
  }).catch(() => message("Couldn't load preferences. Close and reopen this popup to retry.", true));
  form.addEventListener("change", async event => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const next = { ...saved, [event.target.name]: event.target.checked };
    // Serialize saves and leave a clear recovery state on storage failure.
    form.elements.namedItem("enabled").disabled = true;
    features.disabled = true;
    try {
      await extension.storage.local.set({ settings: next });
      saved = next;
      message(saved.enabled ? "Saved. Updated in your open Twitter tabs." : "Paused. The original appearance is restored.");
    } catch {
      message("Couldn't save. Your previous preferences are still active. Try again.", true);
    } finally { render(saved); }
  });
})();
