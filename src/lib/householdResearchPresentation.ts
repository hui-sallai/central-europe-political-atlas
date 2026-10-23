import countriesData from "@/data/countries/countries.json";
import observationsData from "@/data/observations/observations.json";
import { calculateModelOutputForYear, eligibleModelYears, modelCards } from "./modelFramework";
import { calculateScenario, scenarioDefinitions } from "./scenarioFramework";
import { annualPoints, annualDifference, annualCsv } from "./annualComparison";
import type { Country } from "@/types/Country";
import type { Observation } from "@/types/Observation";
import type { EvidenceDraft } from "./researchNotebook";

// Presentation adapter only: both calculations remain owned by the published engines.
export const householdCard = modelCards.find(c => c.model_id === "household_economic_pressure")!;
export const householdScenario = scenarioDefinitions.find(s => s.scenario_id === "inflation_resurgence")!;
const countries = countriesData.records as Country[], observations = observationsData.records as Observation[];
const points = annualPoints(observations, null);
const recordedYears = observations.filter(o => householdCard.inputs.some(i => i.indicator_id === o.indicator)).map(o => o.year);
export const householdYears = Array.from({length:Math.max(...recordedYears)-Math.min(...recordedYears)+1},(_,i)=>Math.min(...recordedYears)+i);
export type HouseholdSession = { country: string; year: number; from: number; to: number; compare: string[]; shock: number; issues: string[] };
export function restoreHouseholdSession(p: URLSearchParams): HouseholdSession {
  const country = p.get("country") ?? "poland";
  const latest = eligibleModelYears(country, householdCard.inputs)[0] ?? householdYears.at(-1)!;
  const number = (key:string, fallback:number) => p.has(key) ? Number(p.get(key)) : fallback;
  const s:HouseholdSession = {country,year:number("pressure_year",latest),from:number("pressure_from",householdYears[0]),to:number("pressure_to",householdYears.at(-1)!),compare:p.has("pressure_compare") ? p.get("pressure_compare")!.split(",").filter(Boolean) : [],shock:number("pressure_shock",2),issues:[]};
  if(!countries.some(c => c.slug === country))s.issues.push("country");
  if(!householdYears.includes(s.year))s.issues.push("year");
  if(!householdYears.includes(s.from)||!householdYears.includes(s.to)||s.from>s.to)s.issues.push("period");
  if(s.compare.length>4||new Set(s.compare).size!==s.compare.length||s.compare.some(c=>c===country||!countries.some(v=>v.slug===c)))s.issues.push("comparison");
  if(!Number.isFinite(s.shock)||s.shock<householdScenario.shock_min||s.shock>householdScenario.shock_max)s.issues.push("shock");
  return s;
}
export function householdUrl(s:HouseholdSession,en:boolean) {
  const u=new URL(en?"/en/models/":"/models/","https://hy-central-europe-analysis.org");
  for(const [k,v] of Object.entries({tab:"run",skill:"composite_indicators",model:householdCard.model_id,country:s.country,pressure_year:s.year,pressure_from:s.from,pressure_to:s.to,pressure_compare:s.compare.join(","),pressure_shock:s.shock}))u.searchParams.set(k,String(v));
  return u.href;
}
export function householdOutput(country:string,year:number) {
  const c=countries.find(c=>c.slug===country);
  return c && householdYears.includes(year) ? calculateModelOutputForYear(c,householdCard,year) : null;
}
export function householdObservation(country:string,indicator:string,year:number) {
  return observations.find(o=>o.country_slug===country&&o.indicator===indicator&&o.year===year)??null;
}
export function householdScenarioResult(s:HouseholdSession) {
  const baseline=householdOutput(s.country,s.year);
  return calculateScenario({definition:householdScenario,countrySlug:s.country,shockValue:s.shock,cards:[householdCard],outputs:baseline?[baseline]:[]});
}
export function householdComparable(country:string,baseline:string,year:number) {
  const a=householdOutput(baseline,year),b=householdOutput(country,year);
  return Boolean(a?.score!==null&&a&&b?.score!==null&&b&&a.model_version===b.model_version&&a.formula_version===b.formula_version&&a.weight_version===b.weight_version&&householdCard.inputs.every(i=>annualDifference(points.find(p=>p.country_slug===baseline&&p.indicator===i.indicator_id&&p.year===year)??null,points.find(p=>p.country_slug===country&&p.indicator===i.indicator_id&&p.year===year)??null)!==null));
}
export function householdCsv(s:HouseholdSession) {
  return annualCsv(points.filter(p=>[s.country,...s.compare].includes(p.country_slug)&&householdCard.inputs.some(i=>i.indicator_id===p.indicator)&&p.year>=s.from&&p.year<=s.to));
}
export function householdEvidence(s:HouseholdSession,en:boolean):EvidenceDraft {
  const out=householdOutput(s.country,s.year);
  if(s.issues.length||out?.score==null)throw Error("Unavailable configuration");
  const warnings=en?["Saved configuration, not frozen observations or a research conclusion. Live URLs can change after source revisions.","Deterministic 0–100 rule score; no confidence interval, probability, forecast or causal estimate. Scenario changes HICP only; other inputs stay fixed."]:["保存的是配置，不是冻结观测或研究结论；来源修订后，实时链接内容可能变化。","0–100 固定规则分数，不是置信区间、概率、预测或因果估计。情景只调整 HICP，其他输入保持不变。"];
  const traces=[s.country,...s.compare].flatMap(c=>[...new Set([...householdYears.filter(y=>y>=s.from&&y<=s.to),s.year])].flatMap(y=>householdOutput(c,y)?.inputs??[]));
  const sources=[...new Map(traces.map(i=>[`${i.indicator_id}:${i.source_url}`,{institution:i.source_name,dataset:i.indicator_id,url:i.source_url,layer:"official annual observation",original_unit:i.unit,normalized_unit:i.unit}])).values()];
  return {type:"workspace",title:en?"Household pressure: inputs, comparison and conditional scenario":"家庭经济压力：输入、比较与条件情景",url:householdUrl(s,en),canonical_ids:[...new Set(traces.map(i=>i.observation_id))].slice(0,100),countries:[s.country,...s.compare],periods:[String(s.from),String(s.to),String(s.year)],sources,layer:"deterministic_rule_configuration",warnings,metadata:{filters:{country:s.country,year:s.year,from:s.from,to:s.to,compare:s.compare,shock:s.shock,model:out.model_version,formula:out.formula_version,weights:out.weight_version},status:"configuration_not_frozen_result; first_100_observation_references",entersModel:false}};
}
