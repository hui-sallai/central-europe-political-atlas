import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {root,sha256} from "./acquire.mjs";
import {parseCsv,officialNumber} from "./csv.mjs";
import {loadArchives} from "./archive.mjs";
import {buildStaging,normalizeFinalMember,years} from "./parse.mjs";

test("Quoted multiline CSV, BOM, separators and escaped quotes",()=>{
  assert.deepEqual(parseCsv('\uFEFFa;"b;\nc";"d""e"\r\n1;2;3\r\n'),[["a","b;\nc",'d"e'],["1","2","3"]]);
  assert.throws(()=>parseCsv('a;"unfinished'),/Unterminated/);
});
test("Official missing stays missing and published zero stays zero",()=>{
  for(const s of ["","–","—","-"])assert.equal(officialNumber(s),null);
  assert.equal(officialNumber("0,0"),0);assert.equal(officialNumber("49.649.512 "),49649512);
  for(const s of ["NaN","1e6","unknown","-2"])assert.throws(()=>officialNumber(s));
});
test("Archive hashes, actual encodings and no replacement characters",()=>{
  const {historical,zip,members}=loadArchives();
  for(const a of [historical,zip])assert.equal(sha256(fs.readFileSync(path.join(root,a.raw_path))),a.sha256);
  for(const y of years){const m=members[`btw${y===2021?"2021-w":y}_kerg.csv`];assert.ok(m);assert.ok(!m.text.includes("\uFFFD"));}
  assert.equal(members.btw2002_kerg?.encoding,undefined);
  assert.equal(members["btw2002_kerg.csv"].encoding,"cp1252");
});
test("Seven elections, national second votes and deterministic reproduction",()=>{
  const a=buildStaging(),b=buildStaging();assert.deepEqual(a,b);
  assert.deepEqual(a.elections.map(e=>e.year),years);
  for(const e of a.elections){assert.equal(e.country,undefined);assert.equal(e.canonical_promotion,false);assert.equal(e.party_identity_status,"requires_manual_review");assert.equal(e.contestants.reduce((n,c)=>n+c.value,0),e.valid_second_votes);}
});
test("Historical labels are not modernized and identities not invented",()=>{
  const s=buildStaging();
  assert.ok(s.elections[0].contestants.some(c=>c.label==="PDS"));
  assert.ok(s.elections[0].contestants.some(c=>c.label==="NPD"));
  assert.ok(!s.elections[0].contestants.some(c=>c.label==="Die Linke"||c.label==="HEIMAT"));
  for(const e of s.elections){const labels=e.contestants.map(c=>c.label);assert.ok(labels.some(l=>/^CDU$|^Christlich Demokratische/.test(l)));assert.ok(labels.some(l=>/^CSU$|^Christlich-Soziale/.test(l)));}
});
test("Corrected 2021 does not overwrite archived original final votes",()=>{
  const s=buildStaging(),current=s.elections.find(e=>e.year===2021);
  assert.equal(current.member,"btw2021-w_kerg.csv");assert.equal(current.result_vintage,"corrected_final_after_2024_02_11_repeat");
  assert.equal(s.original_2021_revision.member,"btw2021_kerg.csv");assert.equal(s.original_2021_revision.status,"archived_superseded_final_not_active");
  assert.notEqual(current.member_sha256,s.original_2021_revision.member_sha256);
  assert.notEqual(current.valid_second_votes,s.original_2021_revision.valid_second_votes);
});
test("Tampered totals fail rather than quietly being normalized",()=>{
  const {members}=loadArchives(),m=members["btw2025_kerg.csv"];
  assert.throws(()=>normalizeFinalMember({...m,text:m.text.replace("8149124","8149125")},2025));
});
test("Every active source member has actual-file reuse evidence",()=>{
  const review=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_source_licence_review.json"),"utf8"));
  assert.deepEqual(review.reviews.map(r=>r.year),years);
  assert.equal(sha256(fs.readFileSync(path.join(root,review.terms_snapshot.path))),review.terms_snapshot.sha256);
  const {members}=loadArchives();
  for(const r of review.reviews){assert.equal(r.licence_status,"verified_open_licence");assert.equal(r.sha256,members[r.member].sha256);assert.ok(r.evidence_basis);assert.ok(r.attribution);assert.ok(r.changes_disclosure);}
});
