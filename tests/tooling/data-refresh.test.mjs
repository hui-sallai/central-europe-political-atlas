// Tests for the official descriptive-data refresh tooling (scripts/data-refresh). Run: pnpm tooling:test
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compareFiles, diffStore, jsonStatSeries, NON_OVERRIDABLE, seriesFlags, sha256, verifyLedger } from "../../scripts/data-refresh/lib.mjs";
import { MODES, UNITS } from "../../scripts/data-refresh/units.mjs";

const hf = (period, value, extra = {}) => ({ observation_id: `hf:poland:hicp:${period}`, country: "poland", indicator: "hicp", period, value, unit: "RCH_A", source: "Eurostat", source_dataset: "prc_hicp_minr", definition_version: "v1", classification_version: "ECOICOP-2", index_reference: null, seasonal_adjustment: "NSA", transformation: "yoy", series_break_status: "none_recorded", ...extra });
const doc = (records) => ({ records });
const one = (canonical, staged) => diffStore("hf", doc(canonical), doc(staged), { relative: 0.02, absolute: 0.3 })[0];

test("new periods only → routine append", () => {
  const s = one([hf("2026-05", 3.1), hf("2026-06", 3.0)], [hf("2026-05", 3.1), hf("2026-06", 3.0), hf("2026-07", 2.9)]);
  assert.equal(s.new_observations.length, 1);
  assert.equal(s.current_latest_period, "2026-06");
  assert.equal(s.source_latest_period, "2026-07");
  assert.deepEqual([s.revisions.length, s.deletions.length, s.definition_changes.length], [0, 0, 0]);
});

test("revisions are split by the registered tolerance", () => {
  const s = one([hf("2026-05", 3.1), hf("2026-06", 30)], [hf("2026-05", 3.2), hf("2026-06", 31)]);
  assert.equal(s.revisions.length, 2);
  assert.deepEqual(s.revisions.map((r) => r.beyond_tolerance), [false, true]); // 0.1 ≤ 0.3; 1.0 > max(0.3, 0.6)
  assert.equal(s.revisions[1].previous, 30);
});

test("disappearing observations, unit/definition changes and zero-filled gaps are detected", () => {
  const s = one([hf("2026-05", 3.1), hf("2026-06", null), hf("2026-07", 2.0)], [hf("2026-05", 3.1, { unit: "I15" }), hf("2026-06", 0, { definition_version: "v2" })]);
  assert.equal(s.deletions.length, 1);
  assert.equal(s.unit_changes.length, 1);
  assert.equal(s.definition_changes.length, 1);
  assert.equal(s.null_to_zero.length, 1);
});

test("Serbia: cross-country status and territorial classification changes are flagged", () => {
  const sources = [{ source_ref: 0, series: "x", source_dataset: "D1", original_code: { A: "1" }, source_url: "https://opendata.stat.gov.rs/x", mapping: "x", mapping_status: "descriptive_only" }];
  const rec = (extra = {}) => ({ id: "serbia:x:RS1:2020", series: "x", territory_code: "RS1", statistical_level: "NSTJ1", classification_version: "NSTJ@2026", period: "2020", original_value: 1, original_unit: "%", normalized_value: 1, normalized_unit: "%", comparability_status: "comparable_within_segment", cross_country_comparable: false, source_ref: 0, ...extra });
  const [s] = diffStore("serbia", { series_sources: sources, records: [rec()] }, { series_sources: sources, records: [rec({ cross_country_comparable: true, classification_version: "NSTJ@2027" })] });
  assert.equal(s.cross_country_changes.length, 1);
  assert.equal(s.territorial_changes.length, 1);
});

test("regional: a geography vintage change is a territorial change, never merged silently", () => {
  const rec = (extra = {}) => ({ id: "hist:regional:a:gdp:2005", region_id: "austria_a", indicator: "gdp", statistical_year: 2005, value: 10, geo_codes: ["AT11"], nuts_vintage: "NUTS2024", comparability_status: "comparable_stable_code", source_year: 2026, ...extra });
  const meta = { indicators: { gdp: { unit: "€", definition: "GDP" } }, regions: { austria_a: { country_id: "austria" } } };
  const [s] = diffStore("regional", { ...meta, records: [rec()] }, { ...meta, records: [rec({ geo_codes: ["AT11", "AT12"] })] });
  assert.equal(s.territorial_changes.length, 1);
  assert.equal(s.country, "austria");
});

test("companion files: timestamp-only changes are separated from substantive ones", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "refresh-"));
  const write = (name, value) => { fs.writeFileSync(path.join(dir, name), JSON.stringify(value)); return path.join(dir, name); };
  const a = write("a.json", { generated_at: "2026-01-01", records: [1] });
  assert.equal(compareFiles(a, write("b.json", { generated_at: "2026-09-30", records: [1] })), "timestamp_only");
  assert.equal(compareFiles(a, write("c.json", { generated_at: "2026-01-01", records: [2] })), "substantive");
  assert.equal(compareFiles(a, path.join(dir, "missing.json")), "removed");
});

test("JSON-stat reader selects one series and skips missing cells (never zero)", () => {
  const json = { id: ["geo", "unit", "time"], size: [2, 1, 3], dimension: { geo: { category: { index: { AT: 0, HU: 1 } } }, unit: { category: { index: { PC: 0 } } }, time: { category: { index: { 2023: 0, 2024: 1, 2025: 2 } } } }, value: { 0: 1.5, 2: 2.5, 3: 9 }, status: { 2: "p" } };
  assert.deepEqual(jsonStatSeries(json, { geo: "AT" }), [{ period: "2023", value: 1.5, flag: null }, { period: "2025", value: 2.5, flag: "p" }]);
});

test("ledger hash chain detects edits", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  const file = path.join(dir, "ledger.jsonl");
  const first = JSON.stringify({ run_id: "a", previous_entry_sha256: null });
  const second = JSON.stringify({ run_id: "b", previous_entry_sha256: sha256(first) });
  fs.writeFileSync(file, `${first}\n${second}\n`);
  assert.deepEqual(verifyLedger(file), { ok: true, entries: 2, last: sha256(second) });
  fs.writeFileSync(file, `${first.replace('"a"', '"x"')}\n${second}\n`);
  assert.equal(verifyLedger(file).ok, false);
});

test("mode registry: monthly preserves historical stores; release files are never in a write-set", () => {
  assert.ok(!MODES.monthly.some((u) => /history/.test(u)));
  for (const mode of Object.keys(MODES)) for (const u of MODES[mode]) assert.ok(UNITS[u], `${mode} → ${u}`);
  for (const unit of Object.values(UNITS)) for (const p of unit.writeSet) assert.ok(!/release\.json|package\.json|CHANGELOG/.test(p));
  assert.ok(UNITS["serbia-sors"].writeSet.includes("src/data/serbia/raw/"));
});

test("new records must match the series; gaps, new and dropped series are flagged", () => {
  const unitChange = one([hf("2026-05", 3.1)], [hf("2026-05", 3.1), hf("2026-06", 3.0, { unit: "I15" })]);
  assert.deepEqual(seriesFlags(unitChange), ["unit_change"]);
  const gap = one([hf("2026-05", null), hf("2026-06", 3.0)], [hf("2026-05", 2.9), hf("2026-06", 3.0)]);
  assert.deepEqual(seriesFlags(gap), ["previously_missing_period_now_reported"]);
  const [fresh] = diffStore("hf", doc([]), doc([hf("2026-06", 1)]));
  assert.ok(seriesFlags(fresh).includes("new_series"));
  const [dropped] = diffStore("hf", doc([hf("2026-06", 1)]), doc([]));
  assert.ok(seriesFlags(dropped).includes("observation_disappeared"));
  assert.deepEqual(seriesFlags(one([hf("2026-05", 3.1)], [hf("2026-05", 3.1), hf("2026-06", 3.0)])), []);
});

test("zero-filling and cross-country promotion are never overridable", () => {
  const zero = one([hf("2026-05", null)], [hf("2026-05", 0)]);
  assert.ok(seriesFlags(zero).some((f) => NON_OVERRIDABLE.has(f)));
  const sources = [{ source_ref: 0, series: "x", source_dataset: "D", original_code: { A: "1" }, source_url: "u", mapping: "x" }];
  const rec = (period, extra = {}) => ({ id: `serbia:x:RS:${period}`, series: "x", territory_code: "RS", statistical_level: "national", period, original_value: 1, original_unit: "%", normalized_value: 1, normalized_unit: "%", comparability_status: "c", cross_country_comparable: false, source_ref: 0, ...extra });
  const [promoted] = diffStore("serbia", { series_sources: sources, records: [rec("2024")] }, { series_sources: sources, records: [rec("2024"), rec("2025", { cross_country_comparable: true })] });
  assert.ok(seriesFlags(promoted).includes("cross_country_comparability_change"));
  assert.ok(NON_OVERRIDABLE.has("cross_country_comparability_change"));
});

test("an empty placeholder month that gets its first value is a routine new period", () => {
  const s = one([hf("2026-05", 3.1), hf("2026-06", null)], [hf("2026-05", 3.1), hf("2026-06", 3.0)]);
  assert.equal(s.new_observations.length, 1);
  assert.deepEqual(seriesFlags(s), []);
});
