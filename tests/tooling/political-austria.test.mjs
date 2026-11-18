// Austria Nationalrat 2013, 2017, 2019 and 2024, admitted 2026-11-18 from the BMI files the owner saved by hand (owner brief;
// answers "Accept for all four" and "I'll download files myself"). Targeted checks: seats reproduce by federal D'Hondt,
// the official totals agree, tiers are consistent, and no person's name is stored as a label.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildAustria, reconcile } from '../../scripts/political-data/austria/build-nationalrat.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/political-data/raw/austria/nationalrat/evidence.json'), 'utf8'));
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

test('the build reproduces the committed stores and exports', () => {
  const run = spawnSync(process.execPath, ['scripts/political-data/austria/build-nationalrat.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('four elections, 183 seats each, seats reproduced by federal D\'Hondt among parties above 4%', () => {
  const data = buildAustria();
  assert.deepEqual(data.elections.map((e) => e.election_id), ['el-at-nr-2013-09-29', 'el-at-nr-2017-10-15', 'el-at-nr-2019-09-29', 'el-at-nr-2024-09-29']);
  for (const e of data.elections) {
    const rows = data.election_results.filter((r) => r.election_id === e.election_id);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), 183, e.election_id);
    const valid = data.election_turnout.find((x) => x.election_id === e.election_id).valid_votes;
    assert.equal(rows.reduce((n, r) => n + r.votes, 0), valid, e.election_id);
    assert.ok(rows.every((r) => (r.seats > 0) === (r.votes * 100 >= 4 * valid)), e.election_id);
  }
  const seats = (id) => Object.fromEntries(data.election_results.filter((r) => r.election_id === id && r.seats).map((r) => [data.electoral_contestants.find((c) => c.contestant_id === r.contestant_ref).historical_display_label, r.seats]));
  assert.deepEqual(seats('el-at-nr-2024-09-29'), { ÖVP: 51, SPÖ: 41, FPÖ: 57, GRÜNE: 16, NEOS: 18 });
  assert.deepEqual(seats('el-at-nr-2019-09-29'), { ÖVP: 71, SPÖ: 40, FPÖ: 31, NEOS: 15, GRÜNE: 26 });
});

test('fails closed: tampered votes, seats or tiers break the build', () => {
  const e17 = structuredClone(evidence.elections['2017']); e17.parties[0].votes += 1;
  assert.throws(() => reconcile('2017', e17));
  const e13 = structuredClone(evidence.elections['2013']); e13.announcement.seats_B['SPÖ'] += 1; e13.announcement.seats_B['ÖVP'] -= 1;
  assert.throws(() => reconcile('2013', e13), /D'Hondt/);
  const e24 = structuredClone(evidence.elections['2024']); e24.seat_table.laender[0].second['FPÖ'] += 1;
  assert.throws(() => reconcile('2024', e24), /seat table/);
  const e24b = structuredClone(evidence.elections['2024']); e24b.signed_decision.national_row_text = e24b.signed_decision.national_row_text.replace('6.346.059', '6.346.060');
  assert.throws(() => reconcile('2024', e24b), /signed decision/);
});

test('2019 and 2024: seats by tier add up to the federal totals', () => {
  const data = buildAustria();
  for (const id of ['el-at-nr-2019-09-29', 'el-at-nr-2024-09-29']) {
    for (const r of data.election_results.filter((x) => x.election_id === id && x.seats)) assert.equal(r.regional_seats + r.land_seats + r.federal_seats, r.seats);
    const leg = data.legislatures.find((l) => l.election_id === id);
    assert.equal(leg.seats_by_land.length, 9);
    assert.equal(leg.seats_by_land.reduce((n, l) => n + l.regional.length, 0), 39);
  }
});

test('labels: printed names naming a person are hashed, short names that are a person\'s name use the column', () => {
  const data = buildAustria();
  const rowOnly = data.electoral_contestants.filter((c) => c.label_basis === 'row_only');
  assert.deepEqual(rowOnly.map((c) => [c.election_id, c.historical_display_label]), [['el-at-nr-2013-09-29', 'Wahlvorschlag, Spalte 6'], ['el-at-nr-2017-10-15', 'Wahlvorschlag, Spalte 6']]);
  for (const c of data.electoral_contestants.filter((x) => x.label_basis !== 'official_short_name')) assert.equal(c.printed_party_name, null);
  for (const y of Object.keys(evidence.elections)) for (const p of evidence.elections[y].parties) {
    if (p.person_name) assert.equal(p.printed_name, null);
    if (p.person_name === 'in_short_name') assert.equal(p.short_name, null);
  }
});

test('governance: admitted with a closed gate record; BMI stays blocked and the source files stay local', () => {
  const g = read('docs/political-data/austria_nationalrat_admission.json');
  assert.ok(Object.values(g.gates).every((x) => x.status === 'closed'));
  assert.equal(read('docs/legal-security/network_acquisition_registry.json').hosts.find((h) => h.host === 'www.bmi.gv.at').status, 'blocked');
  assert.ok(read('docs/legal-security/political_admission_records.json').admissions.some((a) => a.admission_id === 'austria-nationalrat-2013-2024' && a.status === 'owner_approved'));
  for (const y of Object.keys(evidence.elections)) assert.match(evidence.elections[y].workbook.sha256, /^[0-9a-f]{64}$/);
  assert.equal(spawnSync('git', ['ls-files', 'docs/political-data/source-closure/local-evidence/austria'], { cwd: root, encoding: 'utf8' }).stdout.trim(), '');
});
