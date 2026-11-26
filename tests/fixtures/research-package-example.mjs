// Local demonstration harness. Rebuild from admitted public rows and a deliberately fixed report time.
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {buildSorsSnapshotExample, SORS_FIXTURE_TIME as time} from "./research-package-sors.mjs";
const require = createRequire(import.meta.url);
const {emptyNotebook, addNotebookEvidence} = require("../../src/lib/researchNotebook.ts");
const {notebookSnapshotView} = require("../../src/components/notebookEvidence.ts");
const {buildResearchPackage, prepareSnapshotAttachment} = require("../../src/lib/researchPackage.ts");

export function example() {
  const cpi = buildSorsSnapshotExample();
  const lfs = buildSorsSnapshotExample("lfs_unemployment_quarterly","2026-11-26T13:02:00.000Z");
  let book = {...emptyNotebook("en","v2.0",time), notebook_id:"notebook-r1c1-example", title:"Serbia source-native descriptive series"};
  for (const draft of [notebookSnapshotView(cpi.input), notebookSnapshotView(lfs.input),
    {type:"method",title:"VAR publication boundary",url:"https://hy-central-europe-analysis.org/models/",canonical_ids:["var"],countries:[],periods:[],sources:[],layer:"method",warnings:["Formal dynamic responses are blocked."],metadata:{state:"blocked"}}]) {
    book = addNotebookEvidence(book,draft,"v2.0",time);
  }
  const project = {id:"r1c1-example",notebook:book};
  return {project, selectedIds:book.items.map(i=>i.id), locale:"en", template:"standard", reportTime:time, cpi, lfs};
}
export async function buildExamplePackage() {
  const opts = example();
  const cpiDigest = createHash("sha256").update(opts.cpi.bytes).digest("hex");
  const attachments = await Promise.all([
    prepareSnapshotAttachment(opts.project, opts.selectedIds[0], opts.cpi.bytes, cpiDigest),
    prepareSnapshotAttachment(opts.project, opts.selectedIds[1], opts.lfs.bytes),
  ]);
  return buildResearchPackage({...opts, attachments});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw Error("Supply a new output ZIP path.");
  const pack = await buildExamplePackage();
  await writeFile(process.argv[2],pack.bytes,{flag:"wx"});
  console.log(JSON.stringify({sha256:pack.sha256,byte_length:pack.bytes.length,files:pack.manifest.files},null,2));
}
