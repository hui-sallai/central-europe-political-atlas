import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {root} from "./acquire.mjs";
import {buildStaging} from "./parse.mjs";

// Explicitly reviewed pairs, not a general parenthesis-stripping or name matcher.
const decisions=[
  ["ct-de-0151","Die Heimat (2021: Nationaldemokratische Partei Deutschlands)","Nationaldemokratische Partei Deutschlands"],
  ["ct-de-0159","Partei für schulmedizinische Verjüngungsforschung (2021: Partei für Gesundheitsforschung)","Partei für Gesundheitsforschung"],
  ["ct-de-0174","Wir Bürger (2021: Liberal-Konservative Reformer)","Liberal-Konservative Reformer"],
];
export function buildHistoricalLabels(queue,staging){
  const byId=new Map(decisions.map(d=>[d[0],d]));
  const current=staging.elections.find(e=>e.year===2021),original=staging.original_2021_revision;
  const actualChanges=queue.rows.filter(r=>r.election_year===2021&&r.source_label!==r.original_2021_label_candidate);
  assert.deepEqual(actualChanges.map(r=>r.contestant_id).sort(),[...byId.keys()].sort(),"New historical-label differences require explicit review");
  const rows=queue.rows.map(r=>{
    const decision=byId.get(r.contestant_id);
    const source={member:r.source_member,sha256:r.source_member_sha256,column:r.source_column,record_id:r.source_record_id};
    if(!decision)return {contestant_id:r.contestant_id,election_year:r.election_year,source_label:r.source_label,historical_display_label:r.source_label,label_basis:"verbatim_election_specific_source",review_status:"no_transformation",evidence:[source],party_identity_status:"unmatched",continuous_series_eligible:false};
    assert.equal(r.election_year,2021);assert.equal(r.source_label,decision[1]);
    const old=original.contestants.find(c=>c.column===r.source_column);
    const active=current.contestants.find(c=>c.column===r.source_column);
    assert.equal(old?.label,decision[2]);assert.equal(active?.label,decision[1]);
    assert.ok(decision[1].endsWith(`(2021: ${decision[2]})`),"Corrected file must explicitly identify historical name");
    return {contestant_id:r.contestant_id,election_year:2021,source_label:r.source_label,historical_display_label:decision[2],label_basis:"manual_review_of_explicit_2021_annotation_and_original_header",review_status:"provisional_requires_second_review",reviewed_at:"2026-10-02",reviewer:"atlas-primary-review",review_note:"Corrected official header explicitly states the 2021 name, corroborated by the archived original header. Only the display label is selected: original votes are not substituted and legal-entity continuity is not inferred.",evidence:[source,{member:original.member,sha256:original.member_sha256,column:old.column,record_id:`${original.member_sha256}:${original.member}:${original.national_record_ordinal}:${old.column}`}],party_identity_status:"unmatched",continuous_series_eligible:false};
  });
  return {schema_version:"germany-historical-label-review-v1",state:"staging_only",canonical_promotion:false,scope:"Election-specific display labels, not legal-party identity or continuity",rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const queue=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_identity_review_queue.json"),"utf8"));
  const output=buildHistoricalLabels(queue,buildStaging()),file=path.join(root,"docs/political-data/germany_historical_label_review.json");
  if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
  else {assert.ok(!fs.existsSync(file),"Preserve existing review evidence; use --check");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
  console.log(JSON.stringify({status:"pass",labels:output.rows.length,verbatim:206,provisional_historical_corrections:3,party_identities_confirmed:0,canonical_writes:0}));
}
