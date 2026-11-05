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
const { politicalAdmissions, admittedCountrySlugs } = require('../../src/lib/politicalAdmission.ts');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const gateMatrix = read('docs/political-data/source-closure/gate_matrix.json');
const hungary = read('docs/political-data/hungary_source_status.json');
const network = read('docs/legal-security/network_acquisition_registry.json');
const replies = read('docs/legal-security/publisher_response_records.json').records;

test('admitted countries are exactly the countries whose official stores are imported', () => {
  const imported = [...new Set([...fs.readFileSync(path.join(root, 'src/lib/politicalData.ts'), 'utf8').matchAll(/@\/data\/political\/([a-z]+)\//g)].map((m) => m[1]))].sort();
  assert.deepEqual([...admittedCountrySlugs].sort(), imported);
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/data/political')).filter((d) => fs.statSync(path.join(root, 'src/data/political', d)).isDirectory()).sort(), imported);
  assert.deepEqual(imported, ['czechia', 'germany', 'hungary', 'poland', 'slovakia']);
});

test('gate-matrix countries stay blocked unless a separate owner-approved admission record exists', () => {
  const admitted = new Set(read('docs/legal-security/political_admission_records.json').admissions.filter((a) => a.status === 'owner_approved').map((a) => a.country));
  assert.deepEqual([...admitted], ['czechia', 'poland', 'slovakia', 'hungary']);
  for (const country of gateMatrix.countries) {
    const row = politicalAdmissions.find((r) => r.slug === country.country);
    assert.ok(row, country.country);
    // The Production 1B route (volby.gov.cz files, 2002–2025) stays NOT_READY even for an admitted country.
    assert.equal(country.overall_readiness, 'NOT_READY');
    assert.ok(country.open_mandatory_gates.length > 0);
    assert.equal(row.state, admitted.has(country.country) ? 'admitted' : 'blocked', `${country.country}: state`);
    assert.ok(fs.existsSync(path.join(root, row.record)), `${country.country}: record exists`);
  }
  assert.equal(replies.length, 0, 'a publisher reply must be reviewed against the gates before this test is updated');
});

test('Hungary: 2022 and 2026 admitted; hosts registered; the robots-blocked terms host stays unvisited', () => {
  assert.equal(hungary.overall_readiness, 'ADMITTED_LIST_TIER_2022_2026');
  assert.equal(hungary.production_authorised, true);
  assert.match(hungary.data_stored, /No constituency, candidate or application figure/);
  assert.ok(hungary.observations.every((o) => o.stored_values === 'none from the application'));
  assert.deepEqual(hungary.open_mandatory_gates, []);
  assert.deepEqual(Object.entries(hungary.gates).filter(([name, gate]) => name !== 'raw_redistribution' && gate.status !== 'closed'), []);
  for (const entry of hungary.network) {
    const host = network.hosts.find((h) => h.host === entry.host);
    assert.ok(host, `${entry.host} registered`);
    assert.equal(host.status, entry.status);
    assert.equal(host.automation_allowed, false);
  }
  assert.equal(network.hosts.find((h) => h.host === 'www.valasztas.hu').manual_allowed, false, 'robots-blocked host is not visited');
  assert.equal(network.hosts.find((h) => h.host === 'www.valasztas.hu').status, 'blocked');
  assert.equal(politicalAdmissions.find((r) => r.slug === 'hungary').state, 'admitted');
  assert.match(hungary.elections_in_scope.find((e) => e.date === '2018-04-08').status, /^blocked/);
});

test('Romania stays staged; reasons are bilingual and make no unsupported claims', () => {
  assert.equal(read('docs/political-data/romania_publication_readiness.json').technically_ready_for_activation, false);
  assert.equal(politicalAdmissions.find((r) => r.slug === 'romania').state, 'staged_not_published');
  for (const row of politicalAdmissions) {
    assert.ok(row.reason.en.trim() && row.reason['zh-CN'].trim() && row.name.en && row.name['zh-CN']);
    assert.doesNotMatch(row.reason.en, /[㐀-鿿]/u);
    assert.doesNotMatch(row.reason.en, /\b(forecast|support for|poll|likely to win|predict)/i);
  }
});

test('blocker causes match the Stage C decision record; admitted countries have none', () => {
  const record = read('docs/political-data/stage_c_decision_record.json');
  const allowed = ['reuse_restriction', 'missing_official_evidence', 'parser_incompatibility', 'identity_unverified', 'internal_approval'];
  for (const row of politicalAdmissions) {
    if (row.state === 'admitted') { assert.deepEqual(row.causes, []); assert.ok(record.admitted.some((a) => a.country === row.slug)); continue; }
    const entry = record.countries[row.slug];
    assert.ok(entry, `${row.slug}: in decision record`);
    assert.deepEqual([...row.causes].sort(), [...entry.causes].sort(), `${row.slug}: causes`);
    assert.ok(row.causes.length && row.causes.every((c) => allowed.includes(c)));
    for (const cause of entry.causes) assert.ok(entry.evidence.some((e) => e.startsWith(`${cause}:`)), `${row.slug}: evidence for ${cause}`);
    assert.ok(row.causes.includes('internal_approval'), 'publication always needs owner authorisation');
  }
  assert.ok(record.owner_decisions.some((d) => d.country === 'czechia' && /wait for ČSÚ/.test(d.decision)));
});

test('polling stays unpublished: no eligible publisher, every admission condition open, no polling store', () => {
  const polling = read('docs/political-data/polling_source_admission.json');
  assert.deepEqual(polling.eligible_publishers, []);
  assert.ok(polling.admission_conditions.every((c) => c.status === 'open'));
  assert.ok(polling.candidates_for_review.every((c) => c.terms_reviewed === false));
  assert.equal(read('docs/political-data/polling_measurement_schema_proposal.json').state, 'proposal_not_approved_no_data');
  const files = fs.readdirSync(path.join(root, 'public/research-data'), { recursive: true }).map(String);
  assert.ok(!files.some((f) => /poll/i.test(f)), 'no published polling file');
});
