import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire,Module} from 'node:module';
const require=createRequire(import.meta.url),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {eventPresentation}=require('../../src/lib/eventPresentation.ts'),{newsTranslations}=require('../../src/lib/newsTranslations.ts');
const {researchEvents,getEventsForCountry,researchCountries}=require('../../src/lib/researchData.ts');
const {newsLibraryMetadata}=require('../../src/lib/newsLibraryMetadata.ts');
test('latest verified events and every country latest event reuse exact approved fields without mutating records',()=>{
 const before=JSON.stringify(researchEvents),latest=researchEvents.filter(e=>e.data_status==='verified').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 for(const event of [...latest,...researchCountries.map(c=>getEventsForCountry(c.slug).find(e=>e.data_status==='verified')).filter(Boolean)]){
  const presented=eventPresentation(event,'en');assert.equal(presented.title.text,newsTranslations[event.id].title);assert.equal(presented.summary.text,newsTranslations[event.id].summary);assert.equal(presented.title.lang,'en');assert.equal(presented.title.originalLabel,undefined);
  assert.equal(eventPresentation(event,'zh-CN').title.text,event.title);
 }
 assert.equal(JSON.stringify(researchEvents),before);assert.equal(newsLibraryMetadata.latestNewsBatch,'2026-10-18');assert.equal(newsLibraryMetadata.latestEventDate,'2026-10-18');
});
test('mixed archive retains exact original titles and labels actual editorial language, not publisher language',()=>{
 const original=researchEvents.find(e=>e.data_status==='verified'&&!newsTranslations[e.id]);assert.ok(original);
 const view=eventPresentation(original,'en');assert.equal(view.title.text,original.title);assert.match(view.title.originalLabel,/Original title/);assert.match(view.summary.originalLabel,/Original summary/);
 const unknown=eventPresentation({id:'not-approved',title:'Original recorded title',summary:'Original recorded text',language:'de'},'en');assert.equal(unknown.title.lang,'und');assert.match(unknown.title.originalLabel,/language not specified/);
 assert.equal(eventPresentation({id:'constructor',title:'保留原文',summary:'原始摘要'},'en').title.text,'保留原文');
});
test('missing and blank approved fields fall back independently; never manufacture an English field',()=>{
 const id='test-only-partial';const item={id,title:'原始标题',summary:'原始摘要'};
 try{newsTranslations[id]={title:'Approved title',summary:''};let p=eventPresentation(item,'en');assert.equal(p.title.text,'Approved title');assert.equal(p.summary.text,item.summary);assert.equal(p.summary.lang,'zh-CN');assert.match(p.summary.originalLabel,/English unavailable/);
 newsTranslations[id]={title:' ',summary:'Approved summary'};p=eventPresentation(item,'en');assert.equal(p.title.text,item.title);assert.equal(p.title.lang,'zh-CN');assert.equal(p.summary.text,'Approved summary');assert.equal(p.summary.originalLabel,undefined);
 }finally{delete newsTranslations[id];}
});
