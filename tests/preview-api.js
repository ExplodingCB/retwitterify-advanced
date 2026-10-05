// Local fixture only. This file is never included in extension packages.
(() => {
  const listeners = [];
  window.chrome = {
    runtime: { getURL: path => `/extension/${path}` },
    storage: {
      local: {
        get: async () => ({ settings: JSON.parse(localStorage.getItem("settings") || "null") }),
        set: async ({ settings }) => {
          const oldValue = JSON.parse(localStorage.getItem("settings") || "null");
          localStorage.setItem("settings", JSON.stringify(settings));
          for (const listener of listeners) listener({ settings: { oldValue, newValue: settings } }, "local");
        }
      },
      onChanged: { addListener: listener => listeners.push(listener) }
    }
  };
  window.addEventListener("storage", event => {
    if (event.key === "settings") for (const listener of listeners) listener({ settings: { newValue: JSON.parse(event.newValue) } }, "local");
  });
})();
