import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildSlovakia, slovakiaFiles } from '../../scripts/political-data/slovakia/build-nrsr-national.mjs';
import { MANDATORY_ADMISSION_GATES, POLITICAL_ADMISSION_FILE, POLITICAL_ADMISSIONS, approvedPoliticalAdmissionFiles } from '../../docs/political-data/source-closure/political-admission-amendments.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const STORE = 'src/data/political/slovakia';
const results = read(`${STORE}/election_results.json`), contestants = read(`${STORE}/electoral_contestants.json`), turnout = read(`${STORE}/election_turnout.json`)[0];
const data = require('../../src/lib/politicalData.ts');
const row = (n) => results.find((r) => r.contestant_ref === `ct-sk-nrsr2023-${String(n).padStart(2, '0')}`);
const list = (n) => contestants.find((c) => c.list_number === n);

test('builder reproduces stores and exports exactly from committed evidence', () => {
  const built = buildSlovakia();
  for (const [file, content] of Object.entries(slovakiaFiles(built))) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  assert.deepEqual(built.checks, { lists: 25, validVotes: 2967896, registered: 4388872, voters: 3007123, turnout: 68.51, seats: 150 });
});

test('national totals reconcile; truncated shares and turnout reproduce', () => {
  assert.equal(results.reduce((n, r) => n + r.votes, 0), turnout.valid_votes);
  assert.equal(results.reduce((n, r) => n + r.seats, 0), 150);
  for (const r of results) assert.equal(Math.floor((r.votes * 10000) / r.valid_votes) / 100, r.published_vote_share);
  assert.equal(Math.floor((turnout.voters * 10000) / turnout.eligible_voters) / 100, turnout.published_turnout);
  assert.equal(turnout.invalid_votes, null, 'not stated, not reconstructed');
  assert.deepEqual([16, 3, 17, 5, 23, 12, 15].map((n) => row(n).seats), [42, 32, 27, 16, 12, 11, 10]);
  assert.equal(row(16).votes, 681017);
});

test('kinds only where stated; coalition stays whole; no series from one election', () => {
  assert.equal(contestants.filter((c) => c.contestant_kind === 'party_list').length, 6);
  assert.deepEqual(contestants.filter((c) => c.contestant_kind === 'coalition').map((c) => c.list_number), [5]);
  assert.equal(contestants.filter((c) => c.contestant_kind === 'electoral_list_kind_not_established').length, 18);
  assert.equal(list(7).contestant_kind, 'electoral_list_kind_not_established', 'a name that looks like a coalition is not evidence');
  const [view] = data.politicalSlovakElectionViews();
  assert.ok(view.results.every((r) => r.partyId === null && r.memberPartyIds.length === 0));
  assert.equal(read('public/research-data/political/slovakia/manifest.json').continuous_party_series, 0);
  assert.ok(!fs.existsSync(path.join(root, STORE, 'party_identity_links.json')));
});

test('rules: 150 seats, one district, thresholds from § 66', () => {
  const [view] = data.politicalSlovakElectionViews();
  assert.equal(view.totalSeats, 150);
  assert.deepEqual(view.national.rules.thresholds.map((t) => t.percent), [5, 7, 10]);
  const evidence = read('docs/political-data/raw/slovakia/nrsr2023/evidence.json');
  assert.match(evidence.rules.thresholds, /menej ako desať percent/);
  assert.match(evidence.rules.allocation, /číslom 151/);
});

test('evidence: checksums, rights limits, no candidate names, statistics.sk never used', () => {
  const evidence = read('docs/political-data/raw/slovakia/nrsr2023/evidence.json');
  assert.equal(sha(evidence.minutes.national_excerpt.path), evidence.minutes.national_excerpt.sha256);
  assert.match(evidence.minutes.pdf_sha256, /^[0-9a-f]{64}$/);
  assert.match(evidence.rights.quote, /úradné rozhodnutie/);
  assert.ok(evidence.rights.limits.some((x) => /not advice from a lawyer/.test(x)));
  const excerpt = fs.readFileSync(path.join(root, evidence.minutes.national_excerpt.path), 'utf8');
  assert.doesNotMatch(excerpt, /Meno a priezvisko kandidáta/);
  assert.ok(!fs.readdirSync(path.join(root, 'docs/political-data/raw/slovakia/nrsr2023')).some((f) => f.endsWith('.pdf')));
  assert.deepEqual(evidence.not_admitted.elections, [2020, 2016, 2012]);
  for (const s of read(`${STORE}/political_source_registry.json`)) { assert.equal(sha(s.raw_path), s.raw_sha256, s.source_id); assert.doesNotMatch(s.url, /statistics\.sk/); }
  const net = read('docs/legal-security/network_acquisition_registry.json').hosts.find((h) => h.host === 'statistics.sk');
  assert.equal(net.status, 'blocked');
  assert.equal(net.automation_allowed, false);
});

test('rights evidence: 2023 version cited; § 5(b) and the database right are recorded as uncertain, not assumed', () => {
  const { rights } = read('docs/political-data/raw/slovakia/nrsr2023/evidence.json');
  assert.equal(rights.statute.url, 'https://static.slov-lex.sk/static/SK/ZZ/2015/185/20230201.html');
  assert.equal(rights.statute.version, '1 February 2023');
  assert.match(rights.statute.sha256, /^[0-9a-f]{64}$/);
  for (const s of read(`${STORE}/political_source_registry.json`)) { assert.equal(s.licence_url, rights.statute.url, s.source_id); assert.doesNotMatch(s.licence_url, /20190101/); }
  assert.match(rights.findings.join(' '), /not relied on as settled/);
  assert.match(rights.findings.join(' '), /not assumed/);
  assert.match(rights.limits.join(' '), /No licence or written permission exists/);
  assert.match(rights.database_right.quote_138_3, /nepodstatnej časti/);
  assert.match(rights.statutory_publication, /zverejní celkové výsledky/);
  assert.equal(read('docs/political-data/slovakia_rights_evidence_admission.json').gates.reuse_right.value, 'statutory_reading_owner_decision_uncertainty_recorded');
  assert.equal(row(16).votes, 681017, 'figures unchanged');
  assert.equal(results.reduce((n, r) => n + r.seats, 0), 150);
});

test('admission: exact hashes, closed gates, Germany inadmissible; other elections and files stay blocked', () => {
  const records = read(POLITICAL_ADMISSION_FILE).admissions.filter((x) => x.country === 'slovakia');
  assert.deepEqual(records.map((x) => x.admission_id), ['slovakia-nrsr-2023', 'slovakia-rights-evidence']);
  for (const file of ['slovakia_nrsr2023_admission', 'slovakia_rights_evidence_admission']) for (const gate of MANDATORY_ADMISSION_GATES) assert.equal(read(`docs/political-data/${file}.json`).gates[gate].status, 'closed', gate);
  const { approved, problems } = approvedPoliticalAdmissionFiles(records, sha);
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...POLITICAL_ADMISSIONS['slovakia-rights-evidence'].paths].sort());
  for (const [file, hash] of approved) assert.equal(sha(file), hash, file);
  assert.equal(read('docs/political-data/source-closure/gate_matrix.json').countries.find((c) => c.country === 'slovakia').overall_readiness, 'NOT_READY');
  assert.ok(approvedPoliticalAdmissionFiles([{ ...records[0], files: [...records[0].files, { path: 'src/data/political/germany/elections.json', sha256: 'a'.repeat(64) }] }], sha).problems.length);
});

test('comparison: four countries available from every view; Germany, Czechia and Poland keep their elections', () => {
  assert.deepEqual(data.politicalSlovakComparisonCountries().map((c) => c.slug), ['germany', 'czechia', 'poland']);
  assert.equal(data.politicalElectionViews().length, 7);
  assert.equal(data.politicalCzechElectionViews().length, 3);
  assert.equal(data.politicalPolishElectionViews().length, 4);
  assert.equal(read('public/research-data/political/poland/manifest.json').continuous_party_series, 5);
  assert.equal(read('public/research-data/political/czechia/manifest.json').continuous_party_series, 7);
});
