// v1.87 lag-selection characterization boundary validator. Reads committed artifacts only.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const doc = (name) => read(`src/data/macro/var_lag_characterization_${name}.json`);
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

check(sha("src/data/macro/var_lag_characterization_preregistration.json") === "956f4114416cd88a221adc991b079df127c8b9dea6e88f1027d050f458dc3a7a", "v1.87 preregistration changed");
const prereg = doc("preregistration");
for (const [file, expected] of Object.entries(prereg.frozen_input_sha256)) check(sha(file) === expected, `frozen input changed: ${file}`);
const conclusion = doc("research_conclusion");
check(conclusion.production_changed === false && conclusion.bic_policy_changed === false && conclusion.phase_B_run === false && conclusion.formal_irf_publication_available === false && conclusion.actual_country_data_read === false, "production / Phase B boundary");
check(conclusion.v1_85_v1_851_v1_86_modified === false, "prior releases untouched");
check(/no criterion is recommended/.test(conclusion.aic_hqic_role) && !("recommended_criterion" in conclusion) && !("gate" in conclusion), "no criterion selection or gate");
const results = doc("lag_selection_results");
check(results.criteria_roles.bic === "production" && results.criteria_roles.aic === "report_only_benchmark" && results.criteria_roles.hqic === "report_only_benchmark", "criterion roles");
const capability = read("src/data/macro/var_capability_status.json");
check(capability.current_production_diagnostic === "adjusted_portmanteau" && capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false, "production capability unchanged");
check(!/"ic_criterion":\s*"(aic|hqic)"/.test(fs.readFileSync(path.join(root, "src/data/macro/var_specification_profiles.json"), "utf8")), "production profiles must not switch to AIC/HQIC");
for (const [name, expected] of Object.entries(conclusion.provenance)) check(sha(`src/data/macro/${name}`) === expected, `conclusion provenance mismatch: ${name}`);
console.log(JSON.stringify({ status: "pass", checks, production_changed: false, phase_B_run: false }, null, 2));
