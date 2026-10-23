// Reuse the existing source-rights gate, not another licence registry.
// @ts-expect-error Shared governance module is JavaScript without a declaration file.
import { canExport } from "../../scripts/legal-security/policy.mjs";

export const POLLING_SCHEMA="atlas-parliamentary-polls-v1";
export type ParliamentaryPoll = {
  id:string;country:string;chamber:string;organisation:string;commissioner:string|null;
  fieldworkStart:string|null;fieldworkEnd:string|null;publicationDate:string;sampleSize:number|null;
  population:string;method:string|null;question:string|null;respondentBase:string;undecidedTreatment:string|null;
  entity:{kind:"party"|"alliance";id:string|null;label:string;identityVerified:boolean;identitySourceIds:string[]};
  supportPercent:number;uncertainty:{text:string;lower:number|null;upper:number|null;confidencePercent:number|null}|null;
  sourceId:string;sourceUrl:string;publisher:string;reuseTerms:{licence:string;url:string;attribution:string};retrievedAt:string;rawSha256:string;
  revision:{status:"original"|"corrected"|"superseded";version:string;correctionUrl:string|null};
};
export type PollingAdmission = { ownerApproved:boolean;decisionReference:string|null;publisherSourceIds:readonly string[];verifyIdentity?:(country:string,entity:ParliamentaryPoll["entity"])=>boolean };
export type PollingRights = {source_id:string;exact_source_url:string;institution:string;terms_url:string;licence_name:string;review_status:string;normalized_republication:string;[key:string]:unknown};
declare const admitted:unique symbol;
export type AdmittedPoll = ParliamentaryPoll & {derivedUseAllowed:boolean};
export type AdmittedPolling = {schema:typeof POLLING_SCHEMA;records:AdmittedPoll[];[admitted]:true};
const countries=new Set(["germany","poland","hungary","czechia","slovakia","romania","austria","slovenia","croatia","serbia"]);
const object=(x:unknown):x is Record<string,unknown>=>Boolean(x&&typeof x==="object"&&!Array.isArray(x));
const text=(x:unknown)=>typeof x==="string"&&x.trim().length>0&&x.length<=4000;
const date=(x:unknown):x is string=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const url=(x:unknown):x is string=>{try{const u=new URL(String(x));return u.protocol==="https:"&&!u.username&&!u.password&&![...u.searchParams.keys()].some(k=>/^(api.?key|token|secret|password)$/i.test(k));}catch{return false;}};
const optionalText=(x:unknown)=>x===null||text(x);
const keys=["id","country","chamber","organisation","commissioner","fieldworkStart","fieldworkEnd","publicationDate","sampleSize","population","method","question","respondentBase","undecidedTreatment","entity","supportPercent","uncertainty","sourceId","sourceUrl","publisher","reuseTerms","retrievedAt","rawSha256","revision"];
/** All-or-nothing, no ingestion or fetch. Unknown fields and future versions are refused. */
export function validatePollingEvidence(value:unknown,rights:readonly PollingRights[],admission:PollingAdmission):{ok:boolean;errors:string[];data:AdmittedPolling|null} {
  try{if(JSON.stringify(value).length>10_000_000)throw Error("size");return validatePolling(value,rights,admission);}catch{return {ok:false,errors:["malformed_or_oversized_polling_payload"],data:null};}
}
function validatePolling(value:unknown,rights:readonly PollingRights[],admission:PollingAdmission):{ok:boolean;errors:string[];data:AdmittedPolling|null} {
  const errors:string[]=[];
  if(!admission.ownerApproved||!admission.decisionReference)errors.push("polling_publication_not_authorised");
  if(!object(value)||value.schema!==POLLING_SCHEMA||Object.keys(value).some(k=>!["schema","records"].includes(k))||!Array.isArray(value.records)||value.records.length>5000)return {ok:false,errors:[...errors,"invalid_polling_collection"],data:null};
  const seen=new Set<string>(),active=new Set<string>(),pollDefinitions=new Map<string,string>();
  for(const [index,p] of value.records.entries()){
    const fail=(reason:string)=>errors.push(`${index}:${reason}`);
    if(!object(p)||Object.keys(p).length!==keys.length||Object.keys(p).some(k=>!keys.includes(k))){fail("invalid_record_fields");continue;}
    for(const key of ["id","country","chamber","organisation","population","respondentBase","sourceId"] as const)if(!text(p[key]))fail(`missing_${key}`);
    if(!countries.has(String(p.country)))fail("country");
    for(const key of ["commissioner","method","question","undecidedTreatment"] as const)if(!optionalText(p[key]))fail(key);
    if(!date(p.publicationDate)||!(p.fieldworkStart===null||date(p.fieldworkStart))||!(p.fieldworkEnd===null||date(p.fieldworkEnd)))fail("dates");
    if(typeof p.fieldworkStart==="string"&&typeof p.fieldworkEnd==="string"&&(p.fieldworkStart>p.fieldworkEnd||String(p.publicationDate)<p.fieldworkEnd))fail("fieldwork_order");
    if(p.sampleSize!==null&&(!Number.isSafeInteger(p.sampleSize)||Number(p.sampleSize)<=0))fail("sample_size");
    if(typeof p.supportPercent!=="number"||!Number.isFinite(p.supportPercent)||p.supportPercent<0||p.supportPercent>100)fail("published_estimate");
    if(!object(p.entity)||Object.keys(p.entity).some(k=>!["kind","id","label","identityVerified","identitySourceIds"].includes(k))||!["party","alliance"].includes(String(p.entity.kind))||!text(p.entity.label)||!optionalText(p.entity.id)||typeof p.entity.identityVerified!=="boolean"||!Array.isArray(p.entity.identitySourceIds)||p.entity.identitySourceIds.some(id=>!text(id))||(p.entity.identityVerified&&(!text(p.entity.id)||!p.entity.identitySourceIds.length)))fail("entity_identity");
    if(object(p.entity)&&p.entity.identityVerified&&(!admission.verifyIdentity||!admission.verifyIdentity(String(p.country),p.entity as ParliamentaryPoll["entity"])))fail("identity_not_verified_against_existing_political_evidence");
    const entityKey=`${p.id}:${object(p.entity)?p.entity.kind+":"+(p.entity.id??p.entity.label):"invalid"}`;
    const key=`${entityKey}:${object(p.revision)?p.revision.version:"invalid"}`;
    if(seen.has(key))fail("duplicate_poll_entity");seen.add(key);
    if(object(p.revision)&&p.revision.status!=="superseded"){if(active.has(entityKey))fail("duplicate_current_revision");active.add(entityKey);}
    const definition=JSON.stringify([p.country,p.chamber,p.organisation,p.fieldworkStart,p.fieldworkEnd,p.publicationDate,p.sampleSize,p.population,p.method,p.question,p.respondentBase,p.undecidedTreatment,p.revision]);
    const pollVersion=`${p.id}:${object(p.revision)?p.revision.version:"invalid"}`;
    if(pollDefinitions.has(pollVersion)&&pollDefinitions.get(pollVersion)!==definition)fail("inconsistent_poll_methodology");pollDefinitions.set(pollVersion,definition);
    const s=rights.find(s=>s.source_id===p.sourceId);
    if(!s||!admission.publisherSourceIds.includes(s.source_id)||s.exact_source_url!==p.sourceUrl||s.review_status!=="verified"||!canExport(s,"normalized").ok||!url(s.terms_url)||!text(s.licence_name))fail("source_rights_not_cleared");
    if(!s||p.publisher!==s.institution||!object(p.reuseTerms)||Object.keys(p.reuseTerms).length!==3||p.reuseTerms.licence!==s.licence_name||p.reuseTerms.url!==s.terms_url||!text(p.reuseTerms.attribution)||(s.required_attribution_text&&p.reuseTerms.attribution!==s.required_attribution_text))fail("reuse_terms");
    if(!url(p.sourceUrl)||typeof p.retrievedAt!=="string"||!Number.isFinite(Date.parse(p.retrievedAt))||!(/^[a-f0-9]{64}$/).test(String(p.rawSha256)))fail("provenance");
    if(!object(p.revision)||Object.keys(p.revision).some(k=>!["status","version","correctionUrl"].includes(k))||!["original","corrected","superseded"].includes(String(p.revision.status))||!text(p.revision.version)||!(p.revision.correctionUrl===null||url(p.revision.correctionUrl))||(p.revision.status==="corrected"&&!url(p.revision.correctionUrl)))fail("revision");
    if(p.uncertainty!==null){const u=p.uncertainty;if(!object(u)||!text(u.text)||Object.keys(u).some(k=>!["text","lower","upper","confidencePercent"].includes(k))||![u.lower,u.upper,u.confidencePercent].every(v=>v===null||(typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100))||((u.lower===null)!==(u.upper===null))||(typeof u.lower==="number"&&typeof u.upper==="number"&&(u.lower>Number(p.supportPercent)||u.upper<Number(p.supportPercent))))fail("reported_uncertainty");}
  }
  if(errors.length)return {ok:false,errors,data:null};
  const data=JSON.parse(JSON.stringify(value)) as AdmittedPolling;
  for(const p of data.records)p.derivedUseAllowed=Boolean(canExport(rights.find(s=>s.source_id===p.sourceId),"derived").ok);
  return {ok:true,errors:[],data};
}
export function pollingMethodKey(p:ParliamentaryPoll):string|null {
  if(!p.entity.identityVerified||!p.entity.id||!p.fieldworkStart||!p.fieldworkEnd||!p.method||!p.question||!p.undecidedTreatment||p.revision.status==="superseded")return null;
  return JSON.stringify([p.country,p.chamber,p.organisation,p.population,p.method,p.question,p.respondentBase,p.undecidedTreatment,p.entity.kind,p.entity.id]);
}
export function pollingTrend(a:AdmittedPoll,b:AdmittedPoll) {
  if(!a.derivedUseAllowed||!b.derivedUseAllowed)return {comparable:false,reason:"derived_use_not_cleared",change:null};
  const key=pollingMethodKey(a);
  if(!key||key!==pollingMethodKey(b))return {comparable:false,reason:"methodology_or_identity_not_comparable",change:null};
  if(a.fieldworkEnd!>=b.fieldworkStart!)return {comparable:false,reason:"overlapping_or_unordered_fieldwork",change:null};
  return {comparable:true,reason:null,change:b.supportPercent-a.supportPercent};
}
