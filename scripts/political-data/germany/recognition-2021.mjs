import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";

const url="https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2021/17_21_beschluss-bverfg.html";
const dir="docs/political-data/raw/germany/recognition_2021";
const htmlFile=path.join(root,dir,"recognition.html"),metaFile=path.join(root,dir,"metadata.json");
if(process.argv.includes("--acquire")){
  assert.ok(!fs.existsSync(htmlFile)&&!fs.existsSync(metaFile),"Preserve immutable archive");
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
  const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.toString("utf8").includes("54 Parteien"));
  fs.mkdirSync(path.dirname(htmlFile),{recursive:true});fs.writeFileSync(htmlFile,bytes,{flag:"wx"});
  fs.writeFileSync(metaFile,JSON.stringify({source_id:"src-de-bwl-recognition-2021",source_url:url,retrieved_at:new Date().toISOString(),source_published_at:"2021-07-30",sha256:sha256(bytes),raw_path:`${dir}/recognition.html`,bytes:bytes.length,purpose:"Party recognition after constitutional-court decisions, including DKP; no continuity or durable registry IDs",licence_status:"evidence_archive_not_canonical_redistribution_review"},null,2)+"\n",{flag:"wx"});
}
const bytes=fs.readFileSync(htmlFile),source=JSON.parse(fs.readFileSync(metaFile,"utf8"));assert.equal(sha256(bytes),source.sha256);
const decode=s=>s.replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&ndash;/g,"–").replace(/&mdash;/g,"—").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
const tables=[...bytes.toString("utf8").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];assert.equal(tables.length,3);
const parties=tables.flatMap((table,t)=>[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((row,i)=>{
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>decode(c[1]));if(!cells.length)return [];
  assert.ok(cells.length===3||cells.length===4);
  return [{table:t+1,row:i+1,abbreviation:cells[1],party_name:cells[2],additional_name:cells[3]&&cells[3]!=="–"?cells[3]:null}];
}));assert.equal(parties.length,54);
const output={schema_version:"germany-recognition-evidence-v1",state:"staging_evidence_only",canonical_promotion:false,source,parties,note:"54 recognised/eligible parties, not 40 national second-vote contestants. DKP included after court decision; never reuse an earlier 53-party gate."};
const file=path.join(root,"docs/political-data/germany_2021_recognition_evidence.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve evidence; use --check");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",recognised_parties:54,canonical_writes:0}));
