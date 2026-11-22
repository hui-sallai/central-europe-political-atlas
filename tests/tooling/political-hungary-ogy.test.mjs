import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildHungary, highestAverages, hungaryFiles, reconcile, reconcile2010, reconcile1998, reconcileEarly, reconcileComposition, impliedValidBounds, NATIONALITY_VOTE, PARTY_VOTE, VT98 } from '../../scripts/political-data/hungary/build-ogy-national.mjs';
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
const v10 = views.find((v) => v.year === 2010);
const post = views.filter((v) => v.year >= 2014); // the 199-seat system of Act CCIII of 2011
const [v14, v18, v22, v26] = post;

test('builder reproduces stores and exports exactly from committed evidence', () => {
  const built = buildHungary();
  for (const [file, content] of Object.entries(hungaryFiles(built))) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  assert.deepEqual(views.map((v) => [v.electionId, v.date, v.totalSeats]), [['el-hu-ogy-1998-05-10', '1998-05-10', 386], ['el-hu-ogy-2002-04-07', '2002-04-07', 386], ['el-hu-ogy-2006-04-09', '2006-04-09', 386], ['el-hu-ogy-2010-04-11', '2010-04-11', 386], ['el-hu-ogy-2014-04-06', '2014-04-06', 199], ['el-hu-ogy-2018-04-08', '2018-04-08', 199], ['el-hu-ogy-2022-04-03', '2022-04-03', 199], ['el-hu-ogy-2026-04-12', '2026-04-12', 199]]);
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
  for (const view of post) {
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
  assert.ok(results.filter((r) => r.surplus_votes != null).every((r) => r.votes_for_list_seat_allocation === r.votes + r.surplus_votes), 'surplus votes are an allocation input, never added to votes');
});

test('shares and turnout are computed, labelled as computed, and never carry the application\'s printed figures', () => {
  const results = read(`${STORE}/election_results.json`);
  // Only the 1998 threshold page prints list shares; they are kept as printed (two decimals, the same valid-round denominator).
  const printed = results.filter((r) => r.published_vote_share !== null);
  assert.ok(printed.length === 15 && printed.every((r) => r.vote_type === 'hu98_territorial_list_valid_round_vote' && Math.round(r.derived_vote_share * 100) / 100 === r.published_vote_share));
  assert.ok(read(`${STORE}/election_turnout.json`).filter((t) => !['1998', '2002', '2006', '2010'].some((y) => t.election_id.includes(`-${y}-`))).every((t) => t.published_turnout === null), '2014-2026: no printed percentage; 1998-2010 print their round turnout');
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

test('whole chamber: 93 list + 106 constituency = 199 in every election, with the official 2026 totals', () => {
  const seats = (view, label) => { const r = view.national.ballots.flatMap((b) => b.results).find((x) => x.nativeLabel === label); return [r.seats, r.constituencySeats, r.chamberSeats]; };
  for (const view of post) {
    const all = view.national.ballots.flatMap((b) => b.results);
    assert.equal(view.national.chamberAttribution, 'complete');
    const independent = view === v18 ? 1 : 0;
    assert.deepEqual(view.national.seatTiers, independent ? { nationalList: 93, constituency: 106, independentConstituency: 1 } : { nationalList: 93, constituency: 106 });
    assert.equal(all.reduce((n, r) => n + r.seats, 0), 93, 'national list seats, party plus nationality lists');
    assert.equal(all.reduce((n, r) => n + r.constituencySeats, 0) + independent, 106, 'an independent district seat is counted, attributed to no list');
    assert.equal(all.reduce((n, r) => n + r.chamberSeats, 0) + independent, 199);
    assert.ok(all.every((r) => r.seats + r.constituencySeats === r.chamberSeats));
    assert.ok(view.national.ballots[1].results.every((r) => r.constituencySeats === 0), 'a nationality list holds no constituency seat');
    assert.equal(view.system.baseSeats, 199);
    assert.match(view.notes.en, /Every seat is attributed here/);
    for (const r of view.results) assert.equal(national.voteSeatDifference(view, r), null, 'list votes are never set against whole-chamber seats');
  }
  assert.deepEqual(seats(v26, 'Tisztelet és Szabadság Párt'), [45, 96, 141]);
  assert.deepEqual(seats(v26, 'FIDESZ - Magyar Polgári Szövetség-Kereszténydemokrata Néppárt'), [42, 10, 52]);
  assert.deepEqual(seats(v26, 'Mi Hazánk Mozgalom'), [6, 0, 6]);
  assert.deepEqual(seats(v22, 'FIDESZ - MAGYAR POLGÁRI SZÖVETSÉG-KERESZTÉNYDEMOKRATA NÉPPÁRT'), [48, 87, 135]);
  assert.deepEqual(seats(v22, v22.results.find((r) => r.contestantKind === 'coalition' && /PÁRBESZÉD/.test(r.nativeLabel)).nativeLabel), [38, 19, 57]);
  assert.deepEqual(seats(v22, 'MI HAZÁNK MOZGALOM'), [6, 0, 6]);
  assert.deepEqual(seats(v22, 'MAGYARORSZÁGI NÉMETEK ORSZÁGOS ÖNKORMÁNYZATA'), [1, 0, 1], 'the elected nationality-list representative is kept');
  assert.ok(v26.national.ballots[1].results.every((r) => r.seats === 0));
  // 2018 (minutes annexed to the Kúria's review decisions) and 2014 (minutes form and seat calculation), admitted 2026-11-20.
  assert.deepEqual(seats(v18, 'FIDESZ - MAGYAR POLGÁRI SZÖVETSÉG – KERESZTÉNYDEMOKRATA NÉPPÁRT'), [42, 91, 133]);
  assert.deepEqual(seats(v18, 'JOBBIK MAGYARORSZÁGÉRT MOZGALOM'), [25, 1, 26]);
  assert.deepEqual(seats(v18, 'MAGYAR SZOCIALISTA PÁRT – PÁRBESZÉD MAGYARORSZÁGÉRT PÁRT'), [12, 8, 20]);
  assert.deepEqual(seats(v18, 'DEMOKRATIKUS KOALÍCIÓ'), [6, 3, 9]);
  assert.deepEqual(seats(v18, 'LEHET MÁS A POLITIKA'), [7, 1, 8]);
  assert.deepEqual(seats(v18, 'EGYÜTT - A KORSZAKVÁLTÓK PÁRTJA'), [0, 1, 1], 'a district seat without a list seat');
  assert.deepEqual(seats(v18, 'MAGYARORSZÁGI NÉMETEK ORSZÁGOS ÖNKORMÁNYZATA'), [1, 0, 1]);
  assert.deepEqual(seats(v14, 'FIDESZ-KDNP'), [37, 96, 133]);
  assert.deepEqual(seats(v14, 'MSZP-EGYÜTT-DK-PM-MLP'), [28, 10, 38]);
  assert.deepEqual(seats(v14, 'JOBBIK'), [23, 0, 23]);
  assert.deepEqual(seats(v14, 'LMP'), [5, 0, 5]);
  assert.equal(read(`${STORE}/legislatures.json`).find((l) => l.election_id === v18.electionId).independent_constituency_seats, 1);
  assert.match(v18.notes.en, /independent candidate: counted in the 106 district seats and the 199, attributed to no list, and not named/);
  assert.deepEqual([v14.results.reduce((n, r) => n + r.votes, 0), v18.results.reduce((n, r) => n + r.votes, 0)], [5027820, 5694751]);
  assert.deepEqual([v14.eligibleVoters, v14.voters, v18.eligibleVoters, v18.voters], [8241488, 5096524, 8312173, 5796268]);
});

test('2014 and 2018: the recorded allocation recomputes, and the person-named 2014 list is stored without the name', () => {
  assert.deepEqual(highestAverages([598945, 1137611, 4043069, 2351104, 697128], 92), [6, 12, 42, 25, 7]);
  assert.deepEqual(highestAverages([3205661, 513605, 2432492, 2021113], 93), [37, 5, 28, 23]);
  for (const year of ['2014', '2018']) assert.equal(reconcile(evidence.minutes[year]).listSeats, 93);
  const m18 = evidence.minutes['2018'];
  assert.deepEqual(m18.preferential_seats, [1]);
  assert.equal(m18.list_seats_to_distribute, 92);
  assert.match(m18.document_status, /Kúria/);
  assert.equal(evidence.minutes['2014'].source_form, 'html_minutes_form');
  assert.throws(() => reconcile({ ...structuredClone(m18), constituency_minutes_summarised: null }), /constituency minutes/, 'only the minutes-form source may omit the count of constituency minutes');
  const comp = evidence.chamber_composition['2018'];
  assert.throws(() => reconcileComposition(m18, { ...structuredClone(comp), independent_constituency_seats: 0 }), /constituency seats ≠ 106/);
  assert.throws(() => reconcileComposition(m18, { ...structuredClone(comp), independent_constituency_seats: 2 }), /constituency seats ≠ 106/);
  const named = read(`${STORE}/electoral_contestants.json`).find((c) => c.label_basis === 'partial_personal_name_omitted' && c.election_id === 'el-hu-ogy-2014-04-06');
  assert.equal(named.election_id, 'el-hu-ogy-2014-04-06');
  assert.equal(named.registered_label_native, '… SZÖVETSÉGESEI');
  assert.match(named.printed_label_sha256, /^[0-9a-f]{64}$/);
  const personLabel = /[A-ZÁÉÍÓÖŐÚÜŰ]{2,} [A-ZÁÉÍÓÖŐÚÜŰ]{2,} SZÖVETSÉGESEI/; // two words before the list noun would be the omitted name
  assert.doesNotMatch(fs.readFileSync(path.join(root, EVIDENCE), 'utf8'), personLabel, 'the personal name is not in the evidence');
  for (const dir of [STORE, 'public/research-data/political/hungary']) for (const f of fs.readdirSync(path.join(root, dir))) assert.doesNotMatch(fs.readFileSync(path.join(root, dir, f), 'utf8'), personLabel, f);
});

test('seat shares use the denominator of their scope: whole chamber ÷ 199, list tier ÷ 93, never list seats ÷ 199', () => {
  const tisza = v26.results.find((r) => r.nativeLabel === 'Tisztelet és Szabadság Párt');
  assert.equal(explorer.seatMeasureScope(v26), 'whole_chamber');
  assert.equal(explorer.measureValue(tisza, v26, 'seats'), 141);
  assert.equal(explorer.measureValue(tisza, v26, 'seat_share'), 100 * 141 / 199);
  assert.equal(explorer.chamberSeatShare(tisza, v26), 100 * 141 / 199);
  assert.equal(explorer.listTierSeatShare(tisza, v26), 100 * 45 / 93);
  assert.notEqual(explorer.measureValue(tisza, v26, 'seat_share'), 100 * 45 / 199);
  // The same election without attribution falls back to the list tier, and nothing is shown as whole-chamber representation.
  const tier = { ...v26, national: { ...v26.national, chamberAttribution: 'none' }, results: v26.results.map((r) => ({ ...r, constituencySeats: null, chamberSeats: null })) };
  const t = tier.results.find((r) => r.nativeLabel === 'Tisztelet és Szabadság Párt');
  assert.equal(explorer.seatMeasureScope(tier), 'national_list_tier');
  assert.equal(explorer.chamberSeats(t, tier), null);
  assert.equal(explorer.chamberSeatShare(t, tier), null);
  assert.equal(explorer.measureValue(t, tier, 'seats'), 45);
  assert.equal(explorer.measureValue(t, tier, 'seat_share'), 100 * 45 / 93);
  const country = explorer.compareCountries(tier, data.politicalElectionViews().at(-1));
  assert.equal(country.rows.find((r) => r.key === 'seat_lists').a, null, 'a list-tier election has no whole-chamber count across countries');
  assert.equal(explorer.compareCountries(v26, data.politicalElectionViews().at(-1)).rows.find((r) => r.key === 'seat_lists').a, 3);
  assert.equal(explorer.compareElections(tier, v22).find((r) => r.key === 'seat_lists').difference, null, 'list-tier and whole-chamber counts are not differenced');
  // Whole-chamber elsewhere is unchanged: seats ÷ chamber size.
  const de = data.politicalElectionViews().at(-1);
  assert.equal(explorer.seatMeasureScope(de), 'whole_chamber');
  assert.equal(explorer.measureValue(de.results[0], de, 'seat_share'), explorer.descriptiveShare(de.results[0].seats, de.totalSeats));
  for (const v of [...data.politicalCzechElectionViews(), ...data.politicalPolishElectionViews(), ...data.politicalSlovakElectionViews()]) assert.equal(explorer.seatMeasureScope(v), 'whole_chamber', v.electionId);
});

test('composition fails closed: an unattributed, mismatched or missing seat stops the build', () => {
  const m = evidence.minutes['2026'], comp = evidence.chamber_composition['2026'];
  const of = reconcileComposition(m, comp);
  assert.equal(of('party', 2), 96);
  assert.equal(of('party', 4), 0, 'a list the page does not show holds no seat, because the page accounts for all 199');
  const change = (f) => { const c = structuredClone(comp); f(c); return c; };
  assert.throws(() => reconcileComposition(m, change((c) => { c.rows[0].list_seats = 44; c.rows[0].total_seats = 140; })), /differ from the minutes/);
  assert.throws(() => reconcileComposition(m, change((c) => { c.rows[0].constituency_seats = 95; })), /list plus constituency/);
  assert.throws(() => reconcileComposition(m, change((c) => { c.rows[0].constituency_seats = 95; c.rows[0].total_seats = 140; })), /constituency seats ≠ 106/);
  assert.throws(() => reconcileComposition(m, change((c) => { c.rows.push({ ballot: 'party', row: 9, list_seats: 0, constituency_seats: 0, total_seats: 0 }); })), /not a list of the minutes/);
  assert.throws(() => reconcileComposition(m, change((c) => { c.rows.pop(); })), /missing from the page/);
  assert.throws(() => reconcileComposition(m, change((c) => { c.unattributed_seats = 1; })), /outside the lists/);
  assert.throws(() => reconcileComposition(evidence.minutes['2022'], change((c) => { c.rows.push({ ballot: 'nationality', row: 10, list_seats: 0, constituency_seats: 1, total_seats: 1 }); })), /another election/);
  assert.ok(Object.values(evidence.chamber_composition).every((c) => /names .*not recorded/.test(c.method)));
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
  for (const view of post) assert.ok(view.national.ballots.flatMap((b) => b.results).every((r) => r.partyId === null && r.memberPartyIds.length === 0));
  for (const store of ['contestant_members', 'political_parties', 'party_identity_links']) assert.ok(!fs.existsSync(path.join(root, STORE, `${store}.json`)), store);
  assert.ok(contestants.every((c) => c.continuous_series_eligible === false && c.lead_party_id === null));
  assert.equal(read('public/research-data/political/hungary/manifest.json').continuous_party_series, 0);
  assert.equal(read('public/research-data/political/hungary/manifest.json').coverage, 'whole_chamber_all_seats_attributed_386_in_1998_2002_2006_2010_199_from_2014');
  const ids = (year, re) => evidence.minutes[year].party_lists.filter((l) => re.test(l.label)).map((l) => l.id);
  assert.notDeepEqual(ids('2022', /^MI HAZÁNK/i), ids('2026', /^Mi Hazánk/i), 'the minutes number nominating organisations per election, so an id is no identity');
  assert.notDeepEqual(ids('2022', /KUTYA/i), ids('2026', /Kutya/i));
});

test('evidence: rights limits recorded, checksums only, no PDF, no CSV, no personal names', () => {
  assert.match(evidence.rights.quote, /hivatalos közlemények és ügyiratok/);
  assert.match(evidence.rights.statutory_publication.quote, /eredményét megállapító jegyzőkönyvek tartalmát/);
  assert.match(evidence.rights.limits.join(' '), /No licence or written permission exists/);
  assert.match(evidence.rights.limits.join(' '), /were not read and could contain conditions/);
  assert.match(evidence.rights.database_right.finding, /not settled/);
  assert.match(evidence.csv_check.finding, /generated in the browser/);
  assert.deepEqual(evidence.not_admitted.elections, [1994, 1990]);
  assert.match(evidence.minutes['2014'].url, /^https:\/\/static\.valasztas\.hu\//);
  for (const year of ['2018', '2022', '2026']) { assert.match(evidence.minutes[year].pdf_sha256, /^[0-9a-f]{64}$/); assert.match(evidence.minutes[year].url, /^https:\/\/static\.valasztas\.hu\//); }
  const dir = path.join(root, 'docs/political-data/raw/hungary/ogy');
  assert.deepEqual(fs.readdirSync(dir), ['evidence.json']);
  assert.ok(!fs.readdirSync(path.join(root, 'public/research-data/political/hungary')).some((f) => /partlistak|\.pdf$/.test(f)));
  for (const s of read(`${STORE}/political_source_registry.json`)) { assert.equal(sha(s.raw_path), s.raw_sha256, s.source_id); assert.doesNotMatch(s.url, /www\.valasztas\.hu/); if (/vtr\.valasztas\.hu/.test(s.url)) assert.match(s.source_id, /^src-hu-nvi-composition-20(22|26)$/, 'the application is a source only for composition counts'); assert.match(s.licence_url, /njt\.jog\.gov\.hu/); }
  const fields = read(`${STORE}/electoral_contestants.json`).flatMap((c) => Object.keys(c));
  assert.ok(!fields.some((k) => /candidate|person|deput/i.test(k)));
  const net = read('docs/legal-security/network_acquisition_registry.json').hosts;
  assert.equal(net.find((h) => h.host === 'www.valasztas.hu').status, 'blocked');
  for (const host of ['vtr.valasztas.hu', 'static.valasztas.hu', 'njt.hu', 'njt.jog.gov.hu']) assert.equal(net.find((h) => h.host === host).automation_allowed, false, host);
});

test('admission: exact hashes, closed gates, Germany inadmissible', () => {
  const records = read(POLITICAL_ADMISSION_FILE).admissions.filter((x) => x.country === 'hungary');
  assert.deepEqual(records.map((x) => x.admission_id), ['hungary-ogy-2022-2026', 'hungary-ogy-2014-2018', 'hungary-ogy-2010', 'hungary-ogy-2002-2006', 'hungary-ogy-wording-2026-11-23', 'hungary-ogy-1998']);
  for (const record of ['docs/political-data/hungary_ogy_admission.json', 'docs/political-data/hungary_ogy2014_2018_admission.json', 'docs/political-data/hungary_ogy2010_admission.json', 'docs/political-data/hungary_ogy2002_2006_admission.json', 'docs/political-data/hungary_ogy_wording_2026_11_23_admission.json', 'docs/political-data/hungary_ogy1998_admission.json']) for (const gate of MANDATORY_ADMISSION_GATES) assert.equal(read(record).gates[gate].status, 'closed', gate);
  const { approved, problems } = approvedPoliticalAdmissionFiles(records, sha);
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...POLITICAL_ADMISSIONS['hungary-ogy-2022-2026'].paths].sort());
  for (const [file, hash] of approved) assert.equal(sha(file), hash, file);
  assert.ok(approvedPoliticalAdmissionFiles([{ ...records[0], files: [...records[0].files, { path: 'src/data/political/germany/elections.json', sha256: 'a'.repeat(64) }] }], sha).problems.length);
});

test('other countries are unchanged; research functions run for Hungary without new claims', () => {
  assert.deepEqual(data.politicalHungarianComparisonCountries().map((c) => c.slug), ['germany', 'czechia', 'poland', 'slovakia', 'serbia']);
  assert.deepEqual([data.politicalElectionViews().length, data.politicalCzechElectionViews().length, data.politicalPolishElectionViews().length, data.politicalSlovakElectionViews().length], [7, 7, 4, 1]); // Czechia 2002–2013 admitted 2026-11-21
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
  assert.equal(rows.length, 40); // 2002 and 2006 admitted 2026-11-22; 1998 admitted 2026-11-23
  assert.ok(rows.every((r) => r.publishedBeforeElection.status !== 'documented'), 'no release was read for Hungary, so none is claimed');
});

test('2010 (Act XXXIV of 1989): 386 seats in three tiers and two rounds, ballots kept apart, every check fail-closed', () => {
  const x = evidence.act_xxxiv_1989['2010'];
  assert.deepEqual([v10.electionId, v10.date, v10.national.dateEnd, v10.totalSeats], ['el-hu-ogy-2010-04-11', '2010-04-11', '2010-04-25', 386]);
  assert.deepEqual(v10.national.ballots.map((b) => [b.definition.id, b.definition.kind, b.definition.seatScope, b.validVotes]), [['hu10_territorial_list_vote', 'list', 'tier_only', 5132531], ['hu10_smc_round1_vote', 'constituency', 'unavailable', 5114570], ['hu10_smc_round2_vote', 'constituency', 'unavailable', 1152693]]);
  for (const b of v10.national.ballots) assert.equal(b.results.reduce((n, r) => n + r.votes, 0), b.validVotes, 'each ballot adds up to its own total; ballots are never pooled');
  assert.ok(v10.national.ballots.slice(1).every((b) => b.results.every((r) => r.seats === null && r.chamberSeats === null)), 'candidate-vote ballots carry no seats');
  const seats = (label) => { const r = v10.results.find((x) => x.nativeLabel === label); return [r.seats, r.constituencySeats, r.chamberSeats]; };
  assert.deepEqual(seats('FIDESZ-KDNP'), [90, 172, 262]);
  assert.deepEqual(seats('MSZP'), [57, 2, 59]);
  assert.deepEqual(seats('Jobbik'), [47, 0, 47]);
  assert.deepEqual(seats('LMP'), [16, 0, 16]);
  assert.deepEqual(seats('MDF'), [0, 0, 0], 'a zero-seat list stays a row');
  assert.deepEqual(v10.national.seatTiers, { nationalList: 210, constituency: 176, outsideListConstituency: [{ label: 'FIDESZ-KDNP-MVMP', kind: 'joint_candidates_without_list', seats: 1 }, { label: 'Független', kind: 'independent_candidate', seats: 1 }] });
  assert.equal(v10.results.reduce((n, r) => n + r.chamberSeats, 0) + 2, 386);
  const leg = read(`${STORE}/legislatures.json`).find((l) => l.election_id === v10.electionId);
  assert.deepEqual([leg.territorial_list_seats, leg.national_compensation_seats, leg.statutory_tiers.territorial_lists, leg.statutory_tiers.national_compensation_minimum, leg.tier_transfer.seats], [146, 64, 152, 58, 6]);
  assert.deepEqual(highestAverages([925252, 135592, 1221523, 471305], 64), [21, 3, 29, 11]);
  assert.equal(explorer.turnoutForDisplay(v10).value, 64.38, 'the printed round-1 turnout');
  assert.equal(read(`${STORE}/election_turnout.json`).find((t) => t.election_id === v10.electionId && t.round_2).round_2.published_turnout, 46.66);
  assert.deepEqual(read(`${STORE}/elections.json`).find((e) => e.election_id === v10.electionId).rounds, [{ round: 1, date: '2010-04-11' }, { round: 2, date: '2010-04-25' }]);
  assert.match(v10.notes.en, /never pooled/);
  const contestants = read(`${STORE}/electoral_contestants.json`).filter((c) => c.election_id === v10.electionId);
  assert.equal(contestants.filter((c) => c.contestant_id.includes('-t')).length, 10);
  assert.equal(contestants.filter((c) => c.contestant_id.includes('-c')).length, 20);
  assert.equal(contestants.find((c) => c.label_basis === 'partial_personal_name_omitted').historical_display_label, '…-KISGAZDA');
  assert.doesNotMatch(fs.readFileSync(path.join(root, EVIDENCE), 'utf8'), /[A-ZÁÉÍÓÖŐÚÜŰ]{4,}-KISGAZDA/, 'the name in the organisation label is not stored');
  const change = (f) => { const c = structuredClone(x); f(c); return c; };
  assert.throws(() => reconcile2010(change((c) => { c.territorial_lists[0].votes += 1; })), /territorial list votes/);
  assert.throws(() => reconcile2010(change((c) => { c.compensation.lists[0].seats += 1; c.compensation.lists[1].seats -= 1; })), /compensation seats/);
  assert.throws(() => reconcile2010(change((c) => { c.composition.rows[1].smc -= 1; c.composition.rows[1].total -= 1; })), /composition totals|single-member seats/);
  assert.throws(() => reconcile2010(change((c) => { c.round1.printed_turnout_percent = 64.4; })), /printed turnout/);
  assert.throws(() => reconcile2010(change((c) => { c.territorial_seats_total = 152; })), /territorial seats|compensation seats/);
});


test('2002 and 2006 (Act XXXIV of 1989 as amended in 1994 and 1997): 386 seats each, statutory and final tiers kept apart, every check fail-closed', () => {
  const v02 = views.find((v) => v.year === 2002), v06 = views.find((v) => v.year === 2006);
  assert.deepEqual([v02.electionId, v02.national.dateEnd, v06.electionId, v06.national.dateEnd], ['el-hu-ogy-2002-04-07', '2002-04-21', 'el-hu-ogy-2006-04-09', '2006-04-23']);
  assert.deepEqual(v02.national.ballots.map((b) => [b.definition.id, b.definition.seatScope, b.validVotes]), [['hu02_territorial_list_vote', 'tier_only', 5616750], ['hu02_smc_round1_vote', 'unavailable', 5624595], ['hu02_smc_round2_vote', 'unavailable', 4395458]]);
  assert.deepEqual(v06.national.ballots.map((b) => [b.definition.id, b.definition.seatScope, b.validVotes]), [['hu06_territorial_list_vote', 'tier_only', 5408050], ['hu06_smc_round1_vote', 'unavailable', 5403675], ['hu06_smc_round2_vote', 'unavailable', 3239752]]);
  for (const v of [v02, v06]) for (const b of v.national.ballots) assert.equal(b.results.reduce((n, r) => n + r.votes, 0), b.validVotes, 'each ballot adds up to its own total; ballots are never pooled');
  const seats = (v, label) => { const r = v.results.find((x) => x.nativeLabel === label); return [r.seats, r.constituencySeats, r.chamberSeats]; };
  assert.deepEqual([seats(v02, 'FIDESZ-MDF'), seats(v02, 'MSZP'), seats(v02, 'SZDSZ'), seats(v02, 'MIÉP')], [[93, 95, 188], [100, 78, 178], [17, 2, 19], [0, 0, 0]]);
  assert.deepEqual([seats(v06, 'MSZP'), seats(v06, 'FIDESZ-KDNP'), seats(v06, 'SZDSZ'), seats(v06, 'MDF'), seats(v06, 'MIÉP-Jobbik')], [[88, 98, 186], [96, 68, 164], [15, 3, 18], [11, 0, 11], [0, 0, 0]]);
  assert.deepEqual(v02.national.seatTiers.outsideListConstituency, [{ label: 'MSZP-SZDSZ', kind: 'joint_candidates_without_list', seats: 1 }]);
  assert.deepEqual(v06.national.seatTiers.outsideListConstituency, [{ label: 'MSZP-SZDSZ', kind: 'joint_candidates_without_list', seats: 6 }, { label: 'SOMOGYÉRT', kind: 'organisation_candidates_without_list', seats: 1 }]);
  const legs = read(`${STORE}/legislatures.json`);
  const tiers = (id) => { const l = legs.find((x) => x.election_id === id); return [l.constituency_seats, l.territorial_list_seats, l.national_compensation_seats, l.total_seats, l.statutory_tiers.territorial_lists, l.statutory_tiers.national_compensation_minimum, l.tier_transfer.seats]; };
  assert.deepEqual(tiers(v02.electionId), [176, 140, 70, 386, 152, 58, 12], 'statutory 176 / 152 / 58; final 176 + 140 + 70');
  assert.deepEqual(tiers(v06.electionId), [176, 146, 64, 386, 152, 58, 6], 'statutory 176 / 152 / 58; final 176 + 146 + 64');
  assert.deepEqual(highestAverages([1013491, 529486, 1211078], 70), [26, 13, 31]);
  assert.deepEqual(highestAverages([551505, 878324, 467335, 1332428], 64), [11, 17, 9, 27]);
  const turnout = read(`${STORE}/election_turnout.json`);
  assert.deepEqual([v02, v06].map((v) => { const t = turnout.find((x) => x.election_id === v.electionId && x.round_2); return [explorer.turnoutForDisplay(v).value, t.round_2.published_turnout, t.round_2.constituencies]; }), [[70.53, 73.51, 131], [67.83, 64.39, 110]]);
  const results = read(`${STORE}/election_results.json`);
  const r2 = (id, label) => results.find((r) => r.election_id === id && r.vote_type.endsWith('round2_vote') && read(`${STORE}/electoral_contestants.json`).find((c) => c.contestant_id === r.contestant_ref).registered_label_native === label);
  assert.deepEqual([r2(v06.electionId, 'MSZP').round2_seats_derived, r2(v06.electionId, 'FIDESZ-KDNP').round2_seats_derived, r2(v02.electionId, 'FIDESZ-MDF').round2_seats_derived], [64, 40, 75]);
  const contestants = read(`${STORE}/electoral_contestants.json`);
  assert.deepEqual([v02, v06].map((v) => [contestants.filter((c) => c.election_id === v.electionId && c.contestant_id.includes('-t')).length, contestants.filter((c) => c.election_id === v.electionId && c.contestant_id.includes('-c')).length]), [[13, 24], [15, 26]], 'every territorial list and every single-member nominating group');
  assert.deepEqual(contestants.filter((c) => /ogy0[26]-t/.test(c.contestant_id) && c.contestant_kind === 'coalition').map((c) => c.registered_label_native), ['FIDESZ-MDF', 'FIDESZ-KDNP'], 'joint lists stay whole');
  assert.ok(contestants.filter((c) => /ogy0[26]/.test(c.contestant_id)).every((c) => c.lead_party_id === null && c.continuous_series_eligible === false), 'no link to any other election');
  const links = read('src/lib/institutions/election_links.json').elections.filter((l) => ['el-hu-ogy-2002-04-07', 'el-hu-ogy-2006-04-09', 'el-hu-ogy-2010-04-11'].includes(l.election_id));
  for (const l of links) assert.deepEqual([l.institutional_period_id, l.constitution_id, l.changes_in_force, l.amendments_in_force], ['hungary-period-1989-10-30', 'hu-constitution-1949-as-amended-1989', ['hu-1989-constitution-amendment', 'hu-1989-electoral-act'], ['hu-1994-electoral-act-amendment', 'hu-1997-electoral-act-amendment']], l.election_id);
  const act = read('src/lib/institutions/countries/hungary.json').changes.find((c) => c.change_id === 'hu-1989-electoral-act');
  assert.deepEqual(act.amendments.map((a) => [a.act, a.adopted, a.promulgated, a.effective]), [['Act III of 1994', '1993-12-22', '1994-01-20', '1994-01-20'], ['Act XCVI of 1997', '1997-10-14', '1997-10-21', '1997-11-05']]);
  assert.match(evidence.act_xxxiv_1989_statute.provisions['§ 8(5)'].text_origin, /Act XCVI of 1997 § 2/);
  for (const year of ['2002', '2006']) {
    const x = evidence.act_xxxiv_1989[year];
    const change = (f) => { const c = structuredClone(x); f(c); return c; };
    assert.throws(() => reconcileEarly(change((c) => { c.territorial_lists[0].votes += 1; })), /territorial list votes/);
    assert.throws(() => reconcileEarly(change((c) => { const v = c.compensation.lists.filter((l) => l.seats > 0); v[0].seats += 1; v[1].seats -= 1; })), /compensation seats/);
    assert.throws(() => reconcileEarly(change((c) => { c.composition.rows[0].smc -= 1; c.composition.rows[0].total -= 1; })), /composition totals|single-member seats/);
    assert.throws(() => reconcileEarly(change((c) => { c.round1.printed_turnout_percent += 0.01; })), /printed turnout/);
    assert.throws(() => reconcileEarly(change((c) => { c.territorial_seats_total = 152; })), /territorial seats|compensation seats/);
    assert.throws(() => reconcileEarly(change((c) => { c.territorial_lists.at(-1).evaluation = 'may_win'; })), /threshold finding/);
    assert.throws(() => reconcileEarly(change((c) => { c.smc[0].round1_seats += 1; })), /round-1 seats|single-member/);
  }
  assert.doesNotMatch(JSON.stringify(evidence.act_xxxiv_1989['2002']) + JSON.stringify(evidence.act_xxxiv_1989['2006']), /jelölt neve|képviselő neve/i);
});

test('wording 2026-11-23: three-or-more-party joint lists in Chinese; numbers, operators and English unchanged; 2010 gains no entry', () => {
  const systems = read(`${STORE}/electoral_systems.json`);
  const larger = systems.flatMap((s) => (s.national_rules?.thresholds ?? []).filter((t) => /more than two parties/.test(t.appliesTo)).map((t) => [s.election_id.slice(10, 14), t]));
  assert.deepEqual(larger.map(([y]) => y).sort(), ['1998', '2002', '2006', '2014', '2018', '2022', '2026']);
  for (const [y, t] of larger) {
    assert.equal(t.percent, 15, y);
    assert.match(t.description['zh-CN'], /三个或更多政党的联合名单/, y);
    assert.doesNotMatch(t.description['zh-CN'], /两党以上/, y);
    assert.match(t.description.en, y < '2014' ? /must reach 15% of the same total/ : /below 15% of the same total wins no list seat/, y);
  }
  assert.equal(systems.find((s) => s.election_id === 'el-hu-ogy-2010-04-11').national_rules.thresholds.some((t) => /more than two/.test(t.appliesTo)), false);
  const hu = read('src/lib/institutions/countries/hungary.json');
  const a97 = hu.changes.find((c) => c.change_id === 'hu-1989-electoral-act').amendments.find((a) => a.amendment_id === 'hu-1997-electoral-act-amendment');
  assert.match(a97.summary.zh, /须超过 5%/);
  assert.match(a97.summary.zh, /两党联合名单至少 10%，三个或更多政党的联合名单至少 15%/);
  assert.match(a97.summary.en, /more than 5% .* at least 10% .* more than two parties at least 15%/);
  const pending = hu.pending.find((p) => p.field === 'changes_before_2012').reason;
  for (const text of [pending.en, pending.zh]) for (const act of [/III/, /XCVI/]) assert.match(text, act);
  assert.match(pending.en, /calculation annexes/); assert.match(pending.en, /not otherwise been verified/);
});

test('1998: the territorial-list ballot is a valid-round composite, never a round-1 ballot; scopes and denominators stay apart', () => {
  const scope = require('../../src/lib/politicalRoundScope.ts');
  const v98 = views.find((v) => v.year === 1998);
  const systems = read(`${STORE}/electoral_systems.json`), turnout = read(`${STORE}/election_turnout.json`).filter((t) => t.election_id === 'el-hu-ogy-1998-05-10');
  const defs = systems.find((x) => x.election_id === 'el-hu-ogy-1998-05-10').vote_definitions;
  const [list, r1, r2] = [VT98.territorial, VT98.smc1, VT98.smc2].map((id) => [defs.find((d) => d.id === id), turnout.find((t) => t.vote_type === id)]);
  // Composite: no round, turnout, electorate or invalid count; two parts that add up, the round-2 part marked derived.
  assert.equal(scope.roundScopeOf(list[0]), 'valid_round_composite');
  assert.deepEqual(scope.roundScopeProblems(...list), []);
  assert.equal(scope.singleRoundTurnout(...list), null);
  assert.deepEqual(list[1].round_composition.map((p) => [p.round, p.territorial_districts, p.votes, p.votes_basis]), [[1, 18, 4064201, 'published'], [2, 2, 483481, 'derived_difference_of_published_totals']]);
  assert.equal(list[1].actual_round1_ballot.valid_ballots, 4483974, 'the real round-1 territorial ballot (all 20 districts) is kept apart');
  assert.notEqual(list[1].actual_round1_ballot.valid_ballots, list[1].valid_votes);
  assert.equal(v98.publishedTurnout, null, 'no turnout is attached to the composite list ballot');
  assert.deepEqual(v98.national.rounds.map(r => [r.turnout, r.electorateScope, r.constituencyCount, r.sourceBallotId, r.date]), [
    [56.26, 'national', 176, VT98.smc1, '1998-05-10'], [57.01, 'restricted', 175, VT98.smc2, '1998-05-24'],
  ]);
  // The same round can have different geographies: round 2 is 175 constituencies for single-member votes and 2 districts for lists.
  assert.deepEqual([scope.singleRoundTurnout(...r1), scope.singleRoundTurnout(...r2)].map((x) => [x.round, x.publishedTurnout, x.eligibleVoters, x.geographicScope]), [[1, 56.26, 8062708, { single_member_constituencies: 176 }], [2, 57.01, 8016397, { single_member_constituencies: 175 }]]);
  assert.deepEqual(list[1].round_composition[1].districts.map((d) => [d.eligible_voters, d.published_turnout]), [[427395, 56.16], [440557, 56.56]]);
  const [lo, hi] = impliedValidBounds(evidence.act_xxxiv_1989['1998'].round2.territorial_districts.rows);
  assert.ok(lo <= 483481 && 483481 <= hi && hi - lo < 200, 'the derived round-2 part agrees with the printed district percentages');
  // A record that names a round or carries a turnout on the composite is rejected.
  assert.ok(scope.roundScopeProblems(list[0], { ...list[1], round: 1 }).length);
  assert.ok(scope.roundScopeProblems(list[0], { ...list[1], published_turnout: 56.26 }).length);
  assert.ok(scope.roundScopeProblems(list[0], { ...list[1], valid_votes: 4483974 }).length);
  // Older records keep their meaning without the new fields.
  assert.equal(scope.roundScopeOf(systems.find((x) => x.election_id === 'el-hu-ogy-2002-04-07').vote_definitions[0]), 'single_round');
});

test('1998: single-member rows are source-apportioned party totals; original groups only where the office prints them', () => {
  const v98 = views.find((v) => v.year === 1998);
  const results = read(`${STORE}/election_results.json`).filter((r) => r.election_id === 'el-hu-ogy-1998-05-10');
  const smc = results.filter((r) => r.vote_type !== VT98.territorial);
  assert.ok(smc.every((r) => ['source_apportioned_party_total', 'independent_candidates_aggregate'].includes(r.attribution_basis)));
  assert.ok(smc.every((r) => r.seats === null && r.single_member_seats_won_final === undefined && r.round1_seats === undefined), 'first-named-party seats never use the original-group seat fields');
  assert.ok(v98.national.ballots.filter((b) => b.definition.id !== VT98.territorial).every((b) => b.results.every((r) => r.districtSeatsThisRound === undefined)));
  const fidesz2 = smc.find((r) => r.vote_type === VT98.smc2 && r.result_id.endsWith('c01-r2'));
  assert.deepEqual(fidesz2.nomination_group_components.map((g) => [g.label, g.votes, g.seats]), [['Fidesz', 1085538, 55], ['Fidesz-MDF', 620617, 35]]);
  assert.equal(fidesz2.votes, 1085538 + 620617);
  assert.ok(smc.filter((r) => r.vote_type === VT98.smc1).every((r) => r.nomination_group_components === undefined), 'no original groups are claimed for round 1');
  assert.equal(smc.find((r) => r.result_id.endsWith('c01-r1')).round1_table_votes, 956008, 'the round-1 table differs by 98 votes; kept as a recorded discrepancy');
  // Chamber: original groups from the composition page — 335 list-linked + 50 joint Fidesz/MDF + 1 independent = 386.
  const leg = read(`${STORE}/legislatures.json`).find((l) => l.legislature_id === 'lg-hu-ogy-1998');
  assert.deepEqual(leg.constituency_seats_outside_lists.map((o) => [o.kind, o.seats]), [['joint_candidates_without_list', 50], ['independent_candidate', 1]]);
  const lists = results.filter((r) => r.vote_type === VT98.territorial);
  assert.equal(lists.reduce((n, r) => n + r.whole_chamber_seats, 0), 335);
  assert.deepEqual(['MAGYAR SZOCIALISTA PÁRT', 'Fidesz', 'MDF'].map((l) => { const r = v98.results.find((x) => x.nativeLabel === l); return [r.constituencySeats, r.chamberSeats, r.publishedVoteShare]; }), [[54, 134, 32.92], [55, 113, 29.48], [2, 2, 2.8]]);
  assert.deepEqual([leg.territorial_list_seats, leg.national_compensation_seats, leg.tier_transfer.seats], [128, 82, 24]);
  // No party continuity, no names.
  const contestants = read(`${STORE}/electoral_contestants.json`).filter((c) => c.election_id === 'el-hu-ogy-1998-05-10');
  assert.ok(contestants.every((c) => c.continuous_series_eligible === false && c.lead_party_id === null));
  const fields = []; JSON.stringify(evidence.act_xxxiv_1989['1998'], (k, v) => { fields.push([k, v]); return v; });
  assert.ok(!fields.some(([k]) => /(^|_)(names?|deput(y|ies))(_|$)/i.test(k)), 'no person field');
  assert.ok(fields.filter(([k]) => /^candidates$/.test(k)).every(([, v]) => Number.isSafeInteger(v)), 'candidates appear only as counts');
  assert.doesNotMatch(JSON.stringify(evidence.act_xxxiv_1989['1998']), /\bDr\. /, 'the round-1 notice names one deputy; no name is transcribed');
});

test('1998 reconciliation is fail-closed on every changed observation', () => {
  const base = evidence.act_xxxiv_1989['1998'];
  const mutate = (fn) => { const x = structuredClone(base); fn(x); return x; };
  assert.doesNotThrow(() => reconcile1998(base));
  for (const [what, fn, re] of [
    ['printed share', (x) => { x.territorial_lists[0].printed_percent = 32.93; }, /printed share/],
    ['composite total', (x) => { x.threshold_page.territorial_list_votes_total = 4483974; }, /territorial list votes/],
    ['round-1 part', (x) => { x.territorial_lists[1].votes_round1_valid_districts += 5000; x.territorial_round1_valid_districts_total += 5000; }, /outside the range/],
    ['invalid round districts', (x) => { x.round2.territorial_districts.total = 3; }, /districts whose round 1 was invalid/],
    ['round-2 constituencies', (x) => { x.round2.constituencies.total = 144; x.round2.constituencies.valid_decided = 144; }, /round 2 held/],
    ['nomination groups', (x) => { x.nomination_groups_round2.groups[2].votes += 1; }, /nomination groups|joint nomination|printed ratios/],
    ['joint seats', (x) => { x.composition.rows[0].outside.components[0].seats = 34; }, /joint-candidate seats/],
    ['compensation', (x) => { x.compensation.lists[0].seats = 12; x.compensation.lists[4].seats = 9; }, /compensation seats/],
    ['joint list', (x) => { x.territorial_lists[0].joint = true; }, /joint list/],
    ['5% border', (x) => { x.threshold_page.five_percent_exceed = 227385; }, /thresholds/],
    ['ballot accounting', (x) => { x.round1.territorial_ballot.invalid += 1; }, /invalid plus valid/],
  ]) assert.throws(() => reconcile1998(mutate(fn)), re, what);
});

test('1998 ballot switches restore each recorded electorate, interval, source basis and result attribution', () => {
  const primary = views.find(v => v.year === 1998);
  const records = read(`${STORE}/election_turnout.json`).filter(t => t.election_id === primary.electionId);
  const v02 = views.find(v => v.year === 2002);
  assert.equal(national.counterpartBallot(primary, v02).definition.id, v02.system.voteType);
  assert.equal(national.counterpartBallot(v02, primary).definition.id, VT98.territorial);
  assert.equal(explorer.compatibleVoteBasis(primary, v02), false);
  assert.equal(explorer.compareElections(primary, v02).find(r => r.key === 'turnout').difference, null);
  let selected = primary;
  for (const id of [VT98.smc1, VT98.territorial, VT98.smc2, VT98.smc1, VT98.smc2, VT98.territorial]) {
    selected = national.selectNationalBallot(selected, id);
    const raw = records.find(r => r.vote_type === id);
    const b = selected.national.ballots.find(b => b.definition.id === id);
    assert.deepEqual(b.turnoutRecord, raw);
    assert.deepEqual(selected.national.turnout, raw.turnout_basis);
    assert.deepEqual([selected.publishedTurnout, selected.eligibleVoters, selected.voters, selected.turnoutDefinition, b.invalidVotes],
      [raw.published_turnout, raw.eligible_voters, raw.voters, raw.turnout_definition, raw.invalid_votes]);
    const point = explorer.selectedElectionRound(selected);
    assert.equal(point?.round, raw.round);
    if (id === VT98.territorial) {
      assert.deepEqual([b.date, b.dateStart, b.dateEnd, b.validVotes], [undefined, '1998-05-10', '1998-05-24', 4547682]);
      assert.equal(b.sourceUrl, 'https://static.valasztas.hu/v98din2/l120.htm');
    } else {
      assert.equal(point.sourceBallotId, id);
      assert.equal(b.date, point.date);
      assert.ok(b.sourceUrl);
      assert.equal(point.constituencies, raw.round === 1 ? null : 175);
      assert.equal(selected.results.find(r => r.nativeLabel === 'Független').attribution_basis, 'independent_candidates_aggregate');
      assert.ok(selected.results.every(r => r.districtSeatsThisRound == null && r.seats == null));
    }
  }
  const r1 = national.selectNationalBallot(primary, VT98.smc1), r2 = national.selectNationalBallot(primary, VT98.smc2);
  const {nationalHistoryObservation} = require('../../src/lib/electionHistoryObservations.ts');
  assert.equal(nationalHistoryObservation(r2, 'en').turnout, null);
  const fidesz = e => e.results.find(r => r.nativeLabel === 'Fidesz');
  assert.deepEqual([fidesz(r1).round1_table_votes, fidesz(r1).votes], [956008, 956106]);
  assert.deepEqual(fidesz(r2).nomination_group_components.map(r => [r.label, r.seats]), [['Fidesz',55],['Fidesz-MDF',35]]);
  assert.equal(fidesz(r2).first_named_party_seats_final, 90);
  assert.ok(fidesz(r2).nomination_group_basis);
  assert.ok(fidesz(r2).provenance.some(p => p.source_record_id === 'nomination_groups'));
});

test('adapter rejects contradictory turnout, totals, geography and date on a composite ballot', () => {
  const {electionViewsFromStores} = require('../../src/lib/politicalStores.ts');
  const stems = {elections:'elections', turnout:'election_turnout', results:'election_results', contestants:'electoral_contestants',
    legislatures:'legislatures', systems:'electoral_systems', sources:'political_source_registry'};
  const stores = Object.fromEntries(Object.entries(stems).map(([key,file]) => [key, read(`${STORE}/${file}.json`)]));
  const meta = {slug:'hungary',name:{en:'Hungary','zh-CN':'匈牙利'},voteLabel:{en:'Votes','zh-CN':'选票'},originalLanguage:'hu'};
  for (const patch of [
    r => { r.round = 1; }, r => { r.published_turnout = 56.26; }, r => { r.voters = 4536254; },
    r => { r.ballots_cast = 4532375; }, r => { r.invalid_votes = 48401; }, r => { r.round_composition[1].votes++; },
    r => { r.turnout_basis.numerator = 'voters'; }, r => { r.round_composition[0].territorial_districts--; r.round_composition[1].territorial_districts++; },
    r => { r.round_composition[1].territorial_districts++; }, r => { r.round_composition[0].date = '1998-05-24'; },
  ]) {
    const broken = structuredClone(stores);
    patch(broken.turnout.find(r => r.vote_type === VT98.territorial));
    assert.throws(() => electionViewsFromStores(broken, meta), /composite/i);
  }
});
