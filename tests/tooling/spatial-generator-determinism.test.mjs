import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test("spatial generator reproduces all committed decisions and license bytes on two runs", t => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-spatial-reproduction-"));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  fs.mkdirSync(path.join(sandbox, "scripts"));
  fs.cpSync(path.join(root, "public/data/boundaries/v086"), path.join(sandbox, "public/data/boundaries/v086"), { recursive: true });
  fs.copyFileSync(path.join(root, "scripts/build-spatial-data-v087.mjs"), path.join(sandbox, "scripts/build-spatial-data-v087.mjs"));
  const files = ["shared-license-records.json", "regional-geometry-qa.json", "public-display-decisions.json"];
  const expected = files.map(file => fs.readFileSync(path.join(root, "public/data/boundaries/v087", file)));
  for (let run = 0; run < 2; run++) {
    execFileSync(process.execPath, [path.join(sandbox, "scripts/build-spatial-data-v087.mjs")], { cwd: sandbox, stdio: "pipe" });
    files.forEach((file, i) => assert.deepEqual(fs.readFileSync(path.join(sandbox, "public/data/boundaries/v087", file)), expected[i], `run ${run + 1}: ${file}`));
  }
});
