import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
const documents=[
  {id:"results-report-2002",url:"https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00063162/15_Wahl_DB_2002_Heft_5.pdf",format:"pdf"},
  {id:"results-report-2005",url:"https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEHeft_derivate_00016115/Heft_5.pdf",format:"pdf"},
  {id:"participation-2017",url:"https://www.bundeswahlleiterin.de/bundestagswahlen/2017/wahlbewerber.html",format:"html"},
  {id:"participation-2013",url:"https://www.bundeswahlleiterin.de/bundestagswahlen/2013/wahlbewerber.html",format:"html"},
  {id:"results-report-2009",url:"https://www.bundeswahlleiter.de/dam/jcr/97eabb5b-77d7-44f8-828d-5c4740cc535d/btw09_heft5.pdf",format:"pdf"},
  {id:"historical-results-report-2025",url:"https://www.bundeswahlleiterin.de/dam/jcr/397735e3-0585-46f6-a0b5-2c60c5b83de6/btw_ab49_gesamt.pdf",format:"pdf"},
];
for(const doc of documents){
  const dir=`docs/political-data/raw/germany/identity_${doc.id}`,file=path.join(root,dir,`source.${doc.format}`),meta=path.join(root,dir,"metadata.json");
  if(fs.existsSync(file)){
    const existing=JSON.parse(fs.readFileSync(meta,"utf8"));assert.equal(sha256(fs.readFileSync(file)),existing.sha256);continue;
  }
  assert.ok(process.argv.includes("--acquire"),`Missing evidence ${doc.id}`);assert.ok(!fs.existsSync(meta));
  const response=await fetch(doc.url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok,`Official document ${doc.id}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(doc.format==="pdf")assert.equal(bytes.subarray(0,5).toString(),"%PDF-");else assert.ok(bytes.toString("utf8").includes("Parteien"));
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:"wx"});
  fs.writeFileSync(meta,JSON.stringify({source_id:`src-de-bwl-${doc.id}`,source_url:doc.url,retrieved_at:new Date().toISOString(),raw_path:`${dir}/source.${doc.format}`,sha256:sha256(bytes),bytes:bytes.length,format:doc.format,purpose:"Identity evidence only; no legal continuity inference or canonical data promotion",licence_status:"evidence_archive_pending_actual_document_review"},null,2)+"\n",{flag:"wx"});
}
console.log(JSON.stringify({status:"pass",immutable_documents:documents.length,canonical_writes:0}));
