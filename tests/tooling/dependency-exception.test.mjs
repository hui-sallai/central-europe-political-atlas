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
  assert.equal(lockHash, approved.new_lockfile_sha256, 'current lockfile is the approved one');
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
