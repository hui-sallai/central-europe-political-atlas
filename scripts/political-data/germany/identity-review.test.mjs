import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {root} from "./acquire.mjs";
import {validateIdentityReview} from "./identity-review.mjs";
const baseline=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_identity_review_queue.json"),"utf8"));
// Fixtures must not assume the live ledger remains entirely unreviewed.
for(const row of baseline.rows){
  Object.assign(row,{historical_display_label:null,atlas_party_id:null,contestant_kind:null,match_status:"unmatched",match_basis:null,reviewed_at:null});
  delete row.review_evidence;delete row.second_review;
}
const reviewed=()=>{
  const queue=structuredClone(baseline),r=queue.rows[0];
  Object.assign(r,{match_status:"provisional",historical_display_label:r.source_label,atlas_party_id:"pp-de-0001",contestant_kind:"party",match_basis:"manual_review",reviewed_at:"2026-10-02T00:00:00Z",reviewer_note:"Synthetic test annotation, not a factual identity decision",review_evidence:[{source_record_id:r.source_record_id,source_sha256:r.source_member_sha256,note:"Synthetic evidence pointer for validation test"}]});
  return queue;
};
test("Unreviewed queue and evidence-backed provisional annotations validate without mutation",()=>{
  assert.equal(validateIdentityReview(baseline,baseline),0);
  const q=reviewed(),copy=structuredClone(q);assert.equal(validateIdentityReview(q,baseline),1);assert.deepEqual(q,copy);
});
test("Review cannot edit source provenance or reuse contestant IDs",()=>{
  for(const field of ["source_label","source_member_sha256","contestant_id","result_vintage"]){const q=reviewed();q.rows[0][field]="tampered";assert.throws(()=>validateIdentityReview(q,baseline));}
  const q=reviewed();q.rows[1].contestant_id=q.rows[0].contestant_id;assert.throws(()=>validateIdentityReview(q,baseline));
});
test("Unsupported confirmation, continuity, promotion and undocumented review fail closed",()=>{
  for(const change of [{match_status:"confirmed"},{eligible_for_continuous_party_series:true},{canonical_promotion:true},{review_evidence:[]},{second_review:{approved:true}},{invented_field:true}]){const q=reviewed();Object.assign(q.rows[0],change);assert.throws(()=>validateIdentityReview(q,baseline));}
});
