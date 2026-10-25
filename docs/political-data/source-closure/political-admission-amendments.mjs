// Owner-approved political country admissions (docs/legal-security/political_admission_records.json), one exact record
// per admitted election. Only NEW files under src/data/political/<country>/ and public/research-data/political/<country>/
// may be approved — never Germany, never an existing baseline file — each at its exact sha256, and only while the
// admission's gate record (every mandatory gate closed) is present at its recorded sha256.
export const POLITICAL_ADMISSION_FILE = 'docs/legal-security/political_admission_records.json';
export const MANDATORY_ADMISSION_GATES = ['reuse_right', 'normalized_republication', 'acquisition_route', 'source_files_complete', 'national_definition_complete', 'same_election_identity_complete', 'electoral_system_metadata_complete', 'vintage_decisions_complete'];
const STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
export const POLITICAL_ADMISSIONS = {
  'czechia-ps-2025': {
    approved_on: '2026-10-25', country: 'czechia', gate_record: 'docs/political-data/czechia_ps2025_admission.json',
    paths: [
      ...STORES.map((s) => `src/data/political/czechia/${s}.json`),
      ...STORES.flatMap((s) => [`public/research-data/political/czechia/${s}.json`, `public/research-data/political/czechia/${s}.csv`]),
      'public/research-data/political/czechia/README.md',
      'public/research-data/political/czechia/manifest.json',
    ],
  },
};
const flags = ['germany_change_allowed', 'canonical_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed'];
const admissiblePath = (file, country) => country !== 'germany' && /^[a-z]+$/.test(country) && (file.startsWith(`src/data/political/${country}/`) || file.startsWith(`public/research-data/political/${country}/`));

/** Returns approved {path -> sha256} for new political files, or problems (fail closed). hashOf(path) verifies gate records. */
export function approvedPoliticalAdmissionFiles(records, hashOf = () => null) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    const admission = POLITICAL_ADMISSIONS[r.admission_id];
    if (!admission || r.approved_on !== admission.approved_on || r.country !== admission.country) { problems.push(`Unexpected political admission: ${r.admission_id}`); continue; }
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected political admission baseline');
    if (r.verification !== 'build-ps2025 check, official-total reconciliation and closed admission gate record') problems.push('Political admission verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    if (r.gate_record !== admission.gate_record || !/^[0-9a-f]{64}$/.test(r.gate_record_sha256 ?? '') || hashOf(r.gate_record) !== r.gate_record_sha256) problems.push(`${r.admission_id}: gate record missing or changed`);
    if (JSON.stringify([...(r.gates_closed ?? [])].sort()) !== JSON.stringify([...MANDATORY_ADMISSION_GATES].sort())) problems.push(`${r.admission_id}: every mandatory gate must be recorded closed`);
    const allowed = new Set(admission.paths), seen = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || seen.has(f.path) || !admissiblePath(f.path, admission.country)) problems.push(`Not an exact admissible political path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing political admission hash: ${f.path}`);
      seen.add(f.path); approved.set(f.path, f.sha256);
    }
    if (seen.size !== allowed.size) problems.push('Incomplete political admission file set');
  }
  return { approved, problems };
}
