import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { amendablePath } from '../../docs/political-data/source-closure/ui-amendments.mjs';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { countryObservationSummary: summary } = require('../../src/lib/countryObservationPresentation.ts');
const row = (year, value, extra = {}) => ({ year, value, unit: '%', status: 'official', ...extra });
test('country published summary skips newer pending and missing rows without changing the series', () => {
  const rows = [row(2024, 2), row(2025, null), row(2026, 9, { status: 'pending' })];
  const before = JSON.stringify(rows);
  assert.equal(summary(rows).published.year, 2024);
  assert.equal(summary(rows).value, 2);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(summary([row(2025, 0)]).value, 0);
});
test('pending, missing, not applicable and empty remain distinct; no placeholder numeric leak', () => {
  assert.deepEqual([summary([row(2025, 9, { status: 'pending' })]).value, summary([row(2025, null, { status: 'pending' })]).unavailable], [null, 'pending']);
  assert.equal(summary([row(2025, null)]).unavailable, 'missing');
  assert.equal(summary([]).unavailable, 'missing');
  assert.equal(summary([row(2025, 3, { applicability_status: 'not_applicable' })]).unavailable, 'not_applicable');
  assert.equal(summary([row(2025, NaN)]).value, null);
});
test('national definition-mismatch values retain metadata, without authorizing comparison', () => {
  const data = row(2025, 2, { comparability_status: 'definition_mismatch', updated_at: '2026-01-01' });
  assert.equal(summary([data]).record, data);
  assert.equal(summary([data]).published, data);
});
test('only the two literal Next country route paths may contain brackets in a UI amendment', () => {
  assert.equal(amendablePath('src/app/(zh)/countries/[slug]/page.tsx'), true);
  assert.equal(amendablePath('src/app/(english)/en/countries/[slug]/page.tsx'), true);
  for (const path of ['src/app/(zh)/countries/*/page.tsx', 'src/app/(zh)/countries/[other]/page.tsx', 'src/app/(zh)/countries/[slug]/other.tsx', 'src/data/[slug]/observations.json']) assert.equal(amendablePath(path), false);
});
