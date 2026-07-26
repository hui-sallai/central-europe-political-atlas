import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceFile = "NUTS_RG_01M_2024_4326_LEVL_3.geojson";
const sourceUrl = `https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/${sourceFile}`;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "public", "data", "boundaries", "sandbox");
const geojsonOutputPath = path.join(outputDirectory, "hu_nuts3_gisco_2024.geojson");
const validationOutputPath = path.join(outputDirectory, "hu_nuts3_gisco_2024.validation.json");

const regionIdByNutsCode = new Map([
  ["HU110", "hungary_budapest"],
  ["HU120", "hungary_pest"],
  ["HU211", "hungary_fejer"],
  ["HU212", "hungary_komarom_esztergom"],
  ["HU213", "hungary_veszprem"],
  ["HU221", "hungary_gyor_moson_sopron"],
  ["HU222", "hungary_vas"],
  ["HU223", "hungary_zala"],
  ["HU231", "hungary_baranya"],
  ["HU232", "hungary_somogy"],
  ["HU233", "hungary_tolna"],
  ["HU311", "hungary_borsod_abauj_zemplen"],
  ["HU312", "hungary_heves"],
  ["HU313", "hungary_nograd"],
  ["HU321", "hungary_hajdu_bihar"],
  ["HU322", "hungary_jasz_nagykun_szolnok"],
  ["HU323", "hungary_szabolcs_szatmar_bereg"],
  ["HU331", "hungary_bacs_kiskun"],
  ["HU332", "hungary_bekes"],
  ["HU333", "hungary_csongrad_csanad"],
]);

function argumentValue(name) {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : undefined;
}

async function loadSource() {
  const inputPath = argumentValue("--input");
  if (inputPath) {
    return JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
  }

  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "central-europe-political-atlas-boundary-sandbox/0.11" },
  });
  if (!response.ok) {
    throw new Error(`GISCO download failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function propertyValue(properties, ...keys) {
  for (const key of keys) {
    if (properties?.[key] !== undefined && properties[key] !== null) {
      return properties[key];
    }
  }
  return undefined;
}

function isHungaryNuts3(feature) {
  const properties = feature?.properties ?? {};
  const nutsCode = String(propertyValue(properties, "NUTS_ID", "nuts_id") ?? "");
  const countryCode = String(propertyValue(properties, "CNTR_CODE", "cntr_code") ?? nutsCode.slice(0, 2));
  const level = Number(propertyValue(properties, "LEVL_CODE", "levl_code") ?? 3);
  return countryCode === "HU" && level === 3 && nutsCode.startsWith("HU");
}

function hasGeometry(feature) {
  return Boolean(feature?.geometry?.type && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length);
}

const source = await loadSource();
if (source?.type !== "FeatureCollection" || !Array.isArray(source.features)) {
  throw new Error("GISCO source is not a GeoJSON FeatureCollection.");
}

const filteredFeatures = source.features
  .filter(isHungaryNuts3)
  .map((feature) => {
    const nutsCode = String(propertyValue(feature.properties, "NUTS_ID", "nuts_id"));
    return {
      ...feature,
      properties: {
        ...feature.properties,
        region_id: regionIdByNutsCode.get(nutsCode) ?? null,
        region_id_match_status: regionIdByNutsCode.has(nutsCode)
          ? "sandbox_pre_matched_pending_verification"
          : "sandbox_unmatched",
      },
    };
  });

const nutsCodes = filteredFeatures
  .map((feature) => String(propertyValue(feature.properties, "NUTS_ID", "nuts_id")))
  .sort();
const matchedCodes = nutsCodes.filter((code) => regionIdByNutsCode.has(code));
const missingExpectedCodes = [...regionIdByNutsCode.keys()].filter((code) => !nutsCodes.includes(code)).sort();
const unexpectedCodes = nutsCodes.filter((code) => !regionIdByNutsCode.has(code));
const geometryPresent = filteredFeatures.length > 0 && filteredFeatures.every(hasGeometry);
const preMatchComplete = matchedCodes.length === regionIdByNutsCode.size && missingExpectedCodes.length === 0 && unexpectedCodes.length === 0;

const outputGeojson = {
  type: "FeatureCollection",
  name: "hu_nuts3_gisco_2024_sandbox",
  crs: source.crs ?? {
    type: "name",
    properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
  },
  source_file: sourceFile,
  source_url: sourceUrl,
  sandbox_only: true,
  ready_for_display: false,
  features: filteredFeatures,
};

const validation = {
  source_file: sourceFile,
  source_url: sourceUrl,
  filtered_country: "Hungary / HU",
  admin_level: "NUTS3",
  coordinate_system: "EPSG:4326",
  feature_count: filteredFeatures.length,
  nuts_codes: nutsCodes,
  geometry_present: geometryPresent,
  topology_checked: false,
  region_id_match_status: preMatchComplete
    ? "sandbox_pre_matched_20_of_20_pending_verification"
    : "sandbox_pre_match_incomplete",
  matched_region_count: matchedCodes.length,
  missing_expected_nuts_codes: missingExpectedCodes,
  unexpected_nuts_codes: unexpectedCodes,
  license_checked: false,
  ready_for_display: false,
  notes:
    "v0.11 sandbox only. The file is filtered for offline parsing and region_id pre-matching. It must not enter a live map layer before licence acceptance, topology checks, final key verification, and regional quality acceptance.",
};

if (filteredFeatures.length !== 20) {
  throw new Error(`Expected 20 Hungary NUTS3 features, received ${filteredFeatures.length}.`);
}
if (!geometryPresent) {
  throw new Error("At least one filtered Hungary NUTS3 feature has no geometry.");
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(geojsonOutputPath, `${JSON.stringify(outputGeojson)}\n`, "utf8");
await writeFile(validationOutputPath, `${JSON.stringify(validation, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      source_file: sourceFile,
      output_geojson: path.relative(projectRoot, geojsonOutputPath),
      output_validation: path.relative(projectRoot, validationOutputPath),
      feature_count: filteredFeatures.length,
      region_id_match_status: validation.region_id_match_status,
      ready_for_display: false,
    },
    null,
    2,
  ),
);
