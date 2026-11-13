// Serbia regional geometry evidence (read-only; writes one evidence JSON, admits nothing).
// Checks whether the Eurostat GISCO NUTS 2024 level-3 file contains polygons whose codes equal the SORS NSTJ3
// territory codes already stored in src/data/serbia/serbia_descriptive_history_regional.json.
// Usage: node scripts/serbia-integration/regional-geometry-evidence.mjs --gisco <NUTS_RG_01M_2024_4326_LEVL_3.geojson>
//        [--retrieved YYYY-MM-DD]
// The GISCO file comes from gisco-services.ec.europa.eu (registered host, automation allowed) and is not committed.
import fs from "node:fs";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const arg = (n, d = null) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const giscoPath = arg("gisco");
if (!giscoPath) { console.error("--gisco <path> required"); process.exit(1); }
const retrieved = arg("retrieved", new Date().toISOString().slice(0, 10));
const raw = fs.readFileSync(giscoPath);
const gisco = JSON.parse(raw);
const sors = JSON.parse(fs.readFileSync("src/data/serbia/serbia_descriptive_history_regional.json", "utf8"));

const rsFeatures = gisco.features.filter((f) => f.properties.CNTR_CODE === "RS");
const giscoUnits = rsFeatures.map((f) => ({ code: f.properties.NUTS_ID, name_latn: f.properties.NAME_LATN.trim(), level: f.properties.LEVL_CODE, geometry_type: f.geometry.type })).sort((a, b) => a.code.localeCompare(b.code));
const nstj3 = new Map();
for (const r of sors.records.filter((r) => r.statistical_level === "NSTJ3")) {
  const e = nstj3.get(r.territory_code) ?? { series: {}, first: r.period, last: r.period };
  e.series[r.series] = (e.series[r.series] ?? 0) + 1;
  if (r.period < e.first) e.first = r.period;
  if (r.period > e.last) e.last = r.period;
  nstj3.set(r.territory_code, e);
}
const giscoCodes = new Set(giscoUnits.map((u) => u.code));
const sorsCodes = [...nstj3.keys()].sort();
const join = giscoUnits.map((u) => ({ ...u, sors_name: sors.territory_names?.[u.code] ?? null, sors_records: nstj3.get(u.code)?.series ?? null, sors_period: nstj3.has(u.code) ? `${nstj3.get(u.code).first}..${nstj3.get(u.code).last}` : null }));

const out = {
  schema_version: "serbia-regional-geometry-evidence-v1",
  status: "evidence_only_not_admitted",
  retrieved_on: retrieved,
  geometry_source: {
    provider: "European Commission - Eurostat/GISCO",
    dataset: "NUTS 2024, 1:1 million, EPSG:4326, level 3",
    url: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_3.geojson",
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
    feature_count_total: gisco.features.length,
    terms_page: "https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units",
    terms_summary: "Non-exclusive, non-transferable right to use and process; no commercial use; source acknowledged; notice '© EuroGeographics for the administrative boundaries' visible. No country-specific carve-out stated.",
    existing_licence_record: "gisco_nuts_2024_public_research (covered_countries does not include serbia)",
  },
  classification_note: "GISCO distributes these units in its NUTS 2024 files for a candidate country; their codes equal SORS NSTJ codes. The Atlas would label them NSTJ3 areas (oblasti), not EU NUTS regions.",
  geographic_scope_note: "Scope follows the sources: SORS publishes NSTJ3 data for 25 areas and GISCO RS geometry contains the same 25 units. No position on territorial status is taken; units without published data and without RS geometry are neither drawn nor imputed.",
  counts: { gisco_rs_level3: giscoUnits.length, sors_nstj3_codes: sorsCodes.length, matched: giscoUnits.filter((u) => nstj3.has(u.code)).length, gisco_without_sors: giscoUnits.filter((u) => !nstj3.has(u.code)).map((u) => u.code), sors_without_gisco: sorsCodes.filter((c) => !giscoCodes.has(c)) },
  units: join,
  required_decisions: [
    "Extend licence record gisco_nuts_2024_public_research to serbia (rights decision; not extended automatically).",
    "Approve a governance amendment for the hash-frozen regional map modules (src/lib/regions.ts, regionBoundaries.ts, regionObservations.ts, spatialDataV086.ts, boundaryMap.ts, regionSources.ts, platformStatus.ts) and the v0.89 map-observation store.",
    "Approve Serbia's public display decision (public/data/boundaries/v087/public-display-decisions.json) for named layers; cross-country regional comparison stays off because SORS regional series are cross_country_comparable=false.",
  ],
};
fs.writeFileSync("docs/serbia-integration/regional_geometry_evidence_2026-11-14.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out.counts), out.geometry_source.sha256);
