// Read-only descriptive data-coverage audit (v2.0 usability pass, Phase F).
// Inventories every country × indicator × frequency series, separates descriptive coverage from formal model
// samples, and assesses historical-extension feasibility. It never fetches, ingests, imputes or edits observations:
// historical evidence comes only from the Eurostat extracts already archived in src/data/historical-extension-audit/raw.
// Usage: node scripts/data-coverage/audit.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const fileSha = (relative) => sha(fs.readFileSync(path.join(root, relative)));
export const AUDIT_PATH = "src/data/data-coverage/descriptive_data_coverage_audit.json";
const AUDIT_DATE = "2026-09-29";

const monthIndex = (p) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1;
const monthOf = (n) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
const addMonths = (p, k) => monthOf(monthIndex(p) + k);
const monthsBetween = (a, b) => Math.max(0, monthIndex(b) - monthIndex(a));
const geo = { austria: "AT", germany: "DE", slovakia: "SK", slovenia: "SI", czechia: "CZ", hungary: "HU", poland: "PL", romania: "RO", croatia: "HR", serbia: "RS" };
const slugOfGeo = Object.fromEntries(Object.entries(geo).map(([slug, code]) => [code, slug]));

// ---------------------------------------------------------------------------------------------------------------
// Fingerprints: a series' observations inside its audited window. Backfill before `earliest` or new months after
// `latest` leave it unchanged; replacing, deleting or zero-filling an audited observation changes it.
// ---------------------------------------------------------------------------------------------------------------
export function windowFingerprint(rows, earliest, latest) {
  const lines = rows.filter((r) => r.period >= earliest && r.period <= latest).map((r) => `${r.period}=${r.value === null ? "null" : String(r.value)}`).sort();
  return sha(lines.join("\n"));
}

// ---------------------------------------------------------------------------------------------------------------
// Series loaders. Each returns { key, dataset, country, indicator, transformation, frequency, rows: [{period,value,id}], meta }
// ---------------------------------------------------------------------------------------------------------------
export function loadSeries() {
  const series = new Map();
  const push = (key, base, row) => {
    if (!series.has(key)) series.set(key, { key, ...base, rows: [], definitions: new Set(), breaks: new Set(), statuses: new Map(), units: new Set() });
    const s = series.get(key);
    s.rows.push(row);
    if (row.definition) s.definitions.add(row.definition);
    if (row.breakStatus && row.breakStatus !== "none_recorded") s.breaks.add(row.breakStatus);
    if (row.unit) s.units.add(row.unit);
    s.statuses.set(row.status, (s.statuses.get(row.status) ?? 0) + 1);
  };
  for (const r of read("src/data/observations/observations.json").records) {
    push(`annual_observations|${r.country_slug}|${r.indicator}|level|annual`, { dataset: "annual_observations", file: "src/data/observations/observations.json", country: r.country_slug, indicator: r.indicator, transformation: "level", frequency: "annual", source: r.source_name, source_dataset: r.source_dataset, source_url: r.source_query_url ?? r.source_url }, { id: r.id, period: String(r.year), value: r.value, unit: r.unit, status: r.status, definition: r.calculation_formula ?? r.source_dataset });
  }
  for (const r of read("src/data/high-frequency/high_frequency_observations.json").records) {
    push(`high_frequency|${r.country}|${r.indicator}|${r.transformation}|${r.frequency}`, { dataset: "high_frequency", file: "src/data/high-frequency/high_frequency_observations.json", country: r.country, indicator: r.indicator, transformation: r.transformation, frequency: r.frequency, source: r.source, source_dataset: r.source_dataset, source_url: r.source_url }, { id: r.observation_id, period: r.period, value: r.value, unit: r.unit, status: r.data_status, definition: r.definition_version, breakStatus: r.series_break_status });
  }
  for (const r of read("src/data/macro-drivers/macro_driver_observations.json").records) {
    const country = r.country ?? r.scope;
    push(`macro_drivers|${country}|${r.driver_id}|${r.transformation}|${r.frequency}`, { dataset: "macro_drivers", file: "src/data/macro-drivers/macro_driver_observations.json", country, scope: r.scope, indicator: r.driver_id, transformation: r.transformation, frequency: r.frequency, source: r.source, source_dataset: r.source_dataset, source_url: r.source_url }, { id: r.observation_id, period: r.period, value: r.value, unit: r.unit, status: r.data_status, definition: r.definition_version });
  }
  for (const r of read("src/data/panel/panel_observations.json").records) {
    push(`annual_panel|${r.country}|${r.indicator}|level|annual`, { dataset: "annual_panel", file: "src/data/panel/panel_observations.json", country: r.country, indicator: r.indicator, transformation: "level", frequency: "annual", source: r.source, source_dataset: r.source_indicator, source_url: r.source_url }, { id: r.observation_id, period: String(r.year), value: r.value, unit: r.unit, status: r.data_status, definition: r.definition_version });
  }
  const historyPath = "src/data/historical/annual_descriptive_history.json";
  if (fs.existsSync(path.join(root, historyPath))) for (const r of read(historyPath).records) {
    push(`annual_history|${r.country_slug}|${r.indicator}|level|annual`, { dataset: "annual_history", file: historyPath, country: r.country_slug, indicator: r.indicator, transformation: "level", frequency: "annual", source: r.source, source_dataset: r.source_dataset, source_url: r.source_query_url }, { id: r.id, period: String(r.year), value: r.value, unit: r.unit, status: r.value_status, definition: r.definition });
  }
  const monthlyHistoryPath = "src/data/historical/monthly_descriptive_history.json";
  if (fs.existsSync(path.join(root, monthlyHistoryPath))) {
    const monthly = read(monthlyHistoryPath);
    for (const r of monthly.records) {
      const src = monthly.series_sources[r.source_ref];
      push(`monthly_history|${r.country_slug}|${r.series}|level|monthly`, { dataset: "monthly_history", file: monthlyHistoryPath, country: r.country_slug, indicator: r.series, transformation: "level", frequency: "monthly", source: src.source, source_dataset: src.raw_file, source_url: src.source_url }, { id: r.id, period: r.period, value: r.value, unit: src.unit, status: r.value_status, definition: src.definition });
    }
  }
  const regionalHistoryPath = "src/data/historical/regional_descriptive_history.json";
  if (fs.existsSync(path.join(root, regionalHistoryPath))) {
    const regional = read(regionalHistoryPath);
    for (const r of regional.records) {
      const country = regional.regions[r.region_id].country_id;
      push(`regional_history|${country}|${r.indicator}|level|annual`, { dataset: "regional_history", file: regionalHistoryPath, country, indicator: r.indicator, transformation: "level", frequency: "annual", source: "Eurostat", source_dataset: regional.indicators[r.indicator].definition, source_url: regional.sources[regional.indicators[r.indicator].source_refs[0]].url }, { id: r.id, period: String(r.statistical_year), region: r.region_id, value: r.value, unit: regional.indicators[r.indicator].unit, status: r.comparability_status, definition: regional.indicators[r.indicator].definition });
    }
  }
  for (const file of ["src/data/regional/v086-observations.json", "src/data/regional/v089-observations.json"]) {
    for (const r of read(file).records) {
      // Regional series are summarised per country × indicator; each region is its own sub-series inside the fingerprint.
      push(`regional|${r.country_id}|${r.region_indicator_id}|level|annual`, { dataset: "regional", file, country: r.country_id, indicator: r.region_indicator_id, transformation: "level", frequency: "annual", source: r.source_name, source_dataset: r.source_id, source_url: r.source_url }, { id: r.region_observation_id, period: String(r.year), region: r.region_id, value: r.value, unit: r.unit, status: r.value_status });
    }
  }
  return [...series.values()];
}

const regionalLike = (s) => s.dataset === "regional" || s.dataset === "regional_history";
const fingerprintRows = (s) => regionalLike(s) ? s.rows.map((r) => ({ period: `${r.period}|${r.region}`, value: r.value })) : s.rows;
const periodOfFingerprintRow = (s, earliest, latest) => regionalLike(s) ? [`${earliest}|`, `${latest}|￿`] : [earliest, latest];
export function seriesFingerprint(s, earliest, latest) {
  const [a, b] = periodOfFingerprintRow(s, earliest, latest);
  return windowFingerprint(fingerprintRows(s), a, b);
}

// ---------------------------------------------------------------------------------------------------------------
// Formal model samples (read from the frozen registries; never recomputed here)
// ---------------------------------------------------------------------------------------------------------------
const LP_SERIES = { hicp_price_level: ["high_frequency", "hicp_monthly_index", "hicp_monthly_index"], industrial_production: ["high_frequency", "industrial_production_index", "industrial_production_index"], unemployment: ["high_frequency", "unemployment_rate_monthly", "unemployment_rate_monthly"], long_term_yield: ["macro_drivers", "long_term_government_yield", "level"], bilateral_fx: ["macro_drivers", "bilateral_fx_local_per_eur", "level"], domestic_policy_rate: ["macro_drivers", "policy_rate", "level"] };
const hfTransformation = { hicp_monthly_index: "level", industrial_production_index: "level", unemployment_rate_monthly: "level" };
export const FORMAL_REGISTRIES = ["src/data/local-projections/lp_model_registry.json", "src/data/local-projections/lp_control_sensitivity_results.json", "src/data/panel-local-projections/panel_lp_sample_registry.json", "src/data/macro/var_country_readiness.json", "src/data/macro/var_specification_profiles.json", "src/data/analysis/panel_specifications.json"];

export function formalSamples(seriesList) {
  const byIndicator = (dataset, indicator, country, transformation) => seriesList.find((s) => s.dataset === dataset && s.indicator === indicator && s.country === country && (transformation === undefined || s.transformation === transformation));
  const out = new Map();
  const add = (s, entry) => { if (!s) return; if (!out.has(s.key)) out.set(s.key, []); out.get(s.key).push(entry); };
  const hfSeries = (indicator, country) => byIndicator("high_frequency", indicator, country, hfTransformation[indicator]) ?? byIndicator("high_frequency", indicator, country);
  // Country LP: group model windows by country × outcome.
  const lpGroups = new Map();
  for (const m of read("src/data/local-projections/lp_model_registry.json").records) {
    const k = `${m.country}|${m.outcome_id}`;
    const g = lpGroups.get(k) ?? { country: m.country, outcome: m.outcome_id, models: 0, start: m.sample_start, end: m.sample_end };
    g.models += 1; g.start = m.sample_start < g.start ? m.sample_start : g.start; g.end = m.sample_end > g.end ? m.sample_end : g.end;
    lpGroups.set(k, g);
  }
  for (const g of lpGroups.values()) {
    const [dataset, indicator, transformation] = LP_SERIES[g.outcome];
    const s = dataset === "high_frequency" ? hfSeries(indicator, g.country) : byIndicator(dataset, indicator, g.country, transformation);
    add(s, { model_family: "country_local_projections", registry: "src/data/local-projections/lp_model_registry.json", outcome_id: g.outcome, model_count: g.models, sample_start: g.start, sample_end: g.end, role: "outcome", status: "frozen_published" });
  }
  // Country LP control-sensitivity (sensitivity_only, never replaces the baseline): Brent and gas levels for every
  // model, plus the domestic policy rate for non-euro countries (scripts/local-projections/build-lp-robustness.mjs).
  const sensitivity = read("src/data/local-projections/lp_control_sensitivity_results.json").records;
  const lpModels = read("src/data/local-projections/lp_model_registry.json").records.filter((m) => sensitivity.some((r) => r.model_id === m.model_id));
  const span = (models) => ({ sample_start: models.map((m) => m.sample_start).sort()[0], sample_end: models.map((m) => m.sample_end).sort().at(-1) });
  const control = (models) => ({ model_family: "country_lp_control_sensitivity", registry: "src/data/local-projections/lp_control_sensitivity_results.json", model_count: models.length, ...span(models), role: "sensitivity_control", status: "frozen_published" });
  add(byIndicator("macro_drivers", "brent_crude_price_usd", "global", "level"), control(lpModels));
  add(byIndicator("macro_drivers", "europe_natural_gas_price_usd", "europe", "level"), control(lpModels));
  const nonEuro = new Set(["czechia", "hungary", "poland", "romania", "serbia"]);
  for (const country of nonEuro) {
    const models = lpModels.filter((m) => m.country === country && m.outcome_id !== "domestic_policy_rate");
    if (models.length) add(byIndicator("macro_drivers", "policy_rate", country, "level"), control(models));
  }
  // Panel LP: fixed four euro + four non-euro countries, one calendar window per outcome.
  const panelCountries = read("src/data/historical-extension-audit/historical_extension_source_manifest.json").sources[0].dimensions.geo.map((code) => slugOfGeo[code]);
  for (const r of read("src/data/panel-local-projections/panel_lp_sample_registry.json").records) {
    const [dataset, indicator, transformation] = LP_SERIES[r.outcome_id];
    for (const country of panelCountries) {
      const s = dataset === "high_frequency" ? hfSeries(indicator, country) : byIndicator(dataset, indicator, country, transformation);
      add(s, { model_family: "panel_local_projections", registry: "src/data/panel-local-projections/panel_lp_sample_registry.json", outcome_id: r.outcome_id, sample_start: r.calendar_start, sample_end: r.calendar_end, role: "outcome", status: "frozen_published" });
    }
  }
  // Reduced-form VAR (research program frozen): baseline variables per country with the readiness window.
  const profiles = read("src/data/macro/var_specification_profiles.json").profiles;
  for (const r of read("src/data/macro/var_country_readiness.json").records) {
    const profile = profiles.find((p) => p.profile_id === r.profile_id);
    for (const v of profile.variables) {
      add(hfSeries(v.indicator, r.country), { model_family: "reduced_form_var", registry: "src/data/macro/var_country_readiness.json", profile_id: r.profile_id, sample_start: r.start_period ?? profile.sample_policy.start_period, sample_end: r.end_period, effective_observations: r.effective_observations, role: v.transformation, status: r.start_period ? "frozen_published" : "not_estimable_under_frozen_gate" });
    }
  }
  // Annual panel econometrics: every panel_observations series is in the estimation frame.
  for (const s of seriesList.filter((x) => x.dataset === "annual_panel")) {
    const years = s.rows.map((r) => r.period).sort();
    add(s, { model_family: "annual_panel_econometrics", registry: "src/data/analysis/panel_specifications.json", sample_start: years[0], sample_end: years.at(-1), role: "candidate_regressor_or_outcome", status: "frozen_published" });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Historical evidence: archived Eurostat raw extracts + the completed v1.83 historical-extension audits.
// ---------------------------------------------------------------------------------------------------------------
function readJsonStat(relative) {
  const json = read(relative);
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const flat = (g, t) => json.id.reduce((n, id, i) => n + (id === "geo" ? ordered.geo.indexOf(g) : id === "time" ? ordered.time.indexOf(t) : 0) * stride[i], 0);
  const rows = {};
  for (const g of ordered.geo) rows[g] = ordered.time.map((t) => ({ period: t, value: json.value?.[flat(g, t)] ?? null, flag: json.status?.[flat(g, t)] ?? null })).filter((r) => r.value !== null);
  return rows;
}
const RAW = {
  hicp: { dataset: "prc_hicp_minr (unit I15, coicop18 TOTAL)", file: "src/data/historical-extension-audit/raw/prc_hicp_minr.json", audit: "src/data/historical-extension-audit/historical_hicp_extension_audit.json" },
  ipi: { dataset: "sts_inpr_m (PRD, B-D, SCA, I21)", file: "src/data/historical-extension-audit/raw/sts_inpr_m.json", audit: "src/data/historical-extension-audit/historical_ipi_extension_audit.json" },
  unemployment: { dataset: "une_rt_m (SA, TOTAL, T, PC_ACT)", file: "src/data/historical-extension-audit/raw/une_rt_m.json", audit: "src/data/historical-extension-audit/historical_unemployment_extension_audit.json" },
  yield: { dataset: "irt_lt_mcby_m (MCBY)", file: "src/data/historical-extension-audit/raw/irt_lt_mcby_m.json", audit: "src/data/historical-extension-audit/historical_yield_extension_audit.json" },
};
const RAW_FOR = { "high_frequency|hicp_monthly_index": "hicp", "high_frequency|industrial_production_index": "ipi", "high_frequency|unemployment_rate_monthly": "unemployment", "macro_drivers|long_term_government_yield|level": "yield" };
const manifest = read("src/data/historical-extension-audit/historical_extension_source_manifest.json");
const breakRegistry = read("src/data/historical-extension-audit/historical_definition_break_registry.json").records;
const regimes = read("src/data/historical-extension-audit/historical_monetary_regime_registry.json").records;
const euroAdoption = Object.fromEntries(regimes.filter((r) => r.euro_member).map((r) => [slugOfGeo[r.country], r.period_start]));
euroAdoption.croatia = "2023-01"; // ECB press release on Croatia's euro changeover (not in the eight-country v1.83 registry)
const rawCache = {};
const rawRows = (id) => (rawCache[id] ??= readJsonStat(RAW[id].file));
const auditRecord = (id, code) => read(RAW[id].audit).records.find((r) => r.country === code);

// Indicative official sources for series without an archived extract. These are NOT retrieved: earliest years are the
// documented start of the official table and must be verified by a source query before any ingestion.
const INDICATIVE = {
  // annual national observations
  gdp_current_eur: { src: "Eurostat nama_10_gdp (B1GQ, CP_MEUR)", start: "1995", risk: ["ESA 2010 back-cast depth differs by country"], review: false },
  gdp_per_capita_eur: { src: "Eurostat nama_10_pc (CP_EUR_HAB)", start: "1995", risk: ["ESA 2010 back-cast depth differs by country"], review: false },
  real_gdp_growth: { src: "Eurostat nama_10_gdp (CLV_PCH_PRE)", start: "1996", risk: ["chain-linked reference year revisions"], review: false },
  population: { src: "Eurostat demo_pjan (1 January)", start: "1995", risk: ["census-based revisions (2011, 2021) create level breaks"], review: false },
  exports_goods_services: { src: "Eurostat nama_10_gdp (P6)", start: "1995", risk: [], review: false },
  imports_goods_services: { src: "Eurostat nama_10_gdp (P7)", start: "1995", risk: [], review: false },
  trade_balance: { src: "derived from nama_10_gdp P6 − P7", start: "1995", risk: ["derived: recompute from backfilled components, never ingest independently"], review: false, derived: true },
  manufacturing_share_gdp: { src: "Eurostat nama_10_a10 / nama_10_a64 (C share of B1G)", start: "1995", risk: ["NACE Rev.1.1 → Rev.2 back-casting depth differs by country"], review: false },
  unemployment_rate: { src: "Eurostat une_rt_a (15-74)", start: "2000", risk: ["LFS break flags 2004–2011 in several countries (see monthly une_rt_m registry)"], review: true },
  hicp_inflation: { src: "Eurostat prc_hicp_aind (RCH_A, CP00)", start: "1997", risk: ["ECOICOP-1 → ECOICOP-2 reclassification in 2026"], review: false },
  energy_inflation: { src: "Eurostat prc_hicp_aind (NRG)", start: "1997", risk: ["ECOICOP-2 energy aggregate definition vs legacy NRG"], review: true },
  government_debt_gdp: { src: "Eurostat gov_10dd_edpt1 (GD, PC_GDP)", start: "1995", risk: ["EDP notification vintages"], review: false },
  fiscal_balance_gdp: { src: "Eurostat gov_10dd_edpt1 (B9, PC_GDP)", start: "1995", risk: ["EDP notification vintages"], review: false },
  government_expenditure_gdp: { src: "Eurostat gov_10a_main (TE, PC_GDP)", start: "1995", risk: [], review: false },
  government_revenue_gdp: { src: "Eurostat gov_10a_main (TR, PC_GDP)", start: "1995", risk: [], review: false },
  current_account_gdp: { src: "Eurostat bop_gdp6_q / tipsbp20 (BPM6)", start: "2008", risk: ["BPM5 → BPM6 break before 2008 (earlier years need methodological bridge)"], review: true },
  fdi_inflow: { src: "Eurostat bop_fdi6_flow (BPM6 / BMD4)", start: "2013", risk: ["BPM5/BMD3 → BPM6/BMD4 break before 2013; directional vs asset/liability principle"], review: true },
  energy_import_dependency: { src: "Eurostat nrg_ind_id", start: "1990", risk: ["energy balance methodology revision 2019"], review: true },
  household_electricity_price: { src: "Eurostat nrg_pc_204", start: "2007", risk: ["consumption-band and taxation-level redefinition 2017; semi-annual → annual aggregation"], review: true },
  industrial_electricity_price: { src: "Eurostat nrg_pc_205", start: "2007", risk: ["consumption-band redefinition 2017; semi-annual → annual aggregation"], review: true },
  automotive_export_share: { src: "Eurostat Comext DS-045409 (HS 87 share of total exports)", start: "1999", risk: ["calculated share; HS revisions 2002/2007/2012/2017/2022 alter chapter 87 coverage"], review: true, derived: true },
  germany_export_dependence: { src: "Eurostat Comext / IMF DOTS bilateral exports to DE ÷ total", start: "1999", risk: ["calculated share; source mixes need a single consistent reporter basis"], review: true, derived: true },
  // monthly macro drivers
  bilateral_fx_local_per_eur: { src: "BIS WS_XRU (local per USD ÷ EUR per USD)", start: "1999-01", risk: ["no euro before 1999-01 (ECU is a different unit)", "RON redenomination 2005-07 (10,000 ROL = 1 RON)", "RSD / YUM changes before 2003"], review: false, reviewFor: ["romania", "serbia"] },
  eur_usd_common: { src: "BIS WS_XRU M:XM:EUR:A", start: "1999-01", risk: ["no euro before 1999-01"], review: false },
  brent_crude_price_usd: { src: "World Bank Pink Sheet (monthly)", start: "1999-01", risk: ["source history is longer; 1999-01 proposed to align with the euro-area monetary regime"], review: false },
  europe_natural_gas_price_usd: { src: "World Bank Pink Sheet (monthly)", start: "1999-01", risk: ["benchmark changed from border price to TTF-based index; check Pink Sheet notes before 2015"], review: true },
  nominal_effective_exchange_rate: { src: "BIS WS_EER broad (monthly)", start: "1994-01", risk: ["time-varying trade weights (not a break, but document)", "broad index availability for RS/HR to verify"], review: false, reviewFor: ["serbia"] },
  real_effective_exchange_rate: { src: "BIS WS_EER broad CPI-based (monthly)", start: "1994-01", risk: ["CPI deflator definitions differ before HICP availability"], review: false, reviewFor: ["serbia"] },
  hicp_energy_index: { src: "Eurostat prc_hicp_minr (ECOICOP-2 NRG, I15)", start: "1996-01", risk: ["ECOICOP-2 energy aggregate back-cast; not in the archived extract"], review: false, reviewFor: ["serbia"] },
  hicp_energy_annual_rate: { src: "Eurostat prc_hicp_minr (ECOICOP-2 NRG, RCH_A)", start: "1997-01", risk: ["annual rate needs 12 prior months of index"], review: false, reviewFor: ["serbia"] },
  hicp_monthly_index: { src: "Eurostat prc_hicp_minr (TOTAL, I15)", start: null, risk: ["country not in the archived extract; requires a source query"], review: false, reviewFor: ["serbia"] },
  industrial_production_index: { src: "Eurostat sts_inpr_m (PRD, B-D, SCA, I21)", start: null, risk: ["country not in the archived extract; requires a source query"], review: false, reviewFor: ["serbia"] },
  unemployment_rate_monthly: { src: "Eurostat une_rt_m (SA, TOTAL, PC_ACT)", start: null, risk: ["country not in the archived extract; LFS breaks likely (see une_rt_m registry)"], review: true },
  long_term_government_yield: { src: "Eurostat irt_lt_mcby_m (MCBY)", start: null, risk: ["country not in the archived extract; requires a source query"], review: false },
  hicp_annual_rate: { src: "Eurostat prc_hicp_minr (TOTAL, RCH_A)", start: null, risk: ["official RCH_A should be retrieved, not recomputed from the index"], review: false, reviewFor: ["serbia"] },
  policy_rate: { src: "BIS WS_CBPOL", start: "1999-01", risk: ["monetary-regime changes: ECB rate applies only after euro adoption; national instruments and inflation-targeting adoption dates differ"], review: true },
};

const TRANSFORM_PARENT = { monthly_log_change: "level", "12m_log_change": "level", monthly_change_bp: "level" };

function historical(s, allSeries) {
  const code = geo[s.country];
  const rawId = RAW_FOR[`${s.dataset}|${s.indicator}`] ?? RAW_FOR[`${s.dataset}|${s.indicator}|${s.transformation}`];
  const earliest = s.coverage.earliest;
  const monthly = s.frequency === "monthly";
  if (s.dataset === "regional") {
    return { candidate_source: s.source_dataset, evidence: "indicative_not_retrieved", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: null, estimate_basis: "not estimated: regional back-series depend on NUTS version", definition_break_risks: ["NUTS 2016 / 2021 / 2024 boundary revisions change region identities", "regional LFS and GDP back-casting depth differs by country"], feasibility: "requires_methodological_review", rationale: "Regional backfill needs a NUTS-version crosswalk before any values can be compared across years." };
  }
  if (s.dataset === "regional_history") {
    return { candidate_source: s.source_dataset, evidence: "ingested_phase_i", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: 0, estimate_basis: "already ingested as descriptive regional history (see src/data/historical/regional_history_manifest.json)", definition_break_risks: ["per-year comparability_status: comparable_stable_code / backcast_boundary_revision / series_break"], feasibility: "ingested_descriptive_history", rationale: "Phase I descriptive history on NUTS 2024 codes; boundary comparability recorded per year; never a map-classification or model input." };
  }
  if (s.dataset === "monthly_history") {
    return { candidate_source: s.source_dataset, evidence: "ingested_phase_h", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: 0, estimate_basis: "already ingested as descriptive history (see src/data/historical/monthly_history_manifest.json)", definition_break_risks: [], feasibility: "ingested_descriptive_history", rationale: "Phase H safe descriptive backfill; descriptive only, never a model input." };
  }
  if (s.dataset === "annual_history") {
    return { candidate_source: s.source_dataset, evidence: "ingested_phase_g", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: 0, estimate_basis: "already ingested as descriptive history (see src/data/historical/annual_history_manifest.json)", definition_break_risks: [], feasibility: "ingested_descriptive_history", rationale: "Phase G safe descriptive backfill; descriptive only, never a model input." };
  }
  if (s.dataset === "annual_panel") {
    return { candidate_source: `World Bank / Eurostat source behind ${s.source_dataset}`, evidence: "indicative_not_retrieved", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: null, estimate_basis: "not estimated: series is a formal estimation frame", definition_break_risks: ["adding years changes every annual panel estimate"], feasibility: "requires_methodological_review", rationale: "This file is the annual panel estimation frame; historical years must go to a separate descriptive store or be excluded by an explicit sample window before ingestion." };
  }
  if (TRANSFORM_PARENT[s.transformation]) {
    const parent = allSeries.find((x) => x.dataset === s.dataset && x.country === s.country && x.indicator === s.indicator && x.transformation === TRANSFORM_PARENT[s.transformation]);
    const p = parent?.historical;
    return { candidate_source: `derived from ${s.indicator} ${TRANSFORM_PARENT[s.transformation]}`, evidence: "derived", earliest_available: null, proposed_earliest_feasible: p?.proposed_earliest_feasible ? addMonths(p.proposed_earliest_feasible, s.transformation === "12m_log_change" ? 12 : 1) : null, definition_compatible_floor: null, estimated_new_observations: p?.estimated_new_observations ?? null, estimate_basis: "follows the level series; recompute after a level backfill, never ingest separately", definition_break_risks: p?.definition_break_risks ?? [], feasibility: p?.feasibility === "safe_descriptive_backfill" || p?.feasibility === "likely_safe_pending_retrieval" ? "derived_after_level_backfill" : p?.feasibility ?? "requires_methodological_review", rationale: "Computed transformation of the level series." };
  }
  if (rawId && code && rawRows(rawId)[code]) {
    const rows = rawRows(rawId)[code].filter((r) => r.period < earliest);
    const a = auditRecord(rawId, code);
    const floor = a?.earliest_definition_compatible ?? null;
    const safe = floor ? rows.filter((r) => r.period >= floor).length : 0;
    const review = rows.length - safe;
    const flags = breakRegistry.filter((b) => b.outcome === rawId && b.country === code && b.period < earliest).map((b) => `${b.period} flag ${b.flag} (${b.type})`);
    const blocked = !a || a.pre2015_extension_status !== "cleared";
    return {
      candidate_source: `Eurostat ${RAW[rawId].dataset}`, candidate_url: manifest.sources.find((m) => m.id === rawId)?.metadata_url ?? null, evidence: "retrieved_raw_extract",
      raw_extract: RAW[rawId].file, earliest_available: rawRows(rawId)[code][0]?.period ?? null, proposed_earliest_feasible: blocked ? null : floor, definition_compatible_floor: floor,
      estimated_new_observations: rows.length, estimated_safe_observations: blocked ? 0 : safe, estimated_review_observations: blocked ? rows.length : review,
      estimate_basis: "count of non-missing official values in the archived extract before the current earliest period",
      definition_break_risks: [...(a?.pre2015_blocker ? [a.pre2015_blocker] : []), ...(a?.current_baseline_warning ? [a.current_baseline_warning] : []), ...flags],
      feasibility: blocked ? "requires_methodological_review" : review > 0 ? "safe_descriptive_backfill_with_review_segment" : "safe_descriptive_backfill",
      rationale: blocked ? `v1.83 historical audit status: ${a?.pre2015_extension_status ?? "not audited"}.` : `v1.83 historical audit cleared a definition-compatible floor at ${floor}${review > 0 ? "; values before the floor need methodological review" : ""}.`,
    };
  }
  const info = INDICATIVE[s.indicator];
  if (!info) return { candidate_source: null, evidence: "none", earliest_available: null, proposed_earliest_feasible: null, definition_compatible_floor: null, estimated_new_observations: null, estimate_basis: "no official historical source identified", definition_break_risks: [], feasibility: "not_feasible_with_identified_sources", rationale: "No candidate official source is registered." };
  let start = info.start ?? (s.indicator === "hicp_annual_rate" ? "1997-01" : null);
  const risks = [...info.risk];
  // Croatia's HICP back-series start is not evidenced by the archived eight-country extract.
  if (s.country === "croatia" && /hicp/.test(s.indicator)) { start = null; risks.push("Croatian HICP start date not in the archived extract; requires a source query"); }
  let review = info.review || (info.reviewFor ?? []).includes(s.country);
  if (s.indicator === "policy_rate") {
    const adoption = euroAdoption[s.country];
    // Only AT/DE have one policy regime (ECB) from 1999-01; later adopters and non-euro countries changed regime or instrument.
    if (adoption) risks.push(`ECB rate applicable from ${adoption}; earlier months are a national regime`);
    review = !adoption || adoption > "1999-01";
  }
  if (s.country === "serbia" && !review && s.dataset === "annual_observations") { review = true; risks.push("Serbia is outside the EU statistical system: Eurostat back-series are partial"); }
  const gap = start ? (monthly ? monthsBetween(start, earliest) : Math.max(0, Number(earliest) - Number(start))) : null;
  return {
    candidate_source: info.src, evidence: "indicative_not_retrieved", earliest_available: null, indicative_dataset_start: start, proposed_earliest_feasible: review ? null : start, definition_compatible_floor: null,
    estimated_new_observations: gap, estimate_basis: gap === null ? "requires a source query" : "upper bound: periods between the indicative start and the current earliest period, assuming complete publication",
    definition_break_risks: risks, feasibility: info.derived ? (review ? "requires_methodological_review" : "derived_after_level_backfill") : review ? "requires_methodological_review" : start ? "likely_safe_pending_retrieval" : "requires_source_query",
    rationale: review ? "Definition or regime risks must be reviewed before ingestion." : start ? "Same official table and definition as the current records; verify coverage with a source query before ingestion." : "Official table identified, but this country's start date is unknown until the table is queried.",
  };
}

// ---------------------------------------------------------------------------------------------------------------
export function buildAudit() {
  const seriesList = loadSeries();
  for (const s of seriesList) {
    const periods = [...new Set(s.rows.map((r) => r.period))].sort();
    const observed = new Set(s.rows.filter((r) => r.value !== null).map((r) => r.period));
    const earliest = periods[0], latest = periods.at(-1);
    const expected = s.frequency === "monthly" ? Array.from({ length: monthIndex(latest) - monthIndex(earliest) + 1 }, (_, i) => addMonths(earliest, i)) : Array.from({ length: Number(latest) - Number(earliest) + 1 }, (_, i) => String(Number(earliest) + i));
    const missing = expected.filter((p) => !observed.has(p));
    s.coverage = { earliest, latest, record_count: s.rows.length, observation_count: s.rows.filter((r) => r.value !== null).length, null_record_count: s.rows.filter((r) => r.value === null).length, missing_period_count: missing.length, missing_periods: missing, first_observed: [...observed].sort()[0] ?? null, last_observed: [...observed].sort().at(-1) ?? null };
    if (regionalLike(s)) s.coverage.region_count = new Set(s.rows.map((r) => r.region)).size;
  }
  // Levels before derived transformations so derived records can inherit.
  const ordered = [...seriesList].sort((a, b) => Number(Boolean(TRANSFORM_PARENT[a.transformation])) - Number(Boolean(TRANSFORM_PARENT[b.transformation])));
  for (const s of ordered) s.historical = historical(s, seriesList);
  const formal = formalSamples(seriesList);
  const historyManifestPath = "src/data/historical/annual_history_manifest.json";
  const phaseG = fs.existsSync(path.join(root, historyManifestPath)) ? new Map(read(historyManifestPath).series.map((x) => [`${x.country}|${x.indicator}`, x])) : new Map();
  const monthlyManifestPath = "src/data/historical/monthly_history_manifest.json";
  const phaseH = fs.existsSync(path.join(root, monthlyManifestPath)) ? new Map(read(monthlyManifestPath).series.map((x) => [`${x.country}|${x.series}`, x])) : new Map();
  const regionalManifestPath = "src/data/historical/regional_history_manifest.json";
  const phaseI = new Map();
  if (fs.existsSync(path.join(root, regionalManifestPath))) for (const p of read(regionalManifestPath).pairs) { const k = `${p.country_id ?? ""}|${p.indicator}`; const e = phaseI.get(k) ?? { regions: 0, ingested_regions: 0, records: 0, comparable_records: 0, statuses: {} }; e.regions += 1; if (p.status === "ingested") e.ingested_regions += 1; e.records += p.ingested_count ?? 0; e.comparable_records += p.comparable_years ?? 0; e.statuses[p.status] = (e.statuses[p.status] ?? 0) + 1; phaseI.set(k, e); }
  const hfDefinitionRegistry = read("src/data/high-frequency/high_frequency_definition_registry.json").records;
  const records = seriesList.sort((a, b) => a.key.localeCompare(b.key)).map((s) => {
    const samples = formal.get(s.key) ?? [];
    const registered = hfDefinitionRegistry.find((r) => r.country === s.country && r.indicator === s.indicator && s.dataset === "high_frequency");
    const continuity = registered ? registered.series_break_status : s.definitions.size > 1 ? "multiple_definition_versions_in_window" : s.breaks.size ? [...s.breaks].join(",") : "single_definition_in_window";
    return {
      series_key: s.key, dataset: s.dataset, source_file: s.file, country: s.country, ...(s.scope ? { scope: s.scope } : {}), indicator: s.indicator, transformation: s.transformation, frequency: s.frequency,
      unit: [...s.units].join(" | ") || null,
      descriptive_coverage: s.coverage,
      source: { name: s.source ?? null, dataset: s.source_dataset ?? null, url: s.source_url ?? null },
      status_counts: Object.fromEntries([...s.statuses.entries()].sort()),
      definition: { versions: [...s.definitions].sort().slice(0, 5), version_count: s.definitions.size, continuity, registered_transitions: registered?.methodological_transitions ?? [] },
      historical_extension: s.historical,
      ...((s.dataset === "high_frequency" || s.dataset === "macro_drivers") && s.transformation !== "monthly_log_change" && s.transformation !== "12m_log_change" && s.transformation !== "monthly_change_bp" ? { phase_h_backfill: phaseH.has(`${s.country}|${s.indicator}`) ? (({ status, ingested_periods, ingested_count, definition_compatible_floor, overlap_check, decision }) => ({ status, store: "src/data/historical/monthly_descriptive_history.json", ingested_periods, ingested_count, definition_compatible_floor: definition_compatible_floor ?? null, overlap_check, decision }))(phaseH.get(`${s.country}|${s.indicator}`)) : { status: "not_in_phase_h_safe_scope" } } : {}),
      ...(s.dataset === "regional" ? { phase_i_backfill: phaseI.has(`${s.country}|${s.indicator}`) ? { store: "src/data/historical/regional_descriptive_history.json", ...phaseI.get(`${s.country}|${s.indicator}`) } : { status: /change/.test(s.indicator) ? "derived_change_not_backfilled" : "not_in_phase_i_scope" } } : {}),
      ...(s.dataset === "annual_observations" ? { phase_g_backfill: phaseG.has(`${s.country}|${s.indicator}`) ? (({ status, ingested_years, ingested_count, definition_compatible_floor, overlap_check }) => ({ status, store: "src/data/historical/annual_descriptive_history.json", ingested_years, ingested_count, definition_compatible_floor: definition_compatible_floor ?? null, overlap_check: overlap_check ?? "derived" }))(phaseG.get(`${s.country}|${s.indicator}`)) : { status: s.country === "serbia" ? "excluded_review_queue" : "not_in_phase_g_safe_scope" } } : {}),
      model_usage: { status: samples.some((x) => x.status === "frozen_published") ? "formal_model_input" : samples.length ? "formal_candidate_not_estimated" : "descriptive_only", formal_model_samples: samples },
      fingerprint: { window: [s.coverage.earliest, s.coverage.latest], sha256: seriesFingerprint(s, s.coverage.earliest, s.coverage.latest) },
      null_observation_ids: s.rows.filter((r) => r.value === null).map((r) => r.id).sort(),
    };
  });
  const sumBy = (predicate, field) => records.filter(predicate).reduce((n, r) => n + (r.historical_extension[field] ?? 0), 0);
  const feasibility = {};
  for (const r of records) feasibility[r.historical_extension.feasibility] = (feasibility[r.historical_extension.feasibility] ?? 0) + 1;
  const datasets = {};
  for (const r of records) {
    const d = (datasets[r.dataset] ??= { series: 0, countries: new Set(), indicators: new Set(), records: 0, observations: 0, nulls: 0, earliest: r.descriptive_coverage.earliest, latest: r.descriptive_coverage.latest, file: r.source_file });
    d.series += 1; d.countries.add(r.country); d.indicators.add(r.indicator); d.records += r.descriptive_coverage.record_count; d.observations += r.descriptive_coverage.observation_count; d.nulls += r.descriptive_coverage.null_record_count;
    if (r.descriptive_coverage.earliest < d.earliest) d.earliest = r.descriptive_coverage.earliest;
    if (r.descriptive_coverage.latest > d.latest) d.latest = r.descriptive_coverage.latest;
  }
  for (const d of Object.values(datasets)) { d.countries = [...d.countries].sort(); d.indicators = [...d.indicators].sort(); }
  return {
    schema_version: "descriptive-data-coverage-audit-v2.0",
    audit_date: AUDIT_DATE,
    state: "report_for_owner_review",
    policy: {
      ingestion: "none — this audit does not fetch, ingest, impute or modify observations",
      descriptive_vs_formal: "descriptive_coverage is everything currently stored for a series; formal_model_samples are the frozen estimation windows read from the model registries. A descriptive backfill must never widen a formal sample.",
      historical_data_gate: "Do not ingest historical data until this report is reviewed by the owner.",
      missing_values: "Missing values stay null; they are never converted to 0 or interpolated.",
      fingerprint: "sha256 over 'period=value' lines inside the audited window; any replacement, deletion or zero-fill inside the window changes it, while earlier backfill and later months do not.",
      feasibility_categories: {
        safe_descriptive_backfill: "archived official extract + cleared definition-compatible floor; all pre-window values are after the floor",
        safe_descriptive_backfill_with_review_segment: "safe from the cleared floor; values before the floor need methodological review",
        likely_safe_pending_retrieval: "same official table/definition as current records; source query still required",
        derived_after_level_backfill: "computed series; recompute after the level backfill",
        requires_methodological_review: "definition break, regime change, blocked v1.83 audit status, or series is a formal estimation frame",
        ingested_descriptive_history: "Phase G descriptive history store; reproducible from archived official extracts, not a model input",
        requires_source_query: "official table identified but its start date for this country is unknown until queried",
        not_feasible_with_identified_sources: "no candidate official source registered",
      },
    },
    formal_sample_registries: Object.fromEntries(FORMAL_REGISTRIES.map((f) => [f, fileSha(f)])),
    formal_input_note: "Country LP calendars span the full stored series (scripts/local-projections/build-lp-robustness.mjs); only high_frequency has a frozen snapshot. Any historical backfill must therefore go to a separate descriptive store or be excluded by an explicit sample window before models are re-run.",
    summary: {
      series_count: records.length,
      datasets,
      feasibility_counts: Object.fromEntries(Object.entries(feasibility).sort()),
      estimated_new_observations: {
        retrieved_raw_total: sumBy((r) => r.historical_extension.evidence === "retrieved_raw_extract", "estimated_new_observations"),
        retrieved_raw_safe: sumBy((r) => r.historical_extension.evidence === "retrieved_raw_extract", "estimated_safe_observations"),
        retrieved_raw_review: sumBy((r) => r.historical_extension.evidence === "retrieved_raw_extract", "estimated_review_observations"),
        indicative_likely_safe_upper_bound: sumBy((r) => r.historical_extension.feasibility === "likely_safe_pending_retrieval", "estimated_new_observations"),
        indicative_review_upper_bound: sumBy((r) => r.historical_extension.evidence === "indicative_not_retrieved" && r.historical_extension.feasibility === "requires_methodological_review", "estimated_new_observations"),
        derived_recomputable: sumBy((r) => r.historical_extension.feasibility === "derived_after_level_backfill", "estimated_new_observations"),
      },
      formal_model_input_series: records.filter((r) => r.model_usage.status === "formal_model_input").length,
      descriptive_only_series: records.filter((r) => r.model_usage.status === "descriptive_only").length,
    },
    records,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const audit = buildAudit();
  fs.mkdirSync(path.join(root, path.dirname(AUDIT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(root, AUDIT_PATH), JSON.stringify(audit, null, 2) + "\n");
  console.log(JSON.stringify({ written: AUDIT_PATH, series: audit.records.length, ...audit.summary.estimated_new_observations, feasibility: audit.summary.feasibility_counts }));
}
