// Validate the descriptive data-coverage audit against the live data and the frozen model registries.
// Guards: (7) historical extension cannot change formal samples, (8) no audited observation is silently replaced,
// (9) no missing value becomes zero. Usage: node scripts/data-coverage/validate.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT_PATH, FORMAL_REGISTRIES, formalSamples, loadSeries, seriesFingerprint, windowFingerprint } from "./audit.mjs";
import { buildInventory, INVENTORY_PATH, CATEGORIES } from "./recovery-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const audit = JSON.parse(fs.readFileSync(path.join(root, AUDIT_PATH), "utf8"));
const series = loadSeries();
const byKey = new Map(series.map((s) => [s.key, s]));
const categories = Object.keys(audit.policy.feasibility_categories);

// --- Structure: descriptive coverage and formal samples are separate fields ------------------------------------
check(audit.schema_version === "descriptive-data-coverage-audit-v2.0", "audit schema version");
check(/Do not ingest historical data/.test(audit.policy.historical_data_gate), "historical-data gate recorded");
for (const r of audit.records) {
  check(r.descriptive_coverage?.earliest && r.descriptive_coverage?.latest && Number.isInteger(r.descriptive_coverage.observation_count), `${r.series_key}: descriptive coverage`);
  check(Array.isArray(r.model_usage?.formal_model_samples), `${r.series_key}: formal samples listed separately`);
  check(categories.includes(r.historical_extension.feasibility), `${r.series_key}: known feasibility category`);
  if (r.historical_extension.feasibility.startsWith("safe_descriptive_backfill")) check(r.historical_extension.evidence === "retrieved_raw_extract" && r.historical_extension.definition_compatible_floor, `${r.series_key}: 'safe' requires an archived official extract and a cleared definition floor`);
  if (r.model_usage.formal_model_samples.length) check(r.historical_extension.feasibility !== "safe_descriptive_backfill" || r.model_usage.status !== "descriptive_only", `${r.series_key}: model usage status consistent`);
}

// --- Completeness: every stored series is audited ---------------------------------------------------------------
const audited = new Map(audit.records.map((r) => [r.series_key, r]));
for (const s of series) check(audited.has(s.key), `${s.key}: new series must be added to the coverage audit (node scripts/data-coverage/audit.mjs)`);

// --- (8) No audited observation replaced, deleted or zero-filled -----------------------------------------------
for (const r of audit.records) {
  const s = byKey.get(r.series_key);
  check(Boolean(s), `${r.series_key}: audited series still present`);
  check(seriesFingerprint(s, ...r.fingerprint.window) === r.fingerprint.sha256, `${r.series_key}: observations inside ${r.fingerprint.window.join("..")} changed — re-audit explicitly if this is an intended official revision`);
}

// --- (9) Missing values never become zero ----------------------------------------------------------------------
const rowsById = new Map(series.flatMap((s) => s.rows.map((row) => [row.id, row])));
for (const r of audit.records) for (const id of r.null_observation_ids) {
  const row = rowsById.get(id);
  check(!row || row.value === null, `${id}: audited missing value was filled (${row?.value})`);
  check(!row || row.value !== 0, `${id}: missing value converted to 0`);
}
const levelLike = (s) => s.transformation === "level" && s.dataset !== "annual_observations" && s.dataset !== "annual_panel" && s.dataset !== "regional";
for (const s of series.filter(levelLike)) {
  const r = audited.get(s.key);
  const outside = s.rows.filter((row) => row.period < r.fingerprint.window[0] || row.period > r.fingerprint.window[1]);
  check(outside.every((row) => row.value !== 0), `${s.key}: new out-of-window level observation is exactly 0 (possible zero-filled gap)`);
}

// --- (7) Formal model samples are unchanged by any descriptive extension -----------------------------------------
for (const [file, hash] of Object.entries(audit.formal_sample_registries)) {
  check(FORMAL_REGISTRIES.includes(file), `${file}: registered formal-sample registry`);
  check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex") === hash, `${file}: formal sample registry changed`);
}
const formal = formalSamples(series);
for (const r of audit.records) {
  check(JSON.stringify(formal.get(r.series_key) ?? []) === JSON.stringify(r.model_usage.formal_model_samples), `${r.series_key}: formal model samples changed`);
  for (const sample of r.model_usage.formal_model_samples) {
    if (!sample.sample_start || !sample.sample_end || sample.status !== "frozen_published") continue;
    const s = byKey.get(r.series_key);
    const inWindow = s.rows.filter((row) => row.period >= sample.sample_start && row.period <= sample.sample_end);
    check(inWindow.length > 0 && sample.sample_start >= r.descriptive_coverage.earliest, `${r.series_key}: ${sample.model_family} window lies inside audited coverage`);
  }
}

// --- Self-test of the fingerprint semantics on a synthetic series -----------------------------------------------
{
  const base = [{ period: "2015-01", value: 1.5 }, { period: "2015-02", value: null }, { period: "2015-03", value: 2 }];
  const fp = windowFingerprint(base, "2015-01", "2015-03");
  check(windowFingerprint([{ period: "2014-12", value: 1.4 }, ...base], "2015-01", "2015-03") === fp, "self-test: earlier backfill leaves the fingerprint unchanged");
  check(windowFingerprint([...base, { period: "2015-04", value: 2.1 }], "2015-01", "2015-03") === fp, "self-test: later months leave the fingerprint unchanged");
  check(windowFingerprint(base.map((r) => r.period === "2015-02" ? { ...r, value: 0 } : r), "2015-01", "2015-03") !== fp, "self-test: zero-filling a gap changes the fingerprint");
  check(windowFingerprint(base.map((r) => r.period === "2015-03" ? { ...r, value: 2.01 } : r), "2015-01", "2015-03") !== fp, "self-test: replacing a value changes the fingerprint");
}

// --- Phase R historical recovery inventory (2026-11-10) -----------------------------------------------------------
// The committed inventory reproduces exactly from the committed stores; every audited contract is inventoried;
// every missing period carries a category and a reason; nothing official is lost in ingestion; recovered counts
// match the store manifests; comparable periods only use admitted periods.
const inventory = JSON.parse(fs.readFileSync(path.join(root, INVENTORY_PATH), "utf8"));
check(JSON.stringify(buildInventory()) === JSON.stringify(inventory), "historical recovery inventory does not reproduce from the committed stores (node scripts/data-coverage/recovery-inventory.mjs)");
for (const [file, hash] of Object.entries(inventory.inputs)) check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex") === hash, `${file}: inventory input changed`);
const inventoryKeys = new Set(inventory.series.map((s) => `${s.key.split("|")[0]}|${s.region_id ?? s.country}|${s.indicator}`));
const inventoryByIndicator = new Map(); for (const s of inventory.series) { const k = `${s.key.split("|")[0]}|${s.indicator}`; inventoryByIndicator.set(k, (inventoryByIndicator.get(k) ?? 0) + 1); }
for (const r of audit.records) {
  if (r.dataset === "annual_panel") { check(inventory.frozen_formal_frame.some((f) => f.country === r.country && f.indicator === r.indicator), `${r.series_key}: frozen panel series listed`); continue; }
  if (!["level", "yoy_rate"].includes(r.transformation)) { check(inventory.summary.transformation_series_not_separately_inventoried.some((t) => t.startsWith(`${r.indicator}:`)), `${r.series_key}: transformation series listed`); continue; }
  const indicator = r.dataset === "high_frequency" && r.transformation === "yoy_rate" ? "hicp_annual_rate" : r.indicator;
  const scope = ["annual_observations", "annual_history"].includes(r.dataset) ? "annual" : ["high_frequency", "macro_drivers", "monthly_history"].includes(r.dataset) ? "monthly" : ["regional", "regional_history"].includes(r.dataset) ? "regional" : r.dataset;
  if (scope === "regional") check((inventoryByIndicator.get(`regional|${indicator}`) ?? 0) > 0, `${r.series_key}: regional contracts inventoried`);
  else check(inventoryKeys.has(`${scope}|${r.country}|${indicator}`), `${r.series_key}: contract missing from the recovery inventory`);
}
const categoryIds = Object.keys(CATEGORIES).map(Number);
for (const s of inventory.series) {
  for (const g of s.missing.periods) check(categoryIds.includes(g.category) && g.reason && g.from && g.to && g.from <= g.to, `${s.key}: missing periods carry a category and a reason`);
  check(Object.values(s.missing.by_category).reduce((a, b) => a + b, 0) === s.missing.count, `${s.key}: missing-period count consistent`);
  check(!s.missing.by_category[2], `${s.key}: official periods lost in ingestion or processing`);
}
check(inventory.summary.lost_in_processing === 0, "no official period lost in ingestion or processing");
const recoveredInStores = { annual_history: JSON.parse(fs.readFileSync(path.join(root, "src/data/historical/annual_descriptive_history.json"), "utf8")).records.filter((r) => r.recovery_phase === "R").length, monthly_history: JSON.parse(fs.readFileSync(path.join(root, "src/data/historical/monthly_descriptive_history.json"), "utf8")).records.filter((r) => r.recovery_phase === "R").length, regional_history: JSON.parse(fs.readFileSync(path.join(root, "src/data/historical/regional_descriptive_history.json"), "utf8")).records.filter((r) => r.recovery_phase === "R").length };
for (const [k, n] of Object.entries(recoveredInStores)) check(inventory.summary.recovered_in_phase_r[k] === n, `${k}: recovered count matches the store`);
for (const [indicator, c] of Object.entries(inventory.comparability.national_annual)) {
  const lists = c.countries.map((country) => inventory.series.find((s) => s.key === `annual|${country}|${indicator}`));
  check(lists.every(Boolean), `${indicator}: comparability countries are inventoried contracts`);
  check(c.all_country_common_periods.count <= Math.min(...lists.map((s) => s.admitted?.periods ?? 0)), `${indicator}: common periods cannot exceed any country's admitted periods`);
}

console.log(JSON.stringify({ status: "pass", checks, series: audit.records.length, formal_input_series: audit.summary.formal_model_input_series, inventory_contracts: inventory.series.length, recovered: inventory.summary.recovered_in_phase_r.total }));
