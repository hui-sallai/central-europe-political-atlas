import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommonHorizonRows, estimateJointLocalProjection } from "../../src/lib/localProjectionEngine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/local-projections");
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
const reference = read("lp_reference_cases.json");
const results = read("lp_results.json");
const readiness = read("lp_readiness_registry.json");
const sample = read("lp_sample_policy_registry.json");
const failures = []; let tests = 0; let maximumDifference = 0;
const check = (condition, message) => { tests += 1; if (!condition) failures.push(message); };
const close = (actual, expected, label) => { const diff = Math.abs(actual - expected); maximumDifference = Math.max(maximumDifference, diff); check(diff <= reference.tolerance, `${label}: ${actual} != ${expected} (diff ${diff})`); };

const syntheticRows = buildCommonHorizonRows(reference.synthetic.calendar, { horizon: reference.synthetic.maximum_horizon, lagOrder: reference.synthetic.lag_order, transform: (future, base) => future - base });
for (const expected of reference.synthetic.checkpoints) {
  const actual = estimateJointLocalProjection(syntheticRows, { horizon: expected.horizon, lagOrder: reference.synthetic.lag_order });
  for (const key of ["beta_mp_raw", "beta_cbi_raw", "standard_error_mp", "standard_error_cbi"]) close(actual[key], expected[key], `dynamic synthetic h=${expected.horizon} ${key}`);
  check(actual.effective_n === expected.effective_n, `dynamic synthetic h=${expected.horizon} sample size changed`);
  if (expected.horizon === 0) check(actual.beta_mp_raw > 0 && actual.beta_cbi_raw < 0, "dynamic synthetic h=0 sign or horizon indexing failed");
}

for (const item of reference.cases) {
  const production = results.records.find((row) => row.model_id === item.model_id);
  check(Boolean(production), `${item.model_id} production result missing`);
  if (!production) continue;
  check(production.maximum_horizon === item.maximum_horizon, `${item.model_id} maximum horizon mismatch`);
  check(production.lag_order === item.lag_order && production.lag_augmented_order === item.lag_order + 1, `${item.model_id} lag construction mismatch`);
  for (const horizon of item.horizons) {
    const actual = production.horizons.find((row) => row.horizon === horizon.horizon);
    check(Boolean(actual), `${item.model_id} h=${horizon.horizon} missing`);
    if (!actual) continue;
    for (const key of ["beta_mp_raw", "beta_cbi_raw", "standard_error_mp", "standard_error_cbi", "mp_response_25bp"]) close(actual[key], horizon[key], `${item.model_id} h=${horizon.horizon} ${key}`);
    close(actual.cbi_response_normalized_025, horizon.cbi_response_normalized_025, `${item.model_id} h=${horizon.horizon} cbi_response_normalized_025`);
    close(actual.cbi_response_25bp, horizon.cbi_response_normalized_025, `${item.model_id} h=${horizon.horizon} required cbi_response_25bp field`);
    check(actual.effective_n === item.effective_n, `${item.model_id} h=${horizon.horizon} common-sample N mismatch`);
    check(actual.sample_start === item.sample_start && actual.sample_end === item.sample_end, `${item.model_id} h=${horizon.horizon} sample trace mismatch`);
    for (const key of ["ci90_mp", "ci95_mp", "ci90_cbi", "ci95_cbi"]) horizon[key].forEach((value, i) => close(actual[key][i], value, `${item.model_id} h=${horizon.horizon} ${key}[${i}]`));
  }
}

const formal = readiness.records.filter((row) => String(row.readiness_id).includes(":jk_joint:"));
check(readiness.method_state === "active" && readiness.causal_lp_ready_count === 44, "formal causal readiness count changed");
check(formal.every((row) => !row.causal_lp_ready || row.effective_n >= 96), "minimum usable-N gate failed");
check(formal.filter((row) => row.country === "croatia").every((row) => !row.causal_lp_ready), "Croatia regime samples were pooled or activated");
check(formal.filter((row) => row.country === "serbia" && ["unemployment", "long_term_yield"].includes(row.outcome)).every((row) => !row.causal_lp_ready), "unavailable Serbia outcomes were activated");
check(sample.shock_end === "2025-10" && sample.no_event_shock_value === 0 && sample.common_horizon_sample, "sample policy or frozen shock end changed");
check(results.records.every((row) => row.horizons[0].horizon === 0 && row.horizons.every((h) => h.effective_n === row.horizons[0].effective_n)), "h=0/common-horizon semantics failed");
check(results.records.every((row) => row.inference_method.includes("no HAC") && row.shock_normalization === 0.25), "primary inference or normalization changed");

const summary = {
  schema_version: "lp-validation-summary-v1.7", generated_at: "2026-09-01", status: failures.length ? "failed" : "passed",
  total_tests: tests, failure_count: failures.length, maximum_cross_language_difference: maximumDifference,
  synthetic_case_count: 1, real_case_count: reference.cases.length, checkpoint_count: reference.cases.reduce((sum, row) => sum + row.horizons.length, 0),
  formal_readiness_records: formal.length, causal_lp_ready_count: readiness.causal_lp_ready_count,
  boundaries: { panel_lp: false, state_dependent_lp: false, svar: "registry_only", bayesian_var: "blocked", intervals: "pointwise", hac: false }, failures,
};
fs.writeFileSync(path.join(dir, "lp_validation_summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) { console.error(JSON.stringify(summary, null, 2)); process.exit(1); }
console.log(`LP validation passed: ${tests} tests; ${summary.checkpoint_count} real checkpoints; max diff=${maximumDifference}.`);
