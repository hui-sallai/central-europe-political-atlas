import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";

const url="https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2025/06_25_ergebnisse_1bwa.html";
const dir="docs/political-data/raw/germany/recognition_2025";
const htmlFile=path.join(root,dir,"recognition.html"),metaFile=path.join(root,dir,"metadata.json");
if(process.argv.includes("--acquire")){
  assert.ok(!fs.existsSync(htmlFile)&&!fs.existsSync(metaFile),"Do not overwrite archived recognition evidence");
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.toString("utf8").includes("41 Parteien"));
  fs.mkdirSync(path.dirname(htmlFile),{recursive:true});
  fs.writeFileSync(htmlFile,bytes,{flag:"wx"});
  fs.writeFileSync(metaFile,JSON.stringify({source_id:"src-de-bwl-recognition-2025",source_url:url,retrieved_at:new Date().toISOString(),source_published_at:"2025-01-14",sha256:sha256(bytes),raw_path:`${dir}/recognition.html`,bytes:bytes.length,purpose:"Election-specific party recognition evidence, not durable registry numbers or cross-election continuity",licence_status:"evidence_archive_not_canonical_redistribution_review"},null,2)+"\n",{flag:"wx"});
}
const bytes=fs.readFileSync(htmlFile),meta=JSON.parse(fs.readFileSync(metaFile,"utf8"));
assert.equal(sha256(bytes),meta.sha256);
const decode=s=>s.replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&ndash;/g,"–").replace(/&mdash;/g,"—").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
const tables=[...bytes.toString("utf8").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
assert.equal(tables.length,3,"Official recognition page structure changed");
const parties=tables.flatMap((table,t)=>[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((row,i)=>{
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>decode(c[1]));
  if(!cells.length)return [];
  assert.ok(cells.length===3||cells.length===4);
  return [{table:t+1,row:i+1,source_order:cells[0],abbreviation:cells[1],party_name:cells[2],additional_name:cells[3]&&cells[3]!=="–"?cells[3]:null,recognition_basis:t<2?"represented_party_section_18_4_1":"recognised_party_section_18_4_2"}];
}));
assert.equal(parties.length,41,"Recognised parties are not the 29 national second-vote contestants");
const output={schema_version:"germany-recognition-evidence-v1",state:"staging_evidence_only",canonical_promotion:false,source:meta,parties,note:"Eligibility recognition does not establish actual ballot participation, votes or durable legal identity. Source row numbers are not party IDs."};
const file=path.join(root,"docs/political-data/germany_2025_recognition_evidence.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve existing evidence; use --check");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",recognised_parties:parties.length,canonical_writes:0}));
