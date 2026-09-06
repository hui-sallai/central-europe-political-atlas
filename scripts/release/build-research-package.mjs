import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { researchPackageFilename, researchPackageLabel } from "./research-package-name.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceDir = path.join(root, "public", "research-data");
const outputFile = path.join(sourceDir, researchPackageFilename());

const groups = {
  data: ["observations.json", "observations.csv", "comparison_eligibility.json", "transmission_channels.json"],
  countries: ["countries.json", "countries.csv"],
  regions: ["regions.json", "regional_observations.json", "regional_comparison_eligibility.json", "regional_geometry_qa.json"],
  events: ["events.json", "events.csv", "news_update_2026-09-05_audit.json", "news_source_verification_2026-09-05.json", "news_source_date_pattern_registry.json", "news_candidate_screening_2026-09-05.json"],
  projects: ["china_projects.json", "china_projects.csv", "china_exposure_candidates.json", "project_locations.json", "china_evidence_coverage_matrix.json"],
  models: ["model_cards.json", "model_outputs.json"],
  scenarios: ["scenario_definitions.json", "scenario_results.json", "scenario_sensitivity.json", "scenario_evidence_links.json"],
  dictionaries: ["indicators.json", "indicators.csv", "sources.json", "sources.csv", "region_indicator_dictionary.json", "region_sources.json"],
  qa: ["validation_registry.json", "golden_test_cases.json", "data_quality_checks.json", "regional_geometry_qa.json", "comparison_eligibility.json"],
  methodology: ["methodology_rules.json"],
  release: ["platform_metadata.json", "release_manifest.json"],
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"));
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

const entries = [];
for (const [directory, files] of Object.entries(groups)) {
  for (const fileName of files) {
    const file = path.join(sourceDir, fileName);
    if (fs.existsSync(file)) entries.push({ name: `${directory}/${fileName}`, data: fs.readFileSync(file) });
  }
}

const sourceEntries = [
  ["panel/panel_observations.json", "src/data/panel/panel_observations.json"],
  ["panel/panel_coverage.json", "src/data/panel/panel_coverage.json"],
  ["network/trade_edges.json", "src/data/network/trade_edges.json"],
  ["network/network_nodes.json", "src/data/network/network_nodes.json"],
  ["network/network_metrics.json", "src/data/network/network_metrics.json"],
  ["network/network_coverage.json", "src/data/network/network_coverage.json"],
  ["network/network_ui_pack.json", "src/data/network/network_ui_pack.json"],
  ["analysis/panel_reference_cases.json", "src/data/analysis/panel_reference_cases.json"],
  ["analysis/panel_specifications.json", "src/data/analysis/panel_specifications.json"],
  ["high-frequency/high_frequency_observations.json", "src/data/high-frequency/high_frequency_observations.json"],
  ["high-frequency/high_frequency_coverage.json", "src/data/high-frequency/high_frequency_coverage.json"],
  ["high-frequency/series_dictionary.json", "src/data/high-frequency/series_dictionary.json"],
  ["high-frequency/hicp_migration_manifest.json", "src/data/high-frequency/hicp_migration_manifest.json"],
  ["events/event_analysis_eligibility.json", "src/data/events/event_analysis_eligibility.json"],
  ["events/event_window_registry.json", "src/data/events/event_window_registry.json"],
  ["events/event_overlap_registry.json", "src/data/events/event_overlap_registry.json"],
  ["macro-drivers/macro_driver_observations.json", "src/data/macro-drivers/macro_driver_observations.json"],
  ["macro-drivers/macro_driver_dictionary.json", "src/data/macro-drivers/macro_driver_dictionary.json"],
  ["macro-drivers/macro_driver_coverage.json", "src/data/macro-drivers/macro_driver_coverage.json"],
  ["macro-drivers/policy_rate_acquisition_manifest.json", "src/data/macro-drivers/policy_rate_acquisition_manifest.json"],
  ["macro-drivers/interest_rate_acquisition_manifest.json", "src/data/macro-drivers/interest_rate_acquisition_manifest.json"],
  ["macro-drivers/exchange_rate_acquisition_manifest.json", "src/data/macro-drivers/exchange_rate_acquisition_manifest.json"],
  ["macro-drivers/energy_driver_acquisition_manifest.json", "src/data/macro-drivers/energy_driver_acquisition_manifest.json"],
  ["macro-drivers/shock_identification_registry.json", "src/data/macro-drivers/shock_identification_registry.json"],
  ["macro-drivers/lp_readiness_registry.json", "src/data/macro-drivers/lp_readiness_registry.json"],
  ["macro-drivers/driver_applicability_registry.json", "src/data/macro-drivers/driver_applicability_registry.json"],
  ["macro-drivers/identified_shock_source_candidates.json", "src/data/macro-drivers/identified_shock_source_candidates.json"],
  ["macro-drivers/v16_identification_readiness.json", "src/data/macro-drivers/v16_identification_readiness.json"],
  ["macro-drivers/acquire-macro-drivers.py", "scripts/acquisition/acquire-macro-drivers.py"],
  ["macro-drivers/requirements-macro-drivers.txt", "scripts/acquisition/requirements-macro-drivers.txt"],
  ["local-projections/lp_reference_manifest.json", "src/data/local-projections/lp_reference_manifest.json"],
  ["local-projections/lp_specification_registry.json", "src/data/local-projections/lp_specification_registry.json"],
  ["local-projections/lp_outcome_specification_registry.json", "src/data/local-projections/lp_outcome_specification_registry.json"],
  ["local-projections/lp_sample_policy_registry.json", "src/data/local-projections/lp_sample_policy_registry.json"],
  ["local-projections/lp_lag_policy_registry.json", "src/data/local-projections/lp_lag_policy_registry.json"],
  ["local-projections/lp_control_profile_registry.json", "src/data/local-projections/lp_control_profile_registry.json"],
  ["local-projections/lp_readiness_registry.json", "src/data/local-projections/lp_readiness_registry.json"],
  ["local-projections/lp_model_registry.json", "src/data/local-projections/lp_model_registry.json"],
  ["local-projections/lp_results.json", "src/data/local-projections/lp_results.json"],
  ["local-projections/lp_reference_cases.json", "src/data/local-projections/lp_reference_cases.json"],
  ["local-projections/lp_validation_summary.json", "src/data/local-projections/lp_validation_summary.json"],
  ["local-projections/lp_inference_registry.json", "src/data/local-projections/lp_inference_registry.json"],
  ["local-projections/lp_simultaneous_inference_reference_manifest.json", "src/data/local-projections/lp_simultaneous_inference_reference_manifest.json"],
  ["local-projections/lp_path_inference_validation.json", "src/data/local-projections/lp_path_inference_validation.json"],
  ["local-projections/lp_coefficient_invariance_manifest.json", "src/data/local-projections/lp_coefficient_invariance_manifest.json"],
  ["local-projections/lp_lag_sensitivity_results.json", "src/data/local-projections/lp_lag_sensitivity_results.json"],
  ["local-projections/lp_control_sensitivity_results.json", "src/data/local-projections/lp_control_sensitivity_results.json"],
  ["local-projections/lp_shock_support_diagnostics.json", "src/data/local-projections/lp_shock_support_diagnostics.json"],
  ["local-projections/lp_influence_diagnostics.json", "src/data/local-projections/lp_influence_diagnostics.json"],
  ["local-projections/lp_cross_country_comparability.json", "src/data/local-projections/lp_cross_country_comparability.json"],
  ["local-projections/lp_model_diagnostic_summary.json", "src/data/local-projections/lp_model_diagnostic_summary.json"],
  ["local-projections/build-lp-robustness.mjs", "scripts/local-projections/build-lp-robustness.mjs"],
  ...["lp_finite_sample_bias_reference_manifest.json", "lp_bias_correction_applicability_registry.json", "lp_finite_sample_simulation_registry.json", "lp_finite_sample_simulation_results.json", "lp_shock_support_status.json", "lp_influence_threshold_registry.json", "lp_leave_one_shock_month_results.json", "lp_leave_one_event_results.json", "lp_finite_sample_robustness_summary.json", "lp_full_path_covariance_audit.json", "lp_full_path_covariance_validation.json", "lp_finite_sample_validation.json"].map(name => [`local-projections/${name}`, `src/data/local-projections/${name}`]),
  ...["audit-bias-reference.py", "finite_sample_common.py", "build-finite-sample.py", "build-shock-support.py", "run-python-diagnostic.mjs", "finalize-finite-sample.mjs"].map(name => [`local-projections/${name}`, `scripts/local-projections/${name}`]),
  ["local-projections/validate-lp-finite-sample.mjs", "scripts/validation/validate-lp-finite-sample.mjs"],
  ["local-projections/localProjectionEngine.mjs", "src/lib/localProjectionEngine.mjs"],
  ["local-projections/build-local-projections.mjs", "scripts/local-projections/build-local-projections.mjs"],
  ["local-projections/generate-lp-reference.py", "scripts/validation/generate-lp-reference.py"],
  ["local-projections/run-lp-reference.mjs", "scripts/validation/run-lp-reference.mjs"],
  ["local-projections/requirements-lp-reference.txt", "scripts/validation/requirements-lp-reference.txt"],
  ["local-projections/validate-local-projections.mjs", "scripts/validation/validate-local-projections.mjs"],
  ["identified-shocks/ecb_monetary_event_data_acquisition_manifest.json", "src/data/identified-shocks/ecb_monetary_event_data_acquisition_manifest.json"],
  ["identified-shocks/ea_mpd_acquisition_manifest.json", "src/data/identified-shocks/ea_mpd_acquisition_manifest.json"],
  ["identified-shocks/ea_empd_acquisition_manifest.json", "src/data/identified-shocks/ea_empd_acquisition_manifest.json"],
  ["identified-shocks/ea_mpd_workbook_schema.json", "src/data/identified-shocks/ea_mpd_workbook_schema.json"],
  ["identified-shocks/ea_empd_workbook_schema.json", "src/data/identified-shocks/ea_empd_workbook_schema.json"],
  ["identified-shocks/monetary_policy_event_observations.json", "src/data/identified-shocks/monetary_policy_event_observations.json"],
  ["identified-shocks/ecb_policy_factor_registry.json", "src/data/identified-shocks/ecb_policy_factor_registry.json"],
  ["identified-shocks/monetary_policy_information_effect_registry.json", "src/data/identified-shocks/monetary_policy_information_effect_registry.json"],
  ["identified-shocks/ecb_event_dataset_overlap_registry.json", "src/data/identified-shocks/ecb_event_dataset_overlap_registry.json"],
  ["identified-shocks/ecb_monetary_policy_monthly_series.json", "src/data/identified-shocks/ecb_monetary_policy_monthly_series.json"],
  ["identified-shocks/shock_applicability_registry.json", "src/data/identified-shocks/shock_applicability_registry.json"],
  ["identified-shocks/ecb_shock_validation_summary.json", "src/data/identified-shocks/ecb_shock_validation_summary.json"],
  ["identified-shocks/monetary_policy_identification_method_registry.json", "src/data/identified-shocks/monetary_policy_identification_method_registry.json"],
  ["identified-shocks/jk_replication_acquisition_manifest.json", "src/data/identified-shocks/jk_replication_acquisition_manifest.json"],
  ["identified-shocks/jk_author_reference_manifest.json", "src/data/identified-shocks/jk_author_reference_manifest.json"],
  ["identified-shocks/jk_author_event_exclusion_registry.json", "src/data/identified-shocks/jk_author_event_exclusion_registry.json"],
  ["identified-shocks/jk_pc1_replication_validation.json", "src/data/identified-shocks/jk_pc1_replication_validation.json"],
  ["identified-shocks/jk_poor_man_replication_validation.json", "src/data/identified-shocks/jk_poor_man_replication_validation.json"],
  ["identified-shocks/jk_median_rotation_replication_validation.json", "src/data/identified-shocks/jk_median_rotation_replication_validation.json"],
  ["identified-shocks/jk_monthly_replication_validation.json", "src/data/identified-shocks/jk_monthly_replication_validation.json"],
  ["identified-shocks/jk_author_reference_comparison.json", "src/data/identified-shocks/jk_author_reference_comparison.json"],
  ["identified-shocks/jk_cross_language_validation.json", "src/data/identified-shocks/jk_cross_language_validation.json"],
  ["identified-shocks/information_effect_input_registry.json", "src/data/identified-shocks/information_effect_input_registry.json"],
  ["identified-shocks/information_effect_window_registry.json", "src/data/identified-shocks/information_effect_window_registry.json"],
  ["identified-shocks/jk_event_sample_registry.json", "src/data/identified-shocks/jk_event_sample_registry.json"],
  ["identified-shocks/identification_specification_registry.json", "src/data/identified-shocks/identification_specification_registry.json"],
  ["identified-shocks/jk_event_level_shocks.json", "src/data/identified-shocks/jk_event_level_shocks.json"],
  ["identified-shocks/ecb_pure_monetary_policy_shock_monthly.json", "src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json"],
  ["identified-shocks/ecb_central_bank_information_shock_monthly.json", "src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json"],
  ["identified-shocks/information_effect_separation_validation.json", "src/data/identified-shocks/information_effect_separation_validation.json"],
  ["identified-shocks/identification_regime_diagnostics.json", "src/data/identified-shocks/identification_regime_diagnostics.json"],
  ["identified-shocks/build-information-effect-separation.mjs", "scripts/identified-shocks/build-information-effect-separation.mjs"],
  ["identified-shocks/jk-author-reference.mjs", "scripts/identified-shocks/jk-author-reference.mjs"],
  ["identified-shocks/validate-jk-author-reference.py", "scripts/validation/validate-jk-author-reference.py"],
  ["identified-shocks/validate-information-effect-separation.mjs", "scripts/validation/validate-information-effect-separation.mjs"],
  ["identified-shocks/acquire-ecb-monetary-events.py", "scripts/acquisition/acquire-ecb-monetary-events.py"],
  ["identified-shocks/requirements-ecb-events.txt", "scripts/acquisition/requirements-ecb-events.txt"],
  ["identified-shocks/validate-ecb-shocks.mjs", "scripts/validation/validate-ecb-shocks.mjs"],
  ["network/network_acquisition_manifest.json", "src/data/network/network_acquisition_manifest.json"],
  ["analysis/analysis_skill_registry.json", "src/data/analysis/analysis_skill_registry.json"],
  ["analysis/v173_frozen_output_hashes.json", "src/data/analysis/v173_frozen_output_hashes.json"],
  ["analysis/advanced_analysis_validation_summary.json", "src/data/analysis/advanced_analysis_validation_summary.json"],
  ["analysis/var_readiness.json", "src/data/analysis/var_readiness.json"],
  ["analysis/var_reference_cases.json", "src/data/analysis/var_reference_cases.json"],
  ["analysis/requirements-var-reference.txt", "scripts/validation/requirements-var-reference.txt"],
  ["analysis/README-var-reference.md", "scripts/validation/README-var-reference.md"],
  ["analysis/generate-var-reference.py", "scripts/validation/generate-var-reference.py"],
  ["macro-dynamics/var_country_readiness.json", "src/data/macro/var_country_readiness.json"],
  ["macro-dynamics/var_specification_profiles.json", "src/data/macro/var_specification_profiles.json"],
  ["macro-dynamics/var_baseline_readiness.json", "src/data/macro/var_baseline_readiness.json"],
  ["macro-dynamics/var_baseline_v1_readiness.json", "src/data/macro/var_baseline_v1_readiness.json"],
  ["macro-dynamics/var_baseline_v2_readiness.json", "src/data/macro/var_baseline_v2_readiness.json"],
  ["macro-dynamics/var_baseline_profile_comparison.json", "src/data/macro/var_baseline_profile_comparison.json"],
  ["macro-dynamics/var_seasonality_audit.json", "src/data/macro/var_seasonality_audit.json"],
  ["macro-dynamics/stationarity_specification_registry.json", "src/data/macro/stationarity_specification_registry.json"],
  ["macro-dynamics/seasonal_stationarity_results.json", "src/data/macro/seasonal_stationarity_results.json"],
  ["macro-dynamics/seasonal_adf_critical_values.json", "src/data/macro/seasonal_adf_critical_values.json"],
  ["macro-dynamics/seasonal_adf_decision_comparison.json", "src/data/macro/seasonal_adf_decision_comparison.json"],
  ["macro-dynamics/hegy_readiness_registry.json", "src/data/macro/hegy_readiness_registry.json"],
  ["analysis/generate-seasonal-adf-calibration.py", "scripts/validation/generate-seasonal-adf-calibration.py"],
  ["macro-dynamics/structural_break_registry.json", "src/data/macro/structural_break_registry.json"],
  ["macro-dynamics/persistence_diagnostics.json", "src/data/macro/persistence_diagnostics.json"],
  ["macro-dynamics/var_lag_diagnostic_grid.json", "src/data/macro/var_lag_diagnostic_grid.json"],
  ["macro-dynamics/var_exploratory_readiness.json", "src/data/macro/var_exploratory_readiness.json"],
  ["macro-dynamics/transformation_registry.json", "src/data/macro/transformation_registry.json"],
  ["macro-dynamics/stationarity_results.json", "src/data/macro/stationarity_results.json"],
  ["macro-dynamics/lag_selection_registry.json", "src/data/macro/lag_selection_registry.json"],
  ["macro-dynamics/var_model_registry.json", "src/data/macro/var_model_registry.json"],
];
for (const [archivePath, sourcePath] of sourceEntries) {
  const file = path.join(root, sourcePath);
  if (fs.existsSync(file)) entries.push({ name: archivePath, data: fs.readFileSync(file) });
}

const modelCardsFile = path.join(sourceDir, "model_cards.json");
if (fs.existsSync(modelCardsFile)) {
  const parsed = JSON.parse(fs.readFileSync(modelCardsFile, "utf8"));
  const records = parsed.records ?? parsed;
  entries.push({ name: "models/weights.json", data: JSON.stringify(records.map((item) => ({ model_id: item.model_id, weight_version: item.weight_version, inputs: item.inputs?.map((input) => ({ indicator_id: input.indicator_id, weight: input.weight })) ?? [] })), null, 2) });
  entries.push({ name: "models/formula_versions.json", data: JSON.stringify(records.map((item) => ({ model_id: item.model_id, model_version: item.model_version, formula_version: item.formula_version, calculation_logic: item.calculation_logic })), null, 2) });
}

entries.push({ name: "README.md", data: `# Central Europe Political Atlas ${researchPackageLabel()}\n\nThis package preserves public research data, dictionaries, QA records, model and scenario metadata, methodology and release provenance.\n\n- Missing and pending values are not zero.\n- Model outputs are comparative research tools, not forecasts or objective risk truths.\n- Official EA-MPD / EA-EMPD assets are schema-audited and deduplicated.\n- v1.62 shock construction remains frozen and author-reference validated.\n- v1.71 preserves the single-country joint MP/CBI baselines, corrects lag metadata, and adds pointwise HC1 plus validated 95% plug-in sup-t path uncertainty.\n- Fixed-lag, predetermined-control, shock-support, influence, conditioning and cross-country comparability outputs are diagnostics, not replacement baselines.\n- CBI is normalized by 0.25 for display; it is not described as a 25bp tightening.\n- Panel LP, state dependence, SVAR and Bayesian VAR remain unavailable.\n\nCanonical site: https://hy-central-europe-analysis.org/\n` });
entries.push({ name: "methodology/README.md", data: "Public methodology is available at /methodology/. Technical dictionaries and validation records in this archive are the authoritative downloadable companion to the interface.\n" });

fs.mkdirSync(sourceDir, { recursive: true });
fs.writeFileSync(outputFile, zipStore(entries));
const packageBuffer = fs.readFileSync(outputFile);
const packageSha256 = crypto.createHash("sha256").update(packageBuffer).digest("hex");
const manifestFile = path.join(sourceDir, "release_manifest.json");
if (fs.existsSync(manifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.research_package = {
    filename: path.basename(outputFile),
    sha256: packageSha256,
    generated_at: new Date().toISOString(),
    status: "built",
  };
  if (manifest.release_validation) {
    manifest.release_validation.package_checksum = packageSha256;
    manifest.release_validation.package_filename = path.basename(outputFile);
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}
console.log(`Research package created: ${path.relative(root, outputFile)} (${entries.length} entries)`);
