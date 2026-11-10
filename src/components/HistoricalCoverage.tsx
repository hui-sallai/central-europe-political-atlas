"use client";
import {useEffect,useState} from 'react';
import {useLocale} from '@/i18n/LocaleProvider';
import {compactPeriods,contractFor,coverageEligible,exclusionLabel,inRanges,type CoverageInventory} from '@/lib/historicalCoverage';
// Shared request to the existing inventory; no additional registry or persistent storage.
let request:Promise<CoverageInventory>|null=null;
export function useHistoricalCoverage(){
 const [inventory,setInventory]=useState<CoverageInventory|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;
  request??=fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??''}/research-data/historical_recovery_inventory.json`).then(r=>{if(!r.ok)throw Error('coverage');return r.json();}).then(d=>{if(!Array.isArray(d.series)||!d.comparability?.national_annual||!d.comparability?.regional)throw Error('coverage schema');return d;}).catch(e=>{request=null;throw e;});
  request.then(d=>{if(active)setInventory(d);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};
 },[]);return {inventory,error};
}
export function HistoricalCoverage({inventory,error=false,country,indicator,frequency='annual',region,periods}:{inventory:CoverageInventory|null;error?:boolean;country:string;indicator:string;frequency?:string;region?:string;periods:string[]}){
 const en=useLocale()==='en',contract=contractFor(inventory,country,indicator,frequency,region);
 const eligible=periods.filter(p=>coverageEligible(contract,p)&&(!region||inRanges(p,inventory?.comparability.regional[indicator]?.by_country[country]?.common_comparable_years.ranges??[])));
 const groups=new Map<string,{category:number;reason:string;periods:string[]}>();
 for(const gap of contract?.missing.periods??[]){const key=`${gap.category}|${exclusionLabel(gap.category,gap.reason,en)}`;const g=groups.get(key)??{category:gap.category,reason:gap.reason,periods:[]};g.periods.push(gap.from===gap.to?gap.from:`${gap.from}–${gap.to}`);groups.set(key,g);}
 return <aside className="my-3 rounded border border-[var(--line)] p-3 text-sm" data-historical-coverage>
 <p className="font-semibold">{en?'Verified historical coverage':'已核实历史覆盖'}</p>
 {!inventory?<p role="status">{error?(en?'Coverage evidence unavailable; quantitative historical comparisons are withheld.':'覆盖证据读取失败；历史定量比较暂不提供。'):(en?'Loading coverage evidence…':'正在读取覆盖证据…')}</p>:!contract?<p>{en?'No matching audited contract; no comparability is assumed.':'无匹配的已核查数据契约；不推定可比。'}</p>:<>
 <p>{en?'Actual observations in the loaded series':'已加载序列实际观测'}: {compactPeriods(periods)} · {contract.unit??'—'} · {frequency}</p>
 <p>{en?'Eligible within the registered statistical frame':'符合登记统计口径的时期'}: {compactPeriods(eligible)}</p>
 <p>{en?"Descriptive observations excluded from this frame":"不符合此口径的描述性观测"}: {compactPeriods(periods.filter(p=>!eligible.includes(p)))}</p>
 <p className="text-xs text-[var(--muted)]">{en?'Descriptive history remains viewable; shared comparison periods also require matching units, definitions and geographic levels. Official coverage is a dated check, not a permanent publication claim.':'描述性历史仍可查看；共同可比时期另须同单位、定义及地域层级。官方覆盖为有日期的核查，不代表来源此后未更新。'}</p>
 {[...groups].map(([key,g])=><p className="mt-1 text-xs" key={key}>{exclusionLabel(g.category,g.reason,en)}: {compactPeriods(g.periods)}</p>)}
 <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">{en?'Definitions and coverage evidence':'定义与覆盖证据'}</summary><p className="mt-2 break-words">{contract.definition??'—'} · {contract.source_dataset??'—'} · {contract.key}</p><p>{en?'Definition floor':'定义下限'}: {String(contract.floors?.definition_compatible??'—')} · {contract.floors?.break_flags?.join(', ')}</p>{[...groups].map(([key,g])=><p key={key}>{g.reason}</p>)}<a className="underline" href={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/research-data/historical_recovery_inventory.json`}>{en?'Approved machine-readable inventory · 2026-11-10 snapshot':'已批准机器可读清单 · 2026-11-10 快照'}</a></details>
 </>}
 </aside>;
}
