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
const requiredExports = ["platform_metadata.json", "release_manifest.json", "validation_registry.json", "golden_test_cases.json", "observations.json", "sources.json", "indicators.json", "var_country_readiness.json", "stationarity_specification_registry.json", "seasonal_stationarity_results.json", "seasonal_adf_critical_values.json", "seasonal_adf_decision_comparison.json", "hegy_readiness_registry.json", "structural_break_registry.json", "persistence_diagnostics.json", researchPackageFilename()];
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
  if (manifest.validation_summary?.blocking_failures !== 0) failures.push(`blocking validation failures: ${manifest.validation_summary?.blocking_failures}`);
  if (manifest.validation_summary?.golden_failures !== 0) failures.push(`golden failures: ${manifest.validation_summary?.golden_failures}`);
  const expectedAdvancedVersions = {
    panel_engine: "panel-engine-v1.25",
    trade_network: "trade-network-v1.25-active",
    event_window: "event-window-v1.31",
    high_frequency: "high-frequency-v1.31",
    analysis_skill_registry: "analysis-skill-registry-v1.44",
    transformation_registry: "transformation-registry-v1.41",
    stationarity_engine: "stationarity-engine-v1.44",
    seasonal_adf_calibration: "seasonal-adf-critical-values-v1.44",
    seasonal_adf_decision_comparison: "seasonal-adf-decision-comparison-v1.44",
    hegy_readiness: "hegy-readiness-registry-v1.44",
    structural_break_registry: "structural-break-registry-v1.44",
    var_engine: "var-engine-v1.44",
    var_specification_profiles: "var-specification-profiles-v1.44",
    var_country_readiness: "var-country-readiness-v1.44",
  };
  for (const [key, expected] of Object.entries(expectedAdvancedVersions)) if (manifest.advanced_analysis_versions?.[key] !== expected) failures.push(`advanced analysis provenance mismatch: ${key}=${manifest.advanced_analysis_versions?.[key]} expected=${expected}`);
  if (expectedCommit && (manifest.build_context !== "github-actions" || !manifest.workflow_run_id)) failures.push("CI manifest is missing github-actions build context or workflow_run_id");
  if (!expectedCommit && manifest.build_context !== "local") failures.push(`local manifest build context mismatch: ${manifest.build_context}`);
  if (manifest.research_package?.status !== "built" || !/^research-data-v1\.44\.zip$/.test(manifest.research_package?.filename ?? "") || !/^[a-f0-9]{64}$/.test(manifest.research_package?.sha256 ?? "") || !manifest.research_package?.generated_at) failures.push("research package filename/SHA256/generated_at provenance is incomplete");
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

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!readme.includes(`Current release: **${expectedVersion}**`)) failures.push("README current release does not match canonical metadata");
if (!readme.includes(`version ${expectedVersion}, accessed`)) failures.push("README citation does not match canonical metadata");
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const latestChangelogHeading = changelog.match(/^## (.+)$/m)?.[1] ?? "";
if (!latestChangelogHeading.startsWith(expectedVersion) || !latestChangelogHeading.includes(releaseConfig.release_date)) failures.push(`CHANGELOG latest release mismatch: ${latestChangelogHeading}`);
const skillRegistry = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "analysis", "analysis_skill_registry.json"), "utf8"));
if (skillRegistry.schema_version !== "analysis-skill-registry-v1.44") failures.push(`analysis skill registry schema mismatch: ${skillRegistry.schema_version}`);
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
console.log(`Validation tests: ${manifest.validation_summary.total}`);
console.log(`Golden failures: ${manifest.validation_summary.golden_failures}`);
console.log(`Blocking failures: ${manifest.validation_summary.blocking_failures}`);
console.log(`Platform version: ${metadata.version}`);
console.log(`Source commit: ${manifest.source_commit}`);
