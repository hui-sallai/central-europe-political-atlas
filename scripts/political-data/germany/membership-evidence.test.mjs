import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {root,sha256} from "./acquire.mjs";
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
test("Earlier primary reports are immutable; visual transcription is never called OCR validation",()=>{
 for(const [year,count] of [[2002,24],[2005,25],[2009,27]]){
  const m=read(`germany_${year}_membership_review.json`),meta=read(`raw/germany/identity_results-report-${year}/metadata.json`);
  assert.equal(m.rows.length,count);assert.equal(sha256(fs.readFileSync(path.join(root,meta.raw_path))),meta.sha256);
  if(year!==2009)assert.equal(m.transcription_method,"visual_manual_from_archived_official_pdf");
  for(const r of m.rows){assert.equal(r.atlas_party_id,null);assert.equal(r.canonical_promotion,false);assert.equal(r.continuous_series_eligible,false);assert.equal(r.evidence[1].sha256,meta.sha256);}
 }
 assert.equal(read("germany_2002_membership_review.json").rows.find(r=>r.source_label==="PDS").source_published_full_name,"Partei des Demokratischen Sozialismus");
 assert.equal(read("germany_2005_membership_review.json").rows.find(r=>r.source_label==="Die Linke.").source_published_full_name,"Die Linkspartei.");
});
test("Seven name resolutions supplement, never erase the previous unresolved decisions",()=>{
 const s=read("germany_name_difference_resolution.json");assert.equal(s.rows.length,7);
 for(const r of s.rows){
  assert.equal(r.canonical_promotion,false);assert.equal(r.atlas_party_id,null);assert.equal(r.continuous_series_eligible,false);
  assert.equal(read(`germany_${r.election_year}_membership_review.json`).rows.find(old=>old.contestant_id===r.contestant_id).review_status,"unresolved_label_difference");
 }
});
test("New primary-report bindings and supplementary name decisions reproduce offline",()=>{
 for(const script of ["review-2002.mjs","review-2005.mjs","review-2009.mjs","resolve-name-differences.mjs"]){
  const result=spawnSync(process.execPath,[`scripts/political-data/germany/${script}`,"--check"],{cwd:root,encoding:"utf8"});assert.equal(result.status,0,result.stderr);
 }
});
