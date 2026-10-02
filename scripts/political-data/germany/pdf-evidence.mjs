import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {root,sha256} from "./acquire.mjs";
const python=process.env.ATLAS_EVIDENCE_PYTHON||"python3";
const docs=[{id:"results-report-2009",pages:[15,17,18],count:289},{id:"historical-results-report-2025",pages:[2,144,145,146,147],count:147}];
const records=docs.map(doc=>{
  const dir=`docs/political-data/raw/germany/identity_${doc.id}`,meta=JSON.parse(fs.readFileSync(path.join(root,dir,"metadata.json"),"utf8"));
  assert.equal(sha256(fs.readFileSync(path.join(root,meta.raw_path))),meta.sha256);
  const result=spawnSync(python,[path.join(root,"scripts/political-data/germany/pdf-evidence.py"),path.join(root,meta.raw_path),...doc.pages.map(String)],{encoding:"utf8",maxBuffer:4e6});assert.equal(result.status,0,result.stderr);
  const extracted=JSON.parse(result.stdout);assert.equal(extracted.page_count,doc.count);assert.ok(extracted.pages.every(p=>p.text.length>(p.pdf_page===2?100:500)));
  return {source:meta,...extracted,extraction_method:"pdfplumber_selected_pages_v1",status:"evidence_only_requires_visual_and_identity_review",canonical_promotion:false};
});
const output={schema_version:"germany-pdf-identity-evidence-v1",state:"staging_only",records,note:"Historical compilation abbreviation notes are not legal-entity continuity evidence. Duplicate/modernized name rows require same-election primary corroboration. No votes, seats or identity decisions are generated from these excerpts."};
const file=path.join(root,"docs/political-data/germany_pdf_identity_evidence.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve existing extraction evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",documents:records.length,evidence_pages:8,canonical_writes:0}));
