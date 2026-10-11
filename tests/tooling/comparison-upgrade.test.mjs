import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../../src/lib/freshnessCore.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { compareSeries } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const p = (year, value, status = 'official', unit = '%') => ({ year, value, status, unit, comparable: true });
test('three-country comparison selects 2025 annual values regardless of record order', () => {
  const data = { a: [p(2025, 1), p(2024, 2)], b: [p(2024, 3), p(2025, 4)], c: [p(2025, 0)] };
  const r = compareSeries(data, 'latest_common');
  assert.equal(r.common_year, 2025);
  assert.equal(r.cells.c.value, 0);
});
test('pending and missing stay unavailable; published history survives', () => {
  const r = compareSeries({ a: [p(2025, null, 'pending'), p(2024, 2)], b: [p(2025, 4)] }, 'latest_available');
  assert.equal(r.cells.a.year, 2024);
  assert.equal(r.periods_differ, true);
  assert.equal(compareSeries({ a: [p(2025, null)], b: [p(2025, 3)] }, 'latest_common').common_year, null);
});
test('unit mismatch and explicitly non-comparable observations are withheld', () => {
  assert.equal(compareSeries({ a: [p(2025, 1)], b: [p(2025, 2, 'official', 'EUR')] }, 'latest_available').units_differ, true);
  assert.equal(compareSeries({ a: [{ ...p(2025, 1), comparable: false }], b: [p(2025, 2)] }, 'latest_common').common_year, null);
});
