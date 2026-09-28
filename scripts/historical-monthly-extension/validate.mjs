import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'src/data/historical-extension-audit');
const load = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const geos = ['AT', 'DE', 'SK', 'SI', 'CZ', 'HU', 'PL', 'RO'];
const outcomes = ['hicp', 'ipi', 'unemployment', 'yield'];
const manifest = load('historical_extension_source_manifest.json');
const matrix = load('historical_common_sample_matrix.json');
const readiness = load('historical_extension_readiness.json');
const support = load('historical_extension_support_gain.json');
const evidence = load('historical_definition_evidence_registry.json');
const resolution = load('historical_definition_resolution_round4.json');
check(evidence.records.length === 17, 'round-3 evidence must cover 2 IPI, 7 unemployment and 8 yield cells');
const evidenceByCell = new Map(evidence.records.map((r) => [`${r.outcome}/${r.country}`, r]));
check(resolution.prior_adverse_records_preserved && resolution.records.length === 6, 'round-4 final resolution must preserve the earlier adverse registry');
const resolutionByCell = new Map(resolution.records.map((r) => [`${r.outcome}/${r.country}`, r]));
check(resolutionByCell.size === 6, 'duplicate round-4 resolution cell');
for (const row of resolution.records) {
  check(evidenceByCell.has(`${row.outcome}/${row.country}`) && row.evidence_urls?.length && row.remaining_uncertainty, `round-4 cell lacks prior evidence or official source: ${row.outcome}/${row.country}`);
  check((row.status === 'verified') === (row.supports_start_date !== null), `round-4 unsupported clearance: ${row.outcome}/${row.country}`);
  check(row.status === 'verified' || row.pre2015_extension_status.startsWith('blocked'), `unresolved round-4 cell: ${row.outcome}/${row.country}`);
}
check(evidenceByCell.size === 17, 'duplicate country-outcome evidence cell');
const sourceIds = new Set(evidence.sources.map((s) => s.id));
check(sourceIds.size === evidence.sources.length, 'duplicate evidence source');
for (const source of evidence.sources) check(/^https:\/\/(ec\.europa\.eu|www\.ecb\.europa\.eu|stat\.gov\.pl)\//.test(source.source_url) && /^[a-f0-9]{64}$/.test(source.sha256) && source.retrieved_at, `unverified source registry entry: ${source.id}`);
for (const row of evidence.records) {
  check(['verified', 'supports_partial', 'conflict', 'insufficient'].includes(row.status), `invalid evidence status: ${row.outcome}/${row.country}`);
  check(row.source_ids.length > 0 && row.source_ids.every((id) => sourceIds.has(id)), `missing official evidence: ${row.outcome}/${row.country}`);
  check(row.evidence_summary && row.claim && row.disposition && row.remaining_uncertainty !== undefined, `incomplete evidence: ${row.outcome}/${row.country}`);
  check((row.status === 'verified') === (row.supports_start_date !== null), `unsupported clearance date: ${row.outcome}/${row.country}`);
}

check(manifest.sources.length === 5, 'expected four official series plus HICP legacy');
const sourceById = Object.fromEntries(manifest.sources.map((s) => [s.id, s]));
const compatibleStarts = {};
const decoded = {};
for (const source of manifest.sources) {
  check(source.source === 'Eurostat official dissemination API', `non-official source: ${source.id}`);
  check(source.url.startsWith(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${source.dataset}?`), `unapproved URL: ${source.id}`);
  check(source.http_status === 200 && source.retrieved_at && source.dataset_updated_at, `incomplete acquisition log: ${source.id}`);
  const bytes = fs.readFileSync(path.join(dir, source.raw_file));
  check(hash(bytes) === source.sha256, `raw checksum mismatch: ${source.id}`);
  const raw = JSON.parse(bytes.toString('utf8'));
  check(Object.keys(raw.value ?? {}).length === source.raw_row_count, `raw row mismatch: ${source.id}`);
  check(raw.updated === source.dataset_updated_at, `source update time mismatch: ${source.id}`);
  check(raw.id.includes('time') && raw.id.includes('geo'), `missing dimensions: ${source.id}`);
  check(geos.every((geo) => geo in raw.dimension.geo.category.index), `missing country: ${source.id}`);
  const positions = Object.fromEntries(raw.id.map((id) => [id, raw.dimension[id].category.index]));
  const strides = raw.size.map((_, i) => raw.size.slice(i + 1).reduce((a, b) => a * b, 1));
  decoded[source.id] = (geo, time) => {
    if (!(time in positions.time)) return { value: null, flag: null };
    const flat = raw.id.reduce((n, id, i) => {
      const key = id === 'geo' ? geo : id === 'time' ? time : Object.keys(positions[id])[0];
      return n + positions[id][key] * strides[i];
    }, 0);
    return { value: raw.value?.[flat] ?? null, flag: raw.status?.[flat] ?? null };
  };
}

for (const id of outcomes) {
  const audit = load(`historical_${id}_extension_audit.json`);
  compatibleStarts[id] = Object.fromEntries(audit.records.map((r) => [r.country, r.earliest_definition_compatible]));
  check(audit.records.length === 8, `country count: ${id}`);
  check(new Set(audit.records.map((r) => r.country)).size === 8 && geos.every((g) => audit.records.some((r) => r.country === g)), `country identity: ${id}`);
  for (const row of audit.records) {
    check(row.source_dataset === sourceById[id].dataset, `series identity: ${id}/${row.country}`);
    check(row.earliest_available <= row.latest && row.latest >= '2025-10', `monthly continuity endpoint: ${id}/${row.country}`);
    if (id === 'hicp') check(row.earliest_definition_compatible === row.earliest_available && row.extension_ready === true && row.overlap_n >= 300 && row.overlap_max_abs_difference <= 0.05000001, `HICP overlap clearance: ${row.country}`);
    else if (id === 'ipi' && ['AT', 'DE', 'SK', 'SI', 'CZ', 'HU'].includes(row.country)) check(row.extension_ready && row.earliest_definition_compatible !== null, `IPI national metadata clearance: ${row.country}`);
    else if (id === 'unemployment' && row.country === 'CZ') check(row.extension_ready && row.earliest_definition_compatible === row.earliest_available, 'CZ unemployment ILO clearance');
    else {
      const decision = resolutionByCell.get(`${id}/${row.country}`) ?? evidenceByCell.get(`${id}/${row.country}`);
      check(decision && row.earliest_definition_compatible === decision.supports_start_date && row.extension_ready === (decision.status === 'verified'), `round-3 clearance mismatch: ${id}/${row.country}`);
      if (!row.extension_ready) check(row.blocker && decision.remaining_uncertainty, `null start without blocker: ${id}/${row.country}`);
    }
    check(row.vintage === 'latest_revised_not_real_time', `vintage claim: ${id}/${row.country}`);
    check(row.earliest_known_compatible === row.earliest_definition_compatible && row.earliest_pre2015_compatible === row.earliest_definition_compatible && row.current_baseline_compatible !== 'blocked' && ['cleared', 'blocked_for_pre2015_extension', 'blocked_insufficient_official_date'].includes(row.pre2015_extension_status), `baseline/extension schema separation: ${id}/${row.country}`);
  }
}

check(matrix.countries.join(',') === geos.join(','), 'matrix country identity');
check(matrix.period_end === '2025-10', 'matrix must stop at frozen comparison endpoint');
const months = matrix.records.map((r) => r.period);
check(new Set(months).size === months.length, 'duplicate matrix month');
for (let i = 1; i < months.length; i++) {
  const a = Number(months[i - 1].slice(0, 4)) * 12 + Number(months[i - 1].slice(5));
  const b = Number(months[i].slice(0, 4)) * 12 + Number(months[i].slice(5));
  check(b - a === 1, `non-contiguous monthly axis: ${months[i]}`);
}
for (const row of matrix.records) {
  for (const id of outcomes) {
    const outcome = row.outcomes[id];
    check(outcome && geos.every((g) => g in outcome.countries), `incomplete matrix: ${row.period}/${id}`);
    for (const geo of geos) {
      const cell = outcome.countries[geo];
      const official = decoded[id](geo, row.period);
      check(cell.value_present === (official.value != null) && cell.eurostat_flag === official.flag, `raw/matrix mismatch: ${row.period}/${id}/${geo}`);
      check(['available', 'missing', 'definition_incompatible', 'break_affected', 'pending_review'].includes(cell.status), `unknown status: ${row.period}/${id}/${geo}`);
      check(cell.status !== 'missing' || !cell.value_present, `missing treated as zero: ${row.period}/${id}/${geo}`);
      check(row.period >= '2015-01' || cell.status !== 'available' || (compatibleStarts[id][geo] !== null && row.period >= compatibleStarts[id][geo]), `uncleared pre-2015 value: ${row.period}/${id}/${geo}`);
    }
    check(outcome.outcome_common_month === geos.every((g) => outcome.countries[g].status === 'available'), `outcome common-month mismatch: ${row.period}/${id}`);
  }
  check(row.all_four_outcomes_common_month === outcomes.every((id) => row.outcomes[id].outcome_common_month), `all-four common-month mismatch: ${row.period}`);
}
const review = load('historical_country_definition_review.json');
check(review.records.length === 32, 'country-definition review must cover 8 x 4 cells');
check(review.records.filter((r) => r.outcome === 'hicp' && r.disposition === 'cleared_revised_all_items_backseries').length === 8, 'HICP review clearance mismatch');
check(review.records.filter((r) => r.outcome === 'ipi' && r.disposition === 'cleared_current_revised_nace_rev2_series').length === 6, 'IPI review clearance count');
check(review.records.find((r) => r.outcome === 'unemployment' && r.country === 'CZ').disposition === 'cleared_latest_revised_ilo_series', 'CZ unemployment review status');
check(review.records.find((r) => r.outcome === 'ipi' && r.country === 'SK').documented_comparability_start === '2008-01', 'Slovakia IPI comparability floor');
check(review.records.find((r) => r.outcome === 'yield' && r.country === 'RO').documented_comparability_start === '2006-01', 'Romania yield concept floor');
for (const geo of geos) {
  const row = review.records.find((r) => r.outcome === 'unemployment' && r.country === geo);
  check(row?.earliest_available && row.earliest_definition_compatible === compatibleStarts.unemployment[geo] && row.current_methodology && row.historical_methodology && row.back_revision_status && row.IESS_status && row.vintage_limitation && row.evidence.length >= 2, `incomplete unemployment country review: ${geo}`);
}
for (const decision of evidence.records) {
  if (resolutionByCell.has(`${decision.outcome}/${decision.country}`)) continue;
  const row = review.records.find((r) => r.outcome === decision.outcome && r.country === decision.country);
  check(row?.disposition === decision.disposition && row.remaining_uncertainty === decision.remaining_uncertainty, `review/evidence mismatch: ${decision.outcome}/${decision.country}`);
}
for (const decision of resolution.records) {
  const row = review.records.find((r) => r.outcome === decision.outcome && r.country === decision.country);
  check(row?.disposition === decision.disposition && row.remaining_uncertainty === decision.remaining_uncertainty, `review/resolution mismatch: ${decision.outcome}/${decision.country}`);
}
check(matrix.definition_compatible_pre_2015_common_starts.hicp === '1996-12' && matrix.definition_compatible_pre_2015_common_starts.yield === '2006-01' && matrix.definition_compatible_pre_2015_common_starts.ipi === null && matrix.definition_compatible_pre_2015_common_starts.unemployment === null && matrix.definition_compatible_pre_2015_common_starts.all_four === null, 'historical common-start gate');
check(evidenceByCell.get('ipi/PL').status === 'conflict' && evidenceByCell.get('ipi/RO').status === 'insufficient', 'IPI adverse evidence preserved');
check(evidenceByCell.get('unemployment/RO').status === 'conflict' && evidenceByCell.get('unemployment/HU').status === 'insufficient', 'unemployment adverse evidence preserved');
check(resolutionByCell.get('unemployment/HU').supports_start_date === '2011-01' && resolutionByCell.get('unemployment/RO').supports_start_date === '2009-01', 'documented revised-history floors');
check(['ipi/PL', 'ipi/RO', 'unemployment/SK', 'unemployment/PL'].every((key) => resolutionByCell.get(key)?.status === 'blocked'), 'remaining historical blockers not closed');

const mp = JSON.parse(fs.readFileSync(path.join(root, 'src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json')));
const cbi = JSON.parse(fs.readFileSync(path.join(root, 'src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json')));
check(support.shock_series_ids.MP === mp.shock_series_id && support.shock_series_ids.CBI === cbi.shock_series_id, 'shock-calendar identity');
check(support.support_unit === 'month_not_country_row' && support.support_is_potential_only, 'support interpretation');
check(support.definition_cleared_design_A === null, 'premature Design A support claim');
check(support.candidate_windows.some((w) => w.start === '2010-01') && support.candidate_windows.some((w) => w.start === '2012-01') && support.candidate_windows.some((w) => w.start === '2015-01'), 'required candidate windows');
const baseline = support.candidate_windows.find((w) => w.start === '2015-01');
check(baseline.horizons[0].potential_all_four_time_clusters === 129 && baseline.horizons[24].potential_all_four_time_clusters === 100, 'frozen baseline time-cluster preflight');
check(baseline.horizons[0].MP.nonzero_months === 86 && baseline.horizons[24].MP.nonzero_months === 67, 'frozen baseline MP support');
check(baseline.horizons[0].CBI.nonzero_months === 86 && baseline.horizons[24].CBI.nonzero_months === 67, 'frozen baseline CBI support');
const regime = load('historical_monetary_regime_registry.json').records;
check(regime.some((r) => r.country === 'SI' && r.period_start === '2007-01' && r.euro_member) && regime.some((r) => r.country === 'SK' && r.period_start === '2009-01' && r.euro_member), 'euro-adoption regime dates');
check(readiness.state === 'closed_current_four_outcome_extension_program' && readiness.historical_audit === 'completed' && readiness.four_outcome_historical_extension === 'blocked' && readiness.research_closed && readiness.no_new_panel_estimates && readiness.no_joint_inference_reopening && readiness.no_interpolation && readiness.owner_approval_required_for_any_new_research, 'research closure boundary');
check(readiness.cleared_outcomes.join(',') === 'hicp,yield' && readiness.design_A.definition_compatible_start === null && readiness.outcome_states.ipi === 'blocked_for_historical_extension' && readiness.outcome_states.unemployment === 'blocked_for_historical_extension', 'historical closure overstated');
check(readiness.baseline_definition_integrity === 'nonblocking_warning' && readiness.design_A.status === 'blocked_for_pre2015_extension', 'baseline warning or Design A block missing');
check(JSON.parse(fs.readFileSync(path.join(root, 'src/data/release.json'), 'utf8')).version.startsWith('v1.88 '), 'formal release version');
check(readiness.future_reduced_outcome_research === 'not_started' && readiness.state_dependent_LP === 'not_started', 'prohibited designs activated');

const frozen = [
  'src/data/panel-local-projections',
  'src/data/high-frequency/high_frequency_observations.json',
  'src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json',
  'src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json',
];
const changed = execFileSync('git', ['diff', '--name-only', '996450ef79c8db22abed491691b36d0e7ed3fc36', '--', ...frozen], { cwd: root, encoding: 'utf8' }).trim();
check(changed === '', `frozen paths modified: ${changed}`);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
check(!untracked.some((p) => frozen.some((f) => p === f || p.startsWith(`${f}/`))), 'untracked file in frozen paths');
const actualPanel = hash(fs.readFileSync(path.join(root, 'src/data/panel-local-projections/panel_lp_results.json')));
check(actualPanel === '10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc', 'frozen Panel LP SHA256 mismatch');
console.log(JSON.stringify({ historical_extension_audit: 'completed_closed', four_outcome_extension: 'blocked', official_sources: 5, countries: 8, outcomes: 4, months: matrix.records.length, baseline_h0: 129, baseline_h24: 100, interpolation: false, panel_estimation: false, frozen_panel_sha256: actualPanel }, null, 2));
