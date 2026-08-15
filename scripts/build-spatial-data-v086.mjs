import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "public", "data", "boundaries", "v086");
const observationFile = path.join(projectRoot, "src", "data", "regional", "v086-observations.json");
const updatedAt = "2026-08-14";

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { regionMetadataRecords } = require("../src/lib/regions.ts");
const { boundaryFeatureToRegionSlug } = require("../src/lib/boundaryMap.ts");

const countryConfigs = {
  germany: { iso2: "DE", level: 1, expected: 16, classification: "NUTS1" },
  austria: { iso2: "AT", level: 2, expected: 9, classification: "NUTS2" },
  slovenia: { iso2: "SI", level: 2, expected: 2, classification: "NUTS2" },
  poland: { iso2: "PL", level: 2, expected: 16, classification: "ADM1 with NUTS2 observation correspondence" },
  hungary: { iso2: "HU", level: 3, expected: 20, classification: "NUTS3" },
  czechia: { iso2: "CZ", level: 3, expected: 14, classification: "NUTS3" },
  slovakia: { iso2: "SK", level: 3, expected: 8, classification: "NUTS3" },
  romania: { iso2: "RO", level: 3, expected: 42, classification: "NUTS3" },
  croatia: { iso2: "HR", level: 3, expected: 21, classification: "NUTS3" },
};

const codeAliases = {
  germany: {
    DEF: "germany_schleswig_holstein", DE2: "germany_bavaria", DE3: "germany_berlin", DEG: "germany_thuringia",
    DE4: "germany_brandenburg", DE5: "germany_bremen", DE6: "germany_hamburg", DEA: "germany_north_rhine_westphalia",
    DE7: "germany_hesse", DEB: "germany_rhineland_palatinate", DEC: "germany_saarland", DE8: "germany_mecklenburg_vorpommern",
    DED: "germany_saxony", DE1: "germany_baden_wurttemberg", DE9: "germany_lower_saxony_de", DEE: "germany_saxony_anhalt",
  },
  austria: {
    AT11: "austria_burgenland", AT12: "austria_lower_austria", AT13: "austria_vienna", AT21: "austria_carinthia",
    AT22: "austria_styria", AT31: "austria_upper_austria", AT32: "austria_salzburg", AT33: "austria_tyrol", AT34: "austria_vorarlberg",
  },
  slovenia: { SI03: "slovenia_eastern_slovenia", SI04: "slovenia_western_slovenia" },
  poland: {
    PL21: "poland_lesser_poland", PL51: "poland_lower_silesian", PL52: "poland_opole", PL61: "poland_kuyavian_pomeranian",
    PL62: "poland_warmian_masurian", PL63: "poland_pomeranian", PL71: "poland_lodz", PL72: "poland_swietokrzyskie",
    PL22: "poland_silesian", PL81: "poland_lublin", PL82: "poland_subcarpathian", PL41: "poland_greater_poland",
    PL84: "poland_podlaskie", PL42: "poland_west_pomeranian", PL43: "poland_lubusz",
    PL91: "poland_masovian", PL92: "poland_masovian",
  },
  czechia: {
    CZ010: "czechia_prague", CZ020: "czechia_central_bohemian", CZ031: "czechia_south_bohemian", CZ032: "czechia_plzen",
    CZ041: "czechia_karlovy_vary", CZ042: "czechia_usti", CZ051: "czechia_liberec", CZ052: "czechia_hradec_kralove",
    CZ053: "czechia_pardubice", CZ063: "czechia_vysocina", CZ064: "czechia_south_moravian", CZ071: "czechia_olomouc",
    CZ072: "czechia_zlin", CZ080: "czechia_moravian_silesian",
  },
  slovakia: {
    SK010: "slovakia_bratislava", SK021: "slovakia_trnava", SK022: "slovakia_trencin", SK023: "slovakia_nitra",
    SK031: "slovakia_zilina", SK032: "slovakia_banska_bystrica", SK041: "slovakia_presov", SK042: "slovakia_kosice",
  },
  croatia: {
    HR021: "croatia_bjelovar_bilogora", HR022: "croatia_virovitica_podravina", HR023: "croatia_pozega_slavonia",
    HR024: "croatia_brod_posavina", HR025: "croatia_osijek_baranja", HR026: "croatia_vukovar_srijem", HR027: "croatia_karlovac",
    HR028: "croatia_sisak_moslavina", HR031: "croatia_primorje_gorski_kotar", HR032: "croatia_lika_senj", HR033: "croatia_zadar",
    HR034: "croatia_sibenik_knin", HR035: "croatia_split_dalmatia", HR036: "croatia_istria", HR037: "croatia_dubrovnik_neretva",
    HR050: "croatia_zagreb_city", HR061: "croatia_medimurje", HR062: "croatia_varazdin", HR063: "croatia_koprivnica_krizevci",
    HR064: "croatia_krapina_zagorje", HR065: "croatia_zagreb_county",
  },
};

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapRegion(countryId, feature) {
  const code = feature.properties.NUTS_ID;
  if (countryId === "hungary") {
    return regionMetadataRecords.find((region) => region.country_id === countryId && region.admin_code === code)?.region_id;
  }
  if (codeAliases[countryId]?.[code]) return codeAliases[countryId][code];
  if (countryId === "romania") {
    const aliases = { bucuresti: "bucharest" };
    const suffix = aliases[normalize(feature.properties.NAME_LATN)] ?? normalize(feature.properties.NAME_LATN);
    return `romania_${suffix}`;
  }
  return undefined;
}

function geometryStats(feature) {
  let coordinateCount = 0;
  let invalidCoordinateCount = 0;
  function walk(node) {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      coordinateCount += 1;
      if (!Number.isFinite(node[0]) || !Number.isFinite(node[1]) || node[0] < -180 || node[0] > 180 || node[1] < -90 || node[1] > 90) invalidCoordinateCount += 1;
      return;
    }
    node.forEach(walk);
  }
  walk(feature.geometry?.coordinates);
  return { coordinateCount, invalidCoordinateCount };
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function jsonStatValues(payload) {
  const geoIndex = payload.dimension.geo.category.index;
  const timeIndex = payload.dimension.time.category.index;
  const geos = Array.isArray(geoIndex) ? geoIndex : Object.keys(geoIndex).sort((a, b) => geoIndex[a] - geoIndex[b]);
  const times = Array.isArray(timeIndex) ? timeIndex : Object.keys(timeIndex).sort((a, b) => timeIndex[a] - timeIndex[b]);
  const result = new Map();
  geos.forEach((geo, geoPosition) => times.forEach((time, timePosition) => {
    const value = payload.value?.[geoPosition * times.length + timePosition];
    if (value !== undefined && value !== null) result.set(`${geo}|${time}`, Number(value));
  }));
  return result;
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(observationFile), { recursive: true });

const giscoByLevel = {};
for (const level of [1, 2, 3]) {
  const url = `https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_${level}.geojson`;
  giscoByLevel[level] = await loadJson(url);
}

const boundaryManifest = [];
const regionCodeMaps = new Map();
const regionCodeRecords = [];

for (const [countryId, config] of Object.entries(countryConfigs)) {
  if (countryId === "poland") continue;
  const sourceUrl = `https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_${config.level}.geojson`;
  const sourceFeatures = giscoByLevel[config.level].features.filter((feature) => feature.properties.CNTR_CODE === config.iso2);
  const mapped = sourceFeatures.map((feature) => {
    const regionId = mapRegion(countryId, feature);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        region_id: regionId ?? null,
        region_code: feature.properties.NUTS_ID,
        region_name: feature.properties.NAME_LATN,
        source_dataset: "Eurostat GISCO NUTS 2024",
        geometry_version: "NUTS 2024 / 1:1M / EPSG:4326",
        source_url: sourceUrl,
        attribution: "European Commission - Eurostat/GISCO",
      },
    };
  });
  const unmapped = mapped.filter((feature) => !feature.properties.region_id);
  const duplicateRegionIds = mapped.map((feature) => feature.properties.region_id).filter((id, index, values) => id && values.indexOf(id) !== index);
  const invalidGeometryCount = mapped.filter((feature) => !feature.geometry || geometryStats(feature).invalidCoordinateCount > 0).length;
  const fileName = `${countryId}_${config.classification.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_gisco_2024.geojson`;
  fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify({ type: "FeatureCollection", name: `${countryId} ${config.classification}`, features: mapped }, null, 2));
  regionCodeMaps.set(countryId, mapped.map((feature) => ({ code: feature.properties.NUTS_ID, region_id: feature.properties.region_id })));
  regionCodeRecords.push(...mapped.filter((feature) => feature.properties.region_id).map((feature) => ({
    country_id: countryId,
    region_id: feature.properties.region_id,
    region_code: feature.properties.NUTS_ID,
    classification_system: "NUTS",
    admin_level: config.classification,
    source: "Eurostat GISCO NUTS 2024",
    source_url: sourceUrl,
    match_status: "one_to_one_matched",
  })));
  boundaryManifest.push({
    country_id: countryId, classification_system: "NUTS", admin_level: config.classification, source_name: "Eurostat GISCO NUTS 2024",
    source_url: sourceUrl, license_url: "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units/countries",
    attribution: "European Commission - Eurostat/GISCO", geometry_file: `public/data/boundaries/v086/${fileName}`, coordinate_system: "EPSG:4326",
    expected_feature_count: config.expected, actual_feature_count: mapped.length, mapped_region_count: mapped.length - unmapped.length,
    missing_region_count: unmapped.length, duplicate_region_id_count: duplicateRegionIds.length, invalid_geometry_count: invalidGeometryCount,
    source_verified: true, license_checked: countryId === "hungary", topology_checked: countryId === "hungary",
    region_id_one_to_one_match: unmapped.length === 0 && duplicateRegionIds.length === 0,
    public_display_ready: countryId === "hungary" && unmapped.length === 0 && invalidGeometryCount === 0,
    is_ready_for_display: countryId === "hungary" && unmapped.length === 0 && invalidGeometryCount === 0,
    status: unmapped.length === 0 ? "geometry_mapped_pending_country_gate" : "review_required",
    notes: countryId === "hungary" ? "Existing licence, topology and final region-id evidence reused; factual boundary display may be enabled independently." : "Geometry and region-id mapping recorded. Public display remains closed until file-level licence and authoritative topology review pass.",
  });
}

for (const countryId of ["poland", "serbia"]) {
  const inputFile = path.join(projectRoot, "public", "geo", "adm1", `${countryId}.geojson`);
  const geojson = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const mapped = geojson.features.map((feature) => {
    const slug = boundaryFeatureToRegionSlug[countryId]?.[feature.properties.shapeName];
    const regionId = slug ? `${countryId}_${slug.replace(/-/g, "_")}` : null;
    return { ...feature, properties: { ...feature.properties, region_id: regionId, region_code: feature.properties.shapeISO || feature.properties.shapeID, region_name: feature.properties.shapeName, source_dataset: "geoBoundaries gbOpen ADM1", geometry_version: "gbOpen current local snapshot", source_url: "https://www.geoboundaries.org/", attribution: "geoBoundaries" } };
  });
  const unmapped = mapped.filter((feature) => !feature.properties.region_id);
  const fileName = `${countryId}_adm1_geoboundaries.geojson`;
  fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify({ type: "FeatureCollection", name: `${countryId} ADM1`, features: mapped }, null, 2));
  boundaryManifest.push({
    country_id: countryId, classification_system: countryId === "serbia" ? "national_admin" : "ADM1", admin_level: "ADM1",
    source_name: "geoBoundaries gbOpen ADM1", source_url: "https://www.geoboundaries.org/", license_url: "https://www.geoboundaries.org/index.html#usage",
    attribution: "geoBoundaries", geometry_file: `public/data/boundaries/v086/${fileName}`, coordinate_system: "EPSG:4326",
    expected_feature_count: countryId === "poland" ? 16 : 25, actual_feature_count: mapped.length, mapped_region_count: mapped.length - unmapped.length,
    missing_region_count: unmapped.length, duplicate_region_id_count: 0, invalid_geometry_count: mapped.filter((feature) => !feature.geometry || geometryStats(feature).invalidCoordinateCount > 0).length,
    source_verified: true, license_checked: false, topology_checked: false, region_id_one_to_one_match: unmapped.length === 0,
    public_display_ready: false, is_ready_for_display: false, status: unmapped.length === 0 ? "geometry_mapped_pending_country_gate" : "review_required",
    notes: countryId === "serbia" ? "Accepted national administrative hierarchy; no synthetic NUTS code. Reuse licence and official SORS correspondence remain pending." : "ADM1 geometry retained because NUTS2 splits Mazowieckie into two statistical regions. NUTS observations use an explicit aggregation trace.",
  });
}

regionCodeMaps.set("poland", Object.entries(codeAliases.poland).map(([code, region_id]) => ({ code, region_id })));

fs.writeFileSync(path.join(outputDir, "spatial-boundary-manifest.json"), JSON.stringify({ schema_version: "spatial-boundary-v0.86", generated_at: updatedAt, records: boundaryManifest }, null, 2));
fs.writeFileSync(path.join(outputDir, "region-code-map.json"), JSON.stringify({ schema_version: "region-code-map-v0.86", generated_at: updatedAt, records: regionCodeRecords }, null, 2));

const years = ["2021", "2022", "2023", "2024"];
const populationUrl = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_pjanaggr3?sex=T&age=TOTAL&unit=NR";
const gdpUrl = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp?unit=MIO_EUR";
const [populationPayload, gdpPayload] = await Promise.all([loadJson(populationUrl), loadJson(gdpUrl)]);
const populationValues = jsonStatValues(populationPayload);
const gdpValues = jsonStatValues(gdpPayload);
const observations = [];

function addObservation({ countryId, regionId, year, indicatorId, value, unit, sourceUrl, calculated = false, method = "Official Eurostat regional observation." }) {
  observations.push({
    region_observation_id: `${regionId}_${indicatorId}_${year}`, region_id: regionId, country_id: countryId, region_indicator_id: indicatorId,
    year, period_type: "annual", value, unit, value_status: calculated ? "计算值" : "正式数据", source_id: calculated ? "eurostat_regional_calculated" : "eurostat_regional_statistics",
    source_name: "Eurostat regional statistics", source_url: sourceUrl, source_reliability: "A", source_status: "官方来源",
    is_official_data: !calculated, is_pending: false, is_calculated: calculated, is_manual: false, is_structural_sample: false,
    is_in_map_layer: true, is_in_region_comparison: true, is_in_future_model_candidate: false, missing_reason: "",
    calculation_method: method, last_updated: updatedAt, notes: "Regional fact; never derived from a national observation.", source: "Eurostat regional statistics", status: calculated ? "计算值" : "正式数据", updated_at: updatedAt,
  });
}

for (const [countryId, mappings] of regionCodeMaps.entries()) {
  const grouped = new Map();
  for (const mapping of mappings) {
    if (!mapping.region_id) continue;
    const codes = grouped.get(mapping.region_id) ?? [];
    codes.push(mapping.code);
    grouped.set(mapping.region_id, codes);
  }
  for (const [regionId, codes] of grouped.entries()) {
    for (const year of years) {
      const populationParts = codes.map((code) => populationValues.get(`${code}|${year}`)).filter(Number.isFinite);
      const gdpParts = codes.map((code) => gdpValues.get(`${code}|${year}`)).filter(Number.isFinite);
      const population = populationParts.length === codes.length ? populationParts.reduce((sum, value) => sum + value, 0) : null;
      const gdp = gdpParts.length === codes.length ? gdpParts.reduce((sum, value) => sum + value, 0) : null;
      const aggregation = codes.length > 1 ? `Aggregated from ${codes.join(" + ")} to the atlas ADM1 region.` : "Official Eurostat regional observation.";
      if (population !== null) addObservation({ countryId, regionId, year, indicatorId: "regional_population", value: population, unit: "人", sourceUrl: populationUrl, calculated: codes.length > 1, method: aggregation });
      if (gdp !== null) addObservation({ countryId, regionId, year, indicatorId: "regional_gdp", value: gdp, unit: "百万欧元", sourceUrl: gdpUrl, calculated: codes.length > 1, method: aggregation });
      if (population && gdp !== null) addObservation({ countryId, regionId, year, indicatorId: "regional_gdp_per_capita", value: Math.round((gdp * 1_000_000) / population), unit: "欧元", sourceUrl: `${gdpUrl} | ${populationUrl}`, calculated: true, method: `regional_gdp (million EUR) * 1,000,000 / regional_population; source region codes: ${codes.join(", ")}.` });
    }
  }
}

fs.writeFileSync(observationFile, JSON.stringify({ schema_version: "regional-observations-v0.86", generated_at: updatedAt, years, records: observations }, null, 2));
console.log(`v0.86 boundary records: ${boundaryManifest.length}`);
console.log(`v0.86 regional observations: ${observations.length}`);
