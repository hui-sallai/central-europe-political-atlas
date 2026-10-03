import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  RESULT_STATUSES, checkResultRecord, blockedFieldReason, personRecordProblems, canExport, canAcquire,
  CLIENT_STORAGE_ALLOWLIST, externalScriptSources, isUnsafeUrl, csvFormulaSafe, SITE_OPERATING_MODES, NO_PROFILING_EN, NO_PROFILING_ZH,
} from '../../scripts/legal-security/policy.mjs';
import { scanJson, scanCopy } from '../../scripts/legal-security/person-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const registry = json('docs/legal-security/network_acquisition_registry.json');
const rights = json('docs/legal-security/source_rights_registry.json');
const source = (id) => rights.sources.find((s) => s.source_id === id);

test('1. person stance and ideology fields are blocked', () => {
  for (const k of ['person_stance', 'politician_ideology', 'mp_orientation', 'ideology_score']) assert.ok(blockedFieldReason(k), k);
});
test('2. left-right / populism / euroscepticism scale scores are blocked', () => {
  for (const k of ['left_right', 'lrgen', 'galtan', 'populism_score', 'euroscepticism', 'pro_russia']) assert.ok(blockedFieldReason(k), k);
});
test('3. inferred or predicted person attributes are blocked', () => {
  for (const k of ['inferred_orientation', 'predicted_vote', 'vote_intention', 'win_probability']) assert.ok(blockedFieldReason(k), k);
});
test('4. forecasting, profiling and microtargeting fields are blocked', () => {
  for (const k of ['election_forecast', 'seat_projection', 'psychographic_segment', 'microtarget_group', 'voter_profile', 'stance_extraction']) assert.ok(blockedFieldReason(k), k);
});
test('5. aggregate party/election fields and unrelated keys remain allowed', () => {
  for (const k of ['party_id', 'vote_share', 'seats', 'turnout', 'valid_votes', 'orientation', 'profile', 'target', 'result_status']) assert.equal(blockedFieldReason(k), null, k);
});
test('6. result-status enum has no prediction values', () => {
  for (const v of ['likely_winner', 'projected_winner', 'forecast', 'expected_result']) assert.ok(!RESULT_STATUSES.includes(v));
  assert.deepEqual(checkResultRecord({ result_status: 'projected_winner' }).length, 1);
  assert.deepEqual(checkResultRecord({ result_status: 'official_final' }), []);
});
test('7. provisional results need timestamp, coverage, source and retrieval and may not claim finality', () => {
  assert.ok(checkResultRecord({ result_status: 'official_provisional' }).length >= 4);
  const ok = { result_status: 'official_partial', status_timestamp: 't', coverage: 0.9, source: 's', retrieved_at: 'r' };
  assert.deepEqual(checkResultRecord(ok), []);
  assert.ok(checkResultRecord({ ...ok, is_final: true }).some((e) => /final/.test(e)));
});
test('8. person-like records may hold only allowlisted public-role fields', () => {
  assert.deepEqual(personRecordProblems({ person_id: 'p1', name: 'X', office: 'MP', source_url: 'u' }), []);
  assert.ok(personRecordProblems({ person_id: 'p1', name: 'X', birth_place: 'Y', email: 'e' }).length === 2);
});
test('9. scanJson flags nested person-level political attributes', () => {
  const findings = scanJson({ people: [{ mp_id: 'm', name: 'X', religion: 'r' }], meta: { person_stance: 'x' } }, 'fixture.json');
  assert.ok(findings.length >= 2);
});
test('10. Germany alias "final" is accepted only as official_final', () => {
  assert.deepEqual(scanJson({ result_status: 'final' }, 'src/data/political/germany/x.json'), []);
  assert.equal(scanJson({ result_status: 'likely' }, 'src/data/political/germany/x.json').length, 1);
});
test('11. person-level political labels in Atlas copy are flagged', () => {
  assert.equal(scanCopy('The minister is a far-right populist.', 'x.ts').length, 2);
  assert.equal(scanCopy('该议员属于极右', 'x.ts').length, 1);
  assert.equal(scanCopy('Party vote share rose by 2 points.', 'x.ts').length, 0);
});
test('12. export fails closed for unknown, blocked or uncleared sources', () => {
  assert.equal(canExport(undefined, 'derived').ok, false);
  assert.equal(canExport(source('src-cz-volby'), 'derived').ok, false);
  assert.equal(canExport(source('src-de-bundeswahlleiterin'), 'derived').ok, true);
  assert.equal(canExport(source('src-de-bundeswahlleiterin'), 'bogus').ok, false);
});
test('13. every rights-registry source has a review status', () => {
  for (const s of rights.sources) assert.ok(['verified', 'documented', 'legacy_review_due', 'blocked', 'pending_publisher'].includes(s.review_status), s.source_id);
});
test('14. unknown hosts are blocked for acquisition', () => {
  assert.equal(canAcquire(registry, 'https://unknown.example.org/data.csv', 'automated').ok, false);
  assert.equal(canAcquire(registry, 'not a url', 'manual').ok, false);
});
test('15. statistics.sk and bmi.gv.at are blocked for automated collection', () => {
  assert.equal(canAcquire(registry, 'https://slovak.statistics.sk/x', 'automated').ok, false);
  assert.equal(canAcquire(registry, 'https://www.bmi.gv.at/412/', 'automated').ok, false);
  assert.equal(canAcquire(registry, 'https://ec.europa.eu/eurostat/api/x', 'automated').ok, true);
});
test('16. client storage allowlist is exactly the notebook and theme keys', () => {
  assert.deepEqual(CLIENT_STORAGE_ALLOWLIST.map((k) => k.key).sort(), ['atlas-theme', 'central-europe-atlas:research-notebook:v1']);
});
test('17. third-party scripts and unsafe URLs are detected', () => {
  assert.deepEqual(externalScriptSources('<script src="https://cdn.example.com/a.js"></script><script src="/_next/a.js"></script>', 'hy-central-europe-analysis.org'), ['https://cdn.example.com/a.js']);
  assert.equal(isUnsafeUrl('javascript:alert(1)'), true);
  assert.equal(isUnsafeUrl('https://ec.europa.eu'), false);
});
test('18. CSV formula injection is neutralised but numbers are kept', () => {
  assert.equal(csvFormulaSafe('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
  assert.equal(csvFormulaSafe('@SUM(A1)'), `'@SUM(A1)`);
  assert.equal(csvFormulaSafe('-1.5'), '-1.5');
});
test('19. operating mode is non-commercial and the publisher gate stays NOT_READY without owner confirmations', () => {
  const mode = json('docs/legal-security/site_operating_mode.json');
  assert.ok(SITE_OPERATING_MODES.includes(mode.site_operating_mode));
  assert.equal(mode.site_operating_mode, 'noncommercial_research');
  const checklist = fs.readFileSync(path.join(root, 'docs/legal-security/publisher_contact_release_checklist.md'), 'utf8');
  assert.match(checklist, /Current status: NOT_READY_FOR_OWNER_TO_CONTACT_PUBLISHERS/);
});
test('20. source-level legal-security gate passes and pages carry the exact no-profiling statements', () => {
  for (const [f, s] of [['src/app/(zh)/privacy/page.tsx', NO_PROFILING_ZH], ['src/app/(zh)/legal/page.tsx', NO_PROFILING_ZH], ['src/app/(english)/en/privacy/page.tsx', NO_PROFILING_EN], ['src/app/(english)/en/legal/page.tsx', NO_PROFILING_EN]]) {
    assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes(s), f);
  }
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/legal-security/validate.mjs'), '--source-only'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
