import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root} from "./acquire.mjs";
import {buildStaging} from "./parse.mjs";
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
// Explicit manual row bindings; table coordinates are evidence locators only.
const decisions=[[141,1,2],[142,1,3],[143,1,8],[144,1,7],[145,1,4],[146,1,5],[147,1,6],[148,2,2],[149,3,5],[150,3,18],[151,3,30],[152,3,27],[153,3,20],[154,3,28],[155,3,29],[156,3,6],[157,3,4],[158,3,9],[159,3,25],[160,3,3],[161,3,2],[162,3,34],[163,3,21],[164,3,15],[165,3,7],[166,3,40],[167,3,38],[168,3,16],[169,3,13],[170,3,41],[171,3,10],[172,3,26],[173,3,12],[174,3,37],[175,3,32],[176,3,42],[177,3,11],[178,3,19],[179,3,14],[180,3,17]];
const queue=read("germany_identity_review_queue.json"),recognition=read("germany_2021_recognition_evidence.json"),labels=read("germany_historical_label_review.json"),original=buildStaging().original_2021_revision;
const whitespace=s=>s.replace(/\s+/g," ").trim();
const rows=decisions.map(([id,table,row])=>{
  const contestant=queue.rows.find(r=>r.contestant_id===`ct-de-${String(id).padStart(4,"0")}`),party=recognition.parties.find(p=>p.table===table&&p.row===row),label=labels.rows.find(r=>r.contestant_id===contestant?.contestant_id);
  assert.ok(contestant&&party&&label);assert.equal(contestant.election_year,2021);
  const expected=party.party_name+(party.additional_name?` - ${party.additional_name}`:"");
  assert.equal(whitespace(label.historical_display_label),whitespace(expected),"Manual historical binding differs from official recognised name");
  const old=original.contestants.find(c=>c.column===contestant.source_column);assert.equal(old.label,label.historical_display_label);
  return {contestant_id:contestant.contestant_id,election_year:2021,contestant_kind:"party",membership_basis:"own_party_list_for_this_election_only",historical_display_label:label.historical_display_label,active_source_label:contestant.source_label,atlas_party_id:null,match_basis:"manual_review",review_status:"provisional_requires_independent_review_and_entity_resolution",reviewed_at:"2026-10-02",canonical_promotion:false,continuous_series_eligible:false,evidence:[{source_record_id:contestant.source_record_id,sha256:contestant.source_member_sha256,note:"Corrected final results; numeric values stay in this source vintage"},{source_record_id:`${original.member_sha256}:${original.member}:${original.national_record_ordinal}:${old.column}`,sha256:original.member_sha256,note:"Original 2021 election-specific header; original numeric values are not substituted"},{source_record_id:`${recognition.source.source_id}:table:${table}:row:${row}`,sha256:recognition.source.sha256,note:"Official party recognition after constitutional-court decisions; not a durable legal-entity identifier"}],note:"Manual binding uses the authority's express party recognition and same-election result header. Whitespace differences are recorded as typography only. No link to 2025 entities, merger, rename or continuous party series is inferred."};
});
assert.equal(rows.length,40);assert.equal(new Set(rows.map(r=>r.contestant_id)).size,40);
const output={schema_version:"germany-election-specific-membership-review-v1",state:"staging_only",canonical_promotion:false,election_year:2021,rows};
const file=path.join(root,"docs/political-data/germany_2021_membership_review.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve existing review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",election_specific_bindings:40,legal_entity_ids_assigned:0,canonical_writes:0}));
