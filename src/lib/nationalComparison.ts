import {annualPoints,type AnnualHistory} from './annualComparison';
import {annualCoverageEligible,contractFor,coverageEligible,inRanges,type CoverageInventory} from './historicalCoverage';
import {monthlyEligible,type MonthlyPayload} from './monthlyComparison';
import {indicatorTopic,type TopicId} from './indicatorTaxonomy';
import type {Observation} from '@/types/Observation';
import type {MonthlyHistoryRuntime} from '@/components/useMonthlyHistory';
import {sorsSeriesLabels,type SorsSeries} from '@/components/useSerbiaSors';
import type {MacroDriverDefinition,MacroDriverRuntimeRow} from '@/types/MacroDriver';
export type Frequency='annual'|'monthly'|'quarterly';
export type Metric={key:string;id:string;zh:string;en:string;frequency:Frequency;source:'annual'|'monthly'|'macro'|'sors';topic:TopicId;transformation?:string};
export type NationalPoint={id:string;country:string;period:string;value:number|null;unit:string;definition:string;source:string;url:string;status:string;layer:string;eligible:boolean;frame:string;warning?:string;vintage?:string;updatedAt?:string;dataset?:string};
export type NationalData={observations:Observation[];annual:AnnualHistory|null;monthly:MonthlyPayload;macro:MacroDriverRuntimeRow[];macroDefinitions:MacroDriverDefinition[];sors:SorsSeries[];history:MonthlyHistoryRuntime|null;inventory:CoverageInventory|null};
const extraLabels:Record<string,[string,string]>={gdp_per_capita_pps:['人均 GDP（PPS）','GDP per capita (PPS)'],compensation_per_employee_eur:['雇员人均报酬','Compensation per employee'],labour_productivity:['劳动生产率','Labour productivity']};
export function nationalMetrics(indicators:{id:string;name:string;name_zh:string;frequency?:string}[],d:NationalData):Metric[]{
 const out:Metric[]=indicators.filter(i=>i.frequency==='annual').map(i=>({key:`annual:${i.id}`,id:i.id,zh:i.name_zh,en:i.name,frequency:'annual',source:'annual',topic:indicatorTopic(i.id)}));
 for(const id of new Set(d.annual?.records.map(r=>r[1])??[]))if(!out.some(m=>m.key===`annual:${id}`)){const c=contractFor(d.inventory,'austria',id)??d.inventory?.series.find(s=>s.indicator===id&&s.frequency==='annual');out.push({key:`annual:${id}`,id,zh:extraLabels[id]?.[0]??c?.definition??id,en:extraLabels[id]?.[1]??c?.definition??id,frequency:'annual',source:'annual',topic:indicatorTopic(id)});}
 const monthlyNames:Record<string,[string,string]>={hicp_annual_rate:['HICP 同比率','HICP annual rate'],hicp_monthly_index:['HICP 月度指数','HICP monthly index'],industrial_production_index:['工业生产指数','Industrial production index'],unemployment_rate_monthly:['月度失业率','Monthly unemployment rate']};
 for(const id of Object.keys(monthlyNames))if(d.monthly.rows.some(r=>r[2]===id))out.push({key:`monthly:${id}`,id,zh:monthlyNames[id][0],en:monthlyNames[id][1],frequency:'monthly',source:'monthly',topic:indicatorTopic(id)});
 const transformLabels:Record<string,[string,string]>={monthly_log_change:['月度对数变化','Monthly log change'], '12m_log_change':['12 个月对数变化','12-month log change'],yoy_rate:['同比率','Year-on-year rate'],level:['水平值','Level'],monthly_change_bp:['月度变化（基点）','Monthly change (basis points)'],monthly_change:['月度变化','Monthly change'],log_difference_pct:['对数差分（%）','Log difference (%)'],log_change_pct:['对数变化（%）','Log change (%)'],yoy_change_pct:['同比变化（%）','Year-on-year change (%)']};
 for(const m of d.macroDefinitions){const base=m.transformation_options.includes('level')?'level':m.transformation_options[0];for(const transformation of m.transformation_options){const labels=transformLabels[transformation]??[transformation,transformation];out.push({key:`macro:${m.driver_id}${transformation===base?'':`:${transformation}`}`,id:m.driver_id,zh:`${m.name_zh} · ${labels[0]}`,en:`${m.name_en} · ${labels[1]}`,frequency:'monthly',source:'macro',topic:indicatorTopic(m.driver_id),transformation});}}
 for(const s of d.sors){const frequency:Frequency=s.store==='annual'?'annual':s.points.some(p=>/^\d{4}-Q[1-4]$/.test(p[0]))?'quarterly':'monthly';out.push({key:`sors:${s.key}`,id:s.display_indicator,zh:`${sorsSeriesLabels[s.key]??indicators.find(i=>i.id===s.display_indicator)?.name_zh??s.label} · SORS`,en:`${s.label} · SORS`,frequency,source:'sors',topic:indicatorTopic(s.key)});}
 return out;
}
export function nationalPoints(metric:Metric,d:NationalData):NationalPoint[]{
 if(metric.source==='annual')return annualPoints(d.observations,d.annual).filter(p=>p.indicator===metric.id).map(p=>{const c=contractFor(d.inventory,p.country_slug,p.indicator);return {id:`annual:${p.country_slug}:${p.indicator}:${p.year}`,country:p.country_slug,period:String(p.year),value:p.value,unit:p.unit,definition:c?.definition??p.indicator,source:p.source_name,dataset:p.source_name,url:p.source_url,status:p.status,layer:p.layer,eligible:p.comparable&&p.status!=='pending'&&annualCoverageEligible(d.inventory,p.country_slug,p.indicator,p.year),frame:`annual:${p.indicator}:${c?.definition??''}`};});
 if(metric.source==='monthly'){
  const rows=d.monthly.rows.filter(r=>r[2]===metric.id).map(r=>{const s=d.monthly.sources[r[6]];return {id:r[0],country:r[1],period:r[3],value:r[4],unit:s.unit,definition:s.definition,source:s.institution,dataset:s.dataset,url:s.url,status:r[5],layer:'published monthly',eligible:monthlyEligible(r,d.monthly),frame:`monthly:${metric.id}:${s.adjustment}:${s.base??''}`,warning:s.warning,vintage:s.vintage,updatedAt:s.updated};});
  // Earlier descriptive history is never silently admitted through the current monthly definition gate.
  return rows;
 }
 if(metric.source==='sors'){const s=d.sors.find(s=>`sors:${s.key}`===metric.key);return s?s.points.map(p=>({id:`sors:${s.key}:${p[0]}`,country:'serbia',period:p[0],value:p[1],unit:s.unit??s.original_unit??'',definition:s.label,source:`SORS ${s.dataset}`,dataset:s.dataset,url:s.source_url,status:s.status_legend[p[3]]??p[3],layer:'SORS descriptive',eligible:false,frame:`sors:${s.key}:${p[3]==='B'||p[3]==='D'?p[0]:'original'}`,warning:'Source-specific Serbian series; no harmonized cross-country equivalence is inferred. CPI is not HICP; quarterly LFS is not monthly unemployment.'})):[];}
 const rows:NationalPoint[]=d.macro.filter(r=>r[1]===metric.id&&r[7]===(metric.transformation??'level')).flatMap(r=>{
  const targets=r[2]?[r[2]]:r[20];const c=contractFor(d.inventory,r[2]??r[3],metric.id,'monthly');
  return targets.map(country=>({id:r[0],country,period:r[4],value:r[5],unit:r[6],definition:r[12],source:r[9],dataset:c?.source_dataset??metric.id,url:r[10],status:r[11],layer:r[21]?'shared published series':'published macro observation',eligible:r[11]==='observed_driver'&&(r[15]===null||r[15]==='valid')&&coverageEligible(c,r[4])&&metric.id!=='bilateral_fx_local_per_eur',frame:`macro:${metric.id}:${r[7]}:${r[13]}:${metric.id==='policy_rate'?(r[21]?'shared ECB':`${r[24]??country}:${r[23]??''}`):c?.definition??r[12]}`,warning:r[16]??(r[21]?'Shared source series, not independent national observations.':metric.id==='policy_rate'?'Policy instruments differ by central bank.':'')}));
 });
 if(metric.transformation&&metric.transformation!=='level')return rows;
 const keys=new Set(rows.map(p=>`${p.country}:${p.period}`));
 for(const r of d.history?.records??[])if(r[1]===metric.id&&!keys.has(`${r[0]}:${r[2]}`)){
  const s=d.history!.series_sources[r[5]],c=contractFor(d.inventory,r[0],metric.id,'monthly');
  rows.push({id:`history:${r[0]}:${r[1]}:${r[2]}`,country:r[0],period:r[2],value:r[3],unit:s.unit,definition:s.definition,source:s.source,dataset:c?.source_dataset??metric.id,url:s.source_url,status:r[4],layer:'descriptive monthly history',eligible:false,frame:`historical:${metric.id}:${c?.definition??''}`,warning:'Descriptive historical segment; not spliced into the current instrument or definition frame.'});
 }
 return rows;
}
export function sharedNationalPeriods(rows:NationalPoint[],countries:string[],inventory?:CoverageInventory|null){
 if(countries.length<2||countries.length>10)return [];
 return [...new Set(rows.map(r=>r.period))].sort().filter(period=>{const points=countries.map(c=>rows.find(r=>r.country===c&&r.period===period&&r.value!==null&&Number.isFinite(r.value)&&r.eligible));const annualId=points[0]?.frame.startsWith('annual:')?points[0].frame.split(':')[1]:null;
 const pairwise=!annualId||inventory===undefined||countries.every((a,i)=>countries.slice(i+1).every(b=>inRanges(period,inventory?.comparability.national_annual[annualId]?.pairwise[[a,b].sort().join('|')]?.ranges??[])));
 return pairwise&&points.every(Boolean)&&new Set(points.map(p=>p!.unit)).size===1&&new Set(points.map(p=>p!.frame)).size===1;});
}
export function selectedNationalCountries(params:URLSearchParams,allowed:string[]){
 const raw=params.get('compare_countries')??params.get('macro_countries')??params.get('monthly_countries')??params.get('country')??(params.get('area')?.startsWith('scope:')?'':params.get('area'))??'';
 const supplied=raw?raw.split(','):[];const countries=[...new Set(supplied.filter(c=>allowed.includes(c)))].slice(0,10);
 return {countries,invalid:supplied.length!==countries.length};
}
export function nationalCsv(rows:NationalPoint[]){const esc=(x:unknown)=>{let s=String(x??'');if(typeof x==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [['country','period','value','unit','definition','source','source_url','status','layer','comparison_eligible','observation_id','vintage','source_updated_at'],...rows.map(p=>[p.country,p.period,p.value,p.unit,p.definition,p.source,p.url,p.status,p.layer,p.eligible,p.id,p.vintage,p.updatedAt])].map(r=>r.map(esc).join(',')).join('\r\n');}

/** Legacy annual filters become explicit calendar boundaries, without adding observations. */
export function transferNationalPeriod(value:string|null,frequency:Frequency,end=false){
 if(!value||value==='all')return '';
 if(/^\d{4}$/.test(value)&&frequency!=='annual')return `${value}-${frequency==='monthly'?(end?'12':'01'):(end?'Q4':'Q1')}`;
 return value;
}

export function resolveNationalMetricKey(key:string,metrics:Metric[]){const direct=metrics.find(m=>m.key===key);if(direct)return direct.key;const [source,id,transformation]=key.split(':');return source==='macro'&&transformation?metrics.find(m=>m.source==='macro'&&m.id===id&&m.transformation===transformation)?.key??key:key;}
