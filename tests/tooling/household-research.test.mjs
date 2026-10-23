import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const h=require('../../src/lib/householdResearchPresentation.ts'),engine=require('../../src/lib/modelFramework.ts'),scenario=require('../../src/lib/scenarioFramework.ts');
const countries=require('../../src/data/countries/countries.json').records;
const notebook=require('../../src/lib/researchNotebook.ts');
const session=h.restoreHouseholdSession(new URLSearchParams());
test('every displayed annual baseline and contribution reproduces existing engine without mutation',()=>{
 const original=JSON.stringify(engine.modelOutputs);
 for(const c of countries)for(const year of h.householdYears){
  const result=h.householdOutput(c.slug,year);
  assert.deepEqual(result,engine.calculateModelOutputForYear(c,h.householdCard,year));
  if(result.score!==null)assert.equal(result.score,Number((result.inputs.reduce((v,i)=>v+i.weighted_contribution,0)/result.inputs.reduce((v,i)=>v+i.weight,0)).toFixed(1)));
 }
 assert.equal(JSON.stringify(engine.modelOutputs),original);
 assert.equal(h.householdOutput('unknown',session.year),null);assert.equal(h.householdOutput('poland',9999),null);
});
test('scenario and all sensitivity points use actual unchanged calculation functions',()=>{
 const baseline=h.householdOutput(session.country,session.year),saved=JSON.stringify(baseline);
 for(let shock=0;shock<=5;shock+=.5){
  const s={...session,shock},result=h.householdScenarioResult(s);
  assert.deepEqual(result,scenario.calculateScenario({definition:h.householdScenario,countrySlug:s.country,shockValue:shock,cards:[h.householdCard],outputs:[baseline]}));
  if(result.status==='available'){assert.equal(result.adjusted_input.adjusted_value,Number((result.adjusted_input.baseline_value+shock).toFixed(3)));assert.equal(result.score_change,Number((result.scenario_score-baseline.score).toFixed(1)));}
 }
 assert.equal(JSON.stringify(baseline),saved);
});
test('explicit invalid choices fail closed; canonical URL restores all workflow choices in both languages',()=>{
 for(const q of ['country=unknown','pressure_year=2030','pressure_from=2025&pressure_to=2020','pressure_shock=NaN','pressure_shock=6','pressure_compare=germany,germany','pressure_compare=poland'])assert.ok(h.restoreHouseholdSession(new URLSearchParams(q)).issues.length,q);
 for(const en of [true,false]){const s={...session,compare:['germany','austria'],shock:3.5};const url=h.householdUrl(s,en);assert.deepEqual(h.restoreHouseholdSession(new URL(url).searchParams),s);assert.ok(!url.includes('api_key'));}
 assert.equal(h.householdComparable('unknown','poland',session.year),false);
 assert.equal(h.householdComparable('germany','poland',9999),false);
});
test('Notebook is a source-linked configuration and CSV preserves actual values, statuses and gaps',()=>{
 for(const en of [true,false]){
  const draft=h.householdEvidence(session,en);assert.equal(draft.value,undefined);assert.ok(draft.sources.every(s=>s.url.startsWith('https://')));assert.equal(draft.metadata.filters.shock,session.shock);
  assert.equal(notebook.validateNotebook(notebook.addNotebookEvidence(notebook.emptyNotebook(en?'en':'zh-CN','v2.0'),draft,'v2.0')),true);
 }
 const csv=h.householdCsv(session);assert.ok(csv.includes('source_url'));assert.ok(csv.includes('hicp_inflation'));assert.ok(!csv.includes('monthly'));
 assert.throws(()=>h.householdEvidence({...session,issues:['shock']},true));
});
