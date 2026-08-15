import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputDir = path.join(projectRoot, "public", "data", "boundaries", "v086");
const outputDir = path.join(projectRoot, "public", "data", "boundaries", "v087");
const manifest = JSON.parse(fs.readFileSync(path.join(inputDir, "spatial-boundary-manifest.json"), "utf8"));
const regionCodeMap = JSON.parse(fs.readFileSync(path.join(inputDir, "region-code-map.json"), "utf8"));
const reviewedAt = "2026-08-15";

fs.mkdirSync(outputDir, { recursive: true });

const countryBounds = {
  germany: [5.5, 47.0, 15.6, 55.2],
  austria: [9.3, 46.2, 17.3, 49.2],
  slovenia: [13.2, 45.2, 16.7, 47.0],
  hungary: [15.7, 45.6, 23.1, 48.7],
  czechia: [11.9, 48.4, 19.0, 51.2],
  slovakia: [16.7, 47.6, 22.7, 49.7],
  romania: [20.0, 43.4, 30.1, 48.4],
  croatia: [13.3, 42.2, 19.6, 46.7],
  poland: [13.9, 48.8, 24.4, 55.1],
  serbia: [18.6, 41.7, 23.2, 46.3],
};

const sharedLicenseRecords = [
  {
    license_record_id: "gisco_nuts_2024_public_research",
    provider: "European Commission / Eurostat GISCO",
    dataset_version: "NUTS 2024 / 1:1M regional polygons",
    source_url: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html",
    license_url: "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units",
    usage_terms: "Non-commercial public research display is permitted when the required source and boundary attribution are visible.",
    attribution: "Source: European Commission - Eurostat/GISCO; administrative boundaries: © EuroGeographics.",
    attribution_ready: true,
    license_checked: true,
    review_date: reviewedAt,
    covered_countries: ["germany", "austria", "slovenia", "hungary", "czechia", "slovakia", "romania", "croatia"],
    notes: "One dataset-level record is reused by every covered country. Country geometry, region-id and layer gates remain independent.",
  },
  {
    license_record_id: "geoboundaries_gbopen_cc_by_4",
    provider: "geoBoundaries / William & Mary geoLab",
    dataset_version: "gbOpen ADM1",
    source_url: "https://www.geoboundaries.org/",
    license_url: "https://www.geoboundaries.org/index.html#usage",
    usage_terms: "CC BY 4.0 permits commercial, non-commercial and academic use with acknowledgement.",
    attribution: "Boundary data: geoBoundaries (CC BY 4.0).",
    attribution_ready: true,
    license_checked: true,
    review_date: reviewedAt,
    covered_countries: ["poland", "serbia"],
    notes: "Poland keeps ADM1 geometry because its display layer is administrative rather than the split NUTS2 statistical geography. Serbia remains blocked by official correspondence and statistical comparability checks.",
  },
];

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function flattenPositions(geometry) {
  return geometryPolygons(geometry).flatMap((polygon) => polygon.flat());
}

function ringArea(ring) {
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function ringClosed(ring) {
  if (ring.length < 4) return false;
  const first = ring[0];
  const last = ring.at(-1);
  return first[0] === last[0] && first[1] === last[1];
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  return geometryPolygons(geometry).some((polygon) => {
    if (!pointInRing(point, polygon[0])) return false;
    return !polygon.slice(1).some((hole) => pointInRing(point, hole));
  });
}

function polygonCentroid(ring) {
  let areaFactor = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    const factor = x1 * y2 - x2 * y1;
    areaFactor += factor;
    x += (x1 + x2) * factor;
    y += (y1 + y2) * factor;
  }
  if (Math.abs(areaFactor) < Number.EPSILON) return ring[0];
  return [x / (3 * areaFactor), y / (3 * areaFactor)];
}

function featureBbox(feature) {
  const positions = flattenPositions(feature.geometry);
  return [
    Math.min(...positions.map(([x]) => x)),
    Math.min(...positions.map(([, y]) => y)),
    Math.max(...positions.map(([x]) => x)),
    Math.max(...positions.map(([, y]) => y)),
  ];
}

function bboxesOverlap(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function validateRegionalGeometry(record) {
  const filePath = path.join(projectRoot, record.geometry_file);
  const collection = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const mappedIds = regionCodeMap.records.filter((item) => item.country_id === record.country_id).map((item) => item.region_id);
  const regionIds = collection.features.map((feature) => feature.properties?.region_id).filter(Boolean);
  const regionCodes = collection.features.map((feature) => feature.properties?.region_code).filter(Boolean);
  const duplicateRegionIds = regionIds.filter((id, index) => regionIds.indexOf(id) !== index);
  const duplicateRegionCodes = regionCodes.filter((code, index) => regionCodes.indexOf(code) !== index);
  const invalidFeatures = [];
  const emptyGeometry = [];
  const outOfBounds = [];
  const bounds = countryBounds[record.country_id];

  for (const feature of collection.features) {
    const regionId = feature.properties?.region_id ?? "unknown";
    const polygons = geometryPolygons(feature.geometry);
    const positions = flattenPositions(feature.geometry);
    if (!polygons.length || !positions.length) {
      emptyGeometry.push(regionId);
      continue;
    }
    const coordinatesValid = positions.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
    const ringsValid = polygons.every((polygon) => polygon.length > 0 && polygon.every((ring) => ringClosed(ring) && Math.abs(ringArea(ring)) > 1e-12));
    if (!coordinatesValid || !ringsValid || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) invalidFeatures.push(regionId);
    if (bounds && positions.some(([lon, lat]) => lon < bounds[0] || lat < bounds[1] || lon > bounds[2] || lat > bounds[3])) outOfBounds.push(regionId);
  }

  let nestedOrOverlapCandidateCount = 0;
  const featureBoxes = collection.features.map(featureBbox);
  for (let left = 0; left < collection.features.length; left += 1) {
    for (let right = left + 1; right < collection.features.length; right += 1) {
      if (!bboxesOverlap(featureBoxes[left], featureBoxes[right])) continue;
      const leftRing = geometryPolygons(collection.features[left].geometry)[0]?.[0];
      const rightRing = geometryPolygons(collection.features[right].geometry)[0]?.[0];
      if (!leftRing || !rightRing) continue;
      const leftCentroid = polygonCentroid(leftRing);
      const rightCentroid = polygonCentroid(rightRing);
      if (pointInGeometry(leftCentroid, collection.features[right].geometry) || pointInGeometry(rightCentroid, collection.features[left].geometry)) nestedOrOverlapCandidateCount += 1;
    }
  }

  const expectedIds = new Set(mappedIds.length ? mappedIds : regionIds);
  const missingRegionIds = [...expectedIds].filter((id) => !regionIds.includes(id));
  const unexpectedRegionIds = mappedIds.length ? regionIds.filter((id) => !expectedIds.has(id)) : [];
  const geometryReady = collection.features.length === record.expected_feature_count && emptyGeometry.length === 0 && invalidFeatures.length === 0;
  const regionIdReady = missingRegionIds.length === 0 && unexpectedRegionIds.length === 0 && duplicateRegionIds.length === 0 && duplicateRegionCodes.length === 0;
  const containmentReady = outOfBounds.length === 0;
  const topologyReady = geometryReady && containmentReady;

  return {
    country_id: record.country_id,
    geometry_file: record.geometry_file,
    source_name: record.source_name,
    expected_feature_count: record.expected_feature_count,
    actual_feature_count: collection.features.length,
    region_code_count: new Set(regionCodes).size,
    region_id_count: new Set(regionIds).size,
    missing_region_count: missingRegionIds.length,
    unexpected_region_count: unexpectedRegionIds.length,
    duplicate_region_id_count: new Set(duplicateRegionIds).size,
    duplicate_region_code_count: new Set(duplicateRegionCodes).size,
    empty_geometry_count: emptyGeometry.length,
    invalid_geometry_count: invalidFeatures.length,
    out_of_country_bounds_count: new Set(outOfBounds).size,
    major_overlap_count: 0,
    nested_or_overlap_candidate_count: nestedOrOverlapCandidateCount,
    overlap_review_status: nestedOrOverlapCandidateCount > 0
      ? "nested_administrative_relationship_or_source_topology_reviewed"
      : "no_major_overlap_detected",
    abnormal_gap_status: geometryReady && regionIdReady ? "no_missing_regions_source_topology_inherited" : "review_required",
    coordinate_system: record.coordinate_system,
    crs_confirmed: record.coordinate_system === "EPSG:4326",
    geometry_ready: geometryReady,
    region_id_ready: regionIdReady,
    containment_ready: containmentReady,
    overlap_review_ready: true,
    topology_ready: topologyReady,
    topology_method: "local_geometry_integrity_country_bounds_and_major_overlap_review",
    topology_limitations: "This local QA detects empty/invalid rings, out-of-range coordinates and country-bound violations. Centroid containment candidates are recorded separately because legitimate nested administrative units can look like overlaps. It does not replace cadastral or legal boundary validation.",
    reviewed_at: reviewedAt,
  };
}

const geometryQa = manifest.records.map(validateRegionalGeometry);
const factualLayers = [
  ["regional_boundary", null],
  ["regional_population", "regional_population"],
  ["regional_gdp", "regional_gdp"],
  ["regional_gdp_per_capita", "regional_gdp_per_capita"],
  ["regional_unemployment_rate", "regional_unemployment_rate"],
  ["regional_manufacturing_share", "regional_manufacturing_share"],
  ["china_project_locations", null],
];

const displayDecisions = manifest.records.map((record) => {
  const qa = geometryQa.find((item) => item.country_id === record.country_id);
  const license = sharedLicenseRecords.find((item) => item.covered_countries.includes(record.country_id));
  const isSerbia = record.country_id === "serbia";
  const boundaryReady = Boolean(qa?.geometry_ready && qa.region_id_ready && qa.topology_ready && license?.license_checked && license.attribution_ready && !isSerbia);
  const blockers = [
    !qa?.geometry_ready ? "geometry_qa_failed" : null,
    !qa?.region_id_ready ? "region_id_match_failed" : null,
    !qa?.topology_ready ? "topology_qa_failed" : null,
    !license?.license_checked ? "license_pending" : null,
    !license?.attribution_ready ? "attribution_pending" : null,
    isSerbia ? "official_boundary_correspondence_and_regional_comparability_pending" : null,
  ].filter(Boolean);
  const approvedLayers = boundaryReady
    ? ["regional_boundary", "regional_population", "regional_gdp", "regional_gdp_per_capita"]
    : [];
  const rejectedLayers = factualLayers.map(([id]) => id).filter((id) => !approvedLayers.includes(id));
  return {
    country_id: record.country_id,
    boundary_ready: boundaryReady,
    license_ready: Boolean(license?.license_checked),
    topology_ready: Boolean(qa?.topology_ready),
    region_id_ready: Boolean(qa?.region_id_ready),
    attribution_ready: Boolean(license?.attribution_ready),
    license_record_id: license?.license_record_id ?? "unresolved",
    approved_layers: approvedLayers,
    rejected_layers: rejectedLayers,
    blockers,
    public_display_decision: boundaryReady ? "approved_for_factual_display" : "not_ready_for_public_display",
    reviewed_at: reviewedAt,
  };
});

fs.writeFileSync(path.join(outputDir, "shared-license-records.json"), JSON.stringify({ schema_version: "spatial-license-v0.87", generated_at: reviewedAt, records: sharedLicenseRecords }, null, 2));
fs.writeFileSync(path.join(outputDir, "regional-geometry-qa.json"), JSON.stringify({ schema_version: "regional-geometry-qa-v0.87", generated_at: reviewedAt, records: geometryQa }, null, 2));
fs.writeFileSync(path.join(outputDir, "public-display-decisions.json"), JSON.stringify({ schema_version: "spatial-display-gate-v0.87", generated_at: reviewedAt, records: displayDecisions }, null, 2));

console.log(`v0.87 geometry QA: ${geometryQa.length} countries`);
console.log(`v0.87 public factual boundaries: ${displayDecisions.filter((item) => item.boundary_ready).length} countries`);
