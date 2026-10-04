import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFrozenFiles, approvedUiFiles } from '../../docs/political-data/source-closure/ui-amendments.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/legal-security/ui_governance_amendments.json'), 'utf8'));
const H = (c) => c.repeat(64);
const amendment = { amendment_id: 'test', status: 'owner_approved', baseline: 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d', canonical_data_change_allowed: false, public_research_data_change_allowed: false, political_data_change_allowed: false, model_change_allowed: false, release_change_allowed: false, files: [{ path: 'src/app/(zh)/legal/page.tsx', sha256: H('b'), classification: 'LEGAL_NOTICE' }] };
const baselineFiles = { 'src/app/(zh)/legal/page.tsx': H('a'), 'src/data/observations.json': H('1'), 'public/research-data/x.csv': H('2'), 'src/data/political/germany/elections.json': H('3'), 'src/lib/varEngine.ts': H('4'), 'src/data/release.json': H('5'), 'package.json': H('6') };
const hashes = { ...baselineFiles, 'src/app/(zh)/legal/page.tsx': H('b') };
const run = (overrides = {}, amendments = [amendment]) => {
  const h = { ...hashes, ...overrides };
  return checkFrozenFiles({ baselineFiles, currentFiles: Object.keys(h), hashOf: (p) => h[p], amendments });
};

test('exact approved UI file hash passes; unchanged files pass normally', () => {
  const r = run();
  assert.deepEqual(r.failures, []);
  assert.deepEqual(r.amended, ['src/app/(zh)/legal/page.tsx']);
});
test('approved UI file with a different hash is rejected', () => assert.equal(run({ 'src/app/(zh)/legal/page.tsx': H('c') }).ok, false));
test('an extra unlisted UI file is rejected', () => assert.equal(run({ 'src/components/New.tsx': H('d') }).ok, false));
test('src/data, public/research-data, Germany store, engine and release.json changes are rejected', () => {
  for (const p of ['src/data/observations.json', 'public/research-data/x.csv', 'src/data/political/germany/elections.json', 'src/lib/varEngine.ts', 'src/data/release.json']) {
    assert.equal(run({ [p]: H('e') }).ok, false, p);
    // even when someone lists the path in an amendment
    const listed = { ...amendment, files: [...amendment.files, { path: p, sha256: H('e'), classification: 'DATA_PRESENTATION' }] };
    assert.equal(run({ [p]: H('e') }, [listed]).ok, false, `${p} listed`);
  }
});
test('package version changes are not amendable', () => {
  assert.equal(approvedUiFiles([{ ...amendment, files: [{ path: 'package.json', sha256: H('f'), classification: 'SECURITY_PRESENTATION' }] }]).problems.length > 0, true);
});
test('wildcard paths, missing sha256, OTHER classification and data_change_allowed=true invalidate the amendment', () => {
  const bad = [
    { ...amendment, files: [{ path: 'src/app/**', sha256: H('b'), classification: 'LEGAL_NOTICE' }] },
    { ...amendment, files: [{ path: 'src/app/(zh)/legal/page.tsx', classification: 'LEGAL_NOTICE' }] },
    { ...amendment, files: [{ path: 'src/app/(zh)/legal/page.tsx', sha256: H('b'), classification: 'OTHER' }] },
    { ...amendment, canonical_data_change_allowed: true },
    { ...amendment, public_research_data_change_allowed: true },
    { ...amendment, model_change_allowed: true },
    { ...amendment, release_change_allowed: true },
  ];
  for (const a of bad) assert.equal(run({}, [a]).ok, false, JSON.stringify(a).slice(0, 80));
});
test('the committed amendment lists exact hashes for presentation files only', () => {
  const { problems, approved } = approvedUiFiles(record.amendments);
  assert.deepEqual(problems, []);
  assert.equal(approved.size, 14);
  for (const [p] of approved) assert.match(p, /^src\/(app|components|lib)\//);
});

// Owner-approved exact build-artifact exclusion (research package zip)
const ZIP = 'public/research-data/research-data-v2.0.zip';
const withZip = { ...baselineFiles, [ZIP]: H('9') };
const runZip = ({ overrides = {}, drop = [], untrackedIgnored = true, amendments = [amendment], lockfileApproved = () => false } = {}) => {
  const h = { ...hashes, ...overrides };
  for (const p of drop) delete h[p];
  return checkFrozenFiles({ baselineFiles: withZip, currentFiles: Object.keys(h), hashOf: (p) => h[p], amendments, lockfileApproved, isUntrackedIgnored: (p) => untrackedIgnored && p === ZIP });
};
test('zip exclusion: missing or changed untracked gitignored zip passes; everything else stays frozen', () => {
  assert.deepEqual(runZip().failures, []);
  assert.deepEqual(runZip({ overrides: { [ZIP]: H('8') } }).failures, []);
  assert.equal(runZip({ overrides: { 'public/research-data/x.csv': H('e') } }).ok, false, 'tracked public/research-data change');
  assert.equal(runZip({ overrides: { 'src/data/observations.json': H('e') } }).ok, false, 'src/data change');
  assert.equal(runZip({ overrides: { 'src/data/political/germany/elections.json': H('e') } }).ok, false, 'Germany store change');
  assert.equal(runZip({ overrides: { 'src/data/political/czechia/elections.json': H('e') } }).ok, false, 'extra political production file');
  assert.equal(runZip({ drop: ['public/research-data/x.csv'] }).ok, false, 'arbitrary missing baseline file');
});
test('zip exclusion applies only while the zip is untracked and gitignored', () => {
  assert.equal(runZip({ untrackedIgnored: false, drop: [ZIP] }).ok, false);
  assert.equal(runZip({ untrackedIgnored: false, overrides: { [ZIP]: H('8') } }).ok, false);
});
test('zip exclusion keeps the UI exact-hash amendment and the dependency exception in force', () => {
  assert.equal(runZip({ overrides: { 'src/app/(zh)/legal/page.tsx': H('c') } }).ok, false, 'UI hash drift still fails');
  const lockBase = { ...withZip, 'pnpm-lock.yaml': H('7') };
  const r = (approvedLock) => checkFrozenFiles({ baselineFiles: lockBase, currentFiles: [...Object.keys(hashes), 'pnpm-lock.yaml'], hashOf: (p) => (p === 'pnpm-lock.yaml' ? H('0') : hashes[p]), amendments: [amendment], lockfileApproved: () => approvedLock, isUntrackedIgnored: (p) => p === ZIP });
  assert.equal(r(false).ok, false, 'unapproved lockfile still fails');
  assert.equal(r(true).ok, true, 'approved lockfile passes');
});
