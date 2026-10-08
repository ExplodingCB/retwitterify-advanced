// Renders the Chrome Web Store screenshots and promo tiles from
// submission/chrome/source with headless Chrome. The "after" mocks run the
// real extension scripts. Usage: CHROME=/path/to/chrome node scripts/store-images.js
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve, extname, sep } from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "submission/chrome/source");
const output = join(root, "submission/chrome");
const chrome = process.env.CHROME || "google-chrome";
const images = [
  ["screenshot-1.html", "screenshot-1.png", 1280, 800],
  ["screenshot-2.html", "screenshot-2.png", 1280, 800],
  ["screenshot-3.html", "screenshot-3.png", 1280, 800],
  ["promo-small.html", "promo-small-440x280.png", 440, 280],
  ["promo-marquee.html", "promo-marquee-1400x560.png", 1400, 560]
];
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  const path = pathname.startsWith("/extension/") ? resolve(root, pathname.slice(1)) : resolve(source, pathname.slice(1));
  if (![join(root, "extension") + sep, source + sep].some(allowed => path.startsWith(allowed))) return res.writeHead(404).end();
  try {
    let data = await readFile(path);
    // The popup needs the same storage shim as the local preview fixture.
    if (pathname === "/extension/popup.html") {
      const shim = await readFile(join(root, "tests/preview-api.js"), "utf8");
      data = Buffer.from(data.toString().replace('<script src="rules.js"', `<script>${shim}</script><script src="rules.js"`));
    }
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const scratch = await mkdtemp(join(tmpdir(), "birdify-store-"));
try {
  for (const [page, name, width, height] of images) {
    const shot = join(scratch, name);
    // Headless Chrome's viewport is shorter than its window, so render tall and crop.
    await promisify(execFile)(chrome, [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--user-data-dir=${join(scratch, "profile")}`, `--window-size=${width},${height + 200}`,
      "--virtual-time-budget=4000", `--screenshot=${shot}`, `${origin}/${page}`
    ]);
    await sharp(shot).extract({ left: 0, top: 0, width, height }).flatten({ background: "#ffffff" }).png().toFile(join(output, name));
    console.log(`${name} (${width}x${height})`);
  }
} finally {
  server.close();
  await rm(scratch, { recursive: true, force: true });
}
