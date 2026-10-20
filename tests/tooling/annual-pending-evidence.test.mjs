import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {annualPendingEvidence}=require('../../src/lib/annualPendingEvidence.ts');
const {getRefreshManifest}=require('../../src/lib/refreshProvenance.server.ts');
const report=JSON.parse(fs.readFileSync('docs/data-refresh/canonical_source_check.json')),rows=JSON.parse(fs.readFileSync('src/data/observations/observations.json')).records;
const get=(id,country='poland',year=2025)=>rows.find(r=>r.indicator===id&&r.country_slug===country&&r.year===year);
test('all three registered definitions match existing per-country checks without changing observation values',()=>{
 for(const id of ['fdi_inflow','energy_import_dependency','automotive_export_share'])for(const row of rows.filter(r=>r.indicator===id&&r.status==='pending')){const e=annualPendingEvidence(row,report,true);assert.equal(e.mappingVerified,true,row.id);assert.match(e.countryChecked,/^2026-10-13T/);assert.equal(e.page.latest_year,2024);assert.equal(e.page.checked,'2026-10-20');assert.equal(e.queries.length,id==='automotive_export_share'?2:1);assert.equal(row.value,null);}
});
test('dataset-level 2024 coverage never replaces Croatia or Romania country-query latest period 2023',()=>{
 for(const [id,country] of [['automotive_export_share','croatia'],['fdi_inflow','romania']]){const e=annualPendingEvidence(get(id,country),report,true);assert.equal(e.countryLatest,'2023');assert.equal(e.page.latest_year,2024);assert.equal(e.page.scope,'dataset_overall');}
});
test('missing older values retain their per-period reason, not the latest pending-year explanation',()=>{
 const e=annualPendingEvidence(get('fdi_inflow','austria',2021),report,true);assert.equal(e.reason,'missing_at_source');assert.equal(e.period,'2021');
});
test('dataset-name coincidence, wrong currency, direction, country, time or denominator cannot inherit coverage evidence',()=>{
 const row=get('fdi_inflow');for(const q of [row.source_query_url.replace('MIO_EUR','MIO_USD'),row.source_query_url.replace('LIAB','ASS'),row.source_query_url.replace('geo=PL','geo=DE'),row.source_query_url.replaceAll('2025','2024'),row.source_query_url+'&extra=TOTAL',row.source_query_url+'&sinceTimePeriod=2024']){const e=annualPendingEvidence({...row,source_query_url:q},report,true);assert.equal(e.mappingVerified,false);assert.equal(e.countryChecked,null);assert.equal(e.page,null);assert.equal(e.reason,'incomplete_source_evidence');}
 const share=get('automotive_export_share');for(const changed of [{denominator_source_url:share.denominator_source_url.replace('TOTAL','C29')},{calculation_formula:'HS87 / total * 100'},{numerator_source_url:share.numerator_source_url.replace('C29','C28')}])assert.equal(annualPendingEvidence({...share,...changed},report,true).mappingVerified,false);
});
test('stale observation fingerprint, failed or absent country proof cannot infer nonpublication from overall coverage',()=>{
 const row=get('energy_import_dependency');assert.equal(annualPendingEvidence(row,report,false).reason,'incomplete_source_evidence');for(const transform of [r=>{r.series=[];},r=>{r.series.find(s=>s.country==='poland'&&s.indicator===row.indicator).provenance[0].http_status=503;}]){const r=structuredClone(report);transform(r);const e=annualPendingEvidence(row,r,true);assert.equal(e.reason,'incomplete_source_evidence');assert.equal(e.countryChecked,null);assert.equal(e.page.latest_year,2024);}
});
test('explicit restrictions take precedence and unsupported, published or descriptive observations are not relabelled',()=>{
 const row=get('energy_import_dependency');assert.equal(annualPendingEvidence({...row,comparability_status:'definition_mismatch'},report,true).reason,'comparability_unresolved');assert.equal(annualPendingEvidence({...row,applicability_status:'not_applicable'},report,true).reason,'not_applicable_by_research_rule');assert.equal(annualPendingEvidence({...row,status:'official'},report,true),null);assert.equal(annualPendingEvidence({...row,indicator:'hicp_inflation'},report,true),null);
 const m=getRefreshManifest();assert.ok(m.series.find(s=>s.dataset==='annual_observations'&&s.country==='poland'&&s.indicator==='fdi_inflow').pending.length);assert.deepEqual(m.series.find(s=>s.dataset==='annual_history'&&s.country==='poland').pending,[]);
});
test('a primary numerator publication does not establish that a complete derived share can be imported',()=>{
 const r=structuredClone(report);r.series.find(s=>s.country==='poland'&&s.indicator==='automotive_export_share').pending.find(p=>p.year===2025).reason='published_at_source_not_imported';assert.equal(annualPendingEvidence(get('automotive_export_share'),r,true).reason,'incomplete_source_evidence');
});
