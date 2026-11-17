// Romania 2016 (Chamber of Deputies and Senate), admitted 2026-11-18 from AEP files on data.gov.ro (owner answers "both"
// and "ii then i"). Targeted checks: the chambers stay separate, minority seats follow Art. 56 and the Chamber's own list,
// no turnout is invented, independents carry no names.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildRomania, reconcile } from '../../scripts/political-data/romania/build-parliament.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/political-data/raw/romania/parliament/evidence.json'), 'utf8'));

test('the build reproduces the committed stores and exports', () => {
  const run = spawnSync(process.execPath, ['scripts/political-data/romania/build-parliament.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('Chamber of Deputies and Senate are separate elections and never combined', () => {
  const data = buildRomania();
  assert.deepEqual(data.elections.map((e) => [e.election_id, e.chamber]), [['el-ro-cd-2016-12-11', 'Camera Deputaților'], ['el-ro-s-2016-12-11', 'Senat']]);
  assert.deepEqual(data.legislatures.map((l) => l.total_seats), [329, 136]);
  for (const e of data.elections) {
    const rows = data.election_results.filter((r) => r.election_id === e.election_id);
    assert.equal(new Set(rows.map((r) => r.vote_type)).size, 1);
    assert.equal(rows.reduce((n, r) => n + r.seats, 0), e.chamber === 'Senat' ? 136 : 329);
    assert.ok(rows.every((r) => r.valid_votes === rows[0].valid_votes));
  }
  assert.notEqual(data.election_results.find((r) => r.vote_type === 'ro_cd_list_vote').valid_votes, data.election_results.find((r) => r.vote_type === 'ro_s_list_vote').valid_votes);
});

test('Chamber: 312 list seats plus 17 minority organisation seats, matching the Chamber list for 2016-2020', () => {
  const data = buildRomania();
  const cd = data.election_results.filter((r) => r.election_id === 'el-ro-cd-2016-12-11');
  assert.equal(cd.reduce((n, r) => n + (r.list_seats ?? 0), 0), 312);
  assert.equal(cd.reduce((n, r) => n + (r.minority_seats ?? 0), 0), 17);
  const minority = data.electoral_contestants.filter((c) => c.contestant_kind === 'national_minority_organisation');
  assert.deepEqual(minority.map((c) => c.abbreviation).sort(), [...evidence.elections['2016'].minority_cross_check.organisations].sort());
  const c = structuredClone(evidence.elections['2016'].chambers.CD);
  assert.throws(() => reconcile('CD', c, evidence.elections['2016'].minority_cross_check.organisations.slice(1)), /Art\. 56/);
});

test('seats fail closed: Senate allocation reproduces exactly; a tampered seat file breaks the build', () => {
  const s = structuredClone(evidence.elections['2016'].chambers.S);
  assert.equal(reconcile('S', s, []).allocation_model, 'reproduced exactly');
  s.seats_by_constituency[0][Object.keys(s.seats_by_constituency[0])[2]] += 1;
  assert.throws(() => reconcile('S', s, []));
});

test('no turnout is invented and no independent candidate is named', () => {
  const data = buildRomania();
  assert.ok(data.election_turnout.every((t) => t.eligible_voters === null && t.voters === null && t.derived_turnout === null && t.published_turnout === null));
  const ind = data.electoral_contestants.filter((c) => c.contestant_kind === 'independent_candidates_aggregate');
  assert.deepEqual(ind.map((c) => c.independent_candidates), [39, 5]);
  for (const dir of ['src/data/political/romania', 'public/research-data/political/romania', 'docs/political-data/raw/romania']) {
    for (const file of fs.readdirSync(path.join(root, dir), { recursive: true }).map(String).filter((x) => /\.(json|csv|md)$/.test(x))) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, dir, file), 'utf8'), /CANDIDAT INDEPENDENT - [A-ZĂÂÎȘȚŞŢ]/, `${dir}/${file}`);
    }
  }
});
