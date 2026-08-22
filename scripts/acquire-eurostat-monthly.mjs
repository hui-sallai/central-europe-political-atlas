// Acquires monthly high-frequency series from the Eurostat dissemination API
// (free, no key). v1.31: HICP migrated to the merged prc_hicp_minr dataset
// (ECOICOP ver.2, dimension coicop18, all-items code TOTAL). The legacy tables
// prc_hicp_midx / prc_hicp_manr are retired and must not be used as active sources.
// Missing months stay missing — no interpolation anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { missingMonths, monthDistance, monthSequence } from "./lib/months.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".tmp-eurostat");
fs.mkdirSync(cacheDir, { recursive: true });

const PLATFORM_START = "2015-01";
const GEOS = { DE: "germany", PL: "poland", HU: "hungary", RO: "romania", CZ: "czechia", SK: "slovakia", SI: "slovenia", RS: "serbia", AT: "austria", HR: "croatia" };

// Index-reference labels for Eurostat index unit codes. A series must never mix
// reference bases; the unit code is pinned in the query and recorded per record.
const INDEX_REFERENCE = { I15: "2015=100", I21: "2021=100", I25: "2025=100" };

const SERIES = [
  {
    indicator: "hicp_monthly_index",
    dataset: "prc_hicp_minr",
    params: { coicop18: "TOTAL", unit: "I15" },
    unit: "index",
    value_semantics: "index_level",
    seasonal_adjustment: "NSA",
    transformation: "level",
    classification_version: "ECOICOP-2",
    source_dataset: "Eurostat prc_hicp_minr",
    note: "All-items HICP monthly index, reference 2015=100 (still officially provided by prc_hicp_minr). All-items continuity across the ECOICOP-2 transition verified against the legacy tables (see hicp_migration_manifest.json).",
  },
  {
    indicator: "hicp_annual_rate",
    dataset: "prc_hicp_minr",
    params: { coicop18: "TOTAL", unit: "RCH_A" },
    unit: "%",
    value_semantics: "yoy_rate",
    seasonal_adjustment: "NSA",
    transformation: "yoy_rate",
    classification_version: "ECOICOP-2",
    source_dataset: "Eurostat prc_hicp_minr",
    note: "All-items HICP annual rate of change. Changes are reported in percentage points, never as relative percentage change.",
  },
  {
    indicator: "unemployment_rate_monthly",
    dataset: "une_rt_m",
    params: { s_adj: "SA", age: "TOTAL", sex: "T", unit: "PC_ACT" },
    unit: "%",
    value_semantics: "rate_percent",
    seasonal_adjustment: "SA",
    transformation: "level",
    classification_version: "age:TOTAL",
    source_dataset: "Eurostat une_rt_m",
    note: "Harmonised unemployment rate, age 15-74, total, % of active population, seasonally adjusted. Monthly estimates are harmonised but national source construction can differ. Changes are reported in percentage points.",
  },
  {
    indicator: "industrial_production_index",
    dataset: "sts_inpr_m",
    params: { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I21" },
    fallbackParams: { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I15" },
    unit: "index",
    value_semantics: "index_level",
    seasonal_adjustment: "SCA",
    transformation: "level",
    classification_version: "NACE-Rev2:B-D",
    source_dataset: "Eurostat sts_inpr_m",
    note: "Production in industry, total industry (B-D), seasonally and calendar adjusted. Index reference recorded per record (index_reference).",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDataset(series, params) {
  const query = new URLSearchParams({ format: "JSON", lang: "en", sinceTimePeriod: PLATFORM_START, ...params });
  for (const geo of Object.keys(GEOS)) query.append("geo", geo);
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${series.dataset}?${query.toString()}`;
  const cacheFile = path.join(cacheDir, `${series.dataset}-${Object.values(params).join("-")}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(JSON.stringify(payload.error).slice(0, 200));
      fs.writeFileSync(cacheFile, JSON.stringify(payload));
      return payload;
    } catch (error) {
      console.log(`  ${series.dataset} attempt ${attempt + 1} failed: ${String(error).slice(0, 140)}`);
      await sleep(3000 * (attempt + 1));
    }
  }
  throw new Error(`failed to fetch ${series.dataset}`);
}

// JSON-stat 2.0 flattening: last dimension is time.
function flatten(jsonstat) {
  const dimIds = jsonstat.id;
  const sizes = jsonstat.size;
  const timeDimId = dimIds[dimIds.length - 1];
  const timeCategories = jsonstat.dimension[timeDimId].category.index;
  const timeLabels = Object.keys(timeCategories).sort((a, b) => timeCategories[a] - timeCategories[b]);
  const otherDims = dimIds.slice(0, -1).map((id) => {
    const index = jsonstat.dimension[id].category.index;
    return { id, keys: Object.keys(index).sort((a, b) => index[a] - index[b]) };
  });
  const rows = [];
  const values = jsonstat.value ?? {};
  const strides = [];
  let stride = 1;
  for (let index = sizes.length - 1; index >= 0; index -= 1) { strides[index] = stride; stride *= sizes[index]; }
  const walk = (dimIndex, combo, offsetBase) => {
    if (dimIndex === otherDims.length) {
      for (let t = 0; t < timeLabels.length; t += 1) {
        const flatIndex = offsetBase + t * strides[sizes.length - 1];
        const value = values[flatIndex];
        rows.push({ combo: { ...combo }, period: timeLabels[t], value: value === undefined ? null : value });
      }
      return;
    }
    const dim = otherDims[dimIndex];
    dim.keys.forEach((key, keyIndex) => walk(dimIndex + 1, { ...combo, [dim.id]: key }, offsetBase + keyIndex * strides[dimIndex]));
  };
  walk(0, {}, 0);
  return rows;
}

const observations = [];
const acquisition = [];
const datasetLatest = new Map(); // indicator -> latest period present in the API response
for (const series of SERIES) {
  let payload;
  let usedParams = series.params;
  try {
    payload = await fetchDataset(series, series.params);
  } catch (error) {
    if (!series.fallbackParams) throw error;
    console.log(`${series.dataset}: primary params failed, trying fallback (${JSON.stringify(series.fallbackParams)})`);
    usedParams = series.fallbackParams;
    payload = await fetchDataset(series, series.fallbackParams);
  }
  const rows = flatten(payload);
  const timeDimId = payload.id[payload.id.length - 1];
  const responsePeriods = Object.keys(payload.dimension[timeDimId].category.index).sort();
  datasetLatest.set(series.indicator, responsePeriods.at(-1));
  let count = 0;
  const units = new Set();
  for (const row of rows) {
    const geo = row.combo.geo;
    const country = GEOS[geo];
    if (!country) continue;
    units.add(row.combo.unit);
    observations.push({
      observation_id: `hf:${country}:${series.indicator}:${row.period}`,
      country,
      frequency: "monthly",
      period: row.period,
      indicator: series.indicator,
      value: row.value,
      unit: row.combo.unit ?? series.unit,
      value_semantics: series.value_semantics,
      seasonal_adjustment: series.seasonal_adjustment,
      transformation: series.transformation,
      source: "Eurostat",
      source_url: `https://ec.europa.eu/eurostat/databrowser/view/${series.dataset}/default/table`,
      source_dataset: series.source_dataset,
      source_reliability: "A",
      definition_version: `${series.dataset}:${JSON.stringify(usedParams)}`,
      classification_version: series.classification_version,
      index_reference: INDEX_REFERENCE[row.combo.unit] ?? null,
      series_break_status: "none_recorded",
      revision_status: "latest_revised",
      vintage_status: "latest_revised",
      data_status: "official",
      updated_at: new Date().toISOString().slice(0, 10),
    });
    if (row.value !== null) count += 1;
  }
  if (units.size > 1) {
    for (const observation of observations.filter((item) => item.indicator === series.indicator)) observation.series_break_status = "unit_change_recorded";
  }
  acquisition.push({ indicator: series.indicator, dataset: series.dataset, params: usedParams, rows: rows.length, non_null: count, units: [...units], latest_period_in_response: responsePeriods.at(-1) });
  console.log(`${series.indicator}: ${count} non-null of ${rows.length} rows (units: ${[...units].join("/")}; latest: ${responsePeriods.at(-1)})`);
  await sleep(1500);
}

const generatedAt = new Date().toISOString().slice(0, 10);
observations.sort((a, b) => a.observation_id.localeCompare(b.observation_id));
const outDir = path.join(root, "src", "data", "high-frequency");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "high_frequency_observations.json"), JSON.stringify({
  schema_version: "high-frequency-v1.31",
  generated_at: generatedAt,
  record_count: observations.length,
  revision_policy: "latest_revised; first-published vintages are not stored in v1.31",
  records: observations,
}));

// Coverage per country × indicator. The expected month axis is the COMPLETE monthly
// sequence from the platform start to the latest period the API response carries —
// a month the API omits entirely still counts as missing (never silently dropped).
const coverage = [];
const bySeries = new Map();
for (const observation of observations) {
  const key = `${observation.country}:${observation.indicator}`;
  bySeries.set(key, [...(bySeries.get(key) ?? []), observation]);
}
for (const country of Object.values(GEOS)) {
  for (const series of SERIES) {
    const key = `${country}:${series.indicator}`;
    const rows = bySeries.get(key) ?? [];
    const valueByPeriod = new Map(rows.map((row) => [row.period, row.value]));
    const expectedLatest = datasetLatest.get(series.indicator) ?? null;
    const expectedSequence = expectedLatest ? monthSequence(PLATFORM_START, expectedLatest) : [];
    const missing = expectedLatest ? missingMonths(PLATFORM_START, expectedLatest, valueByPeriod) : [];
    const withValue = rows.filter((row) => row.value !== null);
    const latestAvailable = withValue.length ? withValue.map((row) => row.period).sort().at(-1) : null;
    const lagMonths = latestAvailable && expectedLatest ? monthDistance(latestAvailable, expectedLatest) : null;
    coverage.push({
      country,
      indicator: series.indicator,
      frequency: "monthly",
      start_period: withValue.length ? withValue.map((row) => row.period).sort()[0] : null,
      end_period: latestAvailable,
      expected_periods: expectedSequence.length,
      observations: withValue.length,
      missing_periods: missing.length,
      missing_period_list: missing,
      latest_available_period: latestAvailable,
      expected_latest_period: expectedLatest,
      publication_lag_status: lagMonths === null ? "no_data" : lagMonths <= 2 ? "normal_publication_lag" : "stale_series",
      definition_status: rows.length ? "defined" : "not_available_for_country",
      series_break_status: rows.some((row) => row.series_break_status !== "none_recorded") ? "unit_change_recorded" : "none_recorded",
      analysis_eligible: withValue.length >= 24,
    });
  }
}
coverage.sort((a, b) => `${a.country}:${a.indicator}`.localeCompare(`${b.country}:${b.indicator}`));
fs.writeFileSync(path.join(outDir, "high_frequency_coverage.json"), JSON.stringify({
  schema_version: "high-frequency-coverage-v1.31",
  generated_at: generatedAt,
  expected_axis: `complete monthly sequence ${PLATFORM_START}..latest API period per dataset; API-omitted months count as missing`,
  record_count: coverage.length,
  records: coverage,
}, null, 2));

fs.writeFileSync(path.join(outDir, "series_dictionary.json"), JSON.stringify({
  schema_version: "high-frequency-dictionary-v1.31",
  generated_at: generatedAt,
  records: SERIES.map((series) => ({
    indicator: series.indicator,
    label_zh: { hicp_monthly_index: "HICP 月度指数", hicp_annual_rate: "HICP 年通胀率", unemployment_rate_monthly: "月度失业率（季调）", industrial_production_index: "工业生产指数（季调日历调整）" }[series.indicator],
    frequency: "monthly",
    unit: series.unit,
    value_semantics: series.value_semantics,
    seasonal_adjustment: series.seasonal_adjustment,
    transformation: series.transformation,
    classification_version: series.classification_version,
    index_reference: INDEX_REFERENCE[series.params.unit] ?? null,
    source_dataset: series.source_dataset,
    note: series.note,
    definition_boundary: "Index levels, month-on-month rates and year-on-year rates are separate indicators and are never mixed into one field.",
  })),
}, null, 2));

console.log(`total observations: ${observations.length}; coverage rows: ${coverage.length}`);

// VAR readiness recalculation (v1.31, §37): readiness is computed on the corrected
// high-frequency data only. VAR / SVAR itself remains blocked.
const varReadinessIndicators = SERIES.map((series) => {
  const rows = coverage.filter((entry) => entry.indicator === series.indicator && entry.definition_status === "defined");
  const effective = rows.filter((entry) => entry.observations >= 60);
  const definitionConsistent = acquisition.find((entry) => entry.indicator === series.indicator)?.units.length === 1;
  const unresolvedBreaks = rows.some((entry) => entry.series_break_status !== "none_recorded");
  const missingGate = rows.every((entry) => entry.expected_periods === 0 || entry.missing_periods / entry.expected_periods <= 0.05);
  const readinessMet = effective.length === rows.length && rows.length === Object.keys(GEOS).length && definitionConsistent && !unresolvedBreaks && missingGate;
  return {
    indicator: series.indicator,
    countries_with_60plus_effective_observations: effective.length,
    countries_defined: rows.length,
    definition_consistent: definitionConsistent,
    unresolved_series_breaks: unresolvedBreaks,
    missing_data_gate_passed: missingGate,
    readiness_met: readinessMet,
  };
});
const analysisDir = path.join(root, "src", "data", "analysis");
fs.mkdirSync(analysisDir, { recursive: true });
fs.writeFileSync(path.join(analysisDir, "var_readiness.json"), JSON.stringify({
  schema_version: "var-readiness-v1.31",
  generated_at: generatedAt,
  skill_id: "var_svar",
  state: "blocked",
  gates: {
    min_effective_monthly_observations: 60,
    definition_consistency: "single unit per indicator across all countries",
    series_break: "no unresolved series break",
    missing_data: "missing_periods <= 5% of the expected monthly axis per series",
  },
  indicators: varReadinessIndicators,
  overall_readiness_met: varReadinessIndicators.every((entry) => entry.readiness_met),
  note: "Readiness recomputed on the corrected v1.31 high-frequency layer. VAR / SVAR remains blocked: activation additionally requires stationarity, lag-selection, stability and residual diagnostics plus a full readiness audit.",
}, null, 2));
console.log(`VAR readiness: overall=${varReadinessIndicators.every((entry) => entry.readiness_met)} (state stays blocked)`);

// Compact runtime rows for client workbenches (fetched at runtime). Field order:
// 0 observation_id, 1 country, 2 period, 3 indicator, 4 value, 5 transformation,
// 6 unit, 7 value_semantics, 8 seasonal_adjustment, 9 definition_version,
// 10 source_dataset, 11 data_status
const runtimeRows = observations.map((observation) => [
  observation.observation_id,
  observation.country,
  observation.period,
  observation.indicator,
  observation.value,
  observation.transformation,
  observation.unit,
  observation.value_semantics,
  observation.seasonal_adjustment,
  observation.definition_version,
  observation.source_dataset,
  observation.data_status,
]);
const publicDir = path.join(root, "public", "research-data");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "high_frequency_runtime.json"), JSON.stringify({
  schema_version: "high-frequency-runtime-v1.31",
  generated_at: generatedAt,
  record_count: runtimeRows.length,
  records: runtimeRows,
}));
for (const name of ["high_frequency_coverage.json", "series_dictionary.json"]) {
  fs.copyFileSync(path.join(outDir, name), path.join(publicDir, name));
}
console.log(`runtime rows: ${runtimeRows.length}`);
