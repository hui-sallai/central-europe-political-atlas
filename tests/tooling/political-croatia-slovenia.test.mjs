// Croatia (Hrvatski sabor 2015–2024) and Slovenia (Državni zbor 2026), admitted 2026-11-18 (owner brief on ten-country
// parliamentary elections). Targeted checks for the institutional differences the brief requires to stay visible.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildCroatia, reconcileUnit, YEARS as HR_YEARS } from '../../scripts/political-data/croatia/build-sabor.mjs';
import { buildSlovenia, reconcile as reconcileSi } from '../../scripts/political-data/slovenia/build-dz.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const hrEvidence = read('docs/political-data/raw/croatia/sabor/evidence.json');
const siEvidence = read('docs/political-data/raw/slovenia/dz/evidence.json');
// Names of persons printed in the source documents (party leaders, elected members, committee members) that must never
// appear in committed data: a sample across both countries and all admitted years.
const PERSON_NAMES = ['PLENKOVIĆ', 'KELEMINEC', 'PERNARA', 'OREŠKOVIĆ', 'ŠKORE', 'PETRINA', 'BANDIĆ', 'KERUM', 'LACKOVIĆ', 'JOSIPOVIĆA', 'VESELICA', 'PUPOVAC', 'LOTRIČA', 'LOGARJA', 'PREBILIČA', 'RUPARJA', 'ERJAVEC', 'Ziza', 'Horváth', 'Golob', 'Tremul', 'Močnek', 'Kasaš', 'BATTELLI', 'GÖNCZ', 'SOBOČAN', 'GOLUBIĆ', 'Nositelj', 'Šarca', 'BRATUŠEK', 'PIVEC', 'Popoviča', 'CERARJA'];

test('both builds reproduce the committed stores and exports', () => {
  for (const script of ['scripts/political-data/croatia/build-sabor.mjs', 'scripts/political-data/slovenia/build-dz.mjs']) {
    const run = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  }
});

test('Croatia: 140 territorial, 3 abroad and 8 national-minority seats stay separate in every election', () => {
  const data = buildCroatia();
  assert.deepEqual(HR_YEARS, ['2011', '2015', '2016', '2020', '2024']);
  for (const leg of data.legislatures) {
    assert.equal(leg.total_seats, 151);
    assert.deepEqual(leg.seats_by_mechanism, { territorial_constituencies: 140, constituency_abroad: 3, national_minorities: 8 });
    assert.equal(leg.seats_by_national_minority.reduce((n, m) => n + m.seats, 0), 8);
    assert.equal(leg.seats_by_identical_list_title.reduce((n, g) => n + g.seats, 0), 143);
  }
  for (const e of data.elections) {
    const seats = (prefix) => data.election_results.filter((r) => r.election_id === e.election_id && r.geography.startsWith(prefix)).reduce((n, r) => n + r.seats, 0);
    assert.equal(['hr-ie-01', 'hr-ie-02', 'hr-ie-03', 'hr-ie-04', 'hr-ie-05', 'hr-ie-06', 'hr-ie-07', 'hr-ie-08', 'hr-ie-09', 'hr-ie-10'].reduce((n, g) => n + seats(g), 0), 140, e.election_id);
    assert.equal(seats('hr-ie-11'), 3, e.election_id);
    assert.equal(seats('hr-ie-12-'), 8, e.election_id);
  }
});

test('Croatia: results are per constituency; no national vote share and no national results row', () => {
  const data = buildCroatia();
  assert.ok(data.election_results.every((r) => /^hr-ie-(0[1-9]|1[01]|12-[a-z_]+)$/.test(r.geography)));
  assert.ok(data.election_results.every((r) => r.geography !== 'national'));
  // The I–X turnout aggregate is the only cross-constituency figure, and it excludes abroad and minority elections.
  const agg = data.election_turnout.filter((t) => t.geography === 'hr-territorial-i-x');
  assert.equal(agg.length, HR_YEARS.length);
  const e2024 = agg.find((t) => t.election_id === 'el-hr-sabor-2024-04-17');
  assert.deepEqual([e2024.eligible_voters, e2024.voters_turned_out, e2024.published_turnout], [3482150, 2140824, 61.48]);
});

test('Croatia: national-minority candidates are anonymous, elected by most votes, and the Serbian election elects three', () => {
  const data = buildCroatia();
  const cands = data.electoral_contestants.filter((c) => c.contestant_kind === 'individual_candidate');
  assert.ok(cands.length > 0);
  assert.ok(cands.every((c) => c.name_stored === false && c.label_basis === 'row_only' && /^Kandidat, red\. br\. \d+$/.test(c.historical_display_label)));
  for (const e of data.elections) {
    const serbian = data.election_results.filter((r) => r.election_id === e.election_id && r.geography === 'hr-ie-12-srpska');
    assert.equal(serbian.filter((r) => r.elected).length, 3, e.election_id);
    assert.ok(serbian.every((r) => r.derived_vote_share === null), 'multi-vote ballot: no vote share');
  }
});

test('Croatia: coalition lists keep their printed parties; person-named parties are shortened; no person names anywhere', () => {
  const data = buildCroatia();
  const lists = data.electoral_contestants.filter((c) => c.contestant_kind === 'electoral_list');
  assert.ok(lists.every((c) => c.parties_named.length <= c.parties_named_count));
  assert.ok(lists.some((c) => c.list_composition === 'coalition_list_two_or_more_parties_named'));
  assert.ok(lists.some((c) => c.label_basis === 'abbreviation_for_personal_name' && c.parties_named.includes('"DO i SIP"')));
  assert.ok(lists.some((c) => c.label_basis === 'row_only' && /^Lista, red\. br\. \d+$/.test(c.historical_display_label)));
  for (const f of ['src/data/political/croatia', 'public/research-data/political/croatia', 'docs/political-data/raw/croatia']) {
    for (const file of fs.readdirSync(path.join(root, f), { recursive: true }).map(String).filter((x) => /\.(json|csv|md)$/.test(x))) {
      const text = fs.readFileSync(path.join(root, f, file), 'utf8');
      for (const name of PERSON_NAMES) assert.ok(!text.includes(name), `${f}/${file}: ${name}`);
    }
  }
});

test('Croatia: the seat rule fails closed on a tampered decision', () => {
  const u = structuredClone(hrEvidence.elections['2024'].units.find((x) => x.unit_key === '02_001'));
  assert.ok(reconcileUnit('2024', u, 'truncated_two_decimals'));
  u.lists[0].seats -= 1; u.lists[1].seats += 1;
  assert.throws(() => reconcileUnit('2024', u, 'truncated_two_decimals'), /D'Hondt|section IV/);
  const v = structuredClone(hrEvidence.elections['2015'].units.find((x) => x.unit_key === '02_001'));
  assert.throws(() => reconcileUnit('2015', v, 'truncated_two_decimals'), /printed percentage/, '2015 prints rounded percentages');
});

test('Slovenia: 88 list seats and two national-community seats in every election; the National Council is excluded', () => {
  const data = buildSlovenia();
  assert.deepEqual(data.elections.map((e) => e.election_id), ['el-si-dz-2011-12-04', 'el-si-dz-2014-07-13', 'el-si-dz-2018-06-03', 'el-si-dz-2022-04-24', 'el-si-dz-2026-03-22']);
  for (const leg of data.legislatures) {
    assert.equal(leg.total_seats, 90);
    assert.deepEqual(leg.seats_by_mechanism, { general_lists: 88, italian_national_community: 1, hungarian_national_community: 1 });
    assert.match(leg.excluded_bodies[0].body, /Državni svet/);
  }
  // 2011 rows follow the report's list numbers (not vote order).
  const seats = { 'el-si-dz-2011-12-04': [6, 8, 28, 4, 10, 26, 6], 'el-si-dz-2014-07-13': [36, 21, 10, 6, 6, 5, 4], 'el-si-dz-2018-06-03': [25, 13, 10, 10, 9, 7, 5, 5, 4], 'el-si-dz-2022-04-24': [41, 27, 8, 7, 5], 'el-si-dz-2026-03-22': [29, 28, 9, 6, 6, 5, 5] };
  for (const [id, expected] of Object.entries(seats)) {
    const general = data.election_results.filter((r) => r.election_id === id && r.vote_type === 'si_list_vote');
    assert.deepEqual(general.filter((r) => r.seats > 0).map((r) => r.seats), expected, id);
    for (const g of ['si-nc-italijanska', 'si-nc-madzarska']) assert.equal(data.election_results.filter((r) => r.election_id === id && r.geography === g && r.elected).length, 1, `${id} ${g}`);
  }
  assert.ok(data.electoral_contestants.filter((c) => c.contestant_kind === 'individual_candidate').every((c) => c.name_stored === false));
});

test('Slovenia: list names with persons use the commission short name; minutes and data file agree; no personal data', () => {
  const data = buildSlovenia();
  const short = data.electoral_contestants.filter((c) => c.election_id === 'el-si-dz-2026-03-22' && c.label_basis === 'dvk_short_name_for_personal_name').map((c) => c.historical_display_label);
  assert.deepEqual(short.sort(), ['DEMOKRATI.', 'GLAS UPOKOJENCEV', 'NSi, SLS, FOKUS', 'PREROD', 'ZAUPANJE']);
  assert.deepEqual(data.electoral_contestants.filter((c) => c.election_id === 'el-si-dz-2022-04-24' && c.label_basis === 'dvk_short_name_for_personal_name').map((c) => c.historical_display_label).sort(), ["L'BP", 'LMŠ', 'NAŠA DEŽELA', 'SAB']);
  // 2011: names containing a person's name are shown without it; stage seats are kept.
  assert.deepEqual(data.electoral_contestants.filter((c) => c.election_id === 'el-si-dz-2011-12-04' && c.label_basis === 'partial_personal_name_omitted').map((c) => c.historical_display_label).sort(), ['DRŽAVLJANSKA LISTA', 'POZITIVNA SLOVENIJA', 'SLS - SLOVENSKA LJUDSKA STRANKA']);
  assert.equal(data.election_results.filter((r) => r.election_id === 'el-si-dz-2011-12-04').reduce((n, r) => n + (r.national_stage_seats ?? 0), 0), 27);
  // 2011, 2014 and 2018: ranking points are stored as points, never as votes.
  const pts = data.election_results.filter((r) => r.vote_type === 'si_national_community_candidate_points');
  assert.equal(new Set(pts.map((r) => r.election_id)).size, 3);
  assert.ok(pts.every((r) => r.votes === null && Number.isInteger(r.points) && r.derived_vote_share === null));
  const g = siEvidence.elections['2026'].general;
  assert.equal(reconcileSi('2026', siEvidence.elections['2026']).lists_in_allocation, 7);
  assert.deepEqual([g.entitled, g.voted, g.voted_printed_percent], [1695249, 1190932, '70,25']);
  for (const f of ['src/data/political/slovenia', 'public/research-data/political/slovenia', 'docs/political-data/raw/slovenia']) {
    for (const file of fs.readdirSync(path.join(root, f), { recursive: true }).map(String).filter((x) => /\.(json|csv|md)$/.test(x))) {
      const text = fs.readFileSync(path.join(root, f, file), 'utf8');
      for (const name of PERSON_NAMES) assert.ok(!text.includes(name), `${f}/${file}: ${name}`);
      assert.ok(!/roj\. \d/.test(text), `${f}/${file}: date of birth`);
    }
  }
});

test('the four countries: hosts registered manual-only; Austria admitted from owner files with BMI still blocked; Romania 2016 and 2024; the BEC host stays blocked', () => {
  const hosts = read('docs/legal-security/network_acquisition_registry.json').hosts;
  for (const h of ['www.izbori.hr', 'www.dvk-rs.si']) assert.deepEqual(['status', 'automation_allowed', 'manual_allowed'].map((k) => hosts.find((x) => x.host === h)[k]), ['allowed', false, true], h);
  assert.equal(hosts.find((x) => x.host === 'www.bmi.gv.at').status, 'blocked');
  assert.deepEqual(read('src/data/political/austria/elections.json').map((e) => e.year), [2002, 2013, 2017, 2019, 2024]);
  assert.deepEqual(read('src/data/political/romania/elections.json').map((e) => e.election_id), ['el-ro-cd-2016-12-11', 'el-ro-s-2016-12-11', 'el-ro-cd-2024-12-01', 'el-ro-s-2024-12-01']);
  assert.deepEqual(['status', 'automation_allowed', 'manual_allowed'].map((k) => hosts.find((x) => x.host === 'parlamentare2024.bec.ro')[k]), ['blocked', false, false]);
});
