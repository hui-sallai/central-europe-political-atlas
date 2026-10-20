import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { annualPendingEvidence,type AnnualCheckReport,type PendingObservation } from "./annualPendingEvidence";
import { approvedRefreshHistory,type RefreshManifest,type ProvenanceSeries } from "./refreshProvenance";

type AuditRow={dataset:string;country:string;indicator:string;frequency:string;unit:string;source:ProvenanceSeries["source"];status_counts:Record<string,number>;definition:{versions:string[]};model_usage:{formal_model_samples:ProvenanceSeries["samples"]}};
type SorsSource={series:string;source_dataset:string;mapping_status:string;cross_country_comparable:boolean};
type SorsRecord={series:string;normalized_unit:string;transformation?:{method:string}};
/** Build-time projection only; never imports the full audit/ledger into a client bundle or writes research stores. */
export function getRefreshManifest():RefreshManifest{
  const read=<T,>(p:string):T=>JSON.parse(fs.readFileSync(path.join(process.cwd(),p),"utf8"));
  const ledger=fs.readFileSync(path.join(process.cwd(),"src/data/data-refresh/refresh_ledger.jsonl"),"utf8");
  const approvals=read<{refreshes:Parameters<typeof approvedRefreshHistory>[1]}>("docs/legal-security/data_refresh_amendments.json");
  const audit=read<{records:AuditRow[]}>("src/data/data-coverage/descriptive_data_coverage_audit.json");
  const annualCheck=read<AnnualCheckReport>("docs/data-refresh/canonical_source_check.json");
  const annualBytes=fs.readFileSync(path.join(process.cwd(),"src/data/observations/observations.json"));
  const annualRows=(JSON.parse(annualBytes.toString()) as {records:PendingObservation[]}).records;
  const observationsMatch=createHash("sha256").update(annualBytes).digest("hex")===annualCheck.checked_file_sha256;
  const allowed=new Set(["annual_observations","annual_history","high_frequency","monthly_history","serbia_sors_annual","serbia_sors_monthly"]);
  const sors=["annual","monthly"].map(store=>read<{series_sources:SorsSource[];records:SorsRecord[]}>(`src/data/serbia/serbia_descriptive_history_${store}.json`));
  const hf=read<{records:{country:string;indicator:string;period:string;updated_at?:string;vintage_status?:string;definition_version:string}[]}>("src/data/high-frequency/high_frequency_observations.json");
  const versions:Record<string,string|null>={};
  for(const [dataset,file] of Object.entries({annual_observations:"observations/observations.json",annual_history:"historical/annual_descriptive_history.json",monthly_history:"historical/monthly_descriptive_history.json",high_frequency:"high-frequency/high_frequency_observations.json",serbia_sors_annual:"serbia/serbia_descriptive_history_annual.json",serbia_sors_monthly:"serbia/serbia_descriptive_history_monthly.json"})){const doc=read<{schema_version?:string}>(`src/data/${file}`);versions[dataset]=doc.schema_version??null;}
  const series=audit.records.filter(r=>allowed.has(r.dataset)).map((r):ProvenanceSeries=>{
    const src=sors[r.dataset==="serbia_sors_annual"?0:1]?.series_sources.find(s=>r.dataset.startsWith("serbia_sors")&&s.series===r.indicator);
    let checked:string|null=null,sourceUpdated:string|null=null;
    if(src&&/^[A-Za-z0-9]+$/.test(src.source_dataset)){
      const p=`src/data/serbia/raw/${src.source_dataset}.extract.json`;
      if(fs.existsSync(p)){const meta=read<{retrieved_at?:string;dataset_updated_at?:string}>(p);checked=meta.retrieved_at??null;sourceUpdated=meta.dataset_updated_at??null;}
    }
    const methods=src?[...new Set(sors.flatMap(s=>s.records.filter(v=>v.series===src.series).flatMap(v=>v.transformation?.method?[v.transformation.method]:[])))]:[];
    const normalized=src?sors.flatMap(s=>s.records.filter(v=>v.series===src.series).map(v=>v.normalized_unit)):[];
    const vintage=r.dataset==="high_frequency"?[...new Set(hf.records.filter(v=>v.country===r.country&&v.indicator===r.indicator).flatMap(v=>v.vintage_status?[v.vintage_status]:[]))]:[];
    const dates=new Map<string,string[]>();
    const pending=r.dataset==="annual_observations"?annualRows.filter(v=>v.country_slug===r.country&&v.indicator===r.indicator).flatMap(v=>{const evidence=annualPendingEvidence(v,annualCheck,observationsMatch);return evidence?[evidence]:[];}):[];
    if(r.dataset==="high_frequency")for(const v of hf.records.filter(v=>v.country===r.country&&v.indicator===r.indicator&&v.updated_at)){if(!dates.has(v.updated_at!))dates.set(v.updated_at!,[]);dates.get(v.updated_at!)!.push(v.period);}
    return {dataset:r.dataset,pending,version:versions[r.dataset],recordDates:[...dates].map(([date,periods])=>({date,periods})),country:r.country,indicator:r.indicator,frequency:r.frequency,unit:r.unit,revisionUnit:src?new Set(normalized).size===1?normalized[0]:null:r.unit,source:{name:r.source.name,dataset:r.source.dataset?.startsWith("src/")?r.source.name:r.source.dataset??r.source.name,url:r.source.url},definitions:r.definition.versions,statuses:r.status_counts,samples:r.model_usage.formal_model_samples.map(s=>({model_family:s.model_family,sample_start:s.sample_start??null,sample_end:s.sample_end??null,status:s.status??null})),checked,sourceUpdated,vintage,methods,...(src?{crossCountry:src.cross_country_comparable,mapping:src.mapping_status}:{})};
  });
  return {runs:approvedRefreshHistory(ledger,approvals.refreshes),series};
}
