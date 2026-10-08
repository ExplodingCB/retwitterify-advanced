// Uploads the built Chromium package to an existing Chrome Web Store item and
// submits it for review, through the Chrome Web Store API v2. Needs an OAuth
// client with the chromewebstore scope: CWS_CLIENT_ID, CWS_CLIENT_SECRET,
// CWS_REFRESH_TOKEN, plus CWS_PUBLISHER_ID and CWS_ITEM_ID from the dashboard.
// The first version must be submitted by hand; see submission/chrome/LISTING.txt.
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const { CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_PUBLISHER_ID, CWS_ITEM_ID } = process.env;
if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN || !CWS_PUBLISHER_ID || !CWS_ITEM_ID) {
  throw new Error("Set CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_PUBLISHER_ID and CWS_ITEM_ID.");
}
const api = process.env.CWS_API || "https://chromewebstore.googleapis.com";
const oauth = process.env.CWS_OAUTH || "https://oauth2.googleapis.com/token";
const item = `publishers/${CWS_PUBLISHER_ID}/items/${CWS_ITEM_ID}`;

const grant = await fetch(oauth, {
  method: "POST",
  body: new URLSearchParams({ client_id: CWS_CLIENT_ID, client_secret: CWS_CLIENT_SECRET, refresh_token: CWS_REFRESH_TOKEN, grant_type: "refresh_token" })
});
if (!grant.ok) throw new Error(`OAuth token refresh failed: ${grant.status} ${await grant.text()}`);
const { access_token: token } = await grant.json();

async function request(path, init = {}) {
  const response = await fetch(`${api}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method || "GET"} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const { version } = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
const zip = await readFile(new URL(`dist/birdify-chromium-${version}.zip`, root));
let state = (await request(`/upload/v2/${item}:upload?uploadType=media`, {
  method: "POST", headers: { "Content-Type": "application/zip" }, body: zip
})).uploadState;
for (let wait = 0; state === "IN_PROGRESS"; wait++) {
  if (wait === 60) throw new Error("Chrome Web Store upload did not finish within five minutes.");
  await new Promise(resolve => setTimeout(resolve, 5000));
  state = (await request(`/v2/${item}:fetchStatus`)).lastAsyncUploadState;
}
if (state !== "SUCCEEDED") throw new Error(`Chrome Web Store upload ${state}.`);
const published = await request(`/v2/${item}:publish`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
});
console.log(`Uploaded ${version}; submission state: ${published.state}.`);
