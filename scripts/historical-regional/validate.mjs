// Validate the Phase I regional descriptive history. Usage: node scripts/historical-regional/validate.mjs
// - every record reproduces exactly from hash-checked raw extracts and the archived GISCO NUTS code lists;
// - backfill only (years before the first stored year of that region × indicator); pairs the atlas publishes only;
// - every record carries NUTS vintage, NUTS version in force, geo codes, comparability status and source year;
// - comparability is consistent with the NUTS code lists (no year marked comparable before its codes were in force);
// - no rate aggregated across several codes; missing years absent; no map/model/scenario code reads the store.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, NUTS_CODES_PATH, NUTS_VERSIONS, REGIONAL_HISTORY_PATH, REGIONAL_MANIFEST_PATH } from "./acquire.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const history = read(REGIONAL_HISTORY_PATH);
const manifest = read(REGIONAL_MANIFEST_PATH);
const nuts = read(NUTS_CODES_PATH);

for (const s of manifest.sources) {
  check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, s.raw_file))).digest("hex") === s.sha256, `${s.raw_file}: raw extract changed`);
  check(s.retrieved_at && s.http_status === 200, `${s.raw_file}: retrieval provenance recorded`);
}
check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, NUTS_CODES_PATH))).digest("hex") === manifest.nuts_code_lists.sha256, "GISCO NUTS code lists changed");
for (const [v] of NUTS_VERSIONS) check(nuts.versions[v]?.codes?.length > 0 && nuts.versions[v].response_sha256, `NUTS ${v} code list archived`);
const rebuilt = await build({ offline: true });
check(JSON.stringify(rebuilt.history.records) === JSON.stringify(history.records), "regional history does not reproduce exactly from the archived raw extracts");
check(history.record_count === history.records.length, "record_count matches");

const stored = [...read("src/data/regional/v086-observations.json").records, ...read("src/data/regional/v089-observations.json").records];
const firstStored = new Map();
for (const r of stored) { const k = `${r.region_id}|${r.region_indicator_id}`; firstStored.set(k, Math.min(firstStored.get(k) ?? Infinity, Number(r.year))); }
const pairs = new Map(manifest.pairs.map((p) => [`${p.region_id}|${p.indicator}`, p]));
const versionOf = (year) => NUTS_VERSIONS.find(([, a, b]) => year >= a && year <= b)[0];
const ids = new Set();
const statuses = ["comparable_stable_code", "backcast_boundary_revision", "series_break"];
for (const r of history.records) {
  check(!ids.has(r.id), `${r.id}: duplicate`); ids.add(r.id);
  check(typeof r.value === "number" && Number.isFinite(r.value), `${r.id}: finite value (missing years absent)`);
  check(r.statistical_year >= 2000 && r.statistical_year < firstStored.get(`${r.region_id}|${r.indicator}`), `${r.id}: must precede the first stored year`);
  check(pairs.get(`${r.region_id}|${r.indicator}`)?.status === "ingested", `${r.id}: pair not cleared`);
  check(r.nuts_vintage && r.nuts_version_in_force === versionOf(r.statistical_year) && Array.isArray(r.geo_codes) && r.geo_codes.length && statuses.includes(r.comparability_status) && Number.isInteger(r.source_year) && history.indicators[r.indicator]?.unit && history.regions[r.region_id]?.country_id, `${r.id}: boundary vintage, geography, comparability and source year recorded`);
  if (r.comparability_status === "comparable_stable_code") {
    const laterVersions = NUTS_VERSIONS.filter(([, a]) => a >= NUTS_VERSIONS.find(([v]) => v === r.nuts_version_in_force)[1]).map(([v]) => v);
    check(r.geo_codes.every((code) => laterVersions.every((v) => nuts.versions[v].codes.includes(code))), `${r.id}: marked comparable but a source code was not in force in NUTS ${r.nuts_version_in_force}`);
  }
  if (/rate$/.test(r.indicator)) check(r.geo_codes.length === 1, `${r.id}: rates must not be aggregated across codes`);
}

const allowed = [/^scripts\/export-research-data\.mjs$/, /^scripts\/historical-regional\//, /^scripts\/data-coverage\//, /^scripts\/validation\//, /^src\/components\//, /^src\/app\//];
const offenders = [];
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && fs.readFileSync(path.join(root, rel), "utf8").includes("regional_descriptive_history")) offenders.push(rel); } };
walk("src"); walk("scripts");
check(offenders.every((f) => allowed.some((re) => re.test(f))), `map/model/scenario code must not read the regional history: ${offenders.filter((f) => !allowed.some((re) => re.test(f))).join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, records: history.records.length, ...history.records.reduce((acc, r) => { acc[r.comparability_status] = (acc[r.comparability_status] ?? 0) + 1; return acc; }, {}) }));
