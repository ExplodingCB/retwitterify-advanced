import { readFile, readdir, writeFile, mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";

const root = fileURLToPath(new URL("../", import.meta.url));
const version = JSON.parse(await readFile(join(root, "extension/manifest.json"), "utf8")).version;
const source = {};
async function collect(relative) {
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else source[path] = new Uint8Array(await readFile(join(root, path)));
  }
}
// Explicit allowlist; never include browser profiles, credentials or node_modules.
for (const directory of ["extension", "scripts", "tests", "docs"]) await collect(directory);
for (const name of ["package.json", "package-lock.json", "LICENSE", "THIRD_PARTY_NOTICES", "README.md"]) {
  source[name] = new Uint8Array(await readFile(join(root, name)));
}
source["BUILD.txt"] = Buffer.from(
  "ReTwitterify Advanced source\n\nRequires Node.js 22 or newer and npm.\n" +
  "Run npm ci, npm test, npm run build, and npm run lint:firefox.\n" +
  `Firefox output: dist/firefox and dist/retwitterify-advanced-firefox-${version}.zip.\n` +
  "All runtime JavaScript is copied unchanged from extension/. No transpilation or minification.\n" +
  "scripts/build.js rasterizes the bundled MPL-2.0 bird geometry into PNG icons with sharp.\n" +
  "Development dependencies are fetched exclusively through npm using package-lock.json.\n"
);
const destination = join(root, "submission");
await mkdir(destination, { recursive: true });
const names = [`retwitterify-advanced-firefox-${version}.zip`, `retwitterify-advanced-reviewer-source-${version}.zip`];
await cp(join(root, "dist", names[0]), join(destination, names[0]));
await writeFile(join(destination, names[1]), zipSync(source));
await cp(join(root, "extension/icons/icon-128.png"), join(destination, "store-icon-128.png"));
const checksums = [];
for (const name of names) {
  checksums.push(`${createHash("sha256").update(await readFile(join(destination, name))).digest("hex")}  ${name}`);
}
await writeFile(join(destination, "SHA256SUMS.txt"), checksums.join("\n") + "\n");
const releaseChecksums = [];
for (const name of [`retwitterify-advanced-chromium-${version}.zip`, names[0]]) {
  releaseChecksums.push(`${createHash("sha256").update(await readFile(join(root, "dist", name))).digest("hex")}  ${name}`);
}
releaseChecksums.push(checksums[1]);
await writeFile(join(root, "dist", "SHA256SUMS.txt"), releaseChecksums.join("\n") + "\n");
console.log(`Mozilla submission materials prepared in ${destination}`);
