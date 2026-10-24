import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const r=require('../../src/lib/transparentModelResearch.ts'),engine=require('../../src/lib/modelFramework.ts'),scenario=require('../../src/lib/scenarioFramework.ts'),notebook=require('../../src/lib/researchNotebook.ts');
const countries=require('../../src/data/countries/countries.json').records;
const session=id=>r.restoreModelResearch(new URLSearchParams(),id);
test('all four IDs stay registered; three adapters reproduce every country-year exactly without changing model outputs',()=>{
 assert.deepEqual(engine.modelCards.map(c=>c.model_id),['household_economic_pressure','fiscal_pressure','external_vulnerability','industrial_dependency']);
 const frozen=JSON.stringify(engine.modelOutputs);
 for(const id of r.researchModelIds)for(const c of countries)for(const year of r.modelResearchYears(id)){
  const card=r.researchCard(id),out=r.modelResearchOutput(id,c.slug,year);assert.deepEqual(out,engine.calculateModelOutputForYear(c,card,year));
  assert.equal(out.formula_version,id+'_v1');assert.equal(out.weight_version,id+'_weights_v1');
  const trace=r.modelCalculationTrace(card,out);
  if(out.score!==null)assert.equal(Number((trace.roundedContributionSum/trace.availableWeight).toFixed(1)),out.score);
  for(const item of out.inputs){const obs=r.modelResearchObservation(id,c.slug,item.indicator_id,year);assert.equal(obs.id,item.observation_id);assert.equal(obs.value,item.raw_value);assert.equal(obs.unit,item.unit);assert.equal(obs.source_url,item.source_url);assert.ok(obs.updated_at);const d=card.inputs.find(d=>d.indicator_id===item.indicator_id);assert.equal(item.weighted_contribution,Number((engine.normalizeModelInput(obs.value,d)*d.weight).toFixed(1)));}
 }
 assert.equal(JSON.stringify(engine.modelOutputs),frozen);assert.equal(r.modelResearchOutput('fiscal_pressure','unknown',2024),null);
 assert.equal(r.modelResearchOutput('fiscal_pressure','poland',9999),null);
});
test('actual model results and histories use distinct actual input units, bounds and directions',()=>{
 for(const [id,year,score]of[['fiscal_pressure',2025,61.3],['external_vulnerability',2024,37.1],['industrial_dependency',2024,41.5]])assert.equal(r.modelResearchOutput(id,'poland',year).score,score);
 const fiscal=r.modelCalculationTrace(r.researchCard('fiscal_pressure'),r.modelResearchOutput('fiscal_pressure','poland',2025));assert.equal(fiscal.components[0].normalizedBeforeRounding,73);assert.equal(fiscal.components[0].input.weighted_contribution,36.5);assert.equal(fiscal.components[1].input.weighted_contribution,24.8);
 const industry=r.researchCard('industrial_dependency');assert.deepEqual(industry.inputs.map(i=>i.weight),[.25,.3,.3,.15]);assert.deepEqual(industry.inputs[3].normalization,{method:'linear_clamp',lower:.1,upper:.4});
 const out=r.modelResearchOutput('industrial_dependency','poland',2024);assert.equal(out.inputs[3].unit,'欧元/kWh');assert.equal(out.inputs[2].unit,'% exports');assert.equal(out.inputs[3].raw_value,.2573);
 assert.equal(r.modelResearchOutput('external_vulnerability','poland',2025).score,null);assert.equal(r.modelResearchOutput('industrial_dependency','germany',2024).score,null);assert.equal(r.modelResearchObservation('industrial_dependency','germany','germany_export_dependence',2024).applicability_status,'not_applicable');assert.equal(r.modelResearchOutput('fiscal_pressure','serbia',2025).score,null);
 assert.equal(r.modelResearchOutput('industrial_dependency','croatia',2024).score,null);assert.equal(r.modelResearchOutput('industrial_dependency','croatia',2024).data_completeness,70);
});
test('cross-country comparisons use one year, exact versions and matching active inputs; gaps never become latest-year substitutions',()=>{
 assert.equal(r.modelResearchComparable('fiscal_pressure','poland','czechia',2025),true);
 assert.equal(r.modelResearchComparable('external_vulnerability','poland','serbia',2024),false);
 assert.equal(r.modelResearchComparable('industrial_dependency','poland','germany',2024),false);
 assert.equal(r.modelResearchComparable('industrial_dependency','poland','croatia',2024),false);
 assert.equal(r.modelResearchComparable('industrial_dependency','poland','croatia',2023),true);
 assert.equal(r.modelResearchCommonYear({...session('industrial_dependency'),compare:['croatia']}),2023);
 assert.equal(r.modelResearchCommonYear({...session('industrial_dependency'),country:'germany',compare:['poland']}),null);
 assert.equal(r.modelResearchCommonYear({...session('fiscal_pressure'),compare:['serbia']}),null);
 assert.equal(r.modelResearchComparable('industrial_dependency','poland','hungary',2024),true);
 assert.equal(r.modelResearchComparable('fiscal_pressure','poland','unknown',2025),false);
});
test('supported scenarios and sensitivity reproduce the existing engine at selected years; baseline remains byte-identical',()=>{
 assert.deepEqual(r.modelResearchScenarios('external_vulnerability'),[]);assert.equal(r.modelResearchScenario(session('external_vulnerability')),null);
 for(const id of ['fiscal_pressure','industrial_dependency'])for(const d of r.modelResearchScenarios(id)){
  const s={...session(id),year:2024,scenario:d.scenario_id,shock:d.default_shock_value},base=r.modelResearchOutput(id,s.country,s.year),frozen=JSON.stringify(base);
  for(const point of r.modelResearchSensitivity(s)){
   const expected=scenario.calculateScenario({definition:d,countrySlug:s.country,shockValue:point.shock,cards:[r.researchCard(id)],outputs:[base]});assert.deepEqual(point.result,expected);assert.equal(point.result.baseline_score,base.score);assert.equal(point.result.score_change,Number((point.result.scenario_score-base.score).toFixed(1)));
   if(d.scenario_id==='eu_funds_delay')assert.equal(expected.adjusted_input.adjusted_value,Number((expected.adjusted_input.baseline_value-point.shock).toFixed(3)));
   if(d.scenario_id==='energy_price_shock')assert.equal(expected.adjusted_input.adjusted_value,Number((expected.adjusted_input.baseline_value*(1+point.shock/100)).toFixed(3)));
   if(d.scenario_id==='germany_demand_slowdown')assert.equal(expected.adjusted_input.adjusted_value,Number((expected.adjusted_input.baseline_value*(1+Math.abs(point.shock)/100)).toFixed(3)));
  }assert.equal(JSON.stringify(base),frozen);
 }
 assert.equal(r.modelResearchScenario({...session('industrial_dependency'),country:'germany'}).status,'unavailable');
});
test('invalid URL selections and stale versions fail safely; both language URLs preserve the research configuration',()=>{
 for(const id of r.researchModelIds)for(const q of ['country=unknown','model_year=','model_year=9999','model_from=2025&model_to=2021','model_compare=germany,germany','model_compare=poland','model_compare=unknown','model_version=old','formula_version=old','weight_version=old','model_scenario=inflation_resurgence','model_shock=NaN'])assert.ok(r.restoreModelResearch(new URLSearchParams(q),id).issues.length,`${id} ${q}`);
 assert.ok(r.restoreModelResearch(new URLSearchParams('model_scenario=energy_price_shock&model_shock=51'),'industrial_dependency').issues.length);
 for(const id of r.researchModelIds)for(const en of [true,false]){const s={...session(id),compare:['czechia','hungary']};assert.deepEqual(r.restoreModelResearch(new URL(r.modelResearchUrl(s,en)).searchParams,id),s);}
 assert.equal(r.modelResearchScenario({...session('fiscal_pressure'),issues:['scenario']}),null);
});
test('CSV/JSON retain recorded inputs and missing observations; Notebook reuses its unchanged schema with bilingual source-linked records',()=>{
 for(const id of r.researchModelIds){const s={...session(id),compare:['hungary']},data=r.modelResearchExport(s,'2026-10-25T00:00:00Z'),csv=r.modelResearchCsv(s);assert.ok(csv.includes('rounded_contribution'));assert.ok(csv.includes('source_url'));assert.equal(data.exported_at,'2026-10-25T00:00:00Z');assert.equal(data.model_card.formula_version,id+'_v1');assert.deepEqual(data.baseline,r.modelResearchOutput(id,s.country,s.year));assert.ok(data.observations.every(o=>o.source_url.startsWith('https://')&&o.id));
  for(const en of [true,false]){const draft=r.modelResearchEvidence(s,en),n=notebook.addNotebookEvidence(notebook.emptyNotebook(en?'en':'zh-CN','v2.0'),draft,'v2.0');assert.equal(notebook.validateNotebook(n),true);assert.equal(draft.value,undefined);assert.equal(draft.metadata.filters.baseline_score,data.baseline.score);assert.deepEqual(draft.metadata.filters.baseline_inputs.map(JSON.parse),data.baseline.inputs.map(i=>[i.observation_id,i.raw_value,i.unit,i.normalized_score,i.weight,i.weighted_contribution]));assert.ok(draft.sources.every(s=>s.updated_at&&s.url.startsWith('https://')));}
 }
 const s={...session('industrial_dependency'),year:2024,compare:['croatia']};assert.match(r.modelResearchCsv(s),/missing_or_ineligible|pending/);assert.throws(()=>r.modelResearchEvidence({...s,country:'germany'},true));assert.throws(()=>r.modelResearchExport({...s,issues:['year']}));
});
