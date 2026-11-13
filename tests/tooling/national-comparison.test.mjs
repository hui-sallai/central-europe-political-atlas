import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const h=require('../../src/lib/nationalComparison.ts'),coverage=require('../../src/lib/historicalCoverage.ts');
const json=n=>JSON.parse(fs.readFileSync(`public/research-data/${n}.json`,'utf8'));
const {monthlyComparisonData}=require('../../src/lib/monthlyComparisonData.server.ts');
const {researchCountries,researchIndicators,researchObservations}=require('../../src/lib/researchData.ts');
const countries=researchCountries.map(c=>c.slug);
const data={observations:researchObservations,annual:json('annual_history_runtime'),monthly:monthlyComparisonData(),macro:json('macro_driver_runtime').records,macroDefinitions:json('macro_driver_dictionary').records,sors:json('serbia_sors_runtime').series,history:json('monthly_history_runtime'),inventory:json('historical_recovery_inventory')};
const metrics=h.nationalMetrics(researchIndicators,data),metric=k=>metrics.find(m=>m.key===k);
test('no arbitrary default or extra country; arbitrary subsets 2–10 restore unchanged',()=>{
 assert.deepEqual(h.selectedNationalCountries(new URLSearchParams(),countries),{countries:[],invalid:false});
 for(let n=2;n<=10;n++){const subset=[...countries].reverse().slice(0,n);assert.deepEqual(h.selectedNationalCountries(new URLSearchParams({compare_countries:subset.join(',')}),countries),{countries:subset,invalid:false});}
 assert.deepEqual(h.selectedNationalCountries(new URLSearchParams('country=serbia'),countries).countries,['serbia']);
 assert.equal(h.selectedNationalCountries(new URLSearchParams('compare_countries=serbia,serbia,invalid'),countries).invalid,true);
});
test('global catalogue includes all existing annual, monthly, macro and SORS definitions with frequency separation',()=>{
 for(const s of data.sors)assert.ok(metric(`sors:${s.key}`));for(const m of data.macroDefinitions)assert.ok(metric(`macro:${m.driver_id}`));
 assert.equal(metric('sors:lfs_unemployment_quarterly').frequency,'quarterly');assert.equal(metric('monthly:unemployment_rate_monthly').frequency,'monthly');assert.notEqual(metric('sors:cpi_index_2006').key,metric('monthly:hicp_monthly_index').key);
 assert.equal(new Set(metrics.map(m=>m.key)).size,metrics.length);
});
test('annual actual intersections retain inventory pairwise gates, differing histories and exact values',()=>{
 for(const key of ['real_gdp_growth','industrial_electricity_price','population']){const rows=h.nationalPoints(metric(`annual:${key}`),data);
 for(const subset of [countries,countries.slice(3,5),['austria','croatia'],['serbia','slovakia']]){
 const actual=h.sharedNationalPeriods(rows,subset,data.inventory),expected=coverage.annualCommonPeriods(data.inventory,subset,key,rows.map(p=>({country_slug:p.country,year:Number(p.period),value:p.value,unit:p.unit,comparable:p.eligible})));
 assert.deepEqual(actual,expected);for(const period of actual)assert.ok(subset.every(c=>rows.some(p=>p.country===c&&p.period===period&&p.value!==null)));}
 }
 const p=data.observations.find(o=>o.value!==null&&o.indicator==='real_gdp_growth');assert.equal(h.nationalPoints(metric('annual:real_gdp_growth'),data).find(r=>r.country===p.country_slug&&r.period===String(p.year)).value,p.value);
});
test('common periods reject nulls, absent years, unit changes, definition breaks and missing inventory',()=>{
 const p={id:'x',country:'austria',period:'2024',value:1,unit:'%',frame:'test',eligible:true},q={...p,country:'croatia'};
 assert.deepEqual(h.sharedNationalPeriods([p,q],['austria','croatia']),['2024']);
 for(const patch of [{value:null},{eligible:false},{unit:'EUR'},{frame:'different'},{period:'2023'}])assert.deepEqual(h.sharedNationalPeriods([p,{...q,...patch}],['austria','croatia']),[]);
 assert.deepEqual(h.sharedNationalPeriods([{...p,frame:'annual:real_gdp_growth:x'},{...q,frame:'annual:real_gdp_growth:x'}],['austria','croatia'],null),[]);
});
test('monthly definitions and Serbian unavailable monthly unemployment remain distinct; quarterly originals retain periods',()=>{
 const hicp=h.nationalPoints(metric('monthly:hicp_annual_rate'),data);assert.ok(hicp.some(p=>p.country==='serbia'&&p.eligible));const rows=h.nationalPoints(metric('monthly:unemployment_rate_monthly'),data);assert.equal(rows.some(p=>p.country==='serbia'),false);assert.deepEqual(h.sharedNationalPeriods(rows,['austria','serbia']),[]);
 const s=metric('sors:lfs_unemployment_quarterly'),points=h.nationalPoints(s,data);assert.ok(points.length);assert.ok(points.every(p=>/^\d{4}-Q[1-4]$/.test(p.period)&&!p.eligible));assert.equal(points[0].value,data.sors.find(s=>s.key==='lfs_unemployment_quarterly').points[0][1]);
});
test('financial observations preserve instruments, definitions, shared sources and descriptive-only history',()=>{
 const rows=h.nationalPoints(metric('macro:policy_rate'),data);assert.ok(rows.length);assert.ok(rows.some(p=>p.warning.includes('Shared')));assert.ok(rows.filter(p=>p.layer==='descriptive monthly history').every(p=>!p.eligible));
 assert.ok(h.nationalPoints(metric('macro:bilateral_fx_local_per_eur'),data).every(p=>!p.eligible));
});
test('CSV retains actual values, empty values and source references and escapes formula strings',()=>{
 const rows=h.nationalPoints(metric('annual:real_gdp_growth'),data).slice(0,3),csv=h.nationalCsv(rows);assert.equal(csv.split('\r\n').length,4);assert.ok(csv.includes('source_url'));assert.ok(csv.includes(rows[0].url));
 assert.ok(h.nationalCsv([{...rows[0],source:'=1+1',value:null}]).includes('"\'=1+1"'));assert.ok(h.nationalCsv([{...rows[0],value:-2}]).includes('"-2"'));
});

test("legacy year filters transfer explicitly to calendar boundaries without accepting invalid periods",()=>{assert.equal(h.transferNationalPeriod("2025","monthly"),"2025-01");assert.equal(h.transferNationalPeriod("2026","monthly",true),"2026-12");assert.equal(h.transferNationalPeriod("2025","quarterly",true),"2025-Q4");assert.equal(h.transferNationalPeriod("bad","monthly"),"bad");assert.equal(h.transferNationalPeriod("all","monthly"),"");});

test('existing macro transformations retain published values and do not derive historical values',()=>{
 for(const def of data.macroDefinitions)for(const transformation of def.transformation_options){
  const m=metrics.find(m=>m.source==='macro'&&m.id===def.driver_id&&m.transformation===transformation);assert.ok(m);
  assert.equal(h.resolveNationalMetricKey(`macro:${def.driver_id}:${transformation}`,metrics),m.key);
  const points=h.nationalPoints(m,data),published=data.macro.filter(r=>r[1]===def.driver_id&&r[7]===transformation);
  for(const p of points.filter(p=>p.layer!=='descriptive monthly history')){const r=published.find(r=>r[0]===p.id);assert.ok(r);assert.equal(p.value,r[5]);if(r[11]!=='observed_driver'||(r[15]!==null&&r[15]!=='valid'))assert.equal(p.eligible,false);}
  if(transformation!=='level')assert.equal(points.some(p=>p.layer==='descriptive monthly history'),false);
 }
 assert.equal(h.resolveNationalMetricKey('macro:policy_rate:unsupported',metrics),'macro:policy_rate:unsupported');
 assert.deepEqual(h.selectedNationalCountries(new URLSearchParams('area=scope:ecb'),countries),{countries:[],invalid:false});
});
