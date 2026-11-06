import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
process.chdir(root);
const I = require('../../src/lib/eventImplementationEvidence.ts');
const S = require('../../src/lib/eventMechanismResearch.server.ts');
const E = require('../../src/lib/eventMechanismResearch.ts');
const RD = require('../../src/lib/researchData.ts');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const CZ = 'cz-2023-10-16-repowereu-plan', HU = 'hu-2022-08-12-catl-debrecen';
const records = S.eventMechanismRecords();
const rec = (id) => records.find((r) => r.event_id === id);
const all = I.implementationEvidence;
const byId = (id) => all.find((m) => m.id === id);
const clone = () => JSON.parse(JSON.stringify(all));

test('the evidence passes its own rules, and each rule rejects a violating record', () => {
  assert.deepEqual(I.validateImplementationEvidence(), []);
  const broken = (mutate, pattern) => { const list = clone(); mutate(list); assert.ok(I.validateImplementationEvidence(list).some((e) => pattern.test(e)), String(pattern)); };
  broken((l) => l.push({ ...l[0] }), /duplicate id/);
  broken((l) => l.push({ ...l[0], id: 'cz-e2-99-copy' }), /duplicate milestone/);
  broken((l) => { l.find((m) => m.id === 'hu-e2-11-trial-production').status = 'verified'; }, /company statement is announced, never verified/);
  broken((l) => { l.find((m) => m.id === 'hu-e2-01-announcement').amounts[0].kind = 'paid'; }, /payment must come from an official document/);
  broken((l) => { l.find((m) => m.id === 'cz-e2-13-payment-2026-03').event_date = '2026-04-01'; }, /event dated after its source was published/);
  broken((l) => { l.find((m) => m.id === 'cz-e2-16-outcome-unavailable').url = 'https://example.org/x'; }, /unavailable claim carries no document/);
  broken((l) => { l.find((m) => m.id === 'cz-e2-07-grid-milestone-suspended').amounts[0].value = 97629788.5; }, /bad amount/);
  broken((l) => { l.find((m) => m.id === 'cz-e2-05-repowereu-prefinancing').event_date = '2023-01-01'; l.find((m) => m.id === 'cz-e2-05-repowereu-prefinancing').publication_date = '2023-01-01'; }, /implementation precedes announcement/);
  broken((l) => { l.find((m) => m.id === 'hu-e2-10-module-output').quantities[0].kind = 'company_reported_output'; l.find((m) => m.id === 'hu-e2-10-module-output').document_kind = 'national_gazette'; }, /company-reported output must cite the company/);
});

test('stage chronology: records are ordered by date, and each case moves from announcement to approval to implementation', () => {
  for (const r of records) {
    const keys = r.implementation.milestones.map(I.chronologyKey);
    assert.deepEqual(keys, [...keys].sort(), `${r.event_id} chronology is sorted`);
    const first = (stage) => r.implementation.milestones.filter((m) => m.stage === stage && m.event_date).map((m) => m.event_date).sort()[0];
    assert.ok(first('announcement') <= first('approval') && first('approval') <= first('implementation'), r.event_id);
  }
  assert.equal(rec(CZ).implementation.milestones[0].stage, 'approval', 'the undated Council annex sorts by its publication year');
  assert.deepEqual(rec(CZ).implementation.milestones.filter((m) => m.event_date).map((m) => m.event_date).slice(0, 3), ['2023-06-30', '2023-09-26', '2023-10-17']);
  assert.equal(byId('hu-e2-02-priority-decree').event_date, '2022-08-19', 'the decree enters into force the day after promulgation');
});

test('documentary status per stage: verified needs an official record; a company statement stays announced; outcomes are not inferred', () => {
  const status = (id) => Object.fromEntries(rec(id).implementation.stages.map((s) => [s.stage, s.status]));
  assert.deepEqual(status(CZ), { announcement: 'verified', approval: 'verified', implementation: 'verified', realized_outcome: 'unavailable' });
  assert.deepEqual(status(HU), { announcement: 'announced', approval: 'verified', implementation: 'announced', realized_outcome: 'announced' });
  for (const m of all) {
    if (m.status === 'verified') assert.ok(I.isOfficial(m.document_kind) && /^https:\/\//.test(m.url), m.id);
    if (m.document_kind === 'company_statement') assert.equal(m.status, 'announced', m.id);
  }
  assert.ok(!all.some((m) => m.stage === 'realized_outcome' && m.status === 'verified'), 'neither case has an official record of a realised outcome');
  assert.equal(rec(HU).implementation.stages.find((s) => s.stage === 'approval').disputed, 1, 'the litigated permits stay visible as disputed');
  for (const id of ['cz-e2-16-outcome-unavailable', 'hu-e2-07-support-unavailable', 'hu-e2-09-capital-unavailable', 'hu-e2-12-outcomes-unavailable']) {
    const m = byId(id); assert.equal(m.status, 'unavailable'); assert.equal(m.url, null); assert.deepEqual([m.amounts, m.quantities], [[], []]);
  }
});

test('source identity: each record names its institution, reference, publication and retrieval date; PDFs carry their SHA-256', () => {
  const hosts = new Set();
  for (const m of all) {
    assert.ok(m.institution.en && m.institution.zh && m.document_ref, m.id);
    assert.equal(m.retrieved, '2026-11-06');
    if (m.url) { hosts.add(new URL(m.url).hostname); assert.notEqual(m.document_kind, 'none_located'); }
    if (/\.pdf|letoltes|\/pdf$/.test(m.url ?? '')) assert.match(m.document_sha256 ?? '', /^[0-9a-f]{64}$/, `${m.id} PDF hash`);
  }
  assert.deepEqual([...hosts].sort(), ['commission.europa.eu', 'data.consilium.europa.eu', 'ec.europa.eu', 'kormanyhivatalok.hu', 'kyodonewsprwire.jp', 'magyarkozlony.hu', 'reforms-investments.ec.europa.eu', 'www.catl.com']);
  for (const blocked of ['valasztas.hu', 'statistics.sk', 'bmi.gv.at', 'api.sejm.gov.pl']) assert.ok(![...hosts].some((h) => h.endsWith(blocked)), blocked);
  // The same gazette issue backs two acts; the same permit decision backs two claims. Each act is a separate record.
  assert.equal(byId('hu-e2-02-priority-decree').document_sha256, byId('hu-e2-03-grid-budget').document_sha256);
  assert.match(byId('hu-e2-02-priority-decree').claim.en, /does not name the investor/);
  assert.match(byId('cz-e2-04-chapter-content').claim.en, /milestone 304.*component 7\.1/);
  const index = E.eventMechanismSources(records).index;
  for (const m of all.filter((x) => x.url)) assert.equal(index.find((s) => s.id === `document:${m.id}`).url, m.url, m.id);
});

test('monetary units: currency, exactness and kind are explicit; plans and payments are never mixed or summed', () => {
  const amounts = all.flatMap((m) => m.amounts.map((a) => ({ ...a, id: m.id, scope: m.scope })));
  assert.ok(amounts.every((a) => ['EUR', 'HUF'].includes(a.currency) && a.value > 0 && (a.precision !== 'exact' || Number.isInteger(a.value))));
  assert.deepEqual([...new Set(amounts.filter((a) => a.currency === 'HUF').map((a) => a.id))], ['hu-e2-03-grid-budget'], 'forint amounts only where the gazette states forint');
  assert.deepEqual(amounts.filter((a) => a.kind === 'announced_investment').map((a) => [a.id, a.value]), [['hu-e2-01-announcement', 7_340_000_000]]);
  assert.ok(!amounts.some((a) => a.kind === 'paid' && a.id.startsWith('hu-')), 'no payment is recorded for the CATL plant');
  const paid = amounts.filter((a) => a.kind === 'paid');
  assert.deepEqual(paid.map((a) => [a.id, a.scope]), [['cz-e2-05-repowereu-prefinancing', 'event_specific'], ['cz-e2-09-payment-2025-09', 'whole_plan'], ['cz-e2-09-payment-2025-09', 'whole_plan'], ['cz-e2-13-payment-2026-03', 'whole_plan'], ['cz-e2-15-payment-2026-08', 'whole_plan']]);
  const suspended = amounts.find((a) => a.id === 'cz-e2-07-grid-milestone-suspended'), lifted = amounts.find((a) => a.id === 'cz-e2-10-grid-milestone-fulfilled');
  assert.deepEqual([suspended.kind, lifted.kind, suspended.value === lifted.value, suspended.currency], ['suspended', 'suspension_lifted', true, 'EUR']);
  const cmp = E.compareEventMechanisms(records).rows.find((r) => r.key === 'implementation_money');
  assert.equal(cmp.values[CZ], 'paid: 1 event-specific, 4 whole-plan; authorised/budgeted: 10; announced only: 0');
  assert.doesNotMatch(Object.values(cmp.values).join(' '), /€|EUR \d|HUF \d|total/, 'the comparison counts amounts and never adds them');
  // Capacities keep their kind: announced 100 GWh is not the permitted 40 GWh and neither is output.
  const q = all.flatMap((m) => m.quantities.map((x) => [m.id, x.kind, x.value, x.unit]));
  assert.deepEqual(q.filter((x) => x[3] === 'GWh_per_year'), [['hu-e2-01-announcement', 'announced_capacity', 100, 'GWh_per_year'], ['hu-e2-05-permit-modified', 'permitted_capacity', 40, 'GWh_per_year'], ['hu-e2-11-trial-production', 'announced_capacity', 100, 'GWh_per_year']]);
});

test('observation links: national scope, current vintage, timing computed from stored years, definitions checked', () => {
  const link = (id, ind) => rec(id).implementation.links.find((l) => l.indicatorId === ind);
  for (const r of records) for (const l of r.implementation.links) {
    const a = r.indicators.annual.find((x) => x.indicatorId === l.indicatorId);
    assert.equal(l.latestPublishedYear, a.latestPublishedYear);
    assert.equal(l.vintage, 'current_published_only', 'no historical vintage is claimed');
    assert.equal(l.geography, 'national_total');
    assert.ok(['context_only', 'not_comparable'].includes(l.use), 'no link is used to attribute a change');
    for (const o of a.observations.filter((x) => x.value !== null)) assert.equal(o.value, RD.getCountryObservations(r.event.country, l.indicatorId).find((x) => x.id === o.observationId).value);
  }
  assert.deepEqual([link(CZ, 'energy_import_dependency').timing, link(CZ, 'energy_import_dependency').anchorYear], ['no_published_year_after_anchor', 2025]);
  assert.equal(link(HU, 'automotive_export_share').use, 'not_comparable', 'battery manufacturing (C27) is outside NACE C29');
  assert.equal(link(HU, 'manufacturing_share_gdp').measurement, 'classification_compatible');
  assert.equal(link(HU, 'fdi_inflow').timing, 'anchor_undated', 'no dated capital flow exists to align with');
  assert.equal(rec(CZ).implementation.unresolved.length, 4); assert.equal(rec(HU).implementation.unresolved.length, 4);
});

test('export: reproducible bytes, every implementation reference resolves, E1 windows and frozen inputs unchanged', () => {
  const w = { outcome: 'hicp_energy_annual_rate:yoy_rate', gate: 'full', eventPeriod: '2023-10', preMean: 1, eventValue: 1, postMean: 1, change: 0, pre: 12, post: 12, missing: [], definition: 'x', traceIds: ['a'], comparison: null, external: null, sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table' };
  const a = E.eventMechanismCsv(records, { [CZ]: w }), b = E.eventMechanismCsv([...records].reverse(), { [CZ]: w });
  assert.equal(a, b);
  const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
  assert.equal(sha(JSON.stringify(E.eventMechanismEvidence(records, { [CZ]: w }))), sha(JSON.stringify(E.eventMechanismEvidence([...records].reverse(), { [CZ]: w }))));
  const ev = E.eventMechanismEvidence(records, { [CZ]: w });
  assert.equal(ev.schema_version, 'atlas-event-mechanism-research-v2');
  const ids = new Set(ev.source_index.index.map((s) => s.id));
  for (const ref of ev.source_index.refs) for (const id of ref.implementation) assert.ok(ids.has(id), id);
  const lines = a.replace(/^﻿/, '').split('\n').slice(1);
  const typed = (t) => lines.filter((l) => l.startsWith(`"${t}"`));
  assert.equal(typed('implementation_milestone').length, all.length);
  assert.equal(typed('implementation_stage').length, 8);
  assert.equal(typed('unresolved_claim').length, 8);
  assert.ok(typed('implementation_milestone').every((l) => /"document:[a-z0-9-]+"|,"","atlas-event/.test(l)));
  assert.ok(typed('implementation_stage').every((l) => l.includes('documentary evidence status, not a performance score')));
  assert.equal(ev.windows[CZ].gate, 'full'); assert.equal(ev.windows[HU], null);
  assert.equal(rec(CZ).indicators.monthly.outcome, 'hicp_energy_annual_rate:yoy_rate', 'the E1 window definition is unchanged');
  const pins = read('src/data/analysis/v173_frozen_output_hashes.json').records.filter((x) => /events\/events\.json$|eventWindowEngine\.ts$/.test(x.path));
  for (const x of pins) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, x.path))).digest('hex'), x.sha256, x.path);
  const text = [...all.flatMap((m) => [m.claim.en, m.note?.en ?? '']), ...Object.values(I.unresolvedImplementationClaims).flat().map((u) => u.en)].join(' ');
  assert.doesNotMatch(text, /caused|led to|boosted|resulted in|impact of|predict|forecast|\brank/i);
});
