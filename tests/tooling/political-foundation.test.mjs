import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
import {parliamentaryFixture,pollFixture,pollRights,pollAdmission} from '../fixtures/parliamentary-foundation.mjs';
import {validateCandidate} from '../../scripts/political-data/romania/validate-candidate.mjs';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const {electionViewsFromStores:adapt}=require('../../src/lib/politicalStores.ts'),n=require('../../src/lib/politicalNational.ts'),p=require('../../src/lib/politicalExplorer.ts'),identity=require('../../src/lib/politicalIdentity.ts'),poll=require('../../src/lib/politicalPolling.ts');
const view=f=>adapt(f.stores,f.country)[0];
test('PR/minority and mixed dual-vote configurations use explicit source-defined denominators and rules',()=>{
 const pr=view(parliamentaryFixture()),mixed=view(parliamentaryFixture(true));
 assert.equal(pr.national.turnout.numerator,'envelopes_issued');assert.equal(mixed.national.turnout.numerator,'voters');assert.equal(p.compareElections(pr,mixed).find(r=>r.key==='turnout').difference,null);
 assert.equal(pr.national.rules.thresholds[0].percent,5);assert.equal(pr.national.rules.minorityRepresentation.en,'TEST separate minority allocation');
 assert.equal(pr.national.dateEnd,'2024-01-03');assert.equal(pr.totalSeats,10);
 const district=n.selectNationalBallot(mixed,'district_vote');assert.equal(district.validSecondVotes,680);assert.equal(district.results[0].votes,400);assert.equal(p.measureValue(district.results[0],district,'vote_share'),100*400/680);assert.equal(p.measureValue(district.results[0],district,'seat_share'),null);assert.equal(n.voteSeatDifference(district,district.results[0]),null);
 assert.equal(n.selectNationalBallot(mixed,'invented'),null);assert.equal(n.voteSeatDifference(pr,pr.results[0]),60-57.97);assert.equal(n.voteSeatDifference({...pr,totalSeats:null},pr.results[0]),null);
 const turnoutChange=p.compareElections(pr,{...pr,publishedTurnout:72}).find(r=>r.key==='turnout');assert.equal(turnoutChange.difference,2);
 const cast=structuredClone(pr);cast.national.activeVote.denominator='ballots_cast';assert.equal(p.measureValue(cast.results[0],cast,'vote_share'),100*400/700);
});
test('invalid, unlinked and mixed vote rows fail rather than coalescing two ballots',()=>{
 for(const change of [s=>s.results[0].votes=-1,s=>s.results[0].votes=10000,s=>s.results[0].vote_type='unknown',s=>s.results.push({...s.results[0]}),s=>s.systems[0].vote_definitions[0].sourceIds=['unregistered'],s=>s.turnout.splice(0,1)]){
  const f=parliamentaryFixture(true);change(f.stores);assert.throws(()=>view(f));
 }
 const f=parliamentaryFixture();f.stores.legislatures[0].total_seats=null;assert.equal(p.measureValue(view(f).results[0],view(f),'seat_share'),null);
});
test('party identities, official statistical continuity and alliances are not interchangeable',()=>{
 const a=view(parliamentaryFixture(false,2020)),b=view(parliamentaryFixture(false,2024));
 const link={country:'czechia',fromElection:a.electionId,fromContestant:a.results[0].contestantId,toElection:b.electionId,toContestant:b.results[0].contestantId,relation:'same_party',basis:'official_register',status:'verified',sourceIds:['test-authority']};
 assert.equal(identity.continuousPartyLink(link,a,b),true);assert.equal(identity.partyLinkDifference(link,a,b).legalContinuity,true);
 const series=identity.sourceVerifiedPartySeries([a,b],[link]);assert.equal(series.length,1);assert.equal(series[0].links.length,2);assert.deepEqual(series[0].evidenceSourceIds,['test-authority']);assert.deepEqual(identity.sourceVerifiedPartySeries([a,b],[{...link,status:'unresolved'}]),[]);
 for(const patch of [{status:'unresolved'},{status:'disputed'},{basis:'unresolved'},{relation:'merger'},{relation:'split'},{relation:'alliance_membership'},{sourceIds:[]},{toContestant:b.results[1].contestantId}])assert.equal(identity.continuousPartyLink({...link,...patch},a,b),false);
 assert.equal(identity.continuousPartyLink({...link,relation:'documented_rename',basis:'official_document'},a,b),true);
 assert.equal(identity.partyLinkDifference({...link,relation:'authority_series',basis:'official_longitudinal_table'},a,b).legalContinuity,false);
 const middle=view(parliamentaryFixture(false,2022));const trajectory=identity.verifiedPartyTrajectory([a,middle,b],[link],{electionId:a.electionId,contestantId:a.results[0].contestantId});assert.equal(trajectory[1].result,null);assert.equal(trajectory[2].result.contestantId,b.results[0].contestantId);
});
const validate=(records,rights=pollRights,admission=pollAdmission)=>poll.validatePollingEvidence({schema:poll.POLLING_SCHEMA,records},rights,admission);
test('poll provenance, dates, rights, exact estimates and reported uncertainty validate independently of elections',()=>{
 const raw=[pollFixture(),pollFixture('10',32)],result=validate(raw);assert.equal(result.ok,true);assert.equal(result.data.records[0].supportPercent,30);assert.deepEqual(result.data.records[0].reuseTerms,raw[0].reuseTerms);assert.equal(poll.pollingTrend(...result.data.records).change,2);
 const nullable={...pollFixture(),sampleSize:null,question:null,method:null,fieldworkStart:null,fieldworkEnd:null,uncertainty:null};assert.equal(validate([nullable]).ok,true);assert.equal(poll.pollingMethodKey(nullable),null);
 assert.equal(validate(raw,pollRights,{...pollAdmission,ownerApproved:false}).ok,false);assert.equal(validate(raw,[]).ok,false);
 for(const patch of [{publicationDate:'2024-01-01'},{fieldworkStart:'2024-02-30'},{sampleSize:0},{supportPercent:101},{sourceUrl:'https://unregistered.invalid/poll'},{rawSha256:'x'},{privateRespondentRows:[]},{reuseTerms:{licence:'fake',url:'https://example.invalid/terms',attribution:'TEST attribution'}}])assert.equal(validate([{...pollFixture(),...patch}]).ok,false);
 assert.equal(poll.validatePollingEvidence({schema:'future',records:raw},pollRights,pollAdmission).ok,false);
 assert.equal(validate([raw[0],raw[0]]).ok,false);const cyclic={};cyclic.self=cyclic;assert.equal(poll.validatePollingEvidence(cyclic,pollRights,pollAdmission).ok,false);
});
test('method changes, unknown identity, overlapping fieldwork and unlicensed derived use block poll trends',()=>{
 const first=pollFixture(),second=pollFixture('10',32);
 for(const patch of [{organisation:'OTHER'},{population:'eligible voters'},{respondentBase:'all adults'},{method:'online'},{question:'other wording'},{undecidedTreatment:'included'},{entity:{...second.entity,kind:'alliance',id:'TEST-alliance'}},{entity:{...second.entity,identityVerified:false}},{fieldworkStart:first.fieldworkStart}]){
  const r=validate([first,{...second,...patch}]);assert.equal(r.ok,true);assert.equal(poll.pollingTrend(...r.data.records).comparable,false);
 }
 const limited=validate([first,second],pollRights.map(s=>({...s,derived_values:'pending_publisher_confirmation'})));assert.equal(limited.ok,true);assert.equal(poll.pollingTrend(...limited.data.records).reason,'derived_use_not_cleared');
 const old={...first,revision:{...first.revision,status:'superseded'}},corrected={...first,supportPercent:31,revision:{status:'corrected',version:'2',correctionUrl:'https://example.invalid/correction'}};const r=validate([old,corrected,second]);assert.equal(r.ok,true);assert.equal(r.data.records.length,3);assert.equal(poll.pollingMethodKey(r.data.records[0]),null);
});
test('same components render different systems and admitted polling metadata in both languages; no fixtures are production imports',()=>{
 const React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server'),{PoliticalNationalDetails}=require('../../src/components/PoliticalNationalDetails.tsx'),{PoliticalPollingPanel}=require('../../src/components/PoliticalPollingPanel.tsx');
 for(const locale of ['en','zh-CN'])for(const mixed of [false,true]){const e=view(parliamentaryFixture(mixed));const html=render(React.createElement(PoliticalNationalDetails,{election:e,comparison:null,locale}));assert.match(html,/TEST/);assert.match(html,/data-vote-seat-table/);assert.match(html,/57\.97/);}
 const data=validate([pollFixture(),pollFixture('10')]).data;for(const locale of ['en','zh-CN']){const html=render(React.createElement(PoliticalPollingPanel,{data,country:'germany',locale}));assert.match(html,/TEST survey organisation/);assert.match(html,/2024-02-02/);assert.match(html,/1000/);}
 const empty=render(React.createElement(PoliticalPollingPanel,{country:'germany',locale:'en'}));assert.match(empty,/data-polling-unavailable/);assert.doesNotMatch(empty,/<svg/);
 for(const file of ['src/lib/politicalData.ts','src/components/PoliticalExplorerAlpha.tsx'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/tests\/fixtures|political-candidate|from.*political\/romania/);
});
test('publication gate rejects unapproved countries; Germany regression and local Romania staging stay distinct',()=>{
 const {politicalElectionViews}=require('../../src/lib/politicalData.ts'),views=politicalElectionViews();assert.equal(views.length,7);assert.equal(views.at(-1).totalSeats,630);assert.equal(views.find(e=>e.year===2021).totalSeats,735);
 assert.ok(n.politicalPublicationProblems('romania',views[0].sources,['germany']).includes('country_not_owner_authorised'));
 const dir='.tmp-data-refresh/political-candidate-romania/candidate/stores';if(fs.existsSync(dir)){const raw=Object.fromEntries(fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>[f.slice(0,-5),JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8'))]));assert.deepEqual(validateCandidate(raw).failures,[]);const [ro]=adapt({elections:raw.elections,turnout:raw.election_turnout,results:raw.election_results,contestants:raw.electoral_contestants,legislatures:raw.legislatures,systems:raw.electoral_systems,sources:raw.political_source_registry},{slug:'romania',name:{en:'Romania','zh-CN':'罗马尼亚'},originalLanguage:'ro',voteLabel:{en:'List votes','zh-CN':'名单票'}});assert.equal(ro.totalSeats,null);assert.equal(ro.publishedTurnout,null);assert.equal(n.voteSeatDifference(ro,ro.results[0]),null);}
 assert.deepEqual(fs.readdirSync('src/data/political'),['czechia','germany'],'Czechia only under its exact-hash admission record');
});
