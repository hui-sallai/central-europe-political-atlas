import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { matchDependencyException, unapprovedFrozenChanges } from '../../scripts/political-data/germany/frozen-boundary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { exceptions } = JSON.parse(fs.readFileSync(path.join(root, 'docs/legal-security/dependency_maintenance_exceptions.json'), 'utf8'));
const approved = exceptions[0];
const before = { version: '2.0.0', dependencies: { next: '16.2.6', react: '19.2.6', 'react-dom': '19.2.6' }, devDependencies: { 'eslint-config-next': '16.2.6', typescript: '6.0.3' } };
const after = { version: '2.0.0', dependencies: { next: '16.3.6', react: '19.2.6', 'react-dom': '19.2.6' }, devDependencies: { 'eslint-config-next': '16.3.6', typescript: '6.0.3' } };
const base = { exceptions, lockHash: approved.new_lockfile_sha256, pkgBefore: before, pkgAfter: after };

test('exact approved lockfile and package pairs pass', () => {
  assert.deepEqual(matchDependencyException(base), { ok: true, exception_id: 'dep-sec-2026-10-next-16-3-6' });
});
test('any other lockfile hash is rejected (no future arbitrary lockfile changes)', () => {
  assert.equal(matchDependencyException({ ...base, lockHash: '0'.repeat(64) }).ok, false);
});
test('unapproved dependency upgrades are rejected', () => {
  assert.equal(matchDependencyException({ ...base, pkgAfter: { ...after, dependencies: { ...after.dependencies, react: '19.3.0' } } }).ok, false);
  assert.equal(matchDependencyException({ ...base, pkgAfter: { ...after, dependencies: { ...after.dependencies, next: '16.3.8' } } }).ok, false);
  assert.equal(matchDependencyException({ ...base, pkgAfter: { ...after, devDependencies: { ...after.devDependencies, leftpad: '1.0.0' } } }).ok, false);
});
test('package version bumps and other dependency-tooling files are rejected', () => {
  assert.equal(matchDependencyException({ ...base, pkgAfter: { ...after, version: '2.1.0' } }).ok, false);
  assert.equal(matchDependencyException({ ...base, otherChangedFiles: ['.npmrc'] }).ok, false);
});
test('an exception that allows research, model, political or release changes is invalid', () => {
  for (const flag of ['research_data_change_allowed', 'model_output_change_allowed', 'political_data_change_allowed', 'release_version_change_allowed']) {
    assert.equal(matchDependencyException({ ...base, exceptions: [{ ...approved, [flag]: true }] }).ok, false, flag);
  }
  assert.equal(matchDependencyException({ ...base, exceptions: [{ ...approved, approved_scope: { ...approved.approved_scope, allowed_files: ['pnpm-lock.yaml', 'src/data/release.json'] } }] }).ok, false);
});
test('the exception exempts only pnpm-lock.yaml; frozen research files stay unapproved', () => {
  const lockHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'))).digest('hex');
  assert.equal(lockHash, exceptions.at(-1).new_lockfile_sha256, 'current lockfile is the most recent approved one');
  const baseline = 'd83a6166072c0c295e7d385d25378cb710053a54';
  assert.deepEqual(unapprovedFrozenChanges('pnpm-lock.yaml', baseline), []);
  assert.deepEqual(unapprovedFrozenChanges('pnpm-lock.yaml\nsrc/data/release.json\nsrc/lib/varEngine.ts', baseline), ['src/data/release.json', 'src/lib/varEngine.ts']);
});
test('shared helper honours only exact-hash mirror syncs; canonical src/data stays frozen', () => {
  const baseline = 'd83a6166072c0c295e7d385d25378cb710053a54';
  assert.deepEqual(unapprovedFrozenChanges('public/research-data/monthly_descriptive_history.json', baseline), []);
  assert.deepEqual(unapprovedFrozenChanges('src/data/historical/monthly_descriptive_history.json', baseline), ['src/data/historical/monthly_descriptive_history.json']);
  assert.deepEqual(unapprovedFrozenChanges('public/research-data/observations.json', baseline), ['public/research-data/observations.json'], 'unlisted public file stays frozen');
});

// Transitive lockfile-only security maintenance (dep-sec-2026-10-source-map-js-1-2-2)
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const H = (c) => c.repeat(64);
const lock = (smj, foo = '1.0.0') => `lockfileVersion: '9.0'\n\npackages:\n\n  foo@${foo}:\n    resolution: {integrity: sha512-foo${foo}}\n\n  source-map-js@${smj}:\n    resolution: {integrity: sha512-smj${smj}}\n\n  postcss@8.5.26:\n    resolution: {integrity: sha512-pc}\n\nsnapshots:\n\n  foo@${foo}: {}\n\n  postcss@8.5.26:\n    dependencies:\n      source-map-js: ${smj}\n\n  source-map-js@${smj}: {}\n`;
const prevLock = lock('1.2.1'), nextLock = lock('1.2.2');
const parentEx = { ...approved, new_lockfile_sha256: sha(prevLock) };
const childEx = { exception_id: 'child', status: 'approved_local_maintenance', kind: 'transitive_lockfile', builds_on: parentEx.exception_id, approved_scope: { package_changes: [], transitive_changes: [{ package: 'source-map-js', from: '1.2.1', to: '1.2.2' }], allowed_files: ['pnpm-lock.yaml'] }, previous_lockfile_commit: 'PREV', previous_lockfile_sha256: sha(prevLock), new_lockfile_sha256: sha(nextLock), research_data_change_allowed: false, model_output_change_allowed: false, political_data_change_allowed: false, release_version_change_allowed: false };
const readLockAt = (c) => { if (c === 'PREV') return prevLock; throw new Error('unknown commit'); };
const tx = (o = {}) => matchDependencyException({ exceptions: [parentEx, childEx], lockHash: sha(nextLock), pkgBefore: before, pkgAfter: after, lockText: nextLock, readLockAt, ...o });
const withLock = (text, childOverrides = {}) => tx({ exceptions: [parentEx, { ...childEx, new_lockfile_sha256: sha(text), ...childOverrides }], lockHash: sha(text), lockText: text });

test('transitive exception: exact source-map-js 1.2.1 -> 1.2.2 passes and inherits the Next pairs', () => {
  assert.deepEqual(tx(), { ok: true, exception_id: 'child' });
});
test('transitive exception: wrong lockfile sha fails and future lockfile changes need a new exception', () => {
  assert.equal(tx({ lockHash: H('0') }).ok, false);
  assert.equal(tx({ lockText: nextLock + '\n' }).ok, false, 'text not matching its hash');
  const later = lock('1.2.2', '1.0.0').replace('postcss@8.5.26', 'postcss@8.5.27');
  assert.equal(tx({ lockHash: sha(later), lockText: later }).ok, false, 'no exception for a later lockfile');
});
test('transitive exception: source-map-js other than 1.2.2 fails', () => {
  assert.equal(withLock(lock('1.2.3')).ok, false);
});
test('transitive exception: unrelated package changes fail', () => {
  assert.equal(withLock(lock('1.2.2', '1.0.1')).ok, false);
  assert.equal(tx({ pkgAfter: { ...after, dependencies: { ...after.dependencies, react: '19.3.0' } } }).ok, false, 'direct react change');
});
test('transitive exception: package version bump and permissive flags fail', () => {
  assert.equal(tx({ pkgAfter: { ...after, version: '2.1.0' } }).ok, false);
  for (const flag of ['research_data_change_allowed', 'model_output_change_allowed', 'political_data_change_allowed', 'release_version_change_allowed']) {
    assert.equal(tx({ exceptions: [parentEx, { ...childEx, [flag]: true }] }).ok, false, flag);
  }
});
test('transitive exception: previous lockfile anchoring and structure are fail-closed', () => {
  assert.equal(tx({ readLockAt: () => lock('1.2.0') }).ok, false, 'previous lockfile hash mismatch');
  assert.equal(tx({ readLockAt: undefined }).ok, false, 'no git access');
  assert.equal(tx({ exceptions: [{ ...parentEx, new_lockfile_sha256: H('1') }, childEx] }).ok, false, 'previous lockfile must be the parent lockfile');
  assert.equal(tx({ exceptions: [childEx] }).ok, false, 'missing parent exception');
  assert.equal(tx({ exceptions: [parentEx, { ...childEx, approved_scope: { ...childEx.approved_scope, package_changes: [{ package: 'react', from: '19.2.6', to: '19.3.0' }] } }] }).ok, false, 'no direct changes in a transitive exception');
  assert.equal(tx({ exceptions: [parentEx, { ...childEx, approved_scope: { ...childEx.approved_scope, allowed_files: ['pnpm-lock.yaml', 'package.json'] } }] }).ok, false, 'lockfile only');
});
test('the Next 16.3.6 exception is unchanged and still validates its own lockfile', () => {
  assert.deepEqual(matchDependencyException(base), { ok: true, exception_id: 'dep-sec-2026-10-next-16-3-6' });
  assert.equal(approved.kind, undefined);
  assert.deepEqual(approved.approved_scope.package_changes.map((c) => `${c.package}:${c.from}->${c.to}`), ['next:16.2.6->16.3.6', 'eslint-config-next:16.2.6->16.3.6']);
});
