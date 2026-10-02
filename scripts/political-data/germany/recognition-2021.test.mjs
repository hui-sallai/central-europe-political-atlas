import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {root,sha256} from "./acquire.mjs";
const read=file=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",file),"utf8"));
test("Court-updated recognition includes DKP and distinguishes eligibility from ballots",()=>{
  const e=read("germany_2021_recognition_evidence.json"),m=read("germany_2021_membership_review.json");
  assert.equal(e.parties.length,54);assert.equal(m.rows.length,40);
  assert.equal(e.source.source_published_at,"2021-07-30");
  assert.ok(e.parties.some(p=>p.party_name==="Deutsche Kommunistische Partei"));
  assert.ok(m.rows.some(r=>r.historical_display_label==="Deutsche Kommunistische Partei"));
  assert.equal(sha256(fs.readFileSync(path.join(root,e.source.raw_path))),e.source.sha256);
  for(const r of m.rows){assert.equal(r.atlas_party_id,null);assert.equal(r.continuous_series_eligible,false);assert.equal(r.canonical_promotion,false);assert.equal(r.evidence.length,3);assert.notEqual(r.evidence[0].sha256,r.evidence[1].sha256);}
  assert.ok(m.rows.some(r=>r.historical_display_label==="Nationaldemokratische Partei Deutschlands"&&r.active_source_label.startsWith("Die Heimat")));
});
test("2021 recognition and all explicit manual bindings reproduce offline",()=>{
  for(const script of ["recognition-2021.mjs","review-2021.mjs"]){
    const result=spawnSync(process.execPath,[`scripts/political-data/germany/${script}`,"--check"],{cwd:root,encoding:"utf8"});
    assert.equal(result.status,0,result.stderr);
  }
});
