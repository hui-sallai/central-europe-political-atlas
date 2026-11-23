// Germany 1990, 1994 and 1998 (owner brief 2026-11-23; owner answers "Additive exception" and "Register bundestag.de").
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { createRequire, Module } from 'node:module';
import { stores } from '../../scripts/political-data/germany/production.mjs';
import { buildEarlyGermany, buildCanonicalGermany, germanyExtension, hareNiemeyer, splitCanonicalGermany, EARLY_ELECTION_IDS, GERMANY_EXTENSION_GATE } from '../../scripts/political-data/germany/early-elections.mjs';
import { validateCanonicalGermany } from '../../scripts/political-data/germany/validate.mjs';

const require = createRequire(import.meta.url), resolve = Module._resolveFilename;
Module._resolveFilename = function (r, ...a) { return resolve.call(this, r.startsWith('@/') ? new URL(`../../src/${r.slice(2)}`, import.meta.url).pathname : r, ...a); };
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, f);
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const store = (s) => read(`src/data/political/germany/${s}.json`);
const BEFORE = '3a63ccc0d5ea451835c70354da7f77828571f83d';
const { data: early } = buildEarlyGermany();
const ids = Object.values(EARLY_ELECTION_IDS);

test('every 2002–2025 row is byte-identical to the last commit before the extension; 1990–1998 rows only precede them', () => {
  for (const s of stores) {
    const file = `src/data/political/germany/${s}.json`;
    const before = JSON.parse(execFileSync('git', ['show', `${BEFORE}:${file}`], { encoding: 'utf8', maxBuffer: 1e9 })), now = store(s);
    const k = now.length - before.length;
    assert.equal(k, early[s].length, s);
    assert.deepEqual(now.slice(k).map((r) => JSON.stringify(r, null, 2)), before.map((r) => JSON.stringify(r, null, 2)), `${s}: base rows unchanged`);
  }
  assert.equal(validateCanonicalGermany(Object.fromEntries(stores.map((s) => [s, store(s)]))).elections, 10);
});

test('CSV exports: every 2002–2025 line keeps its text; only empty cells for 1990–1998 columns are appended', () => {
  for (const s of stores) {
    const file = `public/research-data/political/germany/${s}.csv`;
    const before = execFileSync('git', ['show', `${BEFORE}:${file}`], { encoding: 'utf8', maxBuffer: 1e9 }).split('\r\n'), now = fs.readFileSync(file, 'utf8').split('\r\n');
    assert.ok(now[0].startsWith(before[0]), `${s}: header columns keep their order`);
    const added = now[0].slice(before[0].length).split(',').length - (now[0] === before[0] ? 1 : 0) - (now[0] === before[0] ? 0 : 1);
    const k = now.length - before.length;
    for (let i = 1; i < before.length - 1; i += 1) assert.equal(now[i + k], before[i] + ','.repeat(added), `${s} line ${i}`);
  }
});

test('elections, polling days, chamber sizes and overhang seats', () => {
  assert.deepEqual(early.elections.map((e) => [e.election_id, e.date, e.legislature_id]), [['el-de-bt-1990-12-02', '1990-12-02', 'lg-de-bt-12'], ['el-de-bt-1994-10-16', '1994-10-16', 'lg-de-bt-13'], ['el-de-bt-1998-09-27', '1998-09-27', 'lg-de-bt-14']]);
  assert.deepEqual(early.legislatures.map((l) => [l.total_seats, l.statutory_base_seats, l.overhang_seats, l.constituency_mandates, l.list_mandates, l.constituency_count]), [[662, 656, 6, 328, 334, 328], [672, 656, 16, 328, 344, 328], [669, 656, 13, 328, 341, 328]]);
  assert.deepEqual(early.electoral_systems.map((s) => [s.allocation_method, s.base_seats, s.seat_reproduction.overhang_by_party]), [['Hare/Niemeyer', 656, { CDU: 6 }], ['Hare/Niemeyer', 656, { CDU: 12, SPD: 4 }], ['Hare/Niemeyer', 656, { SPD: 13 }]]);
});

test('first and second votes are separate ballots, each adding up to its own valid votes; turnout counts as published', () => {
  const expect = { 1990: [60436560, 46995915, 46274925, 720990, 46455772, 540143, 77.8], 1994: [60452009, 47737999, 46949356, 788643, 47105174, 632825, 79], 1998: [60762751, 49947087, 49166580, 780507, 49308512, 638575, 82.2] };
  for (const [y, id] of Object.entries(EARLY_ELECTION_IDS)) {
    const t2 = early.election_turnout.find((r) => r.election_id === id && r.vote_type === 'second_vote'), t1 = early.election_turnout.find((r) => r.election_id === id && r.vote_type === 'first_vote');
    assert.deepEqual([t2.eligible_voters, t2.voters, t1.valid_votes, t1.invalid_votes, t2.valid_second_votes, t2.invalid_second_votes, t2.published_turnout], expect[y]);
    const second = early.election_results.filter((r) => r.election_id === id && r.vote_type === 'second_vote'), first = early.election_results.filter((r) => r.election_id === id && r.vote_type === 'first_vote');
    assert.equal(second.reduce((n, r) => n + r.second_votes, 0), t2.valid_second_votes);
    assert.equal(first.reduce((n, r) => n + r.votes, 0), t1.valid_votes);
    assert.ok(first.every((r) => r.seats === null && r.second_votes === undefined) && second.every((r) => r.votes === undefined));
  }
  assert.deepEqual(['second_vote', 'first_vote'].map((v) => early.election_results.filter((r) => r.vote_type === v).length), [79, 96]);
});

test('Hare/Niemeyer over 656 seats reproduces every party before overhang; 1990 qualifies by electoral area', () => {
  assert.deepEqual(hareNiemeyer([17055116, 15545366, 5123233, 3302980, 1129578, 559207], 656), [262, 239, 79, 51, 17, 8]);
  const s1990 = early.electoral_systems[0];
  assert.deepEqual(s1990.seat_reproduction.qualifying_contestants, ['CDU', 'CSU', 'SPD', 'F.D.P.', 'PDS', 'B90/Gr.']);
  assert.deepEqual(s1990.national_rules.thresholds.map((t) => [t.percent, /electoral area/.test(t.appliesTo)]), [[5, true], [5, true], [null, false]]);
  assert.ok(s1990.legal_basis.some((l) => l.gazette === 'BGBl. I S. 2141' && l.promulgated === '1990-10-10' && l.in_force === null));
  assert.ok(!/nationwide five|single national threshold applied/i.test(s1990.notes.en));
  const grune = early.election_results.find((r) => r.contestant_ref === early.electoral_contestants.find((c) => c.election_id === ids[0] && c.historical_display_label === 'GRÜNE').contestant_id && r.vote_type === 'second_vote');
  assert.deepEqual([grune.seats, grune.electoral_area_second_votes.west.published_percent], [null, 4.8], 'western Greens below 5% in their area take no seat');
  const b90 = early.election_results.find((r) => r.contestant_ref === early.electoral_contestants.find((c) => c.election_id === ids[0] && c.historical_display_label === 'B90/Gr.').contestant_id && r.vote_type === 'second_vote');
  assert.deepEqual([b90.seats, b90.electoral_area_second_votes.east.published_percent], [8, 6.1]);
  const area = early.election_turnout.find((r) => r.election_id === ids[0] && r.vote_type === 'second_vote').electoral_area_valid_second_votes;
  assert.equal(area.west + area.east, 46455772);
  assert.deepEqual(early.electoral_systems.slice(1).map((s) => s.national_rules.thresholds.map((t) => t.percent)), [[5, null], [5, null]]);
  assert.ok(early.electoral_systems[1].rejected_rule_proposals.some((p) => p.bundestag_document === 'BT-Drs. 12/5130'));
});

test('contestants are election-specific: CDU and CSU, GRÜNE and B90/Gr. stay separate; publisher subtotals are not contestants', () => {
  const c1990 = early.electoral_contestants.filter((c) => c.election_id === ids[0]).map((c) => c.historical_display_label);
  for (const l of ['CDU', 'CSU', 'GRÜNE', 'B90/Gr.', 'PDS']) assert.equal(c1990.filter((x) => x === l).length, 1, l);
  assert.ok(!early.electoral_contestants.some((c) => /Sonstige|CDU\/CSU/.test(c.historical_display_label)));
  assert.deepEqual(early.electoral_contestants.filter((c) => c.contestant_kind === 'aggregate_voter_groups_and_individual_candidates').map((c) => c.historical_display_label), ['Wählergruppen/Einzelbewerber', 'Wählergruppen/Einzelbewerber', 'Wählergruppen/Einzelbewerber']);
  assert.ok(early.electoral_contestants.every((c) => c.lead_party_id === null && c.continuous_series_eligible === false));
  assert.ok(early.party_identity_crosswalk.every((x) => x.canonical_party_id === null && x.continuous_series_eligible === false));
  assert.deepEqual(['1990', '1994', '1998'].map((y) => early.electoral_contestants.filter((c) => c.contestant_id.startsWith(`ct-de-${y}-`)).length), [26, 33, 41]);
});

test('owner extension fails closed: a changed gate record, evidence or file set drops 1990–1998 rows', () => {
  assert.ok(germanyExtension().record);
  const real = (rel) => crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
  assert.match(germanyExtension((rel) => (rel === GERMANY_EXTENSION_GATE ? 'f'.repeat(64) : real(rel))).problems.join(), /gate record/);
  assert.match(germanyExtension((rel) => (rel.endsWith('germany_early_elections_evidence.json') ? 'f'.repeat(64) : real(rel))).problems.join(), /evidence/);
  const record = read('docs/legal-security/germany_extension_records.json').records[0];
  assert.deepEqual([record.existing_rows_change_allowed, record.frozen_research_sample_change_allowed, record.owner_answer], [false, false, 'Additive exception']);
  for (const f of record.files) assert.equal(real(f.path), f.sha256, f.path);
  const { early: split } = splitCanonicalGermany(buildCanonicalGermany());
  assert.deepEqual(split.elections.map((e) => e.election_id), ids);
});

test('the Political Explorer reads two ballots per early election without new frontend figures', () => {
  const data = require('../../src/lib/politicalData.ts');
  const views = data.politicalElectionViews();
  assert.deepEqual(views.slice(0, 3).map((v) => [v.electionId, v.totalSeats, v.national.ballots.map((b) => b.definition.id)]), [[ids[0], 662, ['second_vote', 'first_vote']], [ids[1], 672, ['second_vote', 'first_vote']], [ids[2], 669, ['second_vote', 'first_vote']]]);
  assert.equal(views.at(-1).electionId, 'el-de-bt-2025-02-23');
  for (const v of views.slice(0, 3)) for (const b of v.national.ballots) assert.equal(b.results.reduce((n, r) => n + (r.votes ?? 0), 0), b.validVotes);
});

test('no person data, scores or Datenhandbuch text in the extension', () => {
  const text = JSON.stringify(early) + fs.readFileSync('docs/political-data/germany_early_legal_evidence.json', 'utf8');
  assert.doesNotMatch(text, /"(?:candidate_name|first_name|surname|birth|address|score|ideology|forecast)"/i);
  assert.doesNotMatch(text, /Zugrundelegung der Anzahl der Wahlberechtigten|Ratifizierung des am 3\.8\.1990/, 'facts only, not the chapter text');
});

test('descriptive view preserves the chamber and contestant allocation, statutory basis and Land evidence', () => {
  const { politicalElectionViews } = require('../../src/lib/politicalData.ts');
  const { chamberSeats } = require('../../src/lib/politicalExplorer.ts');
  const { selectNationalBallot } = require('../../src/lib/politicalNational.ts');
  const views = politicalElectionViews();
  for (const [index, election] of views.slice(0, 3).entries()) {
    const chamber = early.legislatures[index], system = early.electoral_systems[index];
    const allocation = election.national.germanAllocation;
    assert.deepEqual([
      allocation.statutoryBaseSeats, allocation.constituencyCount, allocation.constituencyMandates,
      allocation.listMandates, allocation.overhangSeats, allocation.statutoryBaseSeatsBasis,
    ], [
      chamber.statutory_base_seats, chamber.constituency_count, chamber.constituency_mandates,
      chamber.list_mandates, chamber.overhang_seats, chamber.statutory_base_seats_basis,
    ]);
    assert.equal(allocation.statutoryBaseSeats + allocation.overhangSeats, election.totalSeats);
    assert.equal(allocation.constituencyMandates + allocation.listMandates, election.totalSeats);
    assert.deepEqual(allocation.overhangByLand, chamber.overhang_by_land);
    assert.deepEqual(allocation.seatReproduction, system.seat_reproduction);
    assert.deepEqual(allocation.legalBasis, system.legal_basis);
    assert.ok(allocation.legalBasis.every(law => election.sources.some(source => source.id === law.source_id)));
    const registered = store('political_source_registry');
    for (const source of election.sources) assert.equal(source.tier, registered.find(s => s.source_id === source.id).tier);
    for (const ballot of election.national.ballots) {
      const selected = selectNationalBallot(election, ballot.definition.id);
      for (const result of ballot.results) {
        const raw = early.election_results.find(r => r.election_id === election.electionId &&
          r.contestant_ref === result.contestantId && r.vote_type === ballot.definition.id);
        for (const [value, field] of [[result.constituencyMandates, 'constituency_mandates'], [result.listMandates, 'list_mandates'],
          [result.overhangSeats, 'overhang_seats'], [result.seatsBeforeOverhangDerived, 'seats_before_overhang_derived']]) {
          assert.equal(value, raw[field], result.contestantId + ' ' + field);
        }
        if (ballot.definition.id === 'first_vote') assert.equal(chamberSeats(result, selected), null);
      }
    }
  }
  assert.ok(views.slice(3).every(e => e.national.germanAllocation === undefined));
});

test('1990 threshold areas retain separate published shares, including unreported percentages', () => {
  const { politicalElectionViews } = require('../../src/lib/politicalData.ts');
  const election = politicalElectionViews()[0];
  const allocation = election.national.germanAllocation;
  const second = election.national.ballots.find(b => b.definition.id === 'second_vote');
  assert.deepEqual(allocation.thresholdAreas, early.electoral_systems[0].threshold_areas);
  assert.deepEqual(second.turnoutRecord.electoral_area_valid_second_votes, { west: 37426103, east: 9029669 });
  for (const row of second.results) {
    const source = early.election_results.find(r => r.contestant_ref === row.contestantId && r.vote_type === 'second_vote');
    assert.deepEqual(row.electoralAreaSecondVotes, source.electoral_area_second_votes);
  }
  assert.deepEqual(second.results.find(r => r.nativeLabel === 'CSU').electoralAreaSecondVotes.east, { votes: 0, published_percent: null });
  assert.deepEqual(allocation.seatReproduction.qualifying_contestants.filter(s => ['GRÜNE', 'PDS', 'B90/Gr.'].includes(s)), ['PDS', 'B90/Gr.']);
  const first = election.national.ballots.find(b => b.definition.id === 'first_vote');
  assert.equal(first.turnoutRecord.electoral_area_valid_second_votes, undefined);
  assert.ok(first.results.every(r => r.electoralAreaSecondVotes === undefined));
  const aggregate = first.results.find(r => r.contestantKind === 'aggregate_voter_groups_and_individual_candidates');
  assert.ok(aggregate && !aggregate.partyId);
  assert.ok(!second.results.some(r => r.contestantId === aggregate.contestantId));
});

test('1998 and 2002 use the same national turnout definition and the same allocation method', () => {
  const { politicalElectionViews } = require('../../src/lib/politicalData.ts');
  const { compareElections, compatibleTurnout } = require('../../src/lib/politicalExplorer.ts');
  const views = politicalElectionViews();
  const left = views.find(e => e.year === 1998), right = views.find(e => e.year === 2002);
  assert.ok(compatibleTurnout(left, right));
  assert.equal(Number(compareElections(left, right).find(r => r.key === 'turnout').difference.toFixed(1)), -3.1);
  assert.equal(left.system.allocationMethod, right.system.allocationMethod);
  assert.deepEqual([left.system.baseSeats, right.system.baseSeats, left.totalSeats, right.totalSeats], [656, 598, 669, 603]);
});
