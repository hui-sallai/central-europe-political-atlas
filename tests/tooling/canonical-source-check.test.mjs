import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { availabilityReason, beyondTolerance, compareSeries, parseSeries, recompute, seriesQuery, seriesRequest, swapGeo } from '../../scripts/data-refresh/canonical-lib.mjs';

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const url = (year, extra = 'geo=HU&unit=PC') => `${API}demo?${extra}&sinceTimePeriod=${year}&untilTimePeriod=${year}`;
const stat = (points, status = {}) => ({ updated: '2026-10-09T23:00:00+0200', size: [1, Object.keys(points).length], dimension: { time: { category: { index: Object.fromEntries(Object.keys(points).map((p, i) => [p, i])) } } }, value: Object.fromEntries(Object.values(points).map((v, i) => [i, v]).filter(([, v]) => v !== null)), status });
const lookupWith = (points, status) => { const fetch = { ...parseSeries(stat(points, status)), http_status: 200, retrieved_at: '2026-10-13T00:00:00Z', sha256: 'x', bytes: 1 }; return (u) => { const query = seriesQuery(u); return query ? { query, fetch } : { query: null }; }; };
const record = (year, value, extra = {}) => ({ year, value, status: value === null ? 'pending' : 'official', source_query_url: url(year), comparability_status: 'comparable', ...extra });

test('stored queries resolve to one series endpoint in both registered styles; non-API links do not', () => {
  assert.deepEqual(seriesQuery(url(2023)), { endpoint: `${API}demo?geo=HU&unit=PC`, dataset: 'demo', geo: 'HU', period: '2023' });
  assert.equal(seriesQuery(`${API}demo?time=2023&unit=PC&geo=HU`).endpoint, `${API}demo?geo=HU&unit=PC`);
  assert.equal(seriesQuery('https://ec.europa.eu/eurostat/databrowser/'), null);
  assert.equal(seriesQuery(`${API}demo?geo=HU&sinceTimePeriod=2021&untilTimePeriod=2023`), null);
  assert.equal(seriesQuery('https://comtradeapi.un.org/public/v1/preview/C/A/HS?period=2023'), null);
  assert.match(seriesRequest(`${API}demo?geo=HU`, '2021'), /sinceTimePeriod=2021$/);
  assert.match(swapGeo(`${API}demo?geo=HU&unit=PC`, 'RS'), /geo=RS/);
});

test('missing stays missing: an empty or zero-row response never becomes 0', () => {
  assert.deepEqual(parseSeries({ updated: 'u', size: [1, 0, 5], value: {}, dimension: { time: { category: { index: { 2021: 0 } } } } }).points, {});
  const parsed = parseSeries(stat({ 2023: 1.5, 2024: null }));
  assert.equal(parsed.points['2024'], undefined);
  assert.equal(parsed.points['2023'].value, 1.5);
  assert.throws(() => parseSeries({ size: [2, 2], value: {}, dimension: { time: { category: { index: { 2021: 0, 2022: 1 } } } } }), /single series/);
});

test('revisions use the existing tolerance; nothing is silently replaced', () => {
  assert.equal(beyondTolerance(1.5, 2.9), true);
  assert.equal(beyondTolerance(4.1, 4.0), false);
  const result = compareSeries([record(2023, 1.5), record(2024, 4.1)], lookupWith({ 2023: 2.9, 2024: 4.0, 2025: 3.3 }));
  assert.deepEqual(result.revisions.map((r) => [r.year, r.stored_value, r.proposed_value]), [[2023, 1.5, 2.9]]);
  assert.deepEqual(result.within_tolerance.map((r) => r.year), [2024]);
  assert.deepEqual(result.new_observations.map((n) => [n.year, n.source_value]), [[2025, 3.3]]);
  assert.equal(result.provenance[0].dataset_updated_at, '2026-10-09T23:00:00+0200');
  assert.equal(result.provenance[0].retrieved_at, '2026-10-13T00:00:00Z');
});

test('pending periods get a reason only from source evidence', () => {
  const run = (points, status) => compareSeries([record(2024, 2), record(2025, null)], lookupWith(points, status)).pending[0];
  assert.equal(run({ 2024: 2 }).reason, 'not_yet_published_at_source');
  assert.equal(run({ 2024: 2, 2025: 3 }).reason, 'published_at_source_not_imported');
  assert.equal(run({ 2024: 2, 2025: 3 }).source_value, 3);
  assert.equal(run({ 2024: 2, 2025: 3 }, { 1: 'd' }).reason, 'published_at_source_with_definition_flag');
  assert.equal(compareSeries([record(2023, null), record(2024, 2)], lookupWith({ 2022: 1, 2024: 2 })).pending[0].reason, 'missing_at_source');
  assert.equal(availabilityReason({ query: { period: '2025' }, fetch: { points: {} }, period: '2025' }), 'not_available_for_country_at_source');
  assert.equal(availabilityReason({ query: { period: '2025' }, fetch: { error: 'HTTP 500' }, period: '2025' }), 'source_acquisition_failure');
  assert.equal(availabilityReason({ query: null }), 'no_registered_api_query');
  assert.equal(compareSeries([record(2025, null, { applicability_status: 'not_applicable' })], lookupWith({ 2025: 3 })).pending[0].reason, 'not_applicable_by_research_rule');
});

test('definition and break flags are surfaced; comparability is never assumed', () => {
  const result = compareSeries([record(2024, 2)], lookupWith({ 2024: 2, 2025: 3 }, { 0: 'b', 1: 'd' }));
  assert.deepEqual(result.definition_flags, [{ year: 2024, source_flags: ['break_in_series'] }]);
  assert.equal(result.new_observations[0].comparability, 'review_required_definition_flag');
  assert.equal(compareSeries([record(2024, 2)], lookupWith({ 2024: 2, 2025: 3 })).new_observations[0].comparability, 'not_assessed_by_this_tool');
});

test('derived values are checked through their components and recomputed only for registered formulas', () => {
  assert.equal(recompute('(semester_1 + semester_2) / 2', 0.2, 0.4), 0.30000000000000004);
  assert.equal(recompute('exports_goods_services - imports_goods_services', 10, 4), 6);
  assert.equal(recompute('exports_to_Germany / exports_to_world * 100', 1, 4), 25);
  assert.equal(recompute('something else', 1, 2), null);
  const derived = { year: 2023, value: 6, status: 'calculated', numerator: 10, denominator: 4, calculation_formula: 'a - b', source_query_url: url(2023, 'geo=HU&na_item=P6'), numerator_source_url: url(2023, 'geo=HU&na_item=P6'), denominator_source_url: url(2023, 'geo=HU&na_item=P7') };
  const fetches = { [`${API}demo?geo=HU&na_item=P6`]: { points: { 2023: { value: 12, flag: null } } }, [`${API}demo?geo=HU&na_item=P7`]: { points: { 2023: { value: 4, flag: null } } } };
  const lookup = (u) => { const query = seriesQuery(u); return query ? { query, fetch: fetches[query.endpoint] } : { query: null }; };
  const result = compareSeries([derived], lookup);
  assert.equal(result.revisions[0].proposed_value, 8);
  assert.deepEqual(result.revisions[0].components, [{ component: 'numerator', stored: 10, source: 12 }]);
  assert.equal(compareSeries([{ ...derived, numerator_source_url: 'https://comtradeapi.un.org/x', denominator_source_url: 'https://comtradeapi.un.org/y' }], lookup).not_checked[0].reason, 'derived_value_without_checkable_components');
});

test('the tool cannot write protected inputs, and the committed summary matches the checked file', () => {
  const tool = fs.readFileSync('scripts/data-refresh/canonical-check.mjs', 'utf8');
  const writes = [...tool.matchAll(/writeFileSync\(([^,]+),/g)].map((match) => match[1]);
  assert.ok(writes.length > 0);
  for (const target of writes) assert.doesNotMatch(target, /observations|src\/data|public\/research-data/, target);
  assert.doesNotMatch(tool, /copyFileSync\([^)]*src\/data/);
  const report = JSON.parse(fs.readFileSync('docs/data-refresh/canonical_source_check.json', 'utf8'));
  assert.equal(report.kind, 'candidate_report_only');
  assert.equal(report.series.length, 220);
  assert.equal(report.date_semantics.official_release_date_of_observation.startsWith('unavailable'), true);
  // The summary describes exactly the observations.json it was run against; a data change makes it stale on purpose.
  assert.equal(report.checked_file_sha256, crypto.createHash('sha256').update(fs.readFileSync('src/data/observations/observations.json')).digest('hex'));
  const summary = fs.readFileSync('src/lib/canonicalSourceCheck.ts', 'utf8');
  assert.ok(summary.includes(report.checked_file_sha256) && summary.includes(report.run_id));
  for (const entry of report.series) for (const item of entry.pending) assert.notEqual(item.reason, 'publication_delay');
});
