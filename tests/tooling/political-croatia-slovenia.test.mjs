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

// Seats abroad and for national minorities by election: fixed from 2011; non-fixed quota abroad and 5 minority seats in 2000.
const HR_STRUCTURE = { 2000: [6, 5, 151], 2003: [4, 8, 152], 2007: [5, 8, 153] };
const hrStructure = (year) => HR_STRUCTURE[year] ?? [3, 8, 151];

test('Croatia: territorial, abroad and national-minority seats stay separate in every election (151, 152 or 153 seats)', () => {
  const data = buildCroatia();
  assert.deepEqual(HR_YEARS, ['2000', '2003', '2007', '2011', '2015', '2016', '2020', '2024']);
  for (const leg of data.legislatures) {
    const [abroad, minority, total] = hrStructure(Number(leg.election_id.slice(12, 16)));
    assert.equal(leg.total_seats, total, leg.election_id);
    assert.deepEqual(leg.seats_by_mechanism, { territorial_constituencies: 140, constituency_abroad: abroad, national_minorities: minority });
    assert.equal(leg.seats_by_national_minority.reduce((n, m) => n + m.seats, 0), minority);
    assert.equal(leg.seats_by_identical_list_title.reduce((n, g) => n + g.seats, 0), 140 + abroad);
  }
  for (const e of data.elections) {
    const [abroad, minority] = hrStructure(e.year);
    const seats = (prefix) => data.election_results.filter((r) => r.election_id === e.election_id && r.geography.startsWith(prefix)).reduce((n, r) => n + r.seats, 0);
    assert.equal(['hr-ie-01', 'hr-ie-02', 'hr-ie-03', 'hr-ie-04', 'hr-ie-05', 'hr-ie-06', 'hr-ie-07', 'hr-ie-08', 'hr-ie-09', 'hr-ie-10'].reduce((n, g) => n + seats(g), 0), 140, e.election_id);
    assert.equal(seats('hr-ie-11'), abroad, e.election_id);
    assert.equal(seats('hr-ie-12-'), minority, e.election_id);
  }
});

test('Croatia 2000–2007: the seats abroad follow the printed non-fixed quota; the build fails closed when it is tampered', () => {
  const data = buildCroatia();
  for (const [year, seats] of [['2000', 6], ['2003', 4], ['2007', 5]]) {
    const q = data.checks[year].non_fixed_quota_abroad;
    assert.equal(q.quotient, Math.round(q.valid_votes_i_x / 140), year);
    assert.equal(Math.floor(q.valid_votes_abroad / q.quotient), seats, year);
    assert.equal(q.seats_abroad, seats, year);
  }
  const E = structuredClone(hrEvidence.elections['2007']);
  const abroad = E.units.find((u) => u.unit_key === '02_011');
  abroad.non_fixed_quota.quotient_printed += 1;
  const evidence = { ...hrEvidence, elections: { ...hrEvidence.elections, 2007: E } };
  fs.writeFileSync(path.join(root, '.tmp-hr-evidence.json'), JSON.stringify(evidence));
  try {
    // The quota check runs over the whole election, so rebuild 2007 from the tampered evidence in a child process.
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `import fs from 'node:fs'; const orig = fs.readFileSync; fs.readFileSync = (p, ...a) => (String(p).endsWith('docs/political-data/raw/croatia/sabor/evidence.json') ? orig('${path.join(root, '.tmp-hr-evidence.json')}', ...a) : orig(p, ...a)); const m = await import('${path.join(root, 'scripts/political-data/croatia/build-sabor.mjs')}'); m.buildCroatia();`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /printed quotient/);
  } finally { fs.rmSync(path.join(root, '.tmp-hr-evidence.json'), { force: true }); }
  // 2003 abroad names only the seat-winning list as taking part; the rule is recorded, not assumed.
  const u03 = structuredClone(hrEvidence.elections['2003'].units.find((u) => u.unit_key === '02_011'));
  assert.equal(u03.allocation_wording, 'seat_winning_lists_only');
  assert.ok(reconcileUnit('2003', u03, 'rounded_two_decimals', { diaspora: 4 }));
  delete u03.allocation_wording;
  assert.throws(() => reconcileUnit('2003', u03, 'rounded_two_decimals', { diaspora: 4 }), /lists at or above 5%/);
});

test('Croatia 2000–2007: independent lists drop their leader\'s name; 2000 prints counts only; repeat voting is dated', () => {
  const data = buildCroatia();
  const independent = data.electoral_contestants.filter((c) => c.label_basis === 'leader_name_omitted');
  assert.ok(independent.length > 50);
  assert.ok(independent.every((c) => c.historical_display_label === 'NEOVISNA LISTA' && /^[0-9a-f]{64}$/.test(c.title_sha256)));
  for (const f of ['src/data/political/croatia', 'public/research-data/political/croatia']) {
    for (const file of fs.readdirSync(path.join(root, f)).filter((x) => /\.(json|csv)$/.test(x))) assert.ok(!/NEOVISNA LISTA - [A-Za-zČĆŽŠĐčćžšđ]/.test(fs.readFileSync(path.join(root, f, file), 'utf8')), `${f}/${file}`);
  }
  const t2000 = data.election_turnout.filter((t) => t.election_id === 'el-hr-sabor-2000-01-03' && t.geography !== 'hr-territorial-i-x');
  assert.equal(t2000.length, 16);
  assert.ok(t2000.every((t) => t.published_turnout === null && t.derived_turnout > 0));
  assert.deepEqual(data.elections.filter((e) => e.repeat_poll_date).map((e) => [e.year, e.repeat_poll_date]), [[2003, '2003-11-30'], [2007, '2007-12-09']]);
  const seatsOf = (id, label) => data.legislatures.find((l) => l.election_id === id).seats_by_identical_list_title.find((g) => g.label === label)?.seats;
  assert.equal(seatsOf('el-hr-sabor-2000-01-03', 'HRVATSKA DEMOKRATSKA ZAJEDNICA - HDZ'), 46);
  assert.equal(seatsOf('el-hr-sabor-2007-11-25', 'HRVATSKA DEMOKRATSKA ZAJEDNICA - HDZ'), 66);
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

test('Croatia: national-minority candidates are anonymous, elected by most votes, and the Serbian election elects three (one in 2000)', () => {
  const data = buildCroatia();
  const cands = data.electoral_contestants.filter((c) => c.contestant_kind === 'individual_candidate');
  assert.ok(cands.length > 0);
  assert.ok(cands.every((c) => c.name_stored === false && c.label_basis === 'row_only' && /^Kandidat, red\. br\. \d+$/.test(c.historical_display_label)));
  for (const e of data.elections) {
    const serbian = data.election_results.filter((r) => r.election_id === e.election_id && r.geography === 'hr-ie-12-srpska');
    const n = e.year === 2000 ? 1 : 3;
    assert.equal(serbian.filter((r) => r.elected).length, n, e.election_id);
    if (n === 3) assert.ok(serbian.every((r) => r.derived_vote_share === null), 'multi-vote ballot: no vote share');
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
  assert.deepEqual(data.elections.map((e) => e.election_id), ['el-si-dz-2000-10-15', 'el-si-dz-2004-10-03', 'el-si-dz-2008-09-21', 'el-si-dz-2011-12-04', 'el-si-dz-2014-07-13', 'el-si-dz-2018-06-03', 'el-si-dz-2022-04-24', 'el-si-dz-2026-03-22']);
  for (const leg of data.legislatures) {
    assert.equal(leg.total_seats, 90);
    assert.deepEqual(leg.seats_by_mechanism, { general_lists: 88, italian_national_community: 1, hungarian_national_community: 1 });
    assert.match(leg.excluded_bodies[0].body, /Državni svet/);
  }
  // 2011 rows follow the report's list numbers (not vote order).
  // 2000 and 2011 rows follow the printed table order (not vote order).
  const seats = { 'el-si-dz-2000-10-15': [4, 34, 8, 4, 9, 4, 14, 11], 'el-si-dz-2004-10-03': [29, 23, 10, 9, 7, 6, 4], 'el-si-dz-2008-09-21': [29, 28, 9, 7, 5, 5, 5], 'el-si-dz-2011-12-04': [6, 8, 28, 4, 10, 26, 6], 'el-si-dz-2014-07-13': [36, 21, 10, 6, 6, 5, 4], 'el-si-dz-2018-06-03': [25, 13, 10, 10, 9, 7, 5, 5, 4], 'el-si-dz-2022-04-24': [41, 27, 8, 7, 5], 'el-si-dz-2026-03-22': [29, 28, 9, 6, 6, 5, 5] };
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
  // 2000 to 2018: ranking points are stored as points, never as votes.
  const pts = data.election_results.filter((r) => r.vote_type === 'si_national_community_candidate_points');
  assert.equal(new Set(pts.map((r) => r.election_id)).size, 6);
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

test('Slovenia 2004 and 2008 come from official archive pages only; 2011 is cross-checked by its polling-station file', () => {
  const data = buildSlovenia();
  for (const y of ['2004', '2008']) {
    const E = siEvidence.elections[y];
    assert.equal(E.minutes.kind, 'results_pages');
    assert.match(E.minutes.official_marker_printed, /URADN|Uradni/);
    assert.equal(E.cross_check, null);
    assert.equal(reconcileSi(y, E).lists_in_allocation, E.general.lists.filter((l) => l.seats > 0).length);
    const tampered = structuredClone(E); tampered.general.lists[0].seats += 1; tampered.general.lists[1].seats -= 1;
    assert.throws(() => reconcileSi(y, tampered), /D'Hondt/);
  }
  // Lists named after a person: row number or the printed words without the name.
  const lists04 = data.electoral_contestants.filter((c) => c.election_id === 'el-si-dz-2004-10-03' && c.contestant_kind === 'electoral_list' && c.label_basis !== 'verbatim');
  assert.deepEqual(lists04.map((c) => [c.list_number, c.label_basis, c.historical_display_label]), [[21, 'row_only', 'Lista kandidatov, vrstica 21'], [22, 'row_only', 'Lista kandidatov, vrstica 22'], [23, 'partial_personal_name_omitted', 'SAMOSTOJNI KANDIDAT']]);
  const x = siEvidence.elections['2011'].cross_check;
  assert.match(x.publisher_file_sha256, /^[0-9a-f]{64}$/);
  assert.equal(x.used_for, 'cross-check only; list labels stay as transcribed from the report');
  assert.ok(data.political_source_registry.some((r) => r.source_id === 'src-si-dvk-data-2011' && r.role === 'cross_check'));
  assert.equal(spawnSync('git', ['ls-files', 'docs/political-data/source-closure/local-evidence'], { cwd: root, encoding: 'utf8' }).stdout.trim(), '');
});

test('Slovenia 2000: gazette report from an archived copy; printed figures the counts do not reproduce stay text only and fail closed', () => {
  const data = buildSlovenia(), E = siEvidence.elections['2000'];
  assert.equal(E.minutes.kind, 'report');
  assert.match(E.minutes.gazette, /98\/2000/);
  assert.match(E.minutes.archive_copy.url, /^https:\/\/web\.archive\.org\/web\/\d{14}id_\/https:\/\/www\.uradni-list\.si\//);
  assert.match(E.minutes.correction.effect, /no figure is changed/);
  const check = reconcileSi('2000', E);
  assert.deepEqual([check.lists, check.lists_in_allocation, check.total_seats], [23, 8, 90]);
  // Turnout: 70,37 printed, 70,36 from the counts; stored as derived only, the printed text kept separately.
  const turnout = data.election_turnout.find((t) => t.election_id === 'el-si-dz-2000-10-15' && t.geography === 'national');
  assert.deepEqual([turnout.published_turnout, turnout.printed_turnout_not_reproduced, turnout.derived_turnout.toFixed(2)], [null, 70.37, '70.36']);
  const odd = data.election_results.filter((r) => r.election_id === 'el-si-dz-2000-10-15' && r.printed_vote_share_not_reproduced !== undefined);
  assert.deepEqual(odd.map((r) => [r.contestant_ref, r.published_vote_share, r.printed_vote_share_not_reproduced, r.derived_vote_share.toFixed(2)]), [['ct-si-dz00-09', null, 8.76, '8.77']]);
  // Fail closed: a not-reproduced value must be exactly one hundredth off, and a printed value must recompute.
  for (const tamper of [(x) => { x.general.voted_printed_percent_not_reproduced = '70,38'; }, (x) => { x.general.lists[8].printed_percent_not_reproduced = '8,75'; }, (x) => { x.general.lists[0].printed_percent = '5,17'; }, (x) => { x.general.lists[5].national_stage_seats -= 1; x.general.lists[5].constituency_stage_seats += 1; }]) {
    const t = structuredClone(E); tamper(t);
    assert.throws(() => reconcileSi('2000', t), /Slovenia build failed/);
  }
  // Stage seats: 60 in the constituencies, 28 nationally.
  const r00 = data.election_results.filter((r) => r.election_id === 'el-si-dz-2000-10-15' && r.vote_type === 'si_list_vote');
  assert.deepEqual([r00.reduce((n, r) => n + (r.constituency_stage_seats ?? 0), 0), r00.reduce((n, r) => n + (r.national_stage_seats ?? 0), 0)], [60, 28]);
  // Lists named after persons: row number, or the printed words without the name.
  const named = data.electoral_contestants.filter((c) => c.election_id === 'el-si-dz-2000-10-15' && c.contestant_kind === 'electoral_list' && c.label_basis !== 'verbatim');
  assert.deepEqual(named.map((c) => c.historical_display_label), [17, 18, 19, 20].map((n) => `Lista kandidatov, vrstica ${n}`).concat(['NEODVISNI KANDIDAT', 'Lista kandidatov, vrstica 22', 'Lista kandidatov, vrstica 23']));
  // Hungarian community: five candidates ranked by points; the Italian candidate's points equal the valid ballots.
  const nc = data.election_results.filter((r) => r.election_id === 'el-si-dz-2000-10-15' && r.vote_type === 'si_national_community_candidate_points');
  assert.deepEqual([nc.filter((r) => r.geography === 'si-nc-madzarska').length, nc.find((r) => r.geography === 'si-nc-italijanska').points], [5, 1302]);
  const reg = data.political_source_registry.find((r) => r.source_id === 'src-si-dvk-minutes-2000');
  assert.match(reg.institution, /Republiška volilna komisija/);
  assert.equal(reg.archive_copy.captured, '2026-07-13');
  const hosts = read('docs/legal-security/network_acquisition_registry.json').hosts;
  for (const h of ['web.archive.org', 'www.uradni-list.si']) assert.deepEqual(['status', 'automation_allowed', 'manual_allowed'].map((k) => hosts.find((x) => x.host === h)[k]), ['blocked', false, false], h);
});

test('the four countries: hosts registered manual-only; Austria admitted from owner files with BMI still blocked; Romania 2016 and 2024; the BEC host stays blocked', () => {
  const hosts = read('docs/legal-security/network_acquisition_registry.json').hosts;
  for (const h of ['www.izbori.hr', 'www.dvk-rs.si']) assert.deepEqual(['status', 'automation_allowed', 'manual_allowed'].map((k) => hosts.find((x) => x.host === h)[k]), ['allowed', false, true], h);
  assert.equal(hosts.find((x) => x.host === 'www.bmi.gv.at').status, 'blocked');
  assert.deepEqual(read('src/data/political/austria/elections.json').map((e) => e.year), [2002, 2013, 2017, 2019, 2024]);
  assert.deepEqual(read('src/data/political/romania/elections.json').map((e) => e.election_id), ['el-ro-cd-2016-12-11', 'el-ro-s-2016-12-11', 'el-ro-cd-2024-12-01', 'el-ro-s-2024-12-01']);
  assert.deepEqual(['status', 'automation_allowed', 'manual_allowed'].map((k) => hosts.find((x) => x.host === 'parlamentare2024.bec.ro')[k]), ['blocked', false, false]);
});
