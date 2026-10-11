import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../../src/lib/freshnessCore.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { compareSeries } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const p = (year, value, status = 'official', unit = '%') => ({ year, value, status, unit, comparable: true });
const annualSource = fs.readFileSync(new URL('../../src/lib/annualComparison.ts', import.meta.url), 'utf8');
const annualJs = ts.transpileModule(annualSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { annualPoints, annualDifference, annualCsv } = await import(`data:text/javascript;base64,${Buffer.from(annualJs).toString('base64')}`);
test('descriptive history never overwrites canonical pending rows or creates absent observations', () => {
  const rows = annualPoints([{ ...p(2025, null, 'pending'), country_slug: 'a', indicator: 'gdp_current_eur' }], { sources: [{ dataset: 'Eurostat', url: 'https://ec.europa.eu/' }], records: [['a', 'gdp_current_eur', 2025, 5, 'EUR', 'official', 0], ['a', 'gdp_current_eur', 2020, 3, 'EUR', 'official', 0]] });
  assert.equal(rows.length, 2);
  assert.equal(rows.find(p => p.year === 2025).value, null);
  assert.equal(rows.find(p => p.year === 2020).layer, 'descriptive annual history');
});
test('differences require comparable same-year units; growth percentage changes are withheld', () => {
  const a = { ...p(2025, 10), indicator: 'real_gdp_growth' };
  assert.deepEqual(annualDifference(a, { ...a, value: 12 }), { absolute: 2, relative: null });
  for (const changed of [{ year: 2024 }, { unit: 'EUR' }, { comparable: false }, { differenceComparable: false }, { value: null }, { status: 'pending' }]) assert.equal(annualDifference(a, { ...a, ...changed }), null);
  assert.equal(annualDifference({ ...a, indicator: 'gdp_current_eur', value: 100 }, { ...a, indicator: 'gdp_current_eur', value: 120 }).relative, 20);
  assert.equal(annualDifference({ ...a, indicator: 'gdp_current_eur', value: 0 }, { ...a, indicator: 'gdp_current_eur', value: 120 }).relative, null);
});
test('CSV preserves numeric negatives, empty pending values, quotes and source text safely', () => {
  const csv = annualCsv([{ country_slug: 'a', indicator: 'growth', year: 2025, value: -2, unit: '%', status: 'official', source_name: '=unsafe,"quote"', source_url: 'https://example.org/', layer: 'snapshot' }, { year: 2024, value: null, status: 'pending' }]);
  assert.match(csv, /"-2"/);
  assert.match(csv, /"'=unsafe,""quote"""/);
  assert.match(csv, /"2024",""/);
});
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
