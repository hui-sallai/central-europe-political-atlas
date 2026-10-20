export type Revision = { period: string; previous: number | null; revised: number | null };
export type RefreshChange = { series: string; added: string[]; revisions: Revision[] };
export type PublicRefresh = { id: string; applied: string; source: string; unit: string; frequencies: string[]; added: number | null; revised: number | null; changes: RefreshChange[] };
type LedgerUnit = { unit: string; source_family: string; stores?: { kind: string; path: string; new_observations?: number; revisions?: number }[]; new_periods?: { series: string; periods: string[] }[]; revisions?: { series: string; revisions: Revision[] }[] };
type LedgerEntry = { run_id: string; applied_at: string; plan_sha256: string; units: LedgerUnit[] };
type Approval = { run_id: string; status: string; unit: string; ledger_plan_sha256: string };
export type ProvenanceSeries = { dataset: string; version: string | null; recordDates: { date: string; periods: string[] }[]; country: string; indicator: string; frequency: string; unit: string; revisionUnit: string | null; source: { name: string; dataset: string; url: string }; definitions: string[]; statuses: Record<string,number>; samples: { model_family: string; sample_start: string | null; sample_end: string | null; status: string | null }[]; checked: string | null; sourceUpdated: string | null; vintage: string[]; methods: string[]; crossCountry?: boolean; mapping?: string };
export type RefreshManifest = { runs: PublicRefresh[]; series: ProvenanceSeries[] };

/** Only explicit matching approvals are public. No approval prose, paths, hashes or raw extracts leave the server. */
export function approvedRefreshHistory(ledger: string, approvals: Approval[]): PublicRefresh[] {
  const output: PublicRefresh[]=[];
  for(const line of ledger.split("\n").filter(l=>l.trim())){
    let r:LedgerEntry;try{r=JSON.parse(line);}catch{continue;}
    if(!r.run_id||!r.applied_at||!r.plan_sha256||!Array.isArray(r.units))continue;
    for(const u of r.units){
      if(!approvals.some(a=>a.status==="owner_approved"&&a.run_id===r.run_id&&a.unit===u.unit&&a.ledger_plan_sha256===r.plan_sha256))continue;
      const stores=u.stores??[],count=(k:"new_observations"|"revisions")=>stores.length&&stores.every(s=>Number.isInteger(s[k])&&s[k]!>=0)?stores.reduce((n,s)=>n+s[k]!,0):null;
      const ids=[...new Set([...(u.new_periods??[]).map(s=>s.series),...(u.revisions??[]).map(s=>s.series)])];
      output.push({id:r.run_id,applied:r.applied_at,source:u.source_family,unit:u.unit,frequencies:[...new Set(stores.map(s=>s.kind==="hf"||s.kind==="monthly_history"?"monthly":s.path.includes("monthly")?"monthly / quarterly":s.path.includes("annual")?"annual":s.path.includes("regional")?"regional annual":"not recorded"))],added:count("new_observations"),revised:count("revisions"),changes:ids.map(series=>({series,added:u.new_periods?.find(s=>s.series===series)?.periods??[],revisions:(u.revisions?.find(s=>s.series===series)?.revisions??[]).filter(v=>(v.previous===null||Number.isFinite(v.previous))&&(v.revised===null||Number.isFinite(v.revised))).map(v=>({period:v.period,previous:v.previous,revised:v.revised}))}))});
    }
  }
  return output.sort((a,b)=>b.applied.localeCompare(a.applied));
}
export function seriesRefreshChanges(runs:PublicRefresh[],country:string,indicator:string,dataset:string){
  const key=dataset.startsWith("serbia_sors")?`serbia:${indicator}:RS`:`${country}:${indicator}`;
  return runs.filter(r=>dataset==="high_frequency"?r.unit==="eurostat-high-frequency":dataset==="monthly_history"?r.unit==="monthly-history":dataset.startsWith("serbia_sors")?r.unit==="serbia-sors":false).flatMap(run=>run.changes.filter(c=>c.series===key).map(change=>({run,change})));
}
export function observationRefresh(runs:PublicRefresh[],country:string,indicator:string,dataset:string,period:string){
  return seriesRefreshChanges(runs,country,indicator,dataset).flatMap<{run:string;applied:string;kind:"added"|"revised";revision:Revision|undefined}>(({run,change})=>{
    const revision=change.revisions.find(r=>r.period===period);
    return revision?[{run:run.id,applied:run.applied,kind:"revised" as const,revision}]:change.added.includes(period)?[{run:run.id,applied:run.applied,kind:"added" as const,revision:undefined}]:[];
  });
}
