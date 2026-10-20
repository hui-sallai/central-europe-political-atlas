export type PendingObservation={country_slug:string;country:string;indicator:string;year:number;status:string;source_query_url?:string;source_dataset?:string;numerator_source_url?:string;denominator_source_url?:string;calculation_formula?:string;comparability_status?:string;applicability_status?:string};
export type SourcePageCheck={dataset:string;checked:string;latest_year:number;scope:string;url:string};
type Provenance={endpoint:string;http_status:number|null;error?:string|null;retrieved_at:string|null;dataset_updated_at:string|null};
export type AnnualCheckReport={checked_file_sha256:string;dataset_page_checks?:SourcePageCheck[];series:{indicator:string;country:string;source_latest_period:string|null;provenance:Provenance[];pending:{year:number;reason:string}[]}[]};
export type AnnualPendingEvidence={period:string;reason:string;mappingVerified:boolean;dataset:string|null;countryChecked:string|null;countryLatest:string|null;sourceUpdated:string|null;queries:string[];page:SourcePageCheck|null;derived:boolean};
const targeted=new Set(["fdi_inflow","energy_import_dependency","automotive_export_share"]);
const geo:Record<string,string>={AUT:"AT",HRV:"HR",CZE:"CZ",DEU:"DE",HUN:"HU",POL:"PL",ROU:"RO",SRB:"RS",SVK:"SK",SVN:"SI"};
function query(raw:string|undefined){
  try{const u=new URL(raw??"");if(u.origin!=="https://ec.europa.eu"||!u.pathname.startsWith("/eurostat/api/dissemination/statistics/1.0/data/"))return null;for(const k of ["time","sinceTimePeriod","untilTimePeriod"])u.searchParams.delete(k);u.searchParams.sort();return u;}catch{return null;}
}
/** Validate registered dimensions and both components of the derived share; dataset names alone never suffice. */
export function annualPendingEvidence(row:PendingObservation,report:AnnualCheckReport,observationsMatch:boolean):AnnualPendingEvidence|null{
  if(!targeted.has(row.indicator)||row.status!=="pending")return null;
  const u=query(row.source_query_url),derived=row.indicator==="automotive_export_share";
  const definition=row.indicator==="fdi_inflow"?{code:"bop_fdi6_flow",dimensions:{freq:"A",currency:"MIO_EUR",nace_r2:"FDI",stk_flow:"LIAB",entity:"TOTAL",fdi_item:"DI__D__F",partner:"WRL_REST"}}:row.indicator==="energy_import_dependency"?{code:"nrg_ind_id",dimensions:{freq:"A",unit:"PC",siec:"TOTAL"}}:{code:"ext_tec09",dimensions:{freq:"A",unit:"THS_EUR",stk_flow:"EXP",partner:"WORLD",nace_r2:"C29"}};
  const dimensions=Object.entries(definition.dimensions).filter((e):e is [string,string]=>e[1]!==undefined);
  let matched=!!u&&u.pathname===`/eurostat/api/dissemination/statistics/1.0/data/${definition.code}`&&row.source_dataset===`Eurostat ${definition.code}`&&u.searchParams.get("geo")===geo[row.country]&&dimensions.every(([k,v])=>u.searchParams.get(k)===v)&&[...u.searchParams.keys()].every(k=>u.searchParams.getAll(k).length===1&&["lang","geo",...dimensions.map(([k])=>k)].includes(k));
  const numerator=query(row.numerator_source_url),denominator=query(row.denominator_source_url);
  const timeMatches=(raw:string|undefined)=>{try{const p=new URL(raw??"").searchParams;if(["time","sinceTimePeriod","untilTimePeriod"].some(k=>p.getAll(k).length>1)||p.has("time")&&(p.has("sinceTimePeriod")||p.has("untilTimePeriod")))return false;return p.has("time")?p.get("time")===String(row.year):p.get("sinceTimePeriod")===String(row.year)&&p.get("untilTimePeriod")===String(row.year);}catch{return false;}};
  matched=matched&&timeMatches(row.source_query_url);
  if(derived){const expected=u?new URL(u):null;expected?.searchParams.set("nace_r2","TOTAL");matched=matched&&row.calculation_formula==="NACE_C29_exports / total_NACE_exports * 100"&&numerator?.href===u?.href&&denominator?.href===expected?.href&&timeMatches(row.numerator_source_url)&&timeMatches(row.denominator_source_url);}
  const queries=matched&&u?[u.href,...(derived&&denominator?[denominator.href]:[])]:[];
  const entry=report.series.find(s=>s.country===row.country_slug&&s.indicator===row.indicator);
  const proofs=queries.map(url=>entry?.provenance.find(p=>query(p.endpoint)?.href===url&&p.http_status===200&&!p.error&&p.retrieved_at));
  const verified=matched&&observationsMatch&&queries.length>0&&proofs.every(Boolean),pending=verified?entry?.pending.find(p=>p.year===row.year):undefined;
  const restricted=row.applicability_status==="not_applicable"?"not_applicable_by_research_rule":row.comparability_status==="definition_mismatch"||row.comparability_status==="partial_comparability"?"comparability_unresolved":null;
  const reason=derived&&pending?.reason==="published_at_source_not_imported"?"incomplete_source_evidence":derived&&pending?.reason==="published_at_source_with_definition_flag"?"comparability_unresolved":pending?.reason;
  const page=matched?(report.dataset_page_checks??[]).filter(p=>p.dataset===definition.code&&p.scope==="dataset_overall"&&Number.isInteger(p.latest_year)&&/^\d{4}-\d{2}-\d{2}$/.test(p.checked)&&p.url.startsWith("https://ec.europa.eu/eurostat/")).sort((a,b)=>b.checked.localeCompare(a.checked))[0]??null:null;
  return {period:String(row.year),reason:restricted??reason??"incomplete_source_evidence",mappingVerified:matched,dataset:matched?definition.code:null,countryChecked:verified?proofs[0]!.retrieved_at:null,countryLatest:verified?entry?.source_latest_period??null:null,sourceUpdated:verified?proofs[0]!.dataset_updated_at:null,queries,page,derived};
}
