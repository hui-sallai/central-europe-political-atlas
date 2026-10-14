import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import ts from 'typescript';
const require=createRequire(import.meta.url);require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {contextPublished,contextRange,perspectiveRange,inContextRange,contextTiming,contextAnnualPoints,contextMonthlyPoints,contextDifference,contextEvents,contextCsv}=require('../../src/lib/politicalEconomicContext.ts');
const point={id:'p',country:'germany',indicator:'real_gdp_growth',frequency:'annual',period:'2021',value:3.9,unit:'%',status:'official',source:'Eurostat',sourceUrl:'https://example.org',definition:'Eurostat GDP',comparable:true,layer:'snapshot'};
test('pre-election perspective excludes overlapping annual/monthly periods, including January elections',()=>{
 assert.deepEqual(perspectiveRange('2021-09-26','year',0,0,'annual','pre_election'),{from:'2020-01-01',to:'2020-12-31'});
 assert.deepEqual(perspectiveRange('2021-09-26','year',0,0,'monthly','pre_election'),{from:'2021-01-01',to:'2021-08-31'});
 const january=perspectiveRange('2025-01-23','year',0,0,'monthly','pre_election');assert.ok(january.from>january.to);
 const custom=perspectiveRange('2021-09-26','custom',2020,2026,'monthly','pre_election');assert.equal(custom.to,'2021-08-31');assert.equal(inContextRange('2021-09',custom),false);
 assert.deepEqual(perspectiveRange('2025-02-23','following2',0,0,'annual','retrospective'),{from:'2025-01-01',to:'2027-12-31'});
});
test('context export records election date, perspective and comparison mode explicitly',()=>{
 const csv=contextCsv([point],'id',contextRange('2021-09-26','year',0,0),{electionDate:'2021-09-26',perspective:'retrospective',comparisonMode:'two_elections',referenceMode:'year'});
 assert.match(csv,/election_date/);assert.match(csv,/context_perspective/);assert.match(csv,/comparison_mode/);assert.match(csv,/"2021-09-26","retrospective","two_elections","year"/);
});
test('reference ranges are complete years; annual/monthly observations are periods, not fabricated days',()=>{
 assert.deepEqual(contextRange('2021-09-26','prior3',0,0),{from:'2018-01-01',to:'2020-12-31'});
 assert.deepEqual(contextRange('2025-02-23','prior5',0,0),{from:'2020-01-01',to:'2024-12-31'});
 assert.equal(inContextRange('2021',{from:'2021-09-26',to:'2021-09-26'}),true);assert.equal(inContextRange('2021-09',{from:'2021-09-26',to:'2021-09-26'}),true);
 assert.equal(contextTiming('2021','2021-09-26'),'overlap');assert.equal(contextTiming('2021-08','2021-09-26'),'prior');assert.equal(contextTiming('2021-10','2021-09-26'),'subsequent');
 assert.equal(inContextRange('2021',{from:'2025-01-01',to:'2021-12-31'}),false);
});
test('only published official/verified observations with provenance are exposed; zero is real, placeholders are not',()=>{
 assert.equal(contextPublished({...point,value:0}),true);for(const change of [{value:null},{status:'pending'},{status:'sample'},{status:'placeholder'},{sourceUrl:''},{value:NaN}])assert.equal(contextPublished({...point,...change}),false);
});
test('annual history does not overwrite pending canonical observations or add unrelated indicators',()=>{
 const observations=[{id:'pending',country_slug:'germany',indicator:'real_gdp_growth',year:2021,value:null,unit:'%',status:'pending',source_name:'Eurostat',source_url:'https://example.org',comparability_status:'pending'}];
 const history={sources:[{dataset:'Eurostat',url:'https://example.org'}],records:[['germany','real_gdp_growth',2021,999,'%','official',0],['germany','real_gdp_growth',2020,-4,'%','official',0],['germany','synthetic_score',2020,999,'%','official',0]]};
 const rows=contextAnnualPoints(observations,history,[]);assert.equal(rows.length,2);assert.equal(rows.find(p=>p.period==='2021').value,null);assert.equal(rows.find(p=>p.period==='2020').value,-4);
});
test('monthly current rows win over history; missing metadata or incompatible floor withholds comparisons',()=>{
 const source={source_ref:0,series:'hicp_annual_rate',country_slug:'germany',unit:'RCH_A',definition:'HICP',source:'Eurostat',source_url:'https://example.org',definition_compatible_floor:'2009-01'};
 const history={series_sources:[source],records:[['germany','hicp_annual_rate','2008-01',1,'official',0],['germany','hicp_annual_rate','2021-01',9,'official',0]]};
 const current=[['id','germany','2021-01','hicp_annual_rate',null,'','RCH_A','','','definition','Eurostat','pending']];
 const rows=contextMonthlyPoints(history,current,[]);assert.equal(rows[0].comparable,false);assert.equal(rows[1].value,null);assert.equal(rows[1].sourceUrl,'');assert.equal(rows[1].status,'pending');
});
test('differences require same frequency, exact definition/unit and relative election period; no causal score',()=>{
 const b={...point,period:'2025',value:0.2};assert.ok(Math.abs(contextDifference(point,b,'2021-09-26','2025-02-23')+3.7)<1e-10);
 for(const change of [{unit:'EUR'},{indicator:'hicp_inflation'},{definition:'other'},{frequency:'monthly',period:'2025-02'},{status:'pending'},{value:null},{period:'2024'},{comparable:false},{country:'romania'}])assert.equal(contextDifference(point,{...b,...change},'2021-09-26','2025-02-23'),null);
});
test('events use verified status, explicit country and dates only, not categories or inferred relationships',()=>{
 const events=[{id:'one',date:'2025-02-01',country_slug:'germany',data_status:'verified',source_url:'https://example.org'},{id:'pending',date:'2025-02-01',country_slug:'germany',data_status:'pending',source_url:'https://example.org'},{id:'foreign',date:'2025-02-01',country_slug:'romania',data_status:'verified',source_url:'https://example.org'}];
 assert.deepEqual(contextEvents(events,'germany',contextRange('2025-02-23','year',0,0)).map(e=>e.id),['one']);assert.deepEqual(contextEvents(events,'germany',contextRange('2021-09-26','year',0,0)),[]);
});
test('CSV exports actual periods, provenance, status and blanks, neutralises spreadsheet text without losing negative values',()=>{
 const csv=contextCsv([{...point,value:-4,source:'=formula'},{...point,id:'null',value:null,status:'pending'}],'election',contextRange('2021-09-26','year',0,0));assert.match(csv,/observation_period/);assert.match(csv,/"-4"/);assert.match(csv,/"'=formula"/);assert.match(csv,/"2021","","%"/);assert.doesNotMatch(csv,/NaN|undefined/);
});
test('real published source stores and runtimes remain unchanged and have no invented periods',()=>{
 const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));const obs=read('src/data/observations/observations.json').records,history=read('public/research-data/annual_history_runtime.json'),indicators=read('src/data/indicators/indicators.json').records,monthly=read('public/research-data/monthly_history_runtime.json'),hf=read('src/data/high-frequency/high_frequency_observations.json').records,runtime=read('public/research-data/high_frequency_runtime.json').records;
 const before=JSON.stringify([obs,history,indicators,monthly,hf,runtime]);const annual=contextAnnualPoints(obs,history,indicators);assert.equal(annual.find(p=>p.country==='germany'&&p.indicator==='real_gdp_growth'&&p.period==='2025').value,0.2);
 const meta=hf.filter(r=>r.country==='germany').map(r=>({country:r.country,indicator:r.indicator,source_url:r.source_url,source_dataset:r.source_dataset,definition_version:r.definition_version,unit:r.unit}));const rows=contextMonthlyPoints(monthly,runtime,meta).filter(p=>p.country==='germany');assert.ok(rows.some(p=>p.period==='2002-09'&&p.indicator==='hicp_annual_rate'));assert.ok(rows.some(p=>p.period==='2026-07'&&p.indicator==='hicp_annual_rate'));
 assert.equal(JSON.stringify([obs,history,indicators,monthly,hf,runtime]),before);
});
