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
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const data = require('../../src/lib/politicalData.ts');
const context = require('../../src/lib/politicalContextData.ts');
const { contextAnnualPoints, contextMonthlyPoints } = require('../../src/lib/politicalEconomicContext.ts');
const R = require('../../src/lib/comparativeElectionResearch.ts');
const C = require('../../src/lib/comparativeResearchCase.ts');
const M = require('../../src/lib/modelFramework.ts');
const explorer = require('../../src/lib/politicalExplorer.ts');

const inputs = context.politicalContextData('poland');
const points = [...contextAnnualPoints(inputs.observations, read('public/research-data/annual_history_runtime.json'), inputs.indicators), ...contextMonthlyPoints(read('public/research-data/monthly_history_runtime.json'), read('public/research-data/high_frequency_runtime.json').records, inputs.monthlyMetadata)];
const elections = [...data.politicalElectionViews(), ...data.politicalCzechElectionViews(), ...data.politicalPolishElectionViews(), ...data.politicalSlovakElectionViews(), ...data.politicalHungarianElectionViews()];
const models = inputs.researchCaseModels;
const run = (list = elections) => C.runResearchCase(list, points, inputs.identityLinks, models);
const result = run();
const byPair = (from) => result.pairs.find((p) => p.fromElection === from);

test('countries and elections: 12 successive pairs in four countries, Slovakia as context only, no pair across countries', () => {
  assert.equal(elections.length, 17);
  assert.deepEqual(C.RESEARCH_CASE.countries, ['czechia', 'germany', 'hungary', 'poland']);
  const per = Object.fromEntries(C.RESEARCH_CASE.countries.map((c) => [c, result.pairs.filter((p) => p.country === c).length]));
  assert.deepEqual(per, { czechia: 2, germany: 6, hungary: 1, poland: 3 });
  for (const p of result.pairs) {
    const a = elections.find((e) => e.electionId === p.fromElection), b = elections.find((e) => e.electionId === p.toElection);
    assert.equal(a.country, p.country); assert.equal(b.country, p.country);
    assert.ok(a.date < b.date);
    const between = elections.filter((e) => e.country === p.country && e.date > a.date && e.date < b.date);
    assert.equal(between.length, 0, 'neighbouring elections only');
  }
  assert.ok(!result.pairs.some((p) => p.country === 'slovakia'));
  assert.deepEqual(result.context.map((c) => c.electionId), ['el-sk-nrsr-2023-09-30']);
  assert.equal(result.elections.length, 16);
});

test('identical definitions and date boundaries: last complete year is the year before polling day; the election year is flagged', () => {
  for (const p of result.pairs) for (const i of p.indicators) {
    if (i.primary.status === 'calculated') {
      assert.equal(i.primary.fromPeriod, String(Number(p.fromDate.slice(0, 4)) - 1));
      assert.equal(i.primary.toPeriod, String(Number(p.toDate.slice(0, 4)) - 1));
      assert.ok(i.primary.toPeriod < p.toDate.slice(0, 4), 'no figure from the polling year enters the primary view');
    }
    if (i.sensitivity.status === 'calculated') assert.equal(i.sensitivity.toPeriod, p.toDate.slice(0, 4));
  }
  // Every calculated change joins one measure: indicator, frequency, Eurostat dataset and unit.
  for (const c of result.primary.b.filter((x) => x.status === 'calculated')) {
    const [from, to] = [c.fromElection, c.toElection].map((id) => result.primary.allViewObservations.find((o) => o.electionId === id && o.indicator === c.indicator && o.view === 'last_complete_year'));
    assert.equal(from.measureKey, to.measureKey);
    assert.match(from.measureKey, /\|annual\|/);
  }
  assert.ok(result.primary.allViewObservations.filter((o) => o.view === 'election_calendar_year').every((o) => o.includesPostElectionMonths));
  for (const v of result.vintage.filter((x) => x.released)) assert.ok(v.released.publishedOn < v.electionDate, `${v.electionId} ${v.indicator}`);
  // A monthly release is never set against an annual figure as a revision.
  for (const v of result.vintage.filter((x) => x.released && x.released.frequency !== 'annual')) { assert.notEqual(v.relation, 'same_period_revision'); }
});

test('turnout changes are recomputed from the election views, on one basis per country', () => {
  for (const p of result.pairs) {
    const a = elections.find((e) => e.electionId === p.fromElection), b = elections.find((e) => e.electionId === p.toElection);
    const ta = explorer.turnoutForDisplay(a), tb = explorer.turnoutForDisplay(b);
    assert.equal(ta.computed, tb.computed);
    assert.equal(p.turnout.status, 'calculated');
    assert.ok(Math.abs(p.turnout.change - (tb.value - ta.value)) < 1e-6, p.fromElection);
  }
  assert.match(byPair('el-hu-ogy-2022-04-03').turnout.basis, /computed from official counts/);
  assert.ok(Math.abs(byPair('el-pl-sejm-2019-10-13').turnout.change - 12.64) < 1e-6);
  assert.ok(Math.abs(byPair('el-de-bt-2005-09-18').turnout.change + 6.9) < 1e-6);
});

test('identity gates: only verified lists move; Hungary has no figure; coalitions stay whole', () => {
  assert.equal(byPair('el-hu-ogy-2022-04-03').lists.verifiedShareMovement, null);
  assert.equal(byPair('el-hu-ogy-2022-04-03').lists.identityBasis, 'none');
  for (const p of result.pairs.filter((x) => x.country === 'germany')) assert.equal(p.lists.identityBasis, 'authority_series');
  for (const p of result.pairs.filter((x) => ['poland', 'czechia'].includes(x.country))) { assert.equal(p.lists.identityBasis, 'register_links'); assert.ok(p.lists.units > 0); }
  assert.deepEqual(result.missing.noVerifiedIdentity, ['el-hu-ogy-2022-04-03 → el-hu-ogy-2026-04-12']);
  const hu = data.politicalHungarianElectionViews();
  assert.ok(hu.every((e) => e.results.every((r) => r.partyId === null && r.memberPartyIds.length === 0)));
});

test('whole-chamber seat semantics hold for every election in the case', () => {
  for (const e of result.elections) assert.equal(explorer.seatMeasureScope(e), 'whole_chamber', e.electionId);
  for (const p of result.pairs) { assert.equal(p.rules.seatScopeFrom, 'whole_chamber'); assert.equal(p.rules.seatScopeTo, 'whole_chamber'); }
  const tisza = data.politicalHungarianElectionViews()[1].results.find((r) => r.chamberSeats === 141);
  assert.equal(explorer.measureValue(tisza, data.politicalHungarianElectionViews()[1], 'seat_share'), 100 * 141 / 199);
  assert.equal(byPair('el-de-bt-2021-09-26').rules.rulesChanged, true, 'the 2025 German rules differ');
});

test('missing and non-comparable data stay explicit: no zero fill, reasons recorded', () => {
  const unemployment = result.pairs.flatMap((p) => p.indicators.filter((i) => i.indicator === 'unemployment_rate'));
  assert.equal(unemployment.filter((i) => i.primary.status === 'calculated').length, 1, 'annual unemployment starts in 2021: only Hungary 2022→2026');
  for (const w of result.missing.withheld) { assert.ok(w.reason); const row = byPair(w.fromElection).indicators.find((i) => i.indicator === w.indicator).primary; assert.equal(row.change, null); }
  assert.equal(result.missing.withheld.length, 17);
  assert.ok(result.direction.every((d) => d.same + d.opposite <= d.pairs));
  for (const c of result.countries) for (const i of c.indicators) if (i.n < R.MIN_PAIRS_FOR_COEFFICIENT) assert.equal(i.pearson, null, `${c.country} ${i.indicator}`);
  assert.deepEqual(result.countries.flatMap((c) => c.indicators.filter((i) => i.pearson !== null).map((i) => `${c.country}:${i.indicator}`)), ['germany:hicp_inflation', 'germany:fiscal_balance_gdp', 'germany:government_debt_gdp']);
  // Leaving out a country removes exactly its pairs from the count.
  for (const d of result.direction) for (const w of d.withoutCountry) { const own = result.pairs.filter((p) => p.country === w.country).flatMap((p) => p.indicators.filter((i) => i.indicator === d.indicator && i.directionWithTurnout !== null)).length; assert.equal(w.pairs, d.pairs - own); }
});

test('model context: the models\' own scores, inputs identical to the study\'s observations, nothing before 2021, released formula reproduced', () => {
  const countries = read('src/data/countries/countries.json').records;
  for (const m of models) {
    const e = elections.find((x) => x.electionId === m.electionId);
    const card = M.modelCards.find((c) => c.model_id === m.modelId);
    const out = M.calculateModelOutputForYear(countries.find((c) => c.slug === m.country), card, Number(e.date.slice(0, 4)) - 1);
    assert.equal(m.score, out.score, `${m.electionId} ${m.modelId}`);
    assert.equal(m.inputYear, Number(e.date.slice(0, 4)) - 1);
    if (m.inputYear < 2021) { assert.equal(m.score, null); assert.equal(m.reason, 'model_inputs_not_held_for_year'); }
    for (const i of m.inputs) {
      const o = result.primary.allViewObservations.find((x) => x.electionId === m.electionId && x.indicator === i.indicator && x.view === 'last_complete_year')
        ?? C.runResearchCase(elections, points, inputs.identityLinks, models).context.flatMap((c) => c.observations.map((x) => ({ ...x, electionId: c.electionId }))).find((x) => x.electionId === m.electionId && x.indicator === i.indicator);
      assert.equal(o.value, i.value, `${m.electionId} ${i.indicator}: the model input is the study's own figure`);
    }
  }
  const hu = byPair('el-hu-ogy-2022-04-03').models;
  assert.deepEqual(hu.map((m) => [m.modelId, m.fromScore, m.toScore, m.change]), [['household_economic_pressure', 36, 34, -2], ['fiscal_pressure', 70.6, 57.6, -13]]);
  assert.ok(result.pairs.filter((p) => p.country !== 'hungary').every((p) => p.models.every((m) => m.status === 'unavailable')));
  const fiscal = (id) => models.find((m) => m.electionId === id && m.modelId === 'fiscal_pressure').released;
  const card = M.modelCards.find((c) => c.model_id === 'fiscal_pressure');
  for (const id of ['el-cz-ps-2025-10-03', 'el-pl-sejm-2023-10-15', 'el-sk-nrsr-2023-09-30', 'el-de-bt-2025-02-23']) {
    const r = fiscal(id);
    assert.equal(r.status, 'calculated', id);
    const contributions = r.inputs.map((i) => Number((M.normalizeModelInput(i.value, card.inputs.find((x) => x.indicator_id === i.indicator)) * i.weight).toFixed(1)));
    assert.equal(r.score, Number((contributions.reduce((s, v) => s + v, 0)).toFixed(1)), id);
    assert.ok(r.inputs.every((i) => i.publishedOn < elections.find((e) => e.electionId === id).date));
  }
  assert.equal(fiscal('el-de-bt-2025-02-23').samePeriodAsModelYear, false, 'released Germany 2023 against current 2024 is not a revision');
  assert.deepEqual(result.modelVintage.filter((m) => m.status === 'same_period_revision').map((m) => [m.electionId, m.difference]).sort(), [['el-cz-ps-2025-10-03', -1.2], ['el-pl-sejm-2023-10-15', -1.7], ['el-sk-nrsr-2023-09-30', -2]]);
  for (const id of ['el-de-bt-2025-02-23', 'el-pl-sejm-2023-10-15', 'el-sk-nrsr-2023-09-30']) assert.equal(models.find((m) => m.electionId === id && m.modelId === 'household_economic_pressure').released.reason, 'released_input_not_annual');
  assert.equal(models.find((m) => m.electionId === 'el-hu-ogy-2026-04-12' && m.modelId === 'fiscal_pressure').released.reason, 'first_release_dates_not_recorded');
});

test('export: the same data give the same bytes in any input order; findings make no causal or ranking claim', () => {
  const evidence = JSON.stringify(C.researchCaseEvidence(result));
  const shuffled = [...elections].reverse();
  assert.equal(JSON.stringify(C.researchCaseEvidence(run(shuffled))), evidence);
  assert.equal(C.researchCaseCsv(run(shuffled)), C.researchCaseCsv(result));
  const parsed = JSON.parse(evidence);
  assert.equal(parsed.case_id, 'd4-turnout-and-pre-election-conditions');
  assert.equal(parsed.descriptive_only, true);
  assert.equal(parsed.pairs.length, 12);
  const csv = C.researchCaseCsv(result).replace(/^﻿/, '').split('\n');
  assert.equal(csv[0], 'record_type,country,election_id,comparison_election_id,indicator_or_model,view,period,comparison_period,value,comparison_value,difference,unit,status,reason,note');
  assert.equal(csv.filter((l) => l.startsWith('"turnout_change"')).length, 12);
  assert.equal(csv.filter((l) => l.startsWith('"indicator_change"')).length, 12 * 5 * 2);
  const text = C.researchCaseFindings(result).map((f) => `${f.en} ${f.zh}`).join(' ');
  assert.doesNotMatch(text, /caus|effect of|predict|forecast|rank|best|worst|导致|预测|排名/i);
  assert.match(C.researchCaseFindings(result)[0].en, /Turnout rose in 10 and fell in 2 of 12 pairs/);
});

test('D1, D2 and D3 are preserved: the case runs the existing research functions unchanged', () => {
  const d3 = R.runComparativeResearch({ countries: C.RESEARCH_CASE.countries, view: 'last_complete_year' }, elections, points, inputs.identityLinks);
  assert.deepEqual(result.primary.b, d3.b);
  assert.deepEqual(result.primary.c.associations, d3.c.associations);
  assert.equal(R.RESEARCH_QUESTIONS.join(), 'A,B,C,D');
  assert.equal(R.RESEARCH_METHOD_VERSION, 'atlas-comparative-election-research-v2');
});

test('Hungary presentation: rules and vintage name both official sources and no longer say constituency seats are excluded', () => {
  for (const e of data.politicalHungarianElectionViews()) {
    const rules = e.national.rules;
    assert.doesNotMatch(rules.districtAllocation, /not included/);
    assert.match(rules.districtAllocation, /chamber-composition record/);
    assert.doesNotMatch(rules.totalSeatsDefinition.en, /national list seats only/);
    assert.match(e.resultVintage, /National Election Commission minutes .*National Election Office chamber-composition record/);
    assert.ok(rules.sourceIds.some((id) => /^src-hu-nvi-composition-/.test(id)) || e.sources.some((s) => /^src-hu-nvi-composition-/.test(s.id)));
    for (const r of e.national.ballots.flatMap((b) => b.results)) assert.match(r.chamberSeatSourceId, /^src-hu-nvi-composition-20(22|26)$/);
    assert.ok(e.sources.some((s) => s.institution === 'Nemzeti Választási Iroda') && e.sources.some((s) => s.institution === 'Nemzeti Választási Bizottság'));
  }
});
