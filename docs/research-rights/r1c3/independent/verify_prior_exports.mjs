// Usage at repository root: node path/to/verify_prior_exports.mjs DIRECTORY_WITH_ORIGINAL_BROWSER_ZIPS
import {readFileSync,readdirSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
if (!process.argv[2]) throw new Error("Supply the directory containing original snapshot ZIPs.");
await import(pathToFileURL(path.resolve("tests/fixtures/research-package-sors.mjs")).href);
const require = createRequire(path.resolve("package.json"));
const {readStoredArchive} = require("./src/lib/researchPackageArchive.ts");
const {inspectSnapshot} = require("./src/lib/researchPackageSnapshot.ts");
const {assessSnapshotRights} = require("./src/lib/researchPackageRights.ts");
const pins = JSON.parse(readFileSync("docs/research-rights/r1c3/captured_snapshots.json")).views;
const rows = [];
for (const file of readdirSync(process.argv[2]).filter(f=>f.endsWith(".zip")).sort()) {
  const bytes = new Uint8Array(readFileSync(path.join(process.argv[2],file)));
  const snapshot = await inspectSnapshot(bytes);
  const members = readStoredArchive(bytes);
  const digest = name => createHash("sha256").update(members.get(name)).digest("hex");
  const expected = pins[file.slice(0,-4)];
  const rights = await assessSnapshotRights(snapshot, members, bytes);
  if (expected) {
    if (expected.zip_sha256) assert.equal(snapshot.sha256,expected.zip_sha256);
    assert.equal(digest("data.csv"),expected.data_csv_sha256);
    assert.equal(digest("sources.csv"),expected.sources_csv_sha256);
  }
  assert.equal(rights.scope, ["rs-cpi.zip","rs-lfs.zip"].includes(file) ? "normalized_members" : "reference_only");
  rows.push({file,archive:snapshot.sha256,original_time:snapshot.manifest.generated_at,
    data:digest("data.csv"),sources:digest("sources.csv"),observations:snapshot.rows.length,figure:snapshot.figure?.attachment??null,
    disposition:rights.scope,exact_archive_pinned_in_dossier:Boolean(expected?.zip_sha256)});
}
assert.ok(rows.some(r=>r.archive==="d1ac906ee775e40cbe5175e000f045ac831f5ca49fa8f715272e493f91e37985"));
console.log(JSON.stringify(rows,null,2));
