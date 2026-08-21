import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
const { computeEventWindow, attachOverlappingEvents, eventWindowEligibility } = require("../../src/lib/eventWindowEngine.ts");
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
function check(condition, message, bucket = "panel") {
  if (bucket === "panel") panelTests += 1;
  else if (bucket === "network") networkTests += 1;
  else if (bucket === "hf") hfTests += 1;
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

// ---- Event window validation (§92) ----
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
check(windowResult.pre_period_mean === 111.5 && windowResult.post_period_mean === 124, `Pre/post means failed: ${windowResult.pre_period_mean}/${windowResult.post_period_mean}`, "event");
check(windowResult.absolute_change === 12.5 && windowResult.percentage_change !== null && Math.abs(windowResult.percentage_change - 12.5 / 111.5 * 100) < 0.01, "Absolute/percentage change failed.", "event");
check(windowResult.gate === "full", "Full-window gate failed on complete synthetic data.", "event");
const constantSeries = syntheticSeries.map((point) => ({ ...point, value: 50 }));
const zeroChange = computeEventWindow(syntheticEvent, constantSeries, { preMonths: 12, postMonths: 12 });
check(zeroChange.absolute_change === 0 && zeroChange.percentage_change === 0, "Zero-change fixture failed.", "event");
const gapped = syntheticSeries.filter((point) => point.period !== "2021-03" && point.period !== "2021-04");
const gappedResult = computeEventWindow(syntheticEvent, gapped, { preMonths: 12, postMonths: 12 });
check(gappedResult.missing_periods.length === 2 && gappedResult.missing_periods.includes("2021-03"), "Missing-period handling failed.", "event");
const shuffledSeries = [...syntheticSeries].reverse();
const shuffledWindow = computeEventWindow(syntheticEvent, shuffledSeries, { preMonths: 12, postMonths: 12 });
check(JSON.stringify({ ...shuffledWindow, data_trace: [], overlapping_events: [] }) === JSON.stringify({ ...windowResult, data_trace: [], overlapping_events: [] }), "Event window ordering invariance failed.", "event");
const shortEvent = { ...syntheticEvent, date: "2020-09-15" };
const shortResult = computeEventWindow(shortEvent, syntheticSeries, { preMonths: 12, postMonths: 12 });
check(shortResult.gate === "exploratory" && shortResult.exploratory === true, `Exploratory short-window gate failed: ${shortResult.gate}`, "event");
const tooShortEvent = { ...syntheticEvent, date: "2020-02-15" };
check(computeEventWindow(tooShortEvent, syntheticSeries, { preMonths: 12, postMonths: 12 }).gate === "insufficient_data", "Insufficient-data gate failed.", "event");
check(eventWindowEligibility({ ...syntheticEvent, data_status: "pending" }).eligible === false, "Unverified event must be ineligible.", "event");
check(eventWindowEligibility({ ...syntheticEvent, date: "2021" }).eligible === false, "Year-only event date must be ineligible.", "event");
const overlapBase = { country_slug: "testland", data_status: "verified", event_type: "macro", title: "t" };
const withOverlap = attachOverlappingEvents(windowResult, [
  { ...overlapBase, event_id: "ev-other", date: "2021-10-03" },
  { ...overlapBase, event_id: "ev-outside", date: "2024-01-01" },
  { ...overlapBase, event_id: "ev-unverified", date: "2021-11-01", data_status: "pending" },
]);
check(withOverlap.overlapping_events.length === 1 && withOverlap.overlapping_events[0].event_id === "ev-other" && withOverlap.overlapping_event_warning !== null, "Overlapping-event detection failed.", "event");

console.log(`Advanced analysis validation: panel=${panelTests} tests; network=${networkTests} tests; hf=${hfTests} tests; event=${eventTests} tests; failures=${errors.length}.`);
if (errors.length) {
  errors.forEach((error) => console.error(`ADVANCED ANALYSIS ERROR: ${error}`));
  process.exit(1);
}
