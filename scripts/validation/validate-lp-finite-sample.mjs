import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { olsHc1, symmetricEigen, normalGenerator, quantile } from "../../src/lib/localProjectionEngine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/local-projections");
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
const write = (name, data) => fs.writeFileSync(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
let tests = 0; let maximumDifference = 0;
const failures = [];
const check = (pass, message) => { tests++; if (!pass) failures.push(message); };
const close = (actual, expected, label) => { const difference = Math.abs(actual - expected); maximumDifference = Math.max(maximumDifference, difference); check(Number.isFinite(difference) && difference <= 1e-7 + 1e-8 * Math.abs(expected), `${label}: numerical mismatch`); };
const audit = read("lp_full_path_covariance_audit.json");
const results = read("lp_results.json").records;
const months = read("lp_leave_one_shock_month_results.json");
const events = read("lp_leave_one_event_results.json");
const support = read("lp_shock_support_status.json");
const thresholds = read("lp_influence_threshold_registry.json");
const reference = read("lp_finite_sample_bias_reference_manifest.json");
const applicability = read("lp_bias_correction_applicability_registry.json");
const frozenEvents = JSON.parse(fs.readFileSync(path.join(root, "src/data/identified-shocks/jk_event_level_shocks.json"))).records;
const eventMap = new Map(frozenEvents.map(e => [e.event_id, e]));
const shifted = (period, n) => { const [y,m] = period.split("-").map(Number); const date = new Date(Date.UTC(y,m-1+n)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`; };
check(reference.sha256 === "25193d48bda56dfe6f759ed3ea70b08f1f6f1cea1f082911fa793edaeb1315d8" && reference.file_count === 25 && reference.replication_code_file_count === 0, "Fed reference inventory/checksum");
check(applicability.production_status === "registry_only" && !applicability.bias_correction_ready, "unvalidated correction activated");
check(applicability.records.some(r => r.feature_id === "joint_shocks" && r.partially_compatible), "joint shock applicability missing");
for (const registry of [audit, months, events, support, thresholds]) check(registry.record_count === 44, "44-model diagnostic coverage");
check(support.classification_policy === "numeric_only_no_supported_categorical_cutoffs", "arbitrary support labels");
check(!months.automatic_deletion && !events.automatic_deletion && !thresholds.automatic_deletion, "automatic deletion forbidden");
check(support.aggregation_maximum_error <= support.aggregation_tolerance, "frozen monthly aggregation mismatch");

function fitPaths(x,y) { return y[0].map((_,h) => olsHc1(y.map(row=>row[h]),x)); }
function checkDeletion(x,y,expected,label) {
  const fits = fitPaths(x,y);
  fits.forEach((fit,h)=>{ close(fit.beta[0]*.25,expected.response_path.mp[h],`${label} MP h${h}`); close(fit.beta[1]*.25,expected.response_path.cbi[h],`${label} CBI h${h}`); });
}
const pathDiagnostics = [];
for (const model of results) {
  const fixture = audit.records.find(r=>r.model_id===model.model_id);
  const x=fixture.independent_design_x,y=fixture.independent_responses_y,periods=fixture.periods;
  const fits=fitPaths(x,y),n=x.length,k=x[0].length;
  fits.forEach((fit,h)=>{ close(fit.beta[0],model.horizons[h].beta_mp_raw,"baseline MP"); close(fit.beta[1],model.horizons[h].beta_cbi_raw,"baseline CBI"); });
  const componentDiagnostics=[];
  for (let c=0;c<2;c++) {
    const weights=x.map(row=>row.reduce((s,v,j)=>s+v*fits[0].xtxInverse[c][j],0));
    const covariance=fits.map(a=>fits.map(b=>weights.reduce((s,w,i)=>s+w*w*a.residuals[i]*b.residuals[i],0)*n/(n-k)));
    covariance.forEach((row,h)=>row.forEach((v,j)=>close(v,fixture.components[c].covariance[h][j],"joint cross-language covariance")));
    const se=covariance.map((row,i)=>Math.sqrt(Math.max(0,row[i])));
    const correlation=covariance.map((row,i)=>row.map((v,j)=>v/(se[i]*se[j])));
    const eig=symmetricEigen(correlation),minimum=Math.min(...eig.values);
    check(minimum >= -1e-8,"materially negative eigenvalue");
    const simulate=(seed)=>{const normal=normalGenerator(seed),maxima=[];for(let draw=0;draw<5000;draw++){const z=eig.values.map(()=>normal());maxima.push(Math.max(...eig.vectors.map(row=>Math.abs(row.reduce((s,v,j)=>s+v*Math.sqrt(Math.max(0,eig.values[j]))*z[j],0)))));}return quantile(maxima,.95);};
    const label=c===0?"mp":"cbi",seed=model.simultaneous_inference[`${label}_seed`];
    const critical=simulate(seed);
    check(critical===simulate(seed),"same-seed JS reproducibility");
    check(Math.abs(critical-model.simultaneous_inference[`${label}_critical_value_95`])<=.12,"reconstructed production critical difference");
    check(fixture.components[c].independent_seed_critical_values.length===5,"five independent reference seeds missing");
    check(fixture.components[c].not_narrower_than_pointwise,"simultaneous band narrower than pointwise");
    componentDiagnostics.push({component:label,raw_minimum_correlation_eigenvalue:minimum,clipped_eigenvalue_count:eig.values.filter(v=>v<0).length,clipping_magnitude:eig.values.reduce((s,v)=>s+Math.max(0,-v),0),same_seed_reproducible:true,reconstructed_critical_value:critical,independent_seed_standard_deviation:fixture.components[c].empirical_seed_standard_deviation});
  }
  pathDiagnostics.push({model_id:model.model_id,components:componentDiagnostics});
  const monthly=months.records.find(r=>r.model_id===model.model_id),event=events.records.find(r=>r.model_id===model.model_id);
  const supported=periods.filter((_,i)=>x[i][0]!==0||x[i][1]!==0);
  check(monthly.deletions.length===supported.length,"all nonzero shock months required");
  check(new Set(monthly.deletions.map(d=>d.dropped_period)).size===supported.length,"unique shock-month deletions");
  const eligiblePeriods=new Set(periods.flatMap(period=>Array.from({length:model.lp_lag_count+1},(_,lag)=>shifted(period,-lag))));
  const eligibleEvents=frozenEvents.filter(e=>eligiblePeriods.has(e.date.slice(0,7)));
  check(event.deletions.length===eligibleEvents.length&&new Set(event.deletions.map(d=>d.event_id)).size===eligibleEvents.length,"complete unique event deletions including lag support");
  monthly.deletions.forEach(d=>{const i=periods.indexOf(d.dropped_period);check(i>=0&&supported.includes(d.dropped_period),"zero or absent month deleted");close(d.mp_value,x[i][0],"dropped MP");close(d.cbi_value,x[i][1],"dropped CBI");check(d.effective_n===n-1,"month deletion N");});
  // Independent full-path numeric checks on first, last, and most influential
  // deletions for every model; all deletion identities/counts are checked above.
  for (const d of new Set([monthly.deletions[0],monthly.deletions.at(-1),monthly.deletions.find(r=>r.dropped_period===monthly.summary.mp.most_influential)])) {
    const drop=periods.indexOf(d.dropped_period);checkDeletion(x.filter((_,i)=>i!==drop),y.filter((_,i)=>i!==drop),d,"leave month");
  }
  event.deletions.forEach(d=>{const frozen=eventMap.get(d.event_id);check(Boolean(frozen)&&!d.rotation_reestimated&&d.effective_n===n,"event identity/rotation/N");close(d.frozen_mp_contribution,frozen.MP_median,"frozen event MP");close(d.frozen_cbi_contribution,frozen.CBI_median,"frozen event CBI");});
  for(const d of new Set([event.deletions[0],event.deletions.at(-1),event.deletions.find(r=>r.event_id===event.summary.mp.most_influential)])) {
    const adjusted=x.map(row=>[...row]);
    for(let i=0;i<n;i++)for(let lag=0;lag<=model.lp_lag_count;lag++)if(shifted(periods[i],-lag)===d.month){const col=lag===0?0:3+(lag-1)*3;adjusted[i][col]-=d.frozen_mp_contribution;adjusted[i][col+1]-=d.frozen_cbi_contribution;}
    checkDeletion(adjusted,y,d,"leave event");
  }
  const s=support.records.find(r=>r.model_id===model.model_id);
  for(let c=0;c<2;c++){const values=x.map(row=>row[c]),total=values.reduce((a,v)=>a+v*v,0),hhi=values.reduce((a,v)=>a+(v*v/total)**2,0),entry=s[c===0?"mp":"cbi"];close(entry.herfindahl,hhi,"HHI");close(entry.effective_shock_support_count,1/hhi,"effective support");check(entry.zero_count+entry.nonzero_count===n,"support counts");}
  const t=thresholds.records.find(r=>r.model_id===model.model_id);close(t.dfbetas_small_sample_threshold,2/Math.sqrt(n),"DFBETAS threshold");close(t.leverage_2k_over_n,2*k/n,"leverage threshold");
}
const mc=read("lp_finite_sample_simulation_results.json"),grid=read("lp_finite_sample_simulation_registry.json");
for(const registry of [months, events, grid]) for(const [file, expected] of Object.entries(registry.input_sha256 ?? {})) check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex")===expected,`stale offline input: ${file}`);
check(Boolean(months.input_sha256)&&Boolean(grid.input_sha256),"offline input provenance missing");
check(mc.configuration_sha256===grid.configuration_sha256,"simulation config hash");
check(mc.design_count===386&&mc.key_design_count===8,"simulation grid coverage");
for(const design of mc.records){check(design.completed_replications===design.replications,"simulation incomplete");check(design.tier!=="key"||design.completed_replications>=10000,"key design under 10000 reps");for(const component of Object.values(design.components)){check(component.bias_by_horizon.length===design.h+1,"MC horizon coverage");check(component.sup_t_path_coverage95>=0&&component.sup_t_path_coverage95<=1,"MC coverage bounds");}}
const summary={schema_version:"lp-finite-sample-validation-v1.72",generated_at:"2026-09-04",status:failures.length?"failed":"passed",total_tests:tests,failure_count:failures.length,maximum_cross_language_difference:maximumDifference,all_model_covariance_count:pathDiagnostics.length,loo_cross_language_policy:"first,last,largest MP deletion per type and model; all identities/counts checked",failures};
write("lp_finite_sample_validation.json",summary);
write("lp_full_path_covariance_validation.json",{...summary,schema_version:"lp-full-path-covariance-validation-v1.72",material_negative_correlation_eigenvalue_tolerance:1e-8,records:pathDiagnostics});
if(failures.length){console.error(summary);process.exit(1);}console.log(`Finite-sample validation passed: ${tests} tests; 44 covariances; max diff=${maximumDifference}`);
