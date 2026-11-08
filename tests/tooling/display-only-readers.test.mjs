import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DISPLAY_ONLY_READERS, displayOnlyPatterns, displayOnlyViolations } from "../../scripts/validation/display-only-readers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-display-isolation-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, content) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), content); };
  fs.mkdirSync(path.join(dir, "scripts"));
  write("src/lib/refreshProvenance.server.ts", fs.readFileSync(path.join(root, "src/lib/refreshProvenance.server.ts")));
  write("src/app/(zh)/data/page.tsx", "import {getRefreshManifest} from '@/lib/refreshProvenance.server';");
  write("src/app/(english)/en/data/page.tsx", "import {getRefreshManifest} from '@/lib/refreshProvenance.server';");
  return { dir, write };
}
test("exact reviewed helper and both Data Explorer routes pass; no general src/lib exception", t => {
  const f = fixture(t);
  assert.deepEqual(displayOnlyViolations(f.dir), []);
  assert.equal(DISPLAY_ONLY_READERS.length, 1);
  const [allow] = displayOnlyPatterns();
  assert.ok(allow.test("src/lib/refreshProvenance.server.ts"));
  for (const file of ["src/lib/model.ts", "src/lib/refreshProvenanceXserver.ts", "src/lib/refreshProvenance.server.ts/extra", "src/lib/other/refreshProvenance.server.ts"]) assert.equal(allow.test(file), false, file);
});
for (const file of ["src/lib/model.ts", "src/components/VarWorkbench.tsx", "src/app/(zh)/models/page.tsx", "src/app/(english)/en/scenarios/page.tsx", "src/lib/index.ts", "scripts/model.mjs"]) test(`reject importer ${file}`, t => {
  const f = fixture(t); f.write(file, "import x from '@/lib/refreshProvenance.server';");
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("unauthorised importer") && message.includes(file)));
});
for (const code of [
  "import x from './refreshProvenance.server';",
  "export * from '@/lib/refreshProvenance.server';",
  "const x=require('@/lib/refreshProvenance.server');",
  "const x=import('@/lib/refreshProvenance.server');",
  'const x=import(`@/lib/refreshProvenance.server`);',
  "import x from '@/lib/./refreshProvenance.server.ts';",
  "import x from '@/lib/refreshProvenance.server.js';",
]) test(`module syntax still rejects model access: ${code}`, t => {
  const f = fixture(t); f.write("src/lib/model.ts", code);
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("src/lib/model.ts")));
});
test("moving, deleting, repurposing or orphaning the helper fails closed", t => {
  const f = fixture(t), helper = path.join(f.dir, "src/lib/refreshProvenance.server.ts"), original = fs.readFileSync(helper);
  fs.renameSync(helper, `${helper}.moved`);
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("missing")));
  fs.writeFileSync(helper, `${original}\nexport const modelInput = 1;`);
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("hash changed")));
  fs.writeFileSync(helper, original);
  f.write("src/app/(zh)/data/page.tsx", ""); f.write("src/app/(english)/en/data/page.tsx", "");
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("no Data Explorer importer")));
});
test("approved route cannot silently point at a moved or unresolved helper", t => {
  const f = fixture(t); f.write("src/app/(zh)/data/page.tsx", "import x from '@/lib/moved/refreshProvenance.server';");
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("unresolved or moved")));
});
test("a renamed tsconfig alias cannot hide a model importer", t => {
  const f = fixture(t);
  f.write("tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"], "@projection": ["src/lib/refreshProvenance.server.ts"] } } }));
  f.write("src/lib/model.ts", "import {getRefreshManifest} from '@projection';");
  assert.ok(displayOnlyViolations(f.dir).some(message => message.includes("unauthorised importer") && message.includes("src/lib/model.ts")));
});
