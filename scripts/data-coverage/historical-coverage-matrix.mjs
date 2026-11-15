// Historical coverage matrix (2026-11-16). Read-only over every data store: it never changes src/data or
// public/research-data. It turns the Phase R recovery inventory (every country × indicator × frequency contract,
// with each missing period already classified against the archived full official extract) into the brief's
// country × indicator × frequency × period matrix with the categories A–G, adds the stores the inventory does not
// cover (Serbian Ministry of Finance bulletin series, UN Comtrade trade-partner structure, the frozen World Bank
// panel), and writes a persistent gap backlog and the indicator comparability contract.
// Outputs (deterministic):
//   docs/data-coverage/historical_coverage_matrix_2026-11-16.json and .csv
//   docs/data-coverage/historical_gap_backlog.json           (persistent: one open item per contract × category × reason)
//   docs/data-coverage/indicator_comparability_contract.json (persistent: definitions, units, breaks, restrictions)
// Usage: node scripts/data-coverage/historical-coverage-matrix.mjs [--check]   (--check: fail if outputs would change)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMatrix as closureMatrix } from "./coverage-closure.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const MATRIX_DATE = "2026-11-16";
export const MATRIX_JSON = `docs/data-coverage/historical_coverage_matrix_${MATRIX_DATE}.json`;
export const MATRIX_CSV = `docs/data-coverage/historical_coverage_matrix_${MATRIX_DATE}.csv`;
export const BACKLOG_JSON = "docs/data-coverage/historical_gap_backlog.json";
export const CONTRACT_JSON = "docs/data-coverage/indicator_comparability_contract.json";
export const SOURCE_VERIFICATION_JSON = `docs/data-coverage/source_verification_${MATRIX_DATE}.json`;

export const INPUTS = [
  "src/data/data-coverage/historical_recovery_inventory.json",
  "src/data/serbia/serbia_public_finance_mfin.json",
  "src/data/historical/annual_single_vintage_reference.json",
  "src/data/serbia/serbia_descriptive_history_annual.json",
  "src/data/serbia/serbia_descriptive_history_monthly.json",
  "src/data/network/network_metrics.json",
  "src/data/panel/panel_observations.json",
  "src/data/historical/annual_history_manifest.json",
  "src/data/historical/monthly_history_manifest.json",
  "docs/legal-security/source_rights_registry.json",
  "docs/legal-security/network_acquisition_registry.json",
];
export const inputHashes = () => Object.fromEntries(INPUTS.map((p) => [p, sha(fs.readFileSync(path.join(root, p)))]));

// The brief's seven gap categories.
export const CATEGORY = {
  A: "official_data_available_not_imported",
  B: "source_not_independently_checked",
  C: "genuine_official_unavailability",
  D: "methodological_or_definitional_incompatibility",
  E: "licensing_or_redistribution_restriction",
  F: "failed_or_incomplete_extraction",
  G: "historical_gap_from_country_or_institutional_change",
};

// Decisions recorded after the inventory was generated that change how a gap is read (not the stored data).
export const RECORDED_DECISIONS = [
  { key: "annual|serbia|hicp_inflation", from_category: 1, to: "D", decided: "2026-11-11", evidence: "docs/v20-targeted-refresh-2026-11-11.md",
    note: "Eurostat flags every Serbian HICP year 'd' (definition differs), so the five category-1 years 2021–2025 are definitionally incompatible; the inventory regeneration that records this is bundled with the next high-frequency refresh run." },
];

// Map one inventory gap span (category 1–8 + reason) to A–G. Territorial and institutional causes are G; everything
// that follows an official break or definition flag, or an audited definition floor, is D.
export function categorise(key, gap) {
  const decided = RECORDED_DECISIONS.find((d) => d.key === key && d.from_category === gap.category);
  if (decided) return { category: decided.to, basis: `recorded decision ${decided.decided}` };
  const r = gap.reason ?? "";
  switch (gap.category) {
    case 1: return { category: "A", basis: "inventory category 1" };
    case 2: return { category: "F", basis: "inventory category 2" };
    case 3: return { category: "G", basis: "inventory category 3 (the euro did not exist before 1999-01)" };
    case 4: return /discontinued/i.test(r) ? { category: "G", basis: "series discontinued at euro adoption" } : { category: "C", basis: "inventory category 4 (official cell empty)" };
    case 5: return { category: "C", basis: "inventory category 5 (not yet published)" };
    case 6:
      if (/Kosovo|unification|territorial/i.test(r)) return { category: "G", basis: "territorial coverage change" };
      if (/documented_regime_floor/.test(r)) return { category: "G", basis: "monetary-policy regime or instrument change (documented regime floor)" };
      return { category: "D", basis: "inventory category 6 (official break/definition flag or audited definition floor)" };
    case 7: return { category: "E", basis: "inventory category 7" };
    case 8: return /EUR conversion/i.test(r) ? { category: "D", basis: "national-currency conversion does not reproduce the Eurostat EUR series" } : { category: "A", basis: "inventory category 8 (held by the vintage splice check)" };
    default: throw new Error(`unknown inventory category ${gap.category} for ${key}`);
  }
}

function spanLength(from, to) {
  if (/^\d{4}$/.test(from)) return Number(to) - Number(from) + 1;
  if (/^\d{4}-Q/.test(from)) return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 4 + Number(to.at(-1)) - Number(from.at(-1)) + 1;
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) + 1;
}
const minP = (...p) => p.filter(Boolean).sort()[0] ?? null;
const maxP = (...p) => p.filter(Boolean).sort().at(-1) ?? null;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const blank = () => Object.fromEntries(Object.keys(CATEGORY).map((c) => [c, 0]));
const id = (text) => sha(String(text ?? "")).slice(0, 12);

// Why a category-A span is not imported yet (the "blocking reason"), from the inventory reason text.
function blockingFor(reason) {
  if (/held/.test(reason)) return "held by the vintage splice check: the canonical years carry an earlier vintage of the same table (owner decision 2026-11-11: keep the hold, no canonical refresh)";
  if (/after the last canonical year/.test(reason)) return "after the last canonical year: observations.json is a frozen formal-model input; no routine refresh unit writes it";
  if (/inside the canonical window/.test(reason)) return "inside the canonical window where the frozen observations.json holds a null; descriptive history only adds years before the canonical window";
  if (/after the frozen 2015\+ store/.test(reason)) return "after the frozen 2015+ store: new months belong to the high-frequency or macro-driver refresh path (macro-driver unit blocked by owner decision; HF re-plan after the full October 2026 HICP release)";
  return reason;
}

const UNIT_REGIONAL = { regional_gdp: "MIO_EUR", regional_gdp_per_capita: "EUR per inhabitant", regional_population: "persons (1 January)", regional_employment_rate: "%", regional_unemployment_rate: "%", regional_manufacturing_share: "% of GVA", regional_gdp_per_capita_change_pct: "%", regional_population_change_pct: "%", regional_unemployment_change_pp: "pp" };

export function buildMatrix() {
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const sorsComparable = {};
  for (const f of ["src/data/serbia/serbia_descriptive_history_annual.json", "src/data/serbia/serbia_descriptive_history_monthly.json"])
    for (const r of read(f).records) { const k = r.series; sorsComparable[k] ??= new Set(); sorsComparable[k].add(r.cross_country_comparable === true); }
  const mfin = read("src/data/serbia/serbia_public_finance_mfin.json");
  const mfinBy = Object.fromEntries(mfin.series.filter((s) => s.maps_to).map((s) => [s.maps_to, s]));
  const reference = read("src/data/historical/annual_single_vintage_reference.json");
  const refYears = new Map(); for (const r of reference.records) { const k = `${r.country_slug}|${r.indicator}`; if (!refYears.has(k)) refYears.set(k, new Set()); refYears.get(k).add(String(r.year)); }
  const inReference = (s, g) => { const ys = refYears.get(`${s.country}|${s.indicator}`); if (!ys || s.frequency !== "annual" || !/^\d{4}$/.test(g.from)) return 0; let n = 0; for (let y = Number(g.from); y <= Number(g.to); y++) if (ys.has(String(y))) n++; return n; };
  const rows = [];
  for (const s of inv.series) {
    const store = s.key.split("|")[0];
    const counts = blank(); const reasons = [];
    for (const g of s.missing.periods) {
      const { category, basis } = categorise(s.key, g);
      const n = spanLength(g.from, g.to); counts[category] += n;
      const last = reasons.at(-1);
      const reason = category === "A" ? blockingFor(g.reason) : g.reason;
      const published = category === "A" && store === "annual" ? inReference(s, g) : 0;
      if (last && last.category === category && last.reason === reason && last.inventory_category === g.category) { last.to = g.to; last.periods += n; if (published) last.published_in_single_vintage_reference = (last.published_in_single_vintage_reference ?? 0) + published; }
      else reasons.push({ category, inventory_category: g.category, from: g.from, to: g.to, periods: n, reason, basis, ...(published ? { published_in_single_vintage_reference: published } : {}) });
    }
    // SORS regional contracts span many territorial units: their observation unit is territory × period.
    const perTerritory = store === "serbia_sors_regional";
    const recorded = perTerritory ? s.layers?.serbia_sors_regional?.records ?? 0 : s.admitted?.periods ?? 0;
    const officialFirst = s.official?.first ?? minP(s.admitted?.first, ...s.missing.periods.map((g) => g.from));
    const officialLast = s.official?.last ?? s.admitted?.last ?? null;
    const first = minP(officialFirst, s.admitted?.first), last = maxP(officialLast, s.admitted?.last, ...s.missing.periods.map((g) => g.to));
    const missing = Object.values(counts).reduce((a, b) => a + b, 0);
    const expected = perTerritory ? recorded + missing : first && last ? spanLength(first, last) : 0;
    const notAdmissible = counts.C + counts.D + counts.G;
    let comparability = inv.comparability?.national_annual?.[s.indicator]?.definition_check ?? inv.comparability?.national_monthly?.[s.indicator]?.definition_check ?? null;
    if (store.startsWith("serbia_sors")) { const c = sorsComparable[s.indicator]; comparability = c?.has(true) && !c.has(false) ? "cross_country_comparable (SORS series, EUR conversion approved 2026-09-30)" : c?.has(true) ? "partly cross_country_comparable (by period)" : "national definition: not cross-country comparable"; }
    if (s.scope === "regional") comparability = "comparable_stable_code years only; NUTS levels differ between countries";
    if (s.indicator === "hicp_inflation" && s.country === "serbia") comparability = "not comparable: Eurostat flags every Serbian HICP year 'd'; the SORS CPI layer is a national CPI and is never compared as HICP";
    const breakFlags = s.floors?.break_flags ?? [];
    const definitionFloor = s.floors?.definition_compatible ?? null;
    let primaryCategory = missing === 0 ? (recorded ? "complete_against_official_span" : "no_official_series") : Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    let sourceStatus = s.official ? "verified_against_archived_full_official_extract" : store.startsWith("serbia_sors") ? "verified_against_sors_extract_and_floor_rules" : /_change_(pct|pp)$/.test(s.indicator) ? "derived_from_admitted_inputs" : "no_official_series_in_registered_source";
    let secondary = null; let blocking = reasons.filter((r) => r.category === "A" || r.category === "B" || r.category === "E" || r.category === "F").map((r) => r.reason);
    if (s.applicability === "not_applicable") { primaryCategory = "not_applicable"; sourceStatus = "not_applicable"; blocking = ["a country's export dependence on itself is not defined"]; }
    if (s.country === "serbia" && store === "annual" && !recorded && !s.official && s.applicability !== "not_applicable") {
      primaryCategory = "C";
      sourceStatus = "no_harmonised_series_for_serbia_in_registered_source";
      const m = mfinBy[s.indicator];
      secondary = m ? `Ministry of Finance of Serbia, Public finance bulletin Table 1 (${m.series}; national definition, cross_country_comparable=false; ${m.periods[0]}–${m.periods.at(-1)})` : null;
      blocking = [`${s.source_dataset ?? "Eurostat"} holds no Serbian observations: EDP/ESA government finance and MIP scoreboard tables cover EU member states only`];
      comparability = m ? "harmonised series unavailable; the national-definition series is shown separately and never compared as ESA/EDP" : comparability;
    }
    if (s.country === "serbia" && store === "annual" && (recorded || s.official)) {
      const other = inv.series.find((x) => x.key === `serbia_sors_annual|serbia|${s.indicator}`);
      if (other) secondary = `SORS ${other.source_dataset ?? s.indicator} (${other.admitted?.first ?? "—"}–${other.admitted?.last ?? "—"}; separate layer)`;
    }
    if (store === "serbia_sors_annual") { const other = inv.series.find((x) => x.key === `annual|serbia|${s.indicator}`); if (other?.admitted) secondary = `Eurostat ${other.source_dataset ?? ""} (${other.admitted.first}–${other.admitted.last}; separate layer)`.replace("Eurostat Eurostat", "Eurostat"); }
    rows.push({
      key: s.key, store, scope: perTerritory ? "regional" : s.scope, observation_unit: perTerritory ? "territory × period" : "period", country_id: s.country, region_id: s.region_id ?? null, indicator_id: s.indicator, frequency: s.frequency,
      unit: s.unit ?? (s.scope === "regional" ? UNIT_REGIONAL[s.indicator] ?? null : null), definition: s.definition ?? null,
      first_official_year: officialFirst, last_official_year: officialLast, first_available_year: s.admitted?.first ?? null, last_available_year: s.admitted?.last ?? null,
      expected_observations: expected, recorded_observations: recorded, verified_missing_observations: missing, unclassified_missing_observations: expected - recorded - missing,
      coverage_percentage: pct(recorded, expected), admissible_coverage_percentage: pct(recorded, expected - notAdmissible),
      gaps: counts, primary_category: primaryCategory,
      primary_source: s.source_dataset ?? s.official?.source_dataset ?? null, secondary_source: secondary, layers: Object.fromEntries(Object.entries(s.layers ?? {}).filter(([, v]) => v).map(([k, v]) => [k, `${v.first}–${v.last}`])),
      source_status: sourceStatus, rights: s.rights?.normalized_republication ?? null,
      comparability_status: comparability, methodological_break: breakFlags.length > 0 || (definitionFloor !== null && officialFirst !== null && String(definitionFloor) > String(officialFirst)),
      break_flags: breakFlags, definition_compatible_floor: definitionFloor, blocking_reason: [...new Set(blocking)].join("; ") || null, gap_spans: reasons,
    });
  }
  // Serbian Ministry of Finance bulletin series (serbia-mfin-20261115): not in the Phase R inventory.
  for (const m of mfin.series) {
    const recs = mfin.records.filter((r) => r.series === m.series && r.value !== null);
    const periods = recs.map((r) => r.period).sort();
    rows.push({
      key: `serbia_mfin|serbia|${m.series}`, store: "serbia_mfin", scope: "national", country_id: "serbia", region_id: null, indicator_id: m.series, frequency: "annual",
      unit: m.unit, definition: m.label, first_official_year: m.periods[0], last_official_year: m.periods.at(-1), first_available_year: periods[0] ?? null, last_available_year: periods.at(-1) ?? null,
      expected_observations: spanLength(m.periods[0], m.periods.at(-1)), recorded_observations: periods.length, verified_missing_observations: spanLength(m.periods[0], m.periods.at(-1)) - periods.length, unclassified_missing_observations: 0,
      coverage_percentage: pct(periods.length, spanLength(m.periods[0], m.periods.at(-1))), admissible_coverage_percentage: pct(periods.length, spanLength(m.periods[0], m.periods.at(-1))),
      gaps: blank(), primary_category: "complete_against_official_span", primary_source: `Ministry of Finance of Serbia, Public finance bulletin August 2026, Table 1 (${m.series})`,
      secondary_source: m.maps_to ? `canonical id ${m.maps_to}: no harmonised Eurostat series for Serbia` : null, layers: { serbia_public_finance_mfin: `${periods[0]}–${periods.at(-1)}` },
      source_status: "verified_against_hash_checked_bulletin_pdf (manual reading; earlier national years not checked)", rights: "official material of a state body (Serbian Copyright Act Art. 6(2)); attribution kept",
      comparability_status: "national definition (GFS-1986 / Serbian public-debt law / NBS BPM6): not comparable with ESA/EDP", methodological_break: false, break_flags: [], definition_compatible_floor: null,
      blocking_reason: null, gap_spans: [],
      backlog_note: `Years before ${m.periods[0]} are not printed in the bulletin table; earlier official national years have not been independently checked (B).`,
    });
  }
  // Single-vintage reference layer (single-vintage-reference-20261116): one unspliced row per country × indicator.
  for (const ser of reference.series.filter((x) => x.official_first !== null)) {
    const counts = blank(); const spans = [];
    if (ser.definition_compatible_floor > ser.official_first) {
      const territorial = ser.territorial_floor !== null && ser.definition_compatible_floor === ser.territorial_floor;
      const c = territorial ? "G" : "D", n = ser.definition_compatible_floor - ser.official_first; counts[c] += n;
      spans.push({ category: c, from: String(ser.official_first), to: String(ser.definition_compatible_floor - 1), periods: n, reason: territorial ? "before the territorial floor" : `before the definition-compatible floor ${ser.definition_compatible_floor} (official break or definition flags: ${ser.break_flags.join(", ")})`, basis: "Phase R floor rule" });
    }
    const inside = ser.count ? ser.last - ser.first + 1 - ser.count : 0;
    if (inside) { counts.C += inside; spans.push({ category: "C", from: String(ser.first), to: String(ser.last), periods: inside, reason: "official cell empty inside the official span", basis: "empty JSON-stat cell" }); }
    const expected = ser.official_last - ser.official_first + 1;
    const spec = reference.indicators.find((i) => i.indicator === ser.indicator);
    rows.push({
      key: `single_vintage_reference|${ser.country}|${ser.indicator}`, store: "single_vintage_reference", scope: "national", observation_unit: "period", country_id: ser.country, region_id: null, indicator_id: ser.indicator, frequency: "annual",
      unit: spec.unit, definition: spec.definition, first_official_year: String(ser.official_first), last_official_year: String(ser.official_last), first_available_year: ser.first === null ? null : String(ser.first), last_available_year: ser.last === null ? null : String(ser.last),
      expected_observations: expected, recorded_observations: ser.count, verified_missing_observations: expected - ser.count, unclassified_missing_observations: 0,
      coverage_percentage: pct(ser.count, expected), admissible_coverage_percentage: pct(ser.count, expected - counts.C - counts.D - counts.G),
      gaps: counts, primary_category: expected === ser.count ? "complete_against_official_span" : Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      primary_source: `Eurostat ${ser.table}`, secondary_source: `same table and selection as the spliced series annual|${ser.country}|${ser.indicator} (observations.json + annual history), kept separate`, layers: { annual_single_vintage_reference: ser.count ? `${ser.first}–${ser.last}` : null },
      source_status: "verified_against_archived_full_official_extract (single retrieval 2026-11-09, sha256-checked)", rights: "cleared_with_conditions",
      comparability_status: "single vintage: same table, selection, unit and retrieval for every country; compare within this layer only", methodological_break: ser.break_flags.length > 0, break_flags: ser.break_flags, definition_compatible_floor: ser.definition_compatible_floor,
      blocking_reason: null, gap_spans: spans, years_also_admitted: ser.years_also_admitted, max_abs_difference_vs_admitted: ser.max_abs_difference_vs_admitted,
    });
  }
  // UN Comtrade trade-partner structure and the frozen World Bank panel, as the closure audit built them.
  for (const r of closureMatrix().filter((x) => x.store === "trade_network" || x.store === "panel_formal_frame")) {
    const trade = r.store === "trade_network";
    rows.push({
      key: r.key, store: r.store, scope: "national", country_id: r.country, region_id: null, indicator_id: r.indicator, frequency: "annual", unit: null, definition: null,
      first_official_year: null, last_official_year: r.official_last, first_available_year: r.admitted_first, last_available_year: r.admitted_last,
      expected_observations: null, recorded_observations: r.admitted_periods, verified_missing_observations: null, unclassified_missing_observations: null, coverage_percentage: null, admissible_coverage_percentage: null,
      gaps: { ...blank(), ...(trade ? { B: null, E: null } : {}) }, primary_category: trade ? "B" : "out_of_scope_frozen_formal_frame",
      primary_source: r.source, secondary_source: trade ? null : "descriptive equivalents: the annual Eurostat contracts", layers: {},
      source_status: trade ? "official_first_year_not_established" : "frozen_formal_estimation_frame_not_extended", rights: r.rights,
      comparability_status: trade ? "same reporter basis for all countries (2015–2025)" : "formal panel frame; not a descriptive series", methodological_break: false, break_flags: [], definition_compatible_floor: null,
      blocking_reason: trade ? "pre-2015 official availability not established: new as-is UN Comtrade downloads need a rights review (comtradeapi.un.org allowed_licence_review_due); owner decision 2026-11-11: not pursued; also frozen network-model inputs" : "frozen formal estimation frame (2015–2025); never extended by descriptive work",
      gap_spans: [],
    });
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

// Persistent backlog: one open item per contract × category × reason for the categories that could change with work
// or a decision (A, B, E, F), and for D/G spans as documented, closed-by-definition items.
export function buildBacklog(matrix) {
  const items = [];
  for (const r of matrix) {
    // Spans with the same category, reason and period range (e.g. several SORS territorial units) are one item.
    const merged = [];
    for (const g of r.gap_spans) { const m = merged.find((x) => x.category === g.category && x.reason === g.reason && x.from === g.from && x.to === g.to); if (m) m.periods += g.periods; else merged.push({ ...g }); }
    for (const g of merged) {
      const actionable = ["A", "B", "E", "F"].includes(g.category);
      items.push({ id: `gap:${r.key}:${g.category}:${g.from}:${id(g.reason)}`, key: r.key, country_id: r.country_id, region_id: r.region_id, indicator_id: r.indicator_id, frequency: r.frequency,
        category: g.category, category_label: CATEGORY[g.category], periods: g.periods, first_period: g.from, last_period: g.to, reason: g.reason,
        status: actionable ? "open" : "documented_not_fillable", next_action: nextAction(g, r), decision_owner: actionable ? "owner" : null });
    }
    if (r.primary_category === "B" || r.backlog_note) items.push({ id: `gap:${r.key}:B:${id(r.blocking_reason ?? r.backlog_note)}`, key: r.key, country_id: r.country_id, region_id: null, indicator_id: r.indicator_id, frequency: r.frequency,
      category: "B", category_label: CATEGORY.B, periods: null, first_period: null, last_period: r.first_available_year, reason: r.blocking_reason ?? r.backlog_note, status: "open", next_action: r.store === "trade_network" ? "owner decision recorded 2026-11-11 (not pursued); revisit only with a concrete research need and a rights review" : "read the national publication by hand (manual-only host) for earlier years", decision_owner: "owner" });
    if (r.primary_category === "C" && r.store === "annual") items.push({ id: `gap:${r.key}:C:${id(r.blocking_reason)}`, key: r.key, country_id: r.country_id, region_id: null, indicator_id: r.indicator_id, frequency: r.frequency,
      category: "C", category_label: CATEGORY.C, periods: null, first_period: null, last_period: null, reason: r.blocking_reason, status: "documented_not_fillable", next_action: r.secondary_source ? `use the separate national-definition series: ${r.secondary_source}` : null, decision_owner: null });
  }
  const byCategory = {}; for (const i of items) { byCategory[i.category] ??= { items: 0, periods: 0, open: 0 }; byCategory[i.category].items++; byCategory[i.category].periods += i.periods ?? 0; if (i.status === "open") byCategory[i.category].open++; }
  return { schema_version: "historical-gap-backlog-v1", generated_on: MATRIX_DATE, persistent: true,
    rule: "Every gap span of the coverage matrix is one item. Open items (A, B, E, F) need source work or an owner decision; D/C/G items are documented and not fillable without a definition change. An item is closed only by a later matrix in which the span is admitted or reclassified with evidence; items are never deleted.",
    summary: { items: items.length, by_category: Object.fromEntries(Object.entries(byCategory).sort()) }, items };
}
function nextAction(g, r) {
  if (g.category === "A" && /vintage splice/.test(g.reason)) return "owner decision: keep the hold, or refresh the canonical years (formal model input; model-impact review), or publish an unspliced single-vintage reference series";
  if (g.category === "A" && /canonical/.test(g.reason)) return "deliberate canonical refresh in a release (formal model input); not a descriptive backfill";
  if (g.category === "A" && /refresh path/.test(g.reason)) return r.indicator_id.startsWith("hicp") ? "high-frequency re-plan after the full October 2026 HICP release (scheduled 2026-11-19)" : "macro-driver unit is blocked by owner decision; needs a deliberate release";
  if (g.category === "E") return "rights review";
  if (g.category === "F") return "re-run extraction";
  if (g.category === "D") return "none without a definition change; compare only within the definition-compatible span";
  return null;
}

// Indicator comparability contract: one entry per established national indicator, from the manifests and inventory.
const DEFINITIONS = {
  real_gdp_growth: { concept: "GDP at market prices, chain-linked volumes, % change on previous year (ESA 2010)", price_basis: "chain-linked volume (previous-year prices); never nominal growth", seasonal_adjustment: "not applicable (annual)", reference_period: "calendar year" },
  gdp_current_eur: { concept: "GDP at market prices, current prices, million EUR (ESA 2010)", price_basis: "current prices; cross-country levels move with exchange rates", seasonal_adjustment: "not applicable (annual)", reference_period: "calendar year" },
  gdp_per_capita_eur: { concept: "GDP per capita, current prices, EUR per inhabitant", price_basis: "current prices", seasonal_adjustment: "not applicable", reference_period: "calendar year; population denominator revised after censuses (break flags)" },
  gdp_per_capita_pps: { concept: "GDP per capita in purchasing power standards (EU27_2020)", price_basis: "PPS (spatial price adjustment)", seasonal_adjustment: "not applicable", reference_period: "calendar year" },
  hicp_inflation: { concept: "HICP all items, annual average rate of change (%)", price_basis: "consumer prices, HICP methodology", seasonal_adjustment: "not applicable (annual average)", reference_period: "calendar-year average", restriction: "HICP only; national CPI (e.g. the SORS CPI) is never merged with or compared as HICP" },
  energy_inflation: { concept: "HICP CP045 electricity, gas and other fuels, annual average rate of change (%)", price_basis: "consumer prices", seasonal_adjustment: "not applicable", reference_period: "calendar-year average" },
  unemployment_rate: { concept: "LFS (ILO) unemployment rate, 15–74, % of the labour force (Eurostat une_rt_a; break-corrected back data from 2009)", price_basis: "not applicable", seasonal_adjustment: "annual average of monthly estimates", reference_period: "calendar year", restriction: "harmonised LFS rate only; registered unemployment is never used or merged" },
  fiscal_balance_gdp: { concept: "General government (S13) net lending (+)/net borrowing (−), EDP notification, % of GDP (ESA 2010)", price_basis: "current prices ratio", seasonal_adjustment: "not applicable", reference_period: "calendar year", restriction: "general government only; central-government or GFS-1986 consolidated balances (Serbia MinFin) are a separate series" },
  government_debt_gdp: { concept: "General government (S13) gross debt, consolidated, nominal value (Maastricht definition), % of GDP", price_basis: "nominal value ratio", seasonal_adjustment: "not applicable", reference_period: "end of year", restriction: "Maastricht gross debt only; Serbian central-level public debt under national law is a separate series" },
  government_revenue_gdp: { concept: "General government total revenue (TR), % of GDP (ESA 2010)", price_basis: "current prices ratio", seasonal_adjustment: "not applicable", reference_period: "calendar year" },
  government_expenditure_gdp: { concept: "General government total expenditure (TE), % of GDP (ESA 2010)", price_basis: "current prices ratio", seasonal_adjustment: "not applicable", reference_period: "calendar year" },
  current_account_gdp: { concept: "Current account balance, % of GDP (BPM6; Eurostat MIP scoreboard tipsbp20, partner rest of the world)", price_basis: "current prices ratio", seasonal_adjustment: "not applicable", reference_period: "calendar year", restriction: "Serbian BPM6 figures compiled by the NBS (MinFin bulletin) are kept separate from the Eurostat table" },
};
export function buildContract(matrix) {
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const nat = matrix.filter((r) => r.scope === "national" && (r.store === "annual" || r.store === "monthly"));
  const indicators = [...new Set(nat.map((r) => `${r.frequency}|${r.indicator_id}`))].sort();
  return {
    schema_version: "indicator-comparability-contract-v1", generated_on: MATRIX_DATE,
    rules: [
      "Missing periods are absent; null is never zero, and no value is interpolated.",
      "A comparison uses only periods admitted for every compared country under the same definition, unit, frequency and territorial scope (all_country_common_periods / pairwise in the recovery inventory).",
      "A series is never extended across an official break ('b') or definition ('d') flag; break_flags list the official flags and definition_compatible_floor the first admitted period.",
      "Different sources (Eurostat vs SORS vs Serbian MinFin) are separate layers, never merged into one series.",
      "Descriptive layers (annual_history, monthly_history, serbia_*) are not model inputs; observations.json, the frozen high-frequency snapshot and the macro-driver store remain the only model inputs.",
    ],
    indicators: indicators.map((k) => {
      const [frequency, indicator] = k.split("|");
      const rows = nat.filter((r) => r.frequency === frequency && r.indicator_id === indicator);
      const comp = inv.comparability?.[frequency === "annual" ? "national_annual" : "national_monthly"]?.[indicator];
      const units = [...new Set(rows.map((r) => r.unit).filter(Boolean))];
      return { indicator_id: indicator, frequency, unit: units.length === 1 ? units[0] : units, definition: [...new Set(rows.map((r) => r.definition).filter(Boolean))],
        source: [...new Set(rows.map((r) => r.primary_source).filter(Boolean))], territorial_scope: "national totals; Germany from 1991 (unification); Serbia from 1999 (national totals exclude AP Kosovo and Metohija)",
        ...(DEFINITIONS[indicator] ?? {}), definition_check: comp?.definition_check ?? null, all_country_common_periods: comp?.all_country_common_periods ?? null,
        countries: rows.map((r) => ({ country_id: r.country_id, available: r.first_available_year ? `${r.first_available_year}–${r.last_available_year}` : null, recorded: r.recorded_observations, break_flags: r.break_flags, definition_compatible_floor: r.definition_compatible_floor, methodological_break: r.methodological_break, comparability_status: r.comparability_status, primary_category: r.primary_category })) };
    }),
    frontend_contract: {
      availability: "historical_recovery_inventory.json (public/research-data/data-coverage/) → series[].admitted (first/last/periods) and series[].missing.periods[] (from, to, category 1–8, reason). Map categories to A–G with categorise() in scripts/data-coverage/historical-coverage-matrix.mjs.",
      breaks: "series[].floors.break_flags and floors.definition_compatible; show a break marker and never draw or compute a change across it.",
      revision_status: "record value_status / source_flag (p = provisional, e = estimated, b = break, d = definition differs) as published; flags are shown, never dropped.",
      comparability: "comparability.national_annual / national_monthly[indicator].definition_check and all_country_common_periods; when definition_check says levels are not comparable (bilateral FX), disable cross-country comparison.",
    },
  };
}

const MAIN_STORES = new Set(["annual", "monthly", "serbia_sors_annual", "serbia_sors_monthly", "serbia_mfin"]);
function rollup(rows, keyOf) {
  const out = {};
  for (const r of rows) {
    const k = keyOf(r), o = (out[k] ??= { contracts: 0, expected: 0, recorded: 0, gaps: blank(), complete_against_official_span: 0 });
    o.contracts++; o.expected += r.expected_observations ?? 0; o.recorded += r.recorded_observations ?? 0;
    for (const c of Object.keys(CATEGORY)) o.gaps[c] += r.gaps[c] ?? 0;
    if (r.primary_category === "complete_against_official_span") o.complete_against_official_span++;
  }
  for (const o of Object.values(out)) { o.coverage_percentage = pct(o.recorded, o.expected); o.admissible_coverage_percentage = pct(o.recorded, o.expected - o.gaps.C - o.gaps.D - o.gaps.G); }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
export function buildAll() {
  const matrix = buildMatrix();
  const reference = read("src/data/historical/annual_single_vintage_reference.json");
  const national = matrix.filter((r) => r.scope !== "regional");
  const sum = (rows, k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
  const gapTotals = (rows) => Object.fromEntries(Object.keys(CATEGORY).map((c) => [c, rows.reduce((n, r) => n + (r.gaps[c] ?? 0), 0)]));
  const byPrimary = (rows) => rows.reduce((m, r) => (m[r.primary_category] = (m[r.primary_category] ?? 0) + 1, m), {});
  const summary = {
    contracts: matrix.length, by_store: matrix.reduce((m, r) => (m[r.store] = (m[r.store] ?? 0) + 1, m), {}),
    national: { contracts: national.length, expected: sum(national, "expected_observations"), recorded: sum(national, "recorded_observations"), gap_periods: gapTotals(national), unclassified: sum(national, "unclassified_missing_observations"), by_primary_category: byPrimary(national) },
    regional: { contracts: matrix.length - national.length, expected: sum(matrix.filter((r) => r.scope === "regional"), "expected_observations"), recorded: sum(matrix.filter((r) => r.scope === "regional"), "recorded_observations"), gap_periods: gapTotals(matrix.filter((r) => r.scope === "regional")), by_primary_category: byPrimary(matrix.filter((r) => r.scope === "regional")) },
    single_vintage_reference: { series: reference.series.filter((x) => x.count).length, observations: reference.record_count, all_country_common_years: reference.all_country_common_years,
      held_A_periods: matrix.flatMap((r) => r.gap_spans).filter((g) => g.category === "A" && /vintage splice/.test(g.reason)).reduce((n, g) => n + g.periods, 0),
      held_A_periods_published_in_reference: matrix.flatMap((r) => r.gap_spans).filter((g) => g.category === "A" && /vintage splice/.test(g.reason)).reduce((n, g) => n + (g.published_in_single_vintage_reference ?? 0), 0),
      other_A_periods_published_in_reference: matrix.flatMap((r) => r.gap_spans).filter((g) => g.category === "A" && !/vintage splice/.test(g.reason)).reduce((n, g) => n + (g.published_in_single_vintage_reference ?? 0), 0) },
    // Country- and indicator-level summaries of the descriptive and canonical national series (layers kept apart:
    // the reference layer, Comtrade and the panel frame are summarised separately).
    by_country: rollup(national.filter((r) => MAIN_STORES.has(r.store)), (r) => r.country_id),
    by_indicator: rollup(national.filter((r) => MAIN_STORES.has(r.store)), (r) => `${r.store}|${r.frequency}|${r.indicator_id}`),
    contracts_with_unclassified_gaps: matrix.filter((r) => r.unclassified_missing_observations).map((r) => r.key),
    full_historical_coverage: false,
    full_historical_coverage_reason: "Category A periods remain in the spliced series (vintage holds, now published separately in the single-vintage reference layer; frozen canonical years; refresh-path months), UN Comtrade pre-2015 availability is not established (B/E), and earlier Serbian national years are not checked (B).",
  };
  return { matrix: { schema_version: "historical-coverage-matrix-v1", date: MATRIX_DATE, descriptive_only: true, inputs: inputHashes(), categories: CATEGORY, recorded_decisions: RECORDED_DECISIONS,
    definitions: { expected_observations: "periods at the contract frequency from the earlier of first official/first admitted to the later of last official/last admitted (or the last classified gap)", coverage_percentage: "recorded ÷ expected", admissible_coverage_percentage: "recorded ÷ (expected − C − D − G): coverage of the periods that could be admitted under the current definitions", year_fields: "first_/last_*_year hold the period at the contract's own frequency (YYYY, YYYY-MM or YYYY-Qn)" },
    summary, rows: matrix }, backlog: buildBacklog(matrix), contract: buildContract(matrix) };
}

const CSV_COLUMNS = ["key", "store", "scope", "country_id", "region_id", "indicator_id", "frequency", "unit", "definition", "first_official_year", "last_official_year", "first_available_year", "last_available_year", "expected_observations", "recorded_observations", "verified_missing_observations", "coverage_percentage", "admissible_coverage_percentage", "gap_A", "gap_B", "gap_C", "gap_D", "gap_E", "gap_F", "gap_G", "primary_category", "primary_source", "secondary_source", "source_status", "comparability_status", "methodological_break", "break_flags", "blocking_reason", "rights"];
const cell = (v) => v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
export function matrixCsv(rows) {
  const value = (r, c) => c.startsWith("gap_") ? (r.gaps[c.slice(4)] === null ? "not_established" : r.gaps[c.slice(4)]) : c === "break_flags" ? r.break_flags.join(" ") : r[c];
  return [CSV_COLUMNS.join(","), ...rows.map((r) => CSV_COLUMNS.map((c) => cell(value(r, c))).join(","))].join("\n") + "\n";
}
export function outputs() {
  const all = buildAll();
  return [[MATRIX_JSON, JSON.stringify(all.matrix, null, 1) + "\n"], [MATRIX_CSV, matrixCsv(all.matrix.rows)], [BACKLOG_JSON, JSON.stringify(all.backlog, null, 1) + "\n"], [CONTRACT_JSON, JSON.stringify(all.contract, null, 1) + "\n"]];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = outputs();
  if (process.argv.includes("--check")) {
    const stale = out.filter(([p, t]) => !fs.existsSync(path.join(root, p)) || fs.readFileSync(path.join(root, p), "utf8") !== t).map(([p]) => p);
    if (stale.length) { console.error(`historical coverage matrix outputs are stale: ${stale.join(", ")}`); process.exit(1); }
  } else for (const [p, t] of out) fs.writeFileSync(path.join(root, p), t);
  const m = JSON.parse(out[0][1]);
  console.log(JSON.stringify(m.summary, null, 1));
}
