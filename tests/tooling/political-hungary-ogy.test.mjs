import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildHungary, highestAverages, hungaryFiles, reconcile, NATIONALITY_VOTE, PARTY_VOTE } from '../../scripts/political-data/hungary/build-ogy-national.mjs';
import { MANDATORY_ADMISSION_GATES, POLITICAL_ADMISSION_FILE, POLITICAL_ADMISSIONS, approvedPoliticalAdmissionFiles } from '../../docs/political-data/source-closure/political-admission-amendments.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const STORE = 'src/data/political/hungary';
const EVIDENCE = 'docs/political-data/raw/hungary/ogy/evidence.json';
const data = require('../../src/lib/politicalData.ts');
const explorer = require('../../src/lib/politicalExplorer.ts');
const national = require('../../src/lib/politicalNational.ts');
const views = data.politicalHungarianElectionViews();
const evidence = read(EVIDENCE);
const [v22, v26] = views;

test('builder reproduces stores and exports exactly from committed evidence', () => {
  const built = buildHungary();
  for (const [file, content] of Object.entries(hungaryFiles(built))) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  assert.deepEqual(views.map((v) => [v.electionId, v.date, v.totalSeats]), [['el-hu-ogy-2022-04-03', '2022-04-03', 199], ['el-hu-ogy-2026-04-12', '2026-04-12', 199]]);
});

test('2026 figures match the minutes, and the party-list totals reconcile', () => {
  const by = (label) => v26.results.find((r) => r.nativeLabel === label);
  assert.equal(by('Tisztelet és Szabadság Párt').votes, 3385890);
  assert.equal(by('FIDESZ - Magyar Polgári Szövetség-Kereszténydemokrata Néppárt').votes, 2458337);
  assert.equal(by('Mi Hazánk Mozgalom').votes, 358372);
  assert.deepEqual(['Tisztelet és Szabadság Párt', 'FIDESZ - Magyar Polgári Szövetség-Kereszténydemokrata Néppárt', 'Mi Hazánk Mozgalom', 'Demokratikus Koalíció', 'Magyar Kétfarkú Kutya Párt'].map((l) => by(l).seats), [45, 42, 6, 0, 0]);
  assert.equal(v26.validSecondVotes, 6324862);
  assert.equal(v26.results.reduce((n, r) => n + r.votes, 0), 6324862);
  assert.equal(v22.results.reduce((n, r) => n + r.votes, 0), 5624225);
  assert.equal(v26.eligibleVoters, 8112646);
  assert.equal(v26.voters, 6408362);
});

test('party-list and nationality-list votes are separate ballots with separate denominators; constituency votes are not held', () => {
  for (const view of views) {
    assert.deepEqual(view.national.ballots.map((b) => [b.definition.id, b.definition.kind, b.definition.seatScope]), [[PARTY_VOTE, 'list', 'tier_only'], [NATIONALITY_VOTE, 'minority', 'tier_only']]);
    assert.ok(!view.national.ballots.some((b) => b.definition.kind === 'constituency'));
    assert.equal(view.results.filter((r) => r.contestantKind === 'nationality_list').length, 0, 'nationality lists are not in the party ballot');
    const [party, nationality] = view.national.ballots;
    assert.equal(party.results.reduce((n, r) => n + r.votes, 0), party.validVotes);
    assert.equal(nationality.results.reduce((n, r) => n + r.votes, 0), nationality.validVotes);
  }
  const m = evidence.minutes['2026'];
  assert.equal(v26.national.ballots[0].validVotes + v26.national.ballots[1].validVotes, m.ballots.valid, 'only the printed ballot total joins them, as a check');
  const results = read(`${STORE}/election_results.json`);
  for (const r of results) assert.equal(r.votes + 0, r.votes);
  assert.ok(results.filter((r) => r.surplus_votes !== null).every((r) => r.votes_for_list_seat_allocation === r.votes + r.surplus_votes), 'surplus votes are an allocation input, never added to votes');
});

test('shares and turnout are computed, labelled as computed, and never carry the application\'s printed figures', () => {
  const results = read(`${STORE}/election_results.json`);
  assert.ok(results.every((r) => r.published_vote_share === null));
  assert.ok(read(`${STORE}/election_turnout.json`).every((t) => t.published_turnout === null));
  const tisza = v26.results.find((r) => r.nativeLabel === 'Tisztelet és Szabadság Párt');
  const shown = explorer.shareForDisplay(tisza, v26);
  assert.equal(shown.computed, true);
  assert.equal(shown.value, (3385890 / 6324862) * 100);
  assert.notEqual(Number(shown.value.toFixed(2)), 53.18, 'the application prints this list over both ballots together');
  const turnout = explorer.turnoutForDisplay(v26);
  assert.deepEqual(turnout, { value: (6408362 / 8112646) * 100, computed: true });
  assert.equal(explorer.turnoutForDisplay(v22).value, (5717182 / 8215304) * 100);
  const german = data.politicalElectionViews().at(-1);
  assert.equal(explorer.shareForDisplay(german.results[0], german).computed, false, 'published figures still win elsewhere');
  assert.deepEqual(explorer.turnoutForDisplay(german), { value: german.publishedTurnout, computed: false });
});

test('seats shown are list seats only: 93 of 199, with no whole-chamber share or vote-to-seat difference', () => {
  for (const view of views) {
    const all = view.national.ballots.flatMap((b) => b.results);
    assert.equal(all.reduce((n, r) => n + r.seats, 0), 93);
    assert.equal(explorer.measureValue(view.results[0], view, 'seat_share'), null);
    for (const r of view.results) assert.equal(national.voteSeatDifference(view, r), null);
    assert.equal(view.system.baseSeats, 199);
    assert.match(view.notes.en, /93 of the 199 seats/);
    assert.match(view.notes.en, /do not show which list won the most seats overall/);
  }
  const german = v22.national.ballots[1].results.find((r) => r.seats > 0);
  assert.equal(german.nativeLabel, 'MAGYARORSZÁGI NÉMETEK ORSZÁGOS ÖNKORMÁNYZATA');
  assert.equal(german.seats, 1);
  assert.ok(v26.national.ballots[1].results.every((r) => r.seats === 0));
});

test('reconciliation fails closed: a changed figure stops the build, and the allocation is recomputed', () => {
  const m = evidence.minutes['2026'];
  assert.deepEqual(highestAverages([4750673, 703624, 4440872], 93), [45, 6, 42]);
  assert.deepEqual(highestAverages([3526480, 639551, 4390962], 92), [38, 6, 48]);
  assert.equal(reconcile(m).listSeats, 93);
  const change = (f) => { const c = structuredClone(m); f(c); return c; };
  assert.throws(() => reconcile(change((c) => { c.party_lists[1].votes += 1; })), /party-list votes/);
  assert.throws(() => reconcile(change((c) => { c.nationality_lists[0].votes += 1; })), /nationality-list votes/);
  assert.throws(() => reconcile(change((c) => { c.ballots.invalid += 1; })), /stamped ballots/);
  assert.throws(() => reconcile(change((c) => { c.registers.postal += 1; })), /registers/);
  assert.throws(() => reconcile(change((c) => { c.party_lists[1].seats = 46; c.party_lists[4].seats = 41; })), /recomputed list seats/);
  assert.throws(() => reconcile(change((c) => { c.preferential_quota += 1; })), /preferential quota/);
  assert.throws(() => highestAverages([10, 10], 1), /tie/);
});

test('joint lists stay whole; no party or link is created; no series between 2022 and 2026', () => {
  const contestants = read(`${STORE}/electoral_contestants.json`);
  const kind = (year, row) => contestants.find((c) => c.election_id === evidence.minutes[year].election_id && c.contestant_id.endsWith(`p0${row}`)).contestant_kind;
  assert.equal(kind('2026', 5), 'coalition');
  assert.equal(kind('2026', 2), 'party_list');
  assert.equal(kind('2022', 1), 'coalition');
  assert.equal(kind('2022', 6), 'coalition');
  assert.equal(kind('2022', 5), 'party_list');
  for (const view of views) assert.ok(view.national.ballots.flatMap((b) => b.results).every((r) => r.partyId === null && r.memberPartyIds.length === 0));
  for (const store of ['contestant_members', 'political_parties', 'party_identity_links']) assert.ok(!fs.existsSync(path.join(root, STORE, `${store}.json`)), store);
  assert.ok(contestants.every((c) => c.continuous_series_eligible === false && c.lead_party_id === null));
  assert.equal(read('public/research-data/political/hungary/manifest.json').continuous_party_series, 0);
  assert.equal(read('public/research-data/political/hungary/manifest.json').coverage, 'national_list_tier_93_of_199_seats');
});

test('evidence: rights limits recorded, checksums only, no PDF, no CSV, no personal names', () => {
  assert.match(evidence.rights.quote, /hivatalos közlemények és ügyiratok/);
  assert.match(evidence.rights.statutory_publication.quote, /eredményét megállapító jegyzőkönyvek tartalmát/);
  assert.match(evidence.rights.limits.join(' '), /No licence or written permission exists/);
  assert.match(evidence.rights.limits.join(' '), /were not read and could contain conditions/);
  assert.match(evidence.rights.database_right.finding, /not settled/);
  assert.match(evidence.csv_check.finding, /generated in the browser/);
  assert.deepEqual(evidence.not_admitted.elections, [2018]);
  for (const year of ['2022', '2026']) { assert.match(evidence.minutes[year].pdf_sha256, /^[0-9a-f]{64}$/); assert.match(evidence.minutes[year].url, /^https:\/\/static\.valasztas\.hu\//); }
  const dir = path.join(root, 'docs/political-data/raw/hungary/ogy');
  assert.deepEqual(fs.readdirSync(dir), ['evidence.json']);
  assert.ok(!fs.readdirSync(path.join(root, 'public/research-data/political/hungary')).some((f) => /partlistak|\.pdf$/.test(f)));
  for (const s of read(`${STORE}/political_source_registry.json`)) { assert.equal(sha(s.raw_path), s.raw_sha256, s.source_id); assert.doesNotMatch(s.url, /www\.valasztas\.hu|vtr\.valasztas\.hu/); assert.match(s.licence_url, /njt\.jog\.gov\.hu/); }
  const fields = read(`${STORE}/electoral_contestants.json`).flatMap((c) => Object.keys(c));
  assert.ok(!fields.some((k) => /candidate|person|deput/i.test(k)));
  const net = read('docs/legal-security/network_acquisition_registry.json').hosts;
  assert.equal(net.find((h) => h.host === 'www.valasztas.hu').status, 'blocked');
  for (const host of ['vtr.valasztas.hu', 'static.valasztas.hu', 'njt.hu', 'njt.jog.gov.hu']) assert.equal(net.find((h) => h.host === host).automation_allowed, false, host);
});

test('admission: exact hashes, closed gates, Germany inadmissible', () => {
  const records = read(POLITICAL_ADMISSION_FILE).admissions.filter((x) => x.country === 'hungary');
  assert.deepEqual(records.map((x) => x.admission_id), ['hungary-ogy-2022-2026']);
  for (const gate of MANDATORY_ADMISSION_GATES) assert.equal(read('docs/political-data/hungary_ogy_admission.json').gates[gate].status, 'closed', gate);
  const { approved, problems } = approvedPoliticalAdmissionFiles(records, sha);
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...POLITICAL_ADMISSIONS['hungary-ogy-2022-2026'].paths].sort());
  for (const [file, hash] of approved) assert.equal(sha(file), hash, file);
  assert.ok(approvedPoliticalAdmissionFiles([{ ...records[0], files: [...records[0].files, { path: 'src/data/political/germany/elections.json', sha256: 'a'.repeat(64) }] }], sha).problems.length);
});

test('other countries are unchanged; research functions run for Hungary without new claims', () => {
  assert.deepEqual(data.politicalHungarianComparisonCountries().map((c) => c.slug), ['germany', 'czechia', 'poland', 'slovakia']);
  assert.deepEqual([data.politicalElectionViews().length, data.politicalCzechElectionViews().length, data.politicalPolishElectionViews().length, data.politicalSlovakElectionViews().length], [7, 3, 4, 1]);
  const R = require('../../src/lib/comparativeElectionResearch.ts');
  const { compareCountries } = explorer;
  assert.equal(compareCountries(v26, data.politicalElectionViews().at(-1)).sameAllocationMethod, false);
  const pair = { country: 'hungary', from: v22, to: v26 };
  const change = R.turnoutChange(pair);
  assert.equal(change.status, 'calculated');
  assert.equal(change.change, Number((((6408362 / 8112646) - (5717182 / 8215304)) * 100).toFixed(6)));
  assert.match(change.basis, /computed from official counts/);
  assert.equal(explorer.compatibleTurnout(v22, v26), true);
  assert.equal(R.turnoutChange({ country: 'x', from: v26, to: data.politicalSlovakElectionViews()[0] }).status, 'withheld', 'computed and published turnout are never differenced');
  const rows = require('../../src/lib/electionMacroLinkage.ts').electionMacroRows(views, []);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((r) => r.publishedBeforeElection.status !== 'documented'), 'no release was read for Hungary, so none is claimed');
});
