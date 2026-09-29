// Phase I: regional DESCRIPTIVE history (2000 up to the first stored year) for the existing regional indicators.
// Writes src/data/historical/regional_descriptive_history.json; the v0.86/v0.89 regional files are not modified.
// Boundary rule — no NUTS vintages are merged by this script:
//   - every value is Eurostat's current (NUTS 2024) dissemination for the same geo code(s) the atlas region already
//     uses; earlier NUTS geographies are never mapped onto current regions here;
//   - comparability per statistical year comes from the official GISCO NUTS code lists (2003…2024): a year is
//     "comparable_stable_code" only if every source code was in force in that year's NUTS version and in every later
//     version (Eurostat changes a code when a boundary changes). Otherwise it is "backcast_boundary_revision":
//     a value Eurostat back-calculated onto today's boundary, shown but never used for a trend line;
//   - an official Eurostat break flag ('b') between a year and the first stored year marks "series_break";
//   - overlap years must agree with the stored regional observations (revision tolerance), else the pair is held;
//   - LFS rates are only taken for single-code regions (rates cannot be summed); missing years are absent.
// Usage: node scripts/historical-regional/acquire.mjs [--offline]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawDir = path.join(root, "src/data/historical/raw/regional");
let offline = process.argv.includes("--offline");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const REGIONAL_HISTORY_PATH = "src/data/historical/regional_descriptive_history.json";
export const REGIONAL_MANIFEST_PATH = "src/data/historical/regional_history_manifest.json";
export const NUTS_CODES_PATH = "src/data/historical/raw/regional/gisco_nuts_code_lists.json";
const FIRST_YEAR = 2000;
const OVERLAP_TOLERANCE = { relative: 0.02, absolute: 0.3 };
const EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
// NUTS version in force for a statistical year (Commission regulations; GISCO has no list before NUTS 2003).
export const NUTS_VERSIONS = [["2003", 2000, 2007], ["2006", 2008, 2011], ["2010", 2012, 2014], ["2013", 2015, 2017], ["2016", 2018, 2020], ["2021", 2021, 2023], ["2024", 2024, 9999]];
const versionOf = (year) => NUTS_VERSIONS.find(([, a, b]) => year >= a && year <= b)[0];
const PREFIXES = ["AT", "DE", "SK", "SI", "CZ", "HU", "PL", "RO", "HR"];

const TABLES = {
  population: { dataset: "demo_r_pjanaggr3", params: { sex: "T", age: "TOTAL", unit: "NR" } },
  gdp: { dataset: "nama_10r_3gdp", params: { unit: "MIO_EUR" } },
  unemployment: { dataset: "lfst_r_lfu3rt", params: { sex: "T", age: "Y15-74", isced11: "TOTAL", unit: "PC" } },
  employment: { dataset: "lfst_r_lfe2emprt", params: { sex: "T", age: "Y20-64", unit: "PC" } },
  gva_c: { dataset: "nama_10r_3gva", params: { unit: "CP_MEUR", nace_r2: "C" } },
  gva_total: { dataset: "nama_10r_3gva", params: { unit: "CP_MEUR", nace_r2: "TOTAL" } },
};
// Indicator → how to compute a region-year value from source tables (sum over the region's codes where additive).
const INDICATORS = {
  regional_population: { unit: "人", inputs: ["population"], additive: true, compute: ([p]) => p, definition: "Population on 1 January (Eurostat demo_r_pjanaggr3)" },
  regional_gdp: { unit: "百万欧元", inputs: ["gdp"], additive: true, compute: ([g]) => g, definition: "Regional GDP, current prices, million EUR (Eurostat nama_10r_3gdp)" },
  regional_gdp_per_capita: { unit: "欧元", inputs: ["gdp", "population"], additive: true, compute: ([g, p]) => (g * 1_000_000) / p, definition: "Regional GDP (million EUR) × 1,000,000 / population, same codes and year" },
  regional_unemployment_rate: { unit: "%", inputs: ["unemployment"], additive: false, compute: ([u]) => u, definition: "LFS unemployment rate, 15–74 (Eurostat lfst_r_lfu3rt)" },
  regional_employment_rate: { unit: "%", inputs: ["employment"], additive: false, compute: ([e]) => e, definition: "LFS employment rate, 20–64 (Eurostat lfst_r_lfe2emprt)" },
  regional_manufacturing_share: { unit: "%", inputs: ["gva_c", "gva_total"], additive: true, compute: ([c, t]) => (c / t) * 100, definition: "Manufacturing GVA (NACE C) / total GVA × 100, current prices (Eurostat nama_10r_3gva)" },
};

const httpGet = async (url) => { const response = await fetch(url, { signal: AbortSignal.timeout(120000) }); const bytes = Buffer.from(await response.arrayBuffer()); if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`); return { bytes, status: response.status }; };

function regionCodes() {
  const map = new Map();
  for (const r of read("public/data/boundaries/v086/region-code-map.json").records) map.set(r.region_id, { country: r.country_id, codes: [r.region_code], level: r.admin_level });
  for (const r of read("src/data/regional/v089-continuity.json").records.filter((x) => x.country_id === "poland")) {
    const entry = map.get(r.region_id) ?? { country: "poland", codes: [], level: "ADM1 (NUTS2 source codes)" };
    if (!entry.codes.includes(r.new_region_code)) entry.codes.push(r.new_region_code);
    map.set(r.region_id, entry);
  }
  return map;
}

function parseJsonStat(bytes) {
  const json = JSON.parse(bytes.toString("utf8"));
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const at = (g, t) => json.id.reduce((n, id, i) => n + (id === "geo" ? ordered.geo.indexOf(g) : id === "time" ? ordered.time.indexOf(t) : 0) * stride[i], 0);
  const cells = new Map();
  for (const g of ordered.geo) for (const t of ordered.time) { const v = json.value?.[at(g, t)]; if (v !== undefined && v !== null) cells.set(`${g}|${t}`, { value: v, flag: String(json.status?.[at(g, t)] ?? "").trim() }); }
  return { cells, updated: json.updated ?? null };
}

export async function build(options = {}) {
  if (options.offline !== undefined) offline = options.offline;
  fs.mkdirSync(rawDir, { recursive: true });
  const regions = regionCodes();
  const allCodes = [...new Set([...regions.values()].flatMap((r) => r.codes))].sort();

  // Official NUTS code lists per version (only codes for the nine countries are archived; the full response hash is kept).
  let nuts;
  if (offline) nuts = read(NUTS_CODES_PATH);
  else {
    nuts = { source: "Eurostat GISCO NUTS units listings", versions: {} };
    for (const [version] of NUTS_VERSIONS) {
      const url = `https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-${version}-units.json`;
      const got = await httpGet(url);
      nuts.versions[version] = { url, response_sha256: sha(got.bytes), retrieved_at: new Date().toISOString(), codes: Object.keys(JSON.parse(got.bytes.toString("utf8"))).filter((c) => PREFIXES.some((p) => c.startsWith(p))).sort() };
    }
    fs.writeFileSync(path.join(root, NUTS_CODES_PATH), JSON.stringify(nuts, null, 1) + "\n");
  }
  const inForce = (code, year) => NUTS_VERSIONS.filter(([, a]) => a >= NUTS_VERSIONS.find(([v]) => v === versionOf(year))[1]).every(([v]) => nuts.versions[v].codes.includes(code));
  const firstStableYear = (code) => { for (let y = FIRST_YEAR; y <= 2024; y += 1) if (inForce(code, y)) return y; return null; };

  // Eurostat tables for exactly the codes the atlas regions use.
  const sources = [], tables = {};
  for (const [key, spec] of Object.entries(TABLES)) {
    const q = new URLSearchParams({ format: "JSON", lang: "en", sinceTimePeriod: String(FIRST_YEAR), untilTimePeriod: "2024" });
    for (const [k, v] of Object.entries(spec.params)) q.append(k, v);
    for (const c of allCodes) q.append("geo", c);
    const url = `${EUROSTAT}/${spec.dataset}?${q}`;
    const file = path.join(rawDir, `eurostat_${key}.json`);
    let bytes, retrieved_at = null, http_status = null;
    if (offline) bytes = fs.readFileSync(file);
    else { const got = await httpGet(url); bytes = got.bytes; http_status = got.status; retrieved_at = new Date().toISOString(); fs.writeFileSync(file, bytes); }
    const parsed = parseJsonStat(bytes);
    tables[key] = parsed;
    sources.push({ source_ref: sources.length, key, dataset: spec.dataset, url, raw_file: path.relative(root, file), sha256: sha(bytes), retrieved_at, http_status, dataset_updated_at: parsed.updated, source_year: parsed.updated ? Number(parsed.updated.slice(0, 4)) : null });
  }

  const stored = [...read("src/data/regional/v086-observations.json").records, ...read("src/data/regional/v089-observations.json").records];
  const records = [], pairs = [];
  for (const [regionId, region] of [...regions.entries()].sort()) {
    for (const [indicator, spec] of Object.entries(INDICATORS)) {
      const current = stored.filter((r) => r.region_id === regionId && r.region_indicator_id === indicator);
      if (!current.length) continue; // only extend series the atlas already publishes for this region
      if (!spec.additive && region.codes.length > 1) { pairs.push({ region_id: regionId, indicator, codes: region.codes, status: "not_extended_rate_needs_single_code" }); continue; }
      const firstStored = Math.min(...current.map((r) => Number(r.year)));
      const valueFor = (year) => {
        const parts = spec.inputs.map((key) => region.codes.map((code) => tables[key].cells.get(`${code}|${year}`)));
        if (parts.some((list) => list.some((cell) => !cell))) return null; // any missing component → missing, never zero
        const sums = parts.map((list) => list.reduce((n, cell) => n + cell.value, 0));
        const flags = [...new Set(parts.flat().map((cell) => cell.flag).filter(Boolean))].join("");
        return { value: spec.compute(sums), flag: flags };
      };
      // Overlap with stored observations.
      const overlap = current.filter((r) => r.value !== null).map((r) => ({ stored: r.value, retrieved: valueFor(Number(r.year))?.value ?? null })).filter((o) => o.retrieved !== null);
      const excess = overlap.reduce((m, o) => Math.max(m, Math.abs(o.stored - o.retrieved) - Math.max(OVERLAP_TOLERANCE.absolute, OVERLAP_TOLERANCE.relative * Math.abs(o.stored))), -Infinity);
      const overlapOk = overlap.length > 0 && excess <= 0;
      const breakYears = [];
      for (let y = FIRST_YEAR + 1; y <= firstStored; y += 1) { const v = valueFor(y); if (v && /b/.test(v.flag)) breakYears.push(y); }
      const stableFrom = Math.max(...region.codes.map((c) => firstStableYear(c) ?? 9999));
      const out = [];
      if (overlapOk) for (let y = FIRST_YEAR; y < firstStored; y += 1) {
        const v = valueFor(y);
        if (!v || !Number.isFinite(v.value)) continue;
        const laterBreak = breakYears.find((b) => b > y);
        const comparability = y < stableFrom ? "backcast_boundary_revision" : laterBreak ? "series_break" : "comparable_stable_code";
        // Unit, definition and source tables per indicator live once in `indicators`; the record keeps what varies.
        out.push({ id: `hist:regional:${regionId}:${indicator}:${y}`, region_id: regionId, indicator, statistical_year: y, value: Number(v.value.toPrecision(12)), geo_codes: region.codes, nuts_vintage: "NUTS2024", nuts_version_in_force: versionOf(y), comparability_status: comparability, ...(laterBreak ? { break_year: laterBreak } : {}), source_year: Math.max(...spec.inputs.map((key) => sources.find((s) => s.key === key).source_year)), value_status: /p/.test(v.flag) ? "provisional" : /e/.test(v.flag) ? "estimated" : "official", source_flag: v.flag || null });
      }
      records.push(...out);
      pairs.push({ region_id: regionId, country_id: region.country, indicator, codes: region.codes, first_stored_year: firstStored, stable_code_from: stableFrom === 9999 ? null : stableFrom, break_years: breakYears, overlap_years: overlap.length, overlap_max_excess: overlap.length ? Number(excess.toFixed(6)) : null, overlap_check: overlap.length ? (overlapOk ? "pass" : "fail_definition_or_vintage_mismatch") : "no_overlap", ingested_years: out.length ? [out[0].statistical_year, out.at(-1).statistical_year] : null, ingested_count: out.length, comparable_years: out.filter((r) => r.comparability_status === "comparable_stable_code").length, status: !overlap.length ? "held_no_overlap_to_verify" : !overlapOk ? "held_for_review" : out.length ? "ingested" : "no_earlier_official_values" });
    }
  }
  records.sort((a, b) => a.region_id.localeCompare(b.region_id) || a.indicator.localeCompare(b.indicator) || a.statistical_year - b.statistical_year);
  const history = {
    schema_version: "regional-descriptive-history-v2.0", data_type: "regional_descriptive_history", descriptive_only: true,
    model_boundary: "Descriptive regional history only; not used by map classification, region comparison scores, models or scenarios.",
    boundary_policy: "Values are Eurostat's NUTS 2024 dissemination for the atlas region's own geo codes; no earlier NUTS vintage is mapped onto current regions. comparability_status per year: comparable_stable_code (all codes in force in that year's NUTS version and every later version), backcast_boundary_revision (Eurostat back-calculation across a boundary change; not used for trends), series_break (official break flag between that year and the stored series).",
    missing_value_policy: "A year with any missing component is absent; nothing is interpolated or encoded as zero.",
    nuts_vintage_note: "NUTS2024 = Eurostat's current dissemination on NUTS 2024 codes; nuts_version_in_force = the NUTS version legally in force in the statistical year.",
    sources: sources.map(({ source_ref, dataset, url, source_year, dataset_updated_at }) => ({ source_ref, dataset, url, source_year, dataset_updated_at })),
    indicators: Object.fromEntries(Object.entries(INDICATORS).map(([id, spec]) => [id, { unit: spec.unit, definition: spec.definition, source_refs: spec.inputs.map((key) => sources.find((s) => s.key === key).source_ref), aggregation: spec.additive ? "sum over the region's codes, then compute" : "single code only" }])),
    regions: Object.fromEntries([...regions.entries()].sort().map(([id, r]) => [id, { country_id: r.country, geo_codes: r.codes, level: r.level }])),
    record_count: records.length, records,
  };
  const count = (status) => records.filter((r) => r.comparability_status === status).length;
  const manifest = {
    schema_version: "regional-history-manifest-v2.0", phase: "v2.0 Phase I — regional descriptive history",
    approval: "Owner approved safe descriptive backfills and Phase I (2026-09-29).",
    nuts_versions_in_force: NUTS_VERSIONS.map(([v, a, b]) => ({ version: v, statistical_years: [a, b === 9999 ? null : b] })),
    nuts_code_lists: { file: NUTS_CODES_PATH, sha256: sha(fs.readFileSync(path.join(root, NUTS_CODES_PATH))), versions: Object.fromEntries(Object.entries(nuts.versions).map(([v, x]) => [v, { url: x.url, response_sha256: x.response_sha256, retrieved_at: x.retrieved_at, code_count: x.codes.length }])) },
    overlap_tolerance: OVERLAP_TOLERANCE, sources, pairs,
    summary: {
      ingested_records: records.length,
      by_comparability: { comparable_stable_code: count("comparable_stable_code"), backcast_boundary_revision: count("backcast_boundary_revision"), series_break: count("series_break") },
      by_indicator: Object.fromEntries(Object.keys(INDICATORS).map((i) => [i, records.filter((r) => r.indicator === i).length])),
      not_ingested: pairs.filter((p) => p.status !== "ingested").reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; }, {}),
    },
  };
  return { history, manifest };
}

export function writeHistory(history, file) {
  const { records, ...header } = history;
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, "");
  fs.writeFileSync(file, `${head},\n  "records": [\n${records.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]\n}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { history, manifest } = await build();
  if (offline) { const prior = read(REGIONAL_MANIFEST_PATH); manifest.sources = manifest.sources.map((s) => ({ ...s, retrieved_at: prior.sources.find((p) => p.key === s.key)?.retrieved_at ?? null, http_status: prior.sources.find((p) => p.key === s.key)?.http_status ?? null })); }
  writeHistory(history, path.join(root, REGIONAL_HISTORY_PATH));
  fs.writeFileSync(path.join(root, REGIONAL_MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ records: history.record_count, ...manifest.summary }, null, 1));
}
