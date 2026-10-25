import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildCzechia2025, czechiaFiles } from '../../scripts/political-data/czechia/build-ps2025.mjs';
import { approvedPoliticalAdmissionFiles, MANDATORY_ADMISSION_GATES, POLITICAL_ADMISSION_FILE, POLITICAL_ADMISSIONS } from '../../docs/political-data/source-closure/political-admission-amendments.mjs';
import { checkFrozenFiles } from '../../docs/political-data/source-closure/ui-amendments.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('builder reproduces the committed stores and exports exactly from committed evidence', () => {
  const data = buildCzechia2025();
  for (const [file, content] of Object.entries(czechiaFiles(data))) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  assert.deepEqual(data.checks, { lists: 26, validVotes: 5621717, totalSeats: 200, registered: 8253316, envelopes: 5690635, turnout: 68.95 });
});

test('reconciliation: list votes = valid votes, seats = 200, shares are the official truncated shares, turnout reproduces', () => {
  const results = read('src/data/political/czechia/election_results.json');
  const [turnout] = read('src/data/political/czechia/election_turnout.json');
  assert.equal(results.reduce((n, r) => n + r.votes, 0), turnout.valid_votes);
  assert.equal(results.reduce((n, r) => n + r.seats, 0), 200);
  for (const r of results) assert.equal(Math.floor((r.votes * 10000) / r.valid_votes) / 100, r.published_vote_share, r.contestant_ref);
  assert.ok(Math.abs(turnout.voters / turnout.eligible_voters * 100 - turnout.published_turnout) < 0.005);
  assert.equal(turnout.invalid_votes, null, 'invalid votes are missing, not reconstructed');
  assert.equal(turnout.ballots_cast, null);
});

test('identity: election-specific lists only; no kind, coalition membership or party link is inferred', () => {
  const contestants = read('src/data/political/czechia/electoral_contestants.json');
  assert.equal(contestants.length, 26);
  assert.equal(new Set(contestants.map((c) => c.csu_list_code)).size, 26);
  for (const c of contestants) {
    assert.equal(c.contestant_kind, 'electoral_list_kind_not_established');
    assert.equal(c.lead_party_id, null);
    assert.equal(c.continuous_series_eligible, false);
  }
  assert.ok(!fs.existsSync(path.join(root, 'src/data/political/czechia/contestant_members.json')));
});

test('evidence integrity: raw files match their checksums; rights fields show no protected right for every distribution', () => {
  const evidence = read('docs/political-data/raw/czechia/ps2025/evidence.json');
  for (const d of evidence.datasets) {
    for (const dist of d.distributions) assert.deepEqual(dist.rights, { autorske_dilo: 'Neobsahuje', originalni_databaze: 'Neobsahuje', zvlastni_pravo_poriz_databaze: 'Není chráněna', osobni_udaje: 'Neobsahuje' }, `${d.code} ${dist.format}`);
    if (d.schema.archived_path) assert.equal(sha(d.schema.archived_path), d.schema.sha256);
    for (const dist of d.distributions) { if (dist.archived_path) assert.equal(sha(dist.archived_path), dist.sha256); if (dist.excerpt) assert.equal(sha(dist.excerpt.path), dist.excerpt.sha256); }
  }
  for (const source of read('src/data/political/czechia/political_source_registry.json')) assert.equal(sha(source.raw_path), source.raw_sha256, source.source_id);
  assert.doesNotMatch(JSON.stringify(evidence), /@[a-z0-9-]+\.[a-z]{2,}|Slavníková/i, 'no personal contact data');
});

test('admission record: exact hashes, every mandatory gate closed, Germany never admissible', () => {
  const records = read(POLITICAL_ADMISSION_FILE).admissions;
  const gates = read('docs/political-data/czechia_ps2025_admission.json');
  for (const gate of MANDATORY_ADMISSION_GATES) assert.equal(gates.gates[gate].status, 'closed', gate);
  const { approved, problems } = approvedPoliticalAdmissionFiles(records, sha);
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...POLITICAL_ADMISSIONS['czechia-ps-2025'].paths].sort());
  for (const [file, hash] of approved) assert.equal(sha(file), hash, file);
  const r = records[0];
  assert.ok(approvedPoliticalAdmissionFiles([{ ...r, files: [...r.files, { path: 'src/data/political/germany/elections.json', sha256: 'a'.repeat(64) }] }], sha).problems.length, 'Germany cannot be added');
  assert.ok(approvedPoliticalAdmissionFiles([{ ...r, gates_closed: r.gates_closed.slice(1) }], sha).problems.length, 'an open gate blocks admission');
  assert.ok(approvedPoliticalAdmissionFiles([r], () => 'f'.repeat(64)).problems.length, 'a changed gate record blocks admission');
  const file = r.files[0].path;
  const run = (baselineFiles, hash) => checkFrozenFiles({ baselineFiles, currentFiles: [file], hashOf: (f) => (f === file ? hash : sha(f)), amendments: [], politicalAdmissions: [r] });
  assert.equal(run({}, r.files[0].sha256).ok, true, 'new file at the exact hash');
  assert.equal(run({}, '0'.repeat(64)).ok, false, 'hash drift');
  assert.equal(run({ [file]: '1'.repeat(64) }, r.files[0].sha256).ok, false, 'existing baseline files are never admitted');
});

test('adapter: Czechia view, Germany unchanged, comparable list votes and documented definition differences', () => {
  const data = require('../../src/lib/politicalData.ts');
  const [cz] = data.politicalComparisonCountries();
  assert.equal(cz.slug, 'czechia');
  const e = cz.elections[0];
  assert.equal(e.date, '2025-10-03');
  assert.equal(e.national.dateEnd, '2025-10-04');
  assert.equal(e.validSecondVotes, 5621717);
  assert.equal(e.totalSeats, 200);
  assert.deepEqual(e.national.rules.thresholds.map((t) => t.percent), [5, 8, 11]);
  assert.equal(e.national.activeVote.kind, 'list');
  assert.equal(e.national.turnout.numerator, 'envelopes_issued');
  const de = data.politicalElectionViews().at(-1);
  assert.equal(de.national.turnout.numerator, 'voters');
  const { compatibleTurnout, compatibleVoteBasis } = require('../../src/lib/politicalNational.ts');
  assert.equal(compatibleTurnout(de, e), false, 'different turnout numerators are not treated as one comparable change');
  assert.equal(typeof compatibleVoteBasis(de, e), 'boolean');
  assert.equal(data.politicalElectionViews().length, 7);
});

test('display labels drop only a leading ballot number equal to the ČSÚ list code; the official label is kept verbatim', () => {
  for (const c of read('src/data/political/czechia/electoral_contestants.json')) {
    assert.ok(c.registered_label_native.startsWith(`${c.csu_list_code} `));
    assert.equal(c.historical_display_label, c.registered_label_native.slice(c.csu_list_code.length + 1));
  }
});
