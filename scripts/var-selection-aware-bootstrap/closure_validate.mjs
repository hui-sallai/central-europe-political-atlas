// v1.86 selection-aware bootstrap research boundary validator. Reads committed artifacts only.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const doc = (name) => read(`src/data/macro/var_selection_bootstrap_${name}.json`);
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

const PREREG_SHA256 = "c37a32d53f01e2444c990807780a0aa53781f3c88c706f65035ce0345c790b6f";
check(sha("src/data/macro/var_selection_bootstrap_preregistration.json") === PREREG_SHA256, "v1.86 preregistration changed");
const prereg = doc("preregistration");
for (const [file, expected] of Object.entries(prereg.frozen_input_sha256)) check(sha(file) === expected, `frozen input changed: ${file}`);

const decision = doc("method_decision");
const conclusion = doc("research_conclusion");
const allowed = ["no_eligible_selection_aware_bootstrap", "synthetic_gate_passed_phase_B_requires_owner_approval"];
check(allowed.includes(decision.disposition) && conclusion.disposition === decision.disposition, "disposition");
check(decision.phase_B_run === false && conclusion.phase_B_run === false && conclusion.phase_B_authorized === false, "Phase B must not run without owner approval");
check(decision.production_method_changed === false && decision.actual_country_diagnostics_applied === false && decision.actual_country_readiness_changed === false, "no production or country change");
check(decision.formal_irf_publication_available === false && conclusion.formal_irf_publication_available === false, "formal IRF unavailable");
check(conclusion.bic_policy_changed === false && conclusion.new_random_draws_after_decision === 0, "BIC unchanged; no draws after decision");

// Production boundary: the capability registry keeps the v1.85/v1.851 production diagnostic and zero formal readiness.
const capability = read("src/data/macro/var_capability_status.json");
check(capability.current_production_diagnostic === "adjusted_portmanteau" && capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false, "production capability unchanged");
check(!/bootstrap/i.test(capability.current_production_diagnostic) && capability.selection_aware_bootstrap_available_in_production !== true, "bootstrap must not be a production diagnostic");
const engine = fs.readFileSync(path.join(root, "src/lib/varEngine.ts"), "utf8");
check(!/selection_aware|recursive_iid_residual|recursive_wild_rademacher|var_selection_bootstrap/.test(engine) && sha("src/lib/varEngine.ts") === "0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac", "production engine must not reference the research bootstrap");

// v1.85 / v1.851 immutability.
const v185 = read("src/data/macro/var_residual_diagnostic_method_decision.json");
check(v185.disposition === "no_eligible_replacement", "v1.85 decision unchanged");

console.log(JSON.stringify({ status: "pass", checks, disposition: decision.disposition, selected_family: decision.selected_family, phase_B_run: false, production_changed: false }, null, 2));
