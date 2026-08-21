// Acquires monthly high-frequency series from the Eurostat dissemination API
// (free, no key): HICP index + annual rate, harmonised unemployment (SA, 15-74),
// industrial production index (SCA). Ten platform countries, from 2015-01.
// Missing months stay missing — no interpolation anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".tmp-eurostat");
fs.mkdirSync(cacheDir, { recursive: true });

const GEOS = { DE: "germany", PL: "poland", HU: "hungary", RO: "romania", CZ: "czechia", SK: "slovakia", SI: "slovenia", RS: "serbia", AT: "austria", HR: "croatia" };

const SERIES = [
  {
    indicator: "hicp_monthly_index",
    dataset: "prc_hicp_midx",
    params: { coicop: "CP00", unit: "I15" },
    unit: "index",
    seasonal_adjustment: "NSA",
    transformation: "level",
    source_dataset: "Eurostat prc_hicp_midx",
    note: "All-items HICP monthly index.",
  },
  {
    indicator: "hicp_annual_rate",
    dataset: "prc_hicp_manr",
    params: { coicop: "CP00", unit: "RCH_A" },
    unit: "%",
    seasonal_adjustment: "NSA",
    transformation: "yoy_rate",
    source_dataset: "Eurostat prc_hicp_manr",
    note: "All-items HICP annual rate of change.",
  },
  {
    indicator: "unemployment_rate_monthly",
    dataset: "une_rt_m",
    params: { s_adj: "SA", age: "TOTAL", sex: "T", unit: "PC_ACT" },
    unit: "%",
    seasonal_adjustment: "SA",
    transformation: "level",
    source_dataset: "Eurostat une_rt_m",
    note: "Harmonised unemployment, age 15-74, total, % of active population, seasonally adjusted.",
  },
  {
    indicator: "industrial_production_index",
    dataset: "sts_inpr_m",
    params: { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I21" },
    fallbackParams: { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I15" },
    unit: "index",
    seasonal_adjustment: "SCA",
    transformation: "level",
    source_dataset: "Eurostat sts_inpr_m",
    note: "Production in industry, total industry (B-D), seasonally and calendar adjusted.",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchDataset(series, params) {
  const query = new URLSearchParams({ format: "JSON", lang: "en", sinceTimePeriod: "2015-01", ...params });
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
      seasonal_adjustment: series.seasonal_adjustment,
      transformation: series.transformation,
      source: "Eurostat",
      source_url: `https://ec.europa.eu/eurostat/databrowser/view/${series.dataset}/default/table`,
      source_dataset: series.source_dataset,
      source_reliability: "A",
      definition_version: `${series.dataset}:${JSON.stringify(usedParams)}`,
      classification_version: row.combo.coicop ?? row.combo.nace_r2 ?? row.combo.age ?? "n/a",
      index_reference: row.combo.unit ?? null,
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
  acquisition.push({ indicator: series.indicator, dataset: series.dataset, params: usedParams, rows: rows.length, non_null: count, units: [...units] });
  console.log(`${series.indicator}: ${count} non-null of ${rows.length} rows (units: ${[...units].join("/")})`);
  await sleep(1500);
}

const generatedAt = new Date().toISOString().slice(0, 10);
observations.sort((a, b) => a.observation_id.localeCompare(b.observation_id));
const outDir = path.join(root, "src", "data", "high-frequency");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "high_frequency_observations.json"), JSON.stringify({
  schema_version: "high-frequency-v1.3",
  generated_at: generatedAt,
  record_count: observations.length,
  revision_policy: "latest_revised; first-published vintages are not stored in v1.3",
  records: observations,
}));

// Coverage per country × indicator
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
    const withValue = rows.filter((row) => row.value !== null);
    const periods = rows.map((row) => row.period).sort();
    coverage.push({
      country,
      indicator: series.indicator,
      frequency: "monthly",
      start_period: withValue.length ? withValue.map((row) => row.period).sort()[0] : null,
      end_period: withValue.length ? withValue.map((row) => row.period).sort().at(-1) : null,
      expected_periods: periods.length,
      observations: withValue.length,
      missing_periods: periods.length - withValue.length,
      definition_status: rows.length ? "defined" : "not_available_for_country",
      series_break_status: rows.some((row) => row.series_break_status !== "none_recorded") ? "unit_change_recorded" : "none_recorded",
      analysis_eligible: withValue.length >= 24,
    });
  }
}
coverage.sort((a, b) => `${a.country}:${a.indicator}`.localeCompare(`${b.country}:${b.indicator}`));
fs.writeFileSync(path.join(outDir, "high_frequency_coverage.json"), JSON.stringify({
  schema_version: "high-frequency-coverage-v1.3",
  generated_at: generatedAt,
  record_count: coverage.length,
  records: coverage,
}, null, 2));

fs.writeFileSync(path.join(outDir, "series_dictionary.json"), JSON.stringify({
  schema_version: "high-frequency-dictionary-v1.3",
  generated_at: generatedAt,
  records: SERIES.map((series) => ({
    indicator: series.indicator,
    label_zh: { hicp_monthly_index: "HICP 月度指数", hicp_annual_rate: "HICP 年通胀率", unemployment_rate_monthly: "月度失业率（季调）", industrial_production_index: "工业生产指数（季调日历调整）" }[series.indicator],
    frequency: "monthly",
    seasonal_adjustment: series.seasonal_adjustment,
    transformation: series.transformation,
    source_dataset: series.source_dataset,
    note: series.note,
    definition_boundary: "Index levels, month-on-month rates and year-on-year rates are separate indicators and are never mixed into one field.",
  })),
}, null, 2));

console.log(`total observations: ${observations.length}; coverage rows: ${coverage.length}`);

// Compact runtime rows for the client event-window workbench (fetched at runtime).
const runtimeRows = observations.map((observation) => [
  observation.observation_id,
  observation.country,
  observation.period,
  observation.indicator,
  observation.value,
  observation.transformation,
]);
const publicDir = path.join(root, "public", "research-data");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "high_frequency_runtime.json"), JSON.stringify({
  schema_version: "high-frequency-runtime-v1.3",
  generated_at: generatedAt,
  record_count: runtimeRows.length,
  records: runtimeRows,
}));
for (const name of ["high_frequency_coverage.json", "series_dictionary.json"]) {
  fs.copyFileSync(path.join(outDir, name), path.join(publicDir, name));
}
console.log(`runtime rows: ${runtimeRows.length}`);
