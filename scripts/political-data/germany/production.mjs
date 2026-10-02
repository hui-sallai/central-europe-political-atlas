import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { root, sha256 } from './acquire.mjs';
import { buildStaging } from './parse.mjs';
import { loadArchives } from './archive.mjs';
import { parseCsv, officialNumber } from './csv.mjs';

export const stores=['political_source_registry','political_parties','party_names','electoral_contestants','contestant_members','party_identity_crosswalk','electoral_systems','elections','election_turnout','election_results','legislatures','reconciliation_log'];
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'docs/political-data',name),'utf8'));
const meta=id=>read(`raw/germany/production_${id}/metadata.json`);
const electionDates={2002:'2002-09-22',2005:'2005-09-18',2009:'2009-09-27',2013:'2013-09-22',2017:'2017-09-24',2021:'2021-09-26',2025:'2025-02-23'};
const notes={
  2002:{en:'598 base seats; Hare/Niemeyer allocation. Additional overhang seats were possible.', 'zh-CN':'基础席位598席；采用Hare/Niemeyer分配方法，可产生额外超额席位。'},
  2005:{en:'598 base seats; Hare/Niemeyer allocation. Additional overhang seats were possible. Main poll: 18 September; Dresden I voted later on 2 October 2005.', 'zh-CN':'基础席位598席；采用Hare/Niemeyer分配方法，可产生额外超额席位。主要投票日为9月18日；Dresden I于2005年10月2日延后投票。'},
  2009:{en:'598 base seats; Sainte-Laguë/Schepers allocation. Overhang seats were not fully compensated under this election’s rules.', 'zh-CN':'基础席位598席；采用Sainte-Laguë/Schepers分配方法。本届规则未对超额席位实施全面补偿。'},
  2013:{en:'598 base seats; Sainte-Laguë/Schepers allocation. Overhangs were compensated by increasing the chamber size.', 'zh-CN':'基础席位598席；采用Sainte-Laguë/Schepers分配方法；通过增加议会规模补偿超额席位。'},
  2017:{en:'598 base seats; Sainte-Laguë/Schepers allocation. Overhangs were compensated by increasing the chamber size.', 'zh-CN':'基础席位598席；采用Sainte-Laguë/Schepers分配方法；通过增加议会规模补偿超额席位。'},
  2021:{en:'598 base seats; Sainte-Laguë/Schepers allocation; up to three overhang seats could remain uncompensated. Displayed results include the 11 February 2024 partial Berlin repeat: 735 seats, not the original 736-seat final result.', 'zh-CN':'基础席位598席；采用Sainte-Laguë/Schepers分配方法；最多三个超额席位可不补偿。此处采用2024年2月11日柏林部分重选后的更正结果（735席），不是原始最终结果的736席。'},
  2025:{en:'Fixed 630 seats; Sainte-Laguë/Schepers allocation and second-vote coverage for party constituency winners. The 5% rule is applied with the three-constituency exception ordered by the Constitutional Court in 2024; national-minority parties are exempt. Rounded published shares do not establish qualification for seat allocation.', 'zh-CN':'固定630席；采用Sainte-Laguë/Schepers分配方法，政党选区胜出者须获第二票覆盖。5%规则依2024年宪法法院裁决保留三个选区例外；民族少数政党获豁免。四舍五入票率不能用于判断议席分配资格。'},
};
export function buildProductionCandidate() {
  const staging=buildStaging(),inspection=read('germany_source_inspection.json'),queue=read('germany_identity_review_queue.json'),labels=read('germany_historical_label_review.json');
  const {historical,zip}=loadArchives(),csv=parseCsv(fs.readFileSync(path.join(root,historical.raw_path),'utf8'));
  const recognition=read('germany_2025_recognition_evidence.json');
  const licence=read('germany_source_licence_review.json');
  const evidenceIndex=read('germany_public_evidence_index.json');
  const output=Object.fromEntries(stores.map(s=>[s,[]]));
  const parserHash=sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
  const prov=(source,record,fields,flag='published',extra={})=>({source_id:source.source_id,source_url:source.source_url??source.url,source_record_id:record,retrieved_at:source.retrieved_at,raw_snapshot:{path:source.raw_path??source.raw_snapshot?.path,sha256:source.sha256??source.raw_snapshot?.sha256},parser_version:'germany-production-v1',parser_sha256:parserHash,fields_covered:fields,published_or_derived:flag,...extra});
  const register=(source,title,licenceStatus,terms)=>{
    if(output.political_source_registry.some(s=>s.source_id===source.source_id))return;
    output.political_source_registry.push({source_id:source.source_id,country:'germany',institution:'Die Bundeswahlleiterin, Wiesbaden',dataset:title,tier:'tier1_official',url:source.source_url??source.url,licence_status:licenceStatus,raw_redistribution:licenceStatus==='verified_open_licence'?'verified_open_licence':'not_reviewed_local_archive_only',licence_url:terms,attribution:'Die Bundeswahlleiterin, Wiesbaden',retrieved_at:source.retrieved_at,raw_sha256:source.sha256,raw_path:source.raw_path,provenance:[prov(source,'metadata',['dataset','url','raw_sha256','licence_status'])]});
  };
  register(zip,'Final national election archive','verified_open_licence',licence.terms_url);
  register(historical,'Historical national results compilation','verified_open_licence','https://www.govdata.de/dl-de/by-2-0');
  register(recognition.source,'2025 Federal Electoral Committee party recognition','factual_metadata_only_source_link','https://www.bundeswahlleiterin.de/info/impressum.html');
  for(const id of ['hare-niemeyer','sainte-lague','system-size','overhang','late-poll','threshold','system-2017','system-2021','system-2025',...staging.elections.map(e=>`election-${e.year}`)])register(meta(id),id,'factual_metadata_only_source_link','https://www.bundeswahlleiterin.de/info/impressum.html');
  const evidenceSources=new Map();
  for(const name of fs.readdirSync(path.join(root,'docs/political-data/raw/germany'))){
    const file=path.join(root,'docs/political-data/raw/germany',name,'metadata.json');if(!fs.existsSync(file))continue;
    const source=JSON.parse(fs.readFileSync(file));if(!source.source_id||!source.raw_path)continue;
    evidenceSources.set(source.source_id,source);
  }
  const supplemental=read('germany_name_difference_resolution.json');
  const membershipReviews=new Map([2002,2005,2009,2013,2017,2021].flatMap(y=>read(`germany_${y}_membership_review.json`).rows.map(r=>[r.contestant_id,r])));
  for(const election of staging.elections){
    const year=election.year,date=electionDates[year],electionId=`el-de-bt-${date}`,term=15+staging.elections.indexOf(election),legislatureId=`lg-de-bt-${term}`,systemId=`es-de-bt-${year}`;
    const totals=inspection.elections.find(e=>e.year===year),homepage=meta(`election-${year}`);
    const reviewedHeading=evidenceIndex.sources.find(s=>s.source_id===homepage.source_id);
    assert.equal(reviewedHeading?.raw_sha256,homepage.sha256);assert.equal(reviewedHeading?.official_term,term,`Official term ${year}`);
    assert.equal(reviewedHeading.official_election_date,date,`Official election date ${year}`);
    const historyRows=csv.map((row,index)=>({row,index})).filter(({row})=>row[1]===String(year));
    const totalRecord=historyRows.find(({row})=>row[0]==='gültige Stimmen/Sitze insgesamt');
    const totalP=prov(historical,`csv-record-${totalRecord.index+1}`,['total_seats','valid_second_votes'], 'published',{columns:[4,79]});
    const ruleIds=year<=2005?['hare-niemeyer','system-size','overhang']:year===2009?['sainte-lague','system-size','overhang']:year===2013?['sainte-lague','system-size','overhang']:[`system-${year}`,'system-size','overhang'];
    if(year===2025)ruleIds.push('threshold');if(year===2005)ruleIds.push('late-poll');
    output.electoral_systems.push({electoral_system_id:systemId,country:'germany',election_id:electionId,valid_from:date,valid_to:date,interval_basis:'election-specific rule observation, not legal enactment dates',system_family:'personalised proportional representation',vote_type:'second_vote',allocation_method:year<=2005?'Hare/Niemeyer':'Sainte-Laguë/Schepers',base_seats:year===2025?630:598,notes:notes[year],provenance:ruleIds.map(id=>prov(meta(id),'main article',['system_family','allocation_method','base_seats','notes']))});
    output.elections.push({election_id:electionId,country:'germany',election_type:'national_parliament',chamber:'Bundestag',date,year,legislature_id:legislatureId,electoral_system_id:systemId,result_status:'final',result_vintage:election.result_vintage,later_poll_date:year===2005?'2005-10-02':null,repeat_poll_date:year===2021?'2024-02-11':null,provenance:[prov(homepage,'main article',['date','year','chamber','legislature_id']),prov(zip,election.member,['result_status','result_vintage','repeat_poll_date'], 'published',{source_member_sha256:election.member_sha256}),...(year===2005?[prov(meta('late-poll'),'Nachwahlen bei Bundestagswahlen: 18.09.2005 / 02.10.2005 / 160 Dresden (I)',['later_poll_date'])]:[])]});
    output.legislatures.push({legislature_id:legislatureId,country:'germany',chamber:'Bundestag',official_term:term,election_id:electionId,total_seats:totals.total_seats,seat_count_basis:'election_result_vintage_not_current_composition',result_vintage:election.result_vintage,start_date:null,end_date:null,date_status:'not_acquired_not_asserted',provenance:[prov(homepage,'main article',['official_term','chamber']),totalP]});
    const votersRecord=historyRows.find(({row})=>row[0]==='Wählende'),eligibleRecord=historyRows.find(({row})=>row[0]==='Wahlberechtigte'),invalidRecord=historyRows.find(({row})=>row[0]==='ungültige Stimmen');
    output.election_turnout.push({election_id:electionId,country:'germany',geography:'national',vote_type:'second_vote',result_vintage:election.result_vintage,eligible_voters:totals.electorate,voters:totals.voters,valid_second_votes:totals.valid_second_votes,invalid_second_votes:totals.invalid_second_votes,published_turnout:totals.published_turnout,derived_turnout:100*totals.voters/totals.electorate,turnout_definition:'Atlas calculation: voters / eligible voters × 100; published turnout retained separately',provenance:[prov(historical,`csv-record-${eligibleRecord.index+1}`,['eligible_voters'],'published',{columns:[4]}),prov(historical,`csv-record-${votersRecord.index+1}`,['voters','published_turnout'],'published',{columns:[4,6]}),prov(historical,`csv-record-${invalidRecord.index+1}`,['invalid_second_votes'],'published',{columns:[4]}),{...totalP,fields_covered:['valid_second_votes']},prov(historical,`csv-record-${votersRecord.index+1}`,['derived_turnout','turnout_definition'],'derived',{formula:'100 * voters / eligible_voters',input_fields:['voters','eligible_voters']})]});
    for(const item of election.contestants){
      const identity=queue.rows.find(r=>r.election_year===year&&r.source_column===item.column),label=labels.rows.find(r=>r.contestant_id===identity?.contestant_id);assert.ok(identity&&label);
      // Record alignment within one election, not an entity/continuity matcher.
      const peers=historyRows.filter(({row})=>officialNumber(row[4])===item.value&&!['Wählende','Wahlberechtigte','gültige Stimmen/Sitze insgesamt','ungültige Stimmen'].includes(row[0]));
      assert.equal(peers.length,1,`Ambiguous within-election count alignment ${identity.contestant_id}`);
      const {row,index}=peers[0],seats=officialNumber(row[79]),publishedShare=officialNumber(row[6]);
      const resultP=prov(zip,identity.source_record_id,['second_votes','registered_label_native'],'published',{source_member:election.member,source_member_sha256:election.member_sha256,source_column:item.column});
      const historicalP=prov(historical,`csv-record-${index+1}`,['published_vote_share','seats'],'published',{columns:[6,79],compilation_label:row[0],alignment_basis:'unique exact national second-vote count in the same election; not party identity'});
      const partyId=year===2025?identity.atlas_party_id:null;
      const membership=year===2025?identity:membershipReviews.get(identity.contestant_id);assert.ok(membership);
      const supplement=supplemental.rows.find(r=>r.contestant_id===identity.contestant_id);
      const evidence=(supplement?.evidence??membership.evidence??membership.review_evidence).filter(e=>e.source_record_id.startsWith('src-'));
      assert.ok(evidence.length);
      const membershipP=evidence.map(e=>{const id=e.source_record_id.split(':')[0],source=evidenceSources.get(id);assert.ok(source);assert.equal(source.sha256,e.sha256??e.source_sha256);register(source,id,'factual_metadata_only_source_link','https://www.bundeswahlleiterin.de/info/impressum.html');return prov(source,e.source_record_id,['contestant_kind','lead_party_id','membership'],'published',{decision_basis:'manual review of official same-election recognition/participation and result column',evidence_note:e.note});});
      output.electoral_contestants.push({contestant_id:identity.contestant_id,country:'germany',election_id:electionId,contestant_kind:'party_list',registered_label_native:item.label,historical_display_label:label.historical_display_label,lead_party_id:partyId,party_relation_status:partyId?'provisional_requires_production_second_review':'requires_manual_review',continuous_series_eligible:false,provenance:[resultP,...membershipP,prov(zip,label.evidence.map(e=>e.record_id).join(' | '),['historical_display_label'],'published',{label_basis:label.label_basis,label_evidence:label.evidence})]});
      output.party_identity_crosswalk.push({source_id:zip.source_id,source_party_id:identity.source_record_id,source_label:item.label,country:'germany',valid_from:date,valid_to:date,target_kind:'contestant',target_id:identity.contestant_id,canonical_party_id:partyId,match_basis:'manual_review',match_status:'confirmed_election_specific_record',party_relation_status:partyId?'provisional_requires_production_second_review':'requires_manual_review',continuous_series_eligible:false,reviewer_note:'Official result column to persisted election-specific contestant; no cross-election or legal-entity continuity decision.',provenance:[resultP,...membershipP.map(p=>({...p,fields_covered:['canonical_party_id']}))]});
      output.election_results.push({result_id:`er-${identity.contestant_id}`,country:'germany',geography:'national',election_id:electionId,contestant_ref:identity.contestant_id,vote_type:'second_vote',valid_second_votes:election.valid_second_votes,total_seats:totals.total_seats,second_votes:item.value,published_vote_share:publishedShare,derived_vote_share:100*item.value/election.valid_second_votes,seats,derived_seat_share:seats===null?null:100*seats/totals.total_seats,result_vintage:election.result_vintage,provenance:[resultP,historicalP,totalP,prov(zip,identity.source_record_id,['derived_vote_share'],'derived',{formula:'100 * second_votes / valid_second_votes',input_fields:['second_votes',`${electionId}:valid_second_votes`]}),prov(historical,`csv-record-${index+1}`,['derived_seat_share'],'derived',{formula:'100 * seats / total_seats; null remains null',input_fields:['seats',`${legislatureId}:total_seats`]})]});
      if(year===2025){
        const recognitionRef=identity.review_evidence[1],party=recognition.parties.find(p=>recognitionRef.source_record_id.endsWith(`table:${p.table}:row:${p.row}`));assert.ok(party);
        const partyP=prov(recognition.source,recognitionRef.source_record_id,['entity_kind','observed_at','name','membership'],'published');
        output.political_parties.push({atlas_party_id:partyId,country:'germany',entity_kind:'party',valid_from:null,valid_to:null,observed_at:date,interval_basis:'formation and dissolution dates not established; observed as a recognised party at the 2025 election',registry_ids:[],continuous_series_eligible:false,identity_status:'provisional_requires_production_second_review',provenance:[{...partyP,fields_covered:['entity_kind']}, {...resultP,fields_covered:['observed_at'],observation_basis:'actual participation at dated election'}]});
        output.party_names.push({name_id:`pn-${partyId}-2025`,atlas_party_id:partyId,country:'germany',name_type:'official_native',value:party.party_name,language:'de',script:'Latn',valid_from:date,valid_to:date,interval_basis:'name observed for this election only; not an asserted rename interval',provenance:[{...partyP,fields_covered:['value']}, {...resultP,fields_covered:['valid_from','valid_to'],observation_basis:'name observed at this election, not legal lifespan'}]});
        output.contestant_members.push({contestant_id:identity.contestant_id,atlas_party_id:partyId,country:'germany',election_id:electionId,membership_basis:'manual_review_official_same_election_recognition_and_result',review_status:'provisional_requires_production_second_review',provenance:[resultP,partyP]});
      }else output.reconciliation_log.push({reconciliation_id:`rc-${identity.contestant_id}`,country:'germany',election_id:electionId,contestant_id:identity.contestant_id,category:'party_identity_difference',status:'requires_manual_review',note:'Election-specific result is sourced. Canonical party relation unresolved; excluded from continuous party series.',provenance:[resultP]});
    }
  }
  const parlgovMeta=read('raw/germany/parlgov-2024/metadata.json');
  assert.equal(sha256(fs.readFileSync(path.join(root,parlgovMeta.raw_path))),parlgovMeta.sha256);
  register(parlgovMeta,'ParlGov stable 2024: reconciliation only','verified_open_licence','https://creativecommons.org/publicdomain/zero/1.0/');
  Object.assign(output.political_source_registry.at(-1),{institution:'ParlGov project (Döring, Huber, Manow)',tier:'tier2_harmonized_academic',official_status:'NOT official',attribution:'ParlGov stable 2024; DOI 10.7910/DVN/2VZ5ZC; CC0 1.0'});
  const table=parseCsv(fs.readFileSync(path.join(root,parlgovMeta.raw_path),'utf8'),','),header=table.shift();
  const academic=table.map((row,index)=>({row:Object.fromEntries(header.map((key,i)=>[key,row[i]])),index:index+2})).filter(({row})=>row.country_name_short==='DEU'&&row.election_type==='parliament');
  for(const election of output.elections){
    const rows=academic.filter(({row})=>row.election_date===election.date),legislature=output.legislatures.find(l=>l.election_id===election.election_id);
    const totals=[...new Set(rows.map(({row})=>Number(row.seats_total)))];
    assert.ok(totals.length<=1,'Academic total must not be silently resolved');
    const category=!rows.length?'source_gap':totals[0]===legislature.total_seats?'match':election.year===2021&&totals[0]===736?'definition_difference':'definition_difference';
    output.reconciliation_log.push({reconciliation_id:`rc-parlgov-${election.year}`,country:'germany',election_id:election.election_id,category,status:'documented',compared_field:'seats_total',official_value:legislature.total_seats,harmonized_value:totals[0]??null,note:!rows.length?'ParlGov 2024 does not cover the 2025 election; no extrapolation.':election.year===2021?'ParlGov 2024 records the original 2021 final result (736); Atlas uses the Berlin-repeat corrected result (735). Official values retained.':'National seat total comparison only; party names and academic party IDs are not promoted to official identities.',provenance:[...legislature.provenance,prov(parlgovMeta,rows.length?rows.map(r=>`csv-record-${r.index}`).join(' | '):'coverage ends before 2025',['harmonized_value','category'])]});
  }
  return output;
}
export function buildApprovedProduction(){
  const approval=read('germany_production_acceptance.json');
  assert.equal(approval.verdict,'ACCEPT_DATA_SCOPED');assert.equal(approval.country,'germany');
  for(const [file,hash] of Object.entries(approval.evidence_sha256))assert.equal(sha256(fs.readFileSync(path.join(root,'docs/political-data',file))),hash,`Changed reviewed evidence: ${file}`);
  const data=buildProductionCandidate();
  for(const party of data.political_parties)party.identity_status='confirmed_2025_election_specific_entity';
  for(const member of data.contestant_members)member.review_status='confirmed_2025_election_specific_membership';
  for(const row of [...data.electoral_contestants,...data.party_identity_crosswalk])if(row.party_relation_status==='provisional_requires_production_second_review')row.party_relation_status='confirmed_2025_election_specific_relation';
  for(const row of [...data.political_parties,...data.party_names,...data.contestant_members,...data.electoral_contestants,...data.party_identity_crosswalk])row.production_review={decision_file:'docs/political-data/germany_production_acceptance.json',reviewer:approval.independent_reviewer,reviewed_at:approval.reviewed_at,scope:'same_election_only_no_continuity'};
  return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const promote=process.argv.includes('--promote'),result=promote?buildApprovedProduction():buildProductionCandidate(),dir=path.join(root,promote?'src/data/political/germany':'docs/political-data/production-candidate');
  fs.mkdirSync(dir,{recursive:true});
  for(const store of stores){const file=path.join(dir,`${store}.json`);if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(file)),result[store]);else fs.writeFileSync(file,JSON.stringify(result[store],null,2)+'\n');}
  console.log(JSON.stringify({status:'pass',candidate_only:!promote,counts:Object.fromEntries(stores.map(s=>[s,result[s].length]))}));
}
