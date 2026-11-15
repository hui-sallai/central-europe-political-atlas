// Source verification register (2026-11-16). For every official table behind an established national indicator it
// records publisher, dataset identifier, access endpoint, definition, unit, frequency, territorial and historical
// coverage, release/revision status, reuse rights, required citation and compatibility with the Atlas indicator.
// Source families that the repository has not registered or not checked are listed as such (category B), never guessed.
//   --probe   one small live metadata request per Eurostat table (registered automated host ec.europa.eu; lastTimePeriod=1,
//             one country, 1.5 s apart) → docs/data-coverage/source_probe_2026-11-16.json. Nothing else is fetched.
//   (default) build docs/data-coverage/source_verification_2026-11-16.json offline from the manifests, the rights and
//             network registries and the archived probe.   --check: fail if that output would change.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
export const PROBE_JSON = "docs/data-coverage/source_probe_2026-11-16.json";
export const VERIFICATION_JSON = "docs/data-coverage/source_verification_2026-11-16.json";
const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

// Atlas indicator → official table, selection and the Atlas reading of it. Selections are the ones the archived
// extracts were requested with (annual_history_manifest / monthly_history_manifest).
const ANNUAL = {
  real_gdp_growth: { table: "nama_10_gdp", selection: "na_item=B1GQ, unit=CLV_PCH_PRE", frequency: "annual", unit: "% change on previous year (chain-linked volumes)" },
  gdp_current_eur: { table: "nama_10_gdp", selection: "na_item=B1GQ, unit=CP_MEUR", frequency: "annual", unit: "million EUR, current prices" },
  exports_goods_services: { table: "nama_10_gdp", selection: "na_item=P6, unit=CP_MEUR", frequency: "annual", unit: "million EUR, current prices" },
  imports_goods_services: { table: "nama_10_gdp", selection: "na_item=P7, unit=CP_MEUR", frequency: "annual", unit: "million EUR, current prices" },
  gdp_per_capita_eur: { table: "nama_10_pc", selection: "na_item=B1GQ, unit=CP_EUR_HAB", frequency: "annual", unit: "EUR per inhabitant" },
  gdp_per_capita_pps: { table: "nama_10_pc", selection: "na_item=B1GQ, unit=CP_PPS_EU27_2020_HAB", frequency: "annual", unit: "PPS (EU27_2020) per inhabitant" },
  manufacturing_share_gdp: { table: "nama_10_a10", selection: "na_item=B1G, nace_r2=C, unit=PC_GDP", frequency: "annual", unit: "% of GDP" },
  labour_productivity_growth: { table: "nama_10_lp_ulc", selection: "na_item=RLPR_PER, unit=PCH_PRE", frequency: "annual", unit: "% change on previous year" },
  compensation_per_employee_eur: { table: "nama_10_lp_ulc", selection: "na_item=D1_SAL_PER, unit=EUR", frequency: "annual", unit: "EUR (nominal)" },
  hicp_inflation: { table: "prc_hicp_aind", selection: "coicop=CP00, unit=RCH_A_AVG", frequency: "annual", unit: "% (annual average rate of change)" },
  energy_inflation: { table: "prc_hicp_aind", selection: "coicop=CP045, unit=RCH_A_AVG", frequency: "annual", unit: "% (annual average rate of change)" },
  population: { table: "demo_pjan", selection: "sex=T, age=TOTAL, unit=NR", frequency: "annual (1 January)", unit: "persons" },
  fiscal_balance_gdp: { table: "gov_10dd_edpt1", selection: "sector=S13, na_item=B9, unit=PC_GDP", frequency: "annual", unit: "% of GDP" },
  government_debt_gdp: { table: "gov_10dd_edpt1", selection: "sector=S13, na_item=GD, unit=PC_GDP", frequency: "annual (end of year)", unit: "% of GDP" },
  government_revenue_gdp: { table: "gov_10a_main", selection: "sector=S13, na_item=TR, unit=PC_GDP", frequency: "annual", unit: "% of GDP" },
  government_expenditure_gdp: { table: "gov_10a_main", selection: "sector=S13, na_item=TE, unit=PC_GDP", frequency: "annual", unit: "% of GDP" },
  unemployment_rate: { table: "une_rt_a", selection: "age=Y15-74, sex=T, unit=PC_ACT", frequency: "annual", unit: "% of labour force" },
  current_account_gdp: { table: "tipsbp20", selection: "partner=WRL_REST, unit=PC_GDP (BPM6)", frequency: "annual", unit: "% of GDP" },
  fdi_inflow: { table: "bop_fdi6_flow", selection: "stk_flow=LIAB, fdi_item=DI__D__F, partner=WRL_REST, currency=MIO_EUR", frequency: "annual", unit: "million EUR" },
  energy_import_dependency: { table: "nrg_ind_id", selection: "siec=TOTAL, unit=PC", frequency: "annual", unit: "%" },
  household_electricity_price: { table: "nrg_pc_204", selection: "nrg_cons=KWH2500-4999, tax=I_TAX, currency=EUR", frequency: "semi-annual → annual mean", unit: "EUR/kWh" },
  industrial_electricity_price: { table: "nrg_pc_205", selection: "nrg_cons=MWH500-1999, tax=I_TAX, currency=EUR", frequency: "semi-annual → annual mean", unit: "EUR/kWh" },
  automotive_export_share: { table: "ext_tec09", selection: "stk_flow=EXP, partner=WORLD, nace_r2=C29 / TOTAL, unit=THS_EUR", frequency: "annual", unit: "% (calculated ratio)" },
};
const MONTHLY = {
  hicp_monthly_index: { table: "prc_hicp_minr", selection: "coicop18=TOTAL, unit=I15 (NSA)", unit: "index 2015=100" },
  hicp_annual_rate: { table: "prc_hicp_minr", selection: "coicop18=TOTAL, unit=RCH_A", unit: "% (annual rate)" },
  hicp_energy_index: { table: "prc_hicp_minr", selection: "coicop18=NRG, unit=I15", unit: "index 2015=100" },
  hicp_energy_annual_rate: { table: "prc_hicp_minr", selection: "coicop18=NRG, unit=RCH_A", unit: "% (annual rate)" },
  industrial_production_index: { table: "sts_inpr_m", selection: "indic_bt=PRD, nace_r2=B-D, s_adj=SCA, unit=I21", unit: "index 2021=100 (seasonally and calendar adjusted)" },
  unemployment_rate_monthly: { table: "une_rt_m", selection: "s_adj=SA, age=TOTAL, sex=T, unit=PC_ACT", unit: "% of labour force (seasonally adjusted)" },
  long_term_government_yield: { table: "irt_lt_mcby_m", selection: "int_rt=MCBY", unit: "% p.a. (EMU convergence criterion yield)" },
};
const BIS = {
  policy_rate: { dataflow: "WS_CBPOL", unit: "% p.a., end of period", note: "instrument differs by central bank; regime floors documented" },
  nominal_effective_exchange_rate: { dataflow: "WS_EER (N, broad)", unit: "index", note: "broad basket" },
  real_effective_exchange_rate: { dataflow: "WS_EER (R, broad)", unit: "index (CPI-based)", note: "broad basket" },
  bilateral_fx_local_per_eur: { dataflow: "WS_XRU", unit: "local currency per EUR (calculated from USD rates)", note: "levels never compared across currencies" },
};
// Source families named by the brief that the repository has not used for these indicators.
const UNCHECKED = [
  { family: "National statistical offices (Statistik Austria, Destatis, ČSÚ, ŠÚ SR, SURS, KSH, GUS, INS, DZS)", hosts: [], note: "No host registered for automated or manual data access. Their national-accounts, HICP, LFS and EDP figures are the same submissions Eurostat publishes; national back-series before the Eurostat start years were not checked." },
  { family: "National central banks (BoP, policy rates)", hosts: ["www.nbs.rs"], note: "Only the National Bank of Serbia is registered (manual reading only). EU central-bank BoP and rate series reach the Atlas through Eurostat and BIS; earlier national series were not checked." },
  { family: "National finance ministries", hosts: ["www.mfin.gov.rs"], note: "Only the Serbian Ministry of Finance bulletin is registered and used (manual reading; national definitions)." },
  { family: "OECD", hosts: ["sdmx.oecd.org"], note: "Host registered (allowed_licence_review_due) but not used for these indicators; OECD reuse terms not reviewed; raw redistribution not cleared." },
  { family: "IMF", hosts: [], note: "No host registered; not checked. Adding a source family is a separate, owner-approved change." },
  { family: "World Bank WDI", hosts: ["api.worldbank.org"], note: "Used only for the frozen formal panel frame (2015–2025); never mixed into the Eurostat descriptive series." },
];

async function probe() {
  const tables = [...new Set([...Object.values(ANNUAL), ...Object.values(MONTHLY)].map((s) => s.table))].sort();
  const out = [];
  for (const table of tables) {
    // bop_fdi6_flow answers 413 to a one-country request; it is probed with its full Atlas selection.
    const narrow = table === "bop_fdi6_flow" ? "&currency=MIO_EUR&nace_r2=FDI&stk_flow=LIAB&entity=TOTAL&fdi_item=DI__D__F&partner=WRL_REST" : "";
    const url = `${API}/${table}?format=JSON&lang=en&lastTimePeriod=1&geo=AT${narrow}`;
    const started = new Date().toISOString();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      const json = res.ok ? await res.json() : null;
      out.push({ table, url, http_status: res.status, retrieved_at: started, dataset_updated: json?.updated ?? null, label: json?.label ?? null, latest_period_for_AT: json ? Object.keys(json.dimension?.time?.category?.index ?? {}).sort().at(-1) ?? null : null });
    } catch (e) { out.push({ table, url, http_status: null, retrieved_at: started, error: String(e.message ?? e) }); }
    await new Promise((r) => setTimeout(r, 1500));
  }
  fs.writeFileSync(path.join(root, PROBE_JSON), JSON.stringify({ schema_version: "source-probe-v1", purpose: "dataset last-update metadata only (one request per table); no observation is taken from it", host: "ec.europa.eu (registered: automation_allowed)", probes: out }, null, 1) + "\n");
}

export function buildVerification() {
  const annual = read("src/data/historical/annual_history_manifest.json"), monthly = read("src/data/historical/monthly_history_manifest.json");
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const rights = read("docs/legal-security/source_rights_registry.json").sources;
  const hosts = read("docs/legal-security/network_acquisition_registry.json").hosts;
  const probeDoc = fs.existsSync(path.join(root, PROBE_JSON)) ? read(PROBE_JSON) : { probes: [] };
  const eurostat = rights.find((r) => r.source_id === "src-eurostat"), bis = rights.find((r) => r.source_id === "src-bis");
  const archived = (table) => annual.recovery.tables.find((t) => t.table === table) ?? annual.tables.find((t) => t.table === table) ?? null;
  const monthlyArchive = (table) => [...(monthly.recovery?.sources ?? []), ...(monthly.sources ?? [])].find((s) => (s.dataset ?? "").includes(table)) ?? null;
  const coverage = (indicator, frequency) => {
    const rows = inv.series.filter((s) => s.indicator === indicator && s.frequency === frequency && s.scope === "national" && !s.key.startsWith("serbia_sors"));
    return Object.fromEntries(rows.map((s) => [s.country, { official: s.official ? `${s.official.first}–${s.official.last}` : null, admitted: s.admitted ? `${s.admitted.first}–${s.admitted.last}` : null, break_flags: s.floors?.break_flags ?? [] }]));
  };
  const revision = (table, archivedUpdate) => {
    const p = probeDoc.probes.find((x) => x.table === table);
    if (!p) return { status: "not_probed" };
    if (!p.dataset_updated) return { status: "probe_failed", http_status: p.http_status, probed_at: p.retrieved_at };
    if (!archivedUpdate) return { status: "live_update_recorded_archive_update_not_recorded", live_dataset_updated: p.dataset_updated, live_latest_period_for_AT: p.latest_period_for_AT, probed_at: p.retrieved_at, note: "The archived monthly extract did not record the dataset's update time, so a revision since archiving cannot be ruled out; the high-frequency refresh path diffs it." };
    const newer = archivedUpdate && new Date(p.dataset_updated) > new Date(archivedUpdate);
    return { status: newer ? "updated_since_archive" : "unchanged_since_archive", archived_dataset_updated: archivedUpdate, live_dataset_updated: p.dataset_updated, probed_at: p.retrieved_at, note: newer ? "The table has been updated after the archived retrieval; the next refresh run re-downloads and diffs it (revisions are never applied silently)." : null };
  };
  const tables = [];
  for (const [indicator, s] of Object.entries(ANNUAL)) {
    const a = archived(s.table), inventoryRow = inv.series.find((x) => x.indicator === indicator && x.frequency === "annual" && x.source_dataset);
    tables.push({ indicator_id: indicator, frequency: s.frequency, publisher: "Eurostat (European Commission)", dataset_id: s.table, selection: s.selection, access_endpoint: a?.url ?? `${API}/${s.table}`,
      metadata_url: a?.metadata_url ?? null, definition: inventoryRow?.definition ?? null, unit: s.unit, territorial_coverage: "national totals (geo AT, DE, SK, SI, CZ, HU, PL, RO, HR, RS where published)",
      historical_coverage: coverage(indicator, "annual"), archive: a ? { retrieved_at: a.retrieved_at, dataset_updated_at: a.dataset_updated_at, raw_file: a.raw_file, sha256: a.sha256 } : null,
      release_and_revision_status: revision(s.table, a?.dataset_updated_at ?? null), reuse: { licence: eurostat.licence_name, normalized_republication: eurostat.normalized_republication, raw_redistribution: eurostat.raw_redistribution, terms_url: eurostat.terms_url },
      required_citation: eurostat.required_attribution_text, compatibility: "same table and selection as the Atlas indicator for every country (definition_check: same table, selection and unit)" });
  }
  for (const [indicator, s] of Object.entries(MONTHLY)) {
    const a = monthlyArchive(s.table);
    tables.push({ indicator_id: indicator, frequency: "monthly", publisher: "Eurostat (European Commission)", dataset_id: s.table, selection: s.selection, access_endpoint: a?.url ?? `${API}/${s.table}`, metadata_url: null,
      definition: inv.series.find((x) => x.indicator === indicator && x.definition)?.definition ?? null, unit: s.unit, territorial_coverage: "national totals", historical_coverage: coverage(indicator, "monthly"),
      archive: a ? { retrieved_at: a.retrieved_at, raw_file: a.raw_file, sha256: a.sha256 } : null, release_and_revision_status: revision(s.table, null),
      reuse: { licence: eurostat.licence_name, normalized_republication: eurostat.normalized_republication, raw_redistribution: eurostat.raw_redistribution, terms_url: eurostat.terms_url }, required_citation: eurostat.required_attribution_text,
      compatibility: "same table and selection for every country; definition floors from official flags and the v1.83 monthly definition audit" });
  }
  for (const [indicator, s] of Object.entries(BIS)) {
    const a = (monthly.recovery?.sources ?? []).filter((x) => x.source === "bis" && x.dataset.includes(s.dataflow.split(" ")[0]));
    tables.push({ indicator_id: indicator, frequency: "monthly", publisher: "Bank for International Settlements", dataset_id: s.dataflow, selection: null, access_endpoint: "https://stats.bis.org/api/v2/data/dataflow/BIS/", metadata_url: null,
      definition: inv.series.find((x) => x.indicator === indicator && x.definition)?.definition ?? null, unit: s.unit, territorial_coverage: "national (euro-area members: euro-area rate from 1999)", historical_coverage: coverage(indicator, "monthly"),
      archive: a.length ? { files: a.length, retrieved_at: [a.map((x) => x.retrieved_at).sort()[0], a.map((x) => x.retrieved_at).sort().at(-1)] } : null,
      release_and_revision_status: { status: "not_probed", note: "stats.bis.org is allowed_review_due; no new request made in this audit" },
      reuse: { licence: bis.licence_name, normalized_republication: bis.normalized_republication, raw_redistribution: bis.raw_redistribution, terms_url: bis.terms_url }, required_citation: bis.required_attribution_text, compatibility: s.note });
  }
  const serbia = [
    { family: "SORS (opendata.stat.gov.rs)", status: "verified_extracts", note: "national definitions; CPI is not HICP; national totals exclude AP Kosovo and Metohija from 1999; EUR-converted GDP, exports and imports approved as cross-country comparable (2026-09-30)", rights: rights.find((r) => r.source_id === "src-sors")?.normalized_republication },
    { family: "Serbian Ministry of Finance bulletin (www.mfin.gov.rs, manual)", status: "verified_hash_checked_pdf", note: "GFS-1986 consolidated balance, central-level public debt (national law), NBS BPM6 current account; cross_country_comparable=false", rights: "official material of a state body (Copyright Act Art. 6(2)); attribution kept" },
    { family: "Eurostat for Serbia", status: "partial", note: "nama_10_gdp, nama_10_pc, demo_pjan, une_rt_a, bop_fdi6_flow, nrg tables carry RS; gov_10dd_edpt1, gov_10a_main and tipsbp20 hold no Serbian data; prc_hicp_aind flags every Serbian year 'd'" },
  ];
  const decisions = [
    { decision: "Eurostat is the primary source for every EU-country national indicator; national publications are not substituted for it.", basis: "repository source hierarchy; the Eurostat tables are the harmonised transmission of the same national submissions" },
    { decision: "A different vintage of the same table is never spliced into the canonical years.", basis: "owner decision 2026-11-11 (keep the hold); the 2026-11-16 single-vintage reference layer publishes the current vintage separately" },
    { decision: "Serbian government finance and current account are taken from the Ministry of Finance bulletin as national-definition series, not as ESA/EDP.", basis: "Eurostat publishes no EDP or MIP data for Serbia (owner decision D, 2026-11-15)" },
    { decision: "Serbian CPI is never published or compared as HICP.", basis: "Eurostat 'd' flag on every Serbian HICP year; SORS CPI is a national CPI" },
    { decision: "Registered unemployment, central-government balances and nominal GDP growth are not used for the LFS unemployment, general-government and real-growth indicators.", basis: "definitions differ (comparability contract)" },
  ];
  return { schema_version: "source-verification-v1", date: "2026-11-16", probe: PROBE_JSON, tables, serbia_sources: serbia, unchecked_source_families: UNCHECKED.map((u) => ({ ...u, host_status: u.hosts.map((h) => ({ host: h, status: hosts.find((x) => x.host === h)?.status ?? "not_registered" })) })), source_selection_decisions: decisions,
    summary: { tables_checked: tables.length, updated_since_archive: tables.filter((t) => t.release_and_revision_status.status === "updated_since_archive").map((t) => `${t.indicator_id}:${t.dataset_id}`), unchanged: tables.filter((t) => t.release_and_revision_status.status === "unchanged_since_archive").length, archive_update_not_recorded: tables.filter((t) => t.release_and_revision_status.status === "live_update_recorded_archive_update_not_recorded").length, not_probed: tables.filter((t) => t.release_and_revision_status.status === "not_probed").length, probe_failed: tables.filter((t) => t.release_and_revision_status.status === "probe_failed").map((t) => t.dataset_id) } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--probe")) await probe();
  const text = JSON.stringify(buildVerification(), null, 1) + "\n";
  if (process.argv.includes("--check")) { if (!fs.existsSync(path.join(root, VERIFICATION_JSON)) || fs.readFileSync(path.join(root, VERIFICATION_JSON), "utf8") !== text) { console.error("source verification is stale"); process.exit(1); } }
  else fs.writeFileSync(path.join(root, VERIFICATION_JSON), text);
  console.log(JSON.stringify(JSON.parse(text).summary, null, 1));
}
