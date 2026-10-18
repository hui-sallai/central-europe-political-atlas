import type { NetworkMetric } from "@/types/NetworkAnalysis";
import { NETWORK_COVERAGE_THRESHOLD } from "./networkEngine";
import type { EvidenceDraft } from "./researchNotebook";
import type { Locale } from "@/i18n/config";

export type TradeFlow = "exports" | "imports";
export type TradePartner = { partner: string; iso3: string | null; value: number; share: number };
export type TradeGroup = {
  reporter: string; year: number; flow: TradeFlow; partner_count: number;
  metrics: NetworkMetric | null;
  coverage: { reporter_country?: string; year?: number; flow?: string; eligible_coverage_ratio?: number | null; threshold: number; gate_passed: boolean; world_total: number | null } | null;
  top_partners: TradePartner[];
};
export type TradePack = { schema_version: string; generated_at: string; interpretation_boundary: string; records: TradeGroup[] };
export const TRADE_SOURCE = "https://comtradeplus.un.org/";
export const tradeMetrics = ["partner_hhi", "china_share", "germany_share", "top_partner_share", "diversification", "weighted_trade_volume", "partner_count"] as const;
export type TradeMetric = typeof tradeMetrics[number];
export const shareMetric = (metric: TradeMetric) => ["china_share", "germany_share", "top_partner_share"].includes(metric);
export const tradeUnit = (metric: TradeMetric) => metric === "weighted_trade_volume" ? "current USD" : metric === "partner_count" ? "partners" : shareMetric(metric) ? "fraction (0–1)" : "index (0–1)";

// Read-only presentation guards. Never recompute metrics or promote raw coverage.
export function tradeUnavailable(group: TradeGroup | null | undefined, schema: string): string | null {
  if (schema !== "trade-network-ui-pack-v1.3") return "schema";
  if (!group) return "absent";
  const c = group.coverage, m = group.metrics;
  if (!c) return "coverage_missing";
  if (!Number.isFinite(c.threshold) || c.threshold < NETWORK_COVERAGE_THRESHOLD) return "definition";
  if (c.eligible_coverage_ratio == null || !Number.isFinite(c.eligible_coverage_ratio)) return "eligible_missing";
  if (!c.gate_passed || c.eligible_coverage_ratio < c.threshold) return "coverage_failed";
  if (!m) return "metrics_missing";
  if (![m.partner_hhi,m.top_partner_share,m.diversification,m.weighted_trade_volume,m.partner_count].every(v => typeof v === "number" && Number.isFinite(v))) return "metrics_missing";
  if (m.country !== group.reporter || m.year !== group.year || m.flow !== group.flow || m.sector !== "TOTAL"
    || (c.reporter_country != null && c.reporter_country !== group.reporter)
    || (c.year != null && c.year !== group.year) || (c.flow != null && c.flow !== group.flow)) return "definition";
  return null;
}
export function tradeValue(group: TradeGroup | null | undefined, metric: TradeMetric, schema: string): number | null {
  if (tradeUnavailable(group, schema)) return null;
  const value = group!.metrics![metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function latestTradeYear(pack: TradePack | null, reporter: string, flow: TradeFlow): number | null {
  const years = pack?.records.filter(r => r.reporter === reporter && r.flow === flow && !tradeUnavailable(r, pack.schema_version)).map(r => r.year) ?? [];
  return years.length ? Math.max(...years) : null;
}
export function tradeComparable(a: TradeGroup | null | undefined, b: TradeGroup | null | undefined, schema: string, sameYear = true): boolean {
  return !tradeUnavailable(a, schema) && !tradeUnavailable(b, schema) && a!.flow === b!.flow && a!.metrics!.sector === b!.metrics!.sector
    && a!.coverage!.threshold === b!.coverage!.threshold && (sameYear ? a!.year === b!.year : a!.reporter === b!.reporter);
}
export function tradeDifference(a: TradeGroup | null | undefined, b: TradeGroup | null | undefined, metric: TradeMetric, schema: string, sameYear = true): number | null {
  if (!tradeComparable(a, b, schema, sameYear)) return null;
  const av = tradeValue(a, metric, schema), bv = tradeValue(b, metric, schema);
  return av === null || bv === null ? null : av - bv;
}
export function tradeYears(records: TradeGroup[]): number[] {
  const years = records.map(r => r.year).filter(Number.isInteger);
  return years.length ? Array.from({ length: Math.max(...years) - Math.min(...years) + 1 }, (_, i) => Math.min(...years) + i) : [];
}
export function tradeHistory(pack: TradePack, reporter: string, flow: TradeFlow, metric: TradeMetric, years: number[]) {
  return years.map(year => ({ x: year, y: tradeValue(pack.records.find(r => r.reporter === reporter && r.flow === flow && r.year === year), metric, pack.schema_version) }));
}
const csvCell = (value: string | number | null) => `"${(typeof value === "string" ? value.replace(/^[=+@\-\t\r]/, "'$&") : String(value ?? "")).replaceAll('"', '""')}"`;
export function tradeCsv(pack: TradePack, groups: TradeGroup[], metrics: readonly TradeMetric[]) {
  const header = ["reporting_country", "reference_year", "trade_flow", "sector", "metric", "value", "unit", "value_status", "source", "source_url", "coverage_status", "eligible_coverage_ratio", "coverage_threshold", "schema_version", "pack_generated_at", "data_provenance"];
  const rows = groups.filter(g => !tradeUnavailable(g, pack.schema_version)).flatMap(g => metrics.map(metric => [g.reporter, g.year, g.flow, g.metrics!.sector, metric, tradeValue(g, metric, pack.schema_version), tradeUnit(metric), tradeValue(g, metric, pack.schema_version) === null ? "missing_not_zero" : "stored_descriptive_metric", "UN Comtrade", TRADE_SOURCE, "passed", g.coverage!.eligible_coverage_ratio!, g.coverage!.threshold, pack.schema_version, pack.generated_at, "network_ui_pack.json; canonical eligible-partner metrics; not independently reported official indicators"].map(csvCell).join(",")));
  return [header.join(","), ...rows].join("\r\n");
}

export const TRADE_SESSION_PARAMS = ["trade_compare","trade_mode","trade_countries","trade_year_selection","trade_flow","trade_year","trade_metric","trade_from","trade_to","trade_partner","trade_pack"];
export type TradeSession = { mode: "standard" | "regional"; regional: string[]; country: string; compare: string; flow: TradeFlow; year: number | null; yearMode: "auto" | "fixed" | "none"; yearSelection: "latest" | "common"; metric: TradeMetric; from: number | null; to: number | null; partner: string; expectedPack: string; issues: string[] };
export const tradeSessionCountries=(s:TradeSession)=>s.mode==="regional"?s.regional:[s.country,...(s.compare?[s.compare]:[])];
export const validTradeSelection=(pack:TradePack,s:TradeSession)=>s.mode!=="regional"||(s.regional.length>=3&&s.regional.length<=5&&new Set(s.regional).size===s.regional.length&&s.regional.every(c=>pack.records.some(r=>r.reporter===c)));
export function tradeRegionalComparable(pack:TradePack,s:TradeSession,year?:number){
  const thresholds=pack.records.filter(g=>tradeSessionCountries(s).includes(g.reporter)&&g.flow===s.flow&&(year===undefined||g.year===year)&&!tradeUnavailable(g,pack.schema_version)).map(g=>g.coverage!.threshold);
  return new Set(thresholds).size<=1;
}
export function tradeRegionalCsv(pack:TradePack,s:TradeSession){
  const compatible=tradeRegionalComparable(pack,s);
  const header=tradeCsv(pack,[],[s.metric]);
  const rows=tradeSessionCountries(s).flatMap(c=>tradeSessionYears(pack,s).map(y=>{
    const yearCompatible=s.yearSelection==="common"?tradeRegionalComparable(pack,s,y):compatible;
    const g=pack.records.find(r=>r.reporter===c&&r.year===y&&r.flow===s.flow);
    if(yearCompatible&&g&&!tradeUnavailable(g,pack.schema_version))return tradeCsv(pack,[g],[s.metric]).split("\r\n")[1];
    const status=yearCompatible?tradeUnavailable(g,pack.schema_version):"definition";
    return [c,y,s.flow,"TOTAL",s.metric,null,tradeUnit(s.metric),"unavailable_not_zero","UN Comtrade",TRADE_SOURCE,status,g?.coverage?.eligible_coverage_ratio??null,g?.coverage?.threshold??null,pack.schema_version,pack.generated_at,"network_ui_pack.json; excluded or absent observation; no numerical substitution"].map(csvCell).join(",");
  }));
  return [header,...rows].join("\r\n");
}
export function defaultTradeSession(country = "hungary"): TradeSession {
  return { mode:"standard",regional:[],country, compare:"", flow:"imports", year:null, yearMode:"auto", yearSelection:"latest", metric:"partner_hhi", from:null, to:null, partner:"", expectedPack:"", issues:[] };
}
const requestedYear = (s: string | null) => s !== null && /^\d{4}$/.test(s) && Number(s)>=1000 && Number(s)<=9999 ? Number(s) : null;
export function restoreTradeSession(pack: TradePack, params: URLSearchParams, fallback = "hungary"): TradeSession {
  const reporters=new Set(pack.records.map(r=>r.reporter));
  const s=defaultTradeSession(reporters.has(fallback)?fallback:[...reporters][0]??fallback);
  const country=params.get("country"),compare=params.get("trade_compare"),flow=params.get("trade_flow"),metric=params.get("trade_metric");
  if(country){if(reporters.has(country))s.country=country;else s.issues.push("country");}
  if(compare){if(reporters.has(compare)&&compare!==s.country)s.compare=compare;else s.issues.push("compare");}
  const mode=params.get("trade_mode");
  if(mode&&mode!=="standard"&&mode!=="regional")s.issues.push("mode");
  if(mode==="regional"){
    s.mode="regional";
    const raw=(params.get("trade_countries")??"").split(",").filter(Boolean);
    s.regional=[...new Set(raw.filter(c=>reporters.has(c)))].slice(0,5);
    if(raw.length!==s.regional.length||!validTradeSelection(pack,s))s.issues.push("countries");
  }else if(params.has("trade_countries"))s.issues.push("countries");
  if(flow){if(flow==="exports"||flow==="imports")s.flow=flow;else s.issues.push("flow");}
  if(metric){if(tradeMetrics.includes(metric as TradeMetric))s.metric=metric as TradeMetric;else s.issues.push("metric");}
  const yearSelection=params.get("trade_year_selection");
  if(yearSelection){if(yearSelection==="latest"||(yearSelection==="common"&&s.mode==="regional"))s.yearSelection=yearSelection;else s.issues.push("year_selection");}
  if(params.has("trade_year")){
    const raw=params.get("trade_year"),year=requestedYear(raw);
    s.year=year;s.yearMode=raw==="auto"?"auto":year===null?"none":"fixed";
    if(year===null&&raw!=="none"&&raw!=="auto")s.issues.push("year");
  }
  for(const key of ["from","to"] as const)if(params.has(`trade_${key}`)){
    const y=requestedYear(params.get(`trade_${key}`));if(y===null)s.issues.push("range");else s[key]=y;
  }
  const y=tradeSessionYear(pack,s),g=pack.records.find(r=>r.reporter===s.country&&r.year===y&&r.flow===s.flow);
  const partner=params.get("trade_partner");if(partner){if(!tradeUnavailable(g,pack.schema_version)&&g?.top_partners.some(p=>p.partner===partner))s.partner=partner;else s.issues.push("partner");}
  const revision=params.get("trade_pack");if(revision){if(/^[a-f0-9]{64}$/.test(revision))s.expectedPack=revision;else s.issues.push("pack");}
  return s;
}
export const tradeSessionYear=(pack:TradePack|null,s:TradeSession)=>{
  if(s.yearMode!=="auto")return s.yearMode==="none"?null:s.year;
  if(pack&&s.mode==="regional"&&s.yearSelection==="common")return tradeCommonYears(pack,s).at(-1)??null;
  const years=tradeSessionCountries(s).map(c=>latestTradeYear(pack,c,s.flow)).filter((y):y is number=>y!==null);
  return s.mode==="regional"?(years.length?Math.max(...years):null):latestTradeYear(pack,s.country,s.flow);
};
export function tradeSessionYears(pack:TradePack,s:TradeSession):number[]{
  const actual=tradeYears(pack.records.filter(r=>tradeSessionCountries(s).includes(r.reporter)&&r.flow===s.flow));
  const from=s.from??actual[0],to=s.to??actual.at(-1);
  return from!==undefined&&to!==undefined&&to>=from&&to-from<100?Array.from({length:to-from+1},(_,i)=>from+i):[];
}
export function tradeCommonYears(pack:TradePack,s:TradeSession):number[]{
  const countries=tradeSessionCountries(s);
  if(!countries.length||!validTradeSelection(pack,s))return [];
  return tradeSessionYears(pack,s).filter(year=>{
    const groups=countries.map(c=>pack.records.find(g=>g.reporter===c&&g.year===year&&g.flow===s.flow));
    return groups.every(g=>tradeValue(g,s.metric,pack.schema_version)!==null&&tradeComparable(groups[0],g,pack.schema_version));
  });
}
export function tradeEvidenceAvailability(pack:TradePack,s:TradeSession){
  const years=tradeSessionYears(pack,s);
  return tradeSessionCountries(s).map(country=>({country,eligible:years.filter(year=>tradeValue(pack.records.find(g=>g.reporter===country&&g.year===year&&g.flow===s.flow),s.metric,pack.schema_version)!==null),excluded:years.flatMap(year=>{const g=pack.records.find(g=>g.reporter===country&&g.year===year&&g.flow===s.flow);const reason=tradeUnavailable(g,pack.schema_version)??(tradeValue(g,s.metric,pack.schema_version)===null?"metric_missing":null);return reason?[{year,reason}]:[];})}));
}
export function tradeWorkspaceConfiguration(pack:TradePack,s:TradeSession,locale:Locale,revision:string){
  const years=tradeSessionYears(pack,s);
  if(s.mode!=="regional"||!validTradeSelection(pack,s)||!years.length||s.issues.some(i=>["countries","mode","metric","flow","year","year_selection","range"].includes(i)))throw Error("Invalid regional workspace configuration");
  const common=tradeCommonYears(pack,s),year=tradeSessionYear(pack,s),complete=year!==null&&tradeCommonYears(pack,{...s,from:year,to:year}).includes(year);
  return {mode:"regional" as const,countries:tradeSessionCountries(s),flow:s.flow,metric:s.metric,from:years[0],to:years.at(-1)!,reference_year:year,reference_year_mode:s.yearMode,year_selection:s.yearSelection,common_eligible_years:common,
    research_url:tradeSessionUrl(pack,s,locale,revision),pack_revision:revision,pack_generated_at:pack.generated_at,
    availability:tradeEvidenceAvailability(pack,s).map(r=>`${r.country}: eligible=${r.eligible.join(",")||"none"}; excluded=${r.excluded.map(x=>`${x.year}:${x.reason}`).join(",")||"none"}`),
    limitations:locale==="en"?["Research configuration, not a conclusion or frozen dataset. UN Comtrade bilateral goods trade remains separate from Eurostat total goods-and-services indicators. Shares use eligible partners; pack generation is not source publication time.",common.length?"Common eligible years are limited to the selected period and metric.":"No common eligible year in the selected historical period; partial views remain available.",complete?"Reference year has common eligible observations.":"No complete reference-year comparison is established."]:["研究配置不是结论，也不冻结数据。UN Comtrade双边货物贸易与Eurostat货物及服务总额分别保留；份额使用有效伙伴分母，数据包生成时间不是来源发布时间。",common.length?"共同有效年份仅适用于所选期间与指标。":"所选历史期间没有共同有效年份，仍可查看部分覆盖。",complete?"参照年具有共同有效观测。":"尚不构成完整的参照年比较。"]};
}
export type TradeWorkspaceConfiguration=ReturnType<typeof tradeWorkspaceConfiguration>;
export async function tradePackRevision(pack:TradePack):Promise<string>{
  const bytes=await globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(pack)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
// Allowlisted filters only: unrelated query text and credentials never enter shared links or Notebook.
export function tradeSessionUrl(pack:TradePack,s:TradeSession,locale:Locale,revision:string):string{
  const url=new URL(locale==="en"?"/en/models/":"/models/","https://hy-central-europe-analysis.org");
  url.searchParams.set("tab","run");url.searchParams.set("skill","network_dependency");url.searchParams.set("country",s.country);
  if(s.compare)url.searchParams.set("trade_compare",s.compare);
  if(s.mode==="regional"){url.searchParams.set("trade_mode","regional");url.searchParams.set("trade_countries",s.regional.join(","));}
  if(s.yearSelection==="common")url.searchParams.set("trade_year_selection","common");
  url.searchParams.set("trade_flow",s.flow);url.searchParams.set("trade_year",s.yearMode==="auto"&&s.mode==="regional"?"auto":String(tradeSessionYear(pack,s)??"none"));url.searchParams.set("trade_metric",s.metric);
  const years=tradeSessionYears(pack,s);const actual=tradeYears(pack.records.filter(r=>tradeSessionCountries(s).includes(r.reporter)&&r.flow===s.flow));
  const from=s.from??years[0]??actual[0],to=s.to??years.at(-1)??actual.at(-1);
  if(from!==undefined)url.searchParams.set("trade_from",String(from));if(to!==undefined)url.searchParams.set("trade_to",String(to));
  if(s.partner)url.searchParams.set("trade_partner",s.partner);if(revision)url.searchParams.set("trade_pack",revision);
  return url.href;
}
export function tradeSessionEvidence(pack:TradePack,s:TradeSession,locale:Locale,revision:string,countryNames:Record<string,{en:string;"zh-CN":string}>,metricNames:{en:string;"zh-CN":string}):EvidenceDraft{
  if(!validTradeSelection(pack,s)||s.issues.some(i=>["countries","mode"].includes(i))||(s.mode==="regional"&&s.yearSelection!=="common"&&!tradeRegionalComparable(pack,s)))throw Error("Invalid regional selection or incompatible definitions");
  const countries=tradeSessionCountries(s),years=tradeSessionYears(pack,s);
  const rows=pack.records.filter(g=>countries.includes(g.reporter)&&g.flow===s.flow&&years.includes(g.year)&&tradeValue(g,s.metric,pack.schema_version)!==null&&(s.mode!=="regional"||s.yearSelection!=="common"||tradeRegionalComparable(pack,s,g.year)));
  if(!rows.length||s.issues.includes("year")||s.issues.includes("range")||s.issues.includes("year_selection"))throw Error("No eligible selected observations or invalid configuration");
  const warnings={en:["Saved configuration, not a validated research conclusion. Links reopen the current published pack, not a frozen dataset.","Coverage gates remain active. Missing or failed years are not zero and are not interpolated. Shares use eligible partners; current USD is not real growth.","Pack generation time is not the source publication date. Trade concentration is not economic risk or political dependence."],"zh-CN":["保存的是研究配置，不是经验证的研究结论。链接重开当前发布数据包，并不冻结数据。","覆盖门槛仍然有效；缺失或不合格年份不是零，也不插值。份额使用有效伙伴分母；当年美元不代表实际增长。","数据包生成时间不是来源发布时间。贸易集中度不等于经济风险或政治依赖。"]};
  for(const c of countries){const gaps=years.filter(y=>!rows.some(g=>g.reporter===c&&g.year===y));if(gaps.length){warnings.en.push(`${countryNames[c]?.en??c}: unavailable ${gaps.join(", ")}.`);warnings["zh-CN"].push(`${countryNames[c]?.["zh-CN"]??c}：不可用年份 ${gaps.join("、")}。`);}}
  const year=tradeSessionYear(pack,s);
  for(const c of countries){const g=pack.records.find(r=>r.reporter===c&&r.flow===s.flow&&r.year===year);if(tradeValue(g,s.metric,pack.schema_version)===null){warnings.en.push(`${countryNames[c]?.en??c}: reference-year ${year??"none"} metric unavailable.`);warnings["zh-CN"].push(`${countryNames[c]?.["zh-CN"]??c}：参照年 ${year??"—"} 指标不可用。`);}}
  if(s.expectedPack&&s.expectedPack!==revision){warnings.en.push("The reopened pack differs from the saved pack; selections were revalidated against current records.");warnings["zh-CN"].push("重开数据包与保存版本不同；已按当前记录重新验证配置。");}
  const titles={en:`${countries.map(c=>countryNames[c]?.en??c).join(" / ")} · ${s.flow} · ${metricNames.en} · ${years[0]}–${years.at(-1)}`,"zh-CN":`${countries.map(c=>countryNames[c]?.["zh-CN"]??c).join(" / ")} · ${s.flow==="imports"?"进口":"出口"} · ${metricNames["zh-CN"]} · ${years[0]}–${years.at(-1)}`};
  return {type:countries.length>1?"country_comparison":"series_view",title:titles[locale],labels:titles,url:tradeSessionUrl(pack,s,locale,revision),canonical_ids:rows.map(g=>`network:${g.reporter}:${g.year}:${g.flow}:${s.metric}`).slice(0,100),countries,periods:years.map(String),unit:tradeUnit(s.metric),layer:"descriptive_trade_network",comparability:"same_flow_TOTAL_goods_eligible_partner_metrics; configuration_not_conclusion",warnings:warnings.en,warning_labels:warnings,
    sources:[{institution:"UN Comtrade",dataset:`TOTAL bilateral goods trade; ${pack.schema_version}`,url:TRADE_SOURCE,layer:"tier1_official",original_unit:tradeUnit(s.metric),normalized_unit:tradeUnit(s.metric)}],
    metadata:{filters:{country:s.country,compare:s.compare,flow:s.flow,reference_year:year??"none",metric:s.metric,from:years[0],to:years.at(-1)!,partner:s.partner,pack_revision:revision,pack_generated_at:pack.generated_at,selected_countries:countries,reference_year_selection:s.yearMode==="fixed"?"explicit":s.yearSelection,common_eligible_years:tradeCommonYears(pack,s).map(String),comparison_mode:s.mode==="regional"?"regional":s.compare?"two_countries":"single_country"},row_count:rows.length,coverage:countries.flatMap(c=>years.map(y=>{const g=pack.records.find(r=>r.reporter===c&&r.year===y&&r.flow===s.flow);return `${c} ${y}: ${(s.mode==="regional"&&s.yearSelection==="common"&&!tradeRegionalComparable(pack,s,y)?"definition":tradeUnavailable(g,pack.schema_version))??(tradeValue(g,s.metric,pack.schema_version)===null?"metric_missing":"eligible")}; eligible_ratio=${g?.coverage?.eligible_coverage_ratio??"missing"}; threshold=${g?.coverage?.threshold??"missing"}`;})).slice(0,100),status:"configuration_with_current_eligible_observations_not_conclusion",reference:`${pack.schema_version}; pack_generated_at=${pack.generated_at} (not publication date); sha256=${revision}`,entersModel:false}};
}
