// Publishes to addons.mozilla.org: sets the listing icon and submits the built
// Firefox package as a new listed version. Needs AMO API credentials from
// https://addons.mozilla.org/developers/addon/api/key/ in AMO_JWT_ISSUER and
// AMO_JWT_SECRET. Usage: node scripts/amo.js [--icon-only]
import { readFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";

const root = new URL("../", import.meta.url);
const api = process.env.AMO_API || "https://addons.mozilla.org/api/v5";
const { AMO_JWT_ISSUER: issuer, AMO_JWT_SECRET: secret } = process.env;
if (!issuer || !secret) throw new Error("Set AMO_JWT_ISSUER and AMO_JWT_SECRET.");

const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
const addon = encodeURIComponent(manifest.browser_specific_settings.gecko.id);
const base64url = value => Buffer.from(value).toString("base64url");

function token() {
  const now = Math.floor(Date.now() / 1000);
  const body = `${base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${base64url(JSON.stringify({ iss: issuer, jti: randomUUID(), iat: now, exp: now + 60 }))}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
async function request(path, init = {}) {
  const response = await fetch(`${api}${path}`, { ...init, headers: { ...init.headers, Authorization: `JWT ${token()}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method || "GET"} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : {};
}
const file = async (path, type) => new Blob([await readFile(new URL(path, root))], { type });

const icon = new FormData();
icon.append("icon", await file("extension/icons/icon-128.png", "image/png"), "icon-128.png");
await request(`/addons/addon/${addon}/`, { method: "PATCH", body: icon });
console.log("Listing icon uploaded.");
if (process.argv.includes("--icon-only")) process.exit(0);

const zip = `dist/retwitterify-advanced-firefox-${manifest.version}.zip`;
const upload = new FormData();
upload.append("upload", await file(zip, "application/zip"), zip.split("/").pop());
upload.append("channel", "listed");
let status = await request("/addons/upload/", { method: "POST", body: upload });
for (let wait = 0; !status.processed; wait++) {
  if (wait === 60) throw new Error("AMO validation did not finish within five minutes.");
  await new Promise(resolve => setTimeout(resolve, 5000));
  status = await request(`/addons/upload/${status.uuid}/`);
}
if (!status.valid) throw new Error(`AMO rejected ${zip}:\n${JSON.stringify(status.validation, null, 2)}`);

const listing = await readFile(new URL("submission/listing.txt", root), "utf8");
const notes = listing.match(/^RELEASE NOTES\n([\s\S]*?)(?:\n\n|$)/m)?.[1].trim();
const version = await request(`/addons/addon/${addon}/versions/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ upload: status.uuid, ...(notes && { release_notes: { "en-US": notes } }) })
});
console.log(`Submitted ${version.version} for Mozilla review.`);
