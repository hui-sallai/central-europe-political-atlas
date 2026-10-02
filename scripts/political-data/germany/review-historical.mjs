import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root} from "./acquire.mjs";
const configs={
  2017:[[107,1,1],[108,1,2],[109,1,3],[110,1,4],[111,1,5],[112,2,1],[113,2,2],[114,3,35],[115,3,24],[116,2,3],[117,3,11],[118,3,17],[119,3,12],[120,3,14],[121,3,22],[122,3,37],[123,3,5],[124,3,10],[125,3,39],[126,3,6],[127,3,33],[128,3,1],[129,3,13],[130,3,26],[131,3,21],[132,3,4],[133,3,18],[134,3,36],[135,3,30],[136,3,3],[137,3,15],[138,3,23],[139,3,28],[140,3,27]],
  2013:[[77,1,1],[78,1,2],[79,1,3],[80,1,4],[81,1,5],[82,1,6],[83,2,3],[84,2,2],[85,3,5],[86,3,8],[87,3,15],[88,3,6],[89,3,9],[90,3,7],[91,3,2],[92,3,18],[93,3,17],[94,3,1],[95,3,23],[96,3,4],[97,3,24],[98,3,19],[99,3,20],[100,3,10],[101,3,12],[102,3,28],[103,2,1],[104,3,26],[105,3,27],[106,3,14]],
};
const year=Number(process.argv.find(a=>/^201[37]$/.test(a))),decisions=configs[year];assert.ok(decisions);
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
const queue=read("germany_identity_review_queue.json"),recognition=read(`germany_${year}_recognition_evidence.json`);
const rows=decisions.map(([id,list,item])=>{
  const c=queue.rows.find(r=>r.contestant_id===`ct-de-${String(id).padStart(4,"0")}`),p=recognition.parties.find(r=>r.list===list&&r.item===item);assert.ok(c&&p);assert.equal(c.election_year,year);
  const exact=c.source_label===p.party_name_and_additional_name||c.source_label===p.abbreviation;
  return {contestant_id:c.contestant_id,election_year:year,source_label:c.source_label,recognition_verbatim:p.verbatim,recognition_name:p.party_name_and_additional_name,recognition_abbreviation:p.abbreviation,proposed_contestant_kind:"party",atlas_party_id:null,match_basis:"manual_review",review_status:exact?"provisional_same_election_membership":"unresolved_label_difference",canonical_promotion:false,continuous_series_eligible:false,evidence:[{source_record_id:c.source_record_id,sha256:c.source_member_sha256,note:"Official national second-vote result header"},{source_record_id:`${recognition.source.source_id}:list:${list}:item:${item}`,sha256:recognition.source.sha256,note:"Official same-election recognition declaration; list ordering is not a durable identifier"}],review_note:exact?"Explicit manual document-location decision supported by same-election party recognition and final result column. Exact name/abbreviation corroborates the decision but does not establish cross-election legal identity.":"Proposed document location only. Verbatim labels differ (additional name, typography or source spelling); no fuzzy match or suffix removal accepted. Further same-election official ballot/name evidence required before membership acceptance."};
});
assert.equal(rows.length,queue.rows.filter(r=>r.election_year===year).length);
const output={schema_version:"germany-historical-membership-review-v1",state:"staging_only",canonical_promotion:false,election_year:year,rows};
const file=path.join(root,`docs/political-data/germany_${year}_membership_review.json`);
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",year,records:rows.length,provisional:rows.filter(r=>r.review_status==="provisional_same_election_membership").length,unresolved:rows.filter(r=>r.review_status==="unresolved_label_difference").map(r=>({id:r.contestant_id,result:r.source_label,recognition:r.recognition_name})),canonical_writes:0}));
