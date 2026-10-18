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
const bird = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="310 310 370 370"><path fill="#1da1f2" d="${context.Birdify.birdPath}"/></svg>`;
await mkdir(join(extension, "icons"), { recursive: true });
// The classic bird replaces X's logos and tab icons inside the page.
await writeFile(join(extension, "icons", "bird.svg"), bird);
for (const size of [32, 192]) {
  await sharp(Buffer.from(bird)).resize(size, size).png().toFile(join(extension, "icons", `bird-${size}.png`));
}
// The Money page's metal card, with the bird embossed where X's logo was.
// Drawn on a 856x540 card (a bank card's proportions), then tilted and
// cropped the way X frames it in the card tile.
const birdOnCard = "translate(370 104) scale(1.4) translate(-331 -363)";
const card = `<defs>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d3d4d6"/><stop offset=".45" stop-color="#b3b4b7"/><stop offset=".7" stop-color="#c7c8ca"/><stop offset="1" stop-color="#a4a5a8"/></linearGradient>
  <linearGradient id="raised" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcdddf"/><stop offset="1" stop-color="#b9babd"/></linearGradient>
  <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2e2e2"/><stop offset="1" stop-color="#a9a9a9"/></linearGradient>
  <filter id="brushed" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.002 0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <clipPath id="edge"><rect width="856" height="540" rx="38"/></clipPath>
</defs>
<g clip-path="url(#edge)">
  <rect width="856" height="540" fill="url(#metal)"/>
  <rect width="856" height="540" fill="#fff" filter="url(#brushed)"/>
  <path d="${context.Birdify.birdPath}" transform="translate(4 5) ${birdOnCard}" fill="#6f7073" opacity=".45"/>
  <path d="${context.Birdify.birdPath}" transform="translate(-3 -3) ${birdOnCard}" fill="#f4f4f5" opacity=".85"/>
  <path d="${context.Birdify.birdPath}" transform="${birdOnCard}" fill="url(#raised)" stroke="#9c9da0" stroke-width="1.5"/>
  <rect x="80" y="200" width="122" height="94" rx="16" fill="url(#chip)" stroke="#8d8d8f" stroke-width="2"/>
  <path d="M80 232h40m-40 30h40m42-30h40m-40 30h40M120 200v94m42-94v94m-42-47h42" fill="none" stroke="#8d8d8f" stroke-width="2"/>
  <rect x="1" y="1" width="854" height="538" rx="37" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>
</g>`;
await writeFile(join(extension, "icons", "card.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 408 248" preserveAspectRatio="xMinYMin slice"><g transform="translate(4 108) rotate(-16) scale(.4264)">${card}</g></svg>\n`);
// Birdify's own logo is the toolbar, add-on manager and store icon.
const logo = await readFile(join(extension, "icons", "logo.svg"));
for (const size of [16, 32, 48, 64, 96]) {
  await sharp(logo).resize(size, size).png().toFile(join(extension, "icons", `icon-${size}.png`));
}
// Store icons draw 96px artwork inside 16px of transparent padding.
await sharp(logo).resize(96, 96).extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(join(extension, "icons", "icon-128.png"));
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
  const zip = join(root, "dist", `birdify-${browser}-${manifest.version}.zip`);
  await writeFile(zip, zipSync(files));
  console.log(`${browser}: ${target}\nArchive: ${zip}`);
}
