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
import { build, HISTORY_PATH, MANIFEST_PATH, REVIEW_QUEUE, REVIEW_QUEUE_AFTER_RECOVERY, RECOVERED_INDICATORS, RECOVERY_GEOS, TERRITORIAL_FLOORS, TERRITORIAL_NOTES } from "./acquire.mjs";
import { displayOnlyPatterns, displayOnlyViolations } from "../validation/display-only-readers.mjs";

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
// Phase R full-history extracts: hash-checked like the Phase G extracts.
for (const t of manifest.recovery?.tables ?? []) {
  check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, t.raw_file))).digest("hex") === t.sha256, `${t.raw_file}: archived recovery extract changed`);
  check(t.retrieved_at && t.http_status === 200, `${t.table}: recovery retrieval provenance recorded`);
}
const rebuilt = (await build({ offline: true })).history;
check(JSON.stringify(rebuilt.records) === JSON.stringify(history.records), "history store does not reproduce exactly from the archived raw extracts");
check(history.record_count === history.records.length, "record_count matches");

// --- Backfill only, floors, no missing-as-zero --------------------------------------------------------------
const observations = read("src/data/observations/observations.json").records;
const firstStored = new Map();
for (const r of observations) { const k = `${r.country_slug}|${r.indicator}`; firstStored.set(k, Math.min(firstStored.get(k) ?? Infinity, r.year)); }
const seriesInfo = new Map(manifest.series.map((s) => [`${s.country}|${s.indicator}`, s]));
const recoveryInfo = new Map((manifest.recovery?.series ?? []).map((s) => [`${s.country}|${s.indicator}`, s]));
const phaseGYears = new Set(history.records.filter((r) => r.recovery_phase === undefined).map((r) => `${r.country_slug}|${r.indicator}|${r.year}`));
check(history.records.filter((r) => r.recovery_phase === "R").length === manifest.recovery.summary.recovered_records, "recovered record count matches the manifest");
const ids = new Set();
const required = ["id", "country", "country_slug", "indicator", "year", "value", "unit", "value_status", "source", "source_dataset", "source_query_url", "source_reliability", "definition", "updated_at", "comparability_status", "provenance"];
for (const r of history.records) {
  check(required.every((f) => r[f] !== undefined && r[f] !== ""), `${r.id}: provenance fields complete`);
  check(!ids.has(r.id), `${r.id}: duplicate id`); ids.add(r.id);
  check(r.descriptive_only === true, `${r.id}: marked descriptive_only`);
  check(typeof r.value === "number" && Number.isFinite(r.value), `${r.id}: value is a finite number (missing years must be absent, not null/zero)`);
  const stored = firstStored.get(`${r.country_slug}|${r.indicator}`);
  check(stored === undefined || r.year < stored, `${r.id}: duplicates or overlaps a stored observations.json year`);
  if (r.recovery_phase === undefined) {
    // Phase G records: unchanged rules.
    check(r.year >= 2000, `${r.id}: before the 2000 Phase G target floor`);
    const info = seriesInfo.get(`${r.country_slug}|${r.indicator}`);
    check(info?.status === "ingested", `${r.id}: series not cleared for ingestion`);
    if (info?.definition_compatible_floor) check(r.year >= info.definition_compatible_floor, `${r.id}: before the definition-compatible floor`);
    check(r.country_slug !== "serbia", `${r.id}: Serbia is not part of Phase G`);
    check(!REVIEW_QUEUE.some((q) => q.id === r.indicator), `${r.id}: Phase G must not hold review-queue indicators`);
  } else {
    // Phase R records: recovered series only, strictly before the earliest year admitted before recovery, never
    // before the definition-compatible or territorial floor, and never a duplicate of a Phase G year.
    check(r.recovery_phase === "R", `${r.id}: unknown recovery phase`);
    const info = recoveryInfo.get(`${r.country_slug}|${r.indicator}`);
    check(info?.status === "recovered", `${r.id}: series not cleared for recovery`);
    check(info?.first_admitted_before_recovery === null || r.year < info.first_admitted_before_recovery, `${r.id}: not before the earliest previously admitted year`);
    if (info?.kind !== "derived") check(Number.isInteger(info?.definition_compatible_floor) && r.year >= info.definition_compatible_floor, `${r.id}: before the definition-compatible floor`);
    else check(info.input_floors.every((f) => Number.isInteger(f) && r.year >= f) && r.provenance.input_values?.length === info.inputs.length, `${r.id}: derived value before an input floor or without its input values`);
    const code = Object.entries(RECOVERY_GEOS).find(([, [, slug]]) => slug === r.country_slug)?.[0];
    check(code !== undefined, `${r.id}: country outside the recovery scope`);
    if (TERRITORIAL_FLOORS[code]) check(r.year >= TERRITORIAL_FLOORS[code].year, `${r.id}: before the territorial floor`);
    if (TERRITORIAL_NOTES[code]) check((r.year < TERRITORIAL_NOTES[code].before) === (r.territorial_note === TERRITORIAL_NOTES[code].note), `${r.id}: pre-independence territorial note missing or misplaced`);
    check(!phaseGYears.has(`${r.country_slug}|${r.indicator}|${r.year}`), `${r.id}: duplicates a Phase G year`);
    check(r.recovery_phase !== "R" || info?.kind !== "direct" || (r.value_status !== "calculated" && r.calculation_formula === undefined), `${r.id}: a direct official value must not be marked calculated`);
  }
}
for (const q of REVIEW_QUEUE_AFTER_RECOVERY) check(!history.records.some((r) => r.indicator === q.id), `${q.id}: review-queue indicator must not be ingested`);
for (const q of REVIEW_QUEUE.filter((q) => !REVIEW_QUEUE_AFTER_RECOVERY.includes(q))) check(RECOVERED_INDICATORS.some((s) => s.id === q.id) && manifest.recovery.cleared_from_review_queue.some((c) => c.id === q.id), `${q.id}: leaves the review queue only through a documented Phase R clearance`);
check(manifest.review_queue.length === REVIEW_QUEUE_AFTER_RECOVERY.length, "manifest review queue lists the indicators still held");

// --- Isolation from formal models ---------------------------------------------------------------------------
// Publishing (export) and UI display are allowed; estimation, scenario and index code is not.
const allowed = [/^scripts\/export-research-data\.mjs$/, /^scripts\/data-refresh\//, /^scripts\/historical-annual\//, /^scripts\/data-coverage\//, /^scripts\/validation\//, /^src\/components\//, /^src\/app\//, ...displayOnlyPatterns()];
for (const problem of displayOnlyViolations(root)) check(false, problem);
const offenders = [];
const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && fs.readFileSync(path.join(root, rel), "utf8").includes("annual_descriptive_history")) offenders.push(rel); } };
walk("src"); walk("scripts");
check(offenders.every((f) => allowed.some((re) => re.test(f))), `model/scenario code must not read the descriptive history: ${offenders.filter((f) => !allowed.some((re) => re.test(f))).join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, records: history.records.length, held: manifest.summary.held_for_review.length, recovered: manifest.recovery.summary.recovered_records, review_queue: REVIEW_QUEUE_AFTER_RECOVERY.length }));
