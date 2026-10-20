import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const h=require('../../src/lib/monthlyComparisonHandoff.ts'),m=require('../../src/lib/monthlyComparison.ts');
const {monthlyComparisonCoverage,monthlyComparisonData}=require('../../src/lib/monthlyComparisonData.server.ts');
const coverage=monthlyComparisonCoverage(),countries=['hungary','germany','poland','austria','slovakia','serbia'];
const options={country:'hungary',additional:['germany'],countries,sourceIndicator:'hicp_annual_rate',fromYear:'2025',toYear:'2026',coverage,en:true};
test('coverage projection is exactly the existing eligible canonical records, excluding nulls and definition failures',()=>{
 const payload=monthlyComparisonData(),eligible=payload.rows.filter(r=>m.monthlyEligible(r,payload));
 assert.equal(Object.values(coverage).flatMap(byIndicator=>Object.values(byIndicator).flat()).length,eligible.length);
 for(const [country,byIndicator] of Object.entries(coverage))for(const [indicator,periods] of Object.entries(byIndicator))assert.deepEqual(periods,eligible.filter(r=>r[1]===country&&r[2]===indicator).map(r=>r[3]));
 assert.equal(coverage.serbia.unemployment_rate_monthly,undefined);assert.ok(!coverage.hungary.unemployment_rate_monthly.includes('2026-09'));
});
test('exact mappings never substitute CPI, quarterly unemployment or growth for an index',()=>{
 for(const id of Object.keys(m.monthlyIndicators))assert.equal(h.handoffIndicator(id),id);
 for(const id of ['cpi','unemployment_rate_quarterly','industrial_production_growth','constructor',''])assert.equal(h.handoffIndicator(id),null);
 assert.equal(h.handoffIndicator('cpi','hicp_monthly_index'),'hicp_monthly_index');assert.equal(h.handoffIndicator('hicp_monthly_index','hicp_annual_rate'),'hicp_monthly_index');
});
test('reporting country is retained and additional 1–4 countries are never invented',()=>{
 assert.equal(h.monthlyHandoff({...options,additional:[]}),null);
 for(const count of [1,2,4]){const handoff=h.monthlyHandoff({...options,additional:countries.slice(1,1+count)});assert.deepEqual(handoff.session.countries,['hungary',...countries.slice(1,1+count)]);}
 for(const patch of [{additional:['hungary']},{additional:['germany','germany']},{additional:['unknown']},{additional:countries.slice(1)},{country:'unknown'}])assert.equal(h.monthlyHandoff({...options,...patch}),null);
});
test('year bounds become calendar months and are explicitly clipped to real reporting-country coverage',()=>{
 assert.deepEqual(h.handoffPeriod(coverage,'hungary','hicp_annual_rate','2010','2026'),{requestedFrom:'2010-01',requestedTo:'2026-12',from:'2015-01',to:'2026-09',count:141,clipped:true});
 assert.equal(h.monthlyHandoff(options).session.to,'2026-09');assert.equal(h.monthlyHandoff({...options,toYear:'2025'}).session.to,'2025-12');assert.equal(h.monthlyHandoff({...options,sourceIndicator:'unemployment_rate_monthly'}).session.to,'2026-08');
 const gap={hungary:{hicp_annual_rate:['2024-01','2024-03']}};assert.equal(h.handoffPeriod(gap,'hungary','hicp_annual_rate','all','all').count,2);assert.deepEqual(h.handoffMonths(gap,'hungary','hicp_annual_rate','2024-01','2024-03'),['2024-01','2024-03']);
 for(const [fromYear,toYear] of [['2000','2005'],['2030','2031'],['2026','2025'],['bad','2026'],['','all']])assert.equal(h.monthlyHandoff({...options,fromYear,toYear}),null);
});
test('ineligible country/indicator combinations and absent coverage cannot produce a research link',()=>{
 assert.equal(h.monthlyHandoff({...options,additional:['serbia'],sourceIndicator:'unemployment_rate_monthly'}),null);
 assert.equal(h.monthlyHandoff({...options,country:'serbia',sourceIndicator:'unemployment_rate_monthly'}),null);
 assert.equal(h.monthlyHandoff({...options,coverage:{}}),null);
 assert.equal(h.monthlyHandoff({...options,sourceIndicator:'cpi'}),null);
 assert.equal(h.monthlyHandoff({...options,sourceIndicator:'cpi',explicitIndicator:'hicp_monthly_index'}).session.indicator,'hicp_monthly_index');
});
test('both language links round-trip through the existing monthly contract without adding a state framework',()=>{
 const payload=monthlyComparisonData();for(const en of [false,true]){const result=h.monthlyHandoff({...options,en});const url=new URL(result.url);assert.equal(url.pathname,en?'/en/models/':'/models/');assert.equal(url.searchParams.get('tab'),'compare');assert.equal(url.searchParams.get('compare_frequency'),'monthly');assert.equal(url.searchParams.get('monthly_mode'),'common');assert.deepEqual(m.restoreMonthlySession(url.searchParams,countries,payload),result.session);assert.ok(!url.searchParams.has('country'));}
});
