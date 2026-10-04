import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "public", "geo", "adm1");
const outputFile = path.join(root, "public", "geo", "home-countries-simplified.geojson");
const countrySlugs = ["germany", "poland", "hungary", "romania", "czechia", "slovakia", "slovenia", "serbia", "austria", "croatia"];
const tolerance = 0.025;
// Per-boundary sources and licences (geoBoundaries gbOpen ADM1 API metadata, read 2026-10-04); see public/geo/BOUNDARY-LICENSES.txt.
const boundaryLicences = {
  poland: ["OpenStreetMap contributors (via geoBoundaries)", "ODbL-1.0"],
  serbia: ["OpenStreetMap contributors (via geoBoundaries)", "ODbL-1.0"],
  slovakia: ["OpenStreetMap contributors (via geoBoundaries)", "ODbL-1.0"],
  croatia: ["OpenStreetMap contributors (via geoBoundaries)", "ODbL-1.0"],
  austria: ["geoBoundaries; Federal Office of Metrology and Surveying (BEV)", "CC-BY-SA-2.0"],
  czechia: ["Czech Office for Surveying, Mapping and Cadastre (via geoBoundaries)", "CC-BY-4.0"],
  romania: ["World Bank (via geoBoundaries)", "CC-BY-4.0"],
  slovenia: ["Eurostat - European Commission (via geoBoundaries)", "CC-BY-4.0"],
  germany: ["Federal Agency for Cartography and Geodesy (BKG) (via geoBoundaries)", "dl-de/by-2-0"],
  hungary: ["geoBoundaries, Wikimedia Commons", "CC0-1.0"],
};

function squaredDistance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyStep(points, first, last, squaredTolerance, output) {
  let maxDistance = squaredTolerance;
  let index = 0;
  for (let cursor = first + 1; cursor < last; cursor += 1) {
    const distance = squaredSegmentDistance(points[cursor], points[first], points[last]);
    if (distance > maxDistance) {
      index = cursor;
      maxDistance = distance;
    }
  }
  if (maxDistance > squaredTolerance) {
    if (index - first > 1) simplifyStep(points, first, index, squaredTolerance, output);
    output.push(points[index]);
    if (last - index > 1) simplifyStep(points, index, last, squaredTolerance, output);
  }
}

function simplifyRing(ring) {
  if (ring.length <= 5) return ring;
  const closed = squaredDistance(ring[0], ring.at(-1)) === 0;
  const points = closed ? ring.slice(0, -1) : ring;
  const output = [points[0]];
  simplifyStep(points, 0, points.length - 1, tolerance * tolerance, output);
  output.push(points.at(-1));
  if (closed) output.push(output[0]);
  return output.length >= 4 ? output : ring;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: geometry.coordinates.map(simplifyRing) };
  }
  return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map(simplifyRing)) };
}

const features = [];
for (const countrySlug of countrySlugs) {
  const source = JSON.parse(await readFile(path.join(sourceDir, `${countrySlug}.geojson`), "utf8"));
  for (const feature of source.features) {
    if (!feature.geometry) continue;
    features.push({
      type: "Feature",
      properties: { countrySlug, boundary_source: boundaryLicences[countrySlug][0], boundary_license: boundaryLicences[countrySlug][1] },
      geometry: simplifyGeometry(feature.geometry),
    });
  }
}

await mkdir(path.dirname(outputFile), { recursive: true });
const license_notice = "Simplified country outlines derived from geoBoundaries gbOpen ADM1 (www.geoboundaries.org). Each feature keeps its own source and licence (boundary_source, boundary_license); ODbL-1.0 features: © OpenStreetMap contributors, Open Database License; CC-BY-SA-2.0 feature: share-alike. Details: /geo/BOUNDARY-LICENSES.txt";
await writeFile(outputFile, `${JSON.stringify({ type: "FeatureCollection", license_notice, features })}\n`, "utf8");
console.log(`Home country map: ${features.length} simplified features -> ${path.relative(root, outputFile)}`);
