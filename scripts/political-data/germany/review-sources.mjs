import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
import {loadArchives} from "./archive.mjs";
import {years} from "./parse.mjs";

const termsUrl="https://www.bundeswahlleiterin.de/info/impressum.html";
const {zip,members}=loadArchives();
const response=await fetch(termsUrl,{signal:AbortSignal.timeout(60000)});
assert.ok(response.ok,"Official product reuse terms unavailable; keep licence gate closed");
const bytes=Buffer.from(await response.arrayBuffer()),html=bytes.toString("utf8");
assert.ok(html.includes("zum Download bereitgestellten Produkte")&&html.includes("Vervielfältigung und Verbreitung")&&html.includes("Quellennachweis gestattet"),"Download-product permission not confirmed");
const retrieved_at=new Date().toISOString(),hash=sha256(bytes),dir=`docs/political-data/raw/germany/terms_${hash.slice(0,16)}`;
fs.mkdirSync(path.join(root,dir),{recursive:true});
const termsPath=`${dir}/publisher-terms.html`;
if(!fs.existsSync(path.join(root,termsPath)))fs.writeFileSync(path.join(root,termsPath),bytes,{flag:"wx"});
else assert.equal(sha256(fs.readFileSync(path.join(root,termsPath))),hash);
const metadataPath=path.join(root,dir,"metadata.json");
if(!fs.existsSync(metadataPath))fs.writeFileSync(metadataPath,JSON.stringify({source_id:"src-de-bwl-publisher-terms",source_url:termsUrl,retrieved_at,raw_path:termsPath,sha256:hash,bytes:bytes.length,file_format:"HTML UTF-8",source_publication_status:"official_publisher_reuse_terms",election_years_in_production_scope:years,parser_version:"germany-source-review-v1"},null,2)+"\n",{flag:"wx"});
// Review actual member headers, not a maps licence or an unrelated data product.
const reviews=years.map(year=>{
  const name=`btw${year===2021?"2021-w":year}_kerg.csv`,m=members[name];
  const header=m.text.slice(0,m.text.indexOf("Nr;")>=0?m.text.indexOf("Nr;"):m.text.indexOf("Wahlkreis;"));
  assert.ok(/Endgültig|Endergebnis/.test(header),`Final-result status ${name}`);
  assert.ok(!/nur.*privat|Weitergabe.*untersagt|Weiterverwendung.*verboten|All rights reserved/i.test(header),`Product-specific restriction ${name}`);
  const embedded=header.includes("Datenlizenz Deutschland – Namensnennung – Version 2.0");
  return {year,member:name,sha256:m.sha256,encoding:m.encoding,result_status:"final",licence_status:"verified_open_licence",licence:embedded?"dl-de/by-2-0":"publisher_attribution_reuse_terms",licence_url:embedded?"https://www.govdata.de/dl-de/by-2-0":termsUrl,
    evidence_basis:embedded?"Licence explicitly embedded in this member header":"Publisher terms explicitly cover its downloadable data products unless a product exception is indicated. Actual member header checked and no different terms indicated; permission comes from the archived general downloadable-product terms, not an assumed member copyright line.",
    source_url:zip.source_url,raw_snapshot:{path:zip.raw_path,sha256:zip.sha256},terms_snapshot:{path:termsPath,sha256:hash},reviewed_at:retrieved_at,
    attribution:"Die Bundeswahlleiterin, Wiesbaden",changes_disclosure:"Atlas national second-vote extraction and normalized representation; calculations explicitly labelled derived; original source-native labels retained."};
});
const result={schema_version:"germany-result-source-review-v1",scope:"Germany Bundestag Slice 1A only",terms_url:termsUrl,terms_retrieved_at:retrieved_at,terms_snapshot:{path:termsPath,sha256:hash},reviews};
fs.writeFileSync(path.join(root,"docs/political-data/germany_source_licence_review.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({status:"pass",reviewed_final_members:reviews.length,licence_status:"verified_open_licence",canonical_writes:0}));
