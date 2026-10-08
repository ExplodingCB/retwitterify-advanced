/* SPDX-License-Identifier: MPL-2.0 */
(() => {
  "use strict";
  const extension = globalThis.browser || globalThis.chrome;
  if (!extension?.storage?.local) return;
  let engine;
  let revision = 0;
  const apply = value => {
    const options = Birdify.settings(value);
    if (engine) engine.update(options);
    else engine = Birdify.start(document, options, path => extension.runtime.getURL(path));
  };
  // Register before reading, so a settings change during startup cannot be lost.
  extension.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    revision++;
    apply(changes.settings.newValue);
  });
  const readingRevision = revision;
  extension.storage.local.get("settings").then(result => {
    if (revision === readingRevision) apply(result.settings);
  }).catch(error => {
    console.warn("Birdify: could not read settings; using defaults.", error);
    if (revision === readingRevision) apply();
  });
})();
