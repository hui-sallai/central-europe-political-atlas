// v1.90 residual attribution boundary validator. Reads committed artifacts only.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { frozenInputSha } from "../lib/frozen-inputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
check(sha("src/data/macro/var_residual_attribution_preregistration.json") === "865a568f8e517b619eeee978f31edc6c0a637d493a169facc3b357714d25725f", "v1.90 preregistration changed");
const prereg = read("src/data/macro/var_residual_attribution_preregistration.json");
for (const [file, expected] of Object.entries(prereg.frozen_input_sha256)) check(frozenInputSha(root, file, expected) === expected, `frozen input changed: ${file}`);
const conclusion = read("src/data/macro/var_residual_attribution_research_conclusion.json");
check(conclusion.production_change_authorized === false && conclusion.readiness_changed === false && conclusion.formal_irf_publication_available === false, "production boundary");
check(conclusion.platform_questions.Q3_justified_future_extension.authorized_in_v1_90 === false, "no extension authorized");
const probes = read("src/data/macro/var_residual_specification_probe_results.json");
check(probes.units.every((u) => /diagnostic-only/.test(u.label)), "probes are diagnostic-only");
const capability = read("src/data/macro/var_capability_status.json");
check(capability.current_production_diagnostic === "adjusted_portmanteau" && capability.formal_dynamic_response_ready_country_count === 0 && capability.formal_irf_publication_available === false, "production capability unchanged");
console.log(JSON.stringify({ status: "pass", checks, production_change_authorized: false }, null, 2));
