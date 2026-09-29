// Minimal static server for the exported site (out/), used by the Playwright UI tests. No dependencies.
// Mirrors GitHub Pages: trailing-slash routes serve index.html, content type by extension, 404.html for misses.
// Usage: node scripts/serve-out.mjs [port]   (default 4310)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4310);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".geojson": "application/geo+json", ".csv": "text/csv; charset=utf-8", ".zip": "application/zip", ".webmanifest": "application/manifest+json" };

http.createServer((request, response) => {
  const url = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  let file = path.join(root, url);
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    const notFound = path.join(root, "404.html");
    response.writeHead(404, { "Content-Type": types[".html"] }).end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Serving out/ on http://127.0.0.1:${port}`));
