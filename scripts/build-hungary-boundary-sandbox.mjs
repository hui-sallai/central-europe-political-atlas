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
const filteredFile = "public/data/boundaries/sandbox/hu_nuts3_gisco_2024.geojson";
const validationFile = "public/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json";
const expectedFeatureCount = 20;
const epsilon = 1e-12;
const manifestId = "hu_nuts3_gisco_2024_validation_manifest";
const manifestStatus = "manifest_created_pending_final_validation";

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

function polygonsForGeometry(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function positionsEqual(left, right) {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentBoundsOverlap(a, b, c, d) {
  return (
    Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) + epsilon &&
    Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) + epsilon
  );
}

function properSegmentIntersection(a, b, c, d) {
  if (!segmentBoundsOverlap(a, b, c, d)) return false;
  const first = orientation(a, b, c);
  const second = orientation(a, b, d);
  const third = orientation(c, d, a);
  const fourth = orientation(c, d, b);
  return first * second < -epsilon && third * fourth < -epsilon;
}

function ringArea(ring) {
  let twiceArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    twiceArea += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return Math.abs(twiceArea / 2);
}

function ringSegments(ring) {
  return ring.slice(0, -1).map((position, index) => [position, ring[index + 1]]);
}

function ringSelfIntersectionCount(ring) {
  const segments = ringSegments(ring);
  let count = 0;
  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 1; second < segments.length; second += 1) {
      const adjacent = second === first + 1 || (first === 0 && second === segments.length - 1);
      if (adjacent) continue;
      if (properSegmentIntersection(...segments[first], ...segments[second])) count += 1;
    }
  }
  return count;
}

function featureSegments(feature) {
  return polygonsForGeometry(feature.geometry).flatMap((polygon) => polygon.flatMap(ringSegments));
}

function featureBounds(feature) {
  const positions = polygonsForGeometry(feature.geometry).flat(2);
  return positions.reduce(
    (bounds, position) => [
      Math.min(bounds[0], position[0]),
      Math.min(bounds[1], position[1]),
      Math.max(bounds[2], position[0]),
      Math.max(bounds[3], position[1]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

function featureBoundsOverlap(left, right) {
  return left[0] <= right[2] && left[2] >= right[0] && left[1] <= right[3] && left[3] >= right[1];
}

function crossFeatureIntersectionCount(features) {
  const prepared = features.map((feature) => ({
    bounds: featureBounds(feature),
    segments: featureSegments(feature),
  }));
  let count = 0;
  for (let left = 0; left < prepared.length; left += 1) {
    for (let right = left + 1; right < prepared.length; right += 1) {
      if (!featureBoundsOverlap(prepared[left].bounds, prepared[right].bounds)) continue;
      for (const leftSegment of prepared[left].segments) {
        for (const rightSegment of prepared[right].segments) {
          if (properSegmentIntersection(...leftSegment, ...rightSegment)) count += 1;
        }
      }
    }
  }
  return count;
}

function runGeometryQa(features) {
  const geometries = features.filter(hasGeometry);
  const rings = geometries.flatMap((feature) => polygonsForGeometry(feature.geometry).flat());
  const positions = rings.flat();
  const invalidCoordinateCount = positions.filter(
    (position) =>
      !Array.isArray(position) ||
      position.length < 2 ||
      !Number.isFinite(position[0]) ||
      !Number.isFinite(position[1]) ||
      position[0] < -180 ||
      position[0] > 180 ||
      position[1] < -90 ||
      position[1] > 90,
  ).length;
  const unclosedRingCount = rings.filter((ring) => ring.length < 4 || !positionsEqual(ring[0], ring.at(-1))).length;
  const degenerateRingCount = rings.filter((ring) => ring.length < 4 || ringArea(ring) <= epsilon).length;
  const selfIntersectionCount = rings.reduce((total, ring) => total + ringSelfIntersectionCount(ring), 0);
  const crossFeatureIntersections = crossFeatureIntersectionCount(geometries);
  const topologyPassed =
    geometries.length === features.length &&
    invalidCoordinateCount === 0 &&
    unclosedRingCount === 0 &&
    degenerateRingCount === 0 &&
    selfIntersectionCount === 0 &&
    crossFeatureIntersections === 0;

  return {
    geometry_present_count: geometries.length,
    ring_count: rings.length,
    coordinate_count: positions.length,
    invalid_coordinate_count: invalidCoordinateCount,
    unclosed_ring_count: unclosedRingCount,
    degenerate_ring_count: degenerateRingCount,
    self_intersection_count: selfIntersectionCount,
    cross_feature_intersection_count: crossFeatureIntersections,
    crs_confirmed: sourceFile.includes("_4326_") && invalidCoordinateCount === 0,
    topology_checked: true,
    topology_status: topologyPassed
      ? "sandbox_basic_topology_passed_pending_authoritative_validation"
      : "sandbox_topology_issues_detected",
  };
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
const geometryQa = runGeometryQa(filteredFeatures);
const regionIdCandidates = filteredFeatures
  .map((feature) => String(feature.properties?.region_id ?? ""))
  .filter(Boolean);

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}

const duplicateNutsCodes = duplicateValues(nutsCodes);
const duplicateRegionIds = duplicateValues(regionIdCandidates);
const missingGeometryCount = filteredFeatures.filter((feature) => !hasGeometry(feature)).length;
const manifestRecords = filteredFeatures
  .map((feature) => {
    const properties = feature.properties ?? {};
    const nutsCode = String(propertyValue(properties, "NUTS_ID", "nuts_id") ?? "");
    const regionIdCandidate = String(properties.region_id ?? "");
    const regionName = String(propertyValue(properties, "NAME_LATN", "NUTS_NAME", "name") ?? "");
    return {
      nuts_code: nutsCode,
      region_id_candidate: regionIdCandidate || null,
      region_name: regionName,
      geometry_present: hasGeometry(feature),
      duplicate_nuts_code: duplicateNutsCodes.has(nutsCode),
      duplicate_region_id: regionIdCandidate ? duplicateRegionIds.has(regionIdCandidate) : false,
      match_status: "pending_final_validation",
      notes:
        "NUTS code, region name, region_id candidate, and geometry presence are recorded from the sandbox file; final identifier validation remains pending.",
    };
  })
  .sort((left, right) => left.nuts_code.localeCompare(right.nuts_code));

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
  manifest_id: manifestId,
  source_file: sourceFile,
  source_url: sourceUrl,
  filtered_file: filteredFile,
  validation_file: validationFile,
  country_id: "hungary",
  filtered_country: "Hungary / HU",
  admin_level: "NUTS3",
  nuts_version: "2024",
  coordinate_system: "EPSG:4326",
  expected_region_count: expectedFeatureCount,
  feature_count: filteredFeatures.length,
  expected_feature_count: expectedFeatureCount,
  nuts_codes: nutsCodes,
  nuts_code_count: new Set(nutsCodes).size,
  nuts_codes_count: new Set(nutsCodes).size,
  region_id_candidate_count: regionIdCandidates.length,
  matched_region_count: matchedCodes.length,
  unmatched_region_count: missingExpectedCodes.length + unexpectedCodes.length,
  duplicate_region_id_count: duplicateRegionIds.size,
  duplicate_nuts_code_count: duplicateNutsCodes.size,
  missing_geometry_count: missingGeometryCount,
  geometry_present: geometryPresent,
  ...geometryQa,
  region_id_match_status: preMatchComplete
    ? "sandbox_pre_matched_20_of_20_pending_verification"
    : "sandbox_pre_match_incomplete",
  missing_expected_nuts_codes: missingExpectedCodes,
  unexpected_nuts_codes: unexpectedCodes,
  visual_qa_passed: true,
  license_checked: false,
  authoritative_topology_checked: false,
  region_id_final_matched: false,
  region_id_matched: false,
  public_display_ready: false,
  is_ready_for_display: false,
  ready_for_display: false,
  manifest_status: manifestStatus,
  last_updated: "2026-08-02",
  region_records: manifestRecords,
  notes:
    "v0.17 validation manifest only. The 20 detail records trace NUTS codes, region_id candidates, names, and geometry presence; they remain pending final validation. The manifest does not establish licence approval, authoritative topology approval, final identifier matching, or public display readiness.",
};

if (filteredFeatures.length !== expectedFeatureCount) {
  throw new Error(`Expected ${expectedFeatureCount} Hungary NUTS3 features, received ${filteredFeatures.length}.`);
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
      manifest_status: validation.manifest_status,
      manifest_record_count: validation.region_records.length,
      topology_status: validation.topology_status,
      region_id_match_status: validation.region_id_match_status,
      public_display_ready: false,
      is_ready_for_display: false,
    },
    null,
    2,
  ),
);
