import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from '../../scripts/research-themes/build-research-themes.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const dir = path.join(root, 'src/lib/research-themes');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const clean = build();

test('authored thematic records validate and the derived outputs are current', () => {
  assert.deepEqual(clean.errors, []);
  execFileSync(process.execPath, ['scripts/research-themes/build-research-themes.mjs', '--check'], { cwd: root, stdio: 'pipe' });
});

test('four themes, every event mapped once, ids stable and bilingual', () => {
  const { themes } = load('themes.json');
  assert.deepEqual(themes.map((t) => t.theme_id), ['industrial_policy_strategic_investment', 'fdi_production_networks', 'energy_dependency_transition', 'eu_funding_development']);
  const ids = clean.index.mappings.map((m) => m.event_id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 80, `expected a substantial batch, got ${ids.length}`);
  for (const m of clean.index.mappings) for (const r of m.indicators) { assert.ok(r.connection.en && r.connection.zh); assert.ok(['A', 'B', 'C', 'D', 'E'].includes(r.relationship)); }
});

test('an A–C link without observations for the country is rejected', () => {
  const doc = load('event_mappings.json');
  const m = doc.records.find((r) => r.event_id === 'pl-2026-08-20-industrial-output');
  m.indicators[0].country = 'serbia';
  m.indicators[0].layers = ['historical_monthly'];
  assert.ok(build({ 'event_mappings.json': doc }).errors.some((e) => e.includes('without observations')));
});

test('a mapping cannot contradict an existing event-analysis basis without a cited implementation finding', () => {
  const doc = load('event_mappings.json');
  const m = doc.records.find((r) => r.event_id === 'cz-2023-10-16-repowereu-plan');
  m.indicators.find((r) => r.indicator_id === 'manufacturing_share_gdp').relationship = 'B';
  m.classification = 'B';
  assert.ok(build({ 'event_mappings.json': doc }).errors.some((e) => e.includes('contradicts existing basis unsupported')));
  const doc2 = load('event_mappings.json');
  delete doc2.records.find((r) => r.event_id === 'hu-2022-08-12-catl-debrecen').indicators.find((r) => r.indicator_id === 'automotive_export_share').revises_existing;
  assert.ok(build({ 'event_mappings.json': doc2 }).errors.some((e) => e.includes('automotive_export_share: D contradicts')));
});

test('event classification must equal its strongest indicator relationship', () => {
  const doc = load('event_mappings.json');
  doc.records.find((r) => r.event_id === 'pl-2026-08-20-industrial-output').classification = 'C';
  assert.ok(build({ 'event_mappings.json': doc }).errors.some((e) => e.includes('strongest row A')));
});

test('numbers quoted in case findings are checked against the stores', () => {
  const doc = load('cases.json');
  doc.cases[0].checks[0].value += 1;
  assert.ok(build({ 'cases.json': doc }).errors.some((e) => e.includes('store has')));
});

test('funding amounts must be stated in the cited implementation milestone, and EU programmes never apply to Serbia', () => {
  const doc = load('eu_funding.json');
  doc.records.find((f) => f.record_id === 'cz-repowereu-2023-prefinancing').amount = 147_000_000;
  assert.ok(build({ 'eu_funding.json': doc }).errors.some((e) => e.includes('not stated in cz-e2-05')));
  const doc2 = load('eu_funding.json');
  doc2.records.push({ ...doc2.records[0], record_id: 'rs-test', country: 'serbia', implementation_milestone: null, event_id: null });
  assert.ok(build({ 'eu_funding.json': doc2 }).errors.some((e) => e.includes('not applicable to serbia')));
});

test('investment stage statuses follow the implementation milestones they cite', () => {
  const doc = load('investment_records.json');
  doc.records[0].stages.find((s) => s.stage === 'production_commencement').status = 'not_documented';
  assert.ok(build({ 'investment_records.json': doc }).errors.some((e) => e.includes('inconsistent with milestones')));
});

test('funding stages are never summed and loans stay separate from grants', () => {
  const { records } = load('eu_funding.json');
  for (const f of records) assert.ok(['grants', 'loans', 'mixed', 'not_stated'].includes(f.category));
  const cz = records.filter((f) => f.record_id.startsWith('cz-rrf-2025-'));
  assert.deepEqual(cz.map((f) => f.category).sort(), ['grants', 'loans']);
  assert.ok(!JSON.stringify(clean.index).includes('total_eu_funding'));
});

test('evidence windows copy stored observations and never fill gaps', () => {
  for (const w of clean.index.evidence_windows) for (const s of w.series) {
    const periods = s.observations.map((o) => o.period);
    for (const p of s.missing_periods) assert.ok(!periods.includes(p));
    assert.equal(periods.length + s.missing_periods.length, w.before + w.after + 1);
  }
  const cz = clean.index.evidence_windows.find((w) => w.window_id === 'cz-repowereu-monthly').series[0];
  assert.equal(cz.status, 'complete');
  assert.equal(cz.observations.find((o) => o.period === '2023-10').value, 35.4);
  const hu = clean.index.evidence_windows.find((w) => w.window_id === 'hu-catl-trial-production-monthly').series[0];
  assert.equal(hu.status, 'pre_event_only');
});

test('coverage matrix covers ten countries × four themes and marks Serbia EU funding not applicable rather than zero', () => {
  assert.equal(clean.index.coverage_matrix.length, 40);
  const rs = clean.index.coverage_matrix.find((r) => r.country === 'serbia' && r.theme_id === 'eu_funding_development');
  assert.equal(rs.theme_applicable, false);
  assert.ok(rs.note.en.includes('not applicable'));
  assert.equal(clean.index.funding_applicability.find((r) => r.country === 'serbia').programmes.RRF, 'not_applicable');
  assert.equal(clean.index.funding_applicability.find((r) => r.country === 'germany').programmes.RRF, 'applicable_no_admitted_record');
});

test('the single-vintage reference stays restricted to its isolated view', () => {
  const doc = load('cases.json');
  doc.cases[0].series.push({ indicator_id: 'fdi_inflow', layer: 'single_vintage_annual', country: 'hungary' });
  assert.ok(build({ 'cases.json': doc }).errors.some((e) => e.includes('isolated descriptive view')));
});

test('authored English text avoids causal claims', () => {
  const text = JSON.stringify([load('cases.json'), load('event_mappings.json'), load('investment_records.json')]);
  for (const phrase of ['led to', 'resulted in', 'boosted', 'drove up', 'thanks to', 'impact of the plant', 'caused by the']) assert.ok(!text.includes(phrase), phrase);
});

test('only display code imports the thematic layer (owner decision 2026-11-17)', () => {
  const allowed = [/^src\/lib\/thematicResearch\.ts$/, /^src\/app\//, /^src\/components\//, /^scripts\/research-themes\//];
  const offenders = [];
  const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = `${dir}/${e.name}`; if (e.isDirectory()) { if (!['node_modules', 'raw', 'snapshots'].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && /research-themes\/|thematicResearch/.test(fs.readFileSync(path.join(root, rel), 'utf8'))) offenders.push(rel); } };
  walk('src'); walk('scripts');
  assert.deepEqual(offenders.filter((f) => !allowed.some((re) => re.test(f))), []);
  for (const f of ['scripts/historical-annual/validate.mjs', 'scripts/historical-monthly-descriptive/validate.mjs', 'scripts/historical-regional/validate.mjs', 'scripts/serbia-sors/validate.mjs'])
    assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes('research-themes\\/build-research-themes\\.mjs$/'), `${f}: exact-file exception only`);
});

test('a funding amount marked as read in an official document names a registered manual-reading host, an exact sha256 and a read date', () => {
  const sk = load('eu_funding.json').records.find((f) => f.record_id === 'sk-rrf-2024-authorisation');
  assert.equal(sk.evidence_status, 'official_document_verified');
  assert.equal(new URL(sk.source.url).hostname, 'commission.europa.eu');
  const mutate = (fn) => { const doc = load('eu_funding.json'); fn(doc.records.find((f) => f.record_id === 'sk-rrf-2024-authorisation')); return build({ 'eu_funding.json': doc }).errors; };
  assert.ok(mutate((f) => { f.source.url = 'https://kormany.hu/x.pdf'; }).some((e) => e.includes('not a registered manual-reading host')), 'unregistered host');
  assert.ok(mutate((f) => { f.source.url = 'https://www.dz-rs.si/x.pdf'; }).some((e) => e.includes('not a registered manual-reading host')), 'blocked host');
  assert.ok(mutate((f) => { delete f.source.sha256; }).some((e) => e.includes('exact sha256')));
  assert.ok(mutate((f) => { f.evidence_status = 'official_record_admitted'; }).some((e) => e.includes('must be official_document_verified')));
  assert.ok(mutate((f) => { f.source = { kind: 'atlas_event_record' }; }).some((e) => e.includes('needs a read document')));
});

test('Slovenian and Croatian funding amounts are read on the registered government pages (owner decision 2026-11-17)', () => {
  const recs = new Map(load('eu_funding.json').records.map((f) => [f.record_id, f]));
  const expect = { 'si-rrf-2026-final-request-grants': ['www.gov.si', 268670000], 'si-rrf-2026-final-request-loans': ['www.gov.si', 3100000], 'si-eu-2026-maribor-research': ['www.gov.si', 17353132.2], 'hr-rrf-2026-water-contracts': ['vlada.gov.hr', null], 'hr-cohesion-2026-vir-contract': ['vlada.gov.hr', 213900000] };
  for (const [id, [host, amount]] of Object.entries(expect)) {
    const f = recs.get(id);
    assert.equal(f.evidence_status, 'official_document_verified', id);
    assert.equal(new URL(f.source.url).hostname, host, id);
    assert.equal(f.amount, amount, id);
  }
  const mb = recs.get('si-eu-2026-maribor-research');
  assert.deepEqual([mb.programme, mb.funding_period, mb.amount_precision], ['ERDF', '2021-2027', 'exact']);
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'docs/legal-security/network_acquisition_registry.json'), 'utf8')).hosts;
  for (const h of ['www.gov.si', 'vlada.gov.hr', 'reforms-investments.ec.europa.eu']) {
    const e = reg.find((x) => x.host === h);
    assert.deepEqual([e.status, e.automation_allowed, e.manual_allowed], ['allowed', false, true], h);
  }
});
