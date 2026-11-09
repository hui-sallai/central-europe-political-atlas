// Phase R official historical recovery (2026-11-10): boundary rules that must keep holding.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TERRITORIAL_FLOORS, TERRITORIAL_NOTES, REVIEW_QUEUE_AFTER_RECOVERY } from "../../scripts/historical-annual/acquire.mjs";
import { REGIME_FLOORS, EURO_REFERENCE } from "../../scripts/historical-monthly-descriptive/acquire.mjs";
import { RECOVERY_FIRST_YEAR } from "../../scripts/serbia-sors/ingest.mjs";
import { runs, CATEGORIES } from "../../scripts/data-coverage/recovery-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const annual = read("src/data/historical/annual_descriptive_history.json").records;
const annualManifest = read("src/data/historical/annual_history_manifest.json");
const monthly = read("src/data/historical/monthly_descriptive_history.json");
const regional = read("src/data/historical/regional_descriptive_history.json").records;
const inventory = read("src/data/data-coverage/historical_recovery_inventory.json");
const observations = read("src/data/observations/observations.json").records;
const slugCode = { austria: "AT", germany: "DE", slovakia: "SK", slovenia: "SI", czechia: "CZ", hungary: "HU", poland: "PL", romania: "RO", croatia: "HR", serbia: "RS" };

test("annual recovery only adds years before every previously admitted year, from the floor, never a canonical year", () => {
  const canonical = new Set(observations.map((r) => `${r.country_slug}|${r.indicator}|${r.year}`));
  const recovered = annual.filter((r) => r.recovery_phase === "R");
  assert.ok(recovered.length > 1900);
  for (const r of recovered) {
    assert.ok(!canonical.has(`${r.country_slug}|${r.indicator}|${r.year}`), `${r.id} duplicates a canonical year`);
    const s = annualManifest.recovery.series.find((x) => x.indicator === r.indicator && x.country === r.country_slug);
    assert.equal(s.status, "recovered", r.id);
    if (s.first_admitted_before_recovery !== null) assert.ok(r.year < s.first_admitted_before_recovery, r.id);
  }
  // Phase G records keep the original 2000 floor and never include Serbia.
  for (const r of annual.filter((x) => x.recovery_phase === undefined)) { assert.ok(r.year >= 2000, r.id); assert.notEqual(r.country_slug, "serbia", r.id); }
});

test("territorial floors and pre-independence notes: Germany from 1991, Serbia from 1999, successor states labelled", () => {
  for (const r of annual.filter((x) => x.recovery_phase === "R")) {
    const code = slugCode[r.country_slug];
    if (TERRITORIAL_FLOORS[code]) assert.ok(r.year >= TERRITORIAL_FLOORS[code].year, r.id);
    if (TERRITORIAL_NOTES[code]) assert.equal(r.year < TERRITORIAL_NOTES[code].before, r.territorial_note === TERRITORIAL_NOTES[code].note, r.id);
  }
  assert.equal(TERRITORIAL_FLOORS.DE.year, 1991);
  assert.equal(TERRITORIAL_FLOORS.RS.year, 1999);
  assert.ok(regional.filter((r) => r.recovery_phase === "R" && r.region_id.startsWith("germany_")).every((r) => r.statistical_year >= 1991));
});

test("held review-queue indicators stay out; cleared ones are documented", () => {
  for (const q of REVIEW_QUEUE_AFTER_RECOVERY) assert.ok(!annual.some((r) => r.indicator === q.id), q.id);
  assert.ok(annualManifest.recovery.cleared_from_review_queue.length >= 7);
  for (const c of annualManifest.recovery.cleared_from_review_queue) assert.ok(c.rule && c.resolution, c.id);
});

test("no EUR rate before the euro existed, and documented policy-rate regime floors hold", () => {
  const sources = monthly.series_sources;
  for (const r of monthly.records.filter((x) => x.recovery_phase === "R")) {
    const src = sources[r.source_ref];
    assert.equal(src.recovery_phase, "R", r.id);
    if (src.raw_file.includes("÷") || r.series === "eur_usd_common") assert.ok(r.period >= EURO_REFERENCE.period, r.id);
    const regime = REGIME_FLOORS[`${r.series}|${slugCode[r.country_slug]}`];
    if (regime) assert.ok(r.period >= regime.period, r.id);
    assert.ok(r.period >= src.definition_compatible_floor, r.id);
  }
  // Phase H records keep the 2000-01 floor.
  for (const r of monthly.records.filter((x) => x.recovery_phase === undefined)) assert.ok(r.period >= "2000-01", r.id);
  // v1.83-blocked cells stay out.
  for (const [series, country] of [["industrial_production_index", "poland"], ["industrial_production_index", "romania"], ["unemployment_rate_monthly", "poland"], ["unemployment_rate_monthly", "slovakia"]]) assert.ok(!monthly.records.some((r) => r.series === series && r.country_slug === country), `${series}/${country}`);
});

test("regional pre-2000 years are boundary backcasts, never comparable", () => {
  const recovered = regional.filter((r) => r.recovery_phase === "R");
  assert.ok(recovered.length > 0);
  for (const r of recovered) { assert.equal(r.comparability_status, "backcast_boundary_revision", r.id); assert.ok(r.statistical_year < 2000, r.id); }
});

test("Serbia SORS: only 1999 is recovered, tagged, and earlier periods stay out", () => {
  assert.equal(RECOVERY_FIRST_YEAR, 1999);
  for (const k of ["annual", "monthly", "regional"]) for (const r of read(`src/data/serbia/serbia_descriptive_history_${k}.json`).records) {
    const year = Number(String(r.period).slice(0, 4));
    if (year < 2000) { assert.equal(year, 1999, r.id); assert.equal(r.recovery_phase, "R", r.id); } else assert.equal(r.recovery_phase, undefined, r.id);
  }
});

test("published research views keep their data basis: recovered rows are flagged in the runtimes", () => {
  const runtime = read("public/research-data/annual_history_runtime.json");
  const flagged = runtime.records.filter((r) => r[7] === "R").length;
  assert.equal(flagged, annual.filter((r) => r.recovery_phase === "R").length);
  assert.ok(runtime.records.every((r) => r.length === 7 || (r.length === 8 && r[7] === "R")));
  const mRuntime = read("public/research-data/monthly_history_runtime.json");
  const rRefs = new Set(mRuntime.series_sources.filter((s) => s.recovery_phase === "R").map((s) => s.source_ref));
  assert.equal(mRuntime.records.filter((r) => rRefs.has(r[5])).length, monthly.records.filter((r) => r.recovery_phase === "R").length);
  const context = fs.readFileSync(path.join(root, "src/lib/politicalEconomicContext.ts"), "utf8");
  assert.match(context, /r\[7\]!=="R"/);
  assert.match(context, /s\.recovery_phase==="R"/);
});

test("inventory: every gap is classified, nothing official is lost, common periods are observed intersections", () => {
  assert.equal(inventory.summary.lost_in_processing, 0);
  assert.deepEqual(Object.keys(inventory.categories).map(Number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(inventory.categories, CATEGORIES);
  for (const s of inventory.series) for (const g of s.missing.periods) assert.ok(g.category !== 2 && g.reason, s.key);
  // Synthetic: runs() keeps holes; a min/max intersection would not.
  assert.deepEqual(runs(["2001", "2002", "2004"]), [["2001", "2002"], ["2004", "2004"]]);
  const debt = inventory.comparability.national_annual.government_debt_gdp;
  for (const country of debt.countries) {
    const s = inventory.series.find((x) => x.key === `annual|${country}|government_debt_gdp`);
    assert.ok(debt.all_country_common_periods.count <= s.admitted.periods, country);
  }
  // Serbia's national CPI is never compared as HICP.
  assert.ok(!inventory.comparability.national_annual.hicp_inflation.countries.includes("serbia"));
});
