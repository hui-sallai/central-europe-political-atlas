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

const inputs = context.politicalContextData('germany');
const points = [...contextAnnualPoints(inputs.observations, read('public/research-data/annual_history_runtime.json'), inputs.indicators), ...contextMonthlyPoints(read('public/research-data/monthly_history_runtime.json'), read('public/research-data/high_frequency_runtime.json').records, inputs.monthlyMetadata)];
const elections = [...data.politicalElectionViews(), ...data.politicalComparisonCountries().flatMap((c) => c.elections)];
const links = inputs.identityLinks;
const run = (selection = {}) => R.runComparativeResearch(selection, elections, points, links);
const SK = 'el-sk-nrsr-2023-09-30', PL23 = 'el-pl-sejm-2023-10-15', PL19 = 'el-pl-sejm-2019-10-13', CZ25 = 'el-cz-ps-2025-10-03', CZ21 = 'el-cz-ps-2021-10-08', CZ17 = 'el-cz-ps-2017-10-20', DE25 = 'el-de-bt-2025-02-23', DE21 = 'el-de-bt-2021-09-26', DE17 = 'el-de-bt-2017-09-24';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test('every admitted election has an explicit record in every view; a gap is a status, never zero', () => {
  const all = R.researchObservations(elections, points);
  assert.equal(elections.length, 15);
  assert.equal(all.length, 15 * 5 * 4);
  for (const o of all) { assert.equal(o.value === null, o.status !== 'observed', o.electionId); if (o.status !== 'observed') assert.ok(o.reason, o.electionId); }
  const count = (view) => all.filter((o) => o.view === view && o.status === 'observed').length;
  assert.deepEqual([count('last_complete_year'), count('election_calendar_year'), count('last_complete_month'), count('released_before_election')], [58, 61, 27, 19]);
  assert.ok(all.filter((o) => o.view === 'last_complete_month' && ['real_gdp_growth', 'fiscal_balance_gdp', 'government_debt_gdp'].includes(o.indicator)).every((o) => o.status === 'no_series_at_frequency'), 'no annual figure stands in for a monthly one');
});

test('the last complete month is the calendar month before polling day, and no later figure can enter', () => {
  assert.equal(R.lastCompleteMonth('2023-09-30'), '2023-08');
  assert.equal(R.lastCompleteMonth('2025-01-15'), '2024-12');
  for (const o of R.researchObservations(elections, points).filter((x) => x.view === 'last_complete_month' && x.period)) assert.ok(o.period < o.electionDate.slice(0, 7), o.electionId);
});

test('comparison identity: indicator, frequency, Eurostat dataset and unit, with identical query across Atlas layers', () => {
  const norm = (url) => { const u = new URL(url); return [...u.searchParams.keys()]; };
  const queries = { hicp_inflation: [/prc_hicp_aind/, /unit=RCH_A_AVG/, /coicop=CP00/], real_gdp_growth: [/nama_10_gdp/, /unit=CLV_PCH_PRE/, /na_item=B1GQ/], unemployment_rate: [/une_rt_a/, /unit=PC_ACT/], fiscal_balance_gdp: [/gov_10dd_edpt1/, /unit=PC_GDP/, /na_item=B9/, /sector=S13/], government_debt_gdp: [/gov_10dd_edpt1/, /unit=PC_GDP/, /na_item=GD/, /sector=S13/] };
  for (const o of R.researchObservations(elections, points).filter((x) => x.status === 'observed' && x.vintage === 'current_published' && x.frequency === 'annual')) {
    for (const re of queries[o.indicator]) assert.match(o.sourceUrl, re, `${o.electionId} ${o.indicator}`);
    assert.ok(norm(o.sourceUrl).length > 0);
  }
  const keys = new Set(R.researchObservations(elections, points).filter((x) => x.status === 'observed' && x.view === 'last_complete_year').map((x) => x.measureKey));
  assert.equal(keys.size, 5, 'one measure per indicator, even across national source labels and data layers');
  const point = { id: 'x', country: 'slovakia', indicator: 'hicp_inflation', frequency: 'annual', period: '2022', value: 1, unit: '%', status: 'official', source: 'Other', sourceUrl: 'https://example.test/other', definition: 'national index', comparable: true, layer: 'l' };
  assert.equal(R.measureKey(point), null, 'an unidentified dataset is never comparable');
  const only = R.researchObservations([elections.find((e) => e.electionId === SK)], [point]).find((o) => o.view === 'last_complete_year' && o.indicator === 'hicp_inflation');
  assert.equal(only.status, 'missing');
  assert.equal(only.reason, 'dataset_not_identified');
  assert.equal(only.value, null);
});

test('A: statistics are correct, grouped by measure, keep date order, and do not merge frequencies', () => {
  const r = run();
  const hicp = r.a.measures.find((m) => m.indicator === 'hicp_inflation');
  assert.equal(hicp.n, 15);
  assert.equal(hicp.frequency, 'annual');
  assert.deepEqual([hicp.min.value, hicp.max.value, hicp.median], [0.1, 13.2, 2.2]);
  close(hicp.range, 13.1);
  assert.deepEqual(hicp.max.electionIds, [PL23]);
  assert.equal(hicp.flags.mixedDataLayers, true);
  assert.deepEqual(hicp.rows.map((x) => x.country), [...hicp.rows.map((x) => x.country)].sort(), 'rows are not ordered by value');
  assert.ok(r.a.gaps.some((g) => g.electionId === 'el-de-bt-2013-09-22' && g.indicator === 'real_gdp_growth' && g.status === 'missing'));
  const month = run({ view: 'last_complete_month' }).a.measures;
  assert.deepEqual(month.map((m) => [m.indicator, m.frequency, m.n]), [['hicp_inflation', 'monthly', 15], ['unemployment_rate', 'monthly', 12]]);
  const released = run({ view: 'released_before_election' }).a.measures;
  assert.deepEqual(released.map((m) => [m.indicator, m.frequency, m.n]), [['hicp_inflation', 'monthly', 4], ['real_gdp_growth', 'quarterly', 4], ['unemployment_rate', 'monthly', 3], ['fiscal_balance_gdp', 'annual', 4], ['government_debt_gdp', 'annual', 4]]);
  assert.equal(released.find((m) => m.indicator === 'hicp_inflation').flags.mixedReleaseMaturity, true, 'flash and final figures are flagged');
  const split = R.compareAcrossElections([{ electionId: 'a', country: 'x', electionDate: '2020-01-01', indicator: 'hicp_inflation', view: 'last_complete_year', status: 'observed', value: 1, measureKey: 'k1', period: '2019', frequency: 'annual', unit: '%', dataset: 'd', layer: 'l', flashEstimate: null, publishedOn: null }, { electionId: 'b', country: 'y', electionDate: '2021-01-01', indicator: 'hicp_inflation', view: 'last_complete_year', status: 'observed', value: 9, measureKey: 'k2', period: '2020', frequency: 'annual', unit: 'index', dataset: 'e', layer: 'l', flashEstimate: null, publishedOn: null }], { electionIds: ['a', 'b'], indicators: ['hicp_inflation'], countries: ['x', 'y'], view: 'last_complete_year' });
  assert.equal(split.measures.length, 2, 'different definitions are never joined');
  assert.ok(split.measures.every((m) => m.n === 1));
});

test('B: changes stay within a country, between neighbours, on one measure; unselecting never bridges an election', () => {
  const r = run();
  assert.equal(R.successiveElectionPairs(elections, r.selection).length, 11);
  const change = (from, to, indicator, x = r) => x.b.find((c) => c.fromElection === from && c.toElection === to && c.indicator === indicator);
  close(change(PL19, PL23, 'hicp_inflation').change, 12);
  assert.deepEqual([change(PL19, PL23, 'hicp_inflation').fromPeriod, change(PL19, PL23, 'hicp_inflation').toPeriod], ['2018', '2022']);
  assert.equal(change(PL19, PL23, 'hicp_inflation').crossesDataLayer, true, 'crossing the 2020/2021 layer boundary is flagged');
  assert.equal(change(DE17, DE21, 'hicp_inflation').crossesDataLayer, false);
  assert.equal(change(DE17, DE21, 'real_gdp_growth').status, 'withheld');
  assert.equal(change(DE17, DE21, 'real_gdp_growth').reason, 'observation_missing_for_one_election');
  assert.equal(change(DE17, DE21, 'real_gdp_growth').change, null);
  for (const c of r.b) assert.equal(c.fromElection.slice(0, 5), c.toElection.slice(0, 5), 'never across countries');
  const skipped = run({ electionIds: elections.map((e) => e.electionId).filter((id) => id !== CZ21) });
  assert.ok(!skipped.b.some((c) => c.fromElection === CZ17 && c.toElection === CZ25), 'an unselected election is not bridged');
  assert.ok(!skipped.b.some((c) => c.fromElection === CZ21 || c.toElection === CZ21));
  assert.equal(run({ countries: ['slovakia'] }).b.length, 0, 'one admitted election has no change');
  const path = change(PL19, PL23, 'hicp_inflation').path;
  assert.deepEqual([path.firstPeriod, path.lastPeriod, path.expected, path.observed], ['2018', '2022', 5, 5]);
  assert.equal(path.max, 13.2);
  const monthly = run({ view: 'last_complete_month' });
  assert.deepEqual([change(DE17, DE21, 'hicp_inflation', monthly).fromPeriod, change(DE17, DE21, 'hicp_inflation', monthly).toPeriod, change(DE17, DE21, 'hicp_inflation', monthly).frequency], ['2017-08', '2021-08', 'monthly']);
  assert.equal(change(DE17, DE21, 'hicp_inflation', monthly).path.expected, 49);
  assert.equal(change(DE17, DE21, 'fiscal_balance_gdp', monthly).status, 'withheld');
});

test('B/D: released figures never produce a change between elections while earlier ones are undocumented', () => {
  const r = run({ view: 'released_before_election' });
  assert.equal(r.b.length, 55);
  for (const c of r.b) { assert.equal(c.status, 'withheld'); assert.equal(c.change, null); assert.equal(c.reason, 'released_figure_not_documented_for_both_elections'); }
  assert.ok(r.c.associations.every((a) => a.n === 0 && a.status === 'no_pairs'));
});

test('turnout changes need one country and one published basis', () => {
  const r = run();
  const pair = (to) => r.c.pairs.find((p) => p.pair.to.electionId === to);
  close(pair(PL23).turnout.change, 12.64);
  assert.equal(pair(PL23).turnout.basis, 'valid_ballots / registered_electorate');
  assert.equal(pair(CZ25).turnout.basis, 'envelopes_issued / registered_electorate');
  assert.equal(pair(DE25).turnout.basis, 'voters / registered_electorate');
  const a = elections.find((e) => e.electionId === PL19), b = elections.find((e) => e.electionId === PL23);
  const changed = R.turnoutChange({ from: a, to: { ...b, national: { ...b.national, turnout: { ...b.national.turnout, numerator: 'voters' } } } });
  assert.deepEqual([changed.status, changed.reason, changed.change], ['withheld', 'turnout_basis_differs', null]);
});

test('verified list changes come from verified links only; coalitions are whole and members get nothing', () => {
  const r = run();
  const lists = (to) => r.c.pairs.find((p) => p.pair.to.electionId === to).lists;
  const cz = lists(CZ21);
  assert.equal(cz.identityBasis, 'register_links');
  assert.equal(cz.units.length, 5);
  assert.ok(cz.unresolvedLinks > 0, 'unresolved links are counted, not used');
  assert.equal(cz.rulesChanged, true);
  for (const p of r.c.pairs) {
    if (p.lists.units.length) close(p.lists.verifiedShareMovement, p.lists.units.reduce((s, u) => s + Math.abs(u.shareChange), 0) / 2);
    for (const u of p.lists.units) {
      close(u.shareChange, u.toShare - u.fromShare);
      const from = elections.find((e) => e.electionId === p.pair.from.electionId), to = elections.find((e) => e.electionId === p.pair.to.electionId);
      assert.ok(from.results.some((x) => x.publishedVoteShare === u.fromShare), u.label);
      assert.ok(to.results.some((x) => x.publishedVoteShare === u.toShare), u.label);
      assert.ok(u.fromShare >= 0 && u.toShare >= 0);
    }
    assert.deepEqual(p.lists.units.map((u) => u.label), [...p.lists.units.map((u) => u.label)].sort((a, b) => a.localeCompare(b)), 'listed by name, not ordered by result');
    assert.ok(p.lists.coveredShareFrom === null || (p.lists.coveredShareFrom <= 100.5 && p.lists.coveredShareTo <= 100.5), 'no vote is counted twice');
  }
  const de = lists(DE25);
  assert.equal(de.identityBasis, 'authority_series');
  assert.ok(de.units.every((u) => u.kind === 'authority_series'));
  for (const u of r.c.pairs.flatMap((p) => p.lists.units)) assert.ok(!('memberPartyIds' in u) && !('rank' in u));
  const result = (id, contestant) => elections.find((e) => e.electionId === id).results.find((x) => x.contestantId === contestant);
  const coalitionLinks = links.filter((l) => l.relation === 'same_coalition_composition' && l.status === 'verified');
  assert.ok(coalitionLinks.length > 0);
  const coalitionUnits = r.c.pairs.flatMap((p) => p.lists.units.filter((u) => u.kind === 'coalition').map((u) => ({ ...u, fromElection: p.pair.from.electionId, toElection: p.pair.to.electionId })));
  assert.equal(coalitionUnits.length, coalitionLinks.length, 'a coalition appears only through its verified same-composition link');
  for (const u of coalitionUnits) {
    const link = coalitionLinks.find((l) => l.fromElection === u.fromElection && l.toElection === u.toElection);
    assert.equal(u.fromShare, result(link.fromElection, link.fromContestant).publishedVoteShare, 'the whole coalition total');
    assert.equal(u.toShare, result(link.toElection, link.toContestant).publishedVoteShare, 'the whole coalition total');
  }
  // A party standing inside a coalition in either election has no unit, so its coalition's votes are never given to it.
  for (const p of r.c.pairs.filter((q) => q.pair.country !== 'germany')) for (const u of p.lists.units.filter((v) => v.kind === 'party')) {
    for (const e of [p.pair.from, p.pair.to]) assert.ok(e.results.filter((x) => x.publishedVoteShare === (e === p.pair.from ? u.fromShare : u.toShare)).some((x) => x.contestantKind !== 'coalition'), u.label);
  }
});

test('C: coefficient arithmetic is right, and few pairs give direction counts only', () => {
  close(R.pearson([1, 2, 3], [2, 4, 6]), 1);
  close(R.pearson([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(R.pearson([1, 1, 1], [1, 2, 3]), null, 'no variation has no coefficient');
  assert.equal(R.pearson([1, 2], [1, 2]), null);
  close(R.spearman([1, 2, 3, 4], [1, 4, 9, 16]), 1);
  close(R.spearman([1, 2, 2, 3], [1, 3, 2, 4]), Number(R.pearson([1, 2.5, 2.5, 4], [1, 3, 2, 4]).toFixed(9)));
  // Independent hand calculation for Germany, debt on the last complete year against turnout change.
  const x = [6.9, 0.2, 14.6, -11.5, -0.3, 62.2 - 68], y = [-1.4, -6.9, 0.7, 4.7, 0.2, 6.1];
  const r = run({ countries: ['germany'] });
  const a = r.c.associations.find((v) => v.indicator === 'government_debt_gdp' && v.outcome === 'turnout_change');
  assert.equal(a.n, 6);
  assert.equal(a.status, 'coefficient');
  close(a.pearson, Number(R.pearson(x, y).toFixed(3)));
  assert.equal(a.pearson, -0.434);
  assert.deepEqual([a.sameDirection, a.oppositeDirection], [1, 5]);
  assert.equal(a.pairsAcrossDataLayers, 1);
  assert.equal(a.sameDataLayerPairs, 5);
  assert.ok(a.leaveOneOutPearson.min <= a.pearson && a.leaveOneOutPearson.max >= a.pearson);
  const all = run();
  for (const v of all.c.associations) if (v.n < R.MIN_PAIRS_FOR_COEFFICIENT) { assert.notEqual(v.status, 'coefficient'); assert.equal(v.pearson, null); assert.equal(v.spearman, null); }
  assert.deepEqual([...new Set(all.c.associations.filter((v) => v.status === 'coefficient').map((v) => v.country))], ['germany'], 'only Germany has enough pairs');
  assert.ok(all.c.associations.every((v) => ['germany', 'czechia', 'poland', 'slovakia'].includes(v.country)), 'every association belongs to one country');
  assert.equal(all.c.associations.find((v) => v.country === 'germany' && v.indicator === 'real_gdp_growth' && v.outcome === 'turnout_change').status, 'no_pairs');
  const direction = all.c.direction.find((d) => d.indicator === 'government_debt_gdp');
  assert.deepEqual([direction.pairs, direction.sameDirection, direction.oppositeDirection], [11, 4, 7]);
  assert.ok(!('pearson' in direction), 'across countries there are counts, not a pooled coefficient');
});

test('D: same-period revisions are separate from different periods and frequencies; nothing is backfilled', () => {
  const { released, spreads, checks } = run().d;
  assert.equal(released.length, 20);
  assert.equal(released.filter((r) => r.status === 'documented').length, 19);
  const find = (id, indicator) => released.find((r) => r.electionId === id && r.indicator === indicator);
  const cz = find(CZ25, 'unemployment_rate');
  assert.deepEqual([cz.status, cz.value, cz.currentValue, cz.reason], ['not_established', null, null, 'last_release_not_located']);
  assert.equal(R.researchObservations(elections, points).find((o) => o.electionId === CZ25 && o.indicator === 'unemployment_rate' && o.view === 'last_complete_month').value, 3, 'the current monthly figure exists but stays in its own view');
  const sk = find(SK, 'fiscal_balance_gdp');
  assert.deepEqual([sk.value, sk.currentValue, sk.revisionSinceRelease, sk.publishedOn], [-2, -1.6, 0.4, '2023-04-21']);
  const v = (r, view) => r.versus.find((x) => x.view === view);
  assert.equal(v(sk, 'last_complete_year').relation, 'same_period_revision');
  close(v(sk, 'last_complete_year').difference, 0.4);
  assert.equal(v(sk, 'election_calendar_year').relation, 'different_period');
  const de = find(DE25, 'fiscal_balance_gdp');
  assert.deepEqual([de.period, v(de, 'last_complete_year').period, v(de, 'last_complete_year').relation], ['2023', '2024', 'different_period'], 'the 2024 figure was not yet public at the 2025 German vote');
  assert.equal(de.monthsFromPeriodEndToElection, 14);
  const gdp = find(PL23, 'real_gdp_growth');
  assert.equal(v(gdp, 'last_complete_year').relation, 'different_frequency');
  assert.equal(gdp.currentValue, null);
  assert.equal(v(find(DE25, 'hicp_inflation'), 'last_complete_month').relation, 'same_period_revision');
  assert.equal(v(find(SK, 'hicp_inflation'), 'last_complete_month').relation, 'different_period');
  assert.equal(find(SK, 'hicp_inflation').daysBeforeElection, 1);
  for (const r of released) if (r.status === 'documented') { assert.ok(r.publishedOn < r.electionDate); assert.ok(r.daysBeforeElection > 0); assert.match(r.releaseSha256, /^[0-9a-f]{64}$/); assert.match(r.sourceUrl, /^https:\/\/ec\.europa\.eu\/eurostat\//); }
  const flip = checks.find((c) => c.indicator === 'real_gdp_growth' && c.electionA === SK && c.electionB === PL23);
  close(flip.releasedDifference, -2.7);
  assert.equal(flip.views.find((x) => x.view === 'last_complete_year').directionChanged, true);
  assert.equal(flip.views.find((x) => x.view === 'last_complete_year').sameFrequencyAsReleased, false);
  const debt = spreads.find((s) => s.indicator === 'government_debt_gdp');
  close(debt.released, 62.9 - 43.6);
  assert.equal(spreads.find((s) => s.indicator === 'unemployment_rate').elections, 3, 'spreads use only documented elections');
  assert.equal(run({ electionIds: [SK], countries: ['slovakia'] }).d.checks.length, 0, 'one election has no pair');
});

test('findings report computed sizes and carry no causal, predictive or ranking wording', () => {
  const texts = R.RESEARCH_VIEWS.flatMap((view) => Object.values(R.researchFindings(run({ view }), elections)).flat());
  assert.ok(texts.length > 20);
  for (const t of texts) {
    assert.ok(t.en && t.zh);
    assert.doesNotMatch(t.en, /\b(caused?|causes|because|effect|impact|due to|led to|forecast|predict\w*|winner|rank\w*|best|worst|explains?)\b/i, t.en);
    assert.doesNotMatch(t.zh, /导致|造成|因为|预测|赢家|排名|最好|最差/, t.zh);
  }
  const findings = R.researchFindings(run(), elections);
  assert.ok(findings.A.some((t) => /HICP inflation: 15 elections, from 0\.1 \(Poland 2015\) to 13\.2 \(Poland 2023\); median 2\.2/.test(t.en)));
  assert.ok(findings.C.some((t) => /Germany, government debt and turnout change: Pearson −0\.434, Spearman −0\.543 on 6 pairs/.test(t.en)));
  assert.ok(findings.D.some((t) => /^19 figures have a dated release before polling day\. 15 also have a current value for the same period, and 10 of those differ/.test(t.en)));
  assert.ok(findings.D.some((t) => /6 of 8 annual figures/.test(t.en)));
  assert.ok(findings.D.some((t) => /4 of 27 comparisons\. 4 of those 4/.test(t.en)));
  const code = fs.readFileSync(path.join(root, 'src/lib/comparativeElectionResearch.ts'), 'utf8');
  for (const r of [...R.RESEARCH_RULES, ...R.RESEARCH_LIMITS]) assert.ok(code.includes(r.slice(0, 20)));
  assert.ok(R.RESEARCH_RULES.some((r) => /No figure shows that economic conditions caused a result/.test(r)));
});

test('selection is validated, and an empty selection stays empty instead of defaulting to all', () => {
  const s = R.normalizeSelection({ countries: ['germany', 'romania', 'austria'], indicators: ['hicp_inflation', 'made_up'], view: 'nonsense' }, elections);
  assert.deepEqual(s.countries, ['germany'], 'unadmitted countries cannot be selected');
  assert.deepEqual(s.indicators, ['hicp_inflation']);
  assert.equal(s.view, 'last_complete_year');
  assert.ok(s.electionIds.every((id) => id.startsWith('el-de')));
  const empty = run({ countries: [], electionIds: [], indicators: [] });
  assert.deepEqual([empty.observations.length, empty.a.measures.length, empty.b.length, empty.d.released.length], [0, 0, 0, 0]);
  const scoped = run({ electionIds: [SK], indicators: ['hicp_inflation'], countries: ['slovakia'] });
  assert.equal(scoped.observations.length, 1);
  assert.ok(!run({ countries: ['slovakia'], electionIds: [SK, DE25] }).observations.some((o) => o.electionId === DE25), 'an election of an unselected country is dropped');
});

test('the export is reproducible and holds selection, rules, evidence, release hashes and results', async () => {
  const selection = { countries: ['germany', 'poland'], indicators: ['hicp_inflation', 'government_debt_gdp'], view: 'last_complete_year' };
  const one = R.researchEvidencePackage(run(selection), elections), two = R.researchEvidencePackage(run(selection), elections);
  assert.equal(JSON.stringify(one), JSON.stringify(two));
  const digest = await R.researchDigest(one);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(digest, await R.researchDigest(two));
  assert.notEqual(digest, await R.researchDigest(R.researchEvidencePackage(run({ ...selection, view: 'election_calendar_year' }), elections)));
  assert.equal(one.schema_version, R.RESEARCH_METHOD_VERSION);
  assert.equal(one.descriptive_only, true);
  assert.deepEqual(one.selection.countries, ['germany', 'poland']);
  assert.ok(one.method.rules.length >= 8 && one.method.limits.length >= 6);
  assert.ok(one.elections.every((e) => e.sources.every((s) => s.url && s.sha256 && s.institution)), 'election sources are specific and hashed');
  assert.ok(one.elections.filter((e) => e.country === 'poland').every((e) => e.sources.every((s) => !/Bundeswahlleiterin/.test(s.institution))));
  assert.ok(one.releases_used.length > 0 && one.releases_used.every((x) => /^[0-9a-f]{64}$/.test(x.sha256) && x.published_on));
  for (const key of ['question_a', 'question_b', 'question_c', 'question_d', 'observations', 'findings']) assert.ok(one[key], key);
  for (const view of R.RESEARCH_VIEWS) assert.ok(one.observations.some((o) => o.view === view), view);
  assert.doesNotMatch(JSON.stringify(one), /candidate|sallai|student|\/Users\//i);
  const csv = R.researchCsv(run());
  const [header, ...lines] = csv.replace('﻿', '').split('\n');
  const columns = header.split(',');
  const parse = (line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1]);
  assert.ok(lines.every((l) => parse(l).length === columns.length), 'every record has every column');
  for (const type of ['observation', 'across_elections', 'successive_change', 'turnout_change', 'verified_list_movement', 'verified_unit_change', 'association', 'released_versus_view', 'direction_check']) assert.ok(lines.some((l) => l.startsWith(`"${type}"`)), type);
  const value = (line, name) => parse(line)[columns.indexOf(name)];
  const obs = lines.find((l) => l.startsWith('"observation"') && l.includes(`"${SK}"`) && l.includes('"fiscal_balance_gdp"') && l.includes('"released_before_election"'));
  assert.deepEqual([value(obs, 'value'), value(obs, 'vintage'), value(obs, 'published_on')], ['-2', 'dated_release', '2023-04-21']);
  const current = lines.find((l) => l.startsWith('"observation"') && l.includes(`"${SK}"`) && l.includes('"fiscal_balance_gdp"') && l.includes('"last_complete_year"'));
  assert.deepEqual([value(current, 'value'), value(current, 'vintage')], ['-1.6', 'current_published'], 'current and released vintages are separate records');
  assert.equal(value(lines.find((l) => l.startsWith('"observation"') && l.includes(`"${CZ25}"`) && l.includes('"unemployment_rate"') && l.includes('"released_before_election"')), 'value'), '');
  assert.ok(lines.filter((l) => l.startsWith('"association"')).every((l) => /not causation/.test(l)));
});

test('existing research results are preserved: D1 and D2 coverage and the election stores are unchanged', () => {
  const { electionMacroRows, electionMacroCoverage } = require('../../src/lib/electionMacroLinkage.ts');
  const rows = electionMacroRows(elections, points);
  assert.equal(rows.length, 75);
  assert.deepEqual(Object.fromEntries(electionMacroCoverage(rows).map((c) => [c.indicator, [c.lastCompleteYear, c.retrospective, c.publishedBeforeElection]])), { hicp_inflation: [15, 15, 4], real_gdp_growth: [9, 10, 4], unemployment_rate: [4, 6, 3], fiscal_balance_gdp: [15, 15, 4], government_debt_gdp: [15, 15, 4] });
  assert.deepEqual([...new Set(elections.map((e) => e.country))].sort(), ['czechia', 'germany', 'poland', 'slovakia']);
  assert.deepEqual(['czechia', 'germany', 'poland', 'slovakia'].map((c) => elections.filter((e) => e.country === c).length), [3, 7, 4, 1]);
});

test('the workflow is reachable from the existing context panel on all four country pages', () => {
  const panel = fs.readFileSync(path.join(root, 'src/components/PoliticalEconomicContext.tsx'), 'utf8');
  assert.match(panel, /PoliticalComparativeResearch elections=\{allElections\}/);
  assert.match(panel, /every\(v=>v==="ready"\)/, 'it never runs on partial histories');
  const ui = fs.readFileSync(path.join(root, 'src/components/PoliticalComparativeResearch.tsx'), 'utf8');
  for (const param of ['research_q', 'research_case', 'research_view', 'research_countries', 'research_elections', 'research_indicators']) assert.ok(ui.includes(param), param);
  assert.doesNotMatch(ui, /winner|predictive|probability of/i);
  assert.ok(new Set(links.map((l) => l.country)).size >= 2, 'links for Czechia and Poland reach every page');
});

const caseOf = (id, selection = {}, opts = {}) => R.runComparativeResearch(selection, elections, opts.points ?? points, links, { question: 'D', caseElectionId: id }).asOf;
const caseRow = (c, indicator) => c.rows.find((r) => r.indicator === indicator);
const caseView = (r, view) => r.views.find((v) => v.view === view);

test('Poland 2023 is the regression case: released, later, current and retrospective figures stay separate', () => {
  const c = caseOf(PL23);
  assert.deepEqual([c.electionDate, c.status, c.rows.length], ['2023-10-15', 'documented', 5]);
  const hicp = caseRow(c, 'hicp_inflation');
  assert.deepEqual([hicp.period, hicp.frequency, hicp.value, hicp.publishedOn, hicp.flashEstimate, hicp.current.value, hicp.revisionSinceRelease], ['2023-08', 'monthly', 9.5, '2023-09-19', false, 9.5, 0]);
  assert.deepEqual([caseView(hicp, 'last_complete_year').value, caseView(hicp, 'last_complete_year').period, caseView(hicp, 'last_complete_year').relation, caseView(hicp, 'last_complete_year').difference], [13.2, '2022', 'different_frequency', null], 'a monthly rate is never subtracted from an annual rate');
  assert.deepEqual([caseView(hicp, 'election_calendar_year').value, caseView(hicp, 'election_calendar_year').includesPostElectionMonths, caseView(hicp, 'election_calendar_year').difference], [10.9, true, null]);
  assert.deepEqual([caseView(hicp, 'last_complete_month').period, caseView(hicp, 'last_complete_month').relation, caseView(hicp, 'last_complete_month').difference], ['2023-09', 'different_period', null]);
  assert.ok(hicp.conditions.includes('last_month_not_documented_as_released'));
  const debt = caseRow(c, 'government_debt_gdp');
  assert.deepEqual([debt.value, debt.current.value, debt.revisionSinceRelease, debt.gate.status], [49.1, 48.8, -0.3, 'identical_measure']);
  assert.deepEqual(debt.laterReleases.map((l) => [l.publishedOn, l.value, l.afterPolling, l.changeFromReleased]), [['2023-10-23', 49.3, true, 0.2]]);
  assert.equal(caseRow(c, 'fiscal_balance_gdp').revisionSinceRelease, 0.3);
  const gdp = caseRow(c, 'real_gdp_growth');
  assert.deepEqual([gdp.value, gdp.frequency, gdp.gate.reason, gdp.current.value, gdp.revisionSinceRelease], [-1.4, 'quarterly', 'no_current_series_at_frequency', null, null]);
  assert.deepEqual([caseView(gdp, 'last_complete_year').value, caseView(gdp, 'last_complete_year').difference], [5.3, null]);
  assert.match(c.summary.en, /^5 of 5 figures .* 4 can be compared .* 2 of those have been revised/);
  for (const r of c.rows) { assert.ok(r.publishedOn < c.electionDate); assert.match(r.releaseSha256, /^[0-9a-f]{64}$/); assert.match(r.sourceUrl, /^https:\/\/ec\.europa\.eu\/eurostat\//); assert.ok(r.printedRow.startsWith('Poland')); assert.ok(r.conditions.length && r.computationRule); assert.ok(r.conditions.every((code) => R.AS_OF_CONDITIONS[code])); }
});

test('other pilots report their own evidence, and elections without dated releases stay not established', () => {
  const de = caseOf(DE25);
  assert.equal(de.status, 'documented');
  assert.ok(caseRow(de, 'fiscal_balance_gdp').conditions.includes('latest_published_year_older'));
  const sk = caseOf(SK);
  assert.ok(caseRow(sk, 'hicp_inflation').conditions.includes('flash_estimate'));
  assert.equal(caseRow(sk, 'hicp_inflation').period, '2023-09');
  assert.deepEqual(caseRow(sk, 'hicp_inflation').current.period, '2023-09');
  assert.equal(caseRow(sk, 'fiscal_balance_gdp').revisionSinceRelease, 0.4);
  const cz = caseOf(CZ25);
  assert.equal(cz.status, 'partly_documented');
  const un = caseRow(cz, 'unemployment_rate');
  assert.deepEqual([un.status, un.value, un.current.value, un.revisionSinceRelease, un.conditions[0]], ['not_established', null, null, null, 'last_release_not_located']);
  assert.equal(caseView(un, 'last_complete_month').value, 3, 'the current figure stays in its own view and is not used as the released figure');
  const old = caseOf(PL19);
  assert.equal(old.status, 'not_documented');
  assert.ok(old.rows.every((r) => r.status === 'not_established' && r.value === null && r.publishedOn === null && r.conditions[0] === 'first_release_dates_not_recorded'));
  assert.ok(old.rows.some((r) => caseView(r, 'last_complete_year').value !== null), 'retrospective figures remain visible');
  assert.equal(caseOf('el-does-not-exist'), null);
  assert.ok(caseOf(PL23).rows.every((r) => r.country === 'poland' && r.printedRow.startsWith('Poland')));
  assert.ok(caseOf(DE25).rows.every((r) => r.country === 'germany' && r.printedRow.startsWith('Germany')));
});

test('a revision needs one period, frequency, unit and definition; every failure blocks the subtraction with its own reason', () => {
  const alter = (series, period, change) => points.map((p) => (p.country === 'poland' && p.indicator === series && p.period === period ? { ...p, ...change } : p));
  const debt = (pts) => caseRow(caseOf(PL23, {}, { points: pts }), 'government_debt_gdp');
  const unit = debt(alter('government_debt_gdp', '2022', { unit: 'MIO_EUR' }));
  assert.deepEqual([unit.gate.reason, unit.revisionSinceRelease, unit.current.value, caseView(unit, 'last_complete_year').difference], ['unit_differs', null, null, null]);
  const def = debt(alter('government_debt_gdp', '2022', { definition: 'Eurostat une_rt_a', sourceUrl: 'https://ec.europa.eu/x' }));
  assert.deepEqual([def.gate.reason, def.revisionSinceRelease], ['definition_differs', null]);
  const gone = debt(points.filter((p) => !(p.country === 'poland' && p.indicator === 'government_debt_gdp' && p.period === '2022')));
  assert.deepEqual([gone.gate.reason, gone.revisionSinceRelease, gone.status, gone.value], ['current_value_not_held', null, 'documented', 49.1]);
  assert.equal(R.revisionGate('hicp_inflation', 'poland', { frequency: 'annual', period: '2022', unit: '%' }, points).gate.reason, 'frequency_differs');
  assert.equal(R.revisionGate('hicp_inflation', 'poland', null, points).gate.reason, 'release_not_documented');
  // Every released figure in every pilot: subtraction happens only for a same-period revision, and matches D2 exactly.
  const { electionMacroRows } = require('../../src/lib/electionMacroLinkage.ts');
  const d2 = electionMacroRows(elections, points);
  for (const r of run().d.released) {
    for (const v of r.versus) assert.equal(v.difference !== null, v.relation === 'same_period_revision', `${r.electionId} ${r.indicator} ${v.view}`);
    const a = d2.find((x) => x.electionId === r.electionId && x.indicator === r.indicator).publishedBeforeElection;
    if (a.status === 'documented') { assert.equal(r.revisionSinceRelease, a.revisionSinceRelease, 'D2 revision preserved'); assert.equal(r.currentValue, a.current.value); }
  }
  const row = (id, frequency, unitName, value) => ({ electionId: id, electionDate: id, indicator: 'hicp_inflation', status: 'documented', frequency, unit: unitName, value, versus: ['last_complete_year', 'election_calendar_year', 'last_complete_month'].map((view) => ({ view, value: null, frequency: null })) });
  const mixed = R.directionChecks([row('a', 'monthly', '%', 1), row('b', 'annual', '%', 2)], { indicators: ['hicp_inflation'] });
  assert.deepEqual([mixed.checks.length, mixed.spreads.length], [0, 0], 'released figures of different frequency are never differenced');
});

test('every question reports a result or a stated reason it is unavailable', () => {
  const status = (selection, q) => R.researchAvailability(run(selection))[q];
  assert.equal(status({}, 'A').status, 'partial');
  assert.equal(status({ countries: ['slovakia'] }, 'B').status, 'unavailable');
  assert.match(status({ countries: ['slovakia'] }, 'B').reason.en, /one admitted election/);
  assert.equal(status({ countries: ['slovakia'] }, 'C').status, 'unavailable');
  assert.equal(status({ countries: ['poland'] }, 'C').status, 'partial');
  assert.match(status({ countries: ['poland'] }, 'C').reason.en, /direction counts/);
  assert.equal(status({ countries: ['germany'] }, 'C').status, 'available');
  assert.equal(status({ view: 'released_before_election' }, 'B').status, 'unavailable');
  assert.match(status({ view: 'released_before_election' }, 'B').reason.en, /latest election/);
  assert.equal(status({ electionIds: [PL19] }, 'D').status, 'unavailable');
  assert.equal(status({ countries: ['czechia'] }, 'D').status, 'partial');
  assert.equal(status({ countries: ['poland'] }, 'D').status, 'available');
  for (const s of [{}, { countries: ['slovakia'] }, { electionIds: [] }, { indicators: [] }]) for (const q of R.RESEARCH_QUESTIONS) { const a = status(s, q); assert.ok(a.status === 'available' || (a.reason.en && a.reason.zh), `${q} ${JSON.stringify(s)}`); }
});

test('exports name the question, election, vintage, rule and comparability, and match the on-page calculation', () => {
  const results = R.runComparativeResearch({ countries: ['poland'] }, elections, points, links, { question: 'D', caseElectionId: PL23 });
  const pkg = R.researchEvidencePackage(results, elections);
  assert.equal(pkg.schema_version, R.RESEARCH_METHOD_VERSION);
  assert.equal(pkg.question, 'D');
  assert.equal(pkg.as_of_case.electionId, PL23);
  assert.ok(pkg.availability.D.status);
  const [header, ...lines] = R.researchCsv(results).replace('﻿', '').split('\n');
  const columns = header.split(',');
  for (const name of ['question', 'selected_question', 'election_id', 'election_date', 'indicator', 'observation_period', 'value', 'unit', 'source_url', 'published_on', 'vintage', 'computation_rule', 'comparability', 'reason']) assert.ok(columns.includes(name), name);
  const parse = (line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1]);
  const rows = lines.map(parse).map((cells) => { assert.equal(cells.length, columns.length); return Object.fromEntries(columns.map((c, i) => [c, cells[i]])); });
  assert.ok(rows.every((r) => r.selected_question === 'D' && r.question && r.computation_rule));
  const debt = rows.find((r) => r.record_type === 'as_of_case' && r.indicator === 'government_debt_gdp');
  assert.deepEqual([debt.election_id, debt.election_date, debt.observation_period, debt.value, debt.comparison_value, debt.difference, debt.published_on, debt.vintage], [PL23, '2023-10-15', '2022', '49.1', '48.8', '-0.3', '2023-04-21', 'dated_release; current_published']);
  assert.match(debt.source_url, /2-21042023/);
  assert.match(debt.note, /2023-10-23: 49\.3 \(after polling day\)/);
  assert.match(debt.comparability, /Same indicator, period, frequency, unit and definition/);
  const gdp = rows.find((r) => r.record_type === 'as_of_case' && r.indicator === 'real_gdp_growth');
  assert.deepEqual([gdp.difference, gdp.comparison_value, gdp.reason], ['', '', 'no_current_series_at_frequency']);
  for (const r of rows.filter((x) => x.record_type === 'as_of_case_view' || x.record_type === 'released_versus_view')) if (r.measure_key !== 'same_period_revision') assert.equal(r.difference, '', `${r.indicator} ${r.view}`);
  const hicpAnnual = rows.find((r) => r.record_type === 'released_versus_view' && r.indicator === 'hicp_inflation' && r.view === 'last_complete_year');
  assert.deepEqual([hicpAnnual.value, hicpAnnual.comparison_value, hicpAnnual.difference, hicpAnnual.measure_key], ['9.5', '13.2', '', 'different_frequency']);
  const none = R.researchCsv(R.runComparativeResearch({ countries: ['poland'] }, elections, points, links, { question: 'D', caseElectionId: PL19 }));
  assert.match(none, /"as_of_case","poland","el-pl-sejm-2019-10-13".*"not_established","first_release_dates_not_recorded"/);
  assert.equal(R.researchCsv(run()).split('\n')[1].includes('"A"'), true, 'the default question is A');
});
