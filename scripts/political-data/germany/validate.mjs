import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { root, sha256 } from './acquire.mjs';
import { buildProductionCandidate, buildApprovedProduction, stores } from './production.mjs';

export function validatePolitical(data, expected=buildProductionCandidate()) {
  const evidenceIndex=JSON.parse(fs.readFileSync(path.join(root,'docs/political-data/germany_public_evidence_index.json')));
  assert.deepEqual(Object.keys(data).sort(),[...stores].sort(),'Exactly the 12 approved Germany stores');
  const sources=new Map(data.political_source_registry.map(s=>[s.source_id,s]));
  const elections=new Map(data.elections.map(e=>[e.election_id,e]));
  const contestants=new Map(data.electoral_contestants.map(c=>[c.contestant_id,c]));
  const parties=new Map(data.political_parties.map(p=>[p.atlas_party_id,p]));
  assert.equal(elections.size,7);assert.equal(contestants.size,209);assert.equal(parties.size,29);
  assert.deepEqual(data.elections.map(e=>e.year),[2002,2005,2009,2013,2017,2021,2025]);
  for(const [store,rows] of Object.entries(data)){
    assert.ok(Array.isArray(rows)&&rows.length>0,`${store}: no empty placeholders`);
    for(const row of rows){
      assert.equal(row.country,'germany','Only Germany authorized');
      assert.ok(row.provenance?.length,`${store}: provenance required`);
      for(const p of row.provenance){
        assert.ok(sources.has(p.source_id));assert.match(p.source_url,/^https:\/\//);assert.ok(p.source_record_id&&p.retrieved_at&&p.parser_version&&p.fields_covered.length);
        assert.match(p.raw_snapshot.sha256,/^[a-f0-9]{64}$/);assert.ok(['published','derived'].includes(p.published_or_derived));
        const source=sources.get(p.source_id),rawFile=path.join(root,p.raw_snapshot.path);
        if(fs.existsSync(rawFile))assert.equal(sha256(fs.readFileSync(rawFile)),p.raw_snapshot.sha256,'Raw provenance checksum');
        else { assert.equal(source.raw_redistribution,'not_reviewed_local_archive_only');const indexed=evidenceIndex.sources.find(s=>s.source_id===p.source_id);assert.equal(indexed?.raw_sha256,p.raw_snapshot.sha256,'Archived source hash retained with reviewed factual extracts; original is not redistributed'); }
        if(p.published_or_derived==='derived')assert.ok(p.formula&&p.input_fields?.length);
      }
    }
  }
  const forbidden=/"(?:atlas_.*score|polling|prediction|ideology|left_right|populism|extremism|risk_score)"\s*:/;
  assert.ok(!forbidden.test(JSON.stringify(data)),'No prohibited measurements or scores');
  for(const c of data.electoral_contestants){assert.ok(elections.has(c.election_id));assert.equal(c.contestant_kind,'party_list');assert.equal(c.continuous_series_eligible,false);if(c.lead_party_id)assert.ok(parties.has(c.lead_party_id));}
  assert.equal(data.party_identity_crosswalk.length,contestants.size);
  assert.equal(new Set(data.party_identity_crosswalk.map(r=>r.source_party_id)).size,209);
  for(const crosswalk of data.party_identity_crosswalk){assert.equal(crosswalk.target_kind,'contestant');assert.ok(contestants.has(crosswalk.target_id));assert.equal(crosswalk.continuous_series_eligible,false);if(crosswalk.canonical_party_id)assert.ok(parties.has(crosswalk.canonical_party_id));else assert.equal(crosswalk.party_relation_status,'requires_manual_review');}
  for(const e of data.elections){
    assert.equal(e.election_id,`el-de-bt-${e.date}`);
    const turnout=data.election_turnout.find(r=>r.election_id===e.election_id),legislature=data.legislatures.find(r=>r.legislature_id===e.legislature_id),results=data.election_results.filter(r=>r.election_id===e.election_id);
    assert.ok(turnout&&legislature&&results.length);
    assert.equal(turnout.voters,turnout.valid_second_votes+turnout.invalid_second_votes);
    assert.equal(results.reduce((sum,r)=>sum+r.second_votes,0),turnout.valid_second_votes);
    // Missing seat rows are not reinterpreted as zero; only published counts are summed.
    assert.equal(results.filter(r=>r.seats!==null).reduce((sum,r)=>sum+r.seats,0),legislature.total_seats);
    assert.ok(Math.abs(turnout.derived_turnout-turnout.published_turnout)<=0.051);
    for(const r of results){
      assert.ok(contestants.has(r.contestant_ref));assert.equal(r.vote_type,'second_vote');assert.ok(Number.isSafeInteger(r.second_votes)&&r.second_votes>=0);
      assert.equal(r.derived_vote_share,100*r.second_votes/turnout.valid_second_votes);
      assert.ok(Math.abs(r.derived_vote_share-r.published_vote_share)<=0.051);
      assert.equal(r.derived_seat_share,r.seats===null?null:100*r.seats/legislature.total_seats);
    }
    const rule=data.electoral_systems.find(s=>s.electoral_system_id===e.electoral_system_id);assert.ok(rule);
    assert.equal(rule.base_seats,e.year===2025?630:598);
    if(e.year===2021){assert.equal(legislature.total_seats,735);assert.equal(e.repeat_poll_date,'2024-02-11');assert.match(e.result_vintage,/corrected/);}
  }
  for(const membership of data.contestant_members){assert.ok(parties.has(membership.atlas_party_id)&&contestants.has(membership.contestant_id));assert.equal(elections.get(membership.election_id)?.year,2025);}
  assert.deepEqual(data,expected,'Canonical values must reproduce from archived sources and explicit reviewed decisions');
  return {status:'pass',elections:7,contestants:209,continuous_party_series:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dir=process.argv.includes('--candidate')?'docs/political-data/production-candidate':'src/data/political/germany';
  const data=Object.fromEntries(stores.map(s=>[s,JSON.parse(fs.readFileSync(path.join(root,dir,`${s}.json`),'utf8'))]));
  console.log(JSON.stringify(validatePolitical(data,process.argv.includes('--candidate')?buildProductionCandidate():buildApprovedProduction())));
}
