// v1.89 country-matched calibration boundary validator. Reads committed artifacts only.
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
check(sha("src/data/macro/var_country_matched_bootstrap_preregistration.json") === "ac42c4e568f39e582d8720967bb45a1bf88af93ba70f5e52f54c9fef23a5863a", "v1.89 preregistration changed");
const prereg = read("src/data/macro/var_country_matched_bootstrap_preregistration.json");
for (const [file, expected] of Object.entries(prereg.frozen_input_sha256)) check(sha(file) === expected, `frozen input changed: ${file}`);
const conclusion = read("src/data/macro/var_country_matched_bootstrap_research_conclusion.json");
check(["country_matched_calibration_supports_future_production_decision_research", "country_matched_calibration_does_not_support_production_adoption"].includes(conclusion.disposition), "disposition");
check(conclusion.production_change_authorized === false && conclusion.production_changed === false && conclusion.readiness_changed === false && conclusion.formal_irf_publication_available === false && conclusion.phase_B_rerun === false, "production boundary");
for (const [name, expected] of Object.entries(conclusion.provenance)) check(sha(`src/data/macro/${name}`) === expected, `provenance mismatch: ${name}`);
const capability = read("src/data/macro/var_capability_status.json");
check(capability.current_production_diagnostic === "adjusted_portmanteau" && capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false, "production capability unchanged");
console.log(JSON.stringify({ status: "pass", checks, outcome: conclusion.outcome, production_change_authorized: false }, null, 2));
