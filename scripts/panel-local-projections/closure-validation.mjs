import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const digest = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
  const file=path.join(directory,entry.name);return entry.isDirectory()?walk(file):[file];
}) : [];

export function validatePanelClosure({root,preExport=false}) {
  const failures=[];const check=(condition,message)=>{if(!condition)failures.push(message);};
  const panel=path.join(root,"src/data/panel-local-projections");
  const reg=readJson(path.join(panel,"panel_lp_path_inference_registry.json"));
  const conclusion=readJson(path.join(panel,"panel_lp_joint_inference_research_conclusion.json"));
  const model=readJson(path.join(panel,"panel_lp_model_comparison.json"));
  const formal=readJson(path.join(panel,"panel_lp_results.json"));
  const release=readJson(path.join(root,"src/data/release.json"));
  const skill=readJson(path.join(root,"src/data/analysis/analysis_skill_registry.json"));
  const lpSkill=skill.records.find(item=>item.skill_id==="panel_local_projections");
  check(reg.schema_version==="panel-lp-path-inference-registry-v1.82","path registry schema must be v1.82");
  check(reg.state==="blocked","whole-path inference must remain blocked");
  check(reg.research_closed===true&&reg.decision==="closed_current_research_program","whole-path research must be closed");
  check(reg.reason==="coverage_validation_failed_current_research_program","closure reason enum mismatch");
  check(reg.activated_paths===0,"no whole-path inference path may be activated by this closure");
  check(reg.public_joint_bands===false&&reg.public_global_path_test===false,"public whole-path inference flags must remain false");
  check(reg.r2_verdict==="NOT CONFIRMED","R2 verdict mismatch");
  check(conclusion.schema_version==="panel-lp-joint-inference-research-conclusion-v1.82","research conclusion schema mismatch");
  check(conclusion.artifact_role==="research_conclusion_summary_not_inference_output","conclusion artifact role mismatch");
  check(conclusion.research_discipline?.post_hoc_changes_labelled===true&&conclusion.research_discipline?.failed_designs_retained===true,"research discipline declaration missing");
  check(conclusion.research_discipline?.outcomes_or_countries_removed_to_obtain_passage===false&&conclusion.research_discipline?.solver_convergence_separated_from_coverage===true&&conclusion.research_discipline?.model_applicability_separated_from_coverage===true,"research discipline boundary mismatch");
  check(conclusion.final_verdict==="NOT CONFIRMED"&&conclusion.public_release_decision?.simultaneous_whole_path_inference==="blocked"&&conclusion.public_release_decision?.global_whole_path_significance_test==="blocked","research verdict or release boundary mismatch");
  check(conclusion.public_release_decision?.panel_estimation==="active"&&conclusion.public_release_decision?.pointwise_inference==="active","Panel LP estimation and pointwise inference must remain active");
  check(conclusion.public_release_decision?.composition_robustness==="active"&&conclusion.public_release_decision?.time_fe_sensitivity==="active"&&conclusion.public_release_decision?.descriptive_fitted_model_comparison==="active_without_inference","validated non-joint capabilities must remain active");
  check(conclusion.public_release_decision?.simultaneous_whole_path_inference==="blocked"&&conclusion.public_release_decision?.global_whole_path_significance_test==="blocked","only whole-path inference activation is blocked");
  check(conclusion.r2_outcome_summary?.verdict==="NOT CONFIRMED"&&conclusion.r2_outcome_summary?.activated_paths===0&&conclusion.r2_outcome_summary?.outcomes?.length===4,"R2 outcome summary is incomplete");
  check(conclusion.r2_outcome_summary?.outcomes?.find(x=>x.outcome==="HICP")?.outer_panels_completed===150&&conclusion.r2_outcome_summary?.outcomes?.find(x=>x.outcome==="Unemployment")?.unavailable===13,"R2 HICP/unemployment accounting mismatch");
  check(conclusion.r2_outcome_summary?.outcomes?.find(x=>x.outcome==="Industrial Production")?.eligible_path_coverage_range?.[0]===0.916&&conclusion.r2_outcome_summary?.outcomes?.find(x=>x.outcome==="Long-Term Yield")?.eligible_path_coverage_range?.[1]===0.948,"R2 eligible coverage summary mismatch");
  check(String(conclusion.r2_outcome_summary?.cn_lookup_review).includes("does not change any activation decision"),"post-hoc c(n) review boundary missing");
  check(conclusion.coverage_target===0.95&&conclusion.coverage_result<conclusion.coverage_target,"best joint coverage must be below nominal");
  check(conclusion.coverage_interval?.level===0.9&&conclusion.coverage_interval?.upper<conclusion.coverage_target,"coverage interval must remain below nominal");
  check(model.status==="descriptive_model_comparison_no_inference","model comparison must remain descriptive");
  const jointEvidence=model.joint_inference?.evidence;
  check(jointEvidence?.r2_verdict==="NOT CONFIRMED; no path activated"&&jointEvidence?.best_bootstrap_joint_coverage===conclusion.coverage_result,"public model comparison and conclusion disagree");
  check(formal.publication_state==="active","frozen pointwise Panel LP must remain active");
  check(lpSkill?.state==="active","analysis registry must keep Panel LP active");
  check(!lpSkill?.presentation?.output_schema?.some(key=>/simultaneous.*band|global.*path.*p.?value/i.test(key)),"Panel LP registry must not expose joint-inference outputs");
  check(skill.schema_version==="analysis-skill-registry-v1.88","analysis registry schema must be v1.88");
  check(lpSkill?.presentation?.limitations?.some(text=>text.includes("跨预测期联合推断已经研究")&&text.includes("不提供联合置信带")),"analysis registry must state the tested-but-unavailable boundary");
  check(lpSkill?.presentation?.limitations?.some(text=>text.includes("registry_only")),"IK/country-pair registry-only boundary must be retained");
  check(release.version.startsWith("v1.88 ")&&release.schema_version==="release-metadata-v1.88","release metadata must identify v1.88");
  check(release.citation_key==="central_europe_political_atlas_v1_88","v1.88 citation key mismatch");
  const baselineManifest=readJson(path.join(panel,"panel_lp_baseline_invariance_manifest.json"));
  check(digest(path.join(panel,"panel_lp_results.json"))==="10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc","frozen Panel LP results hash changed");
  check(baselineManifest.formal_baseline_sha256==="fc49e0d559266aea6600bceed2009d4246d4bc426da4f081cc4f08e4c5ef26d0","v1.8 baseline anchor changed");
  for(const [name,expected] of Object.entries(conclusion.v1_81_output_sha256??{})) check(digest(path.join(panel,name))===expected,`frozen v1.81 output changed: ${name}`);
  check(conclusion.provenance?.length>=7&&conclusion.provenance.every(item=>/^[a-f0-9]{64}$/.test(item.sha256)&&!String(item.archive_location).includes("/Users/")),"research provenance must use hashes without personal paths");
  check(!JSON.stringify(conclusion).match(/(?:\/Users\/|\/home\/|[A-Z]:\\\\Users\\)/),"public conclusion contains a personal local path");

  const workbench=fs.readFileSync(path.join(root,"src/components/PanelLocalProjectionWorkbench.tsx"),"utf8");
  check(workbench.includes("useState(false)")&&workbench.includes("叠加拟合模型路径（描述性）"),"descriptive model overlay must remain opt-in");
  check(workbench.includes("不能合起来当作整条反应路径")&&workbench.includes("不提供联合置信带")&&workbench.includes("不提供整条路径的显著性检验"),"workbench joint-inference boundary text missing");
  check(!/simultaneous|bootstrap|global_path_p_value/i.test(workbench.match(/from ["'][^"']+\.json["']/g)?.join("\n")??""),"workbench must not import inference-band outputs");
  const methodology=fs.readFileSync(path.join(root,"src/app/methodology/page.tsx"),"utf8");
  for(const phrase of ["Panel LP Whole-Path Inference Research Outcome","不能合起来当整条路径置信带","跨预测期联合推断已经研究","未达到 95% 联合覆盖门槛","2.51–2.92","3.71–5.18","90.0%","88.6–91.4%","NOT CONFIRMED"])
    check(methodology.includes(phrase),`methodology boundary missing: ${phrase}`);

  const forbiddenName=/(?:simultaneous.*band|band.*simultaneous|bootstrap.*(?:band|path)|(?:path|global).*p.?value|r2.*real.?data.*band)/i;
  for(const directory of [path.join(root,"src/data/panel-local-projections"),path.join(root,"public/research-data/panel-local-projections")]) {
    for(const file of walk(directory)) {
      const name=path.basename(file);
      if(forbiddenName.test(name)) failures.push(`research-only inference output is present: ${path.relative(root,file)}`);
      if(!file.endsWith(".json")) continue;
      let data;try{data=readJson(file);}catch{failures.push(`invalid JSON in publication directory: ${path.relative(root,file)}`);continue;}
      const inspect=(value,trail=path.relative(root,file))=>{
        if(Array.isArray(value)){value.forEach((item,index)=>inspect(item,`${trail}[${index}]`));return;}
        if(!value||typeof value!=="object")return;
        for(const [key,item] of Object.entries(value)) {
          if(["simultaneous_confidence_band","bootstrap_simultaneous_band","global_path_p_value","global_path_test_result"].includes(key)&&item!==false&&item!==null)
            failures.push(`public inferential output key is forbidden: ${trail}.${key}`);
          inspect(item,`${trail}.${key}`);
        }
      };inspect(data);
    }
  }
  if(!preExport) {
    const pub=path.join(root,"public/research-data/panel-local-projections");
    for(const name of ["panel_lp_path_inference_registry.json","panel_lp_joint_inference_research_conclusion.json","panel_lp_model_comparison.json","panel_lp_results.json"])
      check(fs.existsSync(path.join(pub,name))&&digest(path.join(pub,name))===digest(path.join(panel,name)),`public export mismatch: ${name}`);
  }
  return failures;
}
