import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {compareVerifiedSeries,verifiedComparisonCsv}=require('../../src/lib/politicalSeriesComparison.ts');
const {germanOfficialSeries}=require('../../src/lib/politicalSeries.ts');
const {electionViewsFromStores}=require('../../src/lib/politicalStores.ts');
const series=germanOfficialSeries.find(s=>s.label==='Die Linke');
const election=(link,share,votes,seats,total=100)=>({electionId:link.electionId,date:'2002-09-22',totalSeats:total,resultVintage:'final',sources:[{id:'src',url:'https://example.org/results'}],results:[{contestantId:link.contestantId,nativeLabel:'different labels do not matter',publishedVoteShare:share,secondVotes:votes,seats,sourceId:'src'}]});
test('only registered contestant IDs establish continuity, including documented name changes',()=>{
  const a=election(series.links[0],4.0,100,10), b=election(series.links[1],8.7,200,20),before=JSON.stringify([a,b]);
  const r=compareVerifiedSeries(a,b).find(r=>r.series.id===series.id);
  assert.equal(r.shareChange,4.7);assert.equal(r.votesChange,100);assert.equal(r.seatsChange,10);assert.equal(r.seatShareChange,10);
  assert.equal(compareVerifiedSeries(b,a).find(r=>r.series.id===series.id).shareChange,-4.7);
  assert.equal(JSON.stringify([a,b]),before);
  b.results[0].contestantId='unregistered';
  const missing=compareVerifiedSeries(a,b).find(r=>r.series.id===series.id);
  assert.equal(missing.b,null);assert.equal(missing.shareChange,null);assert.equal(missing.seatsChange,null);
});
test('null counts, missing observations and denominators are not zero; real zero remains zero',()=>{
  const a=election(series.links[0],0,0,null),b=election(series.links[1],0,0,0,null);
  const r=compareVerifiedSeries(a,b).find(r=>r.series.id===series.id);
  assert.equal(r.shareChange,0);assert.equal(r.votesChange,0);assert.equal(r.seatsChange,null);assert.equal(r.seatShareB,null);assert.equal(r.seatShareChange,null);
  assert.deepEqual(compareVerifiedSeries(a,a),[]);
});
test('export records evidence, published precision, direction and blank missing cells',()=>{
  const a=election(series.links[0],4,100,null),b=election(series.links[1],8.7,200,0);
  const csv=verifiedComparisonCsv(a,b,'https://example.org/identity','a'.repeat(64));
  assert.match(csv,/share_change_pp_b_minus_a/);assert.match(csv,/"4.0","8.7","4.7"/);assert.match(csv,/verified_official_longitudinal_series/);assert.match(csv,/https:\/\/example.org\/results/);
});
test('all 42 ordered pairs reproduce unchanged canonical records and registered IDs',()=>{
  const stores=Object.fromEntries(Object.entries({elections:'elections',turnout:'election_turnout',results:'election_results',contestants:'electoral_contestants',legislatures:'legislatures',systems:'electoral_systems',sources:'political_source_registry'}).map(([key,name])=>[key,JSON.parse(fs.readFileSync(new URL(`../../src/data/political/germany/${name}.json`,import.meta.url)))]));
  const before=JSON.stringify(stores),elections=electionViewsFromStores(stores,{slug:'germany',name:{en:'Germany','zh-CN':'德国'},originalLanguage:'de',voteLabel:{en:'Second votes','zh-CN':'第二票'}});
  let pairs=0;
  for(const a of elections)for(const b of elections){if(a.electionId===b.electionId)continue;pairs++;
    for(const row of compareVerifiedSeries(a,b)){
      for(const [e,result] of [[a,row.a],[b,row.b]])if(result){const link=row.series.links.find(l=>l.electionId===e.electionId);assert.equal(link.contestantId,result.contestantId);assert.deepEqual(e.results.find(r=>r.contestantId===link.contestantId),result);}
      assert.equal(row.votesChange,row.a?.secondVotes==null||row.b?.secondVotes==null?null:row.b.secondVotes-row.a.secondVotes);
      assert.equal(row.seatsChange,row.a?.seats==null||row.b?.seats==null?null:row.b.seats-row.a.seats);
    }
  }
  assert.equal(pairs,42);assert.equal(JSON.stringify(stores),before);
});
