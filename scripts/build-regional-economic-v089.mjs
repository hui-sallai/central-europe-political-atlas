import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "src", "data", "regional");
const observationFile = path.join(outputDir, "v089-observations.json");
const auditFile = path.join(outputDir, "v089-gap-audit.json");
const continuityFile = path.join(outputDir, "v089-continuity.json");
const updatedAt = "2026-08-15";
const years = ["2021", "2022", "2023", "2024"];

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { countries } = require("../src/lib/data.ts");
const { regionMetadataRecords } = require("../src/lib/regions.ts");
const { projectLocationRecords } = require("../src/lib/projectLocations.ts");
const v086 = JSON.parse(fs.readFileSync(path.join(outputDir, "v086-observations.json"), "utf8"));
const codeMap = JSON.parse(fs.readFileSync(path.join(projectRoot, "public", "data", "boundaries", "v086", "region-code-map.json"), "utf8"));
const boundaryManifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "public", "data", "boundaries", "v086", "spatial-boundary-manifest.json"), "utf8"));

const eu9 = ["poland", "hungary", "czechia", "slovakia", "germany", "austria", "romania", "slovenia", "croatia"];
const labourMapCountries = new Set(["poland", "germany", "austria", "slovenia"]);
const urls = {
  unemployment: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfu3rt?sex=T&age=Y15-74&isced11=TOTAL&unit=PC&sinceTimePeriod=2021&untilTimePeriod=2024&lang=en",
  employment: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfe2emprt?sex=T&age=Y20-64&unit=PC&sinceTimePeriod=2021&untilTimePeriod=2024&lang=en",
  manufacturingGva: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gva?unit=CP_MEUR&nace_r2=C&sinceTimePeriod=2021&untilTimePeriod=2024&lang=en",
  totalGva: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gva?unit=CP_MEUR&nace_r2=TOTAL&sinceTimePeriod=2021&untilTimePeriod=2024&lang=en",
};

const polandCodes = {
  poland_lesser_poland: ["PL21"], poland_silesian: ["PL22"], poland_greater_poland: ["PL41"],
  poland_west_pomeranian: ["PL42"], poland_lubusz: ["PL43"], poland_lower_silesian: ["PL51"],
  poland_opole: ["PL52"], poland_kuyavian_pomeranian: ["PL61"], poland_warmian_masurian: ["PL62"],
  poland_pomeranian: ["PL63"], poland_lodz: ["PL71"], poland_swietokrzyskie: ["PL72"],
  poland_lublin: ["PL81"], poland_subcarpathian: ["PL82"], poland_podlaskie: ["PL84"],
  poland_masovian: ["PL91", "PL92"],
};

function orderedCategories(index) {
  return Array.isArray(index) ? index : Object.keys(index).sort((a, b) => index[a] - index[b]);
}

function jsonStatValues(payload) {
  const geos = orderedCategories(payload.dimension.geo.category.index);
  const times = orderedCategories(payload.dimension.time.category.index);
  const result = new Map();
  geos.forEach((geo, geoPosition) => times.forEach((time, timePosition) => {
    const value = payload.value?.[geoPosition * times.length + timePosition];
    if (value !== undefined && value !== null) result.set(`${geo}|${time}`, Number(value));
  }));
  return result;
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

const [unemploymentPayload, employmentPayload, manufacturingPayload, totalGvaPayload] = await Promise.all([
  loadJson(urls.unemployment), loadJson(urls.employment), loadJson(urls.manufacturingGva), loadJson(urls.totalGva),
]);
const unemploymentValues = jsonStatValues(unemploymentPayload);
const employmentValues = jsonStatValues(employmentPayload);
const manufacturingValues = jsonStatValues(manufacturingPayload);
const totalGvaValues = jsonStatValues(totalGvaPayload);

const regionCodes = new Map();
for (const record of codeMap.records) {
  const key = `${record.country_id}|${record.region_id}`;
  const values = regionCodes.get(key) ?? [];
  values.push(record.region_code);
  regionCodes.set(key, values);
}
for (const [regionId, codes] of Object.entries(polandCodes)) regionCodes.set(`poland|${regionId}`, codes);

function observation({ countryId, regionId, indicatorId, year, value, unit, sourceId, sourceName, sourceUrl, calculationMethod, notes, official = true }) {
  return {
    region_observation_id: `${regionId}_${indicatorId}_${year}`,
    region_id: regionId,
    country_id: countryId,
    region_indicator_id: indicatorId,
    year,
    period_type: "annual",
    value,
    unit,
    value_status: official ? "正式数据" : "计算值",
    source_id: sourceId,
    source_name: sourceName,
    source_url: sourceUrl,
    source_reliability: "A",
    source_status: "官方来源",
    is_official_data: official,
    is_pending: false,
    is_calculated: !official,
    is_manual: false,
    is_structural_sample: false,
    is_in_map_layer: true,
    is_in_region_comparison: true,
    is_in_future_model_candidate: false,
    missing_reason: "",
    calculation_method: calculationMethod,
    last_updated: updatedAt,
    notes,
    source: sourceName,
    status: official ? "正式数据" : "计算值",
    updated_at: updatedAt,
  };
}

function directLabourCodes(countryId, regionId, codes) {
  if (!labourMapCountries.has(countryId)) return [];
  if (countryId === "poland" && regionId === "poland_masovian") return ["PL9"];
  return codes.length === 1 && codes[0].length <= 4 ? codes : [];
}

function sumComplete(values, codes, year) {
  const parts = codes.map((code) => values.get(`${code}|${year}`));
  return parts.every(Number.isFinite) ? parts.reduce((sum, value) => sum + value, 0) : null;
}

const records = [];
for (const region of regionMetadataRecords.filter((item) => eu9.includes(item.country_id))) {
  const codes = regionCodes.get(`${region.country_id}|${region.region_id}`) ?? [];
  const labourCodes = directLabourCodes(region.country_id, region.region_id, codes);
  for (const year of years) {
    if (labourCodes.length === 1) {
      const unemployment = unemploymentValues.get(`${labourCodes[0]}|${year}`);
      const employment = employmentValues.get(`${labourCodes[0]}|${year}`);
      if (Number.isFinite(unemployment)) records.push(observation({
        countryId: region.country_id, regionId: region.region_id, indicatorId: "regional_unemployment_rate", year,
        value: Math.round(unemployment * 10) / 10, unit: "%", sourceId: "eurostat_regional_lfs_unemployment",
        sourceName: "Eurostat regional labour market statistics", sourceUrl: urls.unemployment,
        calculationMethod: "Direct annual LFS unemployment rate; sex=T, age=Y15-74, isced11=TOTAL, unit=PC; no national or higher-level downscaling.",
        notes: `Direct regional observation for ${labourCodes[0]}; standard labour-force definition.`,
      }));
      if (Number.isFinite(employment)) records.push(observation({
        countryId: region.country_id, regionId: region.region_id, indicatorId: "regional_employment_rate", year,
        value: Math.round(employment * 10) / 10, unit: "%", sourceId: "eurostat_regional_lfs_employment",
        sourceName: "Eurostat regional labour market statistics", sourceUrl: urls.employment,
        calculationMethod: "Direct annual LFS employment rate; sex=T, age=Y20-64, unit=PC; no national or higher-level downscaling.",
        notes: `Direct regional observation for ${labourCodes[0]}; selected as the single v0.89 employment indicator.`,
      }));
    }

    if (codes.length) {
      const manufacturing = sumComplete(manufacturingValues, codes, year);
      const total = sumComplete(totalGvaValues, codes, year);
      if (manufacturing !== null && total && total > 0) records.push(observation({
        countryId: region.country_id, regionId: region.region_id, indicatorId: "regional_manufacturing_share", year,
        value: Math.round((manufacturing / total) * 10000) / 100, unit: "%", sourceId: "eurostat_regional_gva",
        sourceName: "Eurostat regional economic accounts", sourceUrl: `${urls.manufacturingGva} | ${urls.totalGva}`,
        calculationMethod: `Manufacturing GVA (NACE C, CP_MEUR) / total GVA (NACE TOTAL, CP_MEUR) * 100; source region codes: ${codes.join(", ")}.`,
        notes: "Calculated from same-year, same-region official numerator and denominator; not a national value and not an employment share.",
        official: false,
      }));
    }
  }
}

const baseFacts = [...v086.records, ...records];
const valueIndex = new Map(baseFacts.filter((item) => item.value !== null).map((item) => [`${item.region_id}|${item.region_indicator_id}|${item.year}`, Number(item.value)]));
const sourceIndex = new Map(baseFacts.map((item) => [`${item.region_id}|${item.region_indicator_id}|${item.year}`, item]));
const changeDefinitions = [
  { source: "regional_population", target: "regional_population_change_pct", unit: "%", formula: "(value_2024 / value_2021 - 1) * 100" },
  { source: "regional_gdp_per_capita", target: "regional_gdp_per_capita_change_pct", unit: "%", formula: "(value_2024 / value_2021 - 1) * 100" },
  { source: "regional_unemployment_rate", target: "regional_unemployment_change_pp", unit: "百分点", formula: "value_2024 - value_2021" },
];

for (const region of regionMetadataRecords.filter((item) => eu9.includes(item.country_id))) {
  for (const definition of changeDefinitions) {
    const start = valueIndex.get(`${region.region_id}|${definition.source}|2021`);
    const end = valueIndex.get(`${region.region_id}|${definition.source}|2024`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || (definition.unit === "%" && start === 0)) continue;
    const value = definition.unit === "%" ? ((end / start) - 1) * 100 : end - start;
    const sourceStart = sourceIndex.get(`${region.region_id}|${definition.source}|2021`);
    const sourceEnd = sourceIndex.get(`${region.region_id}|${definition.source}|2024`);
    records.push(observation({
      countryId: region.country_id, regionId: region.region_id, indicatorId: definition.target, year: "2024",
      value: Math.round(value * 100) / 100, unit: definition.unit, sourceId: "regional_historical_change_calculation",
      sourceName: sourceEnd?.source_name ?? sourceStart?.source_name ?? "Official regional observations",
      sourceUrl: sourceEnd?.source_url ?? sourceStart?.source_url ?? "",
      calculationMethod: `${definition.formula}; start_year=2021; end_year=2024; source_indicator=${definition.source}.`,
      notes: "Historical factual change, not a forecast, risk score, or performance rating.",
      official: false,
    }));
  }
}

const allFacts = [...v086.records, ...records];
const auditIndicators = ["regional_population", "regional_gdp", "regional_gdp_per_capita", "regional_unemployment_rate", "regional_employment_rate", "regional_manufacturing_share"];
const audits = countries.map((country) => {
  const countryRegions = regionMetadataRecords.filter((region) => region.country_id === country.slug);
  const facts = allFacts.filter((item) => item.country_id === country.slug && item.value !== null);
  const availability = Object.fromEntries(auditIndicators.map((indicatorId) => {
    const matching = facts.filter((item) => item.region_indicator_id === indicatorId);
    const coveredRegions = new Set(matching.map((item) => item.region_id)).size;
    const coveredYears = [...new Set(matching.map((item) => item.year))].sort();
    return [indicatorId, { available: matching.length > 0, covered_regions: coveredRegions, region_count: countryRegions.length, years: coveredYears, complete_latest_year: coveredYears.filter((year) => new Set(matching.filter((item) => item.year === year).map((item) => item.region_id)).size === countryRegions.length).at(-1) ?? "unavailable" }];
  }));
  const projects = projectLocationRecords.filter((item) => item.country_id === country.slug && item.is_mapped_to_region && item.location_source_url);
  const boundary = boundaryManifest.records.find((item) => item.country_id === country.slug);
  const priorityGaps = [
    !availability.regional_unemployment_rate.available ? country.slug === "serbia" ? "官方区域失业率与空间分类待接入" : "当前地图层级缺少可直接对应的 LFS 失业率" : null,
    availability.regional_unemployment_rate.available && availability.regional_unemployment_rate.covered_regions < countryRegions.length
      ? `LFS 失业率仅覆盖 ${availability.regional_unemployment_rate.covered_regions} / ${countryRegions.length} 个当前区域`
      : null,
    !availability.regional_employment_rate.available ? "当前地图层级缺少可直接对应的 LFS 就业率" : null,
    availability.regional_employment_rate.available && availability.regional_employment_rate.covered_regions < countryRegions.length
      ? `LFS 就业率仅覆盖 ${availability.regional_employment_rate.covered_regions} / ${countryRegions.length} 个当前区域`
      : null,
    !availability.regional_manufacturing_share.available ? "制造业 GVA 比重待接入" : null,
    projects.length === 0 ? "无已核验项目区域记录（不等于无项目活动）" : null,
    country.slug === "serbia" ? "national_admin 不进入 EU NUTS 正式排名" : null,
  ].filter(Boolean);
  return {
    country_id: country.slug,
    country_name_zh: country.nameZh,
    region_level: boundary?.admin_level ?? "pending",
    region_count: countryRegions.length,
    population: availability.regional_population,
    gdp: availability.regional_gdp,
    gdp_per_capita: availability.regional_gdp_per_capita,
    unemployment: availability.regional_unemployment_rate,
    employment: availability.regional_employment_rate,
    manufacturing: availability.regional_manufacturing_share,
    industry_definition: availability.regional_manufacturing_share.available ? "manufacturing_gva_share" : "unavailable",
    verified_project_records: projects.length,
    historical_coverage: [...new Set(facts.map((item) => item.year))].sort(),
    comparison_eligible_indicator_count: auditIndicators.filter((indicatorId) => availability[indicatorId].complete_latest_year !== "unavailable").length,
    priority_gaps: priorityGaps,
  };
});

const continuityRecords = [];
for (const region of regionMetadataRecords.filter((item) => eu9.includes(item.country_id))) {
  const codes = regionCodes.get(`${region.country_id}|${region.region_id}`) ?? [];
  for (const code of codes) continuityRecords.push({
    continuity_id: `${region.region_id}_${code}_2021_2024`,
    country_id: region.country_id,
    region_id: region.region_id,
    old_region_code: code,
    new_region_code: code,
    boundary_version: "NUTS 2024 correspondence",
    valid_from: "2021",
    valid_to: "2024",
    continuity_status: "same_nuts2024_source_code_used_across_series",
    comparison_eligible: true,
    notes: "This confirms a stable source code in the selected Eurostat NUTS 2024 series; it is not a cadastral statement that historical boundaries never changed.",
  });
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(observationFile, JSON.stringify({ schema_version: "regional-economic-v0.89", generated_at: updatedAt, years, records }, null, 2));
fs.writeFileSync(auditFile, JSON.stringify({ schema_version: "regional-gap-audit-v0.89", generated_at: updatedAt, records: audits }, null, 2));
fs.writeFileSync(continuityFile, JSON.stringify({ schema_version: "regional-continuity-v0.89", generated_at: updatedAt, records: continuityRecords }, null, 2));

console.log(`v0.89 regional economic observations: ${records.length}`);
console.log(`v0.89 labour map countries: ${audits.filter((item) => item.unemployment.available).length}`);
console.log(`v0.89 manufacturing map countries: ${audits.filter((item) => item.manufacturing.available).length}`);
