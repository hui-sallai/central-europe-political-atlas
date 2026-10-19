// Owner-approved descriptive data refreshes applied through scripts/data-refresh/apply.mjs, one exact record per run.
// 2026-10-19: Eurostat monthly high-frequency refresh (run monthly-eurostat-20261019). No general data exemption:
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
      paths.add(f.path); approved.set(f.path, f.sha256);
    }
    if (paths.size !== allowed.size) problems.push('Incomplete data refresh file set');
  }
  return { approved, problems };
}
