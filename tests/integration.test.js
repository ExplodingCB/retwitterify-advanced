import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";

const read = name => readFileSync(new URL(`../extension/${name}`, import.meta.url), "utf8");
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
test("a settings change during startup takes precedence over a stale storage read", async t => {
  const dom = new JSDOM("<h1>X</h1>", { runScripts: "outside-only" });
  t.after(() => dom.window.close());
  const calls = [];
  let listener, finishRead;
  dom.window.chrome = {
    runtime: { getURL: path => path },
    storage: { local: { get: () => new Promise(resolve => { finishRead = resolve; }) },
      onChanged: { addListener: value => { listener = value; } } }
  };
  dom.window.eval(read("rules.js"));
  dom.window.Birdify.start = (_document, options) => {
    calls.push(options.enabled);
    return { update: options => calls.push(options.enabled) };
  };
  dom.window.eval(read("content.js"));
  listener({ settings: { newValue: { enabled: false } } }, "local");
  finishRead({ settings: { enabled: true } });
  await settle();
  assert.deepEqual(calls, [false]);
});
test("popup persists switches and rolls back failed saves", async t => {
  const dom = new JSDOM(read("popup.html"), { runScripts: "outside-only" });
  t.after(() => dom.window.close());
  let stored, fail = false;
  dom.window.chrome = { storage: { local: {
    get: async () => ({ settings: {} }),
    set: async value => { if (fail) throw new Error("Storage unavailable"); stored = value; }
  } } };
  dom.window.eval(read("rules.js"));
  dom.window.eval(read("popup.js"));
  await settle();
  const document = dom.window.document;
  const enabled = document.querySelector('[name="enabled"]');
  assert.equal(enabled.checked, true);
  enabled.click();
  await settle();
  assert.equal(stored.settings.enabled, false);
  assert.equal(document.querySelector("fieldset").disabled, true);
  fail = true;
  enabled.click();
  await settle();
  assert.equal(enabled.checked, false);
  assert.equal(document.querySelector("#status").dataset.error, "true");
  assert.match(document.querySelector("#status").textContent, /Couldn't save/);
});
test("manifest grants only local settings access and references existing scripts", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined);
  for (const script of manifest.content_scripts[0].js) {
    assert.ok(existsSync(new URL(`../extension/${script}`, import.meta.url)));
  }
  for (const match of manifest.content_scripts[0].matches) {
    assert.match(match, /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\*$/);
  }
});
