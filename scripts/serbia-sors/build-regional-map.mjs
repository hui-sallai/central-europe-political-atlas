// Serbia regional map (owner approval 2026-11-14, "批准 A 和 B", A): Serbian NSTJ3 areas from the Eurostat GISCO
// NUTS 2024 level-3 file, joined by code to the SORS NSTJ3 records already stored in
// src/data/serbia/serbia_descriptive_history_regional.json. Writes Serbia's artifacts only; other countries' files are
// left byte-identical. Offline: pass the GISCO file retrieved from gisco-services.ec.europa.eu; its SHA-256 must equal
// the one recorded in docs/serbia-integration/regional_geometry_evidence_2026-11-14.json.
//
// Outputs:
//   public/data/boundaries/v086/serbia_nstj3_gisco_2024.geojson   25 NSTJ3 areas (geometry unchanged from GISCO)
//   public/data/boundaries/v086/region-code-map.json              Serbian records replaced (NSTJ / NSTJ3 codes)
//   public/data/boundaries/v086/spatial-boundary-manifest.json    Serbian record replaced
//   public/data/regional/v089/map-observations/serbia.json        SORS population on 1 January, NSTJ3, 2021–2024
// Then run scripts/build-spatial-data-v087.mjs (offline) to regenerate the licence, QA and display records.
//
// Usage: node scripts/serbia-sors/build-regional-map.mjs --gisco <NUTS_RG_01M_2024_4326_LEVL_3.geojson>
import fs from "node:fs";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const giscoPath = args[args.indexOf("--gisco") + 1];
if (!args.includes("--gisco") || !giscoPath) { console.error("--gisco <path> required"); process.exit(1); }
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

const evidence = read("docs/serbia-integration/regional_geometry_evidence_2026-11-14.json");
const raw = fs.readFileSync(giscoPath);
const giscoSha = crypto.createHash("sha256").update(raw).digest("hex");
if (giscoSha !== evidence.geometry_source.sha256) { console.error(`GISCO file sha256 ${giscoSha} differs from the recorded evidence ${evidence.geometry_source.sha256}`); process.exit(1); }

const SOURCE_URL = evidence.geometry_source.url;
const RETRIEVED = evidence.retrieved_on;
const YEARS = ["2021", "2022", "2023", "2024"]; // the regional map's year frame (src/lib/regionObservations.ts)
// NSTJ3 code -> existing Atlas region slug (region ids serbia_<slug> already used by the profile and project locations).
const SLUG = {
  RS110: "belgrade", RS121: "west-backa", RS122: "south-banat", RS123: "south-backa", RS124: "north-banat", RS125: "north-backa",
  RS126: "central-banat", RS127: "srem", RS211: "zlatibor", RS212: "kolubara", RS213: "macva", RS214: "moravica", RS215: "pomoravlje",
  RS216: "rasina", RS217: "raska", RS218: "sumadija", RS221: "bor", RS222: "branicevo", RS223: "zajecar", RS224: "jablanica",
  RS225: "nisava", RS226: "pirot", RS227: "podunavlje", RS228: "pcinja", RS229: "toplica",
};
const regionId = (code) => `serbia_${SLUG[code].replace(/-/g, "_")}`;

// 1. Geometry: GISCO Serbian level-3 units, coordinates untouched; NSTJ labels added.
const gisco = JSON.parse(raw);
const features = gisco.features.filter((f) => f.properties.CNTR_CODE === "RS" && f.properties.LEVL_CODE === 3)
  .sort((a, b) => a.properties.NUTS_ID.localeCompare(b.properties.NUTS_ID))
  .map((f) => {
    const code = f.properties.NUTS_ID;
    if (!SLUG[code]) throw new Error(`no Atlas region for ${code}`);
    return { ...f, properties: { ...f.properties, region_id: regionId(code), region_code: code, region_name: f.properties.NAME_LATN.trim(), classification_system: "NSTJ", statistical_level: "NSTJ3", source_dataset: "Eurostat GISCO NUTS 2024 (Serbian statistical units, labelled NSTJ3)", geometry_version: "NUTS 2024 / 1:1M / EPSG:4326", source_url: SOURCE_URL, attribution: "European Commission - Eurostat/GISCO" } };
  });
if (features.length !== 25 || new Set(features.map((f) => f.properties.region_id)).size !== 25) throw new Error("expected 25 distinct Serbian NSTJ3 areas");
const geometryFile = "public/data/boundaries/v086/serbia_nstj3_gisco_2024.geojson";
fs.writeFileSync(geometryFile, JSON.stringify({ type: "FeatureCollection", name: "serbia NSTJ3", features }, null, 2));

// 2. Region-code map: replace Serbian records only.
const codeMapPath = "public/data/boundaries/v086/region-code-map.json";
const codeMap = read(codeMapPath);
codeMap.records = [...codeMap.records.filter((r) => r.country_id !== "serbia"), ...features.map((f) => ({
  country_id: "serbia", region_id: f.properties.region_id, region_code: f.properties.region_code, classification_system: "NSTJ", admin_level: "NSTJ3",
  source: "Eurostat GISCO NUTS 2024", source_url: SOURCE_URL, match_status: "one_to_one_matched",
}))];
write(codeMapPath, codeMap);

// 3. Boundary manifest: replace the Serbian record (the OpenStreetMap ADM1 file stays on disk for the home outline only).
const manifestPath = "public/data/boundaries/v086/spatial-boundary-manifest.json";
const manifest = read(manifestPath);
const serbiaManifest = {
  country_id: "serbia", classification_system: "NSTJ", admin_level: "NSTJ3", source_name: "Eurostat GISCO NUTS 2024",
  source_url: SOURCE_URL, license_url: evidence.geometry_source.terms_page, attribution: "European Commission - Eurostat/GISCO",
  geometry_file: geometryFile, coordinate_system: "EPSG:4326", expected_feature_count: 25, actual_feature_count: features.length,
  mapped_region_count: features.length, missing_region_count: 0, duplicate_region_id_count: 0, invalid_geometry_count: 0,
  source_verified: true, license_checked: true, topology_checked: false, region_id_one_to_one_match: true,
  public_display_ready: false, is_ready_for_display: false, status: "geometry_mapped_pending_country_gate",
  geometry_sha256: giscoSha, retrieved_on: RETRIEVED,
  notes: "Serbian statistical units from the GISCO NUTS 2024 file, labelled NSTJ3 areas (oblasti), not EU NUTS regions; codes equal SORS NSTJ codes 25/25. Scope follows the sources (25 areas with SORS data and RS geometry); no position on territorial status. Display gate decided in v0.87.",
};
manifest.records = manifest.records.map((r) => (r.country_id === "serbia" ? serbiaManifest : r));
write(manifestPath, manifest);

// 4. Map observations: SORS population on 1 January (dataset 18010403IND01), NSTJ3, map years only. Values unchanged.
const sors = read("src/data/serbia/serbia_descriptive_history_regional.json");
const src = sors.series_sources.find((s) => s.series === "regional_population_1_january");
const byKey = new Map(sors.records.filter((r) => r.series === "regional_population_1_january" && r.statistical_level === "NSTJ3").map((r) => [`${r.territory_code}|${r.period}`, r]));
const records = [];
for (const f of features) for (const year of YEARS) {
  const r = byKey.get(`${f.properties.region_code}|${year}`);
  if (!r || r.normalized_value === null) continue; // missing stays missing
  records.push({
    region_observation_id: `${f.properties.region_id}_regional_population_${year}`, region_id: f.properties.region_id, country_id: "serbia",
    region_indicator_id: "regional_population", year, period_type: "annual", value: r.normalized_value, unit: "人", value_status: "正式数据",
    source_id: "sors_18010403IND01", source_name: "Statistical Office of the Republic of Serbia (SORS / RZS)", source_url: src.source_url,
    source_reliability: "A", source_status: "官方来源", is_official_data: true, is_pending: false, is_calculated: false, is_manual: false,
    is_structural_sample: false, is_in_map_layer: true, is_in_region_comparison: true, is_in_future_model_candidate: false, missing_reason: "",
    calculation_method: `Official SORS observation: population on 1 January, dataset ${src.source_dataset}, ${r.territory_code} (${r.statistical_level}), SORS status ${r.sors_status}.`,
    last_updated: RETRIEVED,
    notes: "NSTJ3 area (oblast), not an EU NUTS region. Comparable within Serbia only: SORS regional series are not certified comparable with Eurostat regional population (cross_country_comparable=false).",
    source: "Statistical Office of the Republic of Serbia (SORS / RZS)", status: "正式数据", updated_at: RETRIEVED,
    territory_code: r.territory_code, classification_version: r.classification_version, sors_record_id: r.id, comparison_scope: "within_country_only",
  });
}
write("public/data/regional/v089/map-observations/serbia.json", { schema_version: "regional-map-observations-v0.89", generated_at: RETRIEVED, country_id: "serbia", comparison_scope: "within_country_only", attribution: sors.attribution, neutrality_note: sors.neutrality_note, record_count: records.length, records });
console.log(JSON.stringify({ features: features.length, observations: records.length, years: YEARS, gisco_sha256: giscoSha }));
