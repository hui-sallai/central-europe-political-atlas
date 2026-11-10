import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {annualCommonPeriods,annualCoverageEligible,contractFor,coverageEligible,commonObservationPeriods,inRanges,compactPeriods,exclusionLabel}=require('../../src/lib/historicalCoverage.ts');
const {regionalHistoricalPoints}=require('../../src/lib/regionalComparison.ts');
const json=p=>JSON.parse(fs.readFileSync(p));
const inventory=json('src/data/data-coverage/historical_recovery_inventory.json');
const closure=json('docs/data-coverage/historical_coverage_closure_2026-11-10.json');
const observations=json('src/data/observations/observations.json').records;
const history=json('public/research-data/annual_history_runtime.json');
const rows=[...observations.map(p=>({...p,comparable:p.comparability_status!=='definition_mismatch'&&p.comparability_status!=='not_applicable'&&p.applicability_status!=='not_applicable'})),...history.records.map(r=>({country_slug:r[0],indicator:r[1],year:r[2],value:r[3],unit:r[4],comparable:true}))];
const expand=ranges=>{const out=[];for(const r of ranges){const [a,b=a]=r.split('–');for(let y=+a;y<=+b;y++)out.push(String(y));}return out;};
test('ten industrial-electricity contracts and every pair reproduce the approved matrix, not a global interval',()=>{
 const indicator='industrial_electricity_price',rule=inventory.comparability.national_annual[indicator];assert.equal(rule.countries.length,10);
 for(const country of rule.countries){const c=contractFor(inventory,country,indicator);assert.ok(c);const matrix=closure.matrix.find(r=>r.key===c.key);assert.equal(matrix.admitted_periods,c.admitted.periods);}
 for(const [pair,expected] of Object.entries(rule.pairwise)){
  const actual=annualCommonPeriods(inventory,pair.split('|'),indicator,rows.filter(r=>r.indicator===indicator));assert.deepEqual(actual,expand(expected.ranges),pair);
 }
 assert.equal(annualCoverageEligible(inventory,'romania',indicator,2022),false);
 assert.equal(annualCoverageEligible(inventory,'romania',indicator,2023),true);
});
test('different country histories preserve pair-specific years and internal official holes',()=>{
 for(const indicator of ['automotive_export_share','fdi_inflow','real_gdp_growth']){
  for(const [pair,expected] of Object.entries(inventory.comparability.national_annual[indicator].pairwise)){
   const result=annualCommonPeriods(inventory,pair.split('|'),indicator,rows.filter(r=>r.indicator===indicator));
   // Floors can exclude canonical pre-break values even if the inventory records them as descriptive admission.
   assert.ok(result.every(p=>inRanges(p,expected.ranges)),pair);
  }
 }
 const pair=['austria','slovakia'];const actual=annualCommonPeriods(inventory,pair,'automotive_export_share',rows.filter(r=>r.indicator==='automotive_export_share'));
 assert.ok(actual.includes('2014'));assert.ok(!actual.includes('2015'));assert.ok(!actual.includes('2017'));assert.ok(actual.includes('2018'));
});
test('all 328 vintage-held periods remain excluded, including null canonical years and future refresh cells',()=>{
 let held=0;
 for(const c of inventory.series)for(const g of c.missing.periods)if(g.category===8&&/held/.test(g.reason)){held++;assert.equal(coverageEligible(c,g.from),false);}
 assert.equal(held,328);
 const c=contractFor(inventory,'hungary','fdi_inflow');assert.equal(coverageEligible(c,'2025'),false);assert.match(exclusionLabel(8,'held_overlap_mismatch',true),/Vintage held/);
});
test('actual intersections reject nulls, gaps, units, levels and NUTS versions',()=>{
 const p=(period,value=1,patch={})=>({period,value,unit:'EUR',frame:'NUTS3|NUTS2024',eligible:true,...patch});
 const a=[p('2011'),p('2012'),p('2014')],b=[p('2011'),p('2013'),p('2014')];
 assert.deepEqual(commonObservationPeriods([a,b]),['2011','2014']);
 for(const patch of [{value:null},{value:NaN},{unit:'PPS'},{frame:'NUTS2|NUTS2024'},{frame:'NUTS3|NUTS2021'},{eligible:false}])assert.deepEqual(commonObservationPeriods([[p('2020')],[p('2020',1,patch)]]),[]);
 assert.deepEqual(commonObservationPeriods([[],a]),[]);
});
test('regional GDP per capita actual stable history matches Hungary Poland Romania Slovakia inventory years',()=>{
 const countries=['hungary','poland','romania','slovakia','germany'];
 for(const country of countries){
  const runtime=json(`public/research-data/regional-history/${country}.json`),points=regionalHistoricalPoints(runtime).filter(p=>p.indicator==='regional_gdp_per_capita');
  const stored=json(`public/data/regional/v089/map-observations/${country}.json`).records.filter(r=>r.region_indicator_id==='regional_gdp_per_capita');
  const regionIds=[...new Set([...points.map(p=>p.region_id),...stored.map(r=>r.region_id)])];
  const groups=regionIds.map(id=>[...stored.filter(r=>r.region_id===id).map(r=>({period:r.year,value:r.value,unit:r.unit,eligible:true,frame:'country'})),...points.filter(p=>p.region_id===id&&p.status==='comparable_stable_code').map(p=>({period:p.year,value:p.value,unit:p.unit,eligible:true,frame:'country'}))]);
  const actual=commonObservationPeriods(groups);const expected=inventory.comparability.regional.regional_gdp_per_capita.by_country[country].common_comparable_years.ranges;
  assert.deepEqual(actual,expand(expected),country);
  if(country==='germany')assert.ok(!actual.includes('2013'));
  if(country!=='slovakia')assert.ok(points.some(p=>p.status!=='comparable_stable_code'),country+' descriptive history preserved');
 }
});
test('coverage text keeps classification, dates, frequencies and gaps distinct',()=>{
 assert.equal(compactPeriods(['2011','2012','2014']), '2011–2012, 2014');
 assert.equal(compactPeriods(['2020-01','2020-03']), '2020-01, 2020-03');
 assert.match(exclusionLabel(6,'NUTS boundary backcast',true),/NUTS/);
 assert.match(exclusionLabel(6,'definition floor',true),/definition/);
 assert.match(exclusionLabel(4,'empty cell',true),/Officially missing/);
 assert.match(exclusionLabel(1,'after canonical',true),/refresh/);
 assert.equal(coverageEligible(null,'2020'),false);
});
