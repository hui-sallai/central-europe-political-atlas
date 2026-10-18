import type { Observation } from "@/types/Observation";
import type { Locale } from "@/i18n/config";
import type { CompareMode } from "./freshnessCore";
import type { EvidenceDraft } from "./researchNotebook";

export type AnnualHistory = { sources: { dataset: string; url: string }[]; records: [string, string, number, number, string, string, number][] };
export type AnnualPoint = Pick<Observation, "country_slug" | "indicator" | "year" | "value" | "unit" | "status" | "source_name" | "source_url"> & { comparable: boolean; layer: string; differenceComparable?: boolean };

/** Historical backfill is descriptive only. Even pending canonical rows take precedence. */
export function annualPoints(observations: Observation[], history: AnnualHistory | null): AnnualPoint[] {
  const points: AnnualPoint[] = observations.map(o => ({ ...o, comparable: o.comparability_status !== "definition_mismatch" && o.comparability_status !== "not_applicable" && o.applicability_status !== "not_applicable", differenceComparable: o.comparability_status === "comparable", layer: "published snapshot" }));
  const keys = new Set(points.map(p => `${p.country_slug}:${p.indicator}:${p.year}`));
  for (const [country_slug, indicator, year, value, unit, status, ref] of history?.records ?? []) {
    const source = history?.sources[ref];
    const key = `${country_slug}:${indicator}:${year}`;
    if (keys.has(key) || !source || !Number.isFinite(value)) continue;
    points.push({ country_slug, indicator, year, value, unit, status: status as Observation["status"], source_name: source.dataset, source_url: source.url, comparable: true, differenceComparable: true, layer: "descriptive annual history" });
    keys.add(key);
  }
  return points;
}

const relativeLevels = new Set(["gdp_current_eur", "gdp_per_capita_eur", "population", "exports_goods_services", "imports_goods_services"]);
export function annualDifference(baseline: AnnualPoint | null, point: AnnualPoint | null) {
  if (!baseline || !point || !baseline.comparable || !point.comparable || baseline.differenceComparable === false || point.differenceComparable === false || baseline.status === "pending" || point.status === "pending" || baseline.value === null || point.value === null || !Number.isFinite(baseline.value) || !Number.isFinite(point.value) || baseline.year !== point.year || baseline.unit !== point.unit || baseline.indicator !== point.indicator) return null;
  const absolute = point.value - baseline.value;
  return { absolute, relative: relativeLevels.has(point.indicator) && baseline.value > 0 && point.value >= 0 ? absolute / baseline.value * 100 : null };
}

export function annualCsv(points: AnnualPoint[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    // Treat source/label strings as text in spreadsheet applications.
    const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [["country", "indicator", "year", "value", "unit", "status", "source", "source_url", "layer"], ...points.map(p => [p.country_slug, p.indicator, p.year, p.value, p.unit, p.status, p.source_name, p.source_url, p.layer])].map(row => row.map(escape).join(",")).join("\r\n");
}

export const MACRO_SESSION_PARAMS=["macro_countries","macro_indicator","macro_mode","macro_year","macro_range","macro_from","macro_to"];
export type AnnualSession={countries:string[];indicator:string;mode:CompareMode;year:string;range:string;from:number;to:number;issues:string[]};
export const defaultAnnualSession=(countries:string[]):AnnualSession=>({countries:countries.slice(0,2),indicator:"real_gdp_growth",mode:"latest_common",year:"",range:"5",from:2000,to:2025,issues:[]});
const macroYear=(v:string|null)=>v!==null&&/^\d{4}$/.test(v)&&Number(v)>=1000&&Number(v)<=9999?Number(v):null;
export function restoreAnnualSession(params:URLSearchParams,countries:string[],indicators:string[]):AnnualSession{
  const s=defaultAnnualSession(countries),raw=params.get("macro_countries");
  if(raw!==null){const ids=raw.split(",");s.countries=[...new Set(ids.filter(c=>countries.includes(c)))].slice(0,5);if(s.countries.length<2||ids.length!==s.countries.length)s.issues.push("countries");}
  else {const legacy=params.get("country");if(legacy&&countries.includes(legacy))s.countries=[legacy,...countries.filter(c=>c!==legacy).slice(0,1)];}
  const indicator=params.get("macro_indicator");if(indicator!==null){s.indicator=indicator;if(!indicators.includes(indicator))s.issues.push("indicator");}
  const mode=params.get("macro_mode");if(mode!==null){if(mode==="latest_common"||mode==="latest_available")s.mode=mode;else s.issues.push("mode");}
  const year=params.get("macro_year");if(year!==null&&year!=="auto"){s.year=year;if(macroYear(year)===null)s.issues.push("year");}
  const range=params.get("macro_range");if(range!==null){if(["latest","5","10","all","custom"].includes(range))s.range=range;else s.issues.push("range");}
  if(params.has("macro_from")||params.has("macro_to")){s.range="custom";for(const key of ["from","to"] as const){const y=macroYear(params.get(`macro_${key}`));if(y===null)s.issues.push("range");else s[key]=y;}}
  if(s.range==="custom"&&(s.from>s.to||s.to-s.from>=200))s.issues.push("range");
  return s;
}
export function annualSessionUrl(s:AnnualSession,locale:Locale){
  const url=new URL(locale==="en"?"/en/models/":"/models/","https://hy-central-europe-analysis.org");url.searchParams.set("tab","compare");
  const params:Record<string,string>={macro_countries:s.countries.join(","),macro_indicator:s.indicator,macro_mode:s.mode,macro_year:s.year||"auto",macro_range:s.range};
  if(s.range==="custom"){params.macro_from=String(s.from);params.macro_to=String(s.to);}
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  return url.href;
}
export function annualSessionEvidence(s:AnnualSession,points:AnnualPoint[],locale:Locale,first:number,last:number,names:Record<string,string>,indicatorName:string):EvidenceDraft{
  const rows=points.filter(p=>s.countries.includes(p.country_slug)&&p.indicator===s.indicator&&p.year>=first&&p.year<=last&&p.comparable&&p.value!==null&&Number.isFinite(p.value)&&p.status!=="pending");
  if(s.issues.length||s.countries.length<2||s.countries.length>5||first>last||!rows.length||new Set(rows.map(r=>r.unit)).size!==1)throw Error("No comparable published annual observations or invalid session");
  const warnings={en:["Configuration, not a validated conclusion or frozen dataset. Annual economic observations remain separate from bilateral trade-network indicators.","Missing, pending and incompatible observations are not zero-filled or interpolated. Reference periods and data sources must be checked."],"zh-CN":["保存的是配置，不是经验证的结论或冻结数据。年度经济观测与双边贸易网络指标保持分离。","缺失、待发布与不可比观测不补零、不插值；须检查实际参照时期和数据来源。"]};
  const title=`${s.countries.map(c=>names[c]??c).join(" / ")} · ${indicatorName} · ${first}–${last}`;
  const sources=[...new Map(rows.map(r=>[r.source_url,{institution:r.source_name,dataset:r.indicator,url:r.source_url,layer:r.layer,original_unit:r.unit,normalized_unit:r.unit}])).values()].slice(0,100);
  return {type:"country_comparison",title,url:annualSessionUrl(s,locale),canonical_ids:rows.slice(0,100).map(r=>`annual:${r.country_slug}:${r.indicator}:${r.year}`),countries:s.countries,periods:[...new Set([String(first),String(last)])],unit:rows[0].unit,sources,layer:"descriptive_annual_comparison",comparability:"matching_published_annual_units_no_combined_trade_dataset",warnings:warnings.en,warning_labels:warnings,metadata:{filters:{countries:s.countries,indicator:s.indicator,reference_mode:s.mode,reference_year:s.year||"auto",range:s.range,from:first,to:last},row_count:rows.length,status:"configuration_not_conclusion; first_100_observation_references",coverage:s.countries.map(c=>`${c}: ${rows.filter(r=>r.country_slug===c).length} published comparable observations in ${first}–${last}; gaps and pending periods remain unavailable`),entersModel:false}};
}
