// SEO / share-preview checks on the static export (run after `pnpm build:site`).
// Every page: exactly one canonical equal to its own URL, og:title/description/url/image, twitter summary_large_image.
// Country pages: their own og:image. /data/ and /methodology/: parseable WebSite + Dataset JSON-LD.
// Usage: node scripts/validation/validate-seo.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "out");
const base = JSON.parse(fs.readFileSync(path.join(root, "src/data/release.json"), "utf8")).canonical_url.replace(/\/$/, "");
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const meta = (html, attr, key) => [...html.matchAll(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, "g"))].map((m) => m[1]);

const pages = [];
const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!["_next", "research-data", "data"].includes(e.name) || path.relative(out, p) === "data") walk(p); } else if (e.name === "index.html") pages.push(p); } };
walk(out);
check(pages.length >= 20, `expected the main routes in out/ (found ${pages.length})`);
for (const file of pages.filter((f) => !/\/(404|_not-found)\//.test(f))) {
  const route = `/${path.relative(out, path.dirname(file)).split(path.sep).join("/")}${path.dirname(file) === out ? "" : "/"}`;
  const html = fs.readFileSync(file, "utf8");
  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
  check(canonicals.length === 1 && canonicals[0] === `${base}${route}`, `${route}: canonical ${JSON.stringify(canonicals)} should be ${base}${route}`);
  check(meta(html, "property", "og:url")[0] === `${base}${route}`, `${route}: og:url matches the canonical`);
  check(meta(html, "property", "og:title")[0] && meta(html, "property", "og:description")[0], `${route}: og:title and og:description present`);
  const images = meta(html, "property", "og:image");
  check(images.length >= 1 && images.every((u) => u.startsWith(`${base}/`)), `${route}: absolute og:image`);
  check(meta(html, "name", "twitter:card")[0] === "summary_large_image", `${route}: twitter card is summary_large_image`);
  check(images.every((u) => /\.png$/.test(u) && fs.existsSync(path.join(out, u.slice(base.length)))), `${route}: og:image is an exported .png file`);
  if (/^\/countries\/[a-z]+\/$/.test(route)) check(images.some((u) => u.endsWith(`/og/countries/${route.split("/")[2]}.png`)), `${route}: country-specific share image`);
  if (route === "/data/" || route === "/methodology/") {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const types = blocks.flat().map((b) => b["@type"]);
    check(types.includes("WebSite") && types.includes("Dataset"), `${route}: WebSite and Dataset JSON-LD`);
  }
}
// The images themselves exist as static PNG files of the declared size (1200×630).
const pngs = [];
const walkPng = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walkPng(p); else if (e.name.endsWith(".png")) pngs.push(p); } };
walkPng(path.join(out, "og"));
check(pngs.length >= 11, `site + 10 country share images exported (found ${pngs.length})`);
for (const p of pngs) { const b = fs.readFileSync(p); check(b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, `${path.relative(out, p)} is 1200×630`); }

console.log(JSON.stringify({ status: "pass", checks, pages: pages.length, share_images: pngs.length }));
