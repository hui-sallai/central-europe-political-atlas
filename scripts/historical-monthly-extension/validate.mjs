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

check(manifest.sources.length === 5, 'expected four official series plus HICP legacy');
const sourceById = Object.fromEntries(manifest.sources.map((s) => [s.id, s]));
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
  check(audit.records.length === 8, `country count: ${id}`);
  check(new Set(audit.records.map((r) => r.country)).size === 8 && geos.every((g) => audit.records.some((r) => r.country === g)), `country identity: ${id}`);
  for (const row of audit.records) {
    check(row.source_dataset === sourceById[id].dataset, `series identity: ${id}/${row.country}`);
    check(row.earliest_available <= row.latest && row.latest >= '2025-10', `monthly continuity endpoint: ${id}/${row.country}`);
    check(row.earliest_definition_compatible === null && row.extension_ready === false, `premature compatibility: ${id}/${row.country}`);
    check(row.vintage === 'latest_revised_not_real_time', `vintage claim: ${id}/${row.country}`);
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
      check(row.period >= '2015-01' || cell.status !== 'available', `uncleared pre-2015 value: ${row.period}/${id}/${geo}`);
    }
    check(outcome.outcome_common_month === geos.every((g) => outcome.countries[g].status === 'available'), `outcome common-month mismatch: ${row.period}/${id}`);
  }
  check(row.all_four_outcomes_common_month === outcomes.every((id) => row.outcomes[id].outcome_common_month), `all-four common-month mismatch: ${row.period}`);
}

const mp = JSON.parse(fs.readFileSync(path.join(root, 'src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json')));
const cbi = JSON.parse(fs.readFileSync(path.join(root, 'src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json')));
check(support.shock_series_ids.MP === mp.shock_series_id && support.shock_series_ids.CBI === cbi.shock_series_id, 'shock-calendar identity');
check(support.support_unit === 'month_not_country_row' && support.support_is_potential_only, 'support interpretation');
check(support.candidate_windows.some((w) => w.start === '2010-01') && support.candidate_windows.some((w) => w.start === '2012-01') && support.candidate_windows.some((w) => w.start === '2015-01'), 'required candidate windows');
const baseline = support.candidate_windows.find((w) => w.start === '2015-01');
check(baseline.horizons[0].potential_all_four_time_clusters === 129 && baseline.horizons[24].potential_all_four_time_clusters === 100, 'frozen baseline time-cluster preflight');
check(baseline.horizons[0].MP.nonzero_months === 86 && baseline.horizons[24].MP.nonzero_months === 67, 'frozen baseline MP support');
check(baseline.horizons[0].CBI.nonzero_months === 86 && baseline.horizons[24].CBI.nonzero_months === 67, 'frozen baseline CBI support');
const regime = load('historical_monetary_regime_registry.json').records;
check(regime.some((r) => r.country === 'SI' && r.period_start === '2007-01' && r.euro_member) && regime.some((r) => r.country === 'SK' && r.period_start === '2009-01' && r.euro_member), 'euro-adoption regime dates');
check(readiness.state === 'partial' && readiness.no_new_panel_estimates && readiness.no_joint_inference_reopening && readiness.no_interpolation && readiness.owner_approval_required, 'research boundary');
check(readiness.design_B.status === 'registered_future_candidate_only' && readiness.design_C.status === 'registered_future_candidate_only' && readiness.state_dependent_LP === 'not_started', 'prohibited designs activated');

const frozen = [
  'src/data/panel-local-projections',
  'src/data/high-frequency/high_frequency_observations.json',
  'src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json',
  'src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json',
  'public/research-data',
];
const changed = execFileSync('git', ['diff', '--name-only', '996450ef79c8db22abed491691b36d0e7ed3fc36', '--', ...frozen], { cwd: root, encoding: 'utf8' }).trim();
check(changed === '', `frozen paths modified: ${changed}`);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
check(!untracked.some((p) => frozen.some((f) => p === f || p.startsWith(`${f}/`))), 'untracked file in frozen paths');
const actualPanel = hash(fs.readFileSync(path.join(root, 'src/data/panel-local-projections/panel_lp_results.json')));
check(actualPanel === '10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc', 'frozen Panel LP SHA256 mismatch');
console.log(JSON.stringify({ historical_extension_audit: 'valid_partial', official_sources: 5, countries: 8, outcomes: 4, months: matrix.records.length, baseline_h0: 129, baseline_h24: 100, interpolation: false, panel_estimation: false, frozen_panel_sha256: actualPanel }, null, 2));
