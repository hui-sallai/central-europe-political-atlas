import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {approvedRefreshHistory,seriesRefreshChanges,observationRefresh}=require('../../src/lib/refreshProvenance.ts');
const {getRefreshManifest}=require('../../src/lib/refreshProvenance.server.ts');
const ledger=fs.readFileSync('src/data/data-refresh/refresh_ledger.jsonl','utf8'),approvals=JSON.parse(fs.readFileSync('docs/legal-security/data_refresh_amendments.json')).refreshes;
test('approved ledger projection reproduces run totals without exposing approval prose or local paths',()=>{
 const runs=approvedRefreshHistory(ledger,approvals);assert.equal(runs.length,2);const euro=runs.find(r=>r.id==='monthly-eurostat-20261019'),sors=runs.find(r=>r.id==='serbia-20261020');assert.equal(euro.added,39);assert.equal(euro.revised,252);assert.equal(sors.added,11);assert.equal(sors.revised,27);
 const text=JSON.stringify(runs);for(const privateField of ['src/data/','approved_by','owner_acceptance','plan_sha256','previous_git_blob','/Users/'])assert.equal(text.includes(privateField),false,privateField);
});
test('approval filtering fails closed for absent approval, wrong plan, rejected or wrong unit',()=>{
 for(const a of [[],approvals.map(a=>({...a,status:'pending'})),approvals.map(a=>({...a,ledger_plan_sha256:'wrong'})),approvals.map(a=>({...a,unit:'wrong'}))])assert.deepEqual(approvedRefreshHistory(ledger,a),[]);
 assert.deepEqual(approvedRefreshHistory('broken\n{}\n',approvals),[]);
});
test('missing counts and old values remain unavailable, not zero-filled or guessed',()=>{
 const r={run_id:'test',applied_at:'2026-10-20',plan_sha256:'plan',units:[{unit:'unit',source_family:'SORS',stores:[{path:'annual',kind:'serbia',revisions:3}],revisions:[{series:'serbia:x:RS',revisions:[{period:'2020',revised:2}]}]}]};
 const result=approvedRefreshHistory(JSON.stringify(r),[{run_id:'test',unit:'unit',status:'owner_approved',ledger_plan_sha256:'plan'}]);assert.equal(result[0].added,null);assert.equal(result[0].revised,3);assert.deepEqual(result[0].changes[0].revisions,[]);
});
test('exact record application dates and revisions never spill over to untouched periods or other layers',()=>{
 const runs=approvedRefreshHistory(ledger,approvals);const x=observationRefresh(runs,'austria','hicp_monthly_index','high_frequency','2026-08');assert.equal(x[0].kind,'revised');assert.equal(x[0].revision.previous,143.39);assert.equal(x[0].revision.revised,143.41);
 assert.deepEqual(observationRefresh(runs,'austria','hicp_monthly_index','high_frequency','1990-01'),[]);assert.deepEqual(seriesRefreshChanges(runs,'austria','hicp_monthly_index','annual_history'),[]);assert.equal(observationRefresh(runs,'austria','hicp_annual_rate','high_frequency','2026-09')[0].kind,'added');
});
test('minimal server projection preserves source-check dates separately and no invented publication date',()=>{
 const m=getRefreshManifest(),s=m.series.find(s=>s.dataset==='serbia_sors_annual'&&s.indicator==='real_gdp_growth'),h=m.series.find(s=>s.dataset==='high_frequency');assert.match(s.checked,/^2026-10-19T/);assert.equal(s.sourceUpdated,null);assert.equal(h.checked,null);assert.equal(h.sourceUpdated,null);
 assert.equal(JSON.stringify(m).includes('raw_file'),false);assert.equal(JSON.stringify(m).includes('src/data/'),false);assert.equal(m.series.some(s=>s.dataset==='serbia_sors_regional'),false);assert.equal(m.series.some(s=>s.dataset==='annual_panel'),false);
});
test('SORS revision units are normalized units, with BIS conversion and restrictions retained',()=>{
 const m=getRefreshManifest(),s=m.series.find(s=>s.dataset==='serbia_sors_annual'&&s.indicator==='exports_goods_services_rsd'),c=m.series.find(s=>s.dataset==='serbia_sors_monthly'&&s.indicator==='cpi_index_2006');assert.equal(s.revisionUnit,'mill. EUR');assert.equal(s.unit,'mill. RSD');assert.ok(s.methods.some(v=>v.includes('BIS')));assert.equal(c.crossCountry,false);assert.deepEqual(c.samples,[]);
});
