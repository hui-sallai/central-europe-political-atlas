// Historical coverage closure (2026-11-10): the dated audit snapshot must reproduce and keep its findings honest.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildClosure, matrixCsv, inputHashes, STATUS, CLOSURE_JSON, CLOSURE_CSV, STORES } from "../../scripts/data-coverage/coverage-closure.mjs";
import { CATEGORIES } from "../../scripts/data-coverage/recovery-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const saved = JSON.parse(fs.readFileSync(path.join(root, CLOSURE_JSON), "utf8"));
const inputsUnchanged = JSON.stringify(inputHashes()) === JSON.stringify(saved.inputs);

test("closure snapshot reproduces byte-for-byte while its recorded inputs are unchanged", { skip: !inputsUnchanged && "data inputs changed after the dated audit; regenerate deliberately" }, () => {
  const closure = buildClosure();
  assert.equal(JSON.stringify(closure, null, 1) + "\n", fs.readFileSync(path.join(root, CLOSURE_JSON), "utf8"));
  assert.equal(matrixCsv(closure.matrix), fs.readFileSync(path.join(root, CLOSURE_CSV), "utf8"));
});

test("statuses map one-to-one onto the Phase R inventory categories", () => {
  for (const n of Object.keys(CATEGORIES)) assert.ok(STATUS[n], n);
  assert.equal(Object.keys(STATUS).length, 9);
  assert.deepEqual(saved.statuses, STATUS);
});

test("reconciliation: every addition is a flagged Phase R record matching the ledger; nothing earlier changed", () => {
  const r = saved.reconciliation;
  assert.equal(r.problems.length, 0);
  assert.equal(r.total_recovered, 7799);
  assert.equal(r.total_recovered, STORES.reduce((n, s) => n + s.ledger, 0));
  for (const s of r.stores) { assert.equal(s.removed, 0, s.path); assert.equal(s.changed, 0, s.path); assert.equal(s.added, s.recovered_flagged, s.path); }
  assert.ok(r.formal_stores.every((f) => f.unchanged));
  assert.equal(Object.values(r.by_source_family).reduce((a, b) => a + b, 0), 7799);
});

test("every contract is audited and full coverage is not claimed while gaps or unestablished references remain", () => {
  const s = saved.summary;
  assert.equal(s.audited, s.contracts);
  assert.equal(saved.matrix.length, s.contracts);
  assert.equal(s.full_historical_coverage, false);
  assert.ok(s.contracts_with_official_reference_not_established > 0 || Object.keys(s.gap_periods_by_status).some((k) => k !== STATUS[3]));
  assert.equal(s.gap_periods_by_status[STATUS[2]] ?? 0, 0);
  for (const row of saved.matrix) if (!row.admitted_periods) assert.notEqual(row.primary_status, STATUS.admitted, row.key);
});

test("integrity: source hashes, export copies, runtimes and model isolation all hold", () => {
  assert.equal(saved.source_files.mismatched.length, 0);
  assert.ok(saved.source_files.checked > 100);
  assert.ok(saved.exports.byte_copies.every((c) => c.identical));
  assert.equal(saved.exports.mismatches.length, 0);
  assert.deepEqual(saved.model_isolation.changed_outside_descriptive_scope, []);
  assert.equal(saved.model_isolation.research_views_exclude_phase_r, true);
});

test("provenance finding: the recorded applied_at postdates the data commit and the first deployment", () => {
  const p = saved.provenance;
  assert.ok(p.recorded.applied_at > p.evidence.data_commit.committed_at_utc);
  assert.ok(p.recorded.applied_at > p.evidence.first_deployment.deploy_job_started_utc);
  assert.ok(p.evidence.source_retrieval_window_utc.last < p.evidence.data_commit.committed_at_utc);
  assert.equal(p.recorded.units_with_per_series_detail, 0);
  assert.equal(p.proposed_correction.status, "not_applied_requires_owner_approval");
});

test("comparability: Serbia's SORS layer never decides the Eurostat unit verdict; corrections are recorded", () => {
  const c = saved.comparability;
  assert.deepEqual(c.corrections.map((x) => x.indicator).sort(), ["gdp_per_capita_eur", "manufacturing_share_gdp"]);
  for (const x of c.corrections) assert.match(x.cause, /SORS/);
  for (const [indicator, v] of Object.entries(c.comparability.national_annual)) {
    const units = new Set(v.countries.map((country) => saved.matrix.find((r) => r.key === `annual|${country}|${indicator}`) && country));
    assert.ok(units.size === v.countries.length, indicator);
    if (v.definition_check === "same table, selection and unit") assert.equal(typeof v.unit, "string", indicator);
  }
  assert.ok(!c.comparability.national_annual.hicp_inflation.countries.includes("serbia"));
});
