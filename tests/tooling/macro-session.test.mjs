import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {defaultAnnualSession,restoreAnnualSession,annualSessionUrl,annualSessionEvidence,annualPoints}=require('../../src/lib/annualComparison.ts');
const {emptyNotebook,addNotebookEvidence,validateNotebook}=require('../../src/lib/researchNotebook.ts');
const countries=['hungary','poland','germany','austria','slovakia'],indicators=['real_gdp_growth','manufacturing_share_gdp'];
test('macro standalone defaults and legacy country query survive without trade parameter contamination',()=>{
 assert.deepEqual(restoreAnnualSession(new URLSearchParams(),countries,indicators),defaultAnnualSession(countries));
 assert.deepEqual(restoreAnnualSession(new URLSearchParams('country=germany&trade_countries=austria,slovakia&trade_metric=china_share'),countries,indicators).countries,['germany','hungary']);
});
test('2–5 countries, indicator, explicit year, custom range and reference policy round trip in both languages',()=>{
 for(const locale of ['en','zh-CN'])for(const count of [2,3,5]){
  const s={...defaultAnnualSession(countries),countries:countries.slice(0,count),indicator:'manufacturing_share_gdp',mode:'latest_available',year:'2030',range:'custom',from:2015,to:2025};
  const url=new URL(annualSessionUrl(s,locale));assert.equal(url.searchParams.get('tab'),'compare');assert.equal(url.searchParams.has('trade_metric'),false);assert.deepEqual(restoreAnnualSession(url.searchParams,countries,indicators),s);assert.equal(url.pathname,locale==='en'?'/en/models/':'/models/');
 }
});
test('invalid macro parameters remain explicit and never substitute another country or requested observation',()=>{
 const s=restoreAnnualSession(new URLSearchParams('macro_countries=hungary,unknown&macro_indicator=china_share&macro_mode=bad&macro_year=bad&macro_from=bad&macro_to=2020'),countries,indicators);
 assert.deepEqual(s.countries,['hungary']);assert.equal(s.indicator,'china_share');assert.equal(s.year,'bad');for(const i of ['countries','indicator','mode','year','range'])assert.ok(s.issues.includes(i));
 assert.ok(restoreAnnualSession(new URLSearchParams('macro_countries=hungary,hungary,poland'),countries,indicators).issues.includes('countries'));
 assert.ok(restoreAnnualSession(new URLSearchParams('macro_from=1000&macro_to=9999'),countries,indicators).issues.includes('range'));
});
test('shared macro links only serialize allowlisted macro fields, retaining finite history presets',()=>{
 for(const range of ['latest','5','10','all']){const s={...defaultAnnualSession(countries),range};assert.equal(restoreAnnualSession(new URL(annualSessionUrl(s,'en')).searchParams,countries,indicators).range,range);}
 const s=restoreAnnualSession(new URLSearchParams('api_key=private&trade_metric=china_share&macro_countries=hungary,poland'),countries,indicators);const url=annualSessionUrl(s,'en');assert.ok(!url.includes('private'));assert.ok(!url.includes('api_key'));assert.ok(!url.includes('trade_'));
});
test('macro Notebook stores a gated configuration and real source references, not copied trade observations',()=>{
 const point={country_slug:'hungary',indicator:'real_gdp_growth',year:2021,value:3,unit:'%',status:'official',source_name:'Eurostat',source_url:'https://ec.europa.eu/eurostat/',comparable:true,layer:'published snapshot'};
 const s={...defaultAnnualSession(countries),range:'custom',from:2021,to:2022};
 const draft=annualSessionEvidence(s,[point,{...point,country_slug:'poland',year:2022,value:null,status:'pending'},{...point,country_slug:'poland',year:2021,comparable:false}], 'en',2021,2022,{},'GDP growth');
 assert.equal(draft.metadata.row_count,1);assert.equal(draft.canonical_ids.length,1);assert.equal(draft.value,undefined);assert.equal(draft.sources[0].updated_at,undefined);assert.ok(draft.metadata.coverage.some(x=>x.startsWith('poland: 0')));assert.equal(validateNotebook(addNotebookEvidence(emptyNotebook('en','v2.0'),draft,'v2.0')),true);
 assert.throws(()=>annualSessionEvidence({...s,issues:['year']},[point],'en',2021,2022,{},'GDP'));assert.throws(()=>annualSessionEvidence(s,[point,{...point,country_slug:'poland',unit:'EUR'}],'en',2021,2022,{},'GDP'));
});
test('canonical pending values still take priority over descriptive backfill',()=>{
 const raw={country_slug:'hungary',indicator:'real_gdp_growth',year:2025,value:null,unit:'%',status:'pending',source_name:'Eurostat',source_url:'https://ec.europa.eu/eurostat/'};
 const rows=annualPoints([raw],{sources:[{dataset:'History',url:'https://ec.europa.eu/eurostat/'}],records:[['hungary','real_gdp_growth',2025,5,'%','official',0]]});assert.equal(rows.length,1);assert.equal(rows[0].value,null);assert.equal(rows[0].status,'pending');
});
