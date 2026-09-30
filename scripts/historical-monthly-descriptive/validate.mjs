// Validate the Phase H monthly descriptive history. Usage: node scripts/historical-monthly-descriptive/validate.mjs
// - every record reproduces exactly from hash-checked raw extracts (archived v1.83 files are reused unchanged);
// - backfill only: every month precedes the first stored month of its frozen 2015+ counterpart series;
// - v1.83-blocked cells, held series and Serbia are absent; floors respected; values finite (missing = absent);
// - isolation: no model, scenario or composite-index code reads the monthly history.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, MONTHLY_HISTORY_PATH, MONTHLY_MANIFEST_PATH } from "./acquire.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const history = read(MONTHLY_HISTORY_PATH);
const manifest = read(MONTHLY_MANIFEST_PATH);

// --- Raw extracts unchanged; the store reproduces from them -------------------------------------------------
for (const s of manifest.sources) {
  check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, s.raw_file))).digest("hex") === s.sha256, `${s.raw_file}: raw extract changed`);
  check(s.retrieved_at && s.http_status === 200, `${s.raw_file}: retrieval provenance recorded`);
}
const v183Manifest = read("src/data/historical-extension-audit/historical_extension_source_manifest.json");
for (const s of manifest.sources.filter((x) => x.raw_file.startsWith("src/data/historical-extension-audit/"))) check(v183Manifest.sources.some((m) => m.sha256 === s.sha256), `${s.raw_file}: must be the archived v1.83 extract`);
const rebuilt = await build({ offline: true });
check(JSON.stringify(rebuilt.history.records) === JSON.stringify(history.records) && JSON.stringify(rebuilt.history.series_sources) === JSON.stringify(history.series_sources), "monthly history does not reproduce exactly from the archived raw extracts");
check(history.record_count === history.records.length, "record_count matches");

// --- Backfill only, floors, blocked cells absent, no missing-as-zero ----------------------------------------
const hf = read("src/data/high-frequency/high_frequency_observations.json").records;
const md = read("src/data/macro-drivers/macro_driver_observations.json").records;
const firstStored = new Map();
for (const r of hf) { const k = `high_frequency:${r.indicator}:${r.transformation}|${r.country}`; if (!firstStored.has(k) || r.period < firstStored.get(k)) firstStored.set(k, r.period); }
for (const r of md) { const k = `macro_drivers:${r.driver_id}:${r.transformation}|${r.country ?? r.scope}`; if (!firstStored.has(k) || r.period < firstStored.get(k)) firstStored.set(k, r.period); }
const status = new Map(manifest.series.map((s) => [`${s.series}|${s.country}`, s]));
const ids = new Set();
for (const r of history.records) {
  const src = history.series_sources[r.source_ref];
  check(src && src.series === r.series && src.country_slug === r.country_slug && src.source_url && src.raw_file && src.unit && src.definition, `${r.id}: provenance resolves`);
  check(!ids.has(r.id), `${r.id}: duplicate`); ids.add(r.id);
  check(typeof r.value === "number" && Number.isFinite(r.value), `${r.id}: finite value (missing months must be absent)`);
  check(/^\d{4}-\d{2}$/.test(r.period) && r.period >= "2000-01", `${r.id}: before the 2000-01 target floor`);
  check(r.period >= src.definition_compatible_floor, `${r.id}: before the definition-compatible floor`);
  const first = firstStored.get(`${src.store_counterpart}|${r.country_slug}`);
  check(first && r.period < first, `${r.id}: overlaps the frozen stored series (first stored ${first})`);
  check(status.get(`${r.series}|${r.country_slug}`)?.status === "ingested", `${r.id}: series not cleared`);
  check(r.country_slug !== "serbia", `${r.id}: Serbia is in the review queue`);
}
for (const [series, country] of [["industrial_production_index", "poland"], ["industrial_production_index", "romania"], ["unemployment_rate_monthly", "poland"], ["unemployment_rate_monthly", "slovakia"]]) check(!history.records.some((r) => r.series === series && r.country_slug === country), `${series}/${country}: v1.83-blocked cell must not be ingested`);
for (const s of manifest.series.filter((x) => x.status === "held_for_review")) check(!history.records.some((r) => r.series === s.series && r.country_slug === s.country), `${s.series}/${s.country}: held series must not be ingested`);

// --- Isolation from formal models ---------------------------------------------------------------------------
const allowed = [/^scripts\/export-research-data\.mjs$/, /^scripts\/data-refresh\//, /^scripts\/historical-monthly-descriptive\//, /^scripts\/data-coverage\//, /^scripts\/validation\//, /^src\/components\//, /^src\/app\//];
const offenders = [];
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && fs.readFileSync(path.join(root, rel), "utf8").includes("monthly_descriptive_history")) offenders.push(rel); } };
walk("src"); walk("scripts");
check(offenders.every((f) => allowed.some((re) => re.test(f))), `model/scenario code must not read the monthly history: ${offenders.filter((f) => !allowed.some((re) => re.test(f))).join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, records: history.records.length, not_ingested: manifest.summary.not_ingested.length }));
