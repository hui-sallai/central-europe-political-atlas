import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductionCandidate } from './production.mjs';
import { validatePolitical } from './validate.mjs';
import {politicalExportFiles} from './export.mjs';

test('CSV preserves missing versus zero and neutralizes spreadsheet formulas',()=>{
  const data=buildProductionCandidate();
  data.political_parties=[{missing:null,zero:0,label:'=HYPERLINK("unsafe")'}];
  const csv=politicalExportFiles(data)['political_parties.csv'];
  assert.ok(csv.includes(',"0",'));
  assert.ok(csv.includes("\"'=HYPERLINK"));
  assert.ok(csv.split('\r\n')[1].startsWith(','));
});

test('seven national elections reproduce and remain contestant-specific',()=>{
  const data=buildProductionCandidate();assert.equal(validatePolitical(data,data).status,'pass');
  assert.equal(data.reconciliation_log.filter(r=>r.status==='requires_manual_review').length,180);
  const academic=data.reconciliation_log.filter(r=>r.reconciliation_id.startsWith('rc-parlgov-'));
  assert.equal(academic.length,7);
  assert.equal(academic.filter(r=>r.category==='match').length,5);
  assert.equal(academic.find(r=>r.election_id.includes('2021')).harmonized_value,736);
  assert.equal(academic.find(r=>r.election_id.includes('2025')).category,'source_gap');
  assert.equal(data.political_parties.length,29);
  assert.ok(data.political_parties.every(p=>p.valid_from===null&&p.valid_to===null&&!p.continuous_series_eligible));
});
test('missing seats, corrected vintage, foreign scope and changed values fail closed',()=>{
  const expected=buildProductionCandidate();
  for(const mutate of [d=>{d.election_results.find(r=>r.seats===null).seats=0;},d=>{d.legislatures.find(l=>l.result_vintage.includes('corrected')).total_seats=736;},d=>{d.elections[0].country='czechia';},d=>{d.election_results[0].second_votes++;},d=>{d.party_identity_crosswalk[0].continuous_series_eligible=true;}]){
    const data=structuredClone(expected);mutate(data);assert.throws(()=>validatePolitical(data,expected));
  }
});
