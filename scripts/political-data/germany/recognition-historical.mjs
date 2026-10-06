import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
const configs={
  2017:{url:"https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2017/05_17_parteien_teilnahme.html",date:"2017-07-07",counts:[5,3,40]},
  2013:{url:"https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2013/2013-07-05-38-parteien-koennen-an-der-bundestagswahl-2013-teilnehmen.html",date:"2013-07-05",counts:[6,3,29]},
};
const year=Number(process.argv.find(a=>/^201[37]$/.test(a))),config=configs[year];assert.ok(config,"Specify reviewed year 2013 or 2017");
const dir=`docs/political-data/raw/germany/recognition_${year}`,htmlFile=path.join(root,dir,"recognition.html"),metaFile=path.join(root,dir,"metadata.json");
if(process.argv.includes("--acquire")){
  assert.ok(!fs.existsSync(htmlFile)&&!fs.existsSync(metaFile),"Never overwrite evidence");
  const response=await fetch(config.url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
  const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.toString("utf8").includes(`${config.counts.reduce((a,b)=>a+b,0)} Parteien`));
  fs.mkdirSync(path.dirname(htmlFile),{recursive:true});fs.writeFileSync(htmlFile,bytes,{flag:"wx"});
  fs.writeFileSync(metaFile,JSON.stringify({source_id:`src-de-bwl-recognition-${year}`,source_url:config.url,source_published_at:config.date,retrieved_at:new Date().toISOString(),raw_path:`${dir}/recognition.html`,sha256:sha256(bytes),bytes:bytes.length,purpose:"Same-election eligibility evidence only; not durable party identity",licence_status:"evidence_archive_not_canonical_redistribution_review"},null,2)+"\n",{flag:"wx"});
}
const bytes=fs.readFileSync(htmlFile),source=JSON.parse(fs.readFileSync(metaFile,"utf8"));assert.equal(sha256(bytes),source.sha256);
// Single-pass entity decoding (no double unescaping: "&amp;lt;" stays "&lt;"); same entity set as before.
const ENTITIES={"&nbsp;":" ","&#160;":" ","&amp;":"&","&quot;":'"',"&ndash;":"–","&hellip;":"…"};
const decode=s=>s.replace(/<[^>]*>/g," ").replace(/&(?:nbsp|#160|amp|quot|ndash|hellip);/g,e=>ENTITIES[e]).replace(/\s+/g," ").trim();
const lists=[...bytes.toString("utf8").matchAll(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi)].map(m=>[...m[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(li=>decode(li[1])));
assert.deepEqual(lists.map(l=>l.length),config.counts,"Unexpected recognition list structure");
const parties=lists.flatMap((list,g)=>list.map((verbatim,i)=>{
  const match=verbatim.match(/^(.*?)\s*\(([^()]*)\)[,.]?$/);assert.ok(match,`Unreviewed party-label syntax: ${verbatim}`);
  return {list:g+1,item:i+1,verbatim,party_name_and_additional_name:match[1].trim(),abbreviation:match[2]};
}));
const output={schema_version:"germany-historical-recognition-evidence-v1",state:"staging_only",canonical_promotion:false,election_year:year,source,parties,note:"Eligible parties are distinct from actual second-vote contestants. Semicolon additional names remain verbatim, not silently stripped; no cross-year identity inferred."};
const file=path.join(root,`docs/political-data/germany_${year}_recognition_evidence.json`);
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve existing evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",year,recognised_parties:parties.length,canonical_writes:0}));
