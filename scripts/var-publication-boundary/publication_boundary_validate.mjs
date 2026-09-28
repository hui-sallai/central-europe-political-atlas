// v2.0 VAR dynamic-response publication-boundary validator (governance; reads committed artifacts only).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

const b = read("src/data/macro/var_dynamic_response_publication_boundary.json");
check(b.schema_version === "var-dynamic-response-publication-boundary-v2.0", "boundary schema");
check(b.estimator_available === true && b.coefficient_estimation_available === true, "estimation remains available");
check(b.residual_publication_gate_status === "unresolved_no_validated_finite_sample_diagnostic" && b.validated_residual_publication_gate_available === false, "publication gate must stay unresolved");
check(b.formal_dynamic_response_ready_country_count === 0 && b.formal_irf_publication_available === false && b.formal_dynamic_response_publication_available === false, "no formal dynamic responses");
check(b.structural_identification_available === false && b.irf_uncertainty_publication_available === false && b.svar_available === false && b.bvar_available === false, "no SVAR/BVAR/structural/uncertainty capability");
check(b.production_changed === false && b.bic_changed === false && b.production_change_authorized === false && b.new_capabilities_activated === false, "production boundary");
const forbidden = /("status|_status|_validity|state)"\s*:\s*"[^"]*(validated_gate|gate_passed|passed_gate|irf_ready|validated_model|model_validated|publication_ready)/i;
check(!forbidden.test(JSON.stringify(b)), "no status may claim a validated gate, validated model or IRF readiness");
check(b.units.length === 5, "five formal units");
const readiness = [...read("src/data/macro/var_baseline_v1_readiness.json").records, ...read("src/data/macro/var_baseline_v2_readiness.json").records].filter((r) => r.estimable);
for (const u of b.units) {
  const r = readiness.find((x) => `${x.profile_id}::${x.country}` === u.unit_id);
  check(r && r.selected_lag === u.production_selected_lag && r.readiness_state === u.existing_readiness_state && JSON.stringify(r.blocking_reasons) === JSON.stringify(u.existing_blocking_reasons_zh), `unit consistent with frozen readiness: ${u.unit_id}`);
  check(u.diagnostic_publication_gate_validity === "not_validated_finite_sample" && u.conclusively_misspecified === false && u.dynamic_response_publication_eligible === false, `unit semantics: ${u.unit_id}`);
  check(u.reason_codes.includes("residual_publication_gate_unresolved") && (r.stationarity_status === "borderline") === u.reason_codes.includes("borderline_adf_stationarity"), `reason codes: ${u.unit_id}`);
  check((u.diagnostic_observed_result.p_value < 0.05) === (r.residual_status === "failed"), `observed diagnostic matches production residual status: ${u.unit_id}`);
}
for (const [name, expected] of Object.entries(b.references)) check(sha(`src/data/macro/${name}`) === expected, `reference changed: ${name}`);
const capability = read("src/data/macro/var_capability_status.json");
check(capability.current_production_diagnostic === "adjusted_portmanteau" && capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false, "capability registry unchanged");
check(capability.selection_aware_bootstrap_available_in_production === false && capability.alternative_lag_criteria_in_production === false, "no bootstrap or alternative criterion in production");
const profiles = read("src/data/macro/var_specification_profiles.json");
check(!/"criterion":\s*"(aic|hqic)"/.test(JSON.stringify(profiles)), "BIC remains the production criterion");
check(sha("src/lib/varEngine.ts") === "0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac", "production VAR engine unchanged");
const registry = read("src/data/analysis/analysis_skill_registry.json").records;
check(registry.find((r) => r.skill_id === "svar")?.state === "registry_only" && registry.find((r) => r.skill_id === "bayesian_var")?.state === "blocked", "SVAR/BVAR not activated");
console.log(JSON.stringify({ status: "pass", checks, residual_publication_gate_status: b.residual_publication_gate_status, formal_dynamic_response_ready_country_count: 0 }, null, 2));
