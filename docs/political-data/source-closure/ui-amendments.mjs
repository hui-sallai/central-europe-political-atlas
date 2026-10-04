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

// Owner-approved (2026-10-05): the research package zip is a gitignored build artifact created after the checkpoint runs;
// it is validated by the package build, not as a pre-existing repository file. Exact path only, and only while the path
// is untracked and gitignored — a tracked or non-ignored file at this path stays fully frozen.
// deployment_provenance.json is the per-build provenance split out of the committed release manifest (same rule: exact
// path, untracked and gitignored only).
export const BUILD_ARTIFACT_EXCLUSIONS = ['public/research-data/research-data-v2.0.zip', 'public/research-data/deployment_provenance.json'];

// Owner-approved export mirror syncs (docs/legal-security/export_mirror_sync_records.json): exact-hash public mirrors that
// research-export:check proves are regenerated from already-committed canonical src/data. Never src/data, never political
// stores, never the zip; each file pinned to its exact sha256.
export const MIRROR_SYNC_FILE = 'docs/legal-security/export_mirror_sync_records.json';
const MIRROR_FALSE_FLAGS = ['canonical_data_change_allowed', 'political_data_change_allowed', 'model_change_allowed', 'release_version_change_allowed', 'new_research_decision'];
export function mirrorSyncPath(file) {
  return /^public\/research-data\/[^*?[\]{}]+\.(json|csv)$/.test(file) && !/^public\/research-data\/political\//.test(file);
}
export function approvedMirrorFiles(records) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    for (const flag of MIRROR_FALSE_FLAGS) if (r[flag] !== false) problems.push(`${r.sync_id}: ${flag} must be false`);
    if (r.verification !== 'research-export:check') problems.push(`${r.sync_id}: verification must be research-export:check`);
    for (const f of r.files ?? []) {
      if (!mirrorSyncPath(f.path ?? '')) problems.push(`${r.sync_id}: ${f.path} is not a syncable public mirror`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`${r.sync_id}: ${f.path} missing exact sha256`);
      approved.set(f.path, f.sha256);
    }
  }
  return { approved, problems };
}

// baselineFiles: {path -> sha256}; currentFiles: [path]; hashOf(path) -> sha256; lockfileApproved(): boolean;
// isUntrackedIgnored(path): boolean (git state of an excluded build artifact).
export function checkFrozenFiles({ baselineFiles, currentFiles, hashOf, amendments, lockfileApproved = () => false, isUntrackedIgnored = () => false, mirrorSyncs = [] }) {
  const { approved, problems } = approvedUiFiles(amendments);
  const mirrors = approvedMirrorFiles(mirrorSyncs);
  const failures = [...problems, ...mirrors.problems], amended = [];
  if (failures.length) return { ok: false, failures, amended };
  const excluded = new Set(BUILD_ARTIFACT_EXCLUSIONS.filter((p) => isUntrackedIgnored(p)));
  baselineFiles = Object.fromEntries(Object.entries(baselineFiles).filter(([p]) => !excluded.has(p)));
  currentFiles = currentFiles.filter((p) => !excluded.has(p));
  const current = new Set(currentFiles);
  for (const name of Object.keys(baselineFiles)) if (!current.has(name)) failures.push(`Frozen file removed: ${name}`);
  for (const name of currentFiles) {
    const baseHash = baselineFiles[name];
    if (name === 'package.json' && baseHash) continue; // compared field-by-field by the checkpoint
    const actual = hashOf(name);
    if (baseHash && actual === baseHash) continue;
    if (name === 'pnpm-lock.yaml' && lockfileApproved()) continue;
    if (approved.has(name) && amendablePath(name) && approved.get(name) === actual) { amended.push(name); continue; }
    if (baseHash && mirrors.approved.has(name) && mirrorSyncPath(name) && mirrors.approved.get(name) === actual) { amended.push(name); continue; }
    failures.push(baseHash ? `Frozen file changed: ${name}` : `No new production, public, UI, model or economic files permitted: ${name}`);
  }
  return { ok: failures.length === 0, failures, amended };
}

// Owner-approved (2026-10-05): private publisher evidence lives only in the gitignored local-evidence/ folder and is
// never committed. Where the file is present (owner machine) its sha256 is verified exactly; in a clean checkout (CI)
// the record must still point into local-evidence/, be gitignored, untracked and carry a well-formed sha256.
// Returns 'verified' | 'absent_private_evidence'; throws on any violation.
export function checkPrivateEvidence({ archivePath, sha256, exists, hashOf, isUntrackedIgnored }) {
  if (!/^local-evidence\/[0-9a-f]{64}\.raw$/.test(archivePath ?? '')) throw new Error(`evidence path must be local-evidence/<sha256>.raw: ${archivePath}`);
  if (!/^[0-9a-f]{64}$/.test(sha256 ?? '')) throw new Error(`evidence sha256 malformed for ${archivePath}`);
  if (!isUntrackedIgnored(archivePath)) throw new Error(`private evidence must be gitignored and untracked: ${archivePath}`);
  if (exists(archivePath)) {
    if (hashOf(archivePath) !== sha256) throw new Error(`private evidence hash mismatch: ${archivePath}`);
    return 'verified';
  }
  return 'absent_private_evidence';
}
