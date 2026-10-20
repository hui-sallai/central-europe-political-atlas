import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire, Module} from 'node:module';
const require=createRequire(import.meta.url), resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const h=require('../../src/lib/monthlyComparison.ts'), {monthlyComparisonData}=require('../../src/lib/monthlyComparisonData.server.ts');
const {emptyNotebook,addNotebookEvidence,validateNotebook}=require('../../src/lib/researchNotebook.ts');
const payload=monthlyComparisonData(), countries=['hungary','poland','germany','austria','slovakia','serbia'];
const session=h.restoreMonthlySession(new URLSearchParams(),countries,payload);
test('four exact Eurostat definitions retain actual current canonical observations',()=>{
 assert.equal(Object.keys(h.monthlyIndicators).length,4);assert.equal(payload.rows.length,require('../../src/data/high-frequency/high_frequency_observations.json').records.filter(r=>r.frequency==='monthly'&&r.indicator in h.monthlyIndicators).length);
 assert.equal(payload.rows.filter(r=>h.monthlyEligible(r,payload)).length,payload.rows.length-9);assert.equal(payload.rows.filter(r=>r[4]===null).length,9);
 const row=payload.rows.find(r=>r[2]==='hicp_annual_rate'),source=payload.sources[row[6]];
 for(const patch of [{unit:'CPI'},{institution:'SORS'},{adjustment:'SA'},{definition:'prc_hicp_minr:{"coicop18":"FOOD","unit":"RCH_A"}'},{eligible:false},{breakStatus:'unreviewed'}])assert.equal(h.monthlyDefinitionMatches(row[2],{...source,...patch}),false);
 assert.equal(h.monthlyEligible([...row.slice(0,4),null,'pending',row[6]],payload),false);
});
test('latest common is an actual intersection; partial mode never mixes months',()=>{
 const s={...session,countries:['germany','serbia'],indicator:'unemployment_rate_monthly'};
 assert.equal(h.monthlyReference(s,h.monthlyRows(s,payload)),null);
 const partial={...s,mode:'partial'}, rows=h.monthlyRows(partial,payload),ref=h.monthlyReference(partial,rows);
 assert.ok(ref);assert.equal(rows.some(r=>r[1]==='serbia'),false);
 const common=h.monthlyReference(session,h.monthlyRows(session,payload));assert.ok(session.countries.every(c=>h.monthlyRows(session,payload).some(r=>r[1]===c&&r[3]===common)));
 const explicit={...s,mode:'explicit',month:'2030-01'};assert.equal(h.monthlyReference(explicit,h.monthlyRows(explicit,payload)),'2030-01');assert.equal(h.monthlyRows(explicit,payload).some(r=>r[3]==='2030-01'),false);
});
test('month validation and empty ranges never generate data or unbounded axes',()=>{
 for(const bad of ['2025-00','2025-13','oops','999-01'])assert.ok(Number.isNaN(h.monthNumber(bad)));
 for(const patch of [{from:'2026-09',to:'2015-01'},{from:'1000-01',to:'9999-12'},{countries:['hungary']},{indicator:'cpi'},{mode:'bad'}])assert.equal(h.monthlyValid({...session,...patch}),false);
 assert.deepEqual(h.monthlyRows({...session,from:'2030-01',to:'2031-01'},payload),[]);
});
test('2–5 country sessions roundtrip in both languages and strip unrelated/private parameters',()=>{
 for(const en of [true,false])for(const count of [2,3,5]){
  const s={...session,countries:countries.slice(0,count),indicator:'industrial_production_index',mode:'explicit',month:'2030-01'};
  assert.deepEqual(h.restoreMonthlySession(new URL(h.monthlyUrl(s,en)).searchParams,countries,payload),s);
 }
 const q=new URLSearchParams('monthly_countries=hungary,unknown&monthly_indicator=cpi&api_key=private&macro_year=2025');const s=h.restoreMonthlySession(q,countries,payload);
 assert.equal(h.monthlyValid(s),false);assert.ok(!h.monthlyUrl(s,true).includes('private'));assert.ok(!h.monthlyUrl(s,true).includes('macro_year'));
});
test('CSV uses actual eligible rows with sources and vintages; Notebook remains a configuration',()=>{
 const rows=h.monthlyRows(session,payload),csv=h.monthlyCsv(rows,payload);assert.ok(csv.includes('source_url'));assert.ok(csv.includes('latest_revised'));assert.equal(csv.split('\r\n').length,rows.length+2);
 const draft=h.monthlyEvidence(session,rows,payload,true);assert.equal(draft.value,undefined);assert.equal(draft.canonical_ids.length,100);assert.equal(draft.metadata.entersModel,false);assert.equal(draft.metadata.filters.from,session.from);
 assert.equal(validateNotebook(addNotebookEvidence(emptyNotebook('en','v2.0'),draft,'v2.0')),true);
 const poland=payload.sources.find(s=>s.warning.includes('2021'));assert.ok(poland.warning);assert.ok(payload.sources.some(s=>s.warning.includes('2023')));
});
