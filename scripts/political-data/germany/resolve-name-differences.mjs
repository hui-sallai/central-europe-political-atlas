import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
// Single-pass entity decoding (no double unescaping: "&amp;lt;" stays "&lt;"); same entity set as before.
const ENTITIES={"&nbsp;":" ","&#160;":" ","&amp;":"&","&hellip;":"…"};
const decode=s=>s.replace(/<[^>]*>/g," ").replace(/&(?:nbsp|#160|amp|hellip);/g,e=>ENTITIES[e]).replace(/\s+/g," ").trim();
const sources=[2013,2017].map(year=>{
  const dir=`docs/political-data/raw/germany/identity_participation-${year}`,meta=JSON.parse(fs.readFileSync(path.join(root,dir,"metadata.json"),"utf8")),bytes=fs.readFileSync(path.join(root,meta.raw_path));assert.equal(sha256(bytes),meta.sha256);
  const tables=[...bytes.toString("utf8").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const table=tables[0];assert.ok(table);
  const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((r,i)=>{
    const cells=[...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>decode(c[1]));return cells.length?[{row:i+1,cells}]:[];
  });assert.equal(rows.length,34);
  return {year,meta,rows};
});
const queue=read("germany_identity_review_queue.json"),pdf=read("germany_pdf_identity_evidence.json").records.find(r=>r.source.source_id==="src-de-bwl-historical-results-report-2025");
const decisions=[[121,2017,16],[129,2017,24],[130,2017,25],[133,2017,28],[136,2017,31],[137,2017,32],[104,2013,28]];
const rows=decisions.map(([id,year,rowNumber])=>{
  const c=queue.rows.find(r=>r.contestant_id===`ct-de-${String(id).padStart(4,"0")}`),source=sources.find(s=>s.year===year),entry=source.rows.find(r=>r.row===rowNumber);assert.ok(c&&entry);assert.equal(c.election_year,year);
  const fullName=entry.cells[year===2017?2:1],additionalName=year===2017?entry.cells[3]||null:null;
  if(year===2017){assert.equal(id===121?c.source_label.replace("...","…"):c.source_label,fullName);}
  else {assert.equal(c.source_label,"Nichtwähler");assert.equal(fullName,"Partei der Nichtwähler");assert.ok(pdf.pages.find(p=>p.pdf_page===146).text.includes("Nichtwähler Partei der Nichtwähler 1998 und 2013"));}
  const evidence=[{source_record_id:c.source_record_id,sha256:c.source_member_sha256,note:"Election-specific second-vote result column"},{source_record_id:`${source.meta.source_id}:table:1:row:${rowNumber}`,sha256:source.meta.sha256,note:"Same-election actual-participation page: official full name and separately published additional name"}];
  if(year===2013)evidence.push({source_record_id:`${pdf.source.source_id}:pdf-page:146:abbreviation:Nichtwähler`,sha256:pdf.source.sha256,note:"Explicit published abbreviation explanation for the 2013 election; not legal continuity evidence"});
  return {contestant_id:c.contestant_id,election_year:year,source_label:c.source_label,official_full_name:fullName,official_additional_name:additionalName,atlas_party_id:null,contestant_kind:"party",review_status:"provisional_same_election_name_resolution",canonical_promotion:false,continuous_series_eligible:false,evidence,decision:id===121?"The authority's same-election participation table uses one ellipsis character; result file uses three full stops. Record this exact typographical equivalence only; keep the source label unchanged.":year===2013?"The authority explicitly expands Nichtwähler as Partei der Nichtwähler for 2013; the actual-participation page corroborates that full name. No cross-year or current-name replacement.":"The same-election participation table separates the full party name from its additional name. The result header reproduces the full name alone; keep additional name separately, not inferred from suffix stripping."};
});
const output={schema_version:"germany-name-difference-resolution-v1",state:"staging_only",canonical_promotion:false,rows,note:"Supplemental evidence: earlier unresolved reviews are preserved unchanged. Only election-specific name/membership resolution; no legal-entity or cross-year identity approval."};
const file=path.join(root,"docs/political-data/germany_name_difference_resolution.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve existing review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",provisional_resolutions:rows.length,canonical_writes:0}));
