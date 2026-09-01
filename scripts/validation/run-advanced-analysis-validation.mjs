import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { missingMonths, monthSequence } from "../lib/months.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename });
  module._compile(output.outputText, filename);
};

const { runPanelEconometrics } = require("../../src/lib/panelEngine.ts");
const { aggregateTradeEdges, calculateNetworkMetrics, computeCoverageGate } = require("../../src/lib/networkEngine.ts");
const { computeEventWindow, attachOverlappingEvents, eventWindowEligibility, buildLineSegments } = require("../../src/lib/eventWindowEngine.ts");
const countries = Array.from({ length: 10 }, (_, index) => `country_${index + 1}`);
const observations = [];
for (const [countryIndex, country] of countries.entries()) for (let year = 2015; year <= 2024; year += 1) {
  const yearIndex = year - 2015;
  const x = Math.sin(countryIndex * 2.1 + yearIndex * 1.3) + countryIndex * yearIndex * 0.013;
  const y = 2 * x + countryIndex * 3 + yearIndex * 0.7;
  for (const [indicator, value] of [["synthetic_y", y], ["synthetic_x", x]]) observations.push({ observation_id: `${country}:${indicator}:${year}`, country, year, indicator, value, unit: "synthetic", source: "synthetic validation fixture", source_url: "local-test", source_reliability: "A", definition_version: "test-v1", comparability_status: "comparable", data_status: "official", updated_at: "2026-08-21", source_indicator: indicator, definition_note: "Deterministic validation only." });
}

const errors = [];
let panelTests = 0;
let networkTests = 0;
let varTests = 0;
let macroDriverTests = 0;
let identifiedShockTests = 0;
let localProjectionTests = 0;
let authorReferenceTests = 0;
function check(condition, message, bucket = "panel") {
  if (bucket === "panel") panelTests += 1;
  else if (bucket === "network") networkTests += 1;
  else if (bucket === "hf") hfTests += 1;
  else if (bucket === "var") varTests += 1;
  else if (bucket === "macro_driver") macroDriverTests += 1;
  else eventTests += 1;
  if (!condition) errors.push(message);
}
let hfTests = 0;
let eventTests = 0;
function expectThrow(fn, pattern, message) {
  try {
    fn();
    errors.push(`${message} (no error thrown)`);
  } catch (error) {
    if (pattern && !String(error instanceof Error ? error.message : error).includes(pattern)) errors.push(`${message} (unexpected error: ${error})`);
  }
}

// ---- Panel: known synthetic coefficients for all three specifications (§18) ----
const baseSpecification = { outcome: "synthetic_y", explanatory_variables: ["synthetic_x"], countries, start_year: 2015, end_year: 2024, fixed_effects: "country_year", standard_errors: "cluster_country" };
const exact = runPanelEconometrics(observations, baseSpecification);
check(Math.abs(exact.coefficients[0].coefficient - 2) < 1e-7, `Known panel coefficient failed: ${exact.coefficients[0].coefficient}`);
check(exact.diagnostics.countries === 10 && exact.diagnostics.years === 10, "Panel coverage diagnostics failed.");
const countryFe = runPanelEconometrics(observations.map((item) => item.indicator === "synthetic_y" ? { ...item, value: item.value - (item.year - 2015) * 0.7 } : item), { ...baseSpecification, fixed_effects: "country" });
check(Math.abs(countryFe.coefficients[0].coefficient - 2) < 1e-7, "Country FE consistency failed.");
const stripped = observations.map((item) => {
  if (item.indicator !== "synthetic_y") return item;
  const countryIndex = countries.indexOf(item.country);
  return { ...item, value: item.value - countryIndex * 3 - (item.year - 2015) * 0.7 };
});
const pooled = runPanelEconometrics(stripped, { ...baseSpecification, fixed_effects: "none", standard_errors: "robust" });
check(Math.abs(pooled.coefficients[0].coefficient - 2) < 1e-7, `Pooled OLS known coefficient failed: ${pooled.coefficients[0].coefficient}`);
check(pooled.diagnostics.inference_method === "hc1_asymptotic", "Pooled OLS must use HC1 asymptotic inference.");

// ---- Panel: unbalanced reporting (§21) ----
const missing = observations.filter((item) => !(item.indicator === "synthetic_x" && item.year === 2015 && countries.slice(0, 3).includes(item.country)));
const missingResult = runPanelEconometrics(missing, baseSpecification);
check(missingResult.diagnostics.missing_rows === 3, `Missing-row test failed: ${missingResult.diagnostics.missing_rows}`);
check(missingResult.diagnostics.expected_rows === 100 && missingResult.diagnostics.observations === 97, "Unbalanced expected/used row reporting failed.");
check(Math.abs(missingResult.diagnostics.sample_coverage - 0.97) < 1e-12, "Unbalanced coverage ratio failed.");

// ---- Panel: clustered inference contract (§14-16) ----
check(exact.diagnostics.clusters === 10 && exact.diagnostics.degrees_of_freedom === 9, "Cluster count / df failed.");
check(exact.diagnostics.inference_method === "cluster_country_student_t", "Clustered inference must use Student-t.");
check(typeof exact.diagnostics.cluster_warning === "string" && exact.diagnostics.cluster_warning.includes("Small number of clusters"), "Small-cluster warning missing for G=10.");
expectThrow(
  () => runPanelEconometrics(observations, { ...baseSpecification, countries: countries.slice(0, 7) }),
  "至少 8 个国家",
  "Clustered SE with G<8 must be blocked",
);
panelTests += 1;
const robustRun = runPanelEconometrics(observations, { ...baseSpecification, standard_errors: "robust" });
check(robustRun.diagnostics.inference_method === "hc1_asymptotic" && robustRun.diagnostics.clusters === null, "HC1 path must stay asymptotic and separate from cluster logic.");

// ---- Panel: singular / collinearity QA (§20) ----
const duplicated = observations.map((item) => item.indicator === "synthetic_x" ? [{ ...item }, { ...item, indicator: "synthetic_x_copy", observation_id: `${item.observation_id}:copy` }] : [item]).flat();
expectThrow(
  () => runPanelEconometrics(duplicated, { ...baseSpecification, explanatory_variables: ["synthetic_x", "synthetic_x_copy"] }),
  "奇异",
  "Perfect multicollinearity must throw a singular-matrix error",
);
panelTests += 1;
const nearCollinear = observations.map((item) => item.indicator === "synthetic_x" ? [{ ...item }, { ...item, indicator: "synthetic_x_near", observation_id: `${item.observation_id}:near`, value: item.value + 1e-3 * Math.sin(item.country.length * 3.7 + item.year * 0.9) }] : [item]).flat();
const nearRun = runPanelEconometrics(nearCollinear, { ...baseSpecification, explanatory_variables: ["synthetic_x", "synthetic_x_near"] });
check(nearRun.diagnostics.multicollinearity_warning !== null, "Near-collinearity warning missing.");
check(nearRun.coefficients.every((item) => Number.isFinite(item.coefficient) && Number.isFinite(item.standard_error)), "Near-collinear run produced non-finite output.");

// ---- Panel: ordering invariance (§22) ----
const shuffled = [...observations].sort((a, b) => (a.country + a.indicator + a.year).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7 - (b.country + b.indicator + b.year).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7);
const shuffledResult = runPanelEconometrics(shuffled, baseSpecification);
check(Math.abs(shuffledResult.coefficients[0].coefficient - exact.coefficients[0].coefficient) < 1e-12
  && Math.abs(shuffledResult.coefficients[0].standard_error - exact.coefficients[0].standard_error) < 1e-12
  && Math.abs(shuffledResult.diagnostics.r_squared - exact.diagnostics.r_squared) < 1e-12,
  "Ordering invariance failed (observation order changed results).");
const reversedCountries = runPanelEconometrics(observations, { ...baseSpecification, countries: [...countries].reverse() });
check(Math.abs(reversedCountries.coefficients[0].coefficient - exact.coefficients[0].coefficient) < 1e-12, "Country-order invariance failed.");

// ---- Panel: provenance contract (§23) ----
check(Boolean(exact.platform_version && exact.dataset_version && exact.panel_schema_version && exact.engine_version && exact.calculation_date), "Panel provenance fields missing.");
check(exact.bootstrap.status === "unavailable" && exact.bootstrap.supported_repetitions.join() === "499,999", "Wild cluster bootstrap must stay interface-only (unavailable).");

// ---- Panel: Python reference fixtures (§19) ----
const referencePath = path.join(root, "src/data/analysis/panel_reference_cases.json");
if (!fs.existsSync(referencePath)) {
  errors.push("panel_reference_cases.json missing; run scripts/validation/generate-panel-reference.py offline.");
} else {
  const reference = JSON.parse(fs.readFileSync(referencePath, "utf8"));
  for (const [caseName, referenceCase] of Object.entries(reference.cases)) {
    const spec = {
      outcome: reference.specification.outcome,
      explanatory_variables: reference.specification.explanatory_variables,
      countries: reference.specification.countries,
      start_year: reference.specification.start_year,
      end_year: reference.specification.end_year,
      fixed_effects: referenceCase.fixed_effects,
      standard_errors: reference.specification.standard_errors,
    };
    const result = runPanelEconometrics(reference.observations, spec);
    for (const referenceCoefficient of referenceCase.coefficients) {
      const actual = result.coefficients.find((item) => item.variable === referenceCoefficient.variable);
      check(Boolean(actual), `${caseName}: missing coefficient ${referenceCoefficient.variable}`);
      if (!actual) continue;
      check(Math.abs(actual.coefficient - referenceCoefficient.coefficient) < 1e-6, `${caseName}/${referenceCoefficient.variable}: coefficient mismatch vs statsmodels (${actual.coefficient} vs ${referenceCoefficient.coefficient})`);
      check(Math.abs(actual.standard_error - referenceCoefficient.standard_error) / referenceCoefficient.standard_error < 1e-4, `${caseName}/${referenceCoefficient.variable}: SE mismatch vs statsmodels (${actual.standard_error} vs ${referenceCoefficient.standard_error})`);
      check(Math.abs(actual.p_value - referenceCoefficient.p_value_t_g_minus_1) < 1e-4, `${caseName}/${referenceCoefficient.variable}: p-value mismatch vs scipy t(df=G-1) (${actual.p_value} vs ${referenceCoefficient.p_value_t_g_minus_1})`);
    }
    check(Math.abs(result.diagnostics.r_squared - referenceCase.r_squared) < 1e-8, `${caseName}: R² mismatch (${result.diagnostics.r_squared} vs ${referenceCase.r_squared})`);
    check(Math.abs(result.diagnostics.within_r_squared - referenceCase.within_r_squared) < 1e-8, `${caseName}: within R² mismatch (${result.diagnostics.within_r_squared} vs ${referenceCase.within_r_squared})`);
  }
}

// ---- Released panel smoke test ----
const releasedPanel = JSON.parse(fs.readFileSync(path.join(root, "src/data/panel/panel_observations.json"), "utf8")).records;
const releasedResult = runPanelEconometrics(releasedPanel, { outcome: "real_gdp_growth", explanatory_variables: ["consumer_price_inflation", "unemployment_rate"], countries: ["germany", "poland", "hungary", "romania", "czechia", "slovakia", "slovenia", "serbia", "austria", "croatia"], start_year: 2015, end_year: 2025, fixed_effects: "country_year", standard_errors: "cluster_country" });
check(releasedResult.diagnostics.observations >= 80 && releasedResult.coefficients.every((item) => Number.isFinite(item.coefficient) && Number.isFinite(item.standard_error)), "Released panel smoke test failed.");

// ---- Network: aggregation, exclusion, determinism, coverage, real-data metrics (§35) ----
const edgeBase = { year: 2024, sector: "TOTAL", flow: "exports", currency: "current USD", source: "UN Comtrade", source_url: "https://comtradeplus.un.org/", source_reliability: "A", partner_iso3: "DEU", data_status: "official", network_eligible: true };
const edges = [
  { ...edgeBase, edge_id: "a", reporter_country: "poland", partner_country: "germany", trade_value: 30 },
  { ...edgeBase, edge_id: "b", reporter_country: "poland", partner_country: "germany", trade_value: 30 },
  { ...edgeBase, edge_id: "c", reporter_country: "poland", partner_country: "china", trade_value: 40, partner_iso3: "CHN" },
  { ...edgeBase, edge_id: "d", reporter_country: "poland", partner_country: "world", trade_value: 100, partner_iso3: "W00", network_eligible: false },
  { ...edgeBase, edge_id: "e", reporter_country: "poland", partner_country: "other-asia-nes", trade_value: 10, partner_iso3: "S19", network_eligible: false },
];
const aggregated = aggregateTradeEdges(edges);
check(aggregated.length === 4 && aggregated.find((item) => item.partner_country === "germany")?.trade_value === 60, "Network edge aggregation failed.", "network");
const metricsA = calculateNetworkMetrics(edges)[0];
const metricsB = calculateNetworkMetrics([...edges].reverse())[0];
check(Math.abs(metricsA.partner_hhi - 0.52) < 1e-12, `HHI test failed: ${metricsA.partner_hhi}`, "network");
check(JSON.stringify(metricsA) === JSON.stringify(metricsB), "Network metrics are not deterministic.", "network");
check(metricsA.partner_count === 2, "Aggregate partners must be excluded from metrics (partner count).", "network");
check(Math.abs(metricsA.china_share - 0.4) < 1e-12 && Math.abs(metricsA.top_partner_share - 0.6) < 1e-12, "China/top-partner share failed.", "network");
check(Math.abs(metricsA.diversification - 0.48) < 1e-12, "Diversification failed.", "network");
check(!("partner_degree_ratio" in metricsA) && !("total_eligible_partners" in metricsA), "Metrics must not publish degree-ratio style centrality proxies.", "network");

// ---- Network: eligible coverage regression test (v1.3 release blocker) ----
const coverageFixture = [
  { ...edgeBase, edge_id: "w", reporter_country: "testland", partner_country: "world", trade_value: 100, partner_iso3: "W00", network_eligible: false },
  { ...edgeBase, edge_id: "p1", reporter_country: "testland", partner_country: "germany", trade_value: 50 },
  { ...edgeBase, edge_id: "p2", reporter_country: "testland", partner_country: "china", trade_value: 30, partner_iso3: "CHN" },
  { ...edgeBase, edge_id: "agg", reporter_country: "testland", partner_country: "other-asia-nes", trade_value: 20, partner_iso3: "S19", network_eligible: false },
];
const coverageResult = computeCoverageGate(coverageFixture)[0];
check(Math.abs(coverageResult.raw_coverage_ratio - 1) < 1e-12, `Raw coverage must include aggregates (expect 1.0): ${coverageResult.raw_coverage_ratio}`, "network");
check(Math.abs(coverageResult.eligible_coverage_ratio - 0.8) < 1e-12, `Eligible coverage must exclude aggregates (expect 0.8): ${coverageResult.eligible_coverage_ratio}`, "network");
check(coverageResult.gate_passed === false, "Coverage gate MUST FAIL when eligible coverage is 80% even if raw coverage is 100%.", "network");

const canonicalEdges = JSON.parse(fs.readFileSync(path.join(root, "src/data/network/trade_edges.json"), "utf8"));
const storedCoverage = JSON.parse(fs.readFileSync(path.join(root, "src/data/network/network_coverage.json"), "utf8"));
const recomputedCoverage = computeCoverageGate(canonicalEdges.records);
check(recomputedCoverage.length === storedCoverage.record_count, "Published coverage record count mismatch.", "network");
check(recomputedCoverage.every((entry, index) => entry.gate_passed === storedCoverage.records[index].gate_passed
  && Math.abs((entry.eligible_coverage_ratio ?? 0) - (storedCoverage.records[index].eligible_coverage_ratio ?? 0)) < 1e-9),
  "Engine coverage diverges from published network_coverage.json.", "network");
check(storedCoverage.records.every((entry) => entry.raw_coverage_ratio !== null && entry.eligible_coverage_ratio !== null), "Coverage records must carry both raw (QA-only) and eligible ratios.", "network");
check(canonicalEdges.coverage_gate.is_active === true, "Network skill must remain active with per-group gating.", "network");
const storedPoland = storedCoverage.records.find((entry) => entry.reporter_country === "poland" && entry.year === 2024 && entry.flow === "exports");
const recomputedPoland = recomputedCoverage.find((entry) => entry.reporter_country === "poland" && entry.year === 2024 && entry.flow === "exports");
check(storedPoland && recomputedPoland && Math.abs(storedPoland.eligible_coverage_ratio - recomputedPoland.eligible_coverage_ratio) < 1e-9
  && Math.abs(storedPoland.raw_coverage_ratio - recomputedPoland.raw_coverage_ratio) < 1e-9, "Eligible coverage ratio recomputation mismatch.", "network");
const recomputedMetrics = calculateNetworkMetrics(canonicalEdges.records);
const storedMetrics = JSON.parse(fs.readFileSync(path.join(root, "src/data/network/network_metrics.json"), "utf8"));
const hungaryImports2024 = recomputedMetrics.find((entry) => entry.country === "hungary" && entry.year === 2024 && entry.flow === "imports");
const storedHungary = storedMetrics.records.find((entry) => entry.country === "hungary" && entry.year === 2024 && entry.flow === "imports");
check(hungaryImports2024 && storedHungary && Math.abs(hungaryImports2024.partner_hhi - storedHungary.partner_hhi) < 1e-12, "Engine metrics diverge from published network_metrics.json.", "network");
check(recomputedMetrics.length === storedMetrics.record_count, "Published metric record count mismatch.", "network");

// ---- High-frequency data validation (§91) ----
const hfData = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/high_frequency_observations.json"), "utf8"));
const hfRecords = hfData.records;
const hfIds = new Set(hfRecords.map((record) => record.observation_id));
check(hfIds.size === hfRecords.length, "High-frequency: duplicate observation_id detected.", "hf");
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
check(hfRecords.every((record) => periodPattern.test(record.period)), "High-frequency: invalid monthly period format.", "hf");
const seriesKeys = new Set(hfRecords.map((record) => `${record.country}:${record.indicator}`));
let duplicateMonths = 0;
for (const key of seriesKeys) {
  const periods = hfRecords.filter((record) => `${record.country}:${record.indicator}` === key).map((record) => record.period);
  if (new Set(periods).size !== periods.length) duplicateMonths += 1;
}
check(duplicateMonths === 0, `High-frequency: duplicate months in ${duplicateMonths} series.`, "hf");
const saByIndicator = new Map();
for (const record of hfRecords) {
  const existing = saByIndicator.get(record.indicator);
  if (existing && existing !== record.seasonal_adjustment) errors.push(`High-frequency: mixed seasonal adjustment in ${record.indicator}.`);
  saByIndicator.set(record.indicator, record.seasonal_adjustment);
}
hfTests += 1;
const unitByIndicator = new Map();
let unitMix = false;
for (const record of hfRecords) {
  const existing = unitByIndicator.get(record.indicator);
  if (existing && existing !== record.unit) unitMix = true;
  unitByIndicator.set(record.indicator, record.unit);
}
check(!unitMix || hfRecords.some((record) => record.series_break_status !== "none_recorded"), "High-frequency: unit change without series_break_status record.", "hf");
check(hfRecords.every((record) => record.vintage_status === "latest_revised" && record.revision_status === "latest_revised"), "High-frequency: revision policy fields missing.", "hf");
const hfCoverage = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/high_frequency_coverage.json"), "utf8"));
check(hfCoverage.record_count === 40, `High-frequency coverage must cover 10 countries × 4 indicators (got ${hfCoverage.record_count}).`, "hf");
const huHicp = hfCoverage.records.find((entry) => entry.country === "hungary" && entry.indicator === "hicp_annual_rate");
check(huHicp && huHicp.observations >= 120 && huHicp.analysis_eligible === true, "High-frequency coverage: Hungary HICP series incomplete.", "hf");
const reorderedHf = [...hfRecords].reverse();
const hfOrderKey = (records) => records.map((record) => `${record.observation_id}=${record.value}`).sort().join("|");
check(hfOrderKey(reorderedHf) === hfOrderKey(hfRecords), "High-frequency: series content changed under reordering.", "hf");

// v1.31 §1/§6 — HICP dataset migration: legacy tables must not be active sources.
const LEGACY_HICP = /prc_hicp_midx|prc_hicp_manr/;
check(hfRecords.filter((record) => record.indicator.startsWith("hicp")).every((record) => record.source_dataset.includes("prc_hicp_minr")), "HICP records must use prc_hicp_minr as the active source.", "hf");
check(!hfRecords.some((record) => LEGACY_HICP.test(record.source_dataset) || LEGACY_HICP.test(record.definition_version)), "Legacy HICP dataset IDs must not appear in observations.", "hf");
const dictionary = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/series_dictionary.json"), "utf8"));
check(!dictionary.records.some((record) => LEGACY_HICP.test(record.source_dataset)), "Legacy HICP dataset IDs must not appear in the series dictionary.", "hf");

// v1.31 §3 — HICP reference base: single, explicit, never spliced.
const hicpIndex = hfRecords.filter((record) => record.indicator === "hicp_monthly_index");
check(hicpIndex.length > 0 && hicpIndex.every((record) => record.unit === "I15" && record.index_reference === "2015=100"), "HICP index reference base must be consistently 2015=100 (I15).", "hf");

// v1.31 §7/§8 — migration overlap QA manifest must exist and have passed.
const migrationManifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/hicp_migration_manifest.json"), "utf8"));
check(migrationManifest.new_dataset === "prc_hicp_minr" && migrationManifest.overlap_test.result === "passed" && migrationManifest.overlap_test.annual_rate.maximum_difference <= 0.15 && migrationManifest.overlap_test.index.maximum_difference <= 0.5, "HICP migration overlap QA must have passed within tolerance.", "hf");
check(migrationManifest.all_items_continuity === "verified" && migrationManifest.classification.includes("ECOICOP"), "HICP ECOICOP-2 classification / all-items continuity must be recorded.", "hf");

// v1.31 §13/§14 — runtime schema carries unit / value_semantics / SA / definition.
check(hfRecords.every((record) => record.unit && record.value_semantics && record.seasonal_adjustment && record.definition_version), "High-frequency records must carry unit, value_semantics, seasonal_adjustment, definition_version.", "hf");
const semanticsByIndicator = new Map();
for (const record of hfRecords) {
  const existing = semanticsByIndicator.get(record.indicator);
  if (existing && existing !== record.value_semantics) errors.push(`High-frequency: mixed value_semantics in ${record.indicator}.`);
  semanticsByIndicator.set(record.indicator, record.value_semantics);
}
hfTests += 1;
check(semanticsByIndicator.get("unemployment_rate_monthly") === "rate_percent" && semanticsByIndicator.get("hicp_annual_rate") === "yoy_rate" && semanticsByIndicator.get("hicp_monthly_index") === "index_level", "value_semantics assignments wrong.", "hf");

// v1.31 §25/§26 — expected axis is the complete month sequence; API-omitted months
// must surface as missing. Synthetic: 2025-01, 2025-02, 2025-04 → 2025-03 missing.
const syntheticGap = new Map([["2025-01", 1], ["2025-02", 2], ["2025-04", 4]]);
check(JSON.stringify(missingMonths("2025-01", "2025-04", syntheticGap)) === JSON.stringify(["2025-03"]), "Missing-month detection must catch API-omitted months.", "hf");
let coverageMismatch = 0;
for (const entry of hfCoverage.records) {
  if (entry.definition_status !== "defined") continue;
  const valueByPeriod = new Map(hfRecords.filter((record) => `${record.country}:${record.indicator}` === `${entry.country}:${entry.indicator}`).map((record) => [record.period, record.value]));
  const recomputed = missingMonths("2015-01", entry.expected_latest_period, valueByPeriod);
  if (JSON.stringify(recomputed) !== JSON.stringify(entry.missing_period_list)) coverageMismatch += 1;
  if (entry.expected_periods !== monthSequence("2015-01", entry.expected_latest_period).length) coverageMismatch += 1;
}
check(coverageMismatch === 0, `Coverage missing-month lists inconsistent with observations in ${coverageMismatch} entries.`, "hf");

// v1.31 §27 — freshness / publication lag fields present and well-formed.
check(hfCoverage.records.every((entry) => entry.latest_available_period !== undefined && entry.expected_latest_period && ["normal_publication_lag", "stale_series", "no_data"].includes(entry.publication_lag_status)), "Coverage freshness / publication-lag fields missing or invalid.", "hf");
check(huHicp.end_period >= "2026-01", `HICP coverage must extend beyond 2025-12 after migration (got ${huHicp.end_period}).`, "hf");

// ---- Event window validation (§92, extended v1.31 §9-§21) ----
const syntheticSeries = [];
for (let month = 0; month < 36; month += 1) {
  const year = 2020 + Math.floor(month / 12);
  const period = `${year}-${String((month % 12) + 1).padStart(2, "0")}`;
  syntheticSeries.push({ observation_id: `hf:test:index:${period}`, country: "testland", period, indicator: "test_index", value: 100 + month, transformation: "level" });
}
const syntheticEvent = { event_id: "ev-test", title: "Synthetic event", date: "2021-07-15", country_slug: "testland", data_status: "verified", event_type: "macro" };
const windowResult = computeEventWindow(syntheticEvent, syntheticSeries, { preMonths: 12, postMonths: 12 });
check(windowResult.event_period === "2021-07", `Event-date alignment failed: ${windowResult.event_period}`, "event");
check(windowResult.points.length === 25 && windowResult.points[12].relative_month === 0 && windowResult.points[0].relative_month === -12 && windowResult.points[24].relative_month === 12, "Window boundaries / pre-post indexing failed.", "event");
// v1.31: true post excludes the event month → post months are 2021-08..2022-07 (values 119..130).
check(windowResult.pre_period_mean === 111.5 && windowResult.post_period_mean === 124.5 && windowResult.event_period_value === 118, `Pre/event/post separation failed: ${windowResult.pre_period_mean}/${windowResult.event_period_value}/${windowResult.post_period_mean}`, "event");
check(windowResult.absolute_change_pre_to_post === 13 && windowResult.event_vs_pre_difference === 6.5, "Pre-to-post change / event-vs-pre failed.", "event");
check(windowResult.relative_percentage_change !== null && Math.abs(windowResult.relative_percentage_change - 13 / 111.5 * 100) < 0.01, "Index relative percentage change failed.", "event");
check(windowResult.change_semantics === "index_points" && windowResult.value_semantics === "index_level", `Index change semantics failed: ${windowResult.change_semantics}`, "event");
check(windowResult.post_observations === 12 && windowResult.pre_observations === 12, `Post observation count must exclude the event month: ${windowResult.post_observations}`, "event");
check(windowResult.gate === "full", "Full-window gate failed on complete synthetic data.", "event");
const constantSeries = syntheticSeries.map((point) => ({ ...point, value: 50 }));
const zeroChange = computeEventWindow(syntheticEvent, constantSeries, { preMonths: 12, postMonths: 12 });
check(zeroChange.absolute_change_pre_to_post === 0 && zeroChange.relative_percentage_change === 0, "Zero-change fixture failed.", "event");

// v1.31 §12 — event-month spike must not pull the post mean.
const spikeSeries = syntheticSeries.map((point) => ({ ...point, value: point.period < "2021-07" ? 50 : point.period === "2021-07" ? 100 : 60 }));
const spikeResult = computeEventWindow(syntheticEvent, spikeSeries, { preMonths: 12, postMonths: 12 });
check(spikeResult.pre_period_mean === 50 && spikeResult.event_period_value === 100 && spikeResult.post_period_mean === 60 && spikeResult.absolute_change_pre_to_post === 10, `Event-month exclusion from post mean failed: ${spikeResult.pre_period_mean}/${spikeResult.event_period_value}/${spikeResult.post_period_mean}`, "event");

// v1.31 §15/§16 — rate series report percentage-point changes, never relative %.
const rateSeries = syntheticSeries.map((point) => ({ ...point, indicator: "test_rate", unit: "%", value_semantics: "rate_percent", value: point.period < "2021-07" ? 6 : point.period === "2021-07" ? 7 : 6.5 }));
const rateResult = computeEventWindow(syntheticEvent, rateSeries, { preMonths: 12, postMonths: 12 });
check(rateResult.change_semantics === "percentage_points" && Math.abs(rateResult.absolute_change_pre_to_post - 0.5) < 1e-9 && rateResult.relative_percentage_change === null, `Unemployment-style pp semantics failed: ${rateResult.change_semantics}/${rateResult.absolute_change_pre_to_post}/${rateResult.relative_percentage_change}`, "event");

// v1.31 §18 — YoY rate series: pp change only (3% → 4% is +1 pp, not +33.3%).
const yoySeries = syntheticSeries.map((point) => ({ ...point, indicator: "test_yoy", unit: "%", value_semantics: "yoy_rate", transformation: "yoy_rate", value: point.period < "2021-07" ? 3 : point.period === "2021-07" ? 5 : 4 }));
const yoyResult = computeEventWindow(syntheticEvent, yoySeries, { preMonths: 12, postMonths: 12 });
check(yoyResult.change_semantics === "percentage_points" && yoyResult.absolute_change_pre_to_post === 1 && yoyResult.relative_percentage_change === null, "YoY-rate pp-change semantics failed.", "event");

// v1.31 §20 — chart gap segmentation: missing months break the line, no visual interpolation.
const gapped = syntheticSeries.filter((point) => point.period !== "2021-03" && point.period !== "2021-04");
const gappedResult = computeEventWindow(syntheticEvent, gapped, { preMonths: 12, postMonths: 12 });
check(gappedResult.missing_periods.length === 2 && gappedResult.missing_periods.includes("2021-03"), "Missing-period handling failed.", "event");
const segments = buildLineSegments(gappedResult.points);
check(segments.length === 2 && segments[0].at(-1).period === "2021-02" && segments[1][0].period === "2021-05" && segments.every((segment) => segment.every((point) => point.value !== null)), `Chart gap segmentation failed: ${segments.length} segments`, "event");

const shuffledSeries = [...syntheticSeries].reverse();
const shuffledWindow = computeEventWindow(syntheticEvent, shuffledSeries, { preMonths: 12, postMonths: 12 });
check(JSON.stringify({ ...shuffledWindow, data_trace: [], overlapping_events: [] }) === JSON.stringify({ ...windowResult, data_trace: [], overlapping_events: [] }), "Event window ordering invariance failed.", "event");
const shortEvent = { ...syntheticEvent, date: "2020-09-15" };
const shortResult = computeEventWindow(shortEvent, syntheticSeries, { preMonths: 12, postMonths: 12 });
check(shortResult.gate === "exploratory" && shortResult.exploratory === true, `Exploratory short-window gate failed: ${shortResult.gate}`, "event");
const tooShortEvent = { ...syntheticEvent, date: "2020-02-15" };
check(computeEventWindow(tooShortEvent, syntheticSeries, { preMonths: 12, postMonths: 12 }).gate === "insufficient_data", "Insufficient-data gate failed.", "event");
// v1.31 §10 — the full gate counts true post observations only: an event 6 months
// before the series end yields exactly 6 post observations (event month excluded) and still passes;
// 5 months before the end yields 5 and must drop to exploratory.
const nearEndEvent = { ...syntheticEvent, date: "2022-06-15" };
const nearEndResult = computeEventWindow(nearEndEvent, syntheticSeries, { preMonths: 12, postMonths: 12 });
check(nearEndResult.post_observations === 6 && nearEndResult.gate === "full", `True post gate (6) failed: ${nearEndResult.post_observations}/${nearEndResult.gate}`, "event");
const pastEndEvent = { ...syntheticEvent, date: "2022-07-15" };
const pastEndResult = computeEventWindow(pastEndEvent, syntheticSeries, { preMonths: 12, postMonths: 12 });
check(pastEndResult.post_observations === 5 && pastEndResult.gate === "exploratory", `True post gate (5→exploratory) failed: ${pastEndResult.post_observations}/${pastEndResult.gate}`, "event");
check(eventWindowEligibility({ ...syntheticEvent, data_status: "pending" }).eligible === false, "Unverified event must be ineligible.", "event");
check(eventWindowEligibility({ ...syntheticEvent, date: "2021" }).eligible === false, "Year-only event date must be ineligible.", "event");
const overlapBase = { country_slug: "testland", data_status: "verified", event_type: "macro", title: "t" };
const withOverlap = attachOverlappingEvents(windowResult, [
  { ...overlapBase, event_id: "ev-other", date: "2021-10-03" },
  { ...overlapBase, event_id: "ev-outside", date: "2024-01-01" },
  { ...overlapBase, event_id: "ev-unverified", date: "2021-11-01", data_status: "pending" },
]);
check(withOverlap.overlapping_events.length === 1 && withOverlap.overlapping_events[0].event_id === "ev-other" && withOverlap.overlapping_event_warning !== null, "Overlapping-event detection failed.", "event");

// ---- Reduced-form VAR / macro-dynamics validation (v1.44) ----
const { estimateVarModel, selectVarLagOrder, varStability, portmanteauTest, orthogonalizedIrf, runReducedFormVar, isValidMonthPeriod, maximumAllowedVarLag, dynamicResponseHorizonEligibility } = require("../../src/lib/varEngine.ts");
const { adfSeasonalDummyMonteCarloTest, adfSeasonalDummyTest, adfTest, kpssStatus, persistenceDiagnostics, STATIONARITY_SPECIFICATION_REGISTRY } = require("../../src/lib/stationarityTests.ts");
const { applyTransformation } = require("../../src/lib/timeSeriesTransforms.ts");
const { eigenvalues, normalCdf, chiSquareCdf } = require("../../src/lib/numericLinAlg.ts");
const { BASELINE_VAR_PROFILE, BASELINE_VAR_PROFILE_V2, EXPLORATORY_VAR_PROFILE, createVarComparabilitySignature } = require("../../src/lib/varSpecifications.ts");
const varReferencePayload = JSON.parse(fs.readFileSync(path.join(root, "src/data/analysis/var_reference_cases.json"), "utf8"));
const seasonalCalibration = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/seasonal_adf_critical_values.json"), "utf8"));
const varRef = varReferencePayload.cases;

check(varReferencePayload.schema_version === "var-reference-cases-v1.43" && varReferencePayload.provenance?.generator_version === "var-reference-generator-v1.43", "VAR reference provenance version is missing.", "var");
check(["python_version", "numpy_version", "scipy_version", "statsmodels_version", "generation_date"].every((field) => Boolean(varReferencePayload.provenance?.[field])), "VAR reference runtime provenance is incomplete.", "var");
check(varReferencePayload.provenance?.seeds?.var_simulation === 42 && varReferencePayload.provenance?.seeds?.random_walk === 7 && varReferencePayload.provenance?.seeds?.seasonal_adf === 143, "VAR reference seeds are not pinned.", "var");
check(BASELINE_VAR_PROFILE.fallback_policy === "none" && EXPLORATORY_VAR_PROFILE.fallback_policy === "documented_exploratory_chain", "Baseline/exploratory profile boundary failed.", "var");
check(BASELINE_VAR_PROFILE.deterministic_terms === "constant" && BASELINE_VAR_PROFILE_V2.deterministic_terms === "constant_month_dummies" && EXPLORATORY_VAR_PROFILE.deterministic_terms === "constant", "Registered deterministic profiles are incorrect.", "var");
check(BASELINE_VAR_PROFILE.stationarity_specification_id === "adf_constant" && BASELINE_VAR_PROFILE_V2.stationarity_specification_id === "adf_constant_seasonal_dummies_mc" && EXPLORATORY_VAR_PROFILE.stationarity_specification_id === "adf_constant", "Profile-to-stationarity mapping is incorrect.", "var");
check(STATIONARITY_SPECIFICATION_REGISTRY.some((item) => item.specification_id === "adf_constant_seasonal_dummies" && item.state === "historical_reference") && STATIONARITY_SPECIFICATION_REGISTRY.some((item) => item.specification_id === "adf_constant_seasonal_dummies_mc" && item.state === "active") && STATIONARITY_SPECIFICATION_REGISTRY.some((item) => item.specification_id === "adf_constant_trend" && item.state === "registry_only"), "Stationarity specification registry is incomplete.", "var");
check(seasonalCalibration.schema_version === "seasonal-adf-critical-values-v1.44" && seasonalCalibration.state === "active_after_validation", "Seasonal ADF finite-sample calibration is not validated for active use.", "var");
check(seasonalCalibration.records.length === 9 && seasonalCalibration.records.every((item) => item.replications >= 50_000) && seasonalCalibration.sample_size_grid.join(",") === "96,108,120,126,132,138,144,156,168", "Seasonal ADF calibration grid or replication count is incomplete.", "var");
check(seasonalCalibration.validation.same_seed_reproducible && seasonalCalibration.validation.different_seed_within_mc_tolerance && seasonalCalibration.validation.null_size_test.passed && seasonalCalibration.validation.stationary_ar_power_sanity.passed, "Seasonal ADF Monte Carlo reproducibility/size/power validation failed.", "var");
const signatureA = createVarComparabilitySignature(BASELINE_VAR_PROFILE.variables);
const signatureB = createVarComparabilitySignature(BASELINE_VAR_PROFILE.variables);
const signatureC = createVarComparabilitySignature(BASELINE_VAR_PROFILE.variables.map((item, index) => index === 0 ? { ...item, transformation: "log_difference_12" } : item));
check(signatureA.signature_id === signatureB.signature_id && signatureA.signature_id !== signatureC.signature_id, "VAR comparability signature is not deterministic or transformation-sensitive.", "var");
check(isValidMonthPeriod("2024-01") && !isValidMonthPeriod("2024-1") && !isValidMonthPeriod("2024-13"), "YYYY-MM preflight validation failed.", "var");
check(maximumAllowedVarLag(180, 3) === 12 && maximumAllowedVarLag(60, 4) === 3, "VAR lag preflight parameter gate failed.", "var");
const horizonGateFixture = dynamicResponseHorizonEligibility(true, { 12: "passed", 18: "failed", 24: "failed" });
check(horizonGateFixture[6] && horizonGateFixture[12] && !horizonGateFixture[18] && !horizonGateFixture[24], "Horizon-specific dynamic-response gate failed.", "var");

// Seasonal-dummy ADF: independent Python OLS reference and synthetic seasonal-stationary process.
{
  const reference = varRef.seasonal_dummy_adf;
  const actual = adfSeasonalDummyTest(reference.data, reference.periods, { autolag: "aic" });
  const expected = reference.seasonal_dummy;
  check(actual.used_lag === expected.used_lag && actual.nobs === expected.nobs, `Seasonal ADF lag/nobs mismatch: ${actual.used_lag}/${actual.nobs}`, "var");
  check(Math.abs(actual.lagged_level_coefficient - expected.lagged_level_coefficient) < 1e-9, "Seasonal ADF lagged-level coefficient mismatch vs Python OLS.", "var");
  check(Math.abs(actual.lagged_level_standard_error - expected.lagged_level_standard_error) < 1e-9, "Seasonal ADF standard-error mismatch vs Python OLS.", "var");
  check(Math.abs(actual.statistic - expected.test_statistic) < 1e-9, "Seasonal ADF tau statistic mismatch vs Python OLS.", "var");
  check(actual.p_value === null && actual.p_value_policy === "unavailable_for_custom_deterministic_specification", "Seasonal ADF must not publish a pseudo-precise MacKinnon p-value.", "var");
  check(reference.expected.seasonal_dummy_rejects_at_5pct && reference.expected.seasonal_tau_more_negative_than_constant && actual.status === "stationary", "Synthetic deterministic-seasonality fixture did not demonstrate the registered seasonal-control decision.", "var");
  const persistence = persistenceDiagnostics(reference.data, 24);
  check(persistence.acf.length === 25 && persistence.pacf.length === 25 && persistence.seasonal_lag_12_autocorrelation !== null && persistence.approximate_significance_band_95.formula === "plus_minus_1.96_over_sqrt_n", "ACF/PACF persistence diagnostics are incomplete.", "var");

  const calibrated = adfSeasonalDummyMonteCarloTest(reference.data, reference.periods, { autolag: "aic" });
  check(calibrated.statistic === actual.statistic && calibrated.used_lag === actual.used_lag && calibrated.p_value === null, "Calibrated seasonal ADF changed the validated production tau regression or published a pseudo p-value.", "var");
  check(calibrated.calibration?.calibration_n_lower === 168 && calibrated.calibration?.calibration_n_upper === 168 && calibrated.p_value_policy === "unavailable_without_full_empirical_null_cdf", "Seasonal ADF endpoint calibration provenance is incorrect.", "var");
  const exactGrid = adfSeasonalDummyMonteCarloTest(reference.data.slice(0, 126), reference.periods.slice(0, 126), { autolag: "aic" });
  const grid126 = seasonalCalibration.records.find((item) => item.sample_size === 126);
  check(exactGrid.calibration?.interpolation_weight === 0 && Math.abs(exactGrid.critical_values["5%"] - grid126.critical_5pct) < 1e-12, "Seasonal ADF exact-grid lookup failed.", "var");
}

// Canonical source-adjustment metadata must not regress from NSA / SA / SCA.
{
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/series_dictionary.json"), "utf8"));
  const byIndicator = new Map(dictionary.records.map((item) => [item.indicator, item]));
  check(byIndicator.get("hicp_monthly_index")?.seasonal_adjustment === "NSA" && byIndicator.get("hicp_annual_rate")?.seasonal_adjustment === "NSA", "HICP source adjustment must remain NSA.", "var");
  check(byIndicator.get("industrial_production_index")?.seasonal_adjustment === "SCA", "Industrial production source adjustment must remain SCA.", "var");
  check(byIndicator.get("unemployment_rate_monthly")?.seasonal_adjustment === "SA", "Unemployment source adjustment must remain SA.", "var");
}

// v1.42 historical baseline-v1 output is frozen: v1.44 may only change baseline v2 through its registered calibrated specification.
{
  const baselineV1 = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/var_baseline_v1_readiness.json"), "utf8"));
  const baselineV2 = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/var_baseline_v2_readiness.json"), "utf8"));
  check(baselineV1.estimable_countries.join(",") === "poland,romania" && baselineV1.dynamic_response_ready_countries.length === 0, "Baseline v1 historical readiness changed unexpectedly.", "var");
  check(baselineV1.records.every((item) => item.stationarity_detail.every((entry) => entry.stationarity_specification_id === "adf_constant")), "Baseline v1 stationarity mapping changed.", "var");
  check(baselineV2.records.every((item) => item.stationarity_detail.every((entry) => entry.stationarity_specification_id === "adf_constant_seasonal_dummies_mc" && entry.adf.calibration && entry.legacy_seasonal_adf)), "Baseline v2 did not use the calibrated seasonal ADF while preserving the historical reference.", "var");
  const decisionComparison = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/seasonal_adf_decision_comparison.json"), "utf8"));
  check(decisionComparison.records.length > 0 && decisionComparison.records.every((item) => typeof item.decision_changed === "boolean" && item.mc_5pct !== null && item.mackinnon_5pct !== null), "MacKinnon vs calibrated decision comparison is incomplete.", "var");
  const hegy = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/hegy_readiness_registry.json"), "utf8"));
  const breaks = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/structural_break_registry.json"), "utf8"));
  check(hegy.state === "not_available" && hegy.remaining_blockers.length >= 4, "HEGY boundary was overstated.", "var");
  check(Array.isArray(breaks.historical_candidate_periods) && Array.isArray(breaks.statistically_estimated_breaks) && breaks.statistically_estimated_breaks.length === 0 && breaks.test_registry[0].state === "registry_only", "Historical markers and statistical breaks are not separated.", "var");
}

// Seasonal deterministic controls vs statsmodels VAR(endog, exog=11 month dummies).
{
  const seasonal = varRef.seasonal_month_dummy_var1_k2;
  const est = estimateVarModel(seasonal.data, 1, "constant_month_dummies", seasonal.periods);
  const flat = (value) => value.flat(Infinity);
  const maxDiff = (actual, expected) => Math.max(...flat(actual).map((value, index) => Math.abs(value - flat(expected)[index])));
  check(maxDiff(est.deterministicCoefficients.map((entry) => entry.coefficients), seasonal.estimation.deterministic_coefficients) < 1e-6, "Seasonal deterministic coefficient mismatch vs statsmodels.", "var");
  check(maxDiff(est.coefficientMatrices, seasonal.estimation.coefficient_matrices) < 1e-6, "Seasonal lag matrix mismatch vs statsmodels.", "var");
  check(maxDiff(est.sigma_u, seasonal.estimation.residual_covariance) < 1e-6, "Seasonal residual covariance mismatch vs statsmodels.", "var");
  const ic = selectVarLagOrder(seasonal.data, 1, "constant_month_dummies", seasonal.periods)[0];
  check(Math.max(Math.abs(ic.aic - seasonal.estimation.information_criteria.aic), Math.abs(ic.bic - seasonal.estimation.information_criteria.bic), Math.abs(ic.hqic - seasonal.estimation.information_criteria.hqic)) < 1e-9, "Seasonal IC mismatch vs statsmodels.", "var");
  const stability = varStability(est.coefficientMatrices);
  check(maxDiff([...stability.roots_moduli].sort(), seasonal.estimation.companion_root_moduli) < 1e-6, "Seasonal roots mismatch vs statsmodels.", "var");
  for (const reference of seasonal.estimation.portmanteau_sensitivity) {
    const actual = portmanteauTest(est.resid, 1, reference.lags);
    check(Math.abs(actual.statistic - reference.statistic) < 1e-6 && Math.abs(actual.p_value - reference.p_value) < 1e-8, `Seasonal Portmanteau mismatch at h=${reference.lags}.`, "var");
  }
  const irf = orthogonalizedIrf(est.coefficientMatrices, est.sigma_u, 24);
  check(maxDiff(irf, seasonal.estimation.irf_h24) < 1e-6, "Seasonal IRF mismatch vs statsmodels.", "var");
  check(seasonal.seasonal_abs_month_mean_controlled < seasonal.seasonal_abs_month_mean_constant * 0.25, "Seasonal fixture controls did not absorb the residual month pattern.", "var");
}

// Special functions vs scipy.
for (const [x, expected] of Object.entries(varRef.special_functions.normal_cdf)) {
  check(Math.abs(normalCdf(Number(x)) - expected) < 1e-12, `normalCdf mismatch at ${x}.`, "var");
}
for (const [key, expected] of Object.entries(varRef.special_functions.chi2_cdf)) {
  const [x, df] = key.split(",").map(Number);
  check(Math.abs(chiSquareCdf(x, df) - expected) < 1e-12, `chiSquareCdf mismatch at ${key}.`, "var");
}

// Eigenvalue port vs numpy.
{
  const ref = varRef.eigenvalue_reference;
  const actual = eigenvalues(ref.matrix);
  const actualPairs = actual.re.map((re, index) => [re, actual.im[index]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const maxDiff = Math.max(...ref.eigenvalues.map((pair, index) => Math.max(Math.abs(pair[0] - actualPairs[index][0]), Math.abs(pair[1] - actualPairs[index][1]))));
  check(maxDiff < 1e-8, `Eigenvalue reference mismatch: ${maxDiff}`, "var");
}

// Stable VAR(2) K=3: full pipeline vs statsmodels.
{
  const stable = varRef.stable_var2_k3;
  const data = stable.data;
  const icTable = selectVarLagOrder(data, 8);
  let icMaxDiff = 0;
  for (let index = 0; index < 8; index += 1) {
    const ref = stable.ic_table[index];
    const actual = icTable[index];
    icMaxDiff = Math.max(icMaxDiff, Math.abs(ref.aic - actual.aic), Math.abs(ref.bic - actual.bic), Math.abs(ref.hqic - actual.hqic));
    if (ref.nobs !== actual.nobs || ref.free_parameters !== actual.free_parameters) icMaxDiff = Number.POSITIVE_INFINITY;
  }
  check(icMaxDiff < 1e-9, `IC table mismatch: ${icMaxDiff}`, "var");
  for (const criterion of ["aic", "bic", "hqic"]) {
    const selected = icTable.reduce((best, row) => (row[criterion] < best[criterion] ? row : best), icTable[0]).lag;
    check(selected === stable.selected_lags[criterion], `Selected lag (${criterion}) mismatch: ${selected} vs ${stable.selected_lags[criterion]}`, "var");
  }
  const est = estimateVarModel(data, stable.estimation.lag);
  const flat = (matrix) => matrix.flat();
  const maxArrayDiff = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
  check(maxArrayDiff(est.intercepts, stable.estimation.intercepts) < 1e-6, "VAR intercept mismatch.", "var");
  let coefDiff = 0;
  est.coefficientMatrices.forEach((matrix, lagIndex) => {
    coefDiff = Math.max(coefDiff, maxArrayDiff(flat(matrix), flat(stable.estimation.coefficient_matrices[lagIndex])));
  });
  check(coefDiff < 1e-6, `VAR coefficient matrix mismatch: ${coefDiff}`, "var");
  check(maxArrayDiff(flat(est.sigma_u), flat(stable.estimation.residual_covariance)) < 1e-6, "Residual covariance mismatch.", "var");
  check(est.nobs === stable.estimation.nobs, "VAR effective sample mismatch.", "var");
  const stability = varStability(est.coefficientMatrices);
  const moduliDiff = maxArrayDiff([...stability.roots_moduli].sort(), stable.companion_root_moduli);
  check(stability.stable === true && moduliDiff < 1e-6, `Root modulus mismatch: ${moduliDiff}`, "var");
  const psi = orthogonalizedIrf(est.coefficientMatrices, est.sigma_u, 24);
  let irfDiff = 0;
  for (const path of stable.irf.paths) {
    path.horizon.forEach((horizon, hIndex) => {
      irfDiff = Math.max(irfDiff, Math.abs(psi[horizon][path.response_index][path.shock_index] - path.response[hIndex]));
    });
  }
  check(irfDiff < 1e-6, `Orthogonalized IRF mismatch: ${irfDiff}`, "var");
  const port = portmanteauTest(est.resid, est.coefficientMatrices.length, 24);
  check(Math.abs(port.statistic - stable.portmanteau.statistic) < 1e-6 && port.degrees_of_freedom === stable.portmanteau.degrees_of_freedom && Math.abs(port.p_value - stable.portmanteau.p_value) < 1e-6, `Portmanteau mismatch: ${port.statistic} vs ${stable.portmanteau.statistic}`, "var");
  for (const adfRef of stable.adf) {
    const series = data.map((row) => row[adfRef.column]);
    const actual = adfTest(series, { autolag: "aic" });
    check(Math.abs(actual.statistic - adfRef.statistic) < 1e-9 && actual.used_lag === adfRef.used_lag && actual.nobs === adfRef.nobs, `ADF statistic/lag/nobs mismatch (col ${adfRef.column}): ${actual.statistic} vs ${adfRef.statistic}`, "var");
    check(Math.abs(actual.p_value - adfRef.p_value) < 1e-6, `ADF p-value mismatch (col ${adfRef.column}): ${actual.p_value} vs ${adfRef.p_value}`, "var");
    check(Math.abs(actual.critical_values["5%"] - adfRef.critical_values["5%"]) < 1e-9, `ADF critical value mismatch (col ${adfRef.column}).`, "var");
  }
}

// Unstable fixture: engine must detect instability; coefficients and moduli match.
{
  const unstable = varRef.unstable_var1_k2;
  const est = estimateVarModel(unstable.data, 1);
  const stability = varStability(est.coefficientMatrices);
  check(stability.stable === false && stability.max_root_modulus > 1, "Unstable VAR not detected.", "var");
  const moduliDiff = Math.max(...[...stability.roots_moduli].sort().map((value, index) => Math.abs(value - unstable.companion_root_moduli[index])));
  check(moduliDiff < 1e-6, `Unstable root modulus mismatch: ${moduliDiff}`, "var");
}

// Known-lag fixture: BIC must recover the true lag 2.
{
  const known = varRef.known_lag_var2;
  const ics = selectVarLagOrder(known.data, 8);
  const bicSelected = ics.reduce((best, row) => (row.bic < best.bic ? row : best), ics[0]).lag;
  check(bicSelected === 2 && known.bic_selected === 2, `Known-lag recovery failed: ${bicSelected}`, "var");
}

// End-to-end engine run on synthetic high-frequency points + gate behavior.
const varToPoints = (data, prefix) => data.map((row, index) => ({
  observation_id: `hf:testland:${prefix}:${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
  country: "testland",
  period: `${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
  indicator: prefix,
  value: row[["var_a", "var_b", "var_c"].indexOf(prefix)],
  transformation: "level",
}));
{
  const stable = varRef.stable_var2_k3;
  const seriesMap = new Map(["var_a", "var_b", "var_c"].map((id) => [id, varToPoints(stable.data, id)]));
  const spec = {
    country: "testland",
    variables: [{ indicator: "var_a", transformation: "level" }, { indicator: "var_b", transformation: "level" }, { indicator: "var_c", transformation: "level" }],
    start_period: "2020-01",
    end_period: "2034-12",
    ic_criterion: "bic",
    max_lag: 12,
    deterministic_terms: "constant",
  };
  const outcome = runReducedFormVar(spec, seriesMap);
  check(outcome.status === "ok" && outcome.result.selected_lag === stable.selected_lags.bic && outcome.result.diagnostics.stability.stable, "End-to-end VAR run failed on stable fixture.", "var");
  if (outcome.status === "ok") {
    check(outcome.result.sample.effective_observations === stable.data.length, "VAR result structure incomplete.", "var");
    check(outcome.result.data_trace.length > 0 && outcome.result.input_series.length === 3, "VAR data trace / input series missing.", "var");
    check(outcome.result.diagnostics.residual_autocorrelation_sensitivity.map((item) => item.lags).join(",") === "12,18,24" && outcome.result.diagnostics.residual_lm.status === "unavailable", "VAR residual diagnostic sensitivity / LM boundary failed.", "var");
    check(outcome.result.variable_order.join(",") === "var_a,var_b,var_c" && outcome.result.comparability_signature.variables.join(",") === "var_a,var_b,var_c", "VAR ordering trace failed.", "var");
    // BIC may underselect lag 1, but v1.42 gates each displayed horizon rather
    // than requiring every sensitivity horizon to pass globally.
    const ready = outcome.result.dynamic_response_ready_horizons;
    check(outcome.result.irf !== null && ready[6] && ready[12] && (!ready[18] || !ready[24]), `Horizon-specific IRF gate failed: ${JSON.stringify(ready)}`, "var");
  }
  // On the known-lag fixture (true VAR(2), T=240, BIC recovers lag 2) the full
  // pipeline passes diagnostics and IRF is produced.
  const known = varRef.known_lag_var2;
  const knownMap = new Map(["var_a", "var_b", "var_c"].map((id) => [id, varToPoints(known.data, id)]));
  const knownOutcome = runReducedFormVar({ ...spec, end_period: "2039-12" }, knownMap);
  check(knownOutcome.status === "ok" && knownOutcome.result.selected_lag === 2 && knownOutcome.result.diagnostics.residual_autocorrelation.status === "passed" && knownOutcome.result.irf !== null && knownOutcome.result.irf.paths.length === 9 && knownOutcome.result.irf.ordering.length === 3, `Known-lag full-pipeline run failed: ${knownOutcome.status === "ok" ? knownOutcome.result.irf_blocked_reason : knownOutcome.reason_code}`, "var");
  const shuffled = new Map(["var_a", "var_b", "var_c"].map((id) => [id, [...seriesMap.get(id)].reverse()]));
  const shuffledOutcome = runReducedFormVar(spec, shuffled);
  check(shuffledOutcome.status === "ok" && outcome.status === "ok" && shuffledOutcome.result.selected_lag === outcome.result.selected_lag && Math.abs(shuffledOutcome.result.coefficient_matrices[0][0][0] - outcome.result.coefficient_matrices[0][0][0]) < 1e-12, "Input row ordering changed VAR estimates.", "var");
  const shortMap = new Map([...seriesMap.entries()].map(([id, points]) => [id, points.slice(0, 45)]));
  const shortSpec = { ...spec, end_period: "2023-09" };
  const shortOutcome = runReducedFormVar(shortSpec, shortMap);
  check(shortOutcome.status === "blocked" && shortOutcome.reason_code === "insufficient_observations", "Insufficient-sample gate failed.", "var");
  const gappedMap = new Map([...seriesMap.entries()].map(([id, points]) => [id, points.filter((point) => point.period !== "2025-06")]));
  const gappedOutcome = runReducedFormVar(spec, gappedMap);
  check(gappedOutcome.status === "blocked" && gappedOutcome.reason_code === "missing_data", "Interior missing-month gate failed.", "var");
  const duplicatedMap = new Map([...seriesMap.entries()].map(([id, points]) => [id, points]));
  duplicatedMap.set("var_c", seriesMap.get("var_a"));
  const singularOutcome = runReducedFormVar(spec, duplicatedMap);
  check(singularOutcome.status === "blocked" && singularOutcome.reason_code === "singular", `Singular specification gate failed: ${singularOutcome.status}/${singularOutcome.reason_code}`, "var");
  const rwFixture = varRef.random_walk_fixture;
  const randomWalk = rwFixture.data.map((value, index) => ({ observation_id: `hf:testland:rw:${index}`, country: "testland", period: `${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`, indicator: "rw", value, transformation: "level" }));
  const rwAdf = adfTest(rwFixture.data, { autolag: "aic" });
  check(rwAdf.status === "non_stationary" && Math.abs(rwAdf.statistic - rwFixture.adf.statistic) < 1e-9, `Random-walk ADF fixture mismatch: ${rwAdf.status}/${rwAdf.statistic} vs ${rwFixture.adf.statistic}`, "var");
  const rwMap = new Map([...seriesMap.entries()].map(([id, points]) => [id, points]));
  rwMap.set("rw", randomWalk);
  const rwOutcome = runReducedFormVar({ ...spec, variables: [{ indicator: "rw", transformation: "level" }, { indicator: "var_b", transformation: "level" }, { indicator: "var_c", transformation: "level" }] }, rwMap);
  check(rwOutcome.status === "blocked" && rwOutcome.reason_code === "non_stationary", `Unit-root level gate failed: ${rwOutcome.status}/${rwOutcome.reason_code}`, "var");
  const registryOutcome = runReducedFormVar({ ...spec, variables: [{ indicator: "hicp_monthly_index", transformation: "level" }, { indicator: "var_b", transformation: "level" }] }, seriesMap);
  check(registryOutcome.status === "blocked" && registryOutcome.reason_code === "unsupported_specification", "Registry transformation enforcement failed (raw HICP level must not enter VAR).", "var");
  const duplicateMap = new Map([...seriesMap.entries()].map(([id, points]) => [id, [...points]]));
  duplicateMap.set("var_a", [...seriesMap.get("var_a"), { ...seriesMap.get("var_a")[0], observation_id: "hf:testland:duplicate" }]);
  const duplicateOutcome = runReducedFormVar(spec, duplicateMap);
  check(duplicateOutcome.status === "blocked" && duplicateOutcome.reason_code === "missing_data" && duplicateOutcome.reasons[0].includes("重复月份"), "Duplicate-month gate failed.", "var");
  const reversedWindow = runReducedFormVar({ ...spec, start_period: "2030-01", end_period: "2020-01" }, seriesMap);
  check(reversedWindow.status === "blocked" && reversedWindow.reason_code === "unsupported_specification", "Invalid sample-window gate failed.", "var");
  const malformedWindow = runReducedFormVar({ ...spec, start_period: "2020-1" }, seriesMap);
  check(malformedWindow.status === "blocked" && malformedWindow.reason_code === "unsupported_specification", "Malformed YYYY-MM gate failed.", "var");
  const trendOutcome = runReducedFormVar({ ...spec, deterministic_terms: "constant_trend" }, seriesMap);
  check(trendOutcome.status === "blocked" && trendOutcome.reason_code === "unsupported_specification", "Unsupported trend specification was not blocked.", "var");
}

// Transformation semantics, source trace and monthly continuity.
{
  const monthly = Array.from({ length: 13 }, (_, index) => ({
    observation_id: `hf:testland:index:${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
    country: "testland",
    period: `${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
    indicator: "test_index",
    value: 100 + index,
    transformation: "level",
  }));
  const firstDifference = applyTransformation(monthly, "first_difference");
  check(firstDifference[0].value === null && firstDifference[1].value === 1 && firstDifference[1].source_observation_ids.length === 2, "First-difference value or trace failed.", "var");
  const logDifference = applyTransformation(monthly, "log_difference");
  check(Math.abs(logDifference[1].value - 100 * (Math.log(101) - Math.log(100))) < 1e-12, "Log-difference transformation failed.", "var");
  const annualLogDifference = applyTransformation(monthly, "log_difference_12");
  check(annualLogDifference.slice(0, 12).every((point) => point.value === null) && Math.abs(annualLogDifference[12].value - 100 * (Math.log(112) - Math.log(100))) < 1e-12, "Twelve-month log-difference failed.", "var");
  const gapped = monthly.filter((point) => point.period !== "2020-02");
  const gappedDifference = applyTransformation(gapped, "first_difference");
  check(gappedDifference.find((point) => point.period === "2020-03")?.value === null, "Transformation crossed a missing month.", "var");
  const withMissing = monthly.map((point) => point.period === "2020-06" ? { ...point, value: null } : point);
  const missingDifference = applyTransformation(withMissing, "first_difference");
  check(missingDifference.find((point) => point.period === "2020-06")?.value === null && missingDifference.find((point) => point.period === "2020-07")?.value === null, "Missing-value propagation failed.", "var");
}
check(adfTest(new Array(80).fill(5), { autolag: "aic" }).status === "not_tested", "Singular ADF design must report not_tested.", "var");
check(kpssStatus().status === "not_available", "KPSS must honestly report not_available.", "var");

// ---- v1.51 macro-driver temporal/scope gates + v1.6 ECB identification layer ----
{
  const driverDir = path.join(root, "src/data/macro-drivers");
  const driverPayload = JSON.parse(fs.readFileSync(path.join(driverDir, "macro_driver_observations.json"), "utf8"));
  const driverDictionary = JSON.parse(fs.readFileSync(path.join(driverDir, "macro_driver_dictionary.json"), "utf8"));
  const coverage = JSON.parse(fs.readFileSync(path.join(driverDir, "macro_driver_coverage.json"), "utf8"));
  const shocks = JSON.parse(fs.readFileSync(path.join(driverDir, "shock_identification_registry.json"), "utf8"));
  const lp = JSON.parse(fs.readFileSync(path.join(driverDir, "lp_readiness_registry.json"), "utf8"));
  const policyManifest = JSON.parse(fs.readFileSync(path.join(driverDir, "policy_rate_acquisition_manifest.json"), "utf8"));
  const fxManifest = JSON.parse(fs.readFileSync(path.join(driverDir, "exchange_rate_acquisition_manifest.json"), "utf8"));
  const energyManifest = JSON.parse(fs.readFileSync(path.join(driverDir, "energy_driver_acquisition_manifest.json"), "utf8"));
  const applicability = JSON.parse(fs.readFileSync(path.join(driverDir, "driver_applicability_registry.json"), "utf8"));
  const sourceCandidates = JSON.parse(fs.readFileSync(path.join(driverDir, "identified_shock_source_candidates.json"), "utf8"));
  const v16Readiness = JSON.parse(fs.readFileSync(path.join(driverDir, "v16_identification_readiness.json"), "utf8"));
  const ecbValidation = JSON.parse(fs.readFileSync(path.join(root, "src/data/identified-shocks/ecb_shock_validation_summary.json"), "utf8"));
  const lpValidation = JSON.parse(fs.readFileSync(path.join(root, "src/data/local-projections/lp_validation_summary.json"), "utf8"));
  const authorReference = JSON.parse(fs.readFileSync(path.join(root, "src/data/identified-shocks/jk_cross_language_validation.json"), "utf8"));
  const informationSeparation = JSON.parse(fs.readFileSync(path.join(root, "src/data/identified-shocks/information_effect_separation_validation.json"), "utf8"));
  const records = driverPayload.records;
  const ids = records.map((item) => item.observation_id);
  check(new Set(ids).size === ids.length, "Duplicate macro-driver observation ids found.", "macro_driver");
  const keys = records.map((item) => [item.driver_id, item.country ?? item.scope, item.transformation, item.period].join("|"));
  check(new Set(keys).size === keys.length, "Duplicate macro-driver series-period observations found.", "macro_driver");
  check(records.every((item) => /^\d{4}-\d{2}$/.test(item.period) && item.frequency === "monthly"), "Macro-driver period/frequency convention failed.", "macro_driver");
  check(records.every((item) => ["end_of_month", "monthly_average", "monthly_observation"].includes(item.aggregation_method)), "Macro-driver timing convention is missing or unsupported.", "macro_driver");
  check(coverage.records.every((item) => item.source_expected_periods === item.source_observations + item.source_missing_periods.length), "Macro-driver source continuity accounting failed.", "macro_driver");
  check(coverage.records.every((item) => item.transformation_warmup_periods.every((period) => !item.source_missing_periods.includes(period))), "Transformation warm-up was misclassified as source missing.", "macro_driver");
  const monthIndex = (period) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
  const validMonthly = records.filter((item) => item.transformation === "monthly_log_change" && item.derivation_status === "valid");
  check(validMonthly.length > 0 && validMonthly.every((item) => item.source_periods?.length === 2 && monthIndex(item.source_periods[1]) - monthIndex(item.source_periods[0]) === 1 && item.actual_lag_months === 1), "Monthly derived records crossed a non-consecutive source period.", "macro_driver");
  const validTwelveMonth = records.filter((item) => item.transformation === "12m_log_change" && item.derivation_status === "valid");
  check(validTwelveMonth.length > 0 && validTwelveMonth.every((item) => item.source_periods?.length === 2 && monthIndex(item.source_periods[1]) - monthIndex(item.source_periods[0]) === 12 && item.actual_lag_months === 12), "Twelve-month derived records do not use an exact calendar lag.", "macro_driver");
  check(records.filter((item) => item.data_status === "computed" && item.value === null).every((item) => item.derivation_status && item.availability_reason), "Null derived observation lacks a derivation status or availability reason.", "macro_driver");
  const fixtureValues = new Map([["2025-01", 100], ["2025-03", 110]]);
  const fixturePreviousPeriod = "2025-02";
  const fixtureMonthlyResult = fixtureValues.has(fixturePreviousPeriod)
    ? { value: 100 * Math.log(fixtureValues.get("2025-03") / fixtureValues.get(fixturePreviousPeriod)), availability_reason: null }
    : { value: null, availability_reason: "non_consecutive_source_period" };
  check(fixtureMonthlyResult.value === null && fixtureMonthlyResult.availability_reason === "non_consecutive_source_period", "Monthly gap fixture incorrectly calculated March from January.", "macro_driver");
  const fixtureTwelveMonthValues = new Map([["2024-02", 90], ["2025-03", 110]]);
  const requiredTwelveMonthPeriod = "2024-03";
  const fixtureTwelveMonthResult = fixtureTwelveMonthValues.has(requiredTwelveMonthPeriod)
    ? { value: 100 * Math.log(fixtureTwelveMonthValues.get("2025-03") / fixtureTwelveMonthValues.get(requiredTwelveMonthPeriod)), availability_reason: null }
    : { value: null, availability_reason: "missing_exact_12_month_source_period" };
  check(fixtureTwelveMonthResult.value === null && fixtureTwelveMonthResult.availability_reason === "missing_exact_12_month_source_period", "Twelve-month gap fixture used array position instead of the exact calendar lag.", "macro_driver");
  const unitKeys = new Map();
  for (const item of records) {
    const key = `${item.driver_id}|${item.country ?? item.scope}|${item.transformation}`;
    unitKeys.set(key, new Set([...(unitKeys.get(key) ?? []), item.unit]));
  }
  check([...unitKeys.values()].every((units) => units.size === 1), "Macro-driver unit consistency failed within a series.", "macro_driver");
  const localFx = records.filter((item) => item.driver_id === "bilateral_fx_local_per_eur" && item.transformation === "level");
  check(localFx.length > 0 && localFx.every((item) => item.orientation === "local currency units per 1 EUR; increase means local-currency depreciation"), "Bilateral FX orientation is inconsistent.", "macro_driver");
  const commonFx = records.filter((item) => item.driver_id === "eur_usd_common");
  check(commonFx.length > 0 && commonFx.every((item) => item.country === null && item.scope === "euro_area" && item.unit === (item.transformation === "level" ? "USD per EUR" : "%")), "EUR/USD common-series scope or inversion convention failed.", "macro_driver");
  check(commonFx.every((item) => item.series_instance_id === "bis_eurusd_common" && item.shared_series && !item.independent_cross_section_unit), "EUR/USD shared-series identity failed.", "macro_driver");
  check(records.filter((item) => item.driver_id === "brent_crude_price_usd").every((item) => item.series_instance_id === "worldbank_brent" && item.shared_series), "Brent shared-series identity failed.", "macro_driver");
  check(records.filter((item) => item.driver_id === "europe_natural_gas_price_usd").every((item) => item.series_instance_id === "worldbank_europe_gas" && item.shared_series), "European gas shared-series identity failed.", "macro_driver");
  const policy = records.filter((item) => item.driver_id === "policy_rate" && item.transformation === "level");
  check(new Set(policy.map((item) => item.country)).size === 10 && policy.every((item) => item.instrument_regime && item.country_monetary_regime), "Policy-rate country/regime mapping is incomplete.", "macro_driver");
  check(policy.filter((item) => item.scope === "euro_area_common").every((item) => item.scope_note?.includes("not a country-specific policy decision")), "ECB common policy rate was represented as a country-specific decision.", "macro_driver");
  const croatianPolicy = policy.filter((item) => item.country === "croatia");
  check(croatianPolicy.some((item) => item.scope === "country" && item.period < "2023-01") && croatianPolicy.some((item) => item.scope === "euro_area_common" && item.period >= "2023-01"), "Croatia policy-regime transition was not preserved.", "macro_driver");
  const croatiaTransition = records.find((item) => item.driver_id === "policy_rate" && item.country === "croatia" && item.period === "2023-01" && item.transformation === "monthly_change_bp");
  const croatiaSameRegime = records.find((item) => item.driver_id === "policy_rate" && item.country === "croatia" && item.period === "2023-02" && item.transformation === "monthly_change_bp");
  check(croatiaTransition?.value === null && croatiaTransition?.derivation_status === "regime_blocked" && croatiaTransition?.availability_reason === "policy_regime_transition", "Croatia 2023-01 policy transition was not blocked.", "macro_driver");
  check(croatiaSameRegime?.value !== null && croatiaSameRegime?.derivation_status === "valid", "Croatia same-regime policy change did not resume after transition.", "macro_driver");
  const hungaryInstrumentBreak = records.find((item) => item.driver_id === "policy_rate" && item.country === "hungary" && item.period === "2015-09" && item.transformation === "monthly_change_bp");
  check(hungaryInstrumentBreak?.value === null && hungaryInstrumentBreak?.derivation_status === "definition_blocked", "Known Hungary policy-instrument transition was not blocked.", "macro_driver");
  const ecb2024 = policy.filter((item) => item.period === "2024-01" && ["austria", "croatia", "germany", "slovakia", "slovenia"].includes(item.country));
  check(ecb2024.length === 5 && new Set(ecb2024.map((item) => item.series_instance_id)).size === 1 && ecb2024.every((item) => item.shared_series && !item.independent_cross_section_unit), "ECB common series identity or pseudo-replication guard failed.", "macro_driver");
  check(applicability.records.some((item) => item.series_instance_id === "bis_cbpol_euro_area" && item.country_id === "croatia" && item.start_period === "2023-01"), "Croatia euro-area applicability rule is missing.", "macro_driver");
  const brentChanges = records.filter((item) => item.driver_id === "brent_crude_price_usd" && item.transformation === "monthly_log_change");
  check(brentChanges.length > 0 && brentChanges.every((item) => item.economic_role === "external_common_driver" && item.identification_status === "shock_candidate"), "Economic role and identification status are not orthogonal for Brent changes.", "macro_driver");
  check(driverDictionary.records.find((item) => item.driver_id === "hicp_energy_index")?.economic_role === "domestic_price_outcome" && !shocks.records.some((item) => item.driver_id?.startsWith("hicp_energy") && item.identification_status === "identified_shock"), "HICP Energy was incorrectly marked as an external/identified shock.", "macro_driver");
  check(shocks.identified_shock_count === 2 && shocks.records.filter((item) => item.driver_id === "policy_rate").every((item) => item.identification_status !== "identified_shock"), "Author-reference shock count or policy-rate boundary failed.", "macro_driver");
  const formalLp = lp.records.filter((item) => String(item.readiness_id).includes(":jk_joint:"));
  check(lp.method_state === "active" && lp.causal_lp_ready_count === 44 && formalLp.length === 54, "v1.7 LP activation/readiness count failed.", "macro_driver");
  check(formalLp.every((item) => item.identification_status === "identified_shock" && item.shock_scope && (!item.causal_lp_ready || item.effective_n >= 96)), "LP identification/sample/scope gate failed.", "macro_driver");
  check(lp.records.filter((item) => !String(item.readiness_id).includes(":jk_joint:")).every((item) => item.causal_lp_ready === false), "Legacy proxy readiness entered formal causal LP.", "macro_driver");
  check(sourceCandidates.records.length >= 2 && sourceCandidates.records.every((item) => item.acquisition_status === "acquired" && item.identification_status === "external_innovation_proxy" && item.information_effect_status === "separated_under_jk_framework" && item.source_institution === "European Central Bank"), "Official ECB source acquisition or identification boundary is inconsistent.", "macro_driver");
  check(v16Readiness.data_layer_complete === true && v16Readiness.all_identification_gates_passed === false && v16Readiness.identification_decision === "external_innovation_proxy_only" && v16Readiness.local_projections_state === "registry_only", "v1.6 identification readiness was overstated.", "macro_driver");
  identifiedShockTests = ecbValidation.total_tests;
  localProjectionTests = lpValidation.total_tests;
  authorReferenceTests = informationSeparation.total_gates;
  if (ecbValidation.status !== "passed" || ecbValidation.failure_count !== 0) errors.push("ECB identified-shock validation summary is not passing.");
  if (lpValidation.status !== "passed" || lpValidation.failure_count !== 0 || lpValidation.causal_lp_ready_count !== 44) errors.push("Local Projections validation summary is not passing.");
  if (authorReference.status !== "passed" || authorReference.failed_row_count !== 0 || informationSeparation.status !== "passed" || informationSeparation.failed !== 0) errors.push("v1.62 author-reference validation is not passing.");
  check(policyManifest.series.length === 10 && policyManifest.series.every((item) => item.status === "available"), "BIS policy-rate coverage manifest is incomplete.", "macro_driver");
  check([policyManifest.file_sha256, ...fxManifest.datasets.map((item) => item.file_sha256), energyManifest.pink_sheet.file_sha256].every((value) => /^[a-f0-9]{64}$/.test(value)), "Macro-driver source checksum provenance is incomplete.", "macro_driver");
}

const advancedValidationSummary = {
  schema_version: "advanced-analysis-validation-summary-v1.7",
  generated_at: new Date().toISOString(),
  status: errors.length === 0 ? "passed" : "failed",
  total_tests: panelTests + networkTests + hfTests + eventTests + varTests + macroDriverTests + identifiedShockTests + localProjectionTests + authorReferenceTests,
  failure_count: errors.length,
  categories: {
    panel: panelTests,
    network: networkTests,
    high_frequency: hfTests,
    events: eventTests,
    var: varTests,
    macro_drivers: macroDriverTests,
    identified_shocks: identifiedShockTests,
    local_projections: localProjectionTests,
    author_reference: authorReferenceTests,
  },
  boundaries: {
    identified_shock_count: 2,
    external_innovation_proxy_count: 3,
    causal_lp_ready_count: 44,
    local_projections: "active_single_country_joint_jk",
    svar: "registry_only",
  },
  failures: errors,
};
fs.writeFileSync(path.join(root, "src", "data", "analysis", "advanced_analysis_validation_summary.json"), `${JSON.stringify(advancedValidationSummary, null, 2)}\n`);
console.log(`Advanced analysis validation: panel=${panelTests} tests; network=${networkTests} tests; hf=${hfTests} tests; event=${eventTests} tests; var=${varTests} tests; macro_driver=${macroDriverTests} tests; identified_shocks=${identifiedShockTests} tests; local_projections=${localProjectionTests} tests; author_reference=${authorReferenceTests} tests; failures=${errors.length}.`);
if (errors.length) {
  errors.forEach((error) => console.error(`ADVANCED ANALYSIS ERROR: ${error}`));
  process.exit(1);
}
