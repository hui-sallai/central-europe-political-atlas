import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { approvedDataRefreshFiles, DATA_REFRESH_FILE, DATA_REFRESH_RUNS } from '../../docs/political-data/source-closure/data-refresh-amendments.mjs';
import { checkFrozenFiles } from '../../docs/political-data/source-closure/ui-amendments.mjs';
import { unapprovedFrozenChanges } from '../../scripts/political-data/germany/frozen-boundary.mjs';
import { findHashPins } from '../../scripts/data-refresh/lib.mjs';

const records = () => JSON.parse(fs.readFileSync(DATA_REFRESH_FILE, 'utf8')).refreshes;
const BASE = 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d';

test('the approved run pins exactly its files at their current hashes and matches the ledger', () => {
  const { approved, problems } = approvedDataRefreshFiles(records());
  assert.deepEqual(problems, []);
  assert.deepEqual([...approved.keys()].sort(), [...DATA_REFRESH_RUNS['monthly-eurostat-20261019'].paths].sort());
  for (const [file, hash] of approved) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, file);
  const ledger = fs.readFileSync('src/data/data-refresh/refresh_ledger.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.at(-1).run_id, 'monthly-eurostat-20261019');
  assert.equal(ledger.at(-1).formal_model_impact, 'none');
  assert.equal(ledger.at(-1).plan_sha256, records()[0].ledger_plan_sha256);
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
