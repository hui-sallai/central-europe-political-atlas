import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildPoland, committeeType, polandFiles } from '../../scripts/political-data/poland/build-sejm-national.mjs';
import { MANDATORY_ADMISSION_GATES, POLITICAL_ADMISSION_FILE, POLITICAL_ADMISSIONS, approvedPoliticalAdmissionFiles, politicalPackageMemberProblem } from '../../docs/political-data/source-closure/political-admission-amendments.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const STORE = 'src/data/political/poland';
const parties = read(`${STORE}/political_parties.json`);
const { continuousPartyLink } = require('../../src/lib/politicalIdentity.ts');
const contestants = read(`${STORE}/electoral_contestants.json`), results = read(`${STORE}/election_results.json`), links = read(`${STORE}/party_identity_links.json`), turnout = read(`${STORE}/election_turnout.json`);
const data = require('../../src/lib/politicalData.ts');
const row = (year, item) => results.find((r) => r.contestant_ref === `ct-pl-sejm${year}-${String(item).padStart(2, '0')}`);
const list = (year, item) => contestants.find((c) => c.contestant_id === `ct-pl-sejm${year}-${String(item).padStart(2, '0')}`);

test('builder reproduces committed stores and exports exactly from committed evidence', () => {
  const built = buildPoland();
  for (const [file, content] of Object.entries(polandFiles(built))) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  assert.deepEqual(built.checks[2023], { lists: 12, validVotes: 21596674, invalidVotes: 370217, validBallots: 21966891, eligible: 29532595, turnout: 74.38, seats: 460 });
});

test('national totals reconcile for every election', () => {
  assert.equal(turnout.length, 4);
  for (const t of turnout) {
    const rows = results.filter((r) => r.election_id === t.election_id);
    assert.equal(rows.reduce((n, r) => n + r.votes, 0), t.valid_votes);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), 460);
    assert.equal(t.valid_votes + t.invalid_votes, t.ballots_cast);
    assert.ok(Math.abs((t.voters / t.eligible_voters) * 100 - t.published_turnout) < 0.005);
    assert.equal(t.turnout_basis.numerator, 'valid_ballots');
  }
});

test('official 2023 values: votes, seats and exact printed names', () => {
  assert.deepEqual([row(2023, 4).votes, row(2023, 4).published_vote_share, row(2023, 4).seats], [7640854, 35.38, 194]);
  assert.deepEqual([row(2023, 6).votes, row(2023, 6).seats], [6629402, 157]);
  assert.deepEqual([row(2023, 2).votes, row(2023, 2).seats], [3110670, 65]);
  assert.equal(list(2023, 2).historical_display_label, 'KOALICYJNY KOMITET WYBORCZY TRZECIA DROGA POLSKA 2050 SZYMONA HOŁOWNI - POLSKIE STRONNICTWO LUDOWE');
  assert.equal(list(2019, 9).historical_display_label, 'KOMITET WYBORCZY SKUTECZNI PIOTRA LIROYA-MARCA');
  assert.equal(row(2023, 10).in_seat_allocation, true, 'the minority list took part and won 0 seats');
  assert.equal(row(2023, 1).in_seat_allocation, false);
});

test('original list numbers are preserved, including numbers that repeat', () => {
  assert.deepEqual([list(2023, 10), list(2023, 11), list(2023, 12)].map((c) => c.list_number), [11, 11, 11]);
  assert.ok([10, 11, 12].every((i) => list(2023, i).list_number_is_unique === false));
  assert.equal(list(2023, 1).list_number_is_unique, true);
  assert.deepEqual([list(2015, 16).district_restriction, list(2015, 17).district_restriction], [21, 19]);
  assert.equal(new Set(contestants.map((c) => c.contestant_id)).size, contestants.length);
});

test('committee types come from the statutory form of the name, and coalitions stay whole', () => {
  assert.equal(committeeType('KOALICYJNY KOMITET WYBORCZY X').committee_type, 'coalition_committee');
  assert.equal(committeeType('Komitet Wyborczy Wyborców X').committee_type, 'voters_committee');
  assert.equal(committeeType('KOMITET WYBORCZY X').committee_type, 'party_committee');
  assert.throws(() => committeeType('Other X'));
  assert.deepEqual(['2011', '2015', '2019', '2023'].map((y) => contestants.filter((c) => c.election_id.includes(`sejm-${y}`) && c.contestant_kind === 'coalition').length), [0, 1, 1, 2]);
  const views = data.politicalPolishElectionViews();
  assert.ok(views.flatMap((v) => v.results).filter((r) => r.contestantKind === 'coalition').every((r) => r.partyId === null && r.memberPartyIds.length === 0), 'no coalition member is derived from a committee name');
  const members = read(`${STORE}/contestant_members.json`);
  assert.ok(members.every((m) => !contestants.find((c) => c.contestant_id === m.contestant_id).contestant_kind.startsWith('coalition')));
  for (const key of ['votes', 'seats']) assert.ok(members.every((m) => !(key in m)));
});

test('party series need the same register number; a shared name alone stays unresolved', () => {
  const verified = links.filter((l) => l.status === 'verified');
  assert.equal(verified.length, 9);
  assert.ok(verified.every((l) => l.relation === 'same_party' && l.basis === 'official_register' && /EwP \d+/.test(l.note)));
  assert.equal(links.filter((l) => l.status === 'unresolved').length, 5);
  assert.deepEqual(parties.map((p) => p.party_register_number_ewp).sort((a, b) => a - b), [34, 87, 124, 131, 400]);
  assert.equal(read('public/research-data/political/poland/manifest.json').continuous_party_series, 5);
  const label = (from, to) => links.find((l) => l.fromContestant === `ct-pl-sejm${from}` && l.toContestant === `ct-pl-sejm${to}`);
  assert.equal(label('2011-01', '2015-01').status, 'verified');
  assert.equal(label('2019-03', '2023-03').note, 'same party register number EwP 87', 'SLD to Nowa Lewica rests on the number, not the name');
  assert.deepEqual(label('2011-03', '2019-03').elections_without_own_list, [2015]);
  assert.equal(label('2019-05', '2023-06').status, 'unresolved', 'a repeated coalition name is not verified');
  assert.equal(label('2019-10', '2023-10').status, 'unresolved', 'voters committees are not parties');
  assert.equal(label('2011-10', '2019-06').status, 'unresolved', 'Prawica: same name, register not reviewed');
  const views = data.politicalPolishElectionViews();
  const by = (id) => views.find((v) => v.electionId === id);
  for (const l of links) assert.equal(continuousPartyLink(l, by(l.fromElection), by(l.toElection)), l.status === 'verified', l.fromContestant);
  const panel = data.politicalPolishContinuity();
  assert.equal(panel.unresolved.length, 5);
  assert.equal(panel.entities.length, 5);
  const po = panel.entities.find((e) => e.label === 'Platforma Obywatelska RP');
  assert.deepEqual(po.rows.map((r) => r.status), ['own_list', 'own_list', 'no_list', 'no_list']);
  assert.ok(po.rows.slice(2).every((r) => r.share === null && r.seats === null), 'no share of a coalition goes to a party');
  const pis = panel.entities.find((e) => e.label === 'Prawo i Sprawiedliwość');
  assert.deepEqual(pis.rows.map((r) => r.seats), [157, 235, 235, 194]);
  assert.equal(pis.rows[3].change.seatsChange, -41);
  assert.ok(Math.abs(pis.rows[3].change.shareChange - (35.38 - 43.59)) < 1e-9);
  const left = panel.entities.find((e) => e.label === 'Nowa Lewica (Sojusz Lewicy Demokratycznej)');
  assert.deepEqual(left.rows.map((r) => r.status), ['own_list', 'no_list', 'own_list', 'own_list']);
  assert.equal(left.rows[2].change.acrossMissingList, true);
});

test('evidence: notice checksums, rights basis and limits; no candidates or addresses committed', () => {
  const evidence = read('docs/political-data/raw/poland/sejm/evidence.json');
  for (const e of Object.values(evidence.elections)) {
    assert.equal(sha(e.national_excerpt.path), e.national_excerpt.sha256);
    assert.match(e.notice.pdf_sha256, /^[0-9a-f]{64}$/);
    assert.match(e.notice.url, /^https:\/\/eli\.gov\.pl\/eli\/DU\//);
    assert.match(e.validity_resolution.finding, /valid/);
    const text = fs.readFileSync(path.join(root, e.national_excerpt.path), 'utf8');
    assert.doesNotMatch(text, /kandydat skreślony|Kandydaci z tej listy|PESEL/);
  }
  assert.match(evidence.rights.quote, /urzędowe dokumenty, materiały, znaki i symbole/);
  assert.match(evidence.rules_clauses.committee_name, /wynikające z wpisu do ewidencji partii politycznych/);
  assert.ok(evidence.identity_review.limits.some((x) => /extension of the same basis/.test(x)));
  assert.ok(evidence.rights.limits.some((x) => /not advice from a lawyer/.test(x)));
  for (const s of read(`${STORE}/political_source_registry.json`)) { assert.equal(sha(s.raw_path), s.raw_sha256, s.source_id); assert.match(s.url, /^https:\/\/eli\.gov\.pl\//); }
  assert.ok(!fs.readdirSync(path.join(root, 'docs/political-data/raw/poland/sejm')).some((f) => f.endsWith('.pdf')));
});

test('admission: exact hashes, closed gates, Germany inadmissible, blocked file route still open', () => {
  const record = read(POLITICAL_ADMISSION_FILE).admissions.filter((x) => x.country === 'poland');
  assert.equal(record.length, 1);
  for (const gate of MANDATORY_ADMISSION_GATES) assert.equal(read('docs/political-data/poland_sejm_admission.json').gates[gate].status, 'closed', gate);
  const { approved, problems } = approvedPoliticalAdmissionFiles(record, sha);
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...POLITICAL_ADMISSIONS['poland-sejm-2011-2023'].paths].sort());
  for (const [file, hash] of approved) assert.equal(sha(file), hash, file);
  assert.equal(read('docs/political-data/source-closure/gate_matrix.json').countries.find((c) => c.country === 'poland').overall_readiness, 'NOT_READY');
  assert.ok(approvedPoliticalAdmissionFiles([{ ...record[0], files: [...record[0].files, { path: 'src/data/political/germany/elections.json', sha256: 'a'.repeat(64) }] }], sha).problems.length);
});

test('comparison: three-way availability; Germany and Czechia views unchanged in size; different turnout definitions are not differenced', () => {
  assert.deepEqual(data.politicalComparisonCountries().map((c) => c.slug), ['czechia', 'poland']);
  assert.deepEqual(data.politicalCzechComparisonCountries().map((c) => c.slug), ['germany', 'poland']);
  assert.deepEqual(data.politicalPolishComparisonCountries().map((c) => c.slug), ['germany', 'czechia']);
  assert.equal(data.politicalElectionViews().length, 7);
  assert.equal(data.politicalCzechElectionViews().length, 3);
  const { compatibleTurnout } = require('../../src/lib/politicalNational.ts');
  const pl = data.politicalPolishElectionViews().at(-1);
  assert.equal(compatibleTurnout(data.politicalElectionViews().at(-1), pl), false);
  assert.equal(compatibleTurnout(data.politicalCzechElectionViews().at(-1), pl), false);
  assert.equal(compatibleTurnout(data.politicalPolishElectionViews()[0], pl), true);
});

test('research package includes every admitted country', () => {
  assert.match(fs.readFileSync(path.join(root, 'scripts/release/build-research-package.mjs'), 'utf8'), /readdirSync\(path\.join\(sourceDir,'political'\)\)/);
  for (const c of ['germany', 'czechia', 'poland']) assert.ok(fs.existsSync(path.join(root, 'public/research-data/political', c, 'manifest.json')), c);
  const { approved } = approvedPoliticalAdmissionFiles(read(POLITICAL_ADMISSION_FILE).admissions, sha);
  const manifest = 'public/research-data/political/poland/manifest.json';
  assert.equal(politicalPackageMemberProblem('political/poland/manifest.json', sha(manifest), approved), null);
  assert.ok(politicalPackageMemberProblem('political/poland/manifest.json', '0'.repeat(64), approved), 'a changed file is refused');
  assert.ok(politicalPackageMemberProblem('political/poland/extra.csv', sha(manifest), approved), 'an unlisted file is refused');
  assert.ok(politicalPackageMemberProblem('political/slovakia/manifest.json', sha(manifest), approved), 'a country without admission is refused');
  assert.ok(politicalPackageMemberProblem('political/austria/x.csv', 'a', approved));
  assert.equal(politicalPackageMemberProblem('political/germany/manifest.json', 'a', approved), null);
});
