// Check mode for research exports: regenerates exports from a clean copy of HEAD in a temporary directory, exactly as
// CI does (REUSE_FROZEN_RESEARCH_OUTPUTS=1), and compares them with the committed src/data and public/research-data.
// It never writes to the working tree. release_manifest.json is deterministic and compared byte-for-byte; per-build
// identity lives in the gitignored deployment_provenance.json, which (like the research zip) is not committed state.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitignored = (rel) => spawnSync('git', ['check-ignore', '-q', '--no-index', '--', rel], { cwd: root }).status === 0;

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
    if (sha(committed) !== sha(fs.readFileSync(generatedPath))) differing.push({ file: rel, issue: 'committed export differs from regenerated export' });
  }
  const untracked = [];
  for (const dir of ['src/data', 'public/research-data']) {
    const walk = (d) => { for (const e of fs.readdirSync(path.join(tmp, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (!tracked.includes(p) && !gitignored(p)) untracked.push(p); } };
    walk(dir);
  }
  for (const p of untracked) differing.push({ file: p, issue: 'new file produced by export but not committed' });
  console.log(JSON.stringify({ status: differing.length ? 'fail' : 'pass', checked: tracked.length, differing }, null, 1));
  if (differing.length) process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
