import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, Module } from "node:module";
import ts from "typescript";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { canonicalAnalysisRegistry: registry, runtimeAnalysisSkills: skills, resolveAnalysisRoute, analysisSkills } = require("../../src/lib/analysisSkills.ts");
const { runAnalysisSkill } = require("../../src/lib/analysisRunner.ts");
let checks = 0;
function check(value, message) { checks++; assert.ok(value, message); }
check(new Set(registry.records.map(r => r.skill_id)).size === registry.records.length, "unique canonical IDs");
for (const row of registry.records) {
  const ui = skills.find(s => s.skill_id === row.skill_id);
  if (row.state === "deprecated_alias") {
    check(Boolean(row.hidden_reason), "alias hidden reason");
    check(!ui, "alias has no standalone card");
    check(registry.records.some(r => r.skill_id === row.alias_of && ["active", "registry_only"].includes(r.state)), "alias target");
  } else {
    check(Boolean(ui || row.hidden_reason), "all canonical records represented");
    check(ui?.state === row.state && ui?.calculation_mode === row.state, "state derived from canonical");
    check(Boolean(registry.categories[ui.category]), "registered category");
    check(Boolean(ui.description && ui.limitations.length), "method interpretation");
    if (row.state !== "active") check(runAnalysisSkill({ skillId: row.skill_id, dataset: {} }).status === row.state, "inactive runner cannot complete");
  }
}
for (const skill of analysisSkills.filter(s => !registry.records.some(r => r.skill_id === s.skill_id))) {
  check(skill.calculation_mode === registry.records.find(r => r.skill_id === "composite_indicators").state, "composite child state");
}
const lp = skills.find(s => s.skill_id === "local_projections");
for (const output of ["horizon_responses", "pointwise_confidence_intervals", "simultaneous_confidence_bands", "finite_sample_diagnostics", "shock_support_diagnostics", "influence_diagnostics", "data_trace", "limitations"]) check(lp.output_schema.includes(output), output);
for (const diagnostic of ["shock_validity", "common_horizon_coverage", "lag_selection_once", "cross_language_reference", "path_covariance_validation", "sup_t_validation", "finite_sample_simulation", "shock_support_concentration", "leave_one_out_influence"]) check(lp.diagnostics.includes(diagnostic), diagnostic);
check(lp.limitations.some(x => x.includes("sup-t")), "sup-t explanation");
check(!lp.limitations.some(x => /only pointwise|区间是逐 horizon 点态区间/.test(x)), "no stale pointwise-only limitation");
check(lp.limitations.some(x => x.includes("registry_only")), "bias correction boundary");
const expected = { panel_econometrics: "panel_econometrics", event_window_analysis: "event_analysis", network_dependency: "network_analysis", reduced_form_var: "macro_time_series", local_projections: "macro_time_series", macro_driver_explorer: "macro_time_series", monetary_policy_identification: "macro_time_series", svar: "future_methods", event_study: "future_methods", bayesian_var: "future_methods", causal_policy_analysis: "future_methods" };
for (const [id, category] of Object.entries(expected)) {
  const route = resolveAnalysisRoute(id, null, ["poland", "hungary"]);
  check(route.skill.skill_id === id && route.category === category, `deep link ${id}`);
}
check(resolveAnalysisRoute("var_svar", null, []).skill.skill_id === "reduced_form_var", "legacy alias");
check(resolveAnalysisRoute("unknown", null, []).notices.length > 0, "unknown notice");
check(runAnalysisSkill({ skillId: "unknown", dataset: {} }).status === "unavailable", "unknown runner");
check(resolveAnalysisRoute("local_projections", "hungary", ["poland", "hungary"]).countrySlug === "hungary", "country retained");
check(resolveAnalysisRoute("local_projections", "unknown", ["poland"]).notices.length > 0, "invalid country explained");
check(resolveAnalysisRoute("monetary_policy_identification", "hungary", ["hungary"]).countrySlug === undefined, "identification ignores country");
const source = fs.readFileSync(path.join(root, "src/components/AnalysisWorkbench.tsx"), "utf8");
check(!source.includes("skillToCategory"), "no duplicate routing dictionary");
check(source.includes('selectedSkill.state !== "active"'), "inactive UI cannot mount runnable workbench");
const publicFile = path.join(root, "public/research-data/analysis_skill_registry.json");
const frozen = JSON.parse(fs.readFileSync(path.join(root, "src/data/analysis/v173_frozen_output_hashes.json"), "utf8"));
for (const record of frozen.records) check(createHash("sha256").update(fs.readFileSync(path.join(root, record.path))).digest("hex") === record.sha256, `frozen output ${record.path}`);
if (process.argv.includes("--export")) check(fs.readFileSync(publicFile, "utf8") === fs.readFileSync(path.join(root, "src/data/analysis/analysis_skill_registry.json"), "utf8"), "canonical public equality");
console.log(`Analysis registry and deep-link validation passed: ${checks} checks; ${registry.records.length} canonical records.`);
