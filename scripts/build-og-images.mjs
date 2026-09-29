// Build-time share images (1200×630 PNG) for the static export: public/og/site.png and public/og/countries/<slug>.png.
// Rendered with Next's built-in `next/og` (no extra dependency) and written as real .png files so GitHub Pages serves
// them as image/png. Latin text only: the renderer has no CJK font. Country images show the latest formal observation
// of three core indicators; a missing value is "—", never 0. Output is generated, not committed (see .gitignore).
// Usage: node scripts/build-og-images.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const { ImageResponse } = require("next/og");
const { createElement: h } = require("react");
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const outDir = path.join(root, "public/og");
const size = { width: 1200, height: 630 };
const release = read("src/data/release.json");
const countries = read("src/data/countries/countries.json").records;
const observations = read("src/data/observations/observations.json").records;

const frame = (children) => h("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f4f2ee", padding: "64px 80px", color: "#18222d" } }, ...children);
const footer = (left, right) => h("div", { style: { display: "flex", justifyContent: "space-between", borderTop: "2px solid #d8d2c6", paddingTop: 22, fontSize: 24, color: "#52616b" } }, h("span", null, left), h("span", null, right));
const kicker = (text) => h("div", { style: { display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#a3432f" } }, text);

async function render(element, file) {
  const response = new ImageResponse(element, size);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

await render(frame([
  kicker(`Research platform · ${release.version.split(" ")[0]}`),
  h("div", { style: { display: "flex", flexDirection: "column" } },
    h("div", { style: { display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 } }, "Central Europe"),
    h("div", { style: { display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05, color: "#a3432f" } }, "Political Atlas"),
    h("div", { style: { display: "flex", marginTop: 26, fontSize: 32, color: "#52616b" } }, "Political economy data, regional facts and transparent analysis across ten countries")),
  footer("hy-central-europe-analysis.org", "Official statistics · traceable sources"),
]), path.join(outDir, "site.png"));

const METRICS = [
  ["gdp_per_capita_eur", "GDP per capita", (v) => `€${Math.round(v).toLocaleString("en-US")}`],
  ["real_gdp_growth", "Real GDP growth", (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`],
  ["unemployment_rate", "Unemployment rate", (v) => `${v.toFixed(1)}%`],
];
for (const country of countries) {
  const latest = (id) => observations.filter((o) => o.country_slug === country.slug && o.indicator === id && o.value !== null).sort((a, b) => b.year - a.year)[0];
  await render(frame([
    kicker("Country research profile"),
    h("div", { style: { display: "flex", fontSize: 100, fontWeight: 700, lineHeight: 1 } }, country.name),
    h("div", { style: { display: "flex", gap: 28 } }, ...METRICS.map(([id, label, format]) => {
      const obs = latest(id);
      return h("div", { key: id, style: { display: "flex", flexDirection: "column", flex: 1, background: "#ffffff", border: "2px solid #d8d2c6", borderRadius: 18, padding: "24px 28px" } },
        h("div", { style: { display: "flex", fontSize: 22, color: "#52616b" } }, label),
        h("div", { style: { display: "flex", marginTop: 10, fontSize: 50, fontWeight: 700 } }, obs ? format(obs.value) : "—"),
        h("div", { style: { display: "flex", marginTop: 6, fontSize: 20, color: "#52616b" } }, obs ? `${obs.year} · official statistics` : "not available"));
    })),
    footer("Central Europe Political Atlas", "hy-central-europe-analysis.org"),
  ]), path.join(outDir, "countries", `${country.slug}.png`));
}
console.log(JSON.stringify({ written: 1 + countries.length, dir: "public/og" }));
