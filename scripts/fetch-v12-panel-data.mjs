import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "src", "data", "panel");
const publicOutputDir = path.join(root, "public", "research-data");
const generatedAt = new Date().toISOString().slice(0, 10);
const years = Array.from({ length: 11 }, (_, index) => 2015 + index);
const countries = [
  ["germany", "DEU"], ["poland", "POL"], ["hungary", "HUN"], ["romania", "ROU"], ["czechia", "CZE"],
  ["slovakia", "SVK"], ["slovenia", "SVN"], ["serbia", "SRB"], ["austria", "AUT"], ["croatia", "HRV"],
];

const indicators = [
  { id: "real_gdp_growth", api: "NY.GDP.MKTP.KD.ZG", unit: "%", definition: "Annual percentage growth rate of GDP at market prices based on constant local currency.", comparability: "comparable", key: true },
  { id: "gdp_per_capita", api: "NY.GDP.PCAP.CD", unit: "current USD", definition: "GDP per capita in current US dollars; kept separate from the platform EUR series.", comparability: "comparable", key: false },
  { id: "consumer_price_inflation", api: "FP.CPI.TOTL.ZG", unit: "%", definition: "Annual consumer price inflation. This is not relabelled as HICP.", comparability: "comparable", key: true },
  { id: "unemployment_rate", api: "SL.UEM.TOTL.ZS", unit: "% labour force", definition: "ILO-modelled total unemployment rate.", comparability: "comparable", key: true },
  { id: "employment_rate", api: "SL.EMP.TOTL.SP.ZS", unit: "% population 15+", definition: "Employment-to-population ratio, age 15+, modelled ILO estimate.", comparability: "comparable", key: false },
  { id: "government_debt_gdp", api: "GC.DOD.TOTL.GD.ZS", unit: "% GDP", definition: "Central government debt; not treated as identical to Eurostat general-government Maastricht debt.", comparability: "partial_comparability", key: false },
  { id: "fiscal_balance_gdp", api: "GC.BAL.CASH.GD.ZS", unit: "% GDP", definition: "Cash surplus or deficit; not treated as identical to ESA general-government net lending/borrowing.", comparability: "partial_comparability", key: false },
  { id: "current_account_gdp", api: "BN.CAB.XOKA.GD.ZS", unit: "% GDP", definition: "Current account balance as a share of GDP.", comparability: "comparable", key: true },
  { id: "manufacturing_share_gdp", api: "NV.IND.MANF.ZS", unit: "% GDP", definition: "Manufacturing value added as a share of GDP.", comparability: "comparable", key: true },
  { id: "energy_import_dependency", api: "EG.IMP.CONS.ZS", unit: "% energy use", definition: "Net energy imports as a share of energy use; retained as a partial-comparability proxy, not Eurostat energy dependency.", comparability: "partial_comparability", key: false },
  { id: "fdi_gdp", api: "BX.KLT.DINV.WD.GD.ZS", unit: "% GDP", definition: "Net FDI inflows as a share of GDP; annual volatility does not by itself measure dependency.", comparability: "comparable", key: false },
  { id: "exports_gdp", api: "NE.EXP.GNFS.ZS", unit: "% GDP", definition: "Exports of goods and services as a share of GDP.", comparability: "comparable", key: true },
  { id: "imports_gdp", api: "NE.IMP.GNFS.ZS", unit: "% GDP", definition: "Imports of goods and services as a share of GDP.", comparability: "comparable", key: true },
];

async function fetchIndicator(indicator) {
  const iso3 = countries.map(([, code]) => code).join(";");
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${indicator.api}?format=json&date=2015:2025&per_page=2000`;
  const response = await fetch(url, { headers: { "User-Agent": "Central-Europe-Political-Atlas/1.2" } });
  if (!response.ok) throw new Error(`${indicator.api}: HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error(`${indicator.api}: unexpected response`);
  return { url, rows: Array.isArray(payload[1]) ? payload[1] : [] };
}

const fetched = new Map();
for (const indicator of indicators) {
  const result = await fetchIndicator(indicator);
  fetched.set(indicator.id, result);
  console.log(`${indicator.id}: ${result.rows.filter((row) => row.value !== null).length} values`);
}

const records = [];
for (const [country, iso3] of countries) {
  for (const indicator of indicators) {
    const result = fetched.get(indicator.id);
    const byYear = new Map(result.rows.filter((row) => row.countryiso3code === iso3).map((row) => [Number(row.date), row.value]));
    for (const year of years) {
      const value = byYear.get(year);
      records.push({
        observation_id: `panel:${country}:${indicator.id}:${year}`,
        country,
        year,
        indicator: indicator.id,
        value: value === null || value === undefined ? null : Number(value),
        unit: indicator.unit,
        source: "World Bank Data API",
        source_url: result.url,
        source_reliability: "A",
        definition_version: `world-bank-${indicator.api}-v1`,
        comparability_status: indicator.comparability,
        data_status: value === null || value === undefined ? "pending" : "official",
        updated_at: generatedAt,
        source_indicator: indicator.api,
        definition_note: indicator.definition,
      });
    }
  }
}

const coverage = indicators.map((indicator) => {
  const allRecords = records.filter((record) => record.indicator === indicator.id);
  const relevant = allRecords.filter((record) => record.comparability_status === "comparable");
  const available = allRecords.filter((record) => record.value !== null).length;
  const comparableAvailable = relevant.filter((record) => record.value !== null).length;
  const countryCount = new Set(relevant.filter((record) => record.value !== null).map((record) => record.country)).size;
  const yearCount = new Set(relevant.filter((record) => record.value !== null).map((record) => record.year)).size;
  return {
    indicator: indicator.id,
    expected_observations: countries.length * years.length,
    available_observations: available,
    comparable_available_observations: comparableAvailable,
    coverage_ratio: Number((available / (countries.length * years.length)).toFixed(3)),
    comparable_coverage_ratio: Number((comparableAvailable / (countries.length * years.length)).toFixed(3)),
    country_count: countryCount,
    year_count: yearCount,
    key_variable: indicator.key,
    gate_qualified: indicator.comparability === "comparable" && countryCount >= 8 && yearCount >= 8 && comparableAvailable / (countries.length * years.length) >= 0.75,
    comparability_status: indicator.comparability,
  };
});
const qualifiedKeyVariables = coverage.filter((item) => item.key_variable && item.gate_qualified).length;
const panelGate = {
  minimum_countries: 8,
  minimum_years: 8,
  minimum_key_variable_coverage: 0.75,
  minimum_qualified_key_variables: 4,
  qualified_key_variables: qualifiedKeyVariables,
  status: qualifiedKeyVariables >= 4 ? "passed" : "data_building",
  note: "The gate is based on comparable country-year coverage, not a raw minimum observation count.",
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "panel_observations.json"), `${JSON.stringify({ schema_version: "panel-observations-v1.2", generated_at: generatedAt, record_count: records.length, records }, null, 2)}\n`);
const runtimePayload = {
  schema_version: "panel-runtime-v1.2",
  generated_at: generatedAt,
  record_count: records.length,
  columns: ["observation_id", "country", "year", "indicator", "value", "comparability_status", "data_status"],
  records: records.map((record) => [record.observation_id, record.country, record.year, record.indicator, record.value, record.comparability_status, record.data_status]),
};
fs.mkdirSync(publicOutputDir, { recursive: true });
fs.writeFileSync(path.join(publicOutputDir, "panel_runtime.json"), `${JSON.stringify(runtimePayload)}\n`);
fs.writeFileSync(path.join(outputDir, "panel_coverage.json"), `${JSON.stringify({ schema_version: "panel-coverage-v1.2", generated_at: generatedAt, panel_gate: panelGate, records: coverage }, null, 2)}\n`);
console.log(`Panel records: ${records.length}; gate=${panelGate.status}; qualified key variables=${qualifiedKeyVariables}`);
