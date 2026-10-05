import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  const requested = pathname === "/" ? "tests/preview.html" : pathname.slice(1);
  const path = resolve(root, requested);
  const allowed = path.startsWith(resolve(root, "extension") + sep) ||
    ["preview.html", "preview-api.js", "preview.js"].some(name => path === resolve(root, "tests", name));
  if (!allowed) { res.writeHead(404).end(); return; }
  try {
    let data = await readFile(path);
    if (requested === "extension/popup.html") {
      data = Buffer.from(data.toString().replace('<script src="rules.js"', '<script src="/tests/preview-api.js"></script><script src="rules.js"'));
    }
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
server.listen(4173, "127.0.0.1", () => console.log("Local extension fixture: http://127.0.0.1:4173"));
