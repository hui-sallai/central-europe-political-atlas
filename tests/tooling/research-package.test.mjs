import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { example } from "../fixtures/research-package-example.mjs";
import { SORS_FIXTURE_TIME as time } from "../fixtures/research-package-sors.mjs";

const require = createRequire(import.meta.url);
const {buildResearchPackage, prepareSnapshotAttachment, verifyResearchPackageIntegrity} = require("../../src/lib/researchPackage.ts");
const {addNotebookEvidence} = require("../../src/lib/researchNotebook.ts");
const {notebookObservation} = require("../../src/components/notebookEvidence.ts");
const {buildReportCitationBundle} = require("../../src/lib/notebookCitations.ts");
const {buildZip} = require("../../src/lib/clientZip.ts");
const {readStoredArchive} = require("../../src/lib/researchPackageArchive.ts");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

test("Portable fixed example preserves exact source bytes and R1-B, orders bindings, isolates return values and keeps blocked evidence unbound", async () => {
  const opts = example();
  const {project,selectedIds,cpi,lfs} = opts;
  const prior = JSON.stringify(project);
  const first = await prepareSnapshotAttachment(project, selectedIds[0], cpi.bytes, hash(cpi.bytes));
  const second = await prepareSnapshotAttachment(project, selectedIds[1], lfs.bytes);
  const pack = await buildResearchPackage({...opts,attachments:[second,first]});
  const read = readStoredArchive(pack.bytes);
  assert.equal(hash(pack.bytes),pack.sha256);
  assert.equal(pack.sha256,"e60ea7d4532b911164c0c6e4674a4778b8b608605954ccfced233a51a06a9463");
  for (const artifact of pack.manifest.artifacts) {
    assert.deepEqual(artifact.actual_scope.source_rows.flatMap(edge => edge.observation_ids).sort(),
      [...artifact.actual_scope.observation_ids].sort());
    assert.ok(artifact.actual_scope.source_rows.every(edge => artifact.actual_scope.source_ids.includes(edge.source_id)));
  }
  assert.deepEqual((await verifyResearchPackageIntegrity(pack.bytes,pack.sha256)).verified_members,read.size-1);
  const citations = buildReportCitationBundle(project.notebook, selectedIds, opts.locale, time, opts.template, project.id);
  for (const [key,value] of [["report_manifest.json",citations.manifestJson],["citations.bib",citations.bibtex],["citations.csl.json",citations.cslJson]]) {
    assert.equal(new TextDecoder().decode(read.get(key)),value);
  }
  assert.deepEqual(pack.manifest.bindings.map(b=>b.evidence_id),selectedIds.slice(0,2));
  assert.deepEqual(pack.manifest.evidence.map(e=>e.disposition),["bytes_included","bytes_included","unbound"]);
  assert.equal(pack.manifest.byte_coverage,"incomplete");
  assert.deepEqual([...read.keys()].slice(0,6),["README.md","report.md","report.html","report_manifest.json","citations.bib","citations.csl.json"]);
  const full = pack.manifest.artifacts.find(a=>a.sha256===hash(cpi.bytes));
  assert.equal(full.disposition,"original_archive");
  assert.deepEqual(read.get(full.members[0]),cpi.bytes);
  const normalized = pack.manifest.artifacts.find(a=>a.sha256===hash(lfs.bytes));
  assert.equal(normalized.disposition,"normalized_members");
  for (const member of normalized.members) assert.deepEqual(read.get(member),readStoredArchive(lfs.bytes).get(member.split("/").at(-1)));
  for (const f of pack.manifest.files) assert.equal(hash(read.get(f.path)),f.sha256);
  for (const binding of pack.manifest.bindings) assert.equal(binding.correspondence.historical_provenance.status,"unverified");
  normalized.rights.scope="original_archive";
  second.rights.scope="original_archive";
  lfs.bytes.fill(0);
  const repeat = await buildResearchPackage({...opts,attachments:[first,second]});
  assert.deepEqual(repeat.bytes,pack.bytes);
  assert.equal(JSON.stringify(project),prior);
});
test("Binding rejects foreign projects, changed evidence, fabricated and duplicate handles and unselected bindings", async () => {
  const opts = example();
  const {project,selectedIds,cpi} = opts;
  const handle = await prepareSnapshotAttachment(project,selectedIds[0],cpi.bytes);
  await assert.rejects(prepareSnapshotAttachment(project,selectedIds[0],cpi.bytes,"0".repeat(64)),{code:"digest_mismatch"});
  const changed = structuredClone(project);
  changed.notebook.items[0].note="A new note";
  for (const other of [changed,{...project,id:"different"}, {...project,notebook:{...project.notebook,notebook_id:"other"}}]) {
    await assert.rejects(buildResearchPackage({...opts,project:other,attachments:[handle]}),{code:"selection_changed"});
  }
  await assert.rejects(buildResearchPackage({...opts,selectedIds:selectedIds.slice(1),attachments:[handle]}),{code:"selection_changed"});
  for (const attachments of [[{...handle}],[handle,handle]]) await assert.rejects(buildResearchPackage({...opts,attachments}),{code:"invalid_attachment"});
});
test("One selected row does not release a larger permitted archive, unselected evidence stays outside the report",async()=>{
  const opts = example();
  const source = opts.cpi.input;
  const draft = notebookObservation(source.rows[0],source.shareable_view_url,"One native CPI observation");
  const notebook = addNotebookEvidence(opts.project.notebook,draft,"v2.0",time);
  const project = {...opts.project,notebook};
  const id = notebook.items.at(-1).id;
  const handle = await prepareSnapshotAttachment(project,id,opts.cpi.bytes);
  const pack = await buildResearchPackage({...opts,project,selectedIds:[id],attachments:[handle]});
  assert.deepEqual(pack.manifest.selected_evidence_ids,[id]);
  assert.equal(pack.manifest.artifacts[0].disposition,"reference_only");
  assert.equal(readStoredArchive(pack.bytes).size,7);
});
test("Independent expected ZIP digest, reconstructed ZIP with stale member digest and duplicated inventory entries fail",async()=>{
  const pack = await buildResearchPackage(example());
  const bytes = Uint8Array.from(pack.bytes);
  bytes[54] ^= 1;
  await assert.rejects(verifyResearchPackageIntegrity(bytes,pack.sha256),{code:"digest_mismatch"});
  const members = readStoredArchive(pack.bytes);
  const repack = () => buildZip(Array.from(members,([name,content])=>({name,content})),time);
  const orig = members.get("report.md");
  members.set("report.md",new TextEncoder().encode("Different report"));
  await assert.rejects(verifyResearchPackageIntegrity(repack()),{code:"digest_mismatch"});
  members.set("report.md",orig);
  const manifest = structuredClone(pack.manifest);
  manifest.files[1]=manifest.files[0];
  members.set("package_manifest.json",new TextEncoder().encode(JSON.stringify(manifest)));
  await assert.rejects(verifyResearchPackageIntegrity(repack()),{code:"invalid_package"});
});
