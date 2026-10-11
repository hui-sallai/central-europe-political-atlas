// Owner-approved 2026-10-12: this one descriptive news batch only. No general data exemption.
export const NEWS_REFRESH_FILE = 'docs/legal-security/news_refresh_amendments.json';
export const NEWS_REFRESH_PATHS = [
  'src/lib/newsData.ts', 'src/lib/newsTranslations.ts', 'src/lib/weeklyNews/2026-10-11.ts', 'src/lib/researchData.ts',
  'src/components/NewsExplorer.tsx',
  'src/data/events/news_update_2026-10-11_audit.json',
  'src/data/events/news_source_verification_2026-10-11.json',
  'src/data/events/news_candidate_screening_2026-10-11.json',
  'public/research-data/events.json', 'public/research-data/events.csv',
  'public/research-data/analysis_validation_index.json',
  'public/research-data/news_update_2026-10-11_audit.json',
  'public/research-data/news_source_verification_2026-10-11.json',
  'public/research-data/news_candidate_screening_2026-10-11.json',
  'public/research-data/news_translations_2026-10-11.json',
  'scripts/export-research-data.mjs', 'scripts/release/build-research-package.mjs',
];
const allowed = new Set(NEWS_REFRESH_PATHS);
const flags = ['canonical_economic_data_change_allowed', 'political_election_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed', 'enters_model'];
export function approvedNewsFiles(records) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    if (r.amendment_id !== 'news-refresh-2026-10-11' || r.approved_on !== '2026-10-12') problems.push('Unexpected news authorization');
    if (r.window?.start !== '2026-09-06' || r.window?.end !== '2026-10-11') problems.push('Unexpected news window');
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected news baseline');
    if (r.verification !== 'news:validate --week 2026-10-11') problems.push('News verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    const paths = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || paths.has(f.path)) problems.push(`Not an exact unique news path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing news hash: ${f.path}`);
      paths.add(f.path); approved.set(f.path, f.sha256);
    }
    if (paths.size !== allowed.size || NEWS_REFRESH_PATHS.some(p => !paths.has(p))) problems.push('Incomplete news authorization file set');
  }
  return { approved, problems };
}
