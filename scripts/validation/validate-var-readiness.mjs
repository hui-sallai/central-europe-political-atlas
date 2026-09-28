import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

const registry = read("src/data/analysis/analysis_skill_registry.json");
const legacy = read("src/data/analysis/var_readiness.json");
const capability = read("src/data/macro/var_capability_status.json");
const v1 = read("src/data/macro/var_baseline_v1_readiness.json");
const v2 = read("src/data/macro/var_baseline_v2_readiness.json");
const exploratory = read("src/data/macro/var_exploratory_readiness.json");
const combined = read("src/data/macro/var_country_readiness.json");
const skill = registry.records.find((row) => row.skill_id === "reduced_form_var");
const svar = registry.records.find((row) => row.skill_id === "svar");
const bvar = registry.records.find((row) => row.skill_id === "bayesian_var");

check(registry.schema_version === "analysis-skill-registry-v1.88", "analysis registry version");
check(skill?.state === "active", "reduced-form VAR estimator must remain active");
check(skill.readiness_reference === "var_country_readiness.json", "canonical flat readiness reference");
check(skill.capability_reference === "var_capability_status.json", "capability reference");
for (const reference of [skill.readiness_reference, skill.capability_reference]) {
  check(fs.existsSync(path.join(root, "public/research-data", reference)), `public readiness target missing: ${reference}`);
}
check(legacy.schema_version === "var-readiness-legacy-v1.31" && legacy.state === "superseded", "legacy v1.31 status");
check(legacy.superseded_by === skill.readiness_reference && legacy.not_runtime_authority === true && legacy.original_v1_31_decision === "blocked", "legacy authority boundary");
check(v1.profile.profile_id === "baseline_monthly_macro_v1" && v1.estimable_countries.join(",") === "poland,romania", "formal baseline v1 estimable countries");
check(v2.profile.profile_id === "baseline_monthly_macro_v2_seasonal_controls" && v2.estimable_countries.join(",") === "czechia,germany,hungary", "formal baseline v2 estimable countries");
check(exploratory.profile.profile_id === "exploratory_monthly_macro_fallback_v1" && exploratory.estimable_countries.join(",") === "austria,czechia,poland,romania,slovenia", "exploratory estimable countries");
for (const payload of [v1, v2]) {
  check(payload.dynamic_response_ready_countries.length === 0, `${payload.profile.profile_id} formal dynamic readiness`);
  for (const horizon of [6, 12, 18, 24]) check(payload[`dynamic_response_ready_${horizon}m_countries`].length === 0, `${payload.profile.profile_id} h=${horizon}`);
  check(payload.records.every((row) => row.dynamic_response_ready_horizons[12] === false && row.irf_available === false), `${payload.profile.profile_id} h=12/IRF publication gate`);
}
check(combined.schema_version === "var-country-readiness-v1.44" && combined.records.length === 10, "combined current readiness authority");
check(capability.schema_version === "var-capability-status-v1.88" && capability.estimator_available && capability.coefficient_estimation_available, "active estimator capability");
check(capability.formal_baseline_v1_available && capability.formal_baseline_v2_available && capability.dynamic_response_framework_available && capability.orthogonalized_irf_method_available, "implemented VAR capabilities");
check(capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_dynamic_response_ready_countries.length === 0, "zero formal dynamic-response-ready countries");
check([6, 12, 18, 24].every((horizon) => capability[`formal_dynamic_response_ready_${horizon}m_countries`].length === 0), "zero horizon-specific formal readiness");
check(capability.formal_irf_publication_available === false && capability.irf_uncertainty_available === false, "IRF publication and uncertainty boundary");
check(capability.structural_identification_available === false && capability.residual_lm_available === false && capability.structural_break_estimation_available === false && capability.seasonal_unit_root_test_available === false, "unavailable method boundaries");
check(capability.diagnostic_lag_refinement_state === "sensitivity_diagnostic_only", "diagnostic lag refinement boundary");
check(capability.residual_diagnostic_calibration_research === "completed" && capability.residual_diagnostic_replacement === "none_eligible" && capability.current_production_diagnostic === "adjusted_portmanteau" && capability.current_production_diagnostic_calibration === "failed_preregistered_joint_platform_gate" && capability.phase_B_real_country_comparison === "not_authorized", "v1.85 residual diagnostic research boundary");
check(skill.diagnostic_calibration?.residual_autocorrelation_h12_primary?.calibration_status === "not_size_validated_for_full_platform_procedure", "h12 diagnostic calibration status disclosed");
check(svar?.state === "registry_only", "SVAR must not be active");
check(bvar?.state === "blocked" && bvar.reason === "blocked_by_prior_and_validation_design", "BVAR boundary");
check(skill.presentation.output_schema.includes("conditional_orthogonalized_irf") && !skill.presentation.output_schema.includes("orthogonalized_irf"), "conditional IRF output schema");

const engine = fs.readFileSync(path.join(root, "src/lib/varEngine.ts"), "utf8");
check(engine.includes("if (!stability.stable)") && engine.includes("else if (borderlineStationarity)") && engine.includes("else if (!dynamicResponseReadyHorizons[6])") && engine.includes("let irf: VarModelResult[\"irf\"] = null"), "engine IRF gate unchanged");
const ui = fs.readFileSync(path.join(root, "src/components/VarWorkbench.tsx"), "utf8");
check(ui.includes("动态响应未通过当前诊断门。") && ui.includes("result.irf_blocked_reason"), "UI blocked state explanation");
check(ui.includes("result.irf ?") && ui.includes("<polyline"), "IRF curve remains conditional on a non-null result");
check(ui.includes("探索性规格") && ui.includes("不能替代正式基线"), "exploratory UI boundary");

const frozenPaths = [
  "src/lib/varEngine.ts",
  "src/data/analysis/var_reference_cases.json",
  "src/data/macro/var_baseline_v1_readiness.json",
  "src/data/macro/var_baseline_v2_readiness.json",
  "src/data/macro/var_exploratory_readiness.json",
  "src/data/macro/var_country_readiness.json",
  "src/data/macro/var_lag_diagnostic_grid.json",
  "src/data/high-frequency/high_frequency_observations.json",
];
const changed = execFileSync("git", ["diff", "--name-only", "0aad2ffd979ebacd9c8143dd856158b77ad02270", "--", ...frozenPaths], { cwd: root, encoding: "utf8" }).trim();
check(changed === "", `frozen VAR estimator/readiness/data changed: ${changed}`);

console.log(JSON.stringify({ status: "pass", checks, estimator_changed: false, coefficients_rerun: 0, irfs_rerun: 0, formal_estimable: { v1: v1.estimable_countries, v2: v2.estimable_countries }, exploratory_estimable: exploratory.estimable_countries, formal_dynamic_response_ready: [], formal_irf_publication_available: false }, null, 2));
