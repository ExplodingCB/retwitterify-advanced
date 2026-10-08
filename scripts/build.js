import { mkdir, readFile, writeFile, cp, readdir } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import sharp from "sharp";
import { zipSync } from "fflate";

const root = fileURLToPath(new URL("../", import.meta.url));
const extension = join(root, "extension");
const context = vm.createContext({});
vm.runInContext(await readFile(join(extension, "rules.js"), "utf8"), context);
const bird = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="310 310 370 370"><path fill="#1da1f2" d="${context.ReTwitterify.birdPath}"/></svg>`;
await mkdir(join(extension, "icons"), { recursive: true });
await writeFile(join(extension, "icons", "bird.svg"), bird);
for (const size of [16, 32, 48, 64, 96, 128, 192]) {
  await sharp(Buffer.from(bird)).resize(size, size).png().toFile(join(extension, "icons", `icon-${size}.png`));
}
const manifest = JSON.parse(await readFile(join(extension, "manifest.json"), "utf8"));
async function entries(folder) {
  const files = {};
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) Object.assign(files, await entries(path));
    else files[relative(extension, path).replaceAll("\\", "/")] = new Uint8Array(await readFile(path));
  }
  return files;
}
for (const browser of ["chromium", "firefox"]) {
  const target = resolve(root, "dist", browser);
  await mkdir(target, { recursive: true });
  await cp(extension, target, { recursive: true });
  const browserManifest = structuredClone(manifest);
  if (browser === "chromium") delete browserManifest.browser_specific_settings;
  const files = await entries(extension);
  files["manifest.json"] = Buffer.from(JSON.stringify(browserManifest, null, 2) + "\n");
  for (const name of ["LICENSE", "THIRD_PARTY_NOTICES"]) {
    files[name] = new Uint8Array(await readFile(join(root, name)));
    await cp(join(root, name), join(target, name));
  }
  await writeFile(join(target, "manifest.json"), files["manifest.json"]);
  const zip = join(root, "dist", `retwitterify-advanced-${browser}-${manifest.version}.zip`);
  await writeFile(zip, zipSync(files));
  console.log(`${browser}: ${target}\nArchive: ${zip}`);
}
