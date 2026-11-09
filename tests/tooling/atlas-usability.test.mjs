import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {observationAvailability:a}=require('../../src/lib/observationAvailability.ts');
const {regionalDifference:d}=require('../../src/lib/regionalComparison.ts');
test('Romania electricity 2002–2010 is outside 2023–2024, not zero missing selected years',()=>{
 const result=a([{period:2023,value:0.12},{period:2024,value:0.14}],2002,2010);
 assert.equal(result.selectedCount,0);assert.equal(result.outside,9);assert.equal(result.first,2023);assert.equal(result.last,2024);assert.equal(result.count,2);
});
test('deduplicates layers and separates internal gaps, Pending and outside coverage',()=>{
 const r=a([{period:2020,value:1},{period:2020,value:1},{period:2022,value:3},{period:2021,value:null,status:'pending'},{period:2023,value:null,status:'restricted'}],2019,2023);
 assert.equal(r.count,2);assert.deepEqual(r.insideMissing,[2021]);assert.deepEqual(r.pending,[2021]);assert.equal(r.outside,2);assert.deepEqual(r.restrictions,['restricted']);
 const held=a([{period:2025,value:null,status:'not_applicable'},{period:2024,value:null,status:'definition_mismatch'}]);assert.deepEqual(held.pending,[]);assert.deepEqual(held.restrictions,['not_applicable','definition_mismatch']);
});
test('unknown coverage and inverted periods never infer no missing observations',()=>{
 assert.equal(a([],NaN,2020).invalid,true);assert.equal(a([],NaN,2020).outside,null);assert.equal(a([],2002,2010).first,null);assert.equal(a([],2002,2010).outside,9);assert.equal(a([{period:2020,value:1}],2022,2020).invalid,true);
});
test('monthly gaps use calendar months and exclude nulls and nonfinite values',()=>{
 const r=a([{period:24240,value:0},{period:24242,value:1},{period:24243,value:NaN}],24239,24243);
 assert.deepEqual(r.insideMissing,[24241]);assert.equal(r.count,2);assert.equal(r.outside,2);
});
const base={value:20000,year:'2024',unit:'EUR per person',definition:'regional GDP per capita',classification:'NUTS 2024',level:'NUTS3',eligible:true};
test('compatible regional values retain absolute and meaningful relative differences',()=>{
 assert.deepEqual(d(base,{...base,value:25000}),{absolute:5000,unit:'EUR per person',relative:25});
 assert.deepEqual(d({...base,value:100,unit:'PPS'},{...base,value:125,unit:'PPS'}),{absolute:25,unit:'PPS',relative:25});
 assert.deepEqual(d({...base,value:4,unit:'%'},{...base,value:6,unit:'%'}),{absolute:2,unit:'pp',relative:null});
});
test('rejects mismatched NUTS vintages, years, units, definitions, levels and admission',()=>{
 for(const patch of [{classification:'NUTS 2021'},{year:'2023'},{unit:'PPS'},{definition:'nominal GDP'},{level:'NUTS2'},{eligible:false}])assert.equal(d(base,{...base,...patch}),null);
 assert.equal(d(base,null),null);assert.equal(d({...base,value:0},{...base,value:2}).relative,null);
});
