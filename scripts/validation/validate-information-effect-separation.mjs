import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/identified-shocks");
const macroDir = path.join(root, "src/data/macro-drivers");
const read = (name, base = dir) => JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
const failures = [];
let tests = 0;
const check = (condition, message) => { tests += 1; if (!condition) failures.push(message); };

const methods = read("monetary_policy_identification_method_registry.json");
const replication = read("jk_replication_acquisition_manifest.json");
const inputs = read("information_effect_input_registry.json");
const windows = read("information_effect_window_registry.json");
const sample = read("jk_event_sample_registry.json");
const specs = read("identification_specification_registry.json");
const shocks = read("jk_event_level_shocks.json");
const monetaryMonthly = read("ecb_pure_monetary_policy_shock_monthly.json");
const informationMonthly = read("ecb_central_bank_information_shock_monthly.json");
const validation = read("information_effect_separation_validation.json");
const regimes = read("identification_regime_diagnostics.json");
const informationGate = read("monetary_policy_information_effect_registry.json");
const shockRegistry = read("shock_identification_registry.json", macroDir);
const lp = read("lp_readiness_registry.json", macroDir);

const method = methods.records.find((row) => row.method_id === "jarocinski_karadi_sign_restrictions_v1");
check(Boolean(method && method.input_variables.some((value) => value.includes("3-month Eonia OIS"))), "JK rate input is not registered.");
check(method?.sign_restrictions?.monetary_policy?.rate === "+" && method?.sign_restrictions?.monetary_policy?.stock === "-", "Monetary-policy signs are wrong.");
check(method?.sign_restrictions?.central_bank_information?.rate === "+" && method?.sign_restrictions?.central_bank_information?.stock === "+", "Information-shock signs are wrong.");
check(method?.identification_family.includes("set-identifying"), "Set-identification boundary is missing.");
check(method?.rotation_method.includes("QR decomposition") && method?.rotation_method.includes("uniform prior"), "Reference rotation policy is incomplete.");
check(replication.project_doi === "10.3886/E231538V1" && replication.checksum === null && replication.checksum_status.includes("unavailable"), "Blocked replication checksum was not represented honestly.");
check(replication.redistribution_status === "no_replication_asset_redistributed", "Replication redistribution boundary failed.");
check(inputs.records[0]?.rate_surprise_field === "OIS_3M" && inputs.records[0]?.equity_surprise_field === "STOXX50", "Input field mapping failed.");
check(inputs.records[0]?.transformations.startsWith("identity"), "Unregistered input transformation found.");
check(windows.records[0]?.official_sheet === "Monetary Event Window" && windows.records[0]?.aggregation.includes("sum"), "Combined window mapping failed.");
check(sample.record_count === 315 && sample.eligible_count + sample.excluded_count === sample.record_count, "Event sample accounting failed.");
check(new Set(sample.records.map((row) => row.event_id)).size === sample.record_count, "Duplicate event IDs found.");
check(sample.records.every((row, index, rows) => index === 0 || `${rows[index - 1].event_date}|${rows[index - 1].event_id}` <= `${row.event_date}|${row.event_id}`), "Canonical event order is unstable.");
check(sample.records.every((row) => row.transformation_rule.startsWith("identity")), "Event input transformations are inconsistent.");
check(sample.records.every((row) => ["policy_dominant", "information_dominant", "ambiguous"].includes(row.poor_mans_sign_screen)), "Poor-man diagnostic contains an invalid label.");
check(specs.records.find((row) => row.specification_id === "A_jk_reference_baseline")?.state === "blocked", "Blocked JK baseline was overstated.");
check(specs.records.find((row) => row.specification_id === "C_poor_mans_diagnostic")?.state === "diagnostic_active", "Poor-man diagnostic is not registered.");
check(shocks.structural_component_count === 0 && shocks.records.every((row) => row.monetary_policy_component === null && row.information_component === null), "Unvalidated structural components were published.");
check(shocks.records.every((row) => row.validation_status === "blocked_not_an_identified_shock" && row.rotation_metadata.draw_count === 0), "Blocked event-output metadata is inconsistent.");
check(monetaryMonthly.record_count === 0 && informationMonthly.record_count === 0 && monetaryMonthly.identification_status === "withheld_blocked" && informationMonthly.identification_status === "withheld_blocked", "Unvalidated monthly separated shocks were published.");
check(validation.status === "partial" && validation.failures === 0 && validation.blocked > 0, "Validation status does not distinguish blocked gates from failures.");
check(validation.synthetic_cases.every((row) => row.passed), "Synthetic sign cases failed.");
check(validation.gates.find((row) => row.gate_id === "official_replication_asset_checksum")?.status === "blocked", "Reference checksum gate was not blocked.");
check(validation.gates.find((row) => row.gate_id === "different_seed_sensitivity")?.status === "blocked", "Different-seed sensitivity was overstated.");
check(regimes.regimes.every((row) => row.independently_reestimated === false), "A regime was silently re-estimated.");
check(informationGate.records.every((row) => row.information_effect_handling === "partially_addressed" && row.identified_shock_allowed === false), "Information-effect promotion gate failed.");
check(shockRegistry.identified_shock_count === 0 && shockRegistry.external_innovation_proxy_count === 3, "Identification counts changed without validation.");
check(lp.method_state === "registry_only" && lp.causal_lp_ready_count === 0 && lp.estimator_ready_count === 0, "Local Projections was activated.");
check(lp.records.every((row) => typeof row.shock_identification_ready === "boolean" && typeof row.outcome_data_ready === "boolean" && row.estimator_ready === false && row.causal_lp_ready === false), "Split LP readiness fields are incomplete.");

if (failures.length) {
  console.error(`Information-effect validation failed (${failures.length}/${tests}).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Information-effect validation passed: ${tests} tests; formal JK status=${method.replication_status}; identified shocks=${shockRegistry.identified_shock_count}.`);
