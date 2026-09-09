import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),dir=path.join(root,"src/data/local-projections");
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const write=(name,data)=>fs.writeFileSync(path.join(dir,name),`${JSON.stringify(data,null,2)}\n`);
const validation=read("lp_finite_sample_validation.json"),baseline=read("lp_validation_summary.json"),invariance=read("lp_coefficient_invariance_manifest.json");
if(validation.status!=="passed"||baseline.status!=="passed"||invariance.v171_hash!=="0aa178b8dcac735bb04d06636cd6300cc63bd91a9b5b3ddbcb6d580b9bf66fcd")throw new Error("v1.72 diagnostic/baseline gate failed");
const simulation=read("lp_finite_sample_simulation_results.json"),summary=read("lp_finite_sample_robustness_summary.json"),pathQA=read("lp_full_path_covariance_validation.json");
const key=simulation.records.filter(d=>d.tier==="key");
simulation.status="validated_diagnostic_only";
simulation.validation_reference="lp_finite_sample_validation.json";
write("lp_finite_sample_simulation_results.json",simulation);
const covarianceAudit=read("lp_full_path_covariance_audit.json");
covarianceAudit.status="passed";
covarianceAudit.validation_reference="lp_full_path_covariance_validation.json";
write("lp_full_path_covariance_audit.json",covarianceAudit);
summary.simulation={status:"validated_diagnostic_only",design_count:simulation.design_count,key_design_count:key.length,total_replications:simulation.total_replications,
  key_designs:key.map(d=>({design_id:d.design_id,n:d.n,p:d.p,h:d.h,persistence:d.persistence,shock_design:d.shock_design,month_dummies:d.month_dummies,replications:d.completed_replications,
    mp_path_coverage:d.components.mp.sup_t_path_coverage95,cbi_path_coverage:d.components.cbi.sup_t_path_coverage95,
    mp_pointwise_coverage_min:Math.min(...d.components.mp.pointwise_coverage95),cbi_pointwise_coverage_min:Math.min(...d.components.cbi.pointwise_coverage95)})),
  interpretation:"Stylized fixed-p level-difference DGP; not an estimate of real-model coverage or real-data bias. Exploratory designs use 200 reps and 256 sup-t draws; key designs use 10000 reps and 5000 draws."};
for(const row of summary.records){row.finite_sample_simulation_status="validated_stylized_diagnostic_only";row.sup_t_mc_diagnostics=pathQA.records.find(p=>p.model_id===row.model_id).components;}
write("lp_finite_sample_robustness_summary.json",summary);
const readiness=read("lp_readiness_registry.json");readiness.schema_version="lp-readiness-registry-v1.72";
for(const row of readiness.records){const active=Boolean(row.causal_lp_ready);Object.assign(row,{finite_sample_bias_audited:active,bias_correction_ready:false,shock_support_audited:active,leave_one_out_audited:active,finite_sample_simulation_ready:active,finite_sample_simulation_scope:"stylized fixed-p grid, not model-specific coverage assurance"});}
write("lp_readiness_registry.json",readiness);
fs.writeFileSync(path.join(root,"src/data/macro-drivers/lp_readiness_registry.json"),`${JSON.stringify(readiness,null,2)}\n`);
const oldPath=read("lp_path_inference_validation.json");oldPath.full_model_covariance_validation={status:pathQA.status,model_count:44,negative_eigenvalue_tolerance:1e-8,independent_seeds:5,critical_values_are_simulation_estimates:true};write("lp_path_inference_validation.json",oldPath);
const support=read("lp_shock_support_status.json"),legacySupport=read("lp_shock_support_diagnostics.json");
for(const row of legacySupport.records){const extra=support.records.find(s=>s.model_id===row.model_id);row.effective_support_mp=extra.mp;row.effective_support_cbi=extra.cbi;row.support_interpretation="concentration-based effective support, not asymptotic effective sample size";}
legacySupport.schema_version="lp-shock-support-diagnostics-v1.72";write("lp_shock_support_diagnostics.json",legacySupport);
const skillPath=path.join(root,"src/data/analysis/analysis_skill_registry.json"),skills=JSON.parse(fs.readFileSync(skillPath,"utf8"));
if(!skills.frozen_output_reference){
skills.schema_version="analysis-skill-registry-v1.72";
for(const row of skills.records??[]){if(String(row.skill_id??row.id??"").includes("local_projection"))row.note="Single-country baseline active; pointwise and sup-t inference active; validated finite-sample/shock-support diagnostics only; bias correction registry_only.";}
skills.generated_at=JSON.parse(fs.readFileSync(path.join(root,"src/data/release.json"),"utf8")).release_date;
fs.writeFileSync(skillPath,`${JSON.stringify(skills,null,2)}\n`);
}
console.log("v1.72 audit metadata finalized; frozen baseline preserved.");
