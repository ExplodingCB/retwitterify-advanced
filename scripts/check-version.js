import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("extension/manifest.json", root)));
const pkg = JSON.parse(readFileSync(new URL("package.json", root)));
if (manifest.version !== pkg.version) throw new Error("package.json and manifest.json versions must match.");
if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== `v${manifest.version}`) {
  throw new Error(`Release tag must be v${manifest.version}.`);
}
console.log(`Version checked: ${manifest.version}`);
