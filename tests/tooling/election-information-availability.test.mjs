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
const { electionMacroRows, electionMacroCoverage, electionMacroCsv, publishedBeforeElection, electionSourceCitations, electionCountryRoute, ELECTION_MACRO_INDICATORS } = require('../../src/lib/electionMacroLinkage.ts');
const evidence = read('src/lib/electionInformationEvidence.json');
const inputs = context.politicalContextData('germany');
const annual = read('public/research-data/annual_history_runtime.json'), monthly = read('public/research-data/monthly_history_runtime.json'), current = read('public/research-data/high_frequency_runtime.json');
const points = [...contextAnnualPoints(inputs.observations, annual, inputs.indicators), ...contextMonthlyPoints(monthly, current.records, inputs.monthlyMetadata)];
const elections = [...data.politicalElectionViews(), ...data.politicalComparisonCountries().flatMap((c) => c.elections)];
const rows = electionMacroRows(elections, points);
const SK = 'el-sk-nrsr-2023-09-30', PL = 'el-pl-sejm-2023-10-15', CZ = 'el-cz-ps-2025-10-03', DE = 'el-de-bt-2025-02-23';
const asOf = (id, indicator) => rows.find((r) => r.electionId === id && r.indicator === indicator).publishedBeforeElection;
const election = (id) => elections.find((e) => e.electionId === id);

test('coverage: 19 of 20 pilot figures documented; Czech unemployment stays not established', () => {
  const documented = rows.filter((r) => r.publishedBeforeElection.status === 'documented');
  assert.equal(documented.length, 19);
  assert.deepEqual([...new Set(documented.map((r) => r.electionId))].sort(), [CZ, DE, PL, SK].sort());
  assert.deepEqual(Object.fromEntries(electionMacroCoverage(rows).map((c) => [c.indicator, c.publishedBeforeElection])), { hicp_inflation: 4, real_gdp_growth: 4, unemployment_rate: 3, fiscal_balance_gdp: 4, government_debt_gdp: 4 });
  const missing = asOf(CZ, 'unemployment_rate');
  assert.equal(missing.status, 'not_established');
  assert.equal(missing.reason, 'last_release_not_located');
  assert.ok(!('value' in missing), 'no value is filled from current data');
});

test('release dates before and after polling day: only earlier releases count', () => {
  for (const r of rows) { const a = r.publishedBeforeElection; if (a.status === 'documented') assert.ok(a.publishedOn < r.electionDate, r.electionId); }
  assert.equal(asOf(SK, 'hicp_inflation').period, '2023-09', 'flash of 29 September is before the 30 September vote');
  assert.equal(asOf(SK, 'hicp_inflation').publishedOn, '2023-09-29');
  assert.equal(asOf(SK, 'hicp_inflation').flashEstimate, true);
  assert.equal(asOf(SK, 'hicp_inflation').value, 8.9);
  assert.equal(asOf(SK, 'unemployment_rate').period, '2023-07', 'the release of 2 October is after the Slovak vote');
  assert.equal(asOf(PL, 'unemployment_rate').period, '2023-08', 'the same release is before the Polish vote');
  assert.equal(asOf(DE, 'hicp_inflation').publishedOn, '2025-02-03', 'the final release of 24 February is after the vote');
  assert.equal(asOf(DE, 'hicp_inflation').flashEstimate, true);
  assert.deepEqual(asOf(DE, 'hicp_inflation').laterReleases.map((l) => l.publishedOn), ['2025-02-24']);
  assert.equal(asOf(PL, 'fiscal_balance_gdp').publishedOn, '2023-04-21', 'the release of 23 October is after the vote');
  assert.equal(asOf(CZ, 'fiscal_balance_gdp').publishedOn, '2025-04-22');
  const onDay = publishedBeforeElection({ electionId: SK, country: 'slovakia', date: '2023-09-29' }, 'hicp_inflation', points);
  assert.equal(onDay.period, '2023-08', 'a release on polling day itself is not before it');
});

test('values at the time, later releases and current values stay distinct', () => {
  const sk = asOf(SK, 'fiscal_balance_gdp');
  assert.deepEqual([sk.value, sk.current.value, sk.revisionSinceRelease], [-2, -1.6, 0.4]);
  const pl = asOf(PL, 'government_debt_gdp');
  assert.deepEqual([pl.value, pl.laterReleases[0].value, pl.current.value], [49.1, 49.3, 48.8]);
  const cz = asOf(CZ, 'fiscal_balance_gdp');
  assert.deepEqual([cz.value, cz.laterReleases[0].value, cz.current.value], [-2.2, -2, -2]);
  assert.deepEqual([asOf(CZ, 'hicp_inflation').value, asOf(CZ, 'hicp_inflation').current.value], [2.4, 2.3]);
  assert.deepEqual([asOf(DE, 'unemployment_rate').value, asOf(DE, 'unemployment_rate').current.value], [3.4, 3.5]);
  assert.deepEqual([asOf(DE, 'government_debt_gdp').value, asOf(DE, 'government_debt_gdp').current.value], [62.9, 62.3]);
});

test('missing current or original values are never backfilled', () => {
  for (const id of [SK, PL, CZ, DE]) {
    const gdp = asOf(id, 'real_gdp_growth');
    assert.equal(gdp.current.status, 'not_held', 'the Atlas holds no quarterly GDP series');
    assert.equal(gdp.current.value, null);
    assert.equal(gdp.revisionSinceRelease, null);
  }
  const noPoints = publishedBeforeElection({ electionId: SK, country: 'slovakia', date: '2023-09-30' }, 'fiscal_balance_gdp', []);
  assert.equal(noPoints.value, -2);
  assert.equal(noPoints.current.value, null);
  assert.equal(noPoints.revisionSinceRelease, null);
  const fake = [{ id: 'x', country: 'czechia', indicator: 'unemployment_rate_monthly', frequency: 'monthly', period: '2025-08', value: 9, unit: 'PC_ACT', status: 'official', source: 's', sourceUrl: 'https://x.test', definition: 'd', comparable: true, layer: 'l' }];
  assert.equal(publishedBeforeElection(election(CZ), 'unemployment_rate', fake).status, 'not_established', 'a current figure cannot create an as-of value');
  assert.equal(publishedBeforeElection({ electionId: 'el-de-bt-2021-09-26', country: 'germany', date: '2021-09-26' }, 'hicp_inflation', points).status, 'not_established');
});

test('evidence: each value is in its printed row at the named column, dates match release ids, official host only', () => {
  assert.equal(Object.keys(evidence.releases).length, 18);
  for (const o of evidence.observations) {
    const cells = o.printed_row.match(/-?\d+\.\d+[a-z]?/g);
    assert.equal(Number(cells[o.column].replace(/[a-z]$/, '')), o.value, o.printed_row);
    assert.equal(/e$/.test(cells[o.column]), o.flash_estimate, o.printed_row);
    assert.ok(evidence.releases[o.release], o.release);
  }
  for (const [id, r] of Object.entries(evidence.releases)) {
    const m = id.match(/^\d-(\d{2})(\d{2})(\d{4})/);
    assert.equal(r.published_on, `${m[3]}-${m[2]}-${m[1]}`);
    assert.match(r.url, /^https:\/\/ec\.europa\.eu\/eurostat\//);
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
  }
  const debt = evidence.observations.filter((o) => o.indicator === 'government_debt_gdp');
  assert.ok(debt.every((o) => /Government debt \(% of GDP\)/.test(o.printed_row)), 'debt is never read from another % of GDP row');
  assert.ok(evidence.limits.some((l) => /not a proven first publication/.test(l)));
});

test('country-specific attribution: no election cites another country authority', () => {
  const expected = { germany: /Bundeswahlleiterin|Bundesverfassungsgericht|Bundes/, czechia: /Český statistický úřad|Ministerstvo vnitra/, poland: /Państwowa Komisja Wyborcza|Sejm RP|Sąd Najwyższy/, slovakia: /Štátna komisia|Slov-Lex/ };
  for (const e of elections) for (const c of electionSourceCitations([e])) {
    assert.notEqual(c.institution, 'Institution not recorded', c.code);
    if (e.country !== 'germany') assert.doesNotMatch(c.institution, /Bundeswahlleiterin/, c.code);
    assert.ok(c.url, c.code);
  }
  for (const [country, re] of Object.entries(expected)) { const e = elections.find((x) => x.country === country); assert.ok(electionSourceCitations([e]).some((c) => re.test(c.institution)), country); }
  const code = fs.readFileSync(path.join(root, 'src/components/PoliticalEconomicContext.tsx'), 'utf8');
  assert.doesNotMatch(code, /Bundeswahlleiterin/, 'the context draft no longer hardcodes an authority');
  assert.equal(electionCountryRoute('slovakia'), '/politics/slovakia/');
  assert.equal(electionCountryRoute('germany'), '/politics/');
  for (const name of ['PoliticalEconomicContext', 'PoliticalExplorerAlpha']) assert.match(fs.readFileSync(path.join(root, `src/components/${name}.tsx`), 'utf8'), /electionCountryRoute/);
});

test('export provenance: as-of, revision and election source fields travel with each row', () => {
  const csv = electionMacroCsv(rows);
  const [header, ...lines] = csv.replace('﻿', '').split('\n');
  const columns = header.split(',');
  for (const f of ['election_source_institutions', 'election_source_urls', 'as_of_period', 'as_of_publication_date', 'as_of_earliest_located_release', 'as_of_value', 'as_of_flash_estimate', 'as_of_source_url', 'as_of_release_sha256', 'as_of_later_releases', 'as_of_current_value', 'as_of_revision_since_release', 'as_of_not_established_reason']) assert.ok(columns.includes(f), f);
  const parse = (line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1]);
  const pick = (id, indicator) => { const c = parse(lines.find((l) => l.includes(`"${id}"`) && l.includes(`"${indicator}"`))); return Object.fromEntries(header.split(',').map((k, i) => [k, c[i]])); };
  const sk = pick(SK, 'fiscal_balance_gdp');
  assert.equal(sk.as_of_publication_date, '2023-04-21');
  assert.equal(sk.as_of_value, '-2');
  assert.equal(sk.as_of_current_value, '-1.6');
  assert.equal(sk.as_of_revision_since_release, '0.4');
  assert.match(sk.election_source_institutions, /Štátna komisia/);
  assert.doesNotMatch(sk.election_source_institutions, /Bundeswahlleiterin/);
  assert.match(pick(PL, 'hicp_inflation').election_source_institutions, /Państwowa Komisja Wyborcza/);
  assert.match(pick(CZ, 'hicp_inflation').election_source_institutions, /Český statistický úřad/);
  assert.match(pick(DE, 'hicp_inflation').election_source_institutions, /Bundeswahlleiterin/);
  const missing = pick(CZ, 'unemployment_rate');
  assert.equal(missing.as_of_value, '');
  assert.equal(missing.as_of_not_established_reason, 'last_release_not_located');
});

test('D1 results are preserved: annual views still use current figures and are not replaced by as-of values', () => {
  assert.deepEqual(Object.fromEntries(electionMacroCoverage(rows).map((c) => [c.indicator, [c.lastCompleteYear, c.retrospective]])), { hicp_inflation: [15, 15], real_gdp_growth: [9, 10], unemployment_rate: [4, 6], fiscal_balance_gdp: [15, 15], government_debt_gdp: [15, 15] });
  const row = (id, ind) => rows.find((r) => r.electionId === id && r.indicator === ind);
  assert.equal(row(SK, 'fiscal_balance_gdp').lastCompleteYear.value, -1.6, 'the D1 view keeps the current figure');
  assert.equal(row(SK, 'hicp_inflation').lastCompleteYear.value, 12.1);
  assert.equal(row(PL, 'hicp_inflation').lastCompleteYear.value, 13.2);
  assert.equal(rows.length, 75);
  assert.deepEqual(ELECTION_MACRO_INDICATORS.length, 5);
});
