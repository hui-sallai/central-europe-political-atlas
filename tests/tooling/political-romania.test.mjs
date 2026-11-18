// Romania 2016 (Chamber of Deputies and Senate), admitted 2026-11-18 from AEP files on data.gov.ro (owner answers "both"
// and "ii then i"), and 2024 from the Central Electoral Bureau's final acts 2RF and 3RF the owner saved by hand (answer
// "both"). Targeted checks: the chambers stay separate, minority seats follow Art. 56 and the cited list, 2016 turnout is
// not invented, the 2024 national seat stage reconciles with the printed remainders, independents carry no names.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildRomania, reconcile, reconcile2024 } from '../../scripts/political-data/romania/build-parliament.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/political-data/raw/romania/parliament/evidence.json'), 'utf8'));
const of = (data, year) => ({ elections: data.elections.filter((e) => e.year === year), legislatures: data.legislatures.filter((l) => l.legislature_id.endsWith(`-${year}`)), ids: new Set(data.elections.filter((e) => e.year === year).map((e) => e.election_id)) });

test('the build reproduces the committed stores and exports', () => {
  const run = spawnSync(process.execPath, ['scripts/political-data/romania/build-parliament.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('Chamber of Deputies and Senate are separate elections and never combined', () => {
  const data = buildRomania();
  assert.deepEqual(data.elections.map((e) => [e.election_id, e.chamber]), [['el-ro-cd-2016-12-11', 'Camera Deputaților'], ['el-ro-s-2016-12-11', 'Senat'], ['el-ro-cd-2020-12-06', 'Camera Deputaților'], ['el-ro-s-2020-12-06', 'Senat'], ['el-ro-cd-2024-12-01', 'Camera Deputaților'], ['el-ro-s-2024-12-01', 'Senat']]);
  assert.deepEqual(data.legislatures.map((l) => l.total_seats), [329, 136, 330, 136, 331, 134]);
  for (const e of data.elections) {
    const rows = data.election_results.filter((r) => r.election_id === e.election_id);
    assert.equal(new Set(rows.map((r) => r.vote_type)).size, 1);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), data.legislatures.find((l) => l.election_id === e.election_id).total_seats);
    assert.ok(rows.every((r) => r.valid_votes === rows[0].valid_votes));
  }
  for (const year of [2016, 2020, 2024]) {
    const [cd, s] = of(data, year).elections.map((e) => data.election_results.find((r) => r.election_id === e.election_id).valid_votes);
    assert.notEqual(cd, s, String(year));
  }
});

test('2016 Chamber: 312 list seats plus 17 minority organisation seats, matching the Chamber list for 2016-2020', () => {
  const data = buildRomania();
  const cd = data.election_results.filter((r) => r.election_id === 'el-ro-cd-2016-12-11');
  assert.equal(cd.reduce((n, r) => n + (r.list_seats ?? 0), 0), 312);
  assert.equal(cd.reduce((n, r) => n + (r.minority_seats ?? 0), 0), 17);
  const minority = data.electoral_contestants.filter((c) => c.election_id === 'el-ro-cd-2016-12-11' && c.contestant_kind === 'national_minority_organisation');
  assert.deepEqual(minority.map((c) => c.abbreviation).sort(), [...evidence.elections['2016'].minority_cross_check.organisations].sort());
  const c = structuredClone(evidence.elections['2016'].chambers.CD);
  assert.throws(() => reconcile('CD', c, evidence.elections['2016'].minority_cross_check.organisations.slice(1)), /Art\. 56/);
});

test('2016 seats fail closed: Senate allocation reproduces exactly; a tampered seat file breaks the build', () => {
  const s = structuredClone(evidence.elections['2016'].chambers.S);
  assert.equal(reconcile('S', s, []).allocation_model, 'reproduced exactly');
  s.seats_by_constituency[0][Object.keys(s.seats_by_constituency[0])[2]] += 1;
  assert.throws(() => reconcile('S', s, []));
});

test('2024 Chamber: 312 list seats plus the 19 organisations of section m.5; national stage reproduced exactly', () => {
  const c = evidence.elections['2024'].chambers.CD, r = reconcile2024('CD', c);
  assert.deepEqual([r.list_seats_filled, r.minority_seats, r.total_seats, r.unfilled.length], [312, 19, 331, 0]);
  assert.equal(r.allocation_model, "national D'Hondt over the remainders reproduces section j exactly");
  const data = buildRomania();
  const rows = data.election_results.filter((x) => x.election_id === 'el-ro-cd-2024-12-01');
  assert.equal(rows.reduce((n, x) => n + (x.minority_seats ?? 0), 0), 19);
  assert.equal(rows.filter((x) => x.list_seats > 0).length, 7);
  const t1 = structuredClone(c); t1.minority.entitled_m5 = t1.minority.entitled_m5.slice(1);
  assert.throws(() => reconcile2024('CD', t1), /m\.5/);
  const t2 = structuredClone(c); t2.minority.minimum_votes_m3 += 1;
  assert.throws(() => reconcile2024('CD', t2), /m\.3/);
});

test('2020: both acts reconcile exactly (Chamber 312 + 18 minority seats, Senate 136); a list naming persons is shown without them; archived copies recorded', () => {
  const cd = evidence.elections['2020'].chambers.CD, s = evidence.elections['2020'].chambers.S;
  const rc = reconcile2024('CD', cd, '2020'), rs = reconcile2024('S', s, '2020');
  assert.deepEqual([rc.list_seats_filled, rc.minority_seats, rc.total_seats, rc.unfilled.length], [312, 18, 330, 0]);
  assert.deepEqual([rs.list_seats_filled, rs.total_seats, rs.unfilled.length], [136, 136, 0]);
  for (const r of [rc, rs]) assert.equal(r.allocation_model, "national D'Hondt over the remainders reproduces section j exactly");
  assert.deepEqual(Object.values(rc.first_stage).reduce((a, b) => a + b, 0), 219);
  assert.equal(rs.first_stage['ALIANȚA PENTRU UNIREA ROMÂNILOR'], 0);
  // Fail closed: a moved national-stage seat, a changed remainder, a dropped minority organisation.
  const t1 = structuredClone(s); t1.national_stage_j['PARTIDUL SOCIAL DEMOCRAT'].push(1);
  assert.throws(() => reconcile2024('S', t1, '2020'), /2020 S/);
  const t2 = structuredClone(cd); t2.remainders_i1['ALIANȚA USR PLUS'] += 1;
  assert.throws(() => reconcile2024('CD', t2, '2020'), /remainders/);
  const t3 = structuredClone(cd); t3.minority.entitled_m5 = t3.minority.entitled_m5.slice(1);
  assert.throws(() => reconcile2024('CD', t3, '2020'), /m\.5/);
  const data = buildRomania();
  const named = data.electoral_contestants.filter((c) => c.election_id.includes('2020-12-06') && c.label_basis === 'partial_personal_name_omitted');
  assert.deepEqual(named.map((c) => c.historical_display_label), ['PARTIDUL NAȚIONAL ȚĂRĂNESC', 'PARTIDUL NAȚIONAL ȚĂRĂNESC']);
  assert.ok(named.every((c) => /^[0-9a-f]{64}$/.test(c.title_sha256)));
  // The stored label is the printed name minus the surnames: it is a strict prefix, and its hash differs from the title hash.
  assert.ok(named.every((c) => crypto.createHash('sha256').update(c.historical_display_label).digest('hex') !== c.title_sha256));
  const printed = evidence.elections['2020'].chambers.CD.lists.find((l) => l.label_basis === 'partial_personal_name_omitted');
  assert.equal(printed.name, 'PARTIDUL NAȚIONAL ȚĂRĂNESC');
  const reg = data.political_source_registry.filter((r) => /bec-(cd|s)-2020/.test(r.source_id));
  assert.ok(reg.length === 2 && reg.every((r) => r.acquisition === 'owner_download_internet_archive_copy' && /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/parlamentare2020\.bec\.ro\//.test(r.archive_copy.url)));
  const t20 = data.election_turnout.filter((t) => t.election_id.includes('2020'));
  assert.deepEqual(t20.map((t) => [t.eligible_voters, t.voters_turned_out, t.valid_votes, t.invalid_votes]), [[18964642, 6059113, 5901959, 108862], [18964642, 6059113, 5908364, 99051]]);
  const host = JSON.parse(fs.readFileSync(path.join(root, 'docs/legal-security/network_acquisition_registry.json'), 'utf8')).hosts.find((h) => h.host === 'parlamentare2020.bec.ro');
  assert.deepEqual([host.status, host.automation_allowed, host.manual_allowed], ['blocked', false, false]);
});

test('2024 Senate: 134 of 136 seats filled; the two undeployed seats are exactly the unfilled Giurgiu and Ialomița slots', () => {
  const c = evidence.elections['2024'].chambers.S, r = reconcile2024('S', c);
  assert.deepEqual([r.seat_slots, r.list_seats_filled, r.total_seats], [136, 134, 134]);
  assert.deepEqual(r.unfilled.map((u) => [u.name, u.slots]), [['GIURGIU', 1], ['IALOMIȚA', 1]]);
  assert.deepEqual(r.undeployed, { 'PARTIDUL OAMENILOR TINERI': 2 });
  const leg = buildRomania().legislatures.find((l) => l.legislature_id === 'lg-ro-s-2024');
  assert.match(leg.unfilled_seats_note, /states no reason/);
  const t1 = structuredClone(c); t1.national_stage_j['PARTIDUL SOCIAL DEMOCRAT'].push(19);
  assert.throws(() => reconcile2024('S', t1));
  const t2 = structuredClone(c); t2.remainders_i1['PARTIDUL NAȚIONAL LIBERAL'] += 1;
  assert.throws(() => reconcile2024('S', t2), /remainders/);
  const t3 = structuredClone(c); t3.lists[1].votes += 1;
  assert.throws(() => reconcile2024('S', t3), /valid votes/);
});

test('turnout: none invented for 2016; 2024 counts as printed with turnout derived as b ÷ a', () => {
  const data = buildRomania();
  const t16 = data.election_turnout.filter((t) => t.election_id.includes('2016'));
  assert.ok(t16.every((t) => t.eligible_voters === null && t.voters === null && t.derived_turnout === null && t.published_turnout === null));
  const t24 = data.election_turnout.filter((t) => t.election_id.includes('2024'));
  assert.deepEqual(t24.map((t) => [t.eligible_voters, t.voters_turned_out, t.valid_votes, t.invalid_votes]), [[19503273, 9454678, 9243641, 171877], [19503273, 9454678, 9259957, 149557]]);
  assert.ok(t24.every((t) => t.published_turnout === null && Math.abs(t.derived_turnout - (9454678 / 19503273) * 100) < 1e-9));
});

test('no candidate is named: independents are aggregated and section k/m.5 names are never stored', () => {
  const data = buildRomania();
  const ind = data.electoral_contestants.filter((c) => c.contestant_kind === 'independent_candidates_aggregate');
  assert.deepEqual(ind.map((c) => c.independent_candidates), [39, 5, 41, 1, 52, 6]);
  for (const dir of ['src/data/political/romania', 'public/research-data/political/romania', 'docs/political-data/raw/romania']) {
    for (const file of fs.readdirSync(path.join(root, dir), { recursive: true }).map(String).filter((x) => /\.(json|csv|md)$/.test(x))) {
      const text = fs.readFileSync(path.join(root, dir, file), 'utf8');
      assert.doesNotMatch(text, /CANDIDAT INDEPENDENT - [A-ZĂÂÎȘȚŞŢ]/, `${dir}/${file}`);
    }
  }
  // 2020 and 2024: section e rows of independent candidates are kept only as row numbers; every stored label is a list or organisation.
  for (const [year, ch] of [['2020', 'CD'], ['2020', 'S'], ['2024', 'CD'], ['2024', 'S']]) {
    const c = evidence.elections[year].chambers[ch];
    assert.equal(c.independents.ballot_rows.length, c.independents.candidates);
    assert.ok(c.lists.every((l) => !c.independents.ballot_rows.includes(l.row)));
    assert.ok(!('names' in c.independents) && !('elected_names' in c) && !('substitutes' in c));
  }
});
