import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const data = require('../../src/lib/politicalData.ts');
const context = require('../../src/lib/politicalContextData.ts');
const { contextAnnualPoints } = require('../../src/lib/politicalEconomicContext.ts');
const { electionPeriods, electionMacroRows, electionMacroCoverage, electionMacroCsv, ELECTION_MACRO_INDICATORS } = require('../../src/lib/electionMacroLinkage.ts');
const annual = JSON.parse(fs.readFileSync(path.join(root, 'public/research-data/annual_history_runtime.json'), 'utf8'));
const inputs = context.politicalContextData('germany');
const points = contextAnnualPoints(inputs.observations, annual, inputs.indicators);
const allAdmitted = [...data.politicalElectionViews(), ...data.politicalComparisonCountries().flatMap((c) => c.elections)];
// The original four countries keep their exact results; Hungary is checked separately.
const elections = allAdmitted.filter((e) => e.country !== 'hungary' && e.country !== 'serbia'); // Serbia (2026-11-15) is checked separately: no macro context is held for it.
const rows = electionMacroRows(elections, points);
const row = (electionId, indicator) => rows.find((r) => r.electionId === electionId && r.indicator === indicator);

test('every admitted election is matched to every indicator, with missing values kept explicit', () => {
  assert.equal(elections.length, 19); // Czechia 2002, 2006, 2010 and 2013 admitted 2026-11-21
  assert.equal(allAdmitted.length, 31); // Serbia 2020, 2022, 2023, 2026; Hungary 2010, 2014 and 2018 (2026-11-20); Czechia 2002–2013 (2026-11-21); Hungary 2002 and 2006 (2026-11-22); Hungary 1998 (2026-11-23)
  assert.equal(rows.length, 19 * ELECTION_MACRO_INDICATORS.length);
  assert.deepEqual([...new Set(rows.map((r) => r.country))].sort(), ['czechia', 'germany', 'poland', 'slovakia']);
  assert.deepEqual(Object.fromEntries(electionMacroCoverage(rows).map((c) => [c.indicator, [c.lastCompleteYear, c.retrospective, c.elections]])), { hicp_inflation: [19, 19, 19], real_gdp_growth: [13, 14, 19], unemployment_rate: [4, 6, 19], fiscal_balance_gdp: [19, 19, 19], government_debt_gdp: [19, 19, 19] });
  const gap = row('el-de-bt-2013-09-22', 'real_gdp_growth');
  if (gap) { assert.equal(gap.lastCompleteYear.status, 'missing'); assert.equal(gap.lastCompleteYear.value, null, 'missing is never zero'); }
  for (const r of rows) for (const c of [r.lastCompleteYear, r.retrospective]) assert.equal(c.value === null, c.status !== 'published');
});

test('views stay separate: last complete year never includes the election year, and no leakage forward', () => {
  assert.deepEqual(electionPeriods('2023-09-30'), { retrospective: '2023', lastComplete: '2022' });
  assert.deepEqual(electionPeriods('2025-02-23'), { retrospective: '2025', lastComplete: '2024' });
  for (const r of rows) {
    const year = Number(r.electionDate.slice(0, 4));
    assert.equal(Number(r.lastCompleteYear.period), year - 1, r.electionId);
    assert.equal(r.lastCompleteYear.includesPostElectionMonths, false);
    assert.equal(r.retrospective.includesPostElectionMonths, true);
    assert.ok(Number(r.lastCompleteYear.period) < year);
  }
  const point = { id: 'x', country: 'slovakia', indicator: 'hicp_inflation', frequency: 'annual', period: '2023', value: 99, unit: '%', status: 'official', source: 's', sourceUrl: 'https://example.test', definition: 'd', comparable: true, layer: 'l' };
  const [sk] = data.politicalSlovakElectionViews();
  const only = electionMacroRows([sk], [point]).find((r) => r.indicator === 'hicp_inflation');
  assert.equal(only.lastCompleteYear.value, null, 'a value from the election year cannot reach the last-complete-year view');
  assert.equal(only.retrospective.value, 99);
});

test('non-pilot elections still claim no pre-election publication', () => {
  const pilots = new Set(['el-sk-nrsr-2023-09-30', 'el-pl-sejm-2023-10-15', 'el-cz-ps-2025-10-03', 'el-de-bt-2025-02-23']);
  for (const r of rows) if (!pilots.has(r.electionId)) assert.deepEqual(r.publishedBeforeElection, { status: 'not_established', reason: 'first_release_dates_not_recorded', note: null });
});

test('official figures carry through unchanged with provenance', () => {
  const sk = row('el-sk-nrsr-2023-09-30', 'government_debt_gdp');
  assert.equal(sk.lastCompleteYear.status, 'published');
  assert.match(sk.lastCompleteYear.sourceUrl, /^https:\/\//);
  assert.ok(sk.lastCompleteYear.source);
  assert.ok(sk.lastCompleteYear.unit);
  assert.equal(sk.turnout.published, 68.51);
  assert.equal(sk.seats, 150);
  assert.deepEqual(sk.thresholds, [5, 7, 10]);
  assert.ok(sk.sourceIds.includes('src-sk-state-commission-minutes-2023'));
  assert.equal(row('el-pl-sejm-2023-10-15', 'real_gdp_growth').seats, 460);
});

test('turnout and macro changes stay within one country on the same definition', () => {
  assert.ok(Math.abs(row('el-cz-ps-2021-10-08', 'hicp_inflation').turnout.changeSincePrevious - (65.43 - 60.84)) < 1e-9);
  assert.ok(Math.abs(row('el-pl-sejm-2023-10-15', 'hicp_inflation').turnout.changeSincePrevious - (74.38 - 61.74)) < 1e-9);
  assert.equal(row('el-sk-nrsr-2023-09-30', 'hicp_inflation').turnout.changeSincePrevious, null, 'first admitted election has no previous one');
  assert.equal(row('el-cz-ps-2002-06-14', 'hicp_inflation').lastCompleteYear.changeSincePreviousElection, null, 'Czechia 2002 is the first admitted Czech election');
  assert.ok(Math.abs(row('el-cz-ps-2006-06-02', 'hicp_inflation').turnout.changeSincePrevious - (64.47 - 58)) < 1e-9);
  assert.ok(Math.abs(row('el-cz-ps-2017-10-20', 'hicp_inflation').turnout.changeSincePrevious - (60.84 - 59.48)) < 1e-9, '2017 now follows 2013 on the same turnout definition');
  for (const r of rows) if (r.lastCompleteYear.changeSincePreviousElection !== null) {
    const previous = rows.filter((x) => x.country === r.country && x.indicator === r.indicator && x.electionDate < r.electionDate).sort((a, b) => a.electionDate.localeCompare(b.electionDate)).at(-1);
    assert.ok(previous, r.electionId);
    assert.equal(previous.lastCompleteYear.definition, r.lastCompleteYear.definition, 'a change never crosses a definition or source layer');
    assert.equal(previous.lastCompleteYear.unit, r.lastCompleteYear.unit);
  }
});

test('no party attribution or pooled cross-country figure exists; export keeps every transparency field', () => {
  for (const r of rows) for (const key of ['party', 'partyId', 'contestant', 'correlation', 'effect', 'probability', 'rank']) assert.ok(!(key in r), key);
  const csv = electionMacroCsv(rows);
  const header = csv.split('\n')[0];
  for (const field of ['country', 'election_id', 'election_date', 'indicator', 'view', 'observation_period', 'value', 'unit', 'value_status', 'includes_post_election_months', 'published_before_election', 'source', 'source_url', 'definition', 'data_layer', 'result_vintage', 'turnout_numerator', 'limitation']) assert.ok(header.replace("\uFEFF", "").split(",").includes(field), field);
  assert.equal(csv.split('\n').length, 1 + rows.length * 2);
  assert.match(csv, /not the figure available at the time; as_of fields come from dated releases where documented\. No causal or party attribution/);
  assert.match(csv, /"4\.59"/, 'differences carry no floating-point noise');
  const ui = fs.readFileSync(path.join(root, 'src/components/PoliticalElectionMacroTable.tsx'), 'utf8');
  assert.match(ui, /do not show that economic conditions caused/);
  assert.doesNotMatch(ui, /\bcorrelat|\bregress|forecast|\bprobabilit/i);
});

test('the panel is enabled for all admitted countries through the existing contract', () => {
  for (const [slug, route] of [['czechia', 'czechia'], ['poland', 'poland'], ['slovakia', 'slovakia'], ['hungary', 'hungary']]) for (const group of ['(zh)/politics', '(english)/en/politics']) assert.match(fs.readFileSync(path.join(root, 'src/app', group, route, 'page.tsx'), 'utf8'), new RegExp(`politicalContextData\\("${slug}"\\)`));
  assert.deepEqual([...new Set(inputs.observations.map((o) => o.country_slug))].sort(), ['czechia', 'germany', 'hungary', 'poland', 'slovakia']);
  assert.ok(inputs.events.every((e) => e.country_slug === 'germany'), 'events stay with the page country');
});

test('Hungary joins the same linkage: 1998, 2002, 2006, 2010, 2014, 2018, 2022 and 2026 rows, turnout changes on one computed basis, nothing claimed as released before polling', () => {
  const hu = electionMacroRows(allAdmitted.filter((e) => e.country === 'hungary'), points);
  assert.equal(hu.length, 8 * ELECTION_MACRO_INDICATORS.length);
  assert.ok(hu.filter((r) => r.electionId === 'el-hu-ogy-1998-05-10').every((r) => r.turnout.published === null && r.turnout.computed === null), '1998: the list ballot is a valid-round composite with no single turnout');
  assert.ok(hu.every((r) => r.publishedBeforeElection.status !== 'documented'));
  assert.ok(hu.every((r) => r.turnout.published === ({ 'el-hu-ogy-2002-04-07': 70.53, 'el-hu-ogy-2006-04-09': 67.83, 'el-hu-ogy-2010-04-11': 64.38 }[r.electionId] ?? null)), '2002, 2006 and 2010 print their round-1 turnout; 2014-2026 print none');
  assert.ok(Math.abs(hu.find((r) => r.electionId === 'el-hu-ogy-2010-04-11').turnout.changeSincePrevious - (64.38 - 67.83)) < 1e-9, 'printed round-1 turnout to printed round-1 turnout');
  assert.equal(hu.find((r) => r.electionId === 'el-hu-ogy-2002-04-07').turnout.changeSincePrevious, null, 'no change is computed against the 1998 composite ballot');
  const later = hu.find((r) => r.electionId === 'el-hu-ogy-2026-04-12');
  assert.ok(Math.abs(later.turnout.computed - (6408362 / 8112646) * 100) < 1e-9);
  assert.ok(Math.abs(later.turnout.changeSincePrevious - ((6408362 / 8112646) - (5717182 / 8215304)) * 100) < 1e-9);
  assert.equal(hu.find((r) => r.electionId === 'el-hu-ogy-2014-04-06').turnout.changeSincePrevious, null, 'a printed and a computed turnout are never differenced');
  assert.ok(Math.abs(hu.find((r) => r.electionId === 'el-hu-ogy-2022-04-03').turnout.changeSincePrevious - ((5717182 / 8215304) - (5796268 / 8312173)) * 100) < 1e-9);
  assert.ok(Math.abs(hu.find((r) => r.electionId === 'el-hu-ogy-2018-04-08').turnout.changeSincePrevious - ((5796268 / 8312173) - (5096524 / 8241488)) * 100) < 1e-9);
  const election2026 = hu.filter((r) => r.electionId === 'el-hu-ogy-2026-04-12');
  assert.ok(election2026.every((r) => r.retrospective.status !== 'published'), 'the calendar year of a 2026 election is not complete, so it stays a gap');
});

test('Serbia in the comparison sets (2026-11-15): every row is an explicit gap, never a value or zero', () => {
  const serbia = allAdmitted.filter((e) => e.country === 'serbia');
  assert.deepEqual(serbia.map((e) => e.electionId).sort(), ['el-rs-nsk-2020-06-21', 'el-rs-nsk-2022-04-03', 'el-rs-nsk-2023-12-17', 'el-rs-nsk-2026-10-25']);
  const rs = electionMacroRows(serbia, points);
  assert.equal(rs.length, 4 * ELECTION_MACRO_INDICATORS.length);
  for (const r of rs) for (const view of [r.lastCompleteYear, r.retrospective]) { assert.equal(view.value, null, r.electionId); assert.notEqual(view.status, 'published', r.electionId); }
});
