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
const lagPolicy = read("lp_lag_policy_registry.json");
const invariance = read("lp_coefficient_invariance_manifest.json");
const lagSensitivity = read("lp_lag_sensitivity_results.json");
const controlSensitivity = read("lp_control_sensitivity_results.json");
const support = read("lp_shock_support_diagnostics.json");
const influence = read("lp_influence_diagnostics.json");
const comparability = read("lp_cross_country_comparability.json");
const diagnostics = read("lp_model_diagnostic_summary.json");
const failures = []; let tests = 0; let maximumDifference = 0;
let maximumCriticalValueDifference = 0;
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
  check(production.selected_base_lag_order === item.selected_base_lag_order && production.lp_lag_count === item.lp_lag_count, `${item.model_id} lag construction mismatch`);
  check(production.augmentation_relative_to_nonaugmented_lp === 1 && !("lag_augmented_order" in production), `${item.model_id} misleading lag metadata remains`);
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
  for (const component of ["mp", "cbi"]) {
    const expectedPath = item.path_reference[component];
    const actualPath = production.simultaneous_inference;
    const criticalDifference = Math.abs(actualPath[`${component}_critical_value_95`] - expectedPath.critical_value_95);
    maximumCriticalValueDifference = Math.max(maximumCriticalValueDifference, criticalDifference);
    check(criticalDifference <= reference.simulation_tolerance, `${item.model_id} ${component} independently simulated sup-t critical value differs by ${criticalDifference}`);
    for (const [horizon, expected] of Object.entries(expectedPath.standard_errors)) {
      const actual = production.horizons.find((row) => row.horizon === Number(horizon));
      close(actual[`standard_error_${component}`], expected, `${item.model_id} ${component} path HC1 diagonal h=${horizon}`);
    }
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
check(invariance.status === "passed" && invariance.v17_hash === invariance.v171_hash, "baseline coefficient/SE hash changed during metadata migration");
check(lagPolicy.baseline.lp_lag_count_definition.includes("actual") && lagPolicy.baseline.augmentation_relative_to_nonaugmented_lp === 1, "lag metadata definitions are incomplete");
check(results.records.every((row) => row.horizons.every((h) => !("lag_augmented_order" in h) && h.lp_lag_count === row.lp_lag_count)), "horizon lag metadata does not match design matrix");
check(results.records.every((row) => row.simultaneous_inference.mp_critical_value_95 >= 1.959963984540054 && row.simultaneous_inference.cbi_critical_value_95 >= 1.959963984540054), "sup-t critical value is narrower than pointwise critical value");
check(results.records.every((row) => row.horizons.every((h) => h.simultaneous_ci95_mp[0] <= h.ci95_mp[0] && h.simultaneous_ci95_mp[1] >= h.ci95_mp[1] && h.simultaneous_ci95_cbi[0] <= h.ci95_cbi[0] && h.simultaneous_ci95_cbi[1] >= h.ci95_cbi[1])), "simultaneous band is narrower than pointwise interval");
for (const registry of [lagSensitivity, controlSensitivity, support, influence, diagnostics]) check(registry.record_count === 44, `${registry.schema_version} model coverage changed`);
check(lagSensitivity.records.every((row) => row.baseline_replacement_allowed === false && row.comparison_common_sample.effective_n >= 96), "lag sensitivity common-sample/baseline boundary failed");
check(controlSensitivity.records.every((row) => row.baseline_replacement_allowed === false && row.comparison_common_sample.effective_n >= 96), "control sensitivity common-sample/baseline boundary failed");
check(support.records.every((row) => row.sample_months === row.nonzero_mp_months + row.zero_shock_months || row.sample_months >= row.nonzero_mp_months), "shock support counts invalid");
check(influence.records.every((row) => row.automatic_deletion === false && row.largest_influence_observations.length > 0), "influence diagnostic deletion boundary failed");
check(comparability.euro_non_euro_view === "descriptive_only" && comparability.shared_shock_is_not_independent_replication, "cross-country comparison boundary failed");

const summary = {
  schema_version: "lp-validation-summary-v1.71", generated_at: "2026-09-03", status: failures.length ? "failed" : "passed",
  total_tests: tests, failure_count: failures.length, maximum_cross_language_difference: maximumDifference,
  maximum_independent_sup_t_critical_value_difference: maximumCriticalValueDifference,
  synthetic_case_count: 1, real_case_count: reference.cases.length, checkpoint_count: reference.cases.reduce((sum, row) => sum + row.horizons.length, 0),
  formal_readiness_records: formal.length, causal_lp_ready_count: readiness.causal_lp_ready_count,
  robustness_model_count: diagnostics.record_count, path_inference_ready_count: readiness.path_inference_ready_count,
  boundaries: { panel_lp: false, state_dependent_lp: false, svar: "registry_only", bayesian_var: "blocked", intervals: "pointwise_90_95_and_simultaneous_sup_t_95", significance_band: "registry_only", cross_country_difference_test: false, hac: false }, failures,
};
fs.writeFileSync(path.join(dir, "lp_validation_summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(dir, "lp_path_inference_validation.json"), `${JSON.stringify({ schema_version: "lp-path-inference-validation-v1.71", generated_at: "2026-09-03", status: failures.length ? "failed" : "passed", method: "plugin_gaussian_sup_t_joint_hc1", active_model_count: results.records.length, path_inference_ready_count: failures.length ? 0 : results.records.length, production_draw_count: 5000, independent_python_draw_count: reference.cases[0]?.path_reference?.mp?.draw_count, cross_language_reference_case_count: reference.cases.length, maximum_independent_sup_t_critical_value_difference: maximumCriticalValueDifference, simulation_tolerance: reference.simulation_tolerance, pointwise_not_wider_tested: true, reference_repository: "jm4474/Confidence_Bands", reference_commit: "6cf28bbd63313ead3c06904649dbb0766e51028a", failures }, null, 2)}\n`);
if (failures.length) { console.error(JSON.stringify(summary, null, 2)); process.exit(1); }
console.log(`LP validation passed: ${tests} tests; ${summary.checkpoint_count} real checkpoints; max diff=${maximumDifference}.`);
