import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { approvedDataRefreshFiles, DATA_REFRESH_FILE, DATA_REFRESH_RUNS, NEW_PATH_SCOPE, newPathAllowed } from '../../docs/political-data/source-closure/data-refresh-amendments.mjs';
import { checkFrozenFiles } from '../../docs/political-data/source-closure/ui-amendments.mjs';
import { unapprovedFrozenChanges } from '../../scripts/political-data/germany/frozen-boundary.mjs';
import { findHashPins } from '../../scripts/data-refresh/lib.mjs';

const records = () => JSON.parse(fs.readFileSync(DATA_REFRESH_FILE, 'utf8')).refreshes;
const BASE = 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d';

test('the approved runs pin exactly their files at their current hashes and match the ledger', () => {
  const { approved, problems } = approvedDataRefreshFiles(records());
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...new Set(Object.values(DATA_REFRESH_RUNS).flatMap((r) => r.paths))].sort());
  for (const [file, hash] of approved) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, file);
  const ledger = fs.readFileSync('src/data/data-refresh/refresh_ledger.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  for (const r of records()) {
    const entry = ledger.find((e) => e.run_id === r.run_id);
    assert.ok(entry, r.run_id);
    assert.equal(entry.formal_model_impact, 'none');
    assert.equal(entry.plan_sha256, r.ledger_plan_sha256);
  }
  assert.equal(ledger.at(-1).run_id, 'ledger-correction-20261110');
  assert.equal(ledger.at(-1).corrects.run_id, 'historical-recovery-20261110');
});

test('a later run supersedes an earlier run for shared files', () => {
  const [eurostat, serbia] = records();
  const shared = 'src/data/data-coverage/descriptive_data_coverage_audit.json';
  const hashIn = (r) => r.files.find((f) => f.path === shared).sha256;
  assert.equal(approvedDataRefreshFiles([serbia, eurostat]).approved.get(shared), hashIn(serbia));
  assert.equal(approvedDataRefreshFiles([eurostat]).approved.get(shared), hashIn(eurostat));
});

test('fails closed: other paths, unknown runs, permissive flags and hash drift', () => {
  const r = records()[0];
  for (const file of ['src/data/observations/observations.json', 'src/data/high-frequency/snapshots/x.json', 'src/data/macro-drivers/macro_driver_observations.json', 'src/data/release.json']) {
    assert.ok(approvedDataRefreshFiles([{ ...r, files: [...r.files, { path: file, sha256: 'a'.repeat(64) }] }]).problems.length, file);
  }
  assert.ok(approvedDataRefreshFiles([{ ...r, run_id: 'monthly-eurostat-20261120' }]).problems.length);
  for (const flag of ['formal_model_input_change_allowed', 'frozen_snapshot_change_allowed', 'model_change_allowed', 'release_version_change_allowed']) assert.ok(approvedDataRefreshFiles([{ ...r, [flag]: true }]).problems.length, flag);
  const file = r.files[0].path;
  const run = (hash) => checkFrozenFiles({ baselineFiles: { [file]: '1'.repeat(64) }, currentFiles: [file], hashOf: () => hash, amendments: [], dataRefreshes: [r] });
  assert.equal(run(r.files[0].sha256).ok, true);
  assert.equal(run('0'.repeat(64)).ok, false);
  assert.equal(checkFrozenFiles({ baselineFiles: {}, currentFiles: [file], hashOf: () => r.files[0].sha256, amendments: [], dataRefreshes: [r] }).ok, false, 'not a new file');
  assert.deepEqual(unapprovedFrozenChanges(DATA_REFRESH_RUNS['monthly-eurostat-20261019'].paths.join('\n'), BASE), []);
  assert.deepEqual(unapprovedFrozenChanges('src/data/observations/observations.json', BASE), ['src/data/observations/observations.json']);
});

test('the refresh ledger is provenance, not a pin; other references still count', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pins-'));
  fs.mkdirSync(path.join(root, 'src/data/data-refresh'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/data/models'), { recursive: true });
  const hash = 'b'.repeat(64);
  fs.writeFileSync(path.join(root, 'src/data/data-refresh/refresh_ledger.jsonl'), JSON.stringify({ previous_sha256: hash }) + '\n');
  assert.deepEqual(findHashPins(root, { 'public/x.json': hash })['public/x.json'], []);
  fs.writeFileSync(path.join(root, 'src/data/models/output.json'), JSON.stringify({ input_sha256: hash }));
  assert.deepEqual(findHashPins(root, { 'public/x.json': hash })['public/x.json'], ['src/data/models/output.json']);
});

test('historical recovery: new files only within the declared scope, at exact hashes, and only for a run that allows them', () => {
  const rec = records().find((r) => r.run_id === 'historical-recovery-20261110');
  const { added } = approvedDataRefreshFiles(records());
  assert.ok(added.size > 0);
  for (const [p] of added) assert.ok(NEW_PATH_SCOPE.some((re) => re.test(p)), p);
  const newFile = [...added.keys()][0], hash = added.get(newFile);
  const run = (file, h, recs = records()) => checkFrozenFiles({ baselineFiles: {}, currentFiles: [file], hashOf: () => h, amendments: [], dataRefreshes: recs });
  assert.equal(run(newFile, hash).ok, true);
  assert.equal(run(newFile, '0'.repeat(64)).ok, false, 'hash drift');
  for (const outside of ['src/data/observations/new.json', 'src/data/historical/raw/annual/x.json', 'public/research-data/new.json', 'src/data/historical/raw/annual/full/../x.json']) assert.equal(newPathAllowed(rec.run_id, outside), false, outside);
  assert.equal(newPathAllowed('serbia-20261020', newFile), false, 'runs without allow_new_paths cannot add files');
  const other = { ...records().find((r) => r.run_id === 'serbia-20261020'), files: [...records().find((r) => r.run_id === 'serbia-20261020').files, { path: newFile, sha256: hash }] };
  assert.equal(run(newFile, hash, [other]).ok, false, 'a run without allow_new_paths cannot admit a new file');
});

test('ledger correction: a later run supersedes a new file hash in run order, never in file order', () => {
  const recs = records(), inv = 'src/data/data-coverage/historical_recovery_inventory.json';
  const recovery = recs.find((r) => r.run_id === 'historical-recovery-20261110'), correction = recs.find((r) => r.run_id === 'ledger-correction-20261110');
  const hashIn = (r) => r.files.find((f) => f.path === inv).sha256;
  assert.notEqual(hashIn(recovery), hashIn(correction));
  assert.equal(approvedDataRefreshFiles(recs).added.get(inv), hashIn(correction));
  assert.equal(approvedDataRefreshFiles([correction, recovery]).added.get(inv), hashIn(correction), 'reversed file order');
  assert.equal(approvedDataRefreshFiles([recovery]).added.get(inv), hashIn(recovery));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(inv)).digest('hex'), hashIn(correction));
  for (const p of DATA_REFRESH_RUNS['ledger-correction-20261110'].paths) assert.ok(p.endsWith('refresh_ledger.jsonl') || newPathAllowed('ledger-correction-20261110', p), p);
  assert.equal(newPathAllowed('ledger-correction-20261110', 'src/data/observations/new.json'), false);
});
