import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {root,sha256} from "./acquire.mjs";
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
test("Historical eligibility archives and manual records retain unresolved differences",()=>{
  for(const [year,eligible,actual,pending] of [[2017,48,34,6],[2013,38,30,1]]){
    const e=read(`germany_${year}_recognition_evidence.json`),m=read(`germany_${year}_membership_review.json`);
    assert.equal(e.parties.length,eligible);assert.equal(m.rows.length,actual);
    assert.equal(sha256(fs.readFileSync(path.join(root,e.source.raw_path))),e.source.sha256);
    assert.equal(m.rows.filter(r=>r.review_status==="unresolved_label_difference").length,pending);
    for(const r of m.rows){assert.equal(r.atlas_party_id,null);assert.equal(r.canonical_promotion,false);assert.equal(r.continuous_series_eligible,false);assert.equal(r.evidence.length,2);}
  }
  assert.equal(read("germany_2013_membership_review.json").rows.find(r=>r.contestant_id==="ct-de-0104").review_status,"unresolved_label_difference");
});
test("Both historical recognition and manual review ledgers reproduce offline",()=>{
  for(const year of [2013,2017])for(const script of ["recognition-historical.mjs","review-historical.mjs"]){
    const result=spawnSync(process.execPath,[`scripts/political-data/germany/${script}`,String(year),"--check"],{cwd:root,encoding:"utf8"});assert.equal(result.status,0,result.stderr);
  }
});
