// v2.0 research-program closure validator: every v1.85-v1.90 artifact is recorded and hash-identical.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/macro");
const sha = (name) => createHash("sha256").update(fs.readFileSync(path.join(dir, name))).digest("hex");
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const closure = JSON.parse(fs.readFileSync(path.join(dir, "var_diagnostic_research_program_closure.json"), "utf8"));
check(closure.schema_version === "var-diagnostic-research-program-closure-v2.0" && closure.program_state === "frozen", "closure state");
check(closure.chain.map((c) => c.release).join(",") === "v1.85,v1.851,v1.86,v1.87,v1.88,v1.89,v1.90", "complete release chain");
check(closure.production_changed === false && closure.production_change_authorized === false && closure.chain.every((c) => c.production_impact === "none"), "no production impact");
const recorded = new Map(closure.chain.flatMap((c) => Object.entries(c.artifacts)));
for (const [name, expected] of recorded) check(fs.existsSync(path.join(dir, name)) && sha(name) === expected, `historical artifact changed or missing: ${name}`);
const prefixes = [/^var_residual_diagnostic_/, /^var_selection_bootstrap_/, /^var_lag_characterization_/, /^var_country_lag_identifiability_/, /^var_phase_b_/, /^var_country_matched_bootstrap_/, /^var_residual_attribution_/, /^var_residual_(acf|cross_lag|seasonal|variance_stability|period_concentration|specification_probe)_/, /^var_portmanteau_attribution/];
const onDisk = fs.readdirSync(dir).filter((n) => prefixes.some((p) => p.test(n)));
for (const name of onDisk) check(recorded.has(name), `unrecorded research artifact: ${name}`);
check(recorded.size === closure.artifact_count, "artifact count");
console.log(JSON.stringify({ status: "pass", checks, artifacts: recorded.size, program_state: closure.program_state }, null, 2));
