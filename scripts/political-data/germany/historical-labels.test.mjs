import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {root} from "./acquire.mjs";
import {buildStaging} from "./parse.mjs";
import {buildHistoricalLabels} from "./historical-labels.mjs";
const queue=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_identity_review_queue.json"),"utf8"));
test("Three explicit historical names retain both source vintages without granting continuity",()=>{
  const staging=buildStaging(),before=structuredClone(staging),output=buildHistoricalLabels(queue,staging);
  assert.equal(output.rows.length,209);assert.deepEqual(staging,before);
  const changed=output.rows.filter(r=>r.review_status==="provisional_requires_second_review");
  assert.deepEqual(changed.map(r=>r.historical_display_label),["Nationaldemokratische Partei Deutschlands","Partei für Gesundheitsforschung","Liberal-Konservative Reformer"]);
  for(const r of changed){assert.equal(r.evidence.length,2);assert.notEqual(r.evidence[0].sha256,r.evidence[1].sha256);}
  for(const r of output.rows){assert.equal(r.party_identity_status,"unmatched");assert.equal(r.continuous_series_eligible,false);}
  assert.ok(output.rows.some(r=>r.election_year===2002&&r.historical_display_label==="PDS"));
});
test("Changed header, mismatched original and additional correction fail closed",()=>{
  const altered=structuredClone(queue);altered.rows.find(r=>r.contestant_id==="ct-de-0151").source_label="invented";
  assert.throws(()=>buildHistoricalLabels(altered,buildStaging()));
  const staging=buildStaging();staging.original_2021_revision.contestants.find(r=>r.label==="Liberal-Konservative Reformer").label="invented";
  assert.throws(()=>buildHistoricalLabels(queue,staging));
  const extra=structuredClone(queue);extra.rows.find(r=>r.contestant_id==="ct-de-0141").original_2021_label_candidate="different";
  assert.throws(()=>buildHistoricalLabels(extra,buildStaging()));
});
