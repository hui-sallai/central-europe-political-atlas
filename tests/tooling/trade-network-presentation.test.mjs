import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {latestTradeYear,tradeUnavailable,tradeValue,tradeDifference,tradeHistory,tradeYears,tradeCsv,tradeMetrics}=require('../../src/lib/tradeNetworkPresentation.ts');
const pack=JSON.parse(fs.readFileSync(new URL('../../public/research-data/network_ui_pack.json',import.meta.url)));
const schema=pack.schema_version;
const find=(c,y,f='imports')=>pack.records.find(r=>r.reporter===c&&r.year===y&&r.flow===f);
const {defaultTradeSession,restoreTradeSession,tradeSessionUrl,tradeSessionYears,tradeSessionYear,tradeSessionEvidence,tradePackRevision}=require('../../src/lib/tradeNetworkPresentation.ts');
const {emptyNotebook,addNotebookEvidence,validateNotebook}=require('../../src/lib/researchNotebook.ts');
const countryNames={hungary:{en:'Hungary','zh-CN':'匈牙利'},poland:{en:'Poland','zh-CN':'波兰'},slovakia:{en:'Slovakia','zh-CN':'斯洛伐克'},germany:{en:'Germany','zh-CN':'德国'}};
const metricNames={en:'Trading-partner HHI','zh-CN':'伙伴集中度 HHI'};
test('latest eligible year is data-driven for reporter and flow; no eligible year is null',()=>{
 assert.equal(latestTradeYear(pack,'hungary','imports'),2025);
 assert.equal(latestTradeYear(pack,'slovakia','imports'),null);
 assert.equal(latestTradeYear(pack,'slovakia','exports'),2025);
 const p={...pack,records:[find('germany',2022),find('germany',2021)]};assert.equal(latestTradeYear(p,'germany','imports'),2021);
 assert.equal(latestTradeYear({...pack,records:[find('hungary',2020)]},'hungary','imports'),2020);
});
test('all twelve failed groups remain blocked even with stored metrics; raw coverage cannot promote',()=>{
 const failed=pack.records.filter(r=>!r.coverage.gate_passed);assert.equal(failed.length,12);
 for(const g of failed)for(const m of tradeMetrics)assert.equal(tradeValue(g,m,schema),null);
 const g=structuredClone(find('hungary',2025));g.coverage.eligible_coverage_ratio=null;g.coverage.raw_coverage_ratio=1;
 assert.equal(tradeUnavailable(g,schema),'eligible_missing');
});
test('definitions, record dimensions, coverage evidence and finite metrics fail closed',()=>{
 const g=find('hungary',2025);
 for(const mutation of [r=>r.metrics.sector='other',r=>r.metrics.year=2024,r=>r.metrics.flow='exports',r=>r.coverage.threshold=.9,r=>r.coverage=null,r=>r.metrics.partner_hhi=NaN]){
  const altered=structuredClone(g);mutation(altered);assert.notEqual(tradeUnavailable(altered,schema),null);
 }
 assert.equal(tradeUnavailable(g,'unknown'),'schema');assert.equal(tradeUnavailable(null,schema),'absent');
});
test('same-year comparisons require both gates, flow, period and definition; missing share stays null',()=>{
 const a=find('hungary',2025),b=find('poland',2025);
 assert.equal(tradeDifference(a,b,'partner_hhi',schema),a.metrics.partner_hhi-b.metrics.partner_hhi);
 for(const other of [find('slovakia',2025),find('poland',2024),find('poland',2025,'exports')])assert.equal(tradeDifference(a,other,'partner_hhi',schema),null);
 assert.equal(tradeDifference(a,find('germany',2025),'germany_share',schema),null);
 const zero=structuredClone(a);zero.metrics.china_share=0;assert.equal(tradeValue(zero,'china_share',schema),0);
});
test('historical changes use exact endpoints and same reporter, not a previous eligible fallback',()=>{
 assert.equal(tradeDifference(find('germany',2022),find('germany',2021),'partner_hhi',schema,false),null);
 assert.equal(tradeDifference(find('hungary',2025),find('poland',2020),'partner_hhi',schema,false),null);
 const a=find('hungary',2025),b=find('hungary',2020);assert.equal(tradeDifference(a,b,'china_share',schema,false),a.metrics.china_share-b.metrics.china_share);
});
test('calendar scaffolding retains missing and failed-year gaps without interpolation',()=>{
 const years=tradeYears([find('germany',2021),find('germany',2023)]);assert.deepEqual(years,[2021,2022,2023]);
 assert.equal(tradeHistory(pack,'germany','imports','partner_hhi',years)[1].y,null);
 const p={...pack,records:[find('hungary',2021),find('hungary',2023)]};assert.equal(tradeHistory(p,'hungary','imports','china_share',years)[1].y,null);
});
test('CSV excludes invalid groups; preserves missing, raw units, definitions, sources and provenance',()=>{
 const csv=tradeCsv(pack,[find('hungary',2025),find('slovakia',2025),find('germany',2025)],tradeMetrics);
 assert.equal(csv.split('\r\n').length,15);assert.ok(!csv.includes('"slovakia"'));
 const missing=csv.split('\r\n').find(r=>r.startsWith('"germany"')&&r.includes('"germany_share"'));
 assert.ok(missing.includes('"germany_share","","fraction (0–1)","missing_not_zero"'));
 assert.ok(csv.includes(String(find('hungary',2025).metrics.weighted_trade_volume)));
 for(const field of ['source_url','coverage_threshold','schema_version','pack_generated_at','data_provenance'])assert.ok(csv.includes(field));
 assert.ok(csv.includes('https://comtradeplus.un.org/'));
});
test('CSV neutralizes string formulas without changing canonical records',()=>{
 const g=structuredClone(find('hungary',2025));g.reporter='=formula';g.metrics.country=g.reporter;g.coverage.reporter_country=g.reporter;
 assert.ok(tradeCsv(pack,[g],['partner_hhi']).includes('"\'=formula"'));
 assert.equal(find('hungary',2025).reporter,'hungary');
});
test('shared session round trip preserves all validated filters, locale and existing run/skill routing',()=>{
 const s={...defaultTradeSession(),compare:'poland',flow:'exports',year:2020,yearMode:'fixed',metric:'china_share',from:2018,to:2023,partner:'germany'};
 for(const locale of ['en','zh-CN']){const url=new URL(tradeSessionUrl(pack,s,locale,'a'.repeat(64))),restored=restoreTradeSession(pack,url.searchParams);
 assert.equal(url.pathname,locale==='en'?'/en/models/':'/models/');assert.equal(url.searchParams.get('tab'),'run');assert.equal(url.searchParams.get('skill'),'network_dependency');
 for(const key of ['country','compare','flow','year','metric','from','to','partner'])assert.equal(restored[key],s[key]);}
});
test('unsupported filters do not crash; explicit missing or invalid reference years never use latest eligible',()=>{
 const s=restoreTradeSession(pack,new URLSearchParams('country=unknown&trade_compare=unknown&trade_flow=invalid&trade_metric=unknown&trade_year=bad&trade_partner=missing'));
 assert.equal(s.country,'hungary');assert.equal(s.compare,'');assert.equal(s.metric,'partner_hhi');assert.equal(tradeSessionYear(pack,s),null);assert.ok(s.issues.includes('year'));
 const absent=restoreTradeSession(pack,new URLSearchParams('country=germany&trade_year=2030'));assert.equal(tradeSessionYear(pack,absent),2030);
 const failed=restoreTradeSession(pack,new URLSearchParams('country=germany&trade_year=2022'));assert.equal(tradeSessionYear(pack,failed),2022);assert.equal(tradeValue(find('germany',2022),'partner_hhi',schema),null);
});
test('shared range scaffolding preserves missing years and bounds resource use',()=>{
 const s={...defaultTradeSession(),from:2014,to:2016};assert.deepEqual(tradeSessionYears(pack,s),[2014,2015,2016]);
 assert.deepEqual(tradeSessionYears(pack,{...s,from:1000,to:9999}),[]);assert.deepEqual(tradeSessionYears(pack,{...s,from:2025,to:2020}),[]);
});
test('Notebook evidence passes the unchanged schema, preserves gaps and provenance, and stores no duplicated data',()=>{
 const s={...defaultTradeSession('germany'),year:2022,yearMode:'fixed',from:2021,to:2023};
 const draft=tradeSessionEvidence(pack,s,'en','a'.repeat(64),countryNames,metricNames);
 assert.deepEqual(draft.periods,['2021','2022','2023']);assert.equal(draft.metadata.row_count,2);assert.ok(draft.warnings.some(w=>w.includes('2022')));assert.ok(!draft.canonical_ids.some(id=>id.includes(':2022:')));
 assert.equal(draft.value,undefined);assert.equal(draft.metadata.rows,undefined);assert.equal(draft.metadata.filters.pack_generated_at,pack.generated_at);assert.ok(draft.sources.every(s=>!s.updated_at&&!s.retrieved_at));
 assert.equal(validateNotebook(addNotebookEvidence(emptyNotebook('en','v2.0'),draft,'v2.0')),true);
});
test('partial comparisons save valid evidence with warnings; empty selected metrics cannot be collected',()=>{
 const s={...defaultTradeSession(),compare:'slovakia',from:2020,to:2025};const d=tradeSessionEvidence(pack,s,'en','b'.repeat(64),countryNames,metricNames);
 assert.equal(d.type,'country_comparison');assert.equal(d.metadata.row_count,6);assert.ok(d.warnings.some(w=>w.includes('Slovakia: unavailable')));assert.ok(d.canonical_ids.every(id=>id.includes('hungary')));
 assert.throws(()=>tradeSessionEvidence(pack,{...defaultTradeSession('slovakia')},'en','b'.repeat(64),countryNames,metricNames));
 assert.throws(()=>tradeSessionEvidence(pack,{...defaultTradeSession('germany'),metric:'germany_share'},'en','b'.repeat(64),countryNames,metricNames));
});
test('pack revisions detect changed records without storing an old dataset; changed pack is disclosed',async()=>{
 const revision=await tradePackRevision(pack);assert.match(revision,/^[a-f0-9]{64}$/);assert.equal(await tradePackRevision(structuredClone(pack)),revision);
 const p=structuredClone(pack);p.records.pop();assert.notEqual(await tradePackRevision(p),revision);
 const d=tradeSessionEvidence(pack,{...defaultTradeSession(),expectedPack:'0'.repeat(64)},'en',revision,countryNames,metricNames);assert.ok(d.warnings.some(w=>w.includes('differs')));
});
