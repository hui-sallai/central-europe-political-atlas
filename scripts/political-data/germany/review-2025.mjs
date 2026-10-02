import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root} from "./acquire.mjs";
import {validateIdentityReview} from "./identity-review.mjs";

// Manual document-row decisions scoped to this election. Source ordering is
// evidence location only; it is never a durable party code or continuity key.
const decisions=[
  [181,1,2],[182,1,3],[183,1,4],[184,1,5],[185,1,6],[186,1,7],[187,1,8],
  [188,2,4],[189,3,14],[190,3,7],[191,3,12],[192,3,8],[193,3,32],
  [194,3,22],[195,3,18],[196,3,19],[197,3,26],[198,3,6],[199,3,10],
  [200,3,2],[201,3,3],[202,3,9],[203,3,27],[204,3,25],[205,3,4],
  [206,2,2],[207,2,3],[208,3,17],[209,3,23],
];
const queueFile=path.join(root,"docs/political-data/germany_identity_review_queue.json");
const existing=JSON.parse(fs.readFileSync(queueFile,"utf8")),output=structuredClone(existing);
const recognition=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_2025_recognition_evidence.json"),"utf8"));
assert.equal(decisions.length,29);
for(const [id,table,row] of decisions){
  const contestant=output.rows.find(r=>r.contestant_id===`ct-de-${String(id).padStart(4,"0")}`);
  const party=recognition.parties.find(p=>p.table===table&&p.row===row);
  assert.ok(contestant&&party);assert.equal(contestant.election_year,2025);
  const expected=party.party_name+(party.additional_name?` - ${party.additional_name}`:"");
  assert.equal(contestant.source_label,expected,"Manual binding must match the official name and expressly published additional name");
  assert.ok(["unmatched","provisional"].includes(contestant.match_status));
  const decision={historical_display_label:contestant.source_label,atlas_party_id:`pp-de-${String(id-180).padStart(4,"0")}`,contestant_kind:"party",match_status:"provisional",readiness:"requires_manual_review",match_basis:"manual_review",reviewed_at:"2026-10-02T00:00:00Z",reviewer_note:"Manual election-specific binding of the official final second-vote column to a party expressly identified in the Federal Electoral Committee recognition announcement. Published additional names are retained. This is not an official registry-number match, a cross-election continuity decision or proof that all eligible parties contested; only final-result contestants are mapped. Independent second review required.",review_evidence:[{source_record_id:contestant.source_record_id,source_sha256:contestant.source_member_sha256,note:"Official final 2025 national second-vote contestant column"},{source_record_id:`${recognition.source.source_id}:table:${table}:row:${row}`,source_sha256:recognition.source.sha256,note:`Federal Electoral Committee announcement dated 2025-01-14; ${party.recognition_basis}; source abbreviation ${party.abbreviation}`}],second_review:null};
  if(contestant.match_status==="provisional")for(const [key,value] of Object.entries(decision))assert.deepEqual(contestant[key],value,"Preserve previously reviewed decision");
  else Object.assign(contestant,decision);
}
const baseline=structuredClone(existing);
for(const r of baseline.rows)Object.assign(r,{historical_display_label:null,atlas_party_id:null,contestant_kind:null,match_status:"unmatched",match_basis:null,reviewed_at:null});
assert.equal(validateIdentityReview(output,baseline),29);
assert.equal(new Set(output.rows.filter(r=>r.election_year===2025).map(r=>r.atlas_party_id)).size,29);
if(process.argv.includes("--check"))assert.deepEqual(existing,output);
else fs.writeFileSync(queueFile,JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({status:"pass",provisional_2025_bindings:29,other_years_unmatched:180,confirmed_party_identities:0,canonical_writes:0}));
