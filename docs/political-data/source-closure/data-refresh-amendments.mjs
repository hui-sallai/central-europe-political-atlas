// Owner-approved descriptive data refreshes applied through scripts/data-refresh/apply.mjs, one exact record per run.
// 2026-10-19: Eurostat monthly high-frequency refresh (run monthly-eurostat-20261019); 2026-10-20: Serbia SORS refresh
// (run serbia-20261020). Later runs supersede shared files (coverage audit, ledger). No general data exemption:
// only the listed files of each run, at their exact hashes, and only for runs recorded in the refresh ledger.
export const DATA_REFRESH_FILE = 'docs/legal-security/data_refresh_amendments.json';
export const DATA_REFRESH_RUNS = {
  'monthly-eurostat-20261019': {
    approved_on: '2026-10-19', unit: 'eurostat-high-frequency',
    paths: [
      'src/data/high-frequency/high_frequency_observations.json',
      'src/data/high-frequency/high_frequency_coverage.json',
      'src/data/high-frequency/series_dictionary.json',
      'src/data/data-coverage/descriptive_data_coverage_audit.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
      'public/research-data/high_frequency_runtime.json',
      'public/research-data/high_frequency_coverage.json',
      'public/research-data/series_dictionary.json',
      'public/research-data/descriptive_data_coverage_audit.json',
    ],
  },
  'serbia-20261020': {
    approved_on: '2026-10-20', unit: 'serbia-sors',
    paths: [
      'public/research-data/descriptive_data_coverage_audit.json',
      'public/research-data/serbia/serbia_descriptive_history_annual.json',
      'public/research-data/serbia/serbia_descriptive_history_monthly.json',
      'public/research-data/serbia/serbia_ingestion_manifest.json',
      'public/research-data/serbia_sors_runtime.json',
      'src/data/data-coverage/descriptive_data_coverage_audit.json',
      'src/data/data-refresh/refresh_ledger.jsonl',
      'src/data/serbia/raw/03010601IND01.extract.json',
      'src/data/serbia/raw/03010601IND03.extract.json',
      'src/data/serbia/raw/030201010101IND01.extract.json',
      'src/data/serbia/raw/060001IND02.extract.json',
      'src/data/serbia/raw/0902010301IND01.extract.json',
      'src/data/serbia/raw/09020104IND01.extract.json',
      'src/data/serbia/raw/100109IND01.extract.json',
      'src/data/serbia/raw/1701IND01.extract.json',
      'src/data/serbia/raw/1702IND01.extract.json',
      'src/data/serbia/raw/1702IND02.extract.json',
      'src/data/serbia/raw/18010403IND01.extract.json',
      'src/data/serbia/raw/180304IND02.extract.json',
      'src/data/serbia/raw/210105IND02.extract.json',
      'src/data/serbia/raw/2400020102IND02.extract.json',
      'src/data/serbia/raw/2400020102IND04.extract.json',
      'src/data/serbia/raw/240003010102IND03.extract.json',
      'src/data/serbia/raw/240003020102IND02.extract.json',
      'src/data/serbia/raw/240003020102IND03.extract.json',
      'src/data/serbia/raw/240003020205IND01.extract.json',
      'src/data/serbia/raw/240003020304IND01.extract.json',
      'src/data/serbia/raw/2403040101IND01.extract.json',
      'src/data/serbia/raw/2403040101IND02.extract.json',
      'src/data/serbia/raw/2403040401IND01.extract.json',
      'src/data/serbia/raw/2403040401IND02.extract.json',
      'src/data/serbia/raw/bis_rsd_per_eur.extract.json',
      'src/data/serbia/serbia_descriptive_history_annual.json',
      'src/data/serbia/serbia_descriptive_history_monthly.json',
      'src/data/serbia/serbia_ingestion_manifest.json',
    ],
  },
};
const flags = ['formal_model_input_change_allowed', 'frozen_snapshot_change_allowed', 'political_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed'];
export function approvedDataRefreshFiles(records) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    const run = DATA_REFRESH_RUNS[r.run_id];
    if (!run || r.approved_on !== run.approved_on || r.unit !== run.unit) { problems.push(`Unexpected data refresh authorization: ${r.run_id}`); continue; }
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected data refresh baseline');
    if (r.verification !== 'data-refresh:apply store validators and data-coverage re-audit') problems.push('Data refresh verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    const allowed = new Set(run.paths), paths = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || paths.has(f.path)) problems.push(`Not an exact unique data refresh path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing data refresh hash: ${f.path}`);
      paths.add(f.path);
    }
    if (paths.size !== allowed.size) problems.push('Incomplete data refresh file set');
  }
  // Applied in run order, so a later run's hash for a shared file (coverage audit, ledger) supersedes the earlier one.
  const order = Object.keys(DATA_REFRESH_RUNS);
  for (const r of [...(records ?? [])].filter((x) => x.status === 'owner_approved' && DATA_REFRESH_RUNS[x.run_id]).sort((x, y) => order.indexOf(x.run_id) - order.indexOf(y.run_id))) {
    for (const f of r.files ?? []) approved.set(f.path, f.sha256);
  }
  return { approved, problems };
}
