// Tests for the research-data write guard (.claude/hooks). Run: pnpm tooling:test
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { classifyCommand, createContext, diffStates, sourceWriteFindings } from "../../.claude/hooks/lib/research-data-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const classify = (command, cwd = root) => classifyCommand(command, createContext(root, cwd));
const asks = (command, cwd) => classify(command, cwd).length > 0;

test("shell mutation syntax on protected paths asks", () => {
  for (const command of [
    "echo x > src/data/release.json",
    "echo x >> ./public/research-data/manifest.json",
    `echo x > ${root}/src/data/serbia/x.json`,
    "cat foo | tee src/data/observations/observations.json",
    "cp /tmp/a.json src/data/historical/annual_descriptive_history.json",
    "cp -r scratch/data/ src/data",
    "mv src/data/serbia/raw/a.json /tmp/",
    "rm -rf public/research-data/v2",
    "rm src/data/**/*.json",
    "sed -i '' 's/a/b/' src/data/sources/sources.json",
    "perl -pi -e 's/a/b/' public/research-data/x.csv",
    "find src/data -name '*.tmp' -delete",
    "find public/research-data -type f -exec rm {} +",
    "touch src/data/new.json",
    "unzip pkg.zip -d public/research-data",
    "curl -s https://example.org -o src/data/raw.json",
    "tar -xzf bundle.tgz -C src/data",
    "ln -s /tmp/x src/data/x",
    "rsync -a staged/ src/data/",
    "cd src/data && rm serbia/raw/x.json",
    "cd src/data/historical; echo > a.json",
    "node -e \"require('fs').writeFileSync('src/data/x.json', '{}')\"",
    "python3 -c \"open('src/data/x.json','w').write('{}')\"",
    "node <<'EOF'\nconst fs = require('fs');\nfs.writeFileSync('public/research-data/a.json', '1');\nEOF",
    "bash -c 'echo 1 > src/data/x'",
    "cat > src/data/x.json <<'EOF'\n{}\nEOF",
    "git checkout -- public/research-data",
    "git restore src/data/analysis/advanced_analysis_validation_summary.json",
    "git rm src/data/observations/observations.json",
  ]) assert.ok(asks(command), `expected ask: ${command}`);
});

test("known writers and acquisition/build commands ask", () => {
  for (const command of [
    "pnpm hf:acquire", "pnpm run historical-annual:acquire", "npm run historical-monthly:acquire", "pnpm historical-regional:acquire",
    "node scripts/serbia-sors/ingest.mjs", "node scripts/serbia-sors/ingest.mjs --offline", "pnpm macro:acquire-drivers",
    ".venv/bin/python scripts/acquisition/acquire-macro-drivers.py", "pnpm export:research-data", "pnpm package:research-data",
    "pnpm build", "pnpm data-coverage:audit", "pnpm lp:build", "pnpm panel-lp:reference", "pnpm var:selection-bootstrap-simulate",
    "node scripts/data-refresh/apply.mjs --run x", "REUSE_FROZEN_RESEARCH_OUTPUTS=1 pnpm export:research-data",
    "node scripts/export-research-data.mjs && node scripts/release/build-research-package.mjs",
    "pnpm lp:path-validate", "node scripts/validation/validate-local-projections.mjs",
  ]) assert.ok(asks(command), `expected ask: ${command}`);
});

test("read-only commands and validators stay silent", () => {
  for (const command of [
    "cat src/data/release.json", "head -5 src/data/serbia/serbia_indicator_mapping.json", "ls public/research-data",
    "grep -rn gdp src/data/observations", "jq '.records | length' src/data/historical/annual_descriptive_history.json",
    "cp src/data/release.json /tmp/release.json", "shasum -a 256 src/data/high-frequency/*.json",
    "find src/data -name '*.json' -exec shasum {} +", "git diff -- src/data", "git status --short src/data",
    "git log --oneline -- public/research-data", "git show HEAD:src/data/release.json > /tmp/r.json",
    "wc -l src/data/serbia/*.json 2>/dev/null", "node -e \"console.log(require('./src/data/release.json').version)\"",
    "pnpm data-coverage:validate", "pnpm ui-language:qa", "pnpm lint", "pnpm typecheck", "pnpm build:site", "pnpm test:ui",
    "pnpm historical-annual:validate", "pnpm historical-monthly:validate", "pnpm historical-regional:validate",
    "pnpm serbia-audit:validate", "pnpm release:validate", "pnpm seo:validate", "pnpm news:validate", "pnpm lp:validate",
    "pnpm ui:regression-validate", "pnpm panel-lp:validate", "pnpm var:selection-bootstrap-reference-validate",
    "node scripts/data-refresh/plan.mjs --mode monthly --offline", "pnpm data-refresh:plan -- --mode serbia",
    "echo done > /tmp/x.txt", "rm -rf .tmp-data-refresh/run-1", "cp -r src/data .tmp-data-refresh/run-1/src/",
  ]) assert.deepEqual(classify(command), [], `expected silent: ${command}`);
});

test("git tree operations ask only when research data would change", () => {
  assert.ok(asks("git checkout 2e4f08c"), "older commit has different research data");
  assert.deepEqual(classify("git checkout HEAD"), []);
  assert.deepEqual(classify("git checkout -- src/app/page.tsx"), []);
  assert.ok(asks("git pull"));
});

test("static write analysis follows path variables and helpers", () => {
  assert.deepEqual(sourceWriteFindings(`const out = path.join(root, "public/og");\nfs.writeFileSync(path.join(out, "a.png"), b);\nconst r = read("src/data/release.json");`), []);
  assert.deepEqual(sourceWriteFindings(`const data = path.join(root, "src/data"); const dir = path.join(data, "lp");\nconst write = (n, v) => fs.writeFileSync(path.join(dir, n), v);\nwrite("a.json", 1);`), [3]);
  assert.deepEqual(sourceWriteFindings(`OUT = ROOT / "src" / "data" / "macro"\n(OUT / "x.json").write_text("1")`, { python: true }), [2]);
  assert.deepEqual(sourceWriteFindings(`const s = "a".replace("x", "y");\nconsole.log("src/data")`), []);
  assert.deepEqual(sourceWriteFindings(`export const P = "src/data/x.json";\nif (import.meta.url === \`file://\${process.argv[1]}\`) {\n  fs.writeFileSync(P, "1");\n}`, { importedOnly: true }), []);
});

test("PostToolUse detector reports files changed by a command", () => {
  const before = { "src/data/a.json": " M|10:1" };
  assert.deepEqual(diffStates(before, before), []);
  assert.deepEqual(diffStates(before, { "src/data/a.json": " M|11:2", "public/research-data/b.json": "??|3:3" }), ["public/research-data/b.json", "src/data/a.json"]);
  assert.deepEqual(diffStates(before, {}), ["src/data/a.json"]);
});

test("hook entry points emit the documented JSON", () => {
  const run = (script, payload) => spawnSync(process.execPath, [path.join(root, ".claude/hooks", script)], { input: JSON.stringify(payload), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const session = `test-${process.pid}`;
  const ask = JSON.parse(run("guard-research-data.mjs", { session_id: session, tool_use_id: "t1", tool_name: "Bash", cwd: root, tool_input: { command: "rm src/data/release.json" } }).stdout);
  assert.equal(ask.hookSpecificOutput.permissionDecision, "ask");
  assert.equal(run("guard-research-data.mjs", { session_id: session, tool_use_id: "t2", tool_name: "Bash", cwd: root, tool_input: { command: "pnpm lint" } }).stdout, "");
  const edit = JSON.parse(run("guard-research-data.mjs", { tool_name: "Write", cwd: root, tool_input: { file_path: path.join(root, "src/data/x.json") } }).stdout);
  assert.equal(edit.hookSpecificOutput.permissionDecision, "ask");
  assert.equal(run("guard-research-data.mjs", { tool_name: "Edit", cwd: root, tool_input: { file_path: path.join(root, "src/app/page.tsx") } }).stdout, "");
  // Detector: a state file that lacks a now-dirty file is reported; an identical state is silent.
  const dir = path.join(os.tmpdir(), "atlas-research-guard");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${session}-t3.json`), JSON.stringify({ "src/data/never-existed.json": "??|1:1" }));
  const report = JSON.parse(run("detect-research-data-changes.mjs", { session_id: session, tool_use_id: "t3", tool_name: "Bash", cwd: root }).stdout);
  assert.equal(report.decision, "block");
  assert.match(report.systemMessage, /never-existed/);
  assert.equal(run("detect-research-data-changes.mjs", { session_id: session, tool_use_id: "t2", tool_name: "Bash", cwd: root }).stdout, "");
});
