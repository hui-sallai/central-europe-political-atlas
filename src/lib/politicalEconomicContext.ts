import type { Observation } from "@/types/Observation";
import type { Indicator } from "@/types/Indicator";
import type { Event } from "@/types/Event";
import { annualPoints, type AnnualHistory } from "./annualComparison";
import { isPublished } from "./freshnessCore";
import type { MonthlyHistoryRuntime } from "@/components/useMonthlyHistory";

export const CONTEXT_ANNUAL_IDS = ["real_gdp_growth", "gdp_per_capita_eur", "hicp_inflation", "unemployment_rate", "government_debt_gdp"];
export const CONTEXT_MONTHLY_IDS = ["hicp_annual_rate", "unemployment_rate_monthly", "industrial_production_index"];
export type ContextPoint = { id: string; country: string; indicator: string; frequency: "annual" | "monthly"; period: string; value: number | null; unit: string; status: string; source: string; sourceUrl: string; definition: string; comparable: boolean; layer: string };
export type ContextMonthlyMeta = { country: string; indicator: string; source_url: string; source_dataset: string; definition_version: string; unit: string; seasonal_adjustment: string; revision_status: string };
export type ContextHfRow = [string,string,string,string,number|null,string,string,string,string,string,string,string];
export type ContextRangeMode = "year" | "prior3" | "prior5" | "custom";
export type ContextRange = { from: string; to: string };

export function contextPublished(point: ContextPoint): boolean {
  return ["official", "verified"].includes(point.status) && Boolean(point.sourceUrl) && isPublished({ ...point, year: Number(point.period.slice(0,4)) });
}
export function contextRange(date: string, mode: ContextRangeMode, from: number, to: number): ContextRange {
  const year=Number(date.slice(0,4));
  const first=mode==="custom"?from:mode==="year"?year:year-(mode==="prior3"?3:5);
  const last=mode==="custom"?to:mode==="year"?year:year-1;
  return {from:`${first}-01-01`,to:`${last}-12-31`};
}
export function inContextRange(period: string, range: ContextRange): boolean {
  // Intersect reference periods, not fabricated observation days. Annual = full year; monthly = full calendar month.
  const start=period.length===4?`${period}-01-01`:period.length===7?`${period}-01`:period;
  const end=period.length===4?`${period}-12-31`:period.length===7?`${period}-31`:period;
  return range.from<=range.to && start<=range.to && end>=range.from;
}
export function contextTiming(period: string, electionDate: string): "prior" | "overlap" | "subsequent" {
  const reference=electionDate.slice(0,period.length);
  return period<reference?"prior":period>reference?"subsequent":"overlap";
}
export function contextAnnualPoints(observations: Observation[], history: AnnualHistory|null, indicators: Indicator[]): ContextPoint[] {
  const canonical=new Map(observations.map(o=>[`${o.country_slug}:${o.indicator}:${o.year}`,o]));
  return annualPoints(observations,history).filter(p=>CONTEXT_ANNUAL_IDS.includes(p.indicator)).map(p=>{
    const o=canonical.get(`${p.country_slug}:${p.indicator}:${p.year}`),i=indicators.find(i=>i.id===p.indicator);
    return {id:o?.id??`history:annual:${p.country_slug}:${p.indicator}:${p.year}`,country:p.country_slug,indicator:p.indicator,frequency:"annual",period:String(p.year),value:p.value,unit:p.unit,status:p.status,source:p.source_name,sourceUrl:p.source_url,definition:o?.source_dataset??(i?`${i.id}: ${p.source_name}`:p.indicator),comparable:p.comparable&&p.differenceComparable!==false,layer:p.layer};
  });
}
export function contextMonthlyPoints(history: MonthlyHistoryRuntime|null, current: ContextHfRow[], metadata: ContextMonthlyMeta[]): ContextPoint[] {
  const points=new Map<string,ContextPoint>();
  for(const [country,indicator,period,value,status,ref] of history?.records??[]){
    const s=history?.series_sources[ref];
    if(!s||s.country_slug!==country||s.series!==indicator||!CONTEXT_MONTHLY_IDS.includes(indicator))continue;
    points.set(`${country}:${indicator}:${period}`,{id:`history:monthly:${country}:${indicator}:${period}`,country,indicator,frequency:"monthly",period,value,unit:s.unit,status,source:s.source,sourceUrl:s.source_url,definition:s.definition,comparable:period>=s.definition_compatible_floor,layer:"descriptive monthly history"});
  }
  for(const [id,country,period,indicator,value,,unit,,,definition,source,status] of current){
    if(!CONTEXT_MONTHLY_IDS.includes(indicator))continue;
    const meta=metadata.find(m=>m.country===country&&m.indicator===indicator&&m.unit===unit&&m.definition_version===definition);
    // Current records, including unavailable rows, take precedence over historical backfill. Missing metadata does not grant provenance.
    points.set(`${country}:${indicator}:${period}`,{id,country,indicator,frequency:"monthly",period,value,unit,status,source,sourceUrl:meta?.source_url??"",definition,comparable:Boolean(meta),layer:"published monthly snapshot"});
  }
  return [...points.values()].sort((a,b)=>a.period.localeCompare(b.period));
}
export function contextEvents(events: Event[], country: string, range: ContextRange): Event[] {
  return events.filter(e=>e.country_slug===country&&e.data_status==="verified"&&Boolean(e.source_url)&&inContextRange(e.date,range)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
/** Same named measure, frequency, exact definition/unit and relative election period. No averaging or latest-value substitution. */
export function contextDifference(a: ContextPoint|null,b: ContextPoint|null,dateA: string,dateB: string): number|null {
  if(!a||!b||!contextPublished(a)||!contextPublished(b)||!a.comparable||!b.comparable||a.country!==b.country||a.indicator!==b.indicator||a.frequency!==b.frequency||a.unit!==b.unit||a.definition!==b.definition)return null;
  const relative=(p:ContextPoint,date:string)=>p.frequency==="annual"?Number(p.period)-Number(date.slice(0,4)):(Number(p.period.slice(0,4))-Number(date.slice(0,4)))*12+Number(p.period.slice(5,7))-Number(date.slice(5,7));
  return relative(a,dateA)===relative(b,dateB)?b.value!-a.value!:null;
}
export function contextCsv(points: ContextPoint[], electionId: string, range: ContextRange): string {
  const cell=(v:unknown)=>{const text=String(v??"");return `"${(typeof v==="string"&&/^[=+\-@\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')}"`;};
  return [["country","election_id","reference_from","reference_to","indicator_id","frequency","observation_period","published_value","unit","source","source_url","data_status","definition","layer"],...points.map(p=>[p.country,electionId,range.from,range.to,p.indicator,p.frequency,p.period,contextPublished(p)?p.value:null,p.unit,p.source,p.sourceUrl,p.status,p.definition,p.layer])].map(row=>row.map(cell).join(",")).join("\r\n");
}
