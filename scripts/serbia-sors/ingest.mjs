// Serbia (SORS) descriptive integration — owner-approved 2026-09-30: safe descriptive series, EUR conversion via BIS.
// Writes three Serbia-only stores in src/data/serbia/ (annual, monthly/quarterly, regional) plus a manifest. Nothing is
// added to observations.json, the frozen HF/macro files, the regional map files or any model input.
//   - series, statuses and cross-country flags come from serbia_indicator_mapping.json (single source of truth);
//   - every record keeps the original SORS value, unit and status next to the normalised value and transformation;
//   - SORS missing-value statuses stay missing (records absent), nothing is zero-filled;
//   - comparability per year: official B/D flags and detected unflagged level shifts start a new segment;
//   - EUR conversion uses BIS monthly averages (RSD per USD ÷ EUR per USD), averaged per calendar year; converted
//     series must agree with the existing Eurostat Serbia records (2021–2025) or they are held.
// Usage: node scripts/serbia-sors/ingest.mjs [--offline]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/serbia");
const rawDir = path.join(dir, "raw");
let offline = process.argv.includes("--offline");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const STORES = { annual: "src/data/serbia/serbia_descriptive_history_annual.json", monthly: "src/data/serbia/serbia_descriptive_history_monthly.json", regional: "src/data/serbia/serbia_descriptive_history_regional.json" };
export const MANIFEST = "src/data/serbia/serbia_ingestion_manifest.json";
const API = (id) => `https://opendata.stat.gov.rs/data/WcfJsonRestService.Service1.svc/dataset/${id}/3/json`;
const UA = "Mozilla/5.0 (compatible; CentralEuropePoliticalAtlas/2.0; +https://hy-central-europe-analysis.org/)";
const SORS = "Statistical Office of the Republic of Serbia (SORS / RZS)";
const FIRST_YEAR = 2000;
const NEUTRALITY_NOTE = "Regional units follow the territorial classification used by the source institution. Their inclusion or labeling in this dataset does not constitute a political or legal position on territorial status.";

// ---------------------------------------------------------------------------------------------------------------
// Minimal ZIP reader (SORS serves some large datasets as a single-entry ZIP).
function unzipSingle(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  const cd = buf.readUInt32LE(eocd + 16);
  const method = buf.readUInt16LE(cd + 10), csize = buf.readUInt32LE(cd + 20), nameLen = buf.readUInt16LE(cd + 28), local = buf.readUInt32LE(cd + 42);
  const name = buf.subarray(cd + 46, cd + 46 + nameLen).toString("utf8");
  const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
  const data = buf.subarray(start, start + csize);
  return { name, bytes: method === 8 ? zlib.inflateRawSync(data) : data };
}

// ---------------------------------------------------------------------------------------------------------------
// Series to ingest. `mapping` names the entry in serbia_indicator_mapping.json that governs status/comparability.
const S = (o) => o;
export const SERIES = [
  // national annual
  S({ key: "real_gdp_growth", store: "annual", mapping: "real_gdp_growth", dataset: "09020104IND01", where: { IDUpotrebaBDP: "00", IDVrPod: "5" }, unit: "%", label: "Real GDP growth (SORS, % vs previous year)" }),
  S({ key: "gdp_current_rsd", store: "annual", mapping: "gdp_current_eur", dataset: "09020104IND01", where: { IDUpotrebaBDP: "00", IDVrPod: "1" }, unit: "mill. RSD", toEur: true, atlasCheck: "gdp_current_eur", label: "GDP at current prices" }),
  S({ key: "exports_goods_services_rsd", store: "annual", mapping: "exports_goods_services", dataset: "09020104IND01", whereByName: { field: "nUpotrebaBDP", pattern: "^Exports", id: "IDUpotrebaBDP" }, where: { IDVrPod: "1" }, unit: "mill. RSD", toEur: true, atlasCheck: "exports_goods_services", label: "Exports of goods and services (national accounts)" }),
  S({ key: "imports_goods_services_rsd", store: "annual", mapping: "imports_goods_services", dataset: "09020104IND01", whereByName: { field: "nUpotrebaBDP", pattern: "^Imports", id: "IDUpotrebaBDP" }, where: { IDVrPod: "1" }, unit: "mill. RSD", toEur: true, atlasCheck: "imports_goods_services", label: "Imports of goods and services (national accounts)" }),
  S({ key: "manufacturing_share_gdp", store: "annual", mapping: "manufacturing_share_gdp", dataset: "0902010301IND01", where: { IDKD08: "C", IDVrPod: "2" }, unit: "% of GDP", label: "Manufacturing (NACE C) gross value added, % of GDP" }),
  S({ key: "unemployment_rate", store: "annual", mapping: "unemployment_rate", dataset: "240003020102IND03", where: { IDPol: "0", IDStarGrupa: "15-74" }, unit: "%", label: "LFS unemployment rate, 15–74" }),
  S({ key: "employment_rate", store: "annual", mapping: "employment_rate (Phase G review queue)", dataset: "240003020102IND02", where: { IDPol: "0", IDStarGrupa: "20-64" }, unit: "%", label: "LFS employment rate, 20–64" }),
  S({ key: "population_1_january", store: "annual", mapping: "population", dataset: "18010403IND01", where: { IDPol: "0", IDStarost: "0" }, territory: "RS", unit: "persons", detectShifts: true, label: "Population on 1 January" }),
  S({ key: "population_estimate_sors", store: "annual", mapping: "population (1961–2010 annual estimates)", dataset: "180304IND02", where: {}, territory: "RS", unit: "persons", detectShifts: true, label: "Population estimate (SORS long series)" }),
  S({ key: "average_net_earnings", store: "annual", mapping: "average_earnings (Serbia-specific)", dataset: "2403040401IND01", where: {}, territory: "RS", unit: "RSD per month", label: "Average monthly net earnings (annual average)" }),
  S({ key: "average_gross_earnings", store: "annual", mapping: "average_earnings (Serbia-specific)", dataset: "2403040401IND02", where: {}, territory: "RS", unit: "RSD per month", label: "Average monthly gross earnings (annual average)" }),
  S({ key: "goods_exports_usd", store: "annual", mapping: "goods_trade (Serbia-specific)", dataset: "1701IND01", where: { IDVrPod: "1" }, territory: null, unit: "million USD", label: "Merchandise exports (goods, customs basis)" }),
  S({ key: "goods_imports_usd", store: "annual", mapping: "goods_trade (Serbia-specific)", dataset: "1701IND01", where: { IDVrPod: "2" }, territory: null, unit: "million USD", label: "Merchandise imports (goods, customs basis)" }),
  S({ key: "rd_expenditure_gdp", store: "annual", mapping: "rd_expenditure_gdp (review queue)", dataset: "100109IND01", where: {}, territory: "RS", unit: "% of GDP", label: "Total R&D expenditure, % of GDP" }),
  // monthly / quarterly
  S({ key: "industrial_production_index", store: "monthly", mapping: "industrial_production_index", dataset: "060001IND02", where: { IDKD08: "0" }, territory: null, monthly: true, unit: "index 2021=100 (NSA)", label: "Industrial production, total (not seasonally adjusted)" }),
  S({ key: "cpi_index_2006", store: "monthly", mapping: "serbia_cpi_index (Serbia-specific, base 2006=100 IND01)", dataset: "03010601IND01", where: { IDCOICOP: "0000" }, monthly: true, unit: "index 2006=100", label: "Consumer price index, total (national CPI, not HICP)" }),
  S({ key: "cpi_annual_index", store: "monthly", mapping: "serbia_cpi_annual_rate (Serbia-specific, y/y index IND03)", dataset: "03010601IND03", where: { IDCOICOP: "0000" }, monthly: true, unit: "index, same month previous year = 100", label: "Consumer prices, same month previous year = 100 (national CPI, not HICP)" }),
  S({ key: "lfs_unemployment_quarterly", store: "monthly", mapping: "lfs_unemployment_quarterly (Serbia-specific)", dataset: "240003010102IND03", where: { IDPol: "0", IDStarGrupa: "15-74" }, quarterly: true, unit: "%", label: "LFS unemployment rate 15–74, quarterly (NSA)" }),
  S({ key: "average_net_earnings_monthly", store: "monthly", mapping: "average_earnings_monthly (Serbia-specific)", dataset: "2403040101IND01", where: {}, territory: "RS", monthly: true, unit: "RSD", label: "Average net earnings, monthly" }),
  S({ key: "average_gross_earnings_monthly", store: "monthly", mapping: "average_earnings_monthly (Serbia-specific)", dataset: "2403040101IND02", where: {}, territory: "RS", monthly: true, unit: "RSD", label: "Average gross earnings, monthly" }),
  S({ key: "retail_trade_volume_sa", store: "monthly", mapping: "retail_trade_volume (Serbia-specific)", dataset: "210105IND02", where: { IDKD08STS: "47", IDDesezoniranjeVS: "Y" }, monthly: true, unit: "index 2021=100 (constant prices, SA)", label: "Retail trade turnover volume, seasonally adjusted" }),
  S({ key: "industrial_producer_prices_yoy", store: "monthly", mapping: "producer_prices_industry (Serbia-specific)", dataset: "030201010101IND01", where: { IDKD08: "0", IDIndeksVrsta: "3" }, monthly: true, unit: "index, same month previous year = 100", label: "Industrial producer prices, total" }),
  S({ key: "goods_exports_eur_monthly", store: "monthly", mapping: "goods_trade_monthly (Serbia-specific)", dataset: "1702IND01", where: { IDVrPod: "2" }, territory: null, monthly: true, unit: "EUR million", label: "Merchandise exports, monthly" }),
  S({ key: "goods_imports_eur_monthly", store: "monthly", mapping: "goods_trade_monthly (Serbia-specific)", dataset: "1702IND02", where: { IDVrPod: "2" }, territory: null, monthly: true, unit: "EUR million", label: "Merchandise imports, monthly" }),
  // regional (NSTJ units and municipalities; RS national rows excluded)
  S({ key: "regional_population_1_january", store: "regional", mapping: "regional_population", dataset: "18010403IND01", where: { IDPol: "0", IDStarost: "0" }, regional: true, unit: "persons", label: "Population on 1 January" }),
  S({ key: "regional_population_estimate_sors", store: "regional", mapping: "regional_population (long series)", dataset: "180304IND02", where: {}, regional: true, unit: "persons", detectShifts: true, label: "Population estimate (SORS long series)" }),
  S({ key: "regional_unemployment_rate_2021", store: "regional", mapping: "regional_unemployment_rate", dataset: "240003020304IND01", where: { IDPol: "0", IDStarGrupa: "15-74" }, regional: true, unit: "%", segment: "LFS 2021 methodology, 15–74", label: "LFS unemployment rate 15–74 (2021+)" }),
  S({ key: "regional_unemployment_rate_2014_2020", store: "regional", mapping: "regional_unemployment_rate", dataset: "2400020102IND04", where: { IDPol: "0", IDStarGrupa: "15" }, regional: true, unit: "%", segment: "LFS 2014–2020, 15+", label: "LFS unemployment rate 15+ (2014–2020)" }),
  S({ key: "regional_employment_rate_2021", store: "regional", mapping: "regional_employment_rate", dataset: "240003020205IND01", where: { IDPol: "0", IDStarGrupa: "20-64" }, regional: true, unit: "%", segment: "LFS 2021 methodology, 20–64", label: "LFS employment rate 20–64 (2021+)" }),
  S({ key: "regional_employment_rate_2014_2020", store: "regional", mapping: "regional_employment_rate", dataset: "2400020102IND02", where: { IDPol: "0", IDStarGrupa: "15" }, regional: true, unit: "%", segment: "LFS 2014–2020, 15+", label: "LFS employment rate 15+ (2014–2020)" }),
];
const DERIVED = [
  { key: "trade_balance_rsd", mapping: "trade_balance", from: ["exports_goods_services_rsd", "imports_goods_services_rsd"], label: "Exports − imports of goods and services", atlasCheck: "trade_balance" },
];
const OVERLAP = { relative: 0.02, absolute: 0 }; // EUR conversion: allow for annual-average FX method differences

async function getBytes(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/csv" }, signal: AbortSignal.timeout(240000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return { bytes, status: response.status };
}

export async function build(options = {}) {
  if (options.offline !== undefined) offline = options.offline;
  fs.mkdirSync(rawDir, { recursive: true });
  const mapping = read("src/data/serbia/serbia_indicator_mapping.json");
  const mappingFor = (name) => [...mapping.national_and_monthly, ...mapping.regional].find((m) => m.atlas_indicator === name);
  const registry = read("src/data/serbia/serbia_regional_classification_registry.json");
  const levelOf = new Map(registry.units.map((u) => [u.source_territorial_code, u.statistical_level]));
  const municipalities = new Set();

  // --- SORS datasets: archive a filtered extract (original records, unchanged) plus the full response hash ---------
  const datasets = [...new Set(SERIES.map((s) => s.dataset))];
  const extracts = {}, sources = [];
  for (const id of datasets) {
    const file = path.join(rawDir, `${id}.extract.json`);
    const specs = SERIES.filter((s) => s.dataset === id);
    if (offline) { extracts[id] = JSON.parse(fs.readFileSync(file, "utf8")); continue; }
    const got = await getBytes(API(id));
    const zipped = got.bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const payload = zipped ? unzipSingle(got.bytes).bytes : got.bytes;
    const all = JSON.parse(payload.toString("utf8").replace(/^﻿/, ""));
    const matches = (r, spec) => {
      const where = { ...spec.where };
      if (spec.whereByName) { const hit = all.find((x) => new RegExp(spec.whereByName.pattern, "i").test(String(x[spec.whereByName.field]))); where[spec.whereByName.id] = hit?.[spec.whereByName.id]; }
      return Object.entries(where).every(([k, v]) => String(r[k]) === String(v));
    };
    const kept = all.filter((r) => specs.some((spec) => matches(r, spec)));
    extracts[id] = { dataset_id: id, source_url: API(id), retrieved_at: new Date().toISOString(), http_status: got.status, response_container: zipped ? "zip" : "json", response_bytes: got.bytes.length, response_sha256: sha(got.bytes), response_record_count: all.length, extract_record_count: kept.length, records: kept };
    fs.writeFileSync(file, JSON.stringify(extracts[id]) + "\n");
  }
  for (const id of datasets) { const e = extracts[id]; sources.push({ dataset_id: id, source_url: e.source_url, retrieved_at: e.retrieved_at, http_status: e.http_status, response_container: e.response_container, response_bytes: e.response_bytes, response_sha256: e.response_sha256, response_record_count: e.response_record_count, extract_file: path.relative(root, path.join(rawDir, `${id}.extract.json`)), extract_sha256: sha(fs.readFileSync(path.join(rawDir, `${id}.extract.json`))), extract_record_count: e.extract_record_count }); }

  // --- BIS RSD per EUR, calendar-year averages of monthly averages ------------------------------------------------
  const bisFile = path.join(rawDir, "bis_rsd_per_eur.extract.json");
  let bis;
  if (offline) bis = JSON.parse(fs.readFileSync(bisFile, "utf8"));
  else {
    const parse = (text) => { const [head, ...lines] = text.trim().split(/\r?\n/); const cols = head.split(","); const i = cols.indexOf("TIME_PERIOD"), v = cols.indexOf("OBS_VALUE"); return lines.map((l) => l.split(",")).map((c) => [c[i], Number(c[v])]).filter(([, x]) => Number.isFinite(x)); };
    const series = {};
    for (const key of ["M.RS.RSD.A", "M.XM.EUR.A"]) { const url = `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_XRU/1.0/${key}?startPeriod=1999-01&format=csv`; const got = await getBytes(url); series[key] = { url, retrieved_at: new Date().toISOString(), sha256: sha(got.bytes), monthly: Object.fromEntries(parse(got.bytes.toString("utf8"))) }; }
    bis = { source: "BIS WS_XRU (monthly averages); RSD per EUR = (RSD per USD) / (EUR per USD)", series };
    fs.writeFileSync(bisFile, JSON.stringify(bis) + "\n");
  }
  const rsdPerEur = {};
  for (let y = 1999; y <= 2026; y += 1) {
    const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`).filter((m) => bis.series["M.RS.RSD.A"].monthly[m] && bis.series["M.XM.EUR.A"].monthly[m]);
    if (months.length === 12) rsdPerEur[y] = months.reduce((n, m) => n + bis.series["M.RS.RSD.A"].monthly[m] / bis.series["M.XM.EUR.A"].monthly[m], 0) / 12;
  }
  // One-month steps above 50% (e.g. the December 2000 devaluation) make a calendar-year average meaningless for the
  // year containing the step: EUR conversion is withheld for such years (original RSD values are kept).
  const months = Object.keys(bis.series["M.RS.RSD.A"].monthly).filter((m) => bis.series["M.XM.EUR.A"].monthly[m]).sort();
  const cross = (m) => bis.series["M.RS.RSD.A"].monthly[m] / bis.series["M.XM.EUR.A"].monthly[m];
  const fxSteps = months.slice(1).map((m, i) => ({ month: m, change_pct: (cross(m) / cross(months[i]) - 1) * 100 })).filter((x) => Math.abs(x.change_pct) > 50);
  const fxWithheldYears = new Set(fxSteps.map((x) => Number(x.month.slice(0, 4))));
  sources.push({ dataset_id: "BIS WS_XRU M.RS.RSD.A / M.XM.EUR.A", source_url: Object.values(bis.series).map((s) => s.url).join(" ; "), retrieved_at: bis.series["M.RS.RSD.A"].retrieved_at, extract_file: path.relative(root, bisFile), extract_sha256: sha(fs.readFileSync(bisFile)), response_sha256: Object.values(bis.series).map((s) => s.sha256).join(" ; "), note: "EUR conversion rate (owner decision 2026-09-30: use BIS)" });

  // --- Build series ---------------------------------------------------------------------------------------------
  const atlasSerbia = read("src/data/observations/observations.json").records.filter((r) => r.country_slug === "serbia");
  const atlasValue = (indicator, year) => atlasSerbia.find((r) => r.indicator === indicator && r.year === year)?.value ?? null;
  const records = { annual: [], monthly: [], regional: [] };
  const territoryNames = {}, statusLegend = {};
  const CLASSIFICATION = `NSTJ@${registry.audit_date}`; // = NSTJ and municipality codes as served by SORS code lists on that date
  // source_year = year of the dataset's latest SORS update (catalog snapshot in the source audit), else retrieval year.
  const catalog = new Map(read("src/data/serbia/serbia_official_data_source_audit.json").datasets.map((d) => [d.dataset_id, d.latest_update]));
  const sourceYear = (e) => { const u = catalog.get(e.dataset_id); return u ? Number(u.split(".").at(-1)) : Number(String(e.retrieved_at ?? registry.audit_date).slice(0, 4)); };
  const seriesInfo = [], built = {};
  const periodOf = (r) => (r.mes === "00" ? r.god : /^K/.test(r.mes) ? `${r.god}-Q${r.mes.slice(1)}` : `${r.god}-${r.mes}`);
  for (const spec of SERIES) {
    const map = mappingFor(spec.mapping);
    if (!map) throw new Error(`${spec.key}: mapping ${spec.mapping} missing`);
    if (!["definition_compatible", "exact_match", "descriptive_only", "requires_transformation"].includes(map.status)) throw new Error(`${spec.key}: mapping status ${map.status} is not approved for ingestion`);
    const all = extracts[spec.dataset].records;
    let where = { ...spec.where };
    if (spec.whereByName) { const hit = all.find((x) => new RegExp(spec.whereByName.pattern, "i").test(String(x[spec.whereByName.field]))); where[spec.whereByName.id] = hit?.[spec.whereByName.id]; }
    const rows = all.filter((r) => Object.entries(where).every(([k, v]) => String(r[k]) === String(v)))
      .filter((r) => spec.regional ? r.IDTer && r.IDTer !== "RS" : spec.territory === undefined ? (r.IDTer ?? "RS") === "RS" || r.IDTer === "6" : spec.territory === null ? true : r.IDTer === spec.territory)
      .filter((r) => spec.monthly ? /^\d\d$/.test(r.mes) && r.mes !== "00" : spec.quarterly ? /^K\d$/.test(r.mes) : r.mes === "00")
      .filter((r) => Number(r.god) >= FIRST_YEAR);
    const groups = new Map();
    for (const r of rows) { const t = spec.regional ? r.IDTer : "RS"; if (!groups.has(t)) groups.set(t, []); groups.get(t).push(r); }
    const out = [], missing = [];
    for (const [territory, list] of groups) {
      list.sort((a, b) => periodOf(a).localeCompare(periodOf(b)));
      const observed = list.filter((r) => r.vrednost !== null && r.vrednost !== undefined);
      missing.push(...list.filter((r) => r.vrednost === null || r.vrednost === undefined).map((r) => `${territory}:${periodOf(r)}:${r.IDStatusPodatka}`));
      // Segment starts: official B (break) / D (definition differs → next period) flags and unflagged level shifts (annual).
      const starts = new Set(observed.filter((r) => r.IDStatusPodatka === "B").map((r) => periodOf(r)));
      observed.forEach((r, i) => { if (r.IDStatusPodatka === "D" && observed[i + 1]) starts.add(periodOf(observed[i + 1])); });
      if (spec.detectShifts) observed.forEach((r, i) => { const prev = observed[i - 1]; if (prev && prev.vrednost && Math.abs(r.vrednost / prev.vrednost - 1) > 0.02) starts.add(periodOf(r)); });
      const lastStart = [...starts].sort().at(-1) ?? null;
      for (const r of observed) {
        const period = periodOf(r);
        const withheld = spec.toEur && fxWithheldYears.has(Number(r.god));
        const eur = spec.toEur && !withheld && r.mes === "00" && rsdPerEur[Number(r.god)] ? r.vrednost / rsdPerEur[Number(r.god)] : null;
        const record = {
          id: `serbia:${spec.key}:${territory}:${period}`, series: spec.key, territory_code: territory, statistical_level: spec.regional ? (levelOf.get(territory) ?? "municipality_or_city") : "national", period,
          original_value: r.vrednost, original_unit: spec.unit, normalized_value: spec.toEur ? (eur === null ? null : Number(eur.toFixed(4))) : r.vrednost, normalized_unit: spec.toEur ? spec.unit.replace("RSD", "EUR") : spec.unit,
          ...(spec.toEur ? { transformation: withheld ? { method: "EUR conversion withheld", reason: `BIS RSD per EUR moves ${fxSteps.filter((x) => Number(x.month.slice(0, 4)) === Number(r.god)).map((x) => `${x.change_pct.toFixed(0)}% in ${x.month}`).join(", ")}; a calendar-year average rate is not meaningful` } : { method: "divide by calendar-year average RSD per EUR (BIS)", rate: Number(rsdPerEur[Number(r.god)].toFixed(6)) } } : {}),
          sors_status: r.IDStatusPodatka, comparability_status: lastStart && period < lastStart ? "before_series_break" : "comparable_within_segment", ...(lastStart ? { segment_start: lastStart } : {}),
          cross_country_comparable: map.cross_country_comparable, source_ref: seriesInfo.length,
        };
        if (spec.regional) { if (!levelOf.has(territory)) municipalities.add(territory); territoryNames[territory] = r.nTer; Object.assign(record, { classification_version: CLASSIFICATION, source_year: sourceYear(extracts[spec.dataset]), observation_year: Number(r.god) }); }
        statusLegend[r.IDStatusPodatka] = r.nStatusPodatka;
        out.push(record);
      }
    }
    // EUR-converted series: gate against the existing Eurostat Serbia record.
    let overlapCheck = null;
    if (spec.atlasCheck) {
      const pairs = out.map((x) => ({ year: Number(x.period), eurostat: atlasValue(spec.atlasCheck, Number(x.period)), converted: x.normalized_value })).filter((p) => p.eurostat !== null && p.converted !== null);
      const failed = pairs.filter((p) => Math.abs(p.converted - p.eurostat) > Math.max(OVERLAP.absolute, OVERLAP.relative * Math.abs(p.eurostat))).map((p) => p.year);
      overlapCheck = { pairs: pairs.map((p) => ({ ...p, converted: Number(p.converted.toFixed(1)), rel_diff_pct: Number(((p.converted / p.eurostat - 1) * 100).toFixed(2)) })), tolerance: OVERLAP, failed_years: failed, result: pairs.length ? (failed.length ? "fail" : "pass") : "no_overlap" };
    }
    const held = overlapCheck?.result === "fail";
    seriesInfo.push({ source_ref: seriesInfo.length, series: spec.key, label: spec.label, store: spec.store, source_institution: SORS, source_dataset: spec.dataset, original_code: where, source_url: API(spec.dataset), mapping: spec.mapping, mapping_status: map.status, cross_country_comparable: map.cross_country_comparable, model_role: map.model_role, segment: spec.segment ?? null, territorial_units: groups.size, ingested: held ? 0 : out.length, missing_status_records: missing.length, overlap_check: overlapCheck, status: held ? "held_overlap_failed" : "ingested" });
    if (!held) records[spec.store].push(...out);
    built[spec.key] = held ? null : out;
  }
  for (const d of DERIVED) {
    const [a, b] = d.from.map((k) => built[k]);
    if (!a || !b) { seriesInfo.push({ series: d.key, status: "held_inputs_not_ingested" }); continue; }
    const byPeriod = new Map(b.map((x) => [x.period, x]));
    const out = a.filter((x) => byPeriod.has(x.period)).map((x) => { const y = byPeriod.get(x.period); return { ...x, id: `serbia:${d.key}:RS:${x.period}`, series: d.key, original_value: Number((x.original_value - y.original_value).toFixed(4)), normalized_value: x.normalized_value !== null && y.normalized_value !== null ? Number((x.normalized_value - y.normalized_value).toFixed(4)) : null, transformation: { ...x.transformation, derived: `${d.from[0]} − ${d.from[1]}` }, sors_status: [x.sors_status, y.sors_status].join("/"), cross_country_comparable: mappingFor(d.mapping).cross_country_comparable, source_ref: seriesInfo.length }; });
    const pairs = out.map((x) => ({ year: Number(x.period), eurostat: atlasValue(d.atlasCheck, Number(x.period)), converted: x.normalized_value })).filter((p) => p.eurostat !== null && p.converted !== null);
    seriesInfo.push({ source_ref: seriesInfo.length, series: d.key, label: d.label, store: "annual", source_institution: SORS, source_dataset: "09020104IND01 (derived)", original_code: { derived_from: d.from.map((k) => seriesInfo.find((x) => x.series === k)?.original_code) }, source_url: API("09020104IND01"), mapping: d.mapping, mapping_status: mappingFor(d.mapping).status, cross_country_comparable: mappingFor(d.mapping).cross_country_comparable, model_role: "descriptive_only", ingested: out.length, overlap_check: { pairs: pairs.map((p) => ({ ...p, converted: Number(p.converted.toFixed(1)) })), note: "balance of two converted aggregates; relative tolerance not meaningful for a small difference, shown for transparency" }, status: "ingested" });
    records.annual.push(...out);
  }
  // GDP per capita (EUR): GDP (EUR) / average of 1 January population in t and t+1 — Eurostat nama_10_pc basis.
  {
    const gdp = built.gdp_current_rsd, pop = built.population_1_january;
    if (gdp && pop) {
      const popBy = new Map(pop.map((x) => [x.period, x.original_value]));
      const out = gdp.filter((x) => popBy.has(x.period) && popBy.has(String(Number(x.period) + 1)) && x.normalized_value !== null).map((x) => { const avg = (popBy.get(x.period) + popBy.get(String(Number(x.period) + 1))) / 2; return { ...x, id: `serbia:gdp_per_capita_eur:RS:${x.period}`, series: "gdp_per_capita_eur", original_value: Number((x.original_value * 1e6 / avg).toFixed(2)), original_unit: "RSD per person", normalized_value: Number((x.normalized_value * 1e6 / avg).toFixed(2)), normalized_unit: "EUR per person", transformation: { ...x.transformation, derived: "GDP / average of 1 January population in t and t+1", average_population: avg }, source_ref: seriesInfo.length }; });
      const pairs = out.map((x) => ({ year: Number(x.period), eurostat: atlasValue("gdp_per_capita_eur", Number(x.period)), converted: x.normalized_value })).filter((p) => p.eurostat !== null);
      const failed = pairs.filter((p) => Math.abs(p.converted - p.eurostat) > OVERLAP.relative * Math.abs(p.eurostat)).map((p) => p.year);
      const held = pairs.length > 0 && failed.length > 0;
      seriesInfo.push({ source_ref: seriesInfo.length, series: "gdp_per_capita_eur", label: "GDP per capita, EUR", store: "annual", source_institution: SORS, source_dataset: "09020104IND01 + 18010403IND01 (derived)", original_code: { derived_from: ["gdp_current_rsd", "population_1_january"] }, source_url: `${API("09020104IND01")} ; ${API("18010403IND01")}`, mapping: "gdp_per_capita_eur", mapping_status: mappingFor("gdp_per_capita_eur").status, cross_country_comparable: mappingFor("gdp_per_capita_eur").cross_country_comparable, model_role: "descriptive_only", ingested: held ? 0 : out.length, overlap_check: { pairs: pairs.map((p) => ({ ...p, rel_diff_pct: Number(((p.converted / p.eurostat - 1) * 100).toFixed(2)) })), tolerance: OVERLAP, failed_years: failed, result: pairs.length ? (failed.length ? "fail" : "pass") : "no_overlap" }, status: held ? "held_overlap_failed" : "ingested" });
      if (!held) records.annual.push(...out);
    }
  }
  const header = (store) => ({
    schema_version: "serbia-descriptive-history-v1", store, country: "serbia", descriptive_only: true,
    model_boundary: "Serbia-only descriptive store. Not read by composite indices, scenarios, panel, VAR, LP or Panel LP models; does not change any formal sample or readiness state.",
    missing_value_policy: "SORS missing-value statuses (O, M, L) are kept as missing: those records are absent here and counted in the manifest; nothing is zero-filled.",
    attribution: "Source: Statistical Office of the Republic of Serbia (SORS), opendata.stat.gov.rs; retrieved as recorded per series; modifications: selection of series, EUR conversion (BIS rates) and derived aggregates are recorded per record.",
    ...(store === "regional" ? { neutrality_note: NEUTRALITY_NOTE, classification: "NSTJ (SORS) and municipality codes as published by SORS; not NUTS", classification_version_legend: { [`NSTJ@${registry.audit_date}`]: `SORS code lists 'Teritory - NSTJ' and 'Municipalities and cities' as served on ${registry.audit_date}` } } : {}),
    sors_status_legend: statusLegend,
    ...(store === "regional" ? { territory_names: territoryNames } : {}),
    series_sources: seriesInfo.filter((s) => s.store === store),
  });
  const stores = Object.fromEntries(Object.keys(records).map((k) => [k, { ...header(k), record_count: records[k].length, records: records[k].sort((a, b) => a.series.localeCompare(b.series) || a.territory_code.localeCompare(b.territory_code) || a.period.localeCompare(b.period)) }]));
  const manifest = {
    schema_version: "serbia-ingestion-manifest-v1", approval: "Owner approved safe descriptive ingestion and BIS for EUR conversion (2026-09-30).",
    not_ingested_by_design: [...mapping.national_and_monthly, ...mapping.regional].filter((m) => ["requires_methodological_review", "not_comparable"].includes(m.status)).map((m) => `${m.atlas_indicator}: ${m.status}`),
    sources, fx: { method: "calendar-year mean of 12 BIS monthly averages", rsd_per_eur: Object.fromEntries(Object.entries(rsdPerEur).map(([y, v]) => [y, Number(v.toFixed(6))])), one_month_steps_over_50pct: fxSteps.map((x) => ({ month: x.month, change_pct: Number(x.change_pct.toFixed(1)) })), eur_conversion_withheld_years: [...fxWithheldYears] },
    series: seriesInfo, municipality_codes_seen: municipalities.size,
    summary: Object.fromEntries(Object.entries(stores).map(([k, v]) => [k, v.record_count])),
  };
  return { stores, manifest };
}

export function writeStore(doc, file) {
  const { records, ...header } = doc;
  const head = JSON.stringify(header, null, 1).replace(/\n}$/, "");
  fs.writeFileSync(file, `${head},\n "records": [\n${records.map((r) => `  ${JSON.stringify(r)}`).join(",\n")}\n ]\n}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { stores, manifest } = await build();
  for (const [k, doc] of Object.entries(stores)) writeStore(doc, path.join(root, STORES[k]));
  fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest, null, 1) + "\n");
  console.log(JSON.stringify({ ...manifest.summary, held: manifest.series.filter((s) => s.status !== "ingested").map((s) => s.series), overlap: manifest.series.filter((s) => s.overlap_check?.pairs?.length).map((s) => [s.series, s.overlap_check.result ?? "shown", s.overlap_check.pairs.map((p) => p.rel_diff_pct ?? p.converted)]) }, null, 1));
}
