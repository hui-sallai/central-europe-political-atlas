import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {root,sha256} from "./acquire.mjs";
const read=file=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",file),"utf8"));
test("Recognition evidence distinguishes 41 eligible parties from 29 actual contestants",()=>{
  const e=read("germany_2025_recognition_evidence.json");
  assert.equal(e.parties.length,41);assert.equal(e.canonical_promotion,false);
  assert.equal(sha256(fs.readFileSync(path.join(root,e.source.raw_path))),e.source.sha256);
  assert.equal(new Set(e.parties.map(p=>`${p.table}:${p.row}`)).size,41);
});
test("29 manual bindings retain both sources and no continuity or production approval",()=>{
  const q=read("germany_identity_review_queue.json"),e=read("germany_2025_recognition_evidence.json"),current=q.rows.filter(r=>r.election_year===2025);
  assert.equal(current.length,29);assert.equal(new Set(current.map(r=>r.atlas_party_id)).size,29);
  for(const r of current){
    assert.equal(r.match_status,"provisional");assert.equal(r.match_basis,"manual_review");
    assert.equal(r.canonical_promotion,false);assert.equal(r.eligible_for_continuous_party_series,false);
    assert.equal(r.second_review,null);assert.equal(r.review_evidence.length,2);
    assert.equal(r.review_evidence[0].source_sha256,r.source_member_sha256);
    assert.equal(r.review_evidence[1].source_sha256,e.source.sha256);
  }
  for(const r of q.rows.filter(r=>r.election_year!==2025)){assert.equal(r.match_status,"unmatched");assert.equal(r.atlas_party_id,null);}
  assert.notEqual(current.find(r=>r.contestant_id==="ct-de-0182").atlas_party_id,current.find(r=>r.contestant_id==="ct-de-0186").atlas_party_id);
});
