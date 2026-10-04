// Check mode for research exports: regenerates exports from a clean copy of HEAD in a temporary directory, exactly as
// CI does (REUSE_FROZEN_RESEARCH_OUTPUTS=1), and compares them with the committed src/data and public/research-data.
// It never writes to the working tree. Per-build provenance fields in release_manifest.json are excluded.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROVENANCE = { 'public/research-data/release_manifest.json': ['source_commit', 'build_context', 'workflow_run_id', 'generated_at', 'research_package'] };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const normalized = (rel, buf) => {
  if (!PROVENANCE[rel]) return sha(buf);
  const value = JSON.parse(buf.toString('utf8'));
  for (const key of PROVENANCE[rel]) delete value[key];
  return sha(JSON.stringify(value));
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-export-check-'));
try {
  const archive = execFileSync('git', ['archive', '--format=tar', 'HEAD'], { cwd: root, maxBuffer: 2e9 });
  execFileSync('tar', ['-x', '-C', tmp], { input: archive, maxBuffer: 2e9 });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
  const run = spawnSync(process.execPath, ['scripts/export-research-data.mjs'], { cwd: tmp, encoding: 'utf8', env: { ...process.env, REUSE_FROZEN_RESEARCH_OUTPUTS: '1', RELEASE_COMMIT_SHA: 'export-check' } });
  if (run.status !== 0) { console.error(run.stderr || run.stdout); process.exit(2); }
  const tracked = execFileSync('git', ['ls-files', 'src/data', 'public/research-data'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const differing = [];
  for (const rel of tracked) {
    const committed = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: root, maxBuffer: 2e9 });
    const generatedPath = path.join(tmp, rel);
    if (!fs.existsSync(generatedPath)) { differing.push({ file: rel, issue: 'missing after export' }); continue; }
    if (normalized(rel, committed) !== normalized(rel, fs.readFileSync(generatedPath))) differing.push({ file: rel, issue: 'committed export differs from regenerated export' });
  }
  const untracked = [];
  for (const dir of ['src/data', 'public/research-data']) {
    const walk = (d) => { for (const e of fs.readdirSync(path.join(tmp, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (!tracked.includes(p) && !/\.zip$/.test(p)) untracked.push(p); } };
    walk(dir);
  }
  for (const p of untracked) differing.push({ file: p, issue: 'new file produced by export but not committed' });
  console.log(JSON.stringify({ status: differing.length ? 'fail' : 'pass', checked: tracked.length, differing }, null, 1));
  if (differing.length) process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
