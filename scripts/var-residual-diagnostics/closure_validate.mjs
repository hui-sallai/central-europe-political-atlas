// v1.85 VAR residual-diagnostic research closure validator.
// Reads frozen artifacts only; it never simulates, refits or recomputes readiness.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const macro = path.join(root, "src/data/macro");
const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const residual = (name) => read(`src/data/macro/var_residual_diagnostic_${name}.json`);
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

const FROZEN = {
  "src/lib/varEngine.ts": "0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac",
  "src/data/macro/var_country_readiness.json": "4b8173f8202c72359758b0bf4b05ef08a6c089f2ab47f79b7be359468c97e6b1",
  "src/data/macro/var_baseline_v1_readiness.json": "f210b02ec3042c5cf95f975bccbd94f7fead0f403314d59a1e760a2046c5912e",
  "src/data/macro/var_baseline_v2_readiness.json": "b7fd4bec330ebd4db588ed63bce4de988773556b8cdc572c27f640239a2a1675",
  "src/data/macro/var_exploratory_readiness.json": "9774fa8bc87f5d84cc867e4e60bb7b1ca1a1aa432d3d81979d275caca6c3ac08",
  "src/data/macro/var_lag_diagnostic_grid.json": "2d1753188a9b5b7c8bb6f322eb53fd4241205f2d8789904498024e3a6ecd19d9",
  "src/data/panel-local-projections/panel_lp_results.json": "10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc",
  "src/data/historical-extension-audit/historical_extension_research_conclusion.json": "7ca2de4771755c0cb7ae601749092fb2e6e2cf5be04c6d5c04535b803338139a",
  "src/data/macro/var_residual_diagnostic_preregistration.json": "f9ddab6a8ff77026b83caeca1024bf8b0379a470792fb5410e3d99607818bb0b",
  "src/data/macro/var_residual_diagnostic_method_decision.json": "729c69430e6431e88f477ae24cc73bb3025e2b70fd30d118c671dbf63f40fe5c",
  "src/data/macro/var_residual_diagnostic_calibration_summary.json": "ca917656b7c0109cf0e286573effaae03dd4f8143a042524c8f24ee350073cca",
  "src/data/macro/var_residual_diagnostic_simulation_results.json": "04cc4ad5f8395f894a4c9c164fc8374841b6eb20c97dc4a8c4d7098dc6912a7e",
};
for (const [file, expected] of Object.entries(FROZEN)) check(sha(file) === expected, `frozen artifact changed: ${file}`);

// Research evidence present and internally consistent.
const prereg = residual("preregistration");
const amendment = residual("preregistration_amendment_001");
const referenceValidation = residual("reference_validation");
const results = residual("simulation_results");
const summary = residual("calibration_summary");
const decision = residual("method_decision");
const conclusion = residual("research_conclusion");
for (const name of ["reference_manifest", "reference_attempts", "reference_cases", "seed_registry", "simulation_design"]) check(fs.existsSync(path.join(macro, `var_residual_diagnostic_${name}.json`)), `missing ${name}`);
check(amendment.change_type === "clerical_frozen_input_hash_correction_only" && amendment.research_design_changed === false && amendment.simulation_started === false, "amendment 001 must stay a clerical correction made before simulation");
check(referenceValidation.status === "pass" && referenceValidation.case_count === 4 && referenceValidation.maximum_numerical_discrepancy <= referenceValidation.registered_absolute_tolerance, "reference validation pass");

const TESTS = ["pt_adjusted", "bg_lm", "edgerton_shukur_f"];
check(prereg.candidate_tests.map((t) => t.test_id).join(",") === TESTS.join(","), "candidate tests exactly PT, BG, ES");
check(prereg.candidate_list_frozen === true && prereg.fourth_test_prohibited === true, "candidate list frozen, fourth test prohibited");
for (const cell of [...results.phases.primary, ...results.phases.secondary, ...results.phases.power]) check(Object.keys(cell.diagnostics).sort().join(",") === [...TESTS].sort().join(","), `fourth test absent in ${cell.cell_id}`);
const phaseTotal = (phase) => results.phases[phase].reduce((sum, cell) => sum + cell.replications, 0);
check(results.total_replications === 2_160_000 && phaseTotal("primary") + phaseTotal("secondary") + phaseTotal("power") === 2_160_000, "2,160,000 simulations");
check(results.phases.primary.length === 72 && phaseTotal("primary") === 720_000, "72 primary cells x 10,000");
check(results.actual_country_data_read === false, "simulation read no country data");

for (const test of TESTS) {
  check(summary.primary_method_metrics[test].primary_cell_count === 72, `${test} evaluated on 72 cells`);
  check(summary.primary_method_metrics[test].system_level_eligible === false && decision.primary_method_metrics[test].system_level_eligible === false, `${test} must be ineligible`);
}
check(summary.primary_layer_breakdown.A.edgerton_shukur_f.system_level_eligible === true && summary.primary_layer_breakdown.B.edgerton_shukur_f.system_level_eligible === false, "ES Layer A pass / Layer B fail is recorded, not collapsed");
check(decision.disposition === "no_eligible_replacement" && decision.selected_method_for_possible_phase_B_evaluation === "none", "method decision");
check(decision.production_method_changed === false && decision.actual_country_diagnostics_applied === false && decision.actual_country_readiness_changed === false && decision.dynamic_responses_activated === false, "decision boundaries");

check(conclusion.schema_version === "var-residual-diagnostic-research-conclusion-v1.85", "conclusion schema");
check(conclusion.preregistration_hash === FROZEN["src/data/macro/var_residual_diagnostic_preregistration.json"], "conclusion preregistration hash");
check(conclusion.research_closed === true && conclusion.current_diagnostic_replacement_program_closed === true, "research closed");
check(conclusion.phase_B_authorized === false && conclusion.selected_replacement === "none" && conclusion.method_decision.disposition === "no_eligible_replacement", "no replacement, no Phase B");
check(conclusion.production_method_changed === false && conclusion.actual_country_diagnostics_applied === false && conclusion.actual_country_readiness_changed === false, "no production or country change");
check(conclusion.formal_dynamic_response_ready_count === 0 && conclusion.formal_irf_publication_available === false, "formal dynamic response unavailable");
check(conclusion.simulation_replications.total === 2_160_000 && conclusion.primary_cell_count === 72 && conclusion.candidate_tests.length === 3 && conclusion.fourth_test_added === false, "conclusion counts");
check([conclusion.pt_result, conclusion.bg_result, conclusion.es_result].every((r) => r.system_level_eligible === false), "conclusion eligibility");
check(conclusion.full_results_artifact.sha256 === FROZEN["src/data/macro/var_residual_diagnostic_simulation_results.json"] && conclusion.full_results_artifact.regenerated_for_v1_85_release === false, "full results SHA recorded, not regenerated");
const future = conclusion.future_research_boundary.registered_future_candidates.find((c) => c.candidate_id === "var_lag_selection_residual_diagnostic_joint_calibration");
check(future?.state === "not_started" && future.owner_approval_required === true && future.new_preregistration_required === true, "joint-calibration candidate registered as not started");
for (const [file, hash] of Object.entries(conclusion.provenance)) check(sha(`src/data/macro/${file}`) === hash, `conclusion provenance mismatch: ${file}`);

// Capability and registry boundary.
const capability = read("src/data/macro/var_capability_status.json");
const registry = read("src/data/analysis/analysis_skill_registry.json");
const skill = registry.records.find((row) => row.skill_id === "reduced_form_var");
check(capability.schema_version === "var-capability-status-v1.85" && capability.estimator_available === true && capability.coefficient_estimation_available === true, "estimation remains active");
check(capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false && capability.irf_uncertainty_available === false && capability.structural_identification_available === false, "publication boundary");
check(capability.residual_diagnostic_calibration_research === "completed" && capability.residual_diagnostic_replacement === "none_eligible" && capability.phase_B_real_country_comparison === "not_authorized", "capability research status");
check(capability.current_production_diagnostic_calibration === "failed_preregistered_joint_platform_gate" && capability.fixed_lag_es_calibration === "passed_primary_layer_A" && capability.full_procedure_es_calibration === "failed_joint_layer_A_B", "calibration statuses");
check(skill?.state === "active" && skill.diagnostic_calibration?.residual_autocorrelation_h12_primary?.calibration_status === "not_size_validated_for_full_platform_procedure", "registry calibration status");

// Fail-safe: ES (or BG) must never become an active formal gate without a new
// owner-approved research program and release decision.
const authorization = capability.residual_diagnostic_gate_change_authorization;
const authorized = authorization?.owner_approved === true && /^[a-f0-9]{64}$/.test(authorization?.new_preregistration_sha256 ?? "") && typeof authorization?.release_decision === "string" && authorization.new_preregistration_sha256 !== conclusion.preregistration_hash;
const gateFields = [capability.current_production_diagnostic, skill?.diagnostic_calibration?.residual_autocorrelation_h12_primary?.production_diagnostic, capability.residual_diagnostic_replacement];
const esOrBgActive = gateFields.some((value) => /edgerton|shukur|\bes\b|bg_lm|breusch/i.test(String(value)) && value !== "none_eligible");
check(!esOrBgActive || authorized, "ES/BG marked as active formal gate without an owner-approved new research program and release decision");
check(authorized || (capability.current_production_diagnostic === "adjusted_portmanteau" && capability.residual_diagnostic_replacement === "none_eligible"), "production diagnostic must remain adjusted Portmanteau");
const engine = fs.readFileSync(path.join(root, "src/lib/varEngine.ts"), "utf8");
check(!/edgerton|shukur|breusch|godfrey/i.test(engine), "production engine must not reference replacement diagnostics");
for (const file of ["src/components/VarWorkbench.tsx", "src/lib/varEngine.ts"]) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  check(!/dynamicResponseReadyHorizons[^\n]*(edgerton|shukur|\bES\b)/i.test(text), `ES must not enter dynamicResponseReadyHorizons in ${file}`);
}

console.log(JSON.stringify({
  status: "pass", checks, study_id: conclusion.study_id, candidate_tests: TESTS, simulations: results.total_replications, primary_cells: 72,
  eligible: Object.fromEntries(TESTS.map((t) => [t, false])), disposition: decision.disposition, selected_replacement: "none", phase_B_authorized: false,
  production_engine_changed: false, country_readiness_changed: false, formal_dynamic_response_ready_count: 0, formal_irf_publication_available: false,
}, null, 2));
