// Read-only historical feasibility audit. No Panel LP fit, public-data export, or imputation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'src/data/historical-extension-audit');
const raw = path.join(out, 'raw');
fs.mkdirSync(raw, { recursive: true });
const geos = ['AT', 'DE', 'SK', 'SI', 'CZ', 'HU', 'PL', 'RO'];
const end = '2025-10'; // frozen v1.82 comparison endpoint, not the latest API month
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
const monthIndex = (p) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1;
const period = (n) => `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`;
const months = (a, b) => Array.from({ length: monthIndex(b) - monthIndex(a) + 1 }, (_, i) => period(monthIndex(a) + i));
const specs = [
  { id: 'hicp', dataset: 'prc_hicp_minr', params: { unit: 'I15', coicop18: 'TOTAL' }, adjustment: 'NSA', classification: 'ECOICOP-2', reference: '2015=100', metadata: 'https://ec.europa.eu/eurostat/cache/metadata/en/prc_hicp_esms.htm' },
  { id: 'ipi', dataset: 'sts_inpr_m', params: { indic_bt: 'PRD', nace_r2: 'B-D', s_adj: 'SCA', unit: 'I21' }, adjustment: 'SCA', classification: 'NACE Rev.2 B-D', reference: '2021=100', metadata: 'https://ec.europa.eu/eurostat/cache/metadata/en/sts_ind_prod_esms.htm' },
  { id: 'unemployment', dataset: 'une_rt_m', params: { s_adj: 'SA', age: 'TOTAL', sex: 'T', unit: 'PC_ACT' }, adjustment: 'SA', classification: 'age 15-74; total sex', reference: '% active population', metadata: 'https://ec.europa.eu/eurostat/cache/metadata/en/une_rt_m_esms.htm' },
  { id: 'yield', dataset: 'irt_lt_mcby_m', params: { int_rt: 'MCBY' }, adjustment: 'monthly average', classification: 'Maastricht criterion bond yield', reference: '% p.a.', metadata: 'https://ec.europa.eu/eurostat/cache/metadata/en/irt_lt_mcby_esms.htm' },
  { id: 'hicp_legacy', dataset: 'prc_hicp_midx', params: { unit: 'I15', coicop: 'CP00' }, adjustment: 'NSA', classification: 'ECOICOP-1 all-items', reference: '2015=100', metadata: 'https://ec.europa.eu/eurostat/cache/metadata/en/prc_hicp_esms.htm' },
];

async function acquire(spec) {
  const query = new URLSearchParams({ format: 'JSON', lang: 'en', ...spec.params });
  for (const geo of geos) query.append('geo', geo);
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${spec.dataset}?${query}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${spec.dataset}: HTTP ${response.status}`);
  const json = JSON.parse(bytes.toString('utf8'));
  if (json.error || !json.id?.includes('geo') || !json.id?.includes('time')) throw new Error(`${spec.dataset}: invalid JSON-stat response`);
  fs.writeFileSync(path.join(raw, `${spec.dataset}.json`), bytes);
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const flat = (geo, time) => json.id.reduce((n, id, i) => n + ordered[id].indexOf(id === 'geo' ? geo : id === 'time' ? time : ordered[id][0]) * stride[i], 0);
  const rows = Object.fromEntries(geos.map((geo) => [geo, Object.fromEntries(ordered.time.map((time) => {
    const index = flat(geo, time);
    return [time, { value: json.value?.[index] ?? null, flag: json.status?.[index] ?? null }];
  }))]));
  return { rows, entry: { id: spec.id, source: 'Eurostat official dissemination API', dataset: spec.dataset, url, retrieved_at: new Date().toISOString(), http_status: response.status, dataset_updated_at: json.updated ?? null, dimensions: Object.fromEntries(json.id.map((id) => [id, ordered[id]]).filter(([id]) => id !== 'time')), time_axis_start: ordered.time[0], time_axis_end: ordered.time.at(-1), raw_row_count: Object.keys(json.value ?? {}).length, raw_status_count: Object.keys(json.status ?? {}).length, sha256: sha(bytes), raw_file: `raw/${spec.dataset}.json`, metadata_url: spec.metadata } };
}

const acquired = {};
for (const spec of specs) { acquired[spec.id] = await acquire(spec); console.log(`${spec.dataset}: ${acquired[spec.id].entry.raw_row_count} values`); }
const axisStart = Math.min(...Object.values(acquired).map((a) => monthIndex(a.entry.time_axis_start)));
const axis = months(period(axisStart), end);
const flagged = (flag) => flag != null && String(flag).trim() !== '';
const breakFlag = (flag) => /b/i.test(String(flag ?? ''));
const first = (list) => list.length ? list[0] : null;
const last = (list) => list.length ? list.at(-1) : null;
const ipiClearedFloors = { AT: '2000-01', DE: '1991-01', SK: '2008-01', SI: '2000-01', CZ: '2000-01', HU: '2000-01' };
const round3Evidence = read('src/data/historical-extension-audit/historical_definition_evidence_registry.json');
const round3ByCell = new Map(round3Evidence.records.map((r) => [`${r.outcome}/${r.country}`, r]));
const round4Evidence = read('src/data/historical-extension-audit/historical_definition_resolution_round4.json');
const round4ByCell = new Map(round4Evidence.records.map((r) => [`${r.outcome}/${r.country}`, r]));
const baselineDefinition = read('src/data/historical-extension-audit/baseline_definition_integrity_audit.json');
const baselineByCell = new Map(baselineDefinition.records.map((r) => [`${r.outcome}/${r.country}`, r]));
const audit = {};
const breaks = [];
for (const spec of specs.filter((s) => s.id !== 'hicp_legacy')) {
  audit[spec.id] = geos.map((geo) => {
    const rows = acquired[spec.id].rows[geo];
    const observed = Object.keys(rows).filter((p) => rows[p].value != null).sort();
    const historical = observed.filter((p) => p < '2015-01');
    const flags = Object.entries(rows).filter(([, v]) => flagged(v.flag)).map(([p, v]) => ({ period: p, flag: v.flag }));
    for (const f of flags) breaks.push({ outcome: spec.id, country: geo, period: f.period, flag: f.flag, type: breakFlag(f.flag) ? 'official_break_flag' : 'official_quality_flag' });
    let overlap = null;
    if (spec.id === 'hicp') {
      const legacy = acquired.hicp_legacy.rows[geo];
      const shared = observed.filter((p) => legacy[p]?.value != null);
      const diffs = shared.map((p) => Math.abs(rows[p].value - legacy[p].value));
      overlap = { overlap_start: first(shared), overlap_end: last(shared), overlap_n: shared.length, overlap_max_abs_difference: diffs.length ? Math.max(...diffs) : null, identical_within_0_05: diffs.length ? Math.max(...diffs) <= 0.05000001 : false };
      if (overlap.overlap_max_abs_difference > 0.05000001) breaks.push({ outcome: spec.id, country: geo, type: 'legacy_overlap_difference', ...overlap });
    }
    const specific = spec.id === 'yield' && geo === 'RO' ? 'Primary-market yields through 2005-12 per Eurostat metadata.' : spec.id === 'yield' && geo === 'SI' ? 'Primary-market yields through 2003-10 per Eurostat metadata.' : null;
    if (specific) breaks.push({ outcome: spec.id, country: geo, type: 'measurement_concept_transition', detail: specific, official_metadata_url: spec.metadata });
    const hicpCleared = spec.id === 'hicp' && overlap?.overlap_n >= 300 && overlap?.identical_within_0_05 && flags.length === 0;
    const ipiFloor = spec.id === 'ipi' ? ipiClearedFloors[geo] : null;
    const ipiCleared = ipiFloor && first(observed) <= ipiFloor && !flags.some((f) => f.period >= ipiFloor && f.period <= end);
    const unemploymentCleared = spec.id === 'unemployment' && geo === 'CZ' && flags.length === 0;
    const decision = round4ByCell.get(`${spec.id}/${geo}`) ?? round3ByCell.get(`${spec.id}/${geo}`);
    const decisionStart = decision?.status === 'verified' ? decision.supports_start_date : null;
    const compatible = hicpCleared ? first(observed) : ipiCleared ? ipiFloor : unemploymentCleared ? first(observed) : decisionStart;
    const blocker = compatible ? null : decision?.remaining_uncertainty ?? (spec.id === 'unemployment' ? 'Country-specific LFS and 2021 IESS break-correction review required.' : spec.id === 'ipi' ? 'Country-specific NACE Rev.2 backcast and adjustment-history review required.' : spec.id === 'yield' ? 'Country-specific bond-basket/source-transition review required.' : 'ECOICOP-2 all-items back-series/legacy overlap not yet cleared.');
    const baseline = baselineByCell.get(`${spec.id === 'ipi' ? 'industrial_production' : spec.id === 'yield' ? 'long_term_yield' : spec.id}/${geo}`);
    const baselineDecision = baseline?.compatibility_decision ?? 'current_baseline_definition_cleared';
    return { country: geo, source_dataset: spec.dataset, source_query_id: spec.id, earliest_available: first(observed), earliest_pre_2015_available: first(historical), earliest_definition_compatible: compatible, earliest_known_compatible: compatible, earliest_pre2015_compatible: compatible && compatible < '2015-01' ? compatible : null, current_baseline_compatible: baselineDecision === 'current_baseline_definition_cleared' ? true : baselineDecision === 'current_baseline_definition_warning' ? 'warning' : 'blocked', current_baseline_warning: baselineDecision === 'current_baseline_definition_warning' ? baseline.remaining_uncertainty : null, pre2015_extension_status: compatible ? 'cleared' : decision?.pre2015_extension_status ?? 'blocked_for_pre2015_extension', pre2015_blocker: blocker, latest: last(observed), seasonal_adjustment: spec.adjustment, classification: spec.classification, index_reference: spec.reference, observed_months: observed.length, missing_months_to_frozen_end: axis.filter((p) => p >= (first(observed) ?? end) && p <= end && rows[p]?.value == null).length, flags, break_flags: flags.filter((f) => breakFlag(f.flag)), ...(overlap ?? {}), extension_ready: compatible !== null, blocker, country_specific_note: specific, vintage: 'latest_revised_not_real_time' };
  });
}

// Official national metadata narrows plausible floors; it does not by itself clear
// every monthly source/adjustment transition or turn an API value into an LP sample.
const ipiReview = {
  AT: ['2000-01', 'National metadata documents NACE Rev.2 back-series from 2000 and no series break; API has earlier values that are not covered by that claim.'],
  DE: ['1991-01', 'National metadata describes consistent whole-Germany series from 1991 with no time-series breaks.'],
  SK: ['2008-01', 'National metadata says time series are comparable from reference year 2008.'],
  SI: ['2000-01', 'National metadata describes recalculated comparable series from 2000; API has earlier values not covered by that statement.'],
  CZ: ['2000-01', 'National metadata says relevant monthly series start in 2000.'],
  HU: ['2000-01', 'National metadata says 2000–2008 series were recalculated to the current NACE Rev.2-aligned classification.'],
  PL: ['2000-01', 'National metadata gives NACE Rev.2 series from 2000 but notes a 2021 statistical-unit change (LEU to KAU); bridge assessment remains open.'],
  RO: [null, 'National metadata only says no major methodological changes over the last 15 years; no precise pre-2015 comparable start is certified.'],
};
const unemploymentMode = { AT: 'monthly_LFS', DE: 'monthly_LFS_trend_labelled_SA', SK: 'quarterly_LFS_benchmarked_registered_counts', SI: 'quarterly_LFS_benchmarked_registered_counts', CZ: 'monthly_LFS', HU: 'monthly_LFS_state_space_from_2023_revised_back_to_2011', PL: 'quarterly_LFS_benchmarked_registered_counts', RO: 'monthly_LFS' };
const pdf = 'https://ec.europa.eu/eurostat/cache/metadata/Annexes/une_rt_m_esms_an_Sources_and_methods_for_MUR.pdf';
const pdfPage = { AT: '18-19', DE: '9-10', SK: '49-50', SI: '61-62', CZ: '6-7', HU: '14', PL: '47-48', RO: '22' };
const review = [
  ...audit.hicp.map((r) => ({ outcome: 'hicp', country: r.country, documented_comparability_start: r.earliest_definition_compatible, disposition: r.extension_ready ? 'cleared_revised_all_items_backseries' : 'pending', evidence: ['https://ec.europa.eu/eurostat/cache/metadata/en/prc_hicp_esms.htm', 'src/data/high-frequency/hicp_migration_manifest.json', 'historical_hicp_extension_audit.json'], note: 'Current ECOICOP-2 all-items back-series used directly; full legacy overlap within 0.05 index point; no splice or rebasing.' })),
  ...geos.map((geo) => { const decision = round4ByCell.get(`ipi/${geo}`) ?? round3ByCell.get(`ipi/${geo}`); return { outcome: 'ipi', country: geo, documented_comparability_start: ipiReview[geo][0], earliest_definition_compatible: audit.ipi.find((r) => r.country === geo).earliest_definition_compatible, disposition: decision?.disposition ?? 'cleared_current_revised_nace_rev2_series', evidence: decision?.evidence_urls ?? [`https://ec.europa.eu/eurostat/cache/metadata/EN/sts_ind_prod_esms_${geo.toLowerCase()}.htm`], note: decision?.evidence_summary ?? ipiReview[geo][1], break_periods: decision?.break_periods ?? [], remaining_uncertainty: decision?.remaining_uncertainty ?? null } }),
  ...geos.map((geo) => { const decision = round4ByCell.get(`unemployment/${geo}`) ?? round3ByCell.get(`unemployment/${geo}`); const row = audit.unemployment.find((r) => r.country === geo); return { outcome: 'unemployment', country: geo, earliest_available: row.earliest_available, earliest_definition_compatible: row.earliest_definition_compatible, documented_comparability_start: row.earliest_definition_compatible, disposition: decision?.disposition ?? 'cleared_latest_revised_ilo_series', current_methodology: unemploymentMode[geo], historical_methodology: geo === 'CZ' ? 'ILO-based LFS history from onset per Eurostat methods annex' : 'Pre-IESS historical derivation differs before the documented country boundary', back_revision_status: geo === 'CZ' ? 'latest revised Eurostat series; no country-specific IESS break boundary documented' : geo === 'HU' ? 'IESS back-correction; 2023 state-space revision documented for 2011-2022 only' : 'past une_rt_m overwritten by Eurostat IESS break-correction', IESS_status: geo === 'CZ' ? 'no country-specific IESS boundary in correction note' : decision?.status === 'verified' ? 'post-boundary current revised portion documented' : 'documented boundary, later flag or method conflict unresolved', source_mode_in_current_method_annex: unemploymentMode[geo], vintage_limitation: 'latest revised only; not real-time vintage', evidence: decision?.evidence_urls ?? ['https://ec.europa.eu/eurostat/cache/metadata/en/une_rt_m_esms.htm', `${pdf}#page=${pdfPage[geo].split('-')[0]}`, ...(decision ? ['https://ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/94764.pdf'] : [])], note: decision?.evidence_summary ?? 'Official methods annex states Czech ILO concept from onset; no API flags; latest revised series only.', break_periods: decision?.break_periods ?? [], remaining_uncertainty: decision?.remaining_uncertainty ?? null } }),
  ...geos.map((geo) => { const decision = round3ByCell.get(`yield/${geo}`); return { outcome: 'yield', country: geo, documented_comparability_start: decision.supports_start_date, disposition: decision.disposition, evidence: ['https://ec.europa.eu/eurostat/cache/metadata/en/irt_lt_mcby_esms.htm'], note: decision.evidence_summary, break_periods: decision.break_periods, remaining_uncertainty: decision.remaining_uncertainty } }),
];

// A non-null Eurostat value establishes mathematical availability, not definition compatibility.
const matrix = axis.map((p) => {
  const outcomes = Object.fromEntries(specs.filter((s) => s.id !== 'hicp_legacy').map((s) => {
    const cells = Object.fromEntries(geos.map((geo) => {
      const row = acquired[s.id].rows[geo]?.[p];
      const knownIncompatible = s.id === 'yield' && ((geo === 'RO' && p <= '2005-12') || (geo === 'SI' && p <= '2003-10'));
      const clearedStart = audit[s.id].find((r) => r.country === geo).earliest_definition_compatible;
      const status = row?.value == null ? 'missing' : knownIncompatible ? 'definition_incompatible' : breakFlag(row.flag) ? 'break_affected' : flagged(row.flag) || (p < '2015-01' && (!clearedStart || p < clearedStart)) ? 'pending_review' : 'available';
      return [geo, { status, value_present: row?.value != null, eurostat_flag: row?.flag ?? null }];
    }));
    return [s.id, { countries: cells, mathematically_common: geos.every((geo) => cells[geo].value_present), outcome_common_month: geos.every((geo) => cells[geo].status === 'available') }];
  }));
  return { period: p, outcomes, all_four_mathematically_common: Object.values(outcomes).every((o) => o.mathematically_common), all_four_outcomes_common_month: Object.values(outcomes).every((o) => o.outcome_common_month) };
});
const earliestMathematical = Object.fromEntries(['hicp', 'ipi', 'unemployment', 'yield'].map((id) => [id, first(matrix.filter((r) => r.outcomes[id].mathematically_common).map((r) => r.period))]));
earliestMathematical.all_four = first(matrix.filter((r) => r.all_four_mathematically_common).map((r) => r.period));

const shocks = {
  MP: read('src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json'),
  CBI: read('src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json'),
};
const shockMap = Object.fromEntries(Object.entries(shocks).map(([id, data]) => [id, new Map(data.records.map((r) => [r.period, r.value]))]));
const concentration = (periods, id) => {
  const values = periods.map((p) => shockMap[id].get(p)).filter((v) => Number.isFinite(v));
  const squared = values.map((v) => v * v).sort((a, b) => b - a);
  const total = squared.reduce((a, b) => a + b, 0);
  return { calendar_months_with_identified_shock_record: values.length, nonzero_months: values.filter((v) => v !== 0).length, largest_squared_shock_share: total ? squared[0] / total : null, top_three_squared_shock_share: total ? squared.slice(0, 3).reduce((a, b) => a + b, 0) / total : null, support_unit: 'month_not_country_row' };
};
const registry = read('src/data/panel-local-projections/panel_lp_sample_registry.json');
const base = registry.records[0].horizons;
const horizons = [6, 12, 18, 24];
const candidates = [earliestMathematical.all_four, '2009-01', '2010-01', '2012-01', '2015-01'].filter((x, i, a) => x && a.indexOf(x) === i && x <= end);
const support = candidates.map((start) => {
  const seq = months(start, end);
  const pMax = Math.ceil(Math.cbrt(Math.max(0, seq.length - 24)));
  const hdata = Object.fromEntries([0, ...horizons].map((h) => {
    const p = Math.min(h, pMax);
    const valid = seq.filter((t, i) => i >= Math.max(1, p + 1) && i + h < seq.length && seq.slice(i - Math.max(1, p + 1), i + h + 1).every((m) => matrix.find((r) => r.period === m)?.all_four_mathematically_common));
    return [h, { potential_all_four_time_clusters: valid.length, p_h: p, p_max: pMax, MP: concentration(valid, 'MP'), CBI: concentration(valid, 'CBI') }];
  }));
  return { start, endpoint: end, calendar_months: seq.length, label: start === '2015-01' ? 'frozen_baseline_calendar_preflight' : 'mathematical_availability_only_not_definition_cleared', estimand_regime_eligible: start >= '2009-01', horizons: hdata };
});
const baseline = support.find((s) => s.start === '2015-01');
const gains = support.map((s) => ({ start: s.start, eligibility: s.label, delta_calendar_months: s.calendar_months - baseline.calendar_months, delta_h24_potential_clusters: s.horizons[24].potential_all_four_time_clusters - baseline.horizons[24].potential_all_four_time_clusters, MP: { delta_nonzero_h24_months: s.horizons[24].MP.nonzero_months - baseline.horizons[24].MP.nonzero_months, delta_largest_share: s.horizons[24].MP.largest_squared_shock_share - baseline.horizons[24].MP.largest_squared_shock_share, delta_top_three_share: s.horizons[24].MP.top_three_squared_shock_share - baseline.horizons[24].MP.top_three_squared_shock_share }, CBI: { delta_nonzero_h24_months: s.horizons[24].CBI.nonzero_months - baseline.horizons[24].CBI.nonzero_months, delta_largest_share: s.horizons[24].CBI.largest_squared_shock_share - baseline.horizons[24].CBI.largest_squared_shock_share, delta_top_three_share: s.horizons[24].CBI.top_three_squared_shock_share - baseline.horizons[24].CBI.top_three_squared_shock_share } }));

const regime = [
  ...[['AT', '1999-01'], ['DE', '1999-01'], ['SI', '2007-01'], ['SK', '2009-01']].flatMap(([country, adoption]) => [
    { country, period_start: '1999-01', period_end: period(monthIndex(adoption) - 1), monetary_regime: 'pre_euro_national_currency', euro_member: false, ECB_policy_directly_applicable: false, notes: 'Exclude from fixed Euro-group direct-policy semantics before adoption.' },
    { country, period_start: adoption, period_end: end, monetary_regime: 'euro_member', euro_member: true, ECB_policy_directly_applicable: true, notes: 'Direct ECB policy semantics.' },
  ].filter((x) => x.period_start <= x.period_end)),
  ...['CZ', 'HU', 'PL', 'RO'].map((country) => ({ country, period_start: '1999-01', period_end: end, monetary_regime: 'non_euro_national_currency', euro_member: false, ECB_policy_directly_applicable: false, notes: 'External ECB spillover only.' })),
];
const context = [
  { period_start: '2007-08', period_end: '2009-06', context: 'Global financial crisis', relevance: 'Potential transmission-regime change; no trimming' },
  { period_start: '2010-01', period_end: '2013-12', context: 'Euro-area sovereign debt crisis', relevance: 'Potential transmission-regime change; no trimming' },
  { period_start: '2014-06', period_end: '2022-07', context: 'Zero/negative ECB policy-rate period', relevance: 'Potential transmission-regime change; no trimming' },
  { period_start: '2020-03', period_end: '2022-12', context: 'COVID-19 period', relevance: 'Potential transmission-regime change; no trimming' },
  { period_start: '2021-01', period_end: end, context: 'Inflation surge and monetary tightening', relevance: 'Potential transmission-regime change; no trimming' },
];
save('historical_extension_source_manifest.json', { schema_version: 'historical-extension-audit-v1', frozen_endpoint: end, sources: specs.map((s) => acquired[s.id].entry), official_metadata: specs.map((s) => s.metadata), vintage_limitation: 'Eurostat latest revised series only; no first-publication vintage claims' });
for (const id of ['hicp', 'ipi', 'unemployment', 'yield']) save(`historical_${id}_extension_audit.json`, { outcome: id, country_count: 8, records: audit[id] });
const compatibleCommon = Object.fromEntries(['hicp', 'ipi', 'unemployment', 'yield'].map((id) => [id, first(matrix.filter((r) => r.period < '2015-01' && r.outcomes[id].outcome_common_month).map((r) => r.period))]));
compatibleCommon.all_four = first(matrix.filter((r) => r.period < '2015-01' && r.all_four_outcomes_common_month).map((r) => r.period));
save('historical_common_sample_matrix.json', { period_start: axis[0], period_end: end, countries: geos, earliest_mathematically_common: earliestMathematical, definition_compatible_pre_2015_common_starts: compatibleCommon, warning: 'Definition-compatible starts are derived from documented country floors and unflagged observed months; they do not activate LP estimation or override the frozen production vintage.', records: matrix });
save('historical_country_definition_review.json', { schema_version: 'historical-country-definition-review-v1', evidence_scope: 'official Eurostat metadata and monthly-method annex; no LP estimates', records: review });
save('historical_definition_break_registry.json', { records: breaks, final_unresolved_pre2015: ['IPI PL: no official pre-2021 KAU B-D SCA bridge', 'IPI RO: no exact official pre-2015 comparable floor', 'Unemployment SK: 2011-09 d unexplained', 'Unemployment PL: 2009-12 d unexplained'], further_general_source_hunting: false });
save('historical_extension_support_gain.json', { shock_series_ids: Object.fromEntries(Object.entries(shocks).map(([k, v]) => [k, v.shock_series_id])), shock_calendar_end: end, support_unit: 'month_not_country_row', support_is_potential_only: true, current_registry_h0: base.find((h) => h.horizon === 0), current_registry_h24: base.find((h) => h.horizon === 24), candidate_windows: support, gains, definition_cleared_design_A: null });
save('historical_monetary_regime_registry.json', { sources: ['https://www.ecb.europa.eu/euro/changeover/slovakia/html/index.en.html', 'https://www.ecb.europa.eu/press/pr/date/2007/html/pr070102.en.html'], records: regime });
save('historical_macro_regime_context.json', { descriptive_only: true, no_sample_trimming: true, records: context });
const closure = { schema_version: 'historical-extension-research-conclusion-v1.83', study_period: '2026-09-18..2026-09-27', formal_release: 'v1.83 Historical Extension Research Closure & Baseline Definition Disclosure', research_question: 'Can the fixed eight-country, four-outcome Panel LP be extended before 2015 under the existing official-evidence and definition-compatibility standard?', baseline_window: '2015-01..2025-10', mathematical_availability: { all_four_start: earliestMathematical.all_four, interpretation: 'calendar availability only; not definition-cleared' }, mathematical_common_floors: { ...earliestMathematical, interpretation: 'calendar availability only; not definition-cleared' }, definition_cleared_outcomes: ['hicp', 'yield'], blocked_outcomes: ['ipi', 'unemployment'], country_level_clearances: { hicp: 'all eight from 1996-12 common floor', yield: 'all eight from 2006-01 common floor; Slovenia 2025 e flags preserved', unemployment: { AT: '2004-01', DE: '2009-01', SI: '2009-01', CZ: '1993-01', HU: '2011-01 latest-revised', RO: '2009-01 latest-revised' } }, country_clearance_summary: { hicp: 'all eight from 1996-12 common floor', yield: 'all eight from 2006-01 common floor; Slovenia 2025 e flags preserved', unemployment: 'AT 2004-01; DE 2009-01; SI 2009-01; CZ 1993-01; HU 2011-01 latest-revised; RO 2009-01 latest-revised' }, country_level_blockers: { ipi: { PL: 'no official pre-2021 KAU B-D/SCA bridge', RO: 'no exact official pre-2015 comparability floor' }, unemployment: { SK: '2011-09 d flag unexplained', PL: '2009-12 d flag unexplained' } }, country_blocker_summary: { ipi: 'PL lacks an official pre-2021 KAU B-D/SCA bridge; RO lacks an exact official pre-2015 comparability floor.', unemployment: 'SK 2011-09 d and PL 2009-12 d remain unexplained by official documentation.' }, euro_regime_floor: '2009-01', fixed_euro_regime_floor: '2009-01', Design_A_status: 'blocked_for_pre2015_extension', Design_A_start: null, potential_information_gain: { window: '2009-01 mathematical preflight versus 2015-01 baseline', calendar_months: 72, h24_time_clusters: { baseline: 100, potential: 171 }, h24_MP_nonzero_months: { baseline: 67, potential: 136 }, h24_CBI_nonzero_months: { baseline: 67, potential: 136 }, boundary: 'Not definition-cleared gain, not new estimation support, and not evidence that any inference gate would pass.' }, potential_information_support: { status: 'potential_mathematical_preflight_not_definition_cleared_not_estimable_sample', window: '2009-01 mathematical preflight versus 2015-01 baseline', h24_time_clusters: { current: 100, mathematical_preflight_2009: 171, potential_gain: 71 }, h24_MP_nonzero_months: { current: 67, mathematical_preflight_2009: 136, potential_gain: 69 }, h24_CBI_nonzero_months: { current: 67, mathematical_preflight_2009: 136, potential_gain: 69 }, r2_boundary: 'Potential information cannot overturn, repair, or reinterpret the v1.82 whole-path inference research closure.' }, baseline_definition_integrity: 'nonblocking_warning', formal_result_decision: 'retain_2015_formal_baseline', formal_decision: 'retain_2015_four_outcome_baseline', historical_four_outcome_activation: false, historical_panel_estimation: 'not_run', historical_panel_preregistration: 'not_open', future_options: ['Continue the current 2015 four-outcome baseline.', 'A reduced-outcome historical study requires a new research question, owner approval and preregistration.', 'Reassess only if a new official harmonised bridge or source appears; this is not current backlog work.'], future_reopen_conditions: ['A new official harmonised bridge or source resolves the present definition blockers.', 'The owner approves a new research question and preregistration before any reduced-outcome or historical Panel estimation.'], research_closed: true, current_program_closed: true, remaining_blockers_are_terminal_under_current_evidence: true, provenance: { starting_commit: '0f5f272d82a7498db9116d18e1695943f1fc0fe4', round4_registry: 'historical_definition_resolution_round4.json', definition_evidence_registry: 'historical_definition_evidence_registry.json', source_manifest: 'historical_extension_source_manifest.json', panel_lp_results_sha256: '10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc', panel_estimates_run: 0, research_simulations_run: 0 } };
closure.Design_A_detail_status = closure.Design_A_status;
closure.Design_A_status = 'blocked';
save('historical_extension_research_conclusion.json', closure);
save('historical_extension_readiness.json', { schema_version: 'historical-extension-readiness-v1.83', state: 'closed_current_four_outcome_extension_program', research_status: 'completed', four_outcome_extension_status: 'blocked', historical_audit: 'completed', four_outcome_historical_extension: 'blocked', future_reduced_outcome_research: 'not_started', decision: 'retain_2015_formal_baseline', formal_decision: 'retain_2015_four_outcome_baseline', Design_A_status: 'blocked', Design_A_start: null, historical_four_outcome_activation: false, historical_panel_activation: false, historical_panel_estimation: 'not_run', historical_panel_estimation_run: false, historical_panel_preregistration: 'not_open', historical_panel_preregistration_open: false, research_closed: true, current_program_closed: true, remaining_blockers_are_terminal_under_current_evidence: true, remaining_blockers_terminal_under_current_evidence: true, owner_reopening_required: true, baseline_definition_integrity: 'nonblocking_warning', no_new_panel_estimates: true, no_joint_inference_reopening: true, no_interpolation: true, current_canonical_observations_modified: false, current_panel_results_modified: false, earliest_mathematically_common: earliestMathematical, earliest_definition_compatible_common_start: compatibleCommon.all_four, cleared_outcomes: ['hicp', 'yield'], outcome_states: { hicp: 'cleared', ipi: 'blocked_for_historical_extension', unemployment: 'blocked_for_historical_extension', yield: 'cleared_with_preserved_quality_flags' }, design_A: { status: 'blocked_for_pre2015_extension', earliest_regime_permitted_start: '2009-01', definition_compatible_start: null, requires_new_owner_approved_research_question_to_reopen: true }, future_options: { A: 'continue_current_2015_four_outcome_baseline', B: 'new_owner_approved_preregistered_reduced_outcome_study', C: 'reassess_only_if_new_official_harmonised_bridge_or_source_appears' }, state_dependent_LP: 'not_started', blockers: ['IPI: PL 2021 LEU-to-KAU transition lacks an official B-D SCA pre-2021 bridge; RO has no exact pre-2015 comparable floor.', 'Unemployment: SK 2011-09 d and PL 2009-12 d remain unexplained by official documentation.', 'No all-eight four-outcome definition-cleared Design A window.'], owner_approval_required_for_any_new_research: true, push: false, deploy: false });
console.log(`Audit artifacts written to ${out}; historical four-outcome program=closed/blocked; no LP estimation.`);
