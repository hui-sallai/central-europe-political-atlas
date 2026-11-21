import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildCzechiaEarly, allocate } from '../../scripts/political-data/czechia/build-ps2010-2013.mjs';
import { parseCsv } from '../../scripts/political-data/czechia/build-ps2025.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = 'docs/political-data/raw/czechia/ps2010-2013';
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
const csv = (rel) => { const [h, ...rows] = parseCsv(fs.readFileSync(path.join(root, rel), 'utf8')); return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };

test('Czechia 2002–2013: national totals equal ČSÚ VOLPS03 and seats are reproduced by §§ 48–50', () => {
  const { checks } = buildCzechiaEarly();
  assert.deepEqual(Object.fromEntries(Object.entries(checks).map(([y, c]) => [y, [c.lists, c.registered, c.envelopes, c.validVotes, c.turnout, c.not_on_ballot, c.seats_reproduced]])), {
    2002: [28, 8264484, 4793706, 4768006, 58, [17], true],
    2006: [26, 8333305, 5372449, 5348976, 64.47, [], true],
    2010: [26, 8415892, 5268098, 5230859, 62.6, [3], true],
    2013: [23, 8424227, 5010944, 4969984, 59.48, [19], true],
  });
  assert.equal(checks[2002].abroad_region, null, 'the 2002 and 2006 § 27 draws are not asserted');
  assert.equal(checks[2006].abroad_region, null);
  assert.equal(checks[2010].regions_reproducing, 1);
  assert.equal(checks[2013].abroad_region, '2100');
  assert.match(checks[2010].abroad_basis, /^inferred/, 'the 2010 § 27 draw is not asserted');
});

test('Czechia 2010 and 2013: stores reconcile, every list that stood is present, seats total 200', () => {
  const results = read('src/data/political/czechia/election_results.json');
  const turnout = read('src/data/political/czechia/election_turnout.json');
  const seats = { 'el-cz-ps-2010-05-28': { 9: 56, 26: 53, 15: 41, 6: 26, 4: 24 }, 'el-cz-ps-2013-10-25': { 1: 50, 20: 47, 21: 33, 4: 26, 6: 16, 11: 14, 17: 14 } };
  for (const [id, expected] of Object.entries(seats)) {
    const rows = results.filter((r) => r.election_id === id), t = turnout.find((x) => x.election_id === id);
    assert.equal(rows.reduce((n, r) => n + r.votes, 0), t.valid_votes);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), 200);
    assert.deepEqual(Object.fromEntries(rows.filter((r) => r.seats > 0).map((r) => [Number(r.contestant_ref.slice(-2)), r.seats])), expected);
    assert.ok(rows.every((r) => r.published_vote_share === null && r.votes > 0));
    assert.equal(t.turnout_basis.numerator, 'envelopes_issued');
  }
});

test('Czechia 2010 and 2013: the statutory allocation reproduces the official seats from the archived regional sums', () => {
  const abroad = { 2010: '3100', 2013: '2100' };
  for (const year of [2010, 2013]) {
    const rv = {};
    for (const r of csv(`${RAW}/ps${year}_region_list_votes.csv`)) { const k = r.KRAJ === '9900' ? abroad[year] : r.KRAJ; rv[k] ??= {}; rv[k][r.KSTRANA] = (rv[k][r.KSTRANA] ?? 0) + Number(r.POC_HLASU); }
    const official = Object.fromEntries(csv(`${RAW}/ps${year}_psrkl.csv`).filter((l) => Number(l.POCMANDCR || 0) > 0).map((l) => [l.KSTRANA, Number(l.POCMANDCR)]));
    assert.deepEqual(allocate(rv).seats, official, String(year));
  }
});

test('Czechia 2010 and 2013: evidence holds no candidate data and every archived file matches its checksum', () => {
  const evidence = read(`${RAW}/evidence.json`);
  for (const y of ['2010', '2013']) for (const meta of Object.values(evidence.years[y].archived)) assert.equal(sha(meta.path), meta.sha256, meta.path);
  assert.equal(sha(evidence.volps03.excerpt.path), evidence.volps03.excerpt.sha256);
  for (const file of fs.readdirSync(path.join(root, RAW)).filter((f) => f.endsWith('.csv'))) {
    const text = fs.readFileSync(path.join(root, RAW, file), 'utf8');
    assert.doesNotMatch(text, /JMENO|PRIJMENI|HLASY_0|POCHLASU|PORADIMAND/, `${file}: no candidate field`);
  }
  assert.equal(evidence.results_notices['2013'].comparison.differences, 0);
  assert.equal(evidence.results_notices['2010'].status, 'not_located');
  assert.match(evidence.rights.quote, /CC BY 4\.0/);
});

test('Czechia 2010 and 2013: admission record is exact-hash and every gate is closed', () => {
  const gate = read('docs/political-data/czechia_ps2010_2013_admission.json');
  assert.deepEqual(gate.election_ids, ['el-cz-ps-2010-05-28', 'el-cz-ps-2013-10-25']);
  for (const g of Object.values(gate.gates)) assert.equal(g.status, 'closed');
  const rec = read('docs/legal-security/political_admission_records.json').admissions.find((a) => a.admission_id === 'czechia-ps-2010-2013');
  assert.equal(rec.baseline, 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d');
  assert.match(rec.verification, /official-total reconciliation and closed admission gate record$/);
  assert.equal(rec.gate_record_sha256, sha(rec.gate_record));
  for (const f of rec.files) assert.equal(sha(f.path), f.sha256, f.path);
  const rights = read('docs/legal-security/source_rights_registry.json').sources.find((s) => s.source_id === 'src-cz-volby-ps2010-2013');
  assert.equal(rights.review_status, 'verified');
  assert.equal(read('docs/legal-security/source_rights_registry.json').sources.find((s) => s.source_id === 'src-cz-volby').review_status, 'blocked', 'other volby.gov.cz files stay blocked');
});

test('Czechia 2002 and 2006: coalition lists stay whole and every list that stood is present', () => {
  const contestants = read('src/data/political/czechia/electoral_contestants.json');
  const results = read('src/data/political/czechia/election_results.json');
  const coalitions = contestants.filter((c) => /ps200[26]/.test(c.contestant_id) && c.contestant_kind === 'coalition');
  assert.deepEqual(coalitions.map((c) => [c.contestant_id, c.csu_proposer_codes.length]), [['ct-cz-ps2002-25', 2], ['ct-cz-ps2006-21', 7]]);
  const seats = { 'el-cz-ps-2002-06-14': { 3: 70, 22: 58, 23: 41, 25: 31 }, 'el-cz-ps-2006-06-02': { 9: 81, 10: 74, 18: 6, 20: 26, 24: 13 } };
  for (const [id, expected] of Object.entries(seats)) {
    const rows = results.filter((r) => r.election_id === id);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), 200);
    assert.deepEqual(Object.fromEntries(rows.filter((r) => r.seats > 0).map((r) => [Number(r.contestant_ref.slice(-2)), r.seats])), expected);
  }
  assert.equal(read('docs/legal-security/source_rights_registry.json').sources.find((s) => s.source_id === 'src-cz-volby-ps2002-2006').review_status, 'verified');
  const rec = read('docs/legal-security/political_admission_records.json').admissions.find((a) => a.admission_id === 'czechia-ps-2002-2006');
  assert.match(rec.verification, /official-total reconciliation and closed admission gate record$/);
  for (const f of rec.files) assert.equal(sha(f.path), f.sha256, f.path);
});
