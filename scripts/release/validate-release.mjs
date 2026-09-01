import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { researchPackageFilename } from "./research-package-name.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "out");
const researchOut = path.join(out, "research-data");
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const releaseConfig = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "release.json"), "utf8"));
const requiredRoutes = ["", "map", "countries", "data", "news", "models", "scenarios", "methodology", "legal", "privacy", ...["poland", "hungary", "czechia", "slovakia", "germany", "austria", "romania", "slovenia", "croatia", "serbia"].map((country) => `countries/${country}`)];
const requiredExports = ["platform_metadata.json", "release_manifest.json", "validation_registry.json", "golden_test_cases.json", "observations.json", "sources.json", "indicators.json", "var_country_readiness.json", "stationarity_specification_registry.json", "seasonal_stationarity_results.json", "seasonal_adf_critical_values.json", "seasonal_adf_decision_comparison.json", "hegy_readiness_registry.json", "structural_break_registry.json", "persistence_diagnostics.json", "macro_driver_observations.json", "macro_driver_dictionary.json", "macro_driver_coverage.json", "shock_identification_registry.json", "lp_readiness_registry.json", "driver_applicability_registry.json", "identified_shock_source_candidates.json", "v16_identification_readiness.json", "macro_driver_runtime.json", "ecb_monetary_event_data_acquisition_manifest.json", "ea_mpd_workbook_schema.json", "ea_empd_workbook_schema.json", "monetary_policy_event_observations.json", "ecb_policy_factor_registry.json", "monetary_policy_information_effect_registry.json", "ecb_event_dataset_overlap_registry.json", "ecb_monetary_policy_monthly_series.json", "shock_applicability_registry.json", "ecb_shock_validation_summary.json", "monetary_policy_identification_method_registry.json", "jk_replication_acquisition_manifest.json", "jk_author_reference_manifest.json", "jk_author_event_exclusion_registry.json", "jk_pc1_replication_validation.json", "jk_poor_man_replication_validation.json", "jk_median_rotation_replication_validation.json", "jk_monthly_replication_validation.json", "jk_author_reference_comparison.json", "jk_cross_language_validation.json", "information_effect_input_registry.json", "information_effect_window_registry.json", "jk_event_sample_registry.json", "identification_specification_registry.json", "jk_event_level_shocks.json", "ecb_pure_monetary_policy_shock_monthly.json", "ecb_central_bank_information_shock_monthly.json", "information_effect_separation_validation.json", "identification_regime_diagnostics.json", "advanced_analysis_validation_summary.json", researchPackageFilename()];
requiredExports.push("lp_reference_manifest.json", "lp_specification_registry.json", "lp_outcome_specification_registry.json", "lp_sample_policy_registry.json", "lp_lag_policy_registry.json", "lp_control_profile_registry.json", "lp_model_registry.json", "lp_results.json", "lp_reference_cases.json", "lp_validation_summary.json");
const methodologySections = ["data", "models", "events", "spatial", "validation", "citation"];
const stableResearchUrls = ["/map?country=hungary&layer=regional_boundary", "/models?model=fiscal_pressure&country=hungary", "/models?skill=var_svar&country=poland", "/scenarios?scenario=inflation_resurgence&country=poland&shock=2", "/countries/poland/", "/news?country=hungary&type=China"];
const failures = [];
let internalLinksChecked = 0;

const cnameFile = path.join(out, "CNAME");
if (!fs.existsSync(cnameFile) || fs.readFileSync(cnameFile, "utf8").trim() !== "hy-central-europe-analysis.org") {
  failures.push("custom-domain CNAME is missing or does not match the canonical host");
}

function readJson(fileName) {
  const file = path.join(researchOut, fileName);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

for (const route of requiredRoutes) {
  const file = path.join(out, route, "index.html");
  if (!fs.existsSync(file)) failures.push(`missing route: /${route}`);
}

for (const fileName of requiredExports) {
  const file = path.join(researchOut, fileName);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) failures.push(`missing export: ${fileName}`);
}

const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "_next") walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(fullPath);
  }
}
walk(out);

const internalTargets = new Set(requiredRoutes.map((route) => `/${route}${route ? "/" : ""}`));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`missing title: ${path.relative(out, file)}`);
  if (!/<html[^>]+lang="zh-CN"/.test(html)) failures.push(`missing language metadata: ${path.relative(out, file)}`);
  for (const match of html.matchAll(/href="([^"#?]+)[^"]*"/g)) {
    const href = match[1];
    if (!href.startsWith("/") || href.startsWith("/_next/") || href.startsWith("/research-data/")) continue;
    const withoutBasePath = configuredBasePath && href.startsWith(configuredBasePath) ? href.slice(configuredBasePath.length) || "/" : href;
    if (withoutBasePath.startsWith("/_next/") || withoutBasePath.startsWith("/research-data/")) continue;
    internalLinksChecked += 1;
    const normalized = withoutBasePath.endsWith("/") ? withoutBasePath : `${withoutBasePath}/`;
    if (!internalTargets.has(normalized)) failures.push(`broken internal link ${href} in ${path.relative(out, file)}`);
  }
}

const metadata = readJson("platform_metadata.json");
const manifest = readJson("release_manifest.json");
const validationExport = readJson("validation_registry.json");
const goldenExport = readJson("golden_test_cases.json");
const varReadiness = readJson("var_country_readiness.json");
const seasonalCalibration = readJson("seasonal_adf_critical_values.json");
const seasonalDecisionComparison = readJson("seasonal_adf_decision_comparison.json");
const hegyReadiness = readJson("hegy_readiness_registry.json");
const structuralBreaks = readJson("structural_break_registry.json");
const shockIdentification = readJson("shock_identification_registry.json");
const lpReadiness = readJson("lp_readiness_registry.json");
const lpValidation = readJson("lp_validation_summary.json");
const lpResults = readJson("lp_results.json");
const ecbAcquisition = readJson("ecb_monetary_event_data_acquisition_manifest.json");
const ecbValidation = readJson("ecb_shock_validation_summary.json");
const informationEffect = readJson("monetary_policy_information_effect_registry.json");
const expectedVersion = releaseConfig.version;
const expectedCommit = process.env.GITHUB_SHA ?? process.env.RELEASE_COMMIT_SHA ?? null;

if (metadata) {
  if (metadata.version !== expectedVersion) failures.push(`platform metadata version mismatch: ${metadata.version}`);
  if (metadata.release_date !== releaseConfig.release_date) failures.push(`platform metadata date mismatch: ${metadata.release_date}`);
  if (metadata.stage !== releaseConfig.stage) failures.push(`platform metadata stage mismatch: ${metadata.stage}`);
  if (metadata.schema_version !== releaseConfig.schema_version) failures.push(`platform metadata schema mismatch: ${metadata.schema_version}`);
  if (metadata.canonical_url !== releaseConfig.canonical_url) failures.push(`canonical URL mismatch: ${metadata.canonical_url}`);
  try {
    const canonical = new URL(metadata.canonical_url);
    if (canonical.protocol !== "https:" || canonical.hostname !== "hy-central-europe-analysis.org" || canonical.pathname !== "/") failures.push(`invalid canonical URL: ${metadata.canonical_url}`);
  } catch {
    failures.push(`invalid canonical URL: ${metadata.canonical_url}`);
  }
  if (!metadata.citation?.includes(expectedVersion) || !metadata.citation?.includes(metadata.canonical_url)) failures.push("platform citation is missing version or canonical URL");
}

if (manifest) {
  if (manifest.platform_version !== expectedVersion) failures.push(`release manifest version mismatch: ${manifest.platform_version}`);
  if (manifest.release_date !== releaseConfig.release_date) failures.push(`release manifest date mismatch: ${manifest.release_date}`);
  if (manifest.schema_version !== releaseConfig.schema_version) failures.push(`release manifest schema mismatch: ${manifest.schema_version}`);
  if (!manifest.source_commit || manifest.source_commit === "working-tree") failures.push(`invalid source commit provenance: ${manifest.source_commit}`);
  if (expectedCommit && manifest.source_commit !== expectedCommit) failures.push(`deployment commit mismatch: manifest=${manifest.source_commit} ci=${expectedCommit}`);
  if (!Array.isArray(manifest.model_versions) || manifest.model_versions.some((item) => !item.model_version || !item.formula_version || !item.weight_version)) failures.push("model version provenance is incomplete");
  if (!Array.isArray(manifest.scenario_versions) || manifest.scenario_versions.some((item) => !item.formula_version || item.shock_min === undefined || item.shock_max === undefined || item.shock_step === undefined)) failures.push("scenario version provenance is incomplete");
  if (manifest.core_research_validation?.blocking_failures !== 0) failures.push(`blocking validation failures: ${manifest.core_research_validation?.blocking_failures}`);
  if (manifest.core_research_validation?.golden_failures !== 0) failures.push(`golden failures: ${manifest.core_research_validation?.golden_failures}`);
  if (manifest.validation_summary) failures.push("legacy validation_summary must be renamed to legacy_validation_summary_v091");
  const expectedAdvancedVersions = {
    panel_engine: "panel-engine-v1.25",
    trade_network: "trade-network-v1.25-active",
    event_window: "event-window-v1.31",
    high_frequency: "high-frequency-v1.31",
    analysis_skill_registry: "analysis-skill-registry-v1.7",
    transformation_registry: "transformation-registry-v1.41",
    stationarity_engine: "stationarity-engine-v1.44",
    seasonal_adf_calibration: "seasonal-adf-critical-values-v1.44",
    seasonal_adf_decision_comparison: "seasonal-adf-decision-comparison-v1.44",
    hegy_readiness: "hegy-readiness-registry-v1.44",
    structural_break_registry: "structural-break-registry-v1.44",
    var_engine: "var-engine-v1.44",
    var_specification_profiles: "var-specification-profiles-v1.44",
    var_country_readiness: "var-country-readiness-v1.44",
    macro_drivers: "macro-driver-observations-v1.51",
    shock_identification: "shock-identification-registry-v1.62",
    identified_shocks: "monetary-policy-event-observations-v1.6",
    ecb_shock_validation: "ecb-shock-validation-summary-v1.7",
    information_effect_separation: "information-effect-separation-validation-v1.62",
    lp_readiness: "lp-readiness-registry-v1.7",
    lp_engine: "lp-engine-v1.7",
    lp_results: "lp-results-v1.7",
    lp_validation: "lp-validation-summary-v1.7",
    driver_applicability: "driver-applicability-registry-v1.51",
  };
  for (const [key, expected] of Object.entries(expectedAdvancedVersions)) if (manifest.advanced_analysis_versions?.[key] !== expected) failures.push(`advanced analysis provenance mismatch: ${key}=${manifest.advanced_analysis_versions?.[key]} expected=${expected}`);
  if (expectedCommit && (manifest.build_context !== "github-actions" || !manifest.workflow_run_id)) failures.push("CI manifest is missing github-actions build context or workflow_run_id");
  if (!expectedCommit && manifest.build_context !== "local") failures.push(`local manifest build context mismatch: ${manifest.build_context}`);
  if (manifest.research_package?.status !== "built" || manifest.research_package?.filename !== researchPackageFilename() || !/^[a-f0-9]{64}$/.test(manifest.research_package?.sha256 ?? "") || !manifest.research_package?.generated_at) failures.push("research package filename/SHA256/generated_at provenance is incomplete");
  if (!manifest.core_research_validation || !manifest.advanced_analysis_validation || !manifest.release_validation) failures.push("split validation summaries are incomplete");
  if (manifest.advanced_analysis_validation?.status !== "passed" || !(manifest.advanced_analysis_validation?.total_tests > 0) || manifest.advanced_analysis_validation?.failure_count !== 0) failures.push("advanced analysis validation summary is not a recorded passing result");
  if (manifest.release_validation?.package_checksum !== manifest.research_package?.sha256) failures.push("release validation package checksum is missing or inconsistent");
}

if (!validationExport?.records?.length) failures.push("validation registry has no records");
if (!goldenExport?.records?.length) failures.push("golden cases have no records");
if (goldenExport?.records?.some((item) => item.status === "failed" || item.result_semantic === "failed")) failures.push("golden case failure found in export");
if (varReadiness?.schema_version !== "var-country-readiness-v1.44" || varReadiness?.records?.length !== 10) failures.push("v1.44 VAR country readiness export is incomplete");
if (varReadiness?.records?.some((item) => !item.country || !item.readiness_state || !Array.isArray(item.variables) || typeof item.estimable !== "boolean" || typeof item.dynamic_response_ready !== "boolean" || !item.dynamic_response_ready_horizons)) failures.push("v1.44 VAR country readiness records are malformed");
if (!varReadiness?.baseline_profile_readiness || !varReadiness?.baseline_v2_profile_readiness || !varReadiness?.exploratory_profile_readiness || varReadiness?.ready_countries || varReadiness?.irf_ready_countries) failures.push("v1.44 dual-baseline/exploratory readiness boundary is incomplete");
if (seasonalCalibration?.schema_version !== "seasonal-adf-critical-values-v1.44" || seasonalCalibration?.state !== "active_after_validation" || seasonalCalibration?.records?.length !== 9 || seasonalCalibration?.records?.some((item) => item.replications < 50_000)) failures.push("v1.44 seasonal ADF calibration fixture is incomplete or inactive");
if (!seasonalCalibration?.validation?.same_seed_reproducible || !seasonalCalibration?.validation?.different_seed_within_mc_tolerance || !seasonalCalibration?.validation?.null_size_test?.passed || !seasonalCalibration?.validation?.stationary_ar_power_sanity?.passed) failures.push("v1.44 seasonal ADF Monte Carlo validation evidence is incomplete");
if (seasonalDecisionComparison?.schema_version !== "seasonal-adf-decision-comparison-v1.44" || !seasonalDecisionComparison?.records?.length || seasonalDecisionComparison?.records?.some((item) => typeof item.decision_changed !== "boolean" || item.mc_5pct === null || item.mackinnon_5pct === null)) failures.push("v1.44 seasonal ADF decision comparison is incomplete");
if (hegyReadiness?.state !== "not_available" || !hegyReadiness?.remaining_blockers?.length) failures.push("HEGY readiness boundary is missing or overstated");
if (!Array.isArray(structuralBreaks?.historical_candidate_periods) || !Array.isArray(structuralBreaks?.statistically_estimated_breaks) || structuralBreaks?.statistically_estimated_breaks?.length !== 0 || structuralBreaks?.test_registry?.[0]?.state !== "registry_only") failures.push("historical candidate periods and statistically estimated breaks are not separated");
if (ecbAcquisition?.record_count !== 2 || ecbAcquisition?.raw_workbooks_publicly_redistributed !== false || ecbAcquisition?.records?.some((item) => !item.official_annex_asset?.startsWith("https://www.ecb.europa.eu/") || !/^[a-f0-9]{64}$/.test(item.sha256) || item.redistribution_status !== "raw_workbook_excluded_from_public_package")) failures.push("v1.6 ECB acquisition provenance or redistribution boundary is incomplete");
if (ecbValidation?.status !== "passed" || ecbValidation?.failure_count !== 0 || ecbValidation?.canonical_event_count !== 5871) failures.push("v1.6 ECB shock validation summary is incomplete or failing");
if (shockIdentification?.identified_shock_count !== 2 || shockIdentification?.external_innovation_proxy_count !== 3) failures.push("v1.62 identification-status counts are incorrect");
if (informationEffect?.records?.some((item) => item.information_effect_handling !== "separated_under_jk_framework" || item.identified_shock_allowed !== true)) failures.push("v1.62 information-effect separation is incomplete");
if (lpReadiness?.schema_version !== "lp-readiness-registry-v1.7" || lpReadiness?.method_state !== "active" || lpReadiness?.causal_lp_ready_count !== 44 || lpReadiness?.formal_record_count !== 54) failures.push("v1.7 causal LP readiness is incomplete");
if (lpReadiness?.records?.filter((item) => String(item.readiness_id).includes(":jk_joint:")).some((item) => item.identification_status !== "identified_shock" || (item.causal_lp_ready && item.effective_n < 96))) failures.push("v1.7 LP identification or sample gate was relaxed");
if (lpValidation?.schema_version !== "lp-validation-summary-v1.7" || lpValidation?.status !== "passed" || lpValidation?.failure_count !== 0 || !(lpValidation?.maximum_cross_language_difference <= 1e-8)) failures.push("v1.7 LP cross-language validation is incomplete or failing");
if (lpResults?.schema_version !== "lp-results-v1.7" || lpResults?.model_count !== 44 || lpResults?.horizon_record_count !== 1100) failures.push("v1.7 LP results export is incomplete");

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!readme.includes(`Current release: **${expectedVersion}**`)) failures.push("README current release does not match canonical metadata");
if (!readme.includes(`version ${expectedVersion}, accessed`)) failures.push("README citation does not match canonical metadata");
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const latestChangelogHeading = changelog.match(/^## (.+)$/m)?.[1] ?? "";
if (!latestChangelogHeading.startsWith(expectedVersion) || !latestChangelogHeading.includes(releaseConfig.release_date)) failures.push(`CHANGELOG latest release mismatch: ${latestChangelogHeading}`);
const skillRegistry = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "analysis", "analysis_skill_registry.json"), "utf8"));
if (skillRegistry.schema_version !== "analysis-skill-registry-v1.7") failures.push(`analysis skill registry schema mismatch: ${skillRegistry.schema_version}`);
if (skillRegistry.generated_at !== releaseConfig.release_date) failures.push(`analysis skill registry generated_at mismatch: ${skillRegistry.generated_at}`);
const releaseSource = fs.readFileSync(path.join(root, "src", "lib", "releaseMetadata.ts"), "utf8");
if (!releaseSource.includes('import releaseConfig from "../data/release.json"')) failures.push("release metadata is not reading the canonical JSON source");
const platformStatusSource = fs.readFileSync(path.join(root, "src", "lib", "platformStatus.ts"), "utf8");
if (!platformStatusSource.includes("PLATFORM_VERSION") || /v\d+\.\d+/.test(platformStatusSource)) failures.push("platformStatus contains a hard-coded or disconnected version");

const methodology = fs.readFileSync(path.join(out, "methodology", "index.html"), "utf8");
let previousSectionIndex = -1;
for (const section of methodologySections) {
  const sectionIndex = methodology.indexOf(`id="${section}"`);
  if (sectionIndex < 0) failures.push(`missing methodology section: ${section}`);
  else if (sectionIndex <= previousSectionIndex) failures.push(`methodology section order mismatch: ${section}`);
  previousSectionIndex = sectionIndex;
}
if (!methodology.includes("Validation ≠ scientific proof") || !methodology.includes("Historical reconstruction readiness")) failures.push("methodology validation boundary is incomplete");
if (!methodology.includes("Reduced-form VAR") || !methodology.includes("Finite-Sample Stationarity Calibration") || !methodology.includes("50,000") || !methodology.includes("asymptotic equivalence") || !methodology.includes("残差 LM") || !methodology.includes("预注册正式基线") || !methodology.includes("月份虚拟变量") || !methodology.includes("seasonality") || !methodology.includes("seasonal unit root") || !methodology.includes("structural break") || !methodology.includes("不是结构冲击或因果效应")) failures.push("v1.44 VAR methodology boundary is incomplete");
if (!methodology.includes("宏观驱动与冲击识别边界") || !methodology.includes("Observed driver") || !methodology.includes("identified_shock") || !methodology.includes("causal_lp_ready") || !methodology.includes("时间对齐") || !methodology.includes("共同序列")) failures.push("v1.51 macro-driver temporal/scope methodology boundary is incomplete");
if (!methodology.includes("High-Frequency Monetary Policy Identification") || !methodology.includes("EA-MPD") || !methodology.includes("EA-EMPD") || !methodology.includes("central-bank information effect") || !methodology.includes("monthly_sum_of_event_surprises") || !methodology.includes("external ECB spillover")) failures.push("v1.6 ECB identification methodology boundary is incomplete");
if (!methodology.includes("Jarociński–Karadi") || !methodology.includes("OIS_1M") || !methodology.includes("OIS_1Y") || !methodology.includes("STOXX50") || !methodology.includes("poor-man") || !methodology.includes("中位旋转") || !methodology.includes("不是唯一结构真值") || !methodology.includes("registry_only")) failures.push("v1.62 author-reference methodology boundary is incomplete");
if (!methodology.includes("Lag-Augmented Local Projections") || !methodology.includes("common") || !methodology.includes("N") || !methodology.includes("HC1") || !methodology.includes("pointwise") || !methodology.includes("2025-10") || !methodology.includes("25bp tightening") || !methodology.includes("state-dependent LP")) failures.push("v1.7 Local Projections methodology boundary is incomplete");

for (const stableUrl of stableResearchUrls) {
  const route = stableUrl.split(/[?#]/)[0].replace(/^\//, "").replace(/\/$/, "");
  const file = path.join(out, route, "index.html");
  if (!fs.existsSync(file)) failures.push(`stable URL route missing: ${stableUrl}`);
}

if (failures.length) {
  console.error(`Release QA failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Release QA passed.");
console.log(`Routes checked: ${requiredRoutes.length}`);
console.log(`Exports checked: ${requiredExports.length}`);
console.log(`Internal links checked: ${internalLinksChecked}`);
console.log(`Stable research URLs checked: ${stableResearchUrls.length}`);
console.log(`Validation tests: ${manifest.core_research_validation.historical_golden_cases}`);
console.log(`Golden failures: ${manifest.core_research_validation.golden_failures}`);
console.log(`Blocking failures: ${manifest.core_research_validation.blocking_failures}`);
console.log(`Platform version: ${metadata.version}`);
console.log(`Source commit: ${manifest.source_commit}`);
