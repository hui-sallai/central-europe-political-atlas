// Validate the Phase G annual descriptive history. Usage: node scripts/historical-annual/validate.mjs
// - every record reproduces exactly from the archived Eurostat raw extracts (hash-checked), so no value is guessed;
// - backfill only: no year already stored in observations.json, no duplicate ids, never beyond the floor;
// - missing values are absent, never null or zero-filled (an official 0.0 must be the raw cell itself);
// - provenance fields are complete; held and review-queue series are not ingested;
// - isolation: no model, scenario or composite-index code reads the descriptive history.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, HISTORY_PATH, MANIFEST_PATH, REVIEW_QUEUE } from "./acquire.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const history = read(HISTORY_PATH);
const manifest = read(MANIFEST_PATH);

// --- Raw extracts unchanged, and the store reproduces from them ----------------------------------------------
for (const t of manifest.tables) {
  check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, t.raw_file))).digest("hex") === t.sha256, `${t.raw_file}: archived raw extract changed`);
  check(t.retrieved_at && t.http_status === 200, `${t.table}: retrieval provenance recorded`);
}
const rebuilt = (await build({ offline: true })).history;
check(JSON.stringify(rebuilt.records) === JSON.stringify(history.records), "history store does not reproduce exactly from the archived raw extracts");
check(history.record_count === history.records.length, "record_count matches");

// --- Backfill only, floors, no missing-as-zero --------------------------------------------------------------
const observations = read("src/data/observations/observations.json").records;
const firstStored = new Map();
for (const r of observations) { const k = `${r.country_slug}|${r.indicator}`; firstStored.set(k, Math.min(firstStored.get(k) ?? Infinity, r.year)); }
const seriesInfo = new Map(manifest.series.map((s) => [`${s.country}|${s.indicator}`, s]));
const ids = new Set();
const required = ["id", "country", "country_slug", "indicator", "year", "value", "unit", "value_status", "source", "source_dataset", "source_query_url", "source_reliability", "definition", "updated_at", "comparability_status", "provenance"];
for (const r of history.records) {
  check(required.every((f) => r[f] !== undefined && r[f] !== ""), `${r.id}: provenance fields complete`);
  check(!ids.has(r.id), `${r.id}: duplicate id`); ids.add(r.id);
  check(r.descriptive_only === true, `${r.id}: marked descriptive_only`);
  check(typeof r.value === "number" && Number.isFinite(r.value), `${r.id}: value is a finite number (missing years must be absent, not null/zero)`);
  check(r.year >= 2000, `${r.id}: before the 2000 target floor`);
  const stored = firstStored.get(`${r.country_slug}|${r.indicator}`);
  check(stored === undefined || r.year < stored, `${r.id}: duplicates or overlaps a stored observations.json year`);
  const info = seriesInfo.get(`${r.country_slug}|${r.indicator}`);
  check(info?.status === "ingested", `${r.id}: series not cleared for ingestion`);
  if (info?.definition_compatible_floor) check(r.year >= info.definition_compatible_floor, `${r.id}: before the definition-compatible floor`);
  check(r.country_slug !== "serbia", `${r.id}: Serbia is in the review queue`);
}
for (const q of REVIEW_QUEUE) check(!history.records.some((r) => r.indicator === q.id), `${q.id}: review-queue indicator must not be ingested`);

// --- Isolation from formal models ---------------------------------------------------------------------------
const allowed = [/^scripts\/historical-annual\//, /^scripts\/data-coverage\//, /^scripts\/validation\//, /^src\/components\//, /^src\/app\//];
const offenders = [];
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && fs.readFileSync(path.join(root, rel), "utf8").includes("annual_descriptive_history")) offenders.push(rel); } };
walk("src"); walk("scripts");
check(offenders.every((f) => allowed.some((re) => re.test(f))), `model/scenario code must not read the descriptive history: ${offenders.join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, records: history.records.length, held: manifest.summary.held_for_review.length, review_queue: REVIEW_QUEUE.length }));
