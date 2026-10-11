import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { approvedNewsFiles, NEWS_REFRESH_PATHS, NEWS_REFRESH_FILE } from '../../docs/political-data/source-closure/news-refresh-amendments.mjs';
import { checkFrozenFiles } from '../../docs/political-data/source-closure/ui-amendments.mjs';
import { unapprovedFrozenChanges } from '../../scripts/political-data/germany/frozen-boundary.mjs';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const { weeklyNews20261011: items }=require('../../src/lib/weeklyNews/2026-10-11.ts');
const { newsTranslations: translations }=require('../../src/lib/newsTranslations.ts');
test('all ten countries have complete bilingual fact/boundary summaries; all records stay outside models',()=>{
 assert.equal(items.length,189);assert.equal(Object.keys(translations).length,items.length);
 assert.equal(new Set(items.map(x=>x.countrySlug)).size,10);
 const all=require('../../src/lib/newsData.ts').eventLibraryItems;
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.equal(new Set(items.map(x=>x.sourceUrl)).size,items.length);
 for(const item of items)assert.equal(all.filter(x=>x.sourceUrl===item.sourceUrl).length,1,item.id);
 for(const i of items){assert.equal(i.entersModel,false);assert.equal(i.intensity,null);assert.deepEqual(i.affectedModels,[]);assert.equal(i.summary.split('\n\n').length,2);assert.equal(translations[i.id].summary.split('\n\n').length,2);assert.ok(translations[i.id].title);assert.doesNotMatch(translations[i.id].summary,/[\u3400-\u9fff]/);}
});
const records=()=>JSON.parse(fs.readFileSync(NEWS_REFRESH_FILE,'utf8')).amendments;
test('batch exception pins every permitted file, with no other data or release authority',()=>{
 const {approved,problems}=approvedNewsFiles(records());assert.deepEqual(problems,[]);assert.equal(approved.size,NEWS_REFRESH_PATHS.length);
 for(const [p,h] of approved)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p);
 const r=records()[0];
 for(const p of ['src/data/events/events.json','src/data/observations.json','src/data/release.json','src/lib/varEngine.ts','public/research-data/political/germany/elections.json','src/data/events/news_*'])assert.ok(approvedNewsFiles([{...r,files:[...r.files,{path:p,sha256:'a'.repeat(64)}]}]).problems.length,p);
 for(const flag of ['model_change_allowed','research_gate_change_allowed','enters_model'])assert.ok(approvedNewsFiles([{...r,[flag]:true}]).problems.length,flag);
 assert.ok(approvedNewsFiles([{...r,window:{start:'2026-01-01',end:'2026-10-11'}}]).problems.length);
});
test('exact news hashes pass; drift, unlisted additions and baseline deletions fail closed',()=>{
 const r=records();const p='src/lib/weeklyNews/2026-10-11.ts';const h=r[0].files.find(f=>f.path===p).sha256;
 const run=(hash,extra=[],baseline={})=>checkFrozenFiles({baselineFiles:baseline,currentFiles:[p,...extra],hashOf:()=>hash,amendments:[],newsRefreshes:r});
 assert.equal(run(h).ok,true);assert.equal(run('0'.repeat(64)).ok,false);assert.equal(run(h,['src/data/events/events.json']).ok,false);assert.equal(run(h,[],{'src/data/observations.json':h}).ok,false);
});
test('workspace and notebook guards honour the same news hashes, never economic or election stores',()=>{
 const changed=NEWS_REFRESH_PATHS.filter(p=>p.startsWith('src/data/')||p.startsWith('public/')).join('\n');
 assert.deepEqual(unapprovedFrozenChanges(changed,'d68d0e10fa0c83b57e044af02e352379aa9e9d2d'),[]);
 for(const p of ['src/data/events/events.json','src/data/observations.json','src/data/release.json','src/lib/varEngine.ts','src/data/political/czechia/elections.json'])assert.deepEqual(unapprovedFrozenChanges(p,'d68d0e10fa0c83b57e044af02e352379aa9e9d2d'),[p]);
});
