import type { AnnualPendingEvidence } from "./annualPendingEvidence";
export type Revision = { period: string; previous: number | null; revised: number | null };
// addedRanges: contiguous added periods [first, last] (same period format), used for long ledger-correction detail.
export type RefreshChange = { series: string; added: string[]; revisions: Revision[]; dataset?: string; addedRanges?: [string, string][] };
// seriesCount null = per-series detail not recorded (never shown as 0). appliedCorrection: approved ledger correction of a placeholder time.
export type PublicRefresh = { id: string; applied: string; source: string; unit: string; frequencies: string[]; added: number | null; revised: number | null; changes: RefreshChange[]; seriesCount: number | null; appliedCorrection?: { recorded: string; notBefore: string; notAfter: string; correction: string } };
type LedgerUnit = { unit: string; source_family: string; stores?: { kind: string; path: string; new_observations?: number; revisions?: number }[]; new_periods?: { series: string; periods: string[] }[]; revisions?: { series: string; revisions: Revision[] }[] };
type LedgerEntry = { run_id: string; applied_at: string; plan_sha256: string; units: LedgerUnit[] };
type LedgerCorrection = { mode: "ledger-correction"; run_id: string; plan_sha256: string; corrects: { run_id: string; plan_sha256: string }; corrections: { field: string; recorded: string; corrected_window?: { not_before: string; not_after: string } }[]; per_series_detail?: { unit: string; new_periods: { dataset: string; series: string; periods: string[] }[] } };
const nextPeriod=(p:string)=>/^\d{4}$/.test(p)?String(Number(p)+1):/^\d{4}-Q[1-4]$/.test(p)?(p.endsWith("4")?`${Number(p.slice(0,4))+1}-Q1`:`${p.slice(0,6)}${Number(p.at(-1))+1}`):/^\d{4}-\d{2}$/.test(p)?(p.endsWith("12")?`${Number(p.slice(0,4))+1}-01`:`${p.slice(0,5)}${String(Number(p.slice(5))+1).padStart(2,"0")}`):null;
export function periodRanges(periods:string[]):[string,string][]{const out:[string,string][]=[];for(const p of [...periods].sort()){const last=out.at(-1);if(last&&nextPeriod(last[1])===p)last[1]=p;else out.push([p,p]);}return out;}
export function addedPeriodCount(change:RefreshChange){let n=change.added.length;for(const [a,b] of change.addedRanges??[]){let p:string|null=a,i=0;while(p&&p<=b&&i<10000){n+=1;i+=1;p=nextPeriod(p);}}return n;}
export const addedPeriods=(change:RefreshChange)=>[change.added.join(", "),formatRanges(change.addedRanges??[])].filter(Boolean).join(", ");
export const formatRanges=(ranges:[string,string][])=>ranges.map(([a,b])=>a===b?a:`${a}–${b}`).join(", ");
type Approval = { run_id: string; status: string; unit: string; ledger_plan_sha256: string };
export type ProvenanceSeries = { dataset: string; pending?: AnnualPendingEvidence[]; version: string | null; recordDates: { date: string; periods: string[] }[]; country: string; indicator: string; frequency: string; unit: string; revisionUnit: string | null; source: { name: string; dataset: string; url: string }; definitions: string[]; statuses: Record<string,number>; samples: { model_family: string; sample_start: string | null; sample_end: string | null; status: string | null }[]; checked: string | null; sourceUpdated: string | null; vintage: string[]; methods: string[]; crossCountry?: boolean; mapping?: string };
export type RefreshManifest = { runs: PublicRefresh[]; series: ProvenanceSeries[] };

/** Only explicit matching approvals are public. No approval prose, paths, hashes or raw extracts leave the server. */
export function approvedRefreshHistory(ledger: string, approvals: Approval[]): PublicRefresh[] {
  const output: PublicRefresh[]=[];
  const approved=(runId:string,unit:string,plan:string)=>approvals.some(a=>a.status==="owner_approved"&&a.run_id===runId&&a.unit===unit&&a.ledger_plan_sha256===plan);
  // Owner-approved, append-only corrections of earlier entries (the corrected entry itself is never rewritten).
  const corrections:LedgerCorrection[]=[];
  for(const line of ledger.split("\n").filter(l=>l.trim())){let c:LedgerCorrection;try{c=JSON.parse(line);}catch{continue;}if(c.mode==="ledger-correction"&&c.corrects&&Array.isArray(c.corrections)&&approved(c.run_id,"ledger-correction",c.plan_sha256))corrections.push(c);}
  for(const line of ledger.split("\n").filter(l=>l.trim())){
    let r:LedgerEntry;try{r=JSON.parse(line);}catch{continue;}
    if(!r.run_id||!r.applied_at||!r.plan_sha256||!Array.isArray(r.units))continue;
    const correction=corrections.find(c=>c.corrects.run_id===r.run_id&&c.corrects.plan_sha256===r.plan_sha256);
    const window=correction?.corrections.find(c=>c.field==="applied_at"&&c.recorded===r.applied_at)?.corrected_window;
    for(const u of r.units){
      if(!approved(r.run_id,u.unit,r.plan_sha256))continue;
      const detail=correction?.per_series_detail?.unit===u.unit?correction.per_series_detail.new_periods:null;
      const stores=u.stores??[],count=(k:"new_observations"|"revisions")=>stores.length&&stores.every(s=>Number.isInteger(s[k])&&s[k]!>=0)?stores.reduce((n,s)=>n+s[k]!,0):null;
      const ids=[...new Set([...(u.new_periods??[]).map(s=>s.series),...(u.revisions??[]).map(s=>s.series)])];
      const recorded=Array.isArray(u.new_periods)||Array.isArray(u.revisions);
      const corrected:RefreshChange[]=(detail??[]).map(d=>({series:d.series,dataset:d.dataset,added:[],addedRanges:periodRanges(d.periods),revisions:[]}));
      output.push({id:r.run_id,applied:window?`${window.not_before}/${window.not_after}`:r.applied_at,...(window&&correction?{appliedCorrection:{recorded:r.applied_at,notBefore:window.not_before,notAfter:window.not_after,correction:correction.run_id}}:{}),seriesCount:detail?detail.length:recorded?ids.length:null,source:u.source_family,unit:u.unit,frequencies:[...new Set(stores.map(s=>s.kind==="hf"||s.kind==="monthly_history"?"monthly":s.path.includes("monthly")?"monthly / quarterly":s.path.includes("annual")?"annual":s.path.includes("regional")?"regional annual":"not recorded"))],added:count("new_observations"),revised:count("revisions"),changes:ids.map(series=>({series,added:u.new_periods?.find(s=>s.series===series)?.periods??[],revisions:(u.revisions?.find(s=>s.series===series)?.revisions??[]).filter(v=>(v.previous===null||Number.isFinite(v.previous))&&(v.revised===null||Number.isFinite(v.revised))).map(v=>({period:v.period,previous:v.previous,revised:v.revised}))})).concat(corrected)});
    }
  }
  return output.sort((a,b)=>b.applied.localeCompare(a.applied));
}
export function seriesRefreshChanges(runs:PublicRefresh[],country:string,indicator:string,dataset:string){
  const key=dataset.startsWith("serbia_sors")?`serbia:${indicator}:RS`:`${country}:${indicator}`;
  // Ledger-correction detail carries its dataset, so a series key never matches another layer.
  const recovery=["annual_history","monthly_history","serbia_sors_annual","serbia_sors_monthly"].includes(dataset);
  return runs.filter(r=>dataset==="high_frequency"?r.unit==="eurostat-high-frequency":dataset==="monthly_history"?r.unit==="monthly-history"||r.unit==="historical-recovery":dataset.startsWith("serbia_sors")?r.unit==="serbia-sors"||r.unit==="historical-recovery":dataset==="annual_history"?r.unit==="historical-recovery":false)
    .flatMap(run=>run.changes.filter(c=>c.series===key&&(c.dataset===undefined?run.unit!=="historical-recovery":recovery&&c.dataset===dataset)).map(change=>({run,change})));
}
export function observationRefresh(runs:PublicRefresh[],country:string,indicator:string,dataset:string,period:string){
  return seriesRefreshChanges(runs,country,indicator,dataset).flatMap<{run:string;applied:string;kind:"added"|"revised";revision:Revision|undefined}>(({run,change})=>{
    const revision=change.revisions.find(r=>r.period===period);
    return revision?[{run:run.id,applied:run.applied,kind:"revised" as const,revision}]:change.added.includes(period)||change.addedRanges?.some(([a,b])=>period.length===a.length&&period>=a&&period<=b)?[{run:run.id,applied:run.applied,kind:"added" as const,revision:undefined}]:[];
  });
}
