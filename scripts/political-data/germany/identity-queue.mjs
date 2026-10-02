import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root} from "./acquire.mjs";
import {buildStaging} from "./parse.mjs";
import {validateIdentityReview} from "./identity-review.mjs";

const staging=buildStaging(),file=path.join(root,"docs/political-data/germany_identity_review_queue.json");
const existing=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null;
const assigned=new Map(existing?.rows.map(r=>[r.source_record_id,r.contestant_id])??[]);
let next=Math.max(0,...[...assigned.values()].map(id=>Number(id.split("-").at(-1))))+1;
const rows=staging.elections.flatMap(e=>e.contestants.map(c=>{
  // Source object + member + national record + column identify a ballot result, not a continuing party.
  const source_record_id=`${e.member_sha256}:${e.member}:${e.national_record_ordinal}:${c.column}`;
  const contestant_id=assigned.get(source_record_id)??`ct-de-${String(next++).padStart(4,"0")}`;
  const original=e.year===2021?staging.original_2021_revision.contestants.find(o=>o.column===c.column):null;
  return {contestant_id,country:"germany",election_year:e.year,source_id:e.source_id,source_record_id,source_label:c.label,
    source_member:e.member,source_member_sha256:e.member_sha256,source_column:c.column,
    original_2021_label_candidate:original?.label??null,
    historical_display_label:null,atlas_party_id:null,contestant_kind:null,
    match_status:"unmatched",readiness:"requires_manual_review",match_basis:null,
    reviewed_at:null,reviewer_note:"Election-specific contestant ID only. No party identity, historical-label transformation or continuity inferred from name/translation/ranking. Review actual party/list and historical label evidence before promotion.",
    eligible_for_continuous_party_series:false,canonical_promotion:false,
    raw_snapshot:e.raw_snapshot,retrieved_at:e.retrieved_at,result_vintage:e.result_vintage};
}));
assert.equal(new Set(rows.map(r=>r.contestant_id)).size,rows.length);
assert.equal(new Set(rows.map(r=>r.source_record_id)).size,rows.length);
if(existing){assert.equal(existing.rows.length,rows.length,"New input scope requires explicit ledger review; existing IDs must never be silently reassigned");for(const r of rows)assert.equal(assigned.get(r.source_record_id),r.contestant_id);}
const output={schema_version:"germany-contestant-identity-review-queue-v1",state:"staging_only_requires_manual_review",country:"germany",id_assignment:"Opaque persisted sequence keyed by immutable source record, never a display name; IDs never reused. No party IDs assigned before entity review.",rows};
let provisional=0;
if(process.argv.includes("--check"))provisional=validateIdentityReview(existing,output);
else if(!existing)fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});
else provisional=validateIdentityReview(existing,output);
console.log(JSON.stringify({status:"pass",contestants:rows.length,unique_opaque_ids:rows.length,provisional_reviews:provisional,party_identity_confirmed:0,canonical_writes:0}));
