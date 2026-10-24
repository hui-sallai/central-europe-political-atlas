import countriesJson from "@/data/countries/countries.json";
import observationsJson from "@/data/observations/observations.json";
import {modelCards, calculateModelOutputForYear, eligibleModelYears, normalizeModelInput} from "./modelFramework";
import {calculateScenario, scenarioDefinitions, getSensitivityShockValues} from "./scenarioFramework";
import {transmissionObservations} from "./transmissionData";
import {crossCountryExtendedCanonicalObservations} from "./crossCountryParityData";
import {annualPoints, annualDifference} from "./annualComparison";
import {buildModelComparison} from "./modelComparisonGate";
import {toCsv} from "./researchSnapshot";
import {PLATFORM_BASE_URL, PLATFORM_VERSION} from "./releaseMetadata";
import type {Country} from "@/types/Country";
import type {Observation} from "@/types/Observation";
import type {ModelId, ModelOutput, ModelCard} from "@/types/ModelOutput";
import type {EvidenceDraft} from "./researchNotebook";

export type ResearchModelId = Exclude<ModelId,"household_economic_pressure">;
export const researchModelIds:ResearchModelId[]=["fiscal_pressure","external_vulnerability","industrial_dependency"];
export const transparentCountries=countriesJson.records as Country[];
// Read-only provenance join with the same precedence as modelFramework. Eligibility and scores belong to that engine.
const observations=[...new Map([...(observationsJson.records as Observation[]),...crossCountryExtendedCanonicalObservations,...transmissionObservations].map(o=>[o.id,o])).values()];
const pointById=new Map(annualPoints(observations,null).map((p,i)=>[observations[i].id,p]));
export const researchCard=(id:ResearchModelId)=>modelCards.find(c=>c.model_id===id)!;
export function modelResearchYears(id:ResearchModelId){const ids=new Set(researchCard(id).inputs.map(i=>i.indicator_id));const years=observations.filter(o=>ids.has(o.indicator)).map(o=>o.year);return Array.from({length:Math.max(...years)-Math.min(...years)+1},(_,i)=>Math.min(...years)+i);}
export function modelResearchOutput(id:ResearchModelId,country:string,year:number){const c=transparentCountries.find(c=>c.slug===country);return c&&modelResearchYears(id).includes(year)?calculateModelOutputForYear(c,researchCard(id),year):null;}
export function modelResearchObservation(id:ResearchModelId,country:string,indicator:string,year:number){const trace=modelResearchOutput(id,country,year)?.inputs.find(i=>i.indicator_id===indicator);return trace?observations.find(o=>o.id===trace.observation_id)??null:observations.find(o=>o.country_slug===country&&o.indicator===indicator&&o.year===year)??null;}
export const modelResearchScenarios=(id:ResearchModelId)=>scenarioDefinitions.filter(s=>s.reference_model_id===id);
export type ModelResearchSelection={model:ResearchModelId;country:string;year:number;from:number;to:number;compare:string[];scenario:string;shock:number;issues:string[]};
export const MODEL_RESEARCH_PARAMS=["model_year","model_from","model_to","model_compare","model_scenario","model_shock","model_version","formula_version","weight_version"];
export function restoreModelResearch(p:URLSearchParams,id:ResearchModelId):ModelResearchSelection{
 const card=researchCard(id),years=modelResearchYears(id),country=p.get("country")??"poland",definition=modelResearchScenarios(id)[0];
 const number=(key:string,fallback:number)=>p.has(key)&&p.get(key)!==""?Number(p.get(key)):p.has(key)?NaN:fallback;
 const scenario=p.get("model_scenario")??definition?.scenario_id??"",selected=modelResearchScenarios(id).find(d=>d.scenario_id===scenario);
 const s:ModelResearchSelection={model:id,country,year:number("model_year",eligibleModelYears(country,card.inputs)[0]??years.at(-1)!),from:number("model_from",years[0]),to:number("model_to",years.at(-1)!),compare:p.has("model_compare")?p.get("model_compare")!.split(","):[],scenario,shock:number("model_shock",selected?.default_shock_value??0),issues:[]};
 if(s.compare.length===1&&s.compare[0]==="")s.compare=[];
 if(!transparentCountries.some(c=>c.slug===country))s.issues.push("country");
 if(!years.includes(s.year))s.issues.push("year");
 if(!years.includes(s.from)||!years.includes(s.to)||s.from>s.to)s.issues.push("period");
 if(s.compare.length>4||new Set(s.compare).size!==s.compare.length||s.compare.some(c=>c===country||!transparentCountries.some(v=>v.slug===c)))s.issues.push("comparison");
 if((scenario&&!selected)||(!selected&&p.has("model_shock"))||(selected&&(!Number.isFinite(s.shock)||s.shock<selected.shock_min||s.shock>selected.shock_max)))s.issues.push("scenario");
 for(const key of ["model_version","formula_version","weight_version"] as const)if(p.has(key)&&p.get(key)!==card[key])s.issues.push("version");
 return s;
}
export function modelResearchUrl(s:ModelResearchSelection,en:boolean){const u=new URL(en?"/en/models/":"/models/",PLATFORM_BASE_URL),c=researchCard(s.model);const fields={tab:"run",skill:"composite_indicators",model:s.model,country:s.country,model_year:s.year,model_from:s.from,model_to:s.to,model_compare:s.compare.join(","),model_version:c.model_version,formula_version:c.formula_version,weight_version:c.weight_version,...(s.scenario?{model_scenario:s.scenario,model_shock:s.shock}:{})};for(const[k,v]of Object.entries(fields))u.searchParams.set(k,String(v));return u.href;}
export function modelResearchComparable(id:ResearchModelId,a:string,b:string,year:number){
 const x=modelResearchOutput(id,a,year),y=modelResearchOutput(id,b,year);
 if(!x||!y||x.score===null||y.score===null||x.model_version!==y.model_version||x.formula_version!==y.formula_version||x.weight_version!==y.weight_version||x.inputs.length!==y.inputs.length)return false;
 return x.inputs.every(i=>{const j=y.inputs.find(j=>i.indicator_id===j.indicator_id);return j&&j.weight===i.weight&&annualDifference(pointById.get(i.observation_id)??null,pointById.get(j.observation_id)??null)!==null;});
}
export function modelResearchCommonYear(s:ModelResearchSelection){
 const suggested=buildModelComparison(researchCard(s.model),transparentCountries.filter(c=>[s.country,...s.compare].includes(c.slug))).gate.comparison_year;
 const support=(year:number)=>s.compare.filter(c=>modelResearchComparable(s.model,s.country,c,year)).length;
 // The legacy utility chooses coverage before checking source-level compatibility. Never suggest an invalid reference.
 if(suggested!==null&&support(suggested)>0)return suggested;
 return modelResearchYears(s.model).map(year=>({year,count:support(year)})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||b.year-a.year)[0]?.year??null;
}
export function modelResearchScenario(s:ModelResearchSelection,shock=s.shock){const definition=modelResearchScenarios(s.model).find(d=>d.scenario_id===s.scenario);if(!definition||s.issues.length)return null;const out=modelResearchOutput(s.model,s.country,s.year);return calculateScenario({definition,countrySlug:s.country,shockValue:shock,cards:[researchCard(s.model)],outputs:out?[out]:[]});}
export function modelResearchSensitivity(s:ModelResearchSelection){const d=modelResearchScenarios(s.model).find(d=>d.scenario_id===s.scenario);return d?[...new Set([0,s.shock,...getSensitivityShockValues(d)])].filter(v=>v>=d.shock_min&&v<=d.shock_max).sort((a,b)=>a-b).map(shock=>({shock,result:modelResearchScenario(s,shock)})):[];}
// Engine contributions are rounded before aggregation; partial outputs divide their sum by available weight.
export function modelCalculationTrace(card:ModelCard,out:ModelOutput){const availableWeight=out.inputs.reduce((n,i)=>n+i.weight,0);return {availableWeight,roundedContributionSum:out.inputs.reduce((n,i)=>n+i.weighted_contribution,0),components:card.inputs.map(d=>{const i=out.inputs.find(i=>i.indicator_id===d.indicator_id);const normalized=i?normalizeModelInput(i.raw_value,d):null;return {definition:d,input:i??null,normalizedBeforeRounding:normalized,weightedBeforeRounding:normalized===null?null:normalized*d.weight,effectiveContribution:out.score===null||!i?null:i.weighted_contribution/availableWeight};})};}
export function modelResearchRecords(s:ModelResearchSelection){return [s.country,...s.compare].flatMap(country=>[...new Set([s.year,...modelResearchYears(s.model).filter(y=>y>=s.from&&y<=s.to)])].sort().map(year=>({country,year,output:modelResearchOutput(s.model,country,year),comparable:modelResearchComparable(s.model,s.country,country,year)})));}
export function modelResearchExport(s:ModelResearchSelection,exportedAt=new Date().toISOString()){
 if(s.issues.length)throw Error("Invalid model research configuration");
 const records=modelResearchRecords(s),ids=new Set(records.flatMap(r=>r.output?.input_observation_ids??[]));
 return {platform_version:PLATFORM_VERSION,exported_at:exportedAt,configuration:s,model_card:researchCard(s.model),baseline:modelResearchOutput(s.model,s.country,s.year),records,observations:observations.filter(o=>ids.has(o.id)),scenario_definition:modelResearchScenarios(s.model).find(d=>d.scenario_id===s.scenario)??null,scenario:modelResearchScenario(s),sensitivity:modelResearchSensitivity(s),research_url:modelResearchUrl(s,false),data_policy:"Recorded inputs and engine outputs for reproduction with the recorded model version; live URLs may change after revisions. Not an official frozen dataset, causal estimate or forecast."};
}
export function modelResearchCsv(s:ModelResearchSelection){return toCsv(["country","year","model","model_version","formula_version","weight_version","score","availability","coverage","same_year_comparable","indicator","observation_id","raw_value","unit","normalized_score","weight","rounded_contribution","effective_contribution","source","source_url","updated_at","status"],modelResearchRecords(s).flatMap(r=>modelCalculationTrace(researchCard(s.model),r.output!).components.map(c=>{const o=modelResearchObservation(s.model,r.country,c.definition.indicator_id,r.year);return {country:r.country,year:r.year,model:s.model,model_version:r.output!.model_version,formula_version:r.output!.formula_version,weight_version:r.output!.weight_version,score:r.output!.score,availability:r.output!.availability,coverage:r.output!.data_completeness,same_year_comparable:r.comparable,indicator:c.definition.indicator_id,observation_id:c.input?.observation_id,raw_value:c.input?.raw_value,unit:c.input?.unit,normalized_score:c.input?.normalized_score,weight:c.definition.weight,rounded_contribution:c.input?.weighted_contribution,effective_contribution:c.effectiveContribution,source:o?.source_name,source_url:o?.source_url,updated_at:o?.updated_at,status:c.input?o?.status:o?.status==="pending"?"pending":"missing_or_ineligible"};})));}
export function modelResearchEvidence(s:ModelResearchSelection,en:boolean):EvidenceDraft{
 const out=modelResearchOutput(s.model,s.country,s.year);if(s.issues.length||out?.score==null)throw Error("Unavailable model result");
 const data=modelResearchExport(s),card=researchCard(s.model),warnings=en?["Saved research configuration and recorded baseline inputs, not frozen research results. Live URLs recalculate from current data; export JSON to retain complete input/output records.","Fixed-rule descriptive index and conditional arithmetic scenarios, not causal estimates, probabilities or forecasts. Comparisons require matching active inputs and a common year."]:["保存研究配置与基线输入记录，不是冻结研究结果。实时链接按当前数据重算；请导出 JSON 保留完整输入和结果。","固定规则描述性指数及条件算术情景，不是因果估计、概率或预测。比较须使用相同启用输入和共同年份。"];
 return {type:"workspace",title:en?`${card.name}: inputs, history and comparison`:`${card.name_zh}：输入、历史与比较`,url:modelResearchUrl(s,en),canonical_ids:[...new Set(data.observations.map(o=>o.id))].slice(0,100),countries:[s.country,...s.compare],periods:[String(s.from),String(s.to),String(s.year)],sources:[...new Map(data.observations.map(o=>[`${o.indicator}:${o.source_url}`,{institution:o.source_name,dataset:o.indicator,url:o.source_url,layer:"model-eligible annual observation",original_unit:o.unit,normalized_unit:o.unit,updated_at:o.updated_at}])).values()],layer:"deterministic_rule_configuration",warnings,metadata:{filters:{country:s.country,model:s.model,year:s.year,from:s.from,to:s.to,compare:s.compare,scenario:s.scenario,shock:s.shock,model_version:card.model_version,formula_version:card.formula_version,weight_version:card.weight_version,baseline_input_fields:["observation_id","raw_value","unit","normalized_score","weight","weighted_contribution"],baseline_inputs:out.inputs.map(i=>JSON.stringify([i.observation_id,i.raw_value,i.unit,i.normalized_score,i.weight,i.weighted_contribution])),baseline_score:out.score},row_count:data.records.length,status:"configuration_with_recorded_baseline_not_frozen; first_100_observation_ids",entersModel:false}};
}
