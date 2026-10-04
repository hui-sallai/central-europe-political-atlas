// Exact-hash UI/governance amendments for the source-closure checkpoint
// (docs/legal-security/ui_governance_amendments.json). Only listed presentation files with their exact sha256 may differ
// from the checkpoint baseline; data, model, engine, political-store, package and release files can never be amended.

export const UI_AMENDMENTS_FILE = 'docs/legal-security/ui_governance_amendments.json';
export const UI_CLASSIFICATIONS = ['LEGAL_NOTICE', 'PRIVACY_NOTICE', 'SOURCE_ATTRIBUTION_UI', 'METHODOLOGY_PRESENTATION', 'DATA_PRESENTATION', 'SECURITY_PRESENTATION'];
const FALSE_FLAGS = ['canonical_data_change_allowed', 'public_research_data_change_allowed', 'political_data_change_allowed', 'model_change_allowed', 'release_change_allowed'];
const AMENDABLE = /^src\/(app|components|lib)\//;
const NEVER_AMENDABLE = [/^src\/data\//, /^public\/research-data\//, /^package\.json$/, /^pnpm-lock\.yaml$/, /(^|\/)release\.json$/, /^src\/lib\/[^/]*Engine\.ts$/, /^src\/lib\/timeSeriesTransforms\.ts$/];
const WILDCARD = /[*?[\]{}]/;

export function amendablePath(file) {
  return AMENDABLE.test(file) && !NEVER_AMENDABLE.some((re) => re.test(file)) && !WILDCARD.test(file);
}

// Returns the approved {path -> sha256} map, or problems that invalidate the record (fail closed).
export function approvedUiFiles(amendments) {
  const approved = new Map(), problems = [];
  for (const a of amendments ?? []) {
    if (a.status !== 'owner_approved') continue;
    for (const flag of FALSE_FLAGS) if (a[flag] !== false) problems.push(`${a.amendment_id}: ${flag} must be false`);
    if (!a.baseline || !/^[0-9a-f]{40}$/.test(a.baseline)) problems.push(`${a.amendment_id}: baseline must be a full commit sha`);
    for (const f of a.files ?? []) {
      if (!f.path || WILDCARD.test(f.path)) problems.push(`${a.amendment_id}: wildcard or empty path ${f.path}`);
      else if (!amendablePath(f.path)) problems.push(`${a.amendment_id}: ${f.path} is not an amendable UI path`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`${a.amendment_id}: ${f.path} missing exact sha256`);
      if (!UI_CLASSIFICATIONS.includes(f.classification)) problems.push(`${a.amendment_id}: ${f.path} classification ${f.classification} not a UI/governance class`);
      approved.set(f.path, f.sha256);
    }
  }
  return { approved, problems };
}

// baselineFiles: {path -> sha256}; currentFiles: [path]; hashOf(path) -> sha256; lockfileApproved(): boolean.
export function checkFrozenFiles({ baselineFiles, currentFiles, hashOf, amendments, lockfileApproved = () => false }) {
  const { approved, problems } = approvedUiFiles(amendments);
  const failures = [...problems], amended = [];
  if (problems.length) return { ok: false, failures, amended };
  const current = new Set(currentFiles);
  for (const name of Object.keys(baselineFiles)) if (!current.has(name)) failures.push(`Frozen file removed: ${name}`);
  for (const name of currentFiles) {
    const baseHash = baselineFiles[name];
    if (name === 'package.json' && baseHash) continue; // compared field-by-field by the checkpoint
    const actual = hashOf(name);
    if (baseHash && actual === baseHash) continue;
    if (name === 'pnpm-lock.yaml' && lockfileApproved()) continue;
    if (approved.has(name) && amendablePath(name) && approved.get(name) === actual) { amended.push(name); continue; }
    failures.push(baseHash ? `Frozen file changed: ${name}` : `No new production, public, UI, model or economic files permitted: ${name}`);
  }
  return { ok: failures.length === 0, failures, amended };
}
