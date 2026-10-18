// Owner-approved descriptive news batches, one exact authorization per batch. No general data exemption.
// 2026-10-12: batch 2026-09-06 → 2026-10-11. 2026-10-19: batch 2026-10-12 → 2026-10-18.
// A later batch may re-pin a shared file (the news modules, exports); its hash then supersedes the earlier one.
export const NEWS_REFRESH_FILE = 'docs/legal-security/news_refresh_amendments.json';
export const NEWS_BATCHES = {
  'news-refresh-2026-10-11': {
    approved_on: '2026-10-12', window: { start: '2026-09-06', end: '2026-10-11' }, verification: 'news:validate --week 2026-10-11',
    paths: [
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
    ],
  },
  'news-refresh-2026-10-18': {
    approved_on: '2026-10-19', window: { start: '2026-10-12', end: '2026-10-18' }, verification: 'news:validate --week 2026-10-18',
    paths: [
      'src/lib/newsData.ts', 'src/lib/newsTranslations.ts', 'src/lib/weeklyNews/2026-10-18.ts', 'src/lib/researchData.ts',
      'src/data/events/news_update_2026-10-18_audit.json',
      'src/data/events/news_source_verification_2026-10-18.json',
      'src/data/events/news_candidate_screening_2026-10-18.json',
      'public/research-data/events.json', 'public/research-data/events.csv',
      'public/research-data/analysis_validation_index.json',
      'public/research-data/news_update_2026-10-18_audit.json',
      'public/research-data/news_source_verification_2026-10-18.json',
      'public/research-data/news_candidate_screening_2026-10-18.json',
      'public/research-data/news_translations_2026-10-18.json',
      'scripts/export-research-data.mjs', 'scripts/release/build-research-package.mjs',
    ],
  },
};
// Every path any approved batch may touch (kept for callers that list the governed set).
export const NEWS_REFRESH_PATHS = [...new Set(Object.values(NEWS_BATCHES).flatMap((batch) => batch.paths))];
const flags = ['canonical_economic_data_change_allowed', 'political_election_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed', 'enters_model'];
export function approvedNewsFiles(records) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    const batch = NEWS_BATCHES[r.amendment_id];
    if (!batch || r.approved_on !== batch.approved_on) { problems.push('Unexpected news authorization'); continue; }
    if (r.window?.start !== batch.window.start || r.window?.end !== batch.window.end) problems.push('Unexpected news window');
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected news baseline');
    if (r.verification !== batch.verification) problems.push('News verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    const allowed = new Set(batch.paths), paths = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || paths.has(f.path)) problems.push(`Not an exact unique news path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing news hash: ${f.path}`);
      paths.add(f.path);
    }
    if (paths.size !== allowed.size || batch.paths.some((p) => !paths.has(p))) problems.push('Incomplete news authorization file set');
  }
  if (problems.length) return { approved, problems };
  // Records are applied in batch order, so a later batch's hash for a shared file supersedes the earlier one.
  const order = Object.keys(NEWS_BATCHES);
  for (const r of [...(records ?? [])].filter((x) => x.status === 'owner_approved').sort((a, b) => order.indexOf(a.amendment_id) - order.indexOf(b.amendment_id))) {
    for (const f of r.files) approved.set(f.path, f.sha256);
  }
  return { approved, problems };
}
