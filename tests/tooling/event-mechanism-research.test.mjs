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
process.chdir(root);
const S = require('../../src/lib/eventMechanismResearch.server.ts');
const E = require('../../src/lib/eventMechanismResearch.ts');
const cases = require('../../src/lib/eventCaseStudies.ts');
const RD = require('../../src/lib/researchData.ts');
const M = require('../../src/lib/modelFramework.ts');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const records = S.eventMechanismRecords();
const CZ = 'cz-2023-10-16-repowereu-plan', HU = 'hu-2022-08-12-catl-debrecen';
const rec = (id) => records.find((r) => r.event_id === id);

test('A event: both reviewed cases, with date, country, deciding institution and the kind of primary source', () => {
  assert.deepEqual(records.map((r) => r.event_id).sort(), [CZ, HU]);
  for (const r of records) {
    const event = RD.researchEvents.find((e) => e.event_id === r.event_id);
    assert.equal(r.event.date, event.date, 'the frozen event record is used unchanged');
    assert.equal(r.event.country, event.country_slug);
    assert.match(r.event.responsible.primary_source_url, /^https:\/\//);
    assert.ok(r.event.milestones.every((m) => /^https:\/\//.test(m.source_url)));
  }
  assert.equal(rec(CZ).event.responsible.kind, 'eu_institutions');
  assert.equal(rec(CZ).event.responsible.primary_source_kind, 'official_eu_publication');
  assert.match(rec(CZ).event.dateNote.en, /17 October 2023/);
  assert.equal(rec(HU).event.responsible.kind, 'private_company');
  assert.equal(rec(HU).event.responsible.primary_source_kind, 'company_statement');
  assert.deepEqual(rec(HU).event.stagesDocumented, ['announcement', 'legal_adoption', 'implementation'], 'the gazette decree and county permit document approval; the county office documents the first-phase occupancy permit; no outcome is officially documented');
});

test('B and D: documented, hypothetical and unsupported links stay apart; later conditions are not documented', () => {
  for (const r of records) {
    const study = cases.getEventCaseStudy(r.event_id);
    const of = (basis) => study.chain.filter((l) => l.basis === basis).map((l) => l.step.en);
    assert.deepEqual(r.assessment.hypotheses.map((x) => x.en), of('research_hypothesis'));
    assert.deepEqual(r.assessment.unsupported.map((x) => x.en), of('unsupported_connection'));
    for (const h of r.assessment.hypotheses) assert.ok(!r.assessment.documented.some((d) => d.en === h.en), 'a hypothesis is never listed as documented');
    assert.ok(r.assessment.causalityRequirements.length >= 3);
    assert.ok(r.mechanism.conditions.some((c) => c.status === 'not_documented'));
  }
  assert.deepEqual(rec(CZ).mechanism.conditions.map((c) => c.status), ['documented', 'documented', 'not_documented', 'not_documented']);
  assert.deepEqual(rec(HU).mechanism.conditions.map((c) => c.status), ['documented', 'not_documented', 'not_documented', 'not_documented']);
});

test('C indicators: published national annual values exactly as stored, current vintage only, monthly window only where linked', () => {
  for (const r of records) for (const a of r.indicators.annual) {
    const stored = RD.getCountryObservations(r.event.country, a.indicatorId);
    for (const o of a.observations) { const s = stored.find((x) => x.id === o.observationId); assert.ok(s); if (o.value !== null) assert.equal(o.value, s.value); assert.equal(o.sourceUrl,s.source_url); assert.equal(o.updatedAt,s.updated_at); }
    assert.equal(a.vintage, 'current_published_only');
    assert.equal(a.geography, r.event.country, 'national scope; no subnational module');
  }
  assert.deepEqual(rec(CZ).indicators.annual.map((a) => a.indicatorId), ['energy_import_dependency']);
  assert.deepEqual(rec(HU).indicators.annual.map((a) => a.indicatorId), ['fdi_inflow', 'manufacturing_share_gdp', 'automotive_export_share']);
  assert.equal(rec(CZ).indicators.monthly.outcome, 'hicp_energy_annual_rate:yoy_rate');
  assert.equal(rec(HU).indicators.monthly, null);
  const index=E.eventMechanismSources(records).index;
  for(const r of records)for(const a of r.indicators.annual)for(const o of a.observations.filter(o=>o.value!==null))assert.equal(index.find(s=>s.id===`observation:${o.observationId}`).url,o.sourceUrl,'each year retains its own registered source query, not the latest year');
  assert.match(rec(HU).indicators.monthlyBlocker.en, /no explained monthly indicator link/);
  for (const r of records) assert.ok(r.indicators.missing.some((m) => /vintages/.test(m.en)));
});

test('political context: each event sits inside one admitted election pair, with the D4 changes as contemporaneous context', () => {
  const cz = rec(CZ).political.interval, hu = rec(HU).political.interval;
  assert.deepEqual([cz.fromElection, cz.toElection, cz.monthsAfterFrom, cz.monthsBeforeTo], ['el-cz-ps-2021-10-08', 'el-cz-ps-2025-10-03', 24, 24]);
  assert.deepEqual([hu.fromElection, hu.toElection, hu.monthsAfterFrom, hu.monthsBeforeTo], ['el-hu-ogy-2022-04-03', 'el-hu-ogy-2026-04-12', 4, 44]);
  assert.ok(Math.abs(cz.turnoutChange - 3.52) < 1e-6); assert.ok(Math.abs(hu.turnoutChange - 9.400405) < 1e-6);
  assert.equal(hu.verifiedListMovement, null); assert.equal(hu.identityBasis, 'none');
  assert.equal(cz.studyPath, '/politics/czechia/?research_study=d4');
  for (const r of records) assert.ok(r.assessment.contemporaneous.some((c) => /months after the .* election/.test(c.en)));
  assert.ok(records.every((r) => r.political.interval.electionSources.length >= 2 && r.political.interval.electionSources.every((s) => /^https:\/\//.test(s.url))));
});

test('models: the models\' own outputs from 2021, never reconstructed, described as context only', () => {
  const countries = read('src/data/countries/countries.json').records;
  for (const r of records) for (const m of r.political.models) {
    assert.equal(m.years[0].year, 2021);
    for (const y of m.years) assert.equal(y.score, M.calculateModelOutputForYear(countries.find((c) => c.slug === r.event.country), M.modelCards.find((c) => c.model_id === m.modelId), y.year).score);
  }
  const fiscal = rec(HU).political.models.find((m) => m.modelId === 'fiscal_pressure').years.map((y) => [y.year, y.score]);
  assert.deepEqual(fiscal, [[2021, 70.6], [2022, 64.8], [2023, 68.3], [2024, 58.9], [2025, 57.6]]);
  assert.equal(rec(CZ).political.interval.models.find((m) => m.modelId === 'fiscal_pressure').status, 'unavailable', '2020 has no model inputs');
  for (const r of records) assert.ok(r.assessment.contemporaneous.filter((c) => /pressure index/.test(c.en)).every((c) => /does not measure the event or voting intention/.test(c.en)));
});

test('E comparison: fixed dimensions, described differences, no identification strategy, no causal or ranking language', () => {
  const { rows, findings } = E.compareEventMechanisms(records);
  assert.equal(rows.length, 16);
  assert.deepEqual(Object.values(rows.find((r) => r.key === 'identification').values), ['none: no effect is estimated', 'none: no effect is estimated']);
  assert.deepEqual(rows.find((r) => r.key === 'conditions').values, { [CZ]: '2 of 4', [HU]: '1 of 4' });
  const text = [...findings.flatMap((f) => [f.en, f.zh]), ...records.flatMap((r) => r.assessment.contemporaneous.map((c) => c.en))].join(' ');
  assert.doesNotMatch(text, /caused|led to|boosted|resulted in|impact of|predict|forecast|rank|导致|预测|排名/i);
  assert.match(findings[0].en, /neither documents that the mechanism's later conditions were met/);
});

test('export: same bytes in any order, every record traced to a shared source index, window from the engine only', () => {
  const w = { outcome: 'hicp_energy_annual_rate:yoy_rate', gate: 'full', eventPeriod: '2023-10', preMean: 1, eventValue: 1, postMean: 1, change: 0, pre: 12, post: 12, missing: [], definition: 'x', traceIds: ['b', 'a'], comparison: null, external: null, sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table' };
  const a = JSON.stringify(E.eventMechanismEvidence(records, { [CZ]: w })), b = JSON.stringify(E.eventMechanismEvidence([...records].reverse(), { [CZ]: w }));
  assert.equal(a, b);
  assert.equal(E.eventMechanismCsv(records, { [CZ]: w }), E.eventMechanismCsv([...records].reverse(), { [CZ]: w }));
  const ev = JSON.parse(a);
  assert.equal(ev.effect_estimated, false);
  const ids = new Set(ev.source_index.index.map((x) => x.id));
  assert.ok(ev.source_index.index.every((x) => x.url && /^https:\/\//.test(x.url)));
  const parse = (line) => line.match(/"((?:[^"]|"")*)"/g).map((x) => x.slice(1, -1).replace(/""/g, '"'));
  const lines = E.eventMechanismCsv(records, { [CZ]: w }).replace(/^\uFEFF/, '').split('\n');
  assert.equal(lines[0], 'record_type,event_id,part,item,period,value,status,basis,note,source_refs,method_version');
  const rows = lines.slice(1).map(parse);
  for (const r of rows) { assert.equal(r.length, 11); assert.equal(r[10], E.EVENT_MECHANISM_METHOD); for (const id of r[9].split('; ').filter(Boolean)) assert.ok(ids.has(id), `${r[0]} ${id}`); }
  for (const t of ['annual_observation', 'milestone', 'model_score', 'election_interval']) assert.ok(rows.filter((r) => r[0] === t && r[5] !== '').every((r) => r[9]), `${t} rows name their sources`);
  assert.equal(rows.filter((r) => r[0] === 'monthly_window' && r[1] === CZ)[0][6], 'full');
  assert.equal(rows.filter((r) => r[0] === 'monthly_window' && r[1] === HU)[0][6], 'not_shown');
});

test('frozen inputs stay frozen: the event registry and window engine are only read', () => {
  const pins = read('src/data/analysis/v173_frozen_output_hashes.json');
  const sha = (f) => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
  const pinned = pins.records.filter((x) => /events\/events\.json$|eventWindowEngine\.ts$/.test(x.path));
  assert.equal(pinned.length, 2);
  for (const x of pinned) assert.equal(sha(x.path), x.sha256, x.path);
});
