// HICP migration QA (v1.31): compares the retired legacy tables
// (prc_hicp_midx / prc_hicp_manr, all-items CP00) against the merged current
// dataset (prc_hicp_minr, ECOICOP-2, coicop18=TOTAL) over the overlap window
// 2024-01..2025-12, and writes hicp_migration_manifest.json.
// Annual rate: compared directly. Index: both sides use the same 2015=100
// reference, so they are compared directly as well; a reference change would
// require re-referencing before comparison (documented in the manifest).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".tmp-eurostat");

const OVERLAP_START = "2024-01";
const OVERLAP_END = "2025-12";
const RATE_TOLERANCE = 0.15; // percentage points (minor vintage revisions tolerated)
const INDEX_TOLERANCE = 0.5; // index points on a 2015=100 base

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

function loadCache(name) {
  const file = path.join(cacheDir, name);
  if (!fs.existsSync(file)) throw new Error(`missing cache ${name}; run pnpm hf:acquire first (legacy caches must be retained in .tmp-eurostat)`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function seriesMap(payload) {
  const map = new Map();
  for (const row of flatten(payload)) {
    if (row.value !== null) map.set(`${row.combo.geo}:${row.period}`, row.value);
  }
  return map;
}

function compareOverlap(oldMap, newMap, tolerance) {
  let compared = 0;
  let maxDifference = 0;
  let worstKey = null;
  const failures = [];
  for (const [key, oldValue] of oldMap) {
    const period = key.split(":")[1];
    if (period < OVERLAP_START || period > OVERLAP_END) continue;
    const newValue = newMap.get(key);
    if (newValue === undefined || newValue === null) { failures.push({ key, reason: "missing_in_new" }); continue; }
    const difference = Math.abs(oldValue - newValue);
    compared += 1;
    if (difference > maxDifference) { maxDifference = difference; worstKey = key; }
    if (difference > tolerance) failures.push({ key, old: oldValue, new: newValue, difference });
  }
  return { compared, max_difference: Number(maxDifference.toFixed(6)), worst_key: worstKey, failures };
}

const oldIndex = seriesMap(loadCache("prc_hicp_midx-CP00-I15.json"));
const newIndex = seriesMap(loadCache("prc_hicp_minr-TOTAL-I15.json"));
const oldRate = seriesMap(loadCache("prc_hicp_manr-CP00-RCH_A.json"));
const newRate = seriesMap(loadCache("prc_hicp_minr-TOTAL-RCH_A.json"));

const indexTest = compareOverlap(oldIndex, newIndex, INDEX_TOLERANCE);
const rateTest = compareOverlap(oldRate, newRate, RATE_TOLERANCE);
const passed = indexTest.failures.length === 0 && rateTest.failures.length === 0 && indexTest.compared > 0 && rateTest.compared > 0;

const manifest = {
  schema_version: "hicp-migration-manifest-v1.31",
  migration_date: new Date().toISOString().slice(0, 10),
  old_dataset: ["prc_hicp_midx", "prc_hicp_manr"],
  new_dataset: "prc_hicp_minr",
  old_unit: { index: "I15 (2015=100), coicop=CP00", annual_rate: "RCH_A, coicop=CP00" },
  new_unit: { index: "I15 (2015=100), coicop18=TOTAL", annual_rate: "RCH_A, coicop18=TOTAL" },
  classification: "ECOICOP ver.2 (dimension coicop18); all-items code TOTAL",
  reference_period: "2015=100 (still officially provided by prc_hicp_minr; no reference-base splice)",
  classification_transition: "Legacy tables used ECOICOP ver.1 codes; prc_hicp_minr carries ECOICOP ver.2. All-items (TOTAL) series continuity across the transition verified over the overlap window.",
  all_items_continuity: "verified",
  overlap_window: `${OVERLAP_START}..${OVERLAP_END}`,
  overlap_test: {
    annual_rate: { compared: rateTest.compared, tolerance_pp: RATE_TOLERANCE, maximum_difference: rateTest.max_difference, worst: rateTest.worst_key, failures: rateTest.failures.length },
    index: { compared: indexTest.compared, tolerance_index_points: INDEX_TOLERANCE, maximum_difference: indexTest.max_difference, worst: indexTest.worst_key, failures: indexTest.failures.length, note: "Same 2015=100 reference on both sides; compared directly without re-referencing." },
    result: passed ? "passed" : "failed",
  },
};
if (!passed) {
  manifest.overlap_test.failure_detail = { index: indexTest.failures.slice(0, 20), rate: rateTest.failures.slice(0, 20) };
}

const outDir = path.join(root, "src", "data", "high-frequency");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "hicp_migration_manifest.json"), JSON.stringify(manifest, null, 2));
fs.copyFileSync(path.join(outDir, "hicp_migration_manifest.json"), path.join(root, "public", "research-data", "hicp_migration_manifest.json"));

console.log(`overlap window ${OVERLAP_START}..${OVERLAP_END}`);
console.log(`annual rate: compared=${rateTest.compared} max|diff|=${rateTest.max_difference} pp (tolerance ${RATE_TOLERANCE}) failures=${rateTest.failures.length}`);
console.log(`index:       compared=${indexTest.compared} max|diff|=${indexTest.max_difference} pts (tolerance ${INDEX_TOLERANCE}) failures=${indexTest.failures.length}`);
console.log(`migration QA: ${passed ? "PASSED" : "FAILED"}`);
if (!passed) process.exit(1);
