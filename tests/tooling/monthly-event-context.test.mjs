import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {monthlyEventDates,monthlyEventLinks}=require('../../src/lib/monthlyEventContext.ts');
const {restoreMonthlySession,monthlyUrl,monthlyEvidence,monthlyRows}=require('../../src/lib/monthlyComparison.ts');
const {monthlyComparisonData}=require('../../src/lib/monthlyComparisonData.server.ts');
const {emptyNotebook,addNotebookEvidence,validateNotebook}=require('../../src/lib/researchNotebook.ts');
const countries=['hungary','poland','germany','austria','serbia'];
test('inclusive calendar boundaries preserve February, leap centuries and year changes without timezone arithmetic',()=>{
 for(const [month,end] of [['2024-02','29'],['2025-02','28'],['1900-02','28'],['2000-02','29'],['2100-02','28'],['2026-04','30'],['2026-12','31']])assert.deepEqual(monthlyEventDates(month,month),{from:month+'-01',to:month+'-'+end});
 assert.deepEqual(monthlyEventDates('2023-12','2024-02'),{from:'2023-12-01',to:'2024-02-29'});
 for(const [from,to] of [['2025-13','2026-01'],['2026-01','2025-01'],['bad','2026-01'],['2025-00','2026-01'],['1000-01','9999-12']])assert.equal(monthlyEventDates(from,to),null);
});
test('country-specific links use only the existing Event Library contract and the selected full period',()=>{
 for(const en of [true,false])for(const count of [2,3,5]){
  const links=monthlyEventLinks(countries.slice(0,count),countries,'2024-01','2024-02',en);assert.equal(links.length,count);
  for(const link of links){const u=new URL(link.href,'https://hy-central-europe-analysis.org');assert.equal(u.pathname,en?'/en/news/':'/news/');assert.deepEqual([...u.searchParams.keys()],['country','from','to']);assert.equal(u.searchParams.get('country'),link.country);assert.equal(u.searchParams.get('from'),'2024-01-01');assert.equal(u.searchParams.get('to'),'2024-02-29');assert.equal(u.searchParams.has('indicator'),false);}
 }
 for(const selected of [['hungary'],['hungary','unknown'],['hungary','hungary'],[...countries,'czechia']])assert.deepEqual(monthlyEventLinks(selected,countries,'2024-01','2024-02',true),[]);
});
test('event navigation cannot mutate monthly URLs or Notebook configuration and does not create event evidence',()=>{
 const payload=monthlyComparisonData(),s=restoreMonthlySession(new URLSearchParams('monthly_countries=germany,hungary&monthly_mode=explicit&monthly_month=2030-01&monthly_from=2025-01&monthly_to=2026-09'),countries,payload);
 const url=monthlyUrl(s,true),before=JSON.stringify(s),draft=monthlyEvidence(s,monthlyRows(s,payload),payload,true);
 const links=monthlyEventLinks(s.countries,countries,s.from,s.to,true);assert.equal(links.length,2);assert.equal(JSON.stringify(s),before);assert.equal(monthlyUrl(s,true),url);assert.equal(new URL(links[0].href,'https://hy-central-europe-analysis.org').searchParams.get('from'),'2025-01-01');
 const notebook=addNotebookEvidence(emptyNotebook('en','v2.0'),draft,'v2.0');assert.equal(validateNotebook(notebook),true);assert.equal(notebook.items[0].type,'country_comparison');assert.equal(notebook.items[0].metadata.filters.month,'2030-01');assert.equal(notebook.items.length,1);
});
test('lightweight contextual navigation does not bundle another event dataset or analysis mapping',()=>{
 const source=fs.readFileSync('src/components/MonthlyEventContext.tsx','utf8');for(const forbidden of ['researchEvents','newsTranslations','eventAnalysisLinks','fetch('])assert.equal(source.includes(forbidden),false);
 assert.ok(fs.readFileSync('src/components/NewsExplorer.tsx','utf8').includes('.filter((item) => item.data_status === "verified")'));
});
