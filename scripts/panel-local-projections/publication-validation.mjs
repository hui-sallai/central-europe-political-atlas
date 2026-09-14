import fs from "node:fs";
import path from "node:path";

// Shared by release QA and negative provenance tests; never trusts a CI label
// without its actual SHA and run identifier.
export function validatePanelPublication(manifest, index, directory, environment = process.env) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const load = name => JSON.parse(fs.readFileSync(path.join(directory, "panel-local-projections", `${name}.json`), "utf8"));
  check(/^v1\.81(?:\s|$)/.test(manifest.platform_version), "v1.81 platform version");
  for (const [key, file] of Object.entries({panel_lp_method:"panel_lp_method_registry",panel_lp_results:"panel_lp_results",panel_lp_readiness:"panel_lp_readiness_registry",panel_lp_validation:"panel_lp_validation_summary",panel_lp_reference:"panel_lp_reference_manifest",panel_lp_small_sample:"panel_lp_small_sample_method_registry",panel_lp_parameterization:"panel_lp_parameterization_validation",panel_lp_ui_validation:"panel_lp_ui_validation"})) {
    check(manifest.advanced_analysis_versions?.[key] === load(file).schema_version, `panel version linkage: ${key}`);
  }
  check(manifest.advanced_analysis_validation?.stage === "v1.81 advanced analysis validation", "current advanced validation stage");
  check(manifest.release_validation?.stage === "v1.81 release validation", "current release validation stage");
  const section = manifest.panel_local_projections_validation;
  const validation = load("panel_lp_validation_summary");
  check(section?.status === "pass" && section?.status === validation.status, "panel validation pass linkage");
  check(section?.checks === validation.checks && section?.reference_cases === validation.reference_cases, "panel validation count linkage");
  check(section?.reference_commit === load("panel_lp_reference_manifest").commit && section?.reference_status === "pass", "panel reference linkage");
  check(section?.production_status === "pass" && section?.ui_status === "pass" && section?.publication_state === "active", "panel production and UI gates");
  check(JSON.stringify(section?.active_outcomes) === JSON.stringify(load("panel_lp_readiness_registry").records.filter(r => r.publication_ready).map(r => r.outcome_id)), "panel active outcomes linkage");
  for (const gate of ["panel-lp:reference","panel-lp:validate","panel-lp:ui-validate","panel-lp:robustness-validate"]) check(manifest.release_validation?.gates?.includes(gate), `panel release gate: ${gate}`);
  check(index?.schema_version === "analysis-validation-index-v1.81", "validation index schema");
  for (const id of ["legacy_advanced","single_country_lp","panel_lp","analysis_registry","news","identified_shocks","ui"]) check(index?.records?.some(r => r.id === id), `validation index entry: ${id}`);
  for (const record of index?.records ?? []) check(fs.existsSync(path.join(directory,record.artifact)), `validation index artifact: ${record.id}`);
  if (manifest.build_context === "github-actions" || environment.GITHUB_ACTIONS === "true" || environment.GITHUB_SHA) {
    check(manifest.build_context === "github-actions", "CI build context");
    check(/^[a-f0-9]{40}$/.test(manifest.source_commit ?? ""), "CI actual commit required");
    check(/^\d+$/.test(String(manifest.workflow_run_id ?? "")), "CI run ID required");
    if (environment.GITHUB_SHA) check(manifest.source_commit === environment.GITHUB_SHA, "CI SHA matches environment");
    if (environment.GITHUB_RUN_ID) check(String(manifest.workflow_run_id) === environment.GITHUB_RUN_ID, "CI run matches environment");
  } else {
    check(manifest.build_context === "local" && manifest.source_commit === "local-working-tree" && manifest.workflow_run_id === null, "local provenance");
  }
  return failures;
}
