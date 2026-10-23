// SYNTHETIC TEST FIXTURES ONLY. No observation here is an actual election or poll.
// This module is never imported by src/, generators, exports or production routes.
export const H='a'.repeat(64), source='test-authority';
const label=(en,zh=en)=>({en,'zh-CN':zh});
export function parliamentaryFixture(mixed=false,year=2024){
 const country=mixed?'germany':'czechia',id=`fixture-${country}-${year}`,p=[{source_id:source}];
 const definition=(id,kind,seatScope)=>({id,kind,seatScope,denominator:'valid_votes',label:label(`TEST ${kind} ballot`),sourceIds:[source]});
 const list=definition('list_vote','list','whole_chamber'),district=definition('district_vote','constituency','tier_only');
 return {country:{slug:country,name:label('TEST country'),originalLanguage:'en',voteLabel:list.label},stores:{
  members:[{contestant_id:`${id}-a`,atlas_party_id:'test-party-a',country,election_id:id,review_status:'verified_same_election_membership',provenance:p}],
  elections:[{election_id:id,country,year,date:`${year}-01-02`,date_end:`${year}-01-03`,result_vintage:'TEST final',chamber:'TEST national chamber',legislature_id:'l',electoral_system_id:'s'}],
  turnout:[{election_id:id,vote_type:'list_vote',eligible_voters:1000,voters:700,valid_votes:690,invalid_votes:10,ballots_cast:700,published_turnout:70,turnout_definition:mixed?'voters / registered':'envelopes issued / registered',turnout_basis:{numerator:mixed?'voters':'envelopes_issued',denominator:'registered_electorate',definition:mixed?'voters / registered':'envelopes issued / registered',sourceIds:[source]},provenance:p},...(mixed?[{election_id:id,vote_type:'district_vote',eligible_voters:1000,voters:700,valid_votes:680,invalid_votes:20,ballots_cast:700,published_turnout:70}]:[])],
  results:[...['a','b'].map((c,i)=>({election_id:id,contestant_ref:`${id}-${c}`,vote_type:'list_vote',votes:i?290:400,published_vote_share:i?42.03:57.97,seats:i?4:6,provenance:p})),...(mixed?['a','b'].map((c,i)=>({election_id:id,contestant_ref:`${id}-${c}`,vote_type:'district_vote',votes:i?280:400,published_vote_share:null,seats:i?1:4,provenance:p})):[])],
  contestants:['a','b'].map((c,i)=>({contestant_id:`${id}-${c}`,historical_display_label:i?'TEST alliance B':'TEST party A',contestant_kind:i?'alliance':'party_list',lead_party_id:i?null:'test-party-a'})),
  legislatures:[{legislature_id:'l',total_seats:10}],
  systems:[{electoral_system_id:'s',system_family:mixed?'TEST mixed dual-vote':'TEST list PR with minority rule',allocation_method:mixed?'TEST mixed allocation':'TEST proportional allocation',base_seats:10,vote_type:'list_vote',vote_definitions:mixed?[list,district]:[list],national_rules:{nationalAllocation:'TEST national rule',districtAllocation:mixed?'TEST district tier':null,thresholds:[{appliesTo:'TEST single party',percent:5,description:label('TEST threshold'),sourceIds:[source]}],minorityRepresentation:mixed?null:label('TEST separate minority allocation'),totalSeatsDefinition:label('TEST whole elected chamber'),sourceIds:[source]},notes:label('TEST FIXTURE — NOT REAL RESULTS'),provenance:p}],
  sources:[{source_id:source,institution:'TEST authority',dataset:'SYNTHETIC TEST ONLY',url:'https://example.invalid/fixture',retrieved_at:'2024-01-04T00:00:00Z',raw_sha256:H,licence_url:'https://example.invalid/test-terms'}]
 }};
}
export function pollFixture(day='02',support=30){return {
 id:`TEST-poll-${day}`,country:'germany',chamber:'TEST national chamber',organisation:'TEST survey organisation',commissioner:null,
 fieldworkStart:`2024-02-${day}`,fieldworkEnd:`2024-02-${day}`,publicationDate:`2024-02-${day}`,sampleSize:1000,
 population:'TEST adults',method:'TEST telephone',question:'TEST party support question',respondentBase:'TEST decided respondents',undecidedTreatment:'TEST excluded as published',
 entity:{kind:'party',id:'TEST-party',label:'TEST party',identityVerified:true,identitySourceIds:['test-identity']},supportPercent:support,
 uncertainty:{text:'TEST reported interval',lower:support-3,upper:support+3,confidencePercent:95},
 sourceId:'test-publisher',sourceUrl:'https://example.invalid/poll',publisher:'TEST publisher',reuseTerms:{licence:'TEST licence',url:'https://example.invalid/terms',attribution:'TEST attribution'},retrievedAt:'2024-02-20T00:00:00Z',rawSha256:H,
 revision:{status:'original',version:'1',correctionUrl:null}
};}
export const pollRights=[{source_id:'test-publisher',institution:'TEST publisher',exact_source_url:'https://example.invalid/poll',terms_url:'https://example.invalid/terms',licence_name:'TEST licence',required_attribution_text:'TEST attribution',review_status:'verified',normalized_republication:'cleared',derived_values:'cleared'}];
export const pollAdmission={ownerApproved:true,decisionReference:'TEST ONLY — NOT A PRODUCTION AUTHORISATION',publisherSourceIds:['test-publisher'],verifyIdentity:(country,entity)=>country==='germany'&&entity.identitySourceIds.includes('test-identity')&&(entity.kind==='party'&&entity.id==='TEST-party'||entity.kind==='alliance'&&entity.id==='TEST-alliance')};
