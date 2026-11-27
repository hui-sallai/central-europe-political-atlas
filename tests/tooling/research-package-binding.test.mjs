import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire, Module} from 'node:module';

const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args);
};
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true},
}).outputText, f);
const {emptyNotebook, addNotebookEvidence} = require('../../src/lib/researchNotebook.ts');
const {notebookObservation, notebookSnapshotView} = require('../../src/components/notebookEvidence.ts');
const {buildSnapshot, sourceInstitution} = require('../../src/lib/researchSnapshot.ts');
const {buildZip} = require('../../src/lib/clientZip.ts');
const {inspectSnapshot} = require('../../src/lib/researchPackageSnapshot.ts');
const {compareSnapshotEvidence} = require('../../src/lib/researchPackageBinding.ts');
const get = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const captured = '2026-11-25T10:00:00Z', exported = '2026-11-26T10:00:00Z';
const origin = 'https://hy-central-europe-analysis.org', version = 'v2.0';
const url = origin + '/data/';
function doc(draft) {
  return addNotebookEvidence(emptyNotebook('en', version, captured), draft, version, captured);
}
function view(view_type, rows, filters, params={}) {
  return {title:'Isolated export fixture',locale:'en',view_type,page_path:'/data/',shareable_view_url:url,
    countries:[...new Set(rows.map(r=>r.country))],indicators:[...new Set(rows.map(r=>r.indicator))],filters,rows,...params};
}
async function artifact(input, time=exported) {
  return inspectSnapshot(buildZip(buildSnapshot(input, time).files, time));
}
function compare(book, data) {return compareSnapshotEvidence(book, book.items[0].id, data);}
function recordRow(r) {
  return {id:r.id, country:r.country_slug, indicator:r.indicator, period:String(r.year), value:r.value, unit:r.unit,
    layer:'formal_observation', status:r.status, source:{institution:sourceInstitution(r.source_name, r.source_url),
      dataset:r.source_name, source_url:r.source_url, source_layer:'formal', updated_at:r.updated_at, unit:r.unit, status:r.status}};
}
const data = get('src/data/observations/observations.json').records;
const de = recordRow(data.find(r=>r.id==='macro:germany:gdp_current_eur:2021'));
const single = r=>view('annual',[r],{country:r.country,indicator:r.indicator});
const saveObservation = r=>doc(notebookObservation({...r,source:{...r.source,source_layer:r.layer}},url,r.indicator));

test('admitted annual row matches exact recorded value, native source edge and explicit missing state without certifying the collection date',async()=>{
  for (const row of [de, recordRow(data.find(r=>r.value===null && r.source_url?.startsWith('https://') && r.source_name))]) {
    const book=saveObservation(row), before=JSON.stringify(book);
    const raw=await artifact(single(row)), result=compare(book,raw);
    assert.equal(result.status,'exact_recorded_observation');
    assert.deepEqual(result.matched_row_ids,[row.id]);
    assert.deepEqual(result.source_relationships[0],{snapshot_source_id:'source-1',notebook_source_ids:book.items[0].source_ids,
      status:'matched_recorded_fields',differences:[]});
    assert.equal(raw.rows[0].value,row.value);
    assert.deepEqual([raw.rows[0].unit,raw.rows[0].period,raw.rows[0].layer],[row.unit,row.period,row.layer]);
    assert.equal(result.historical_provenance.status,'unverified');
    assert.equal(result.historical_provenance.temporal_relation,'artifact_declared_after_collection');
    assert.equal(JSON.stringify(book),before);
    for (const [time,relation] of [[captured,'same_declared_time'],['2020-01-01T00:00:00Z','artifact_declared_before_collection']]) {
      const other=compare(book,await artifact(single(row),time));
      assert.equal(other.historical_provenance.temporal_relation,relation);
      assert.equal(other.historical_provenance.same_operation_capture_receipt,null);
    }
  }
});

test('synthetic modifications to value, units, source revision and recorded metadata cannot produce an exact observation match',async()=>{
  const book=saveObservation(de);
  for(const changed of [
    {...de,value:de.value+1},
    {...de,unit:'synthetic incompatible unit',source:{...de.source,unit:'synthetic incompatible unit'}},
    {...de,source:{...de.source,updated_at:'2026-11-11'}},
    {...de,layer:'historical_descriptive',source:{...de.source,source_layer:'history'}},
  ]) assert.equal(compare(book,await artifact(single(changed))).status,'conflicting_correspondence');
  const incomplete=saveObservation({...de,value:undefined});
  assert.equal(compare(incomplete,await artifact(single(de))).status,'partial_correspondence');
  const differentId={...de,id:'synthetic-different-id'};
  assert.equal(compare(book,await artifact(single(differentId))).status,'insufficient_information');
  const withoutDate={...de,source:{...de.source,updated_at:undefined}};
  assert.equal(compare(book,await artifact(single(withoutDate))).source_relationships[0].status,'incomplete');
});

test('real monthly and macro source-native rows retain transformation, temporal frequency and descriptive-history layer', async()=>{
  const hf=get('src/data/high-frequency/high_frequency_observations.json').records[0];
  const monthly={id:hf.observation_id,country:hf.country,indicator:hf.indicator,period:hf.period,value:hf.value,unit:hf.unit,
    layer:'formal_observation',status:hf.data_status,seasonal_adjustment:hf.seasonal_adjustment,
    source:{institution:hf.source,dataset:hf.source_dataset,source_url:hf.source_url,source_layer:'formal_observation',unit:hf.unit,definition:hf.definition_version}};
  const m=get('public/research-data/macro_driver_runtime.json').records.find(r=>r[2]==='czechia' && r[5]!==null);
  const macro={id:m[0],indicator:m[1],country:m[2],period:m[4],value:m[5],unit:m[6],transformation:m[7],
    layer:'formal_observation',status:m[15]??m[11],source:{institution:sourceInstitution(m[9],m[10]),dataset:m[9],source_url:m[10],
      source_layer:'formal_observation',unit:m[6],definition:m[12],source_code:m[18]}};
  const h=get('src/data/historical/monthly_descriptive_history.json'), hr=h.records.find(r=>r.series===m[1]&&r.country_slug===m[2]);
  const hs=h.series_sources.find(s=>s.source_ref===hr.source_ref);
  const past={id:hr.id,country:hr.country_slug,indicator:hr.series,period:hr.period,value:hr.value,unit:hs.unit,layer:'historical_descriptive',status:hr.value_status,
    transformation:'level',source:{institution:hs.source,dataset:hs.series,source_url:hs.source_url,source_layer:'historical_descriptive',unit:hs.unit,definition:hs.definition}};
  for(const sample of [view('high_frequency',[monthly],{indicator:monthly.indicator,frequency:'monthly'}),
    view('macro_drivers',[macro,past],{driver:macro.indicator,area:macro.country,transformation:macro.transformation,history:true})]){
    const book=doc(notebookSnapshotView(sample)), inspected=await artifact(sample);
    const match=compare(book,inspected);
    assert.equal(match.status,'partial_correspondence');
    assert.ok(match.source_relationships.some(s=>s.differences.includes('statistical_definition_unrecorded')));
    assert.ok(inspected.rows.every(r=>r.frequency==='monthly'));
    assert.deepEqual(inspected.rows.map(r=>r.value),sample.rows.map(r=>r.value));
    assert.deepEqual(inspected.manifest.data_layers,[...new Set(sample.rows.map(r=>r.layer))]);
    const field=sample.view_type==='macro_drivers'?'transformation':'frequency';
    const modified=doc(notebookSnapshotView({...sample,filters:{...sample.filters,[field]:field==='frequency'?'quarterly':'synthetic-other-transformation'}}));
    assert.equal(compare(modified,inspected).status,'conflicting_correspondence');
  }
});

test('national comparison retained row IDs and URL-deduped sources can differ from harmonized and side-by-side exported rows',async()=>{
  const years=['2021','2022'];
  const rows=data.filter(r=>['germany','austria'].includes(r.country_slug)&&r.indicator===de.indicator&&years.includes(String(r.year))).map(r=>{
    const row=recordRow(r);
    return {...row,cross_country_comparable:true,definition:r.source_dataset,comparison_frame:'annual:'+r.indicator,
      source:{...row.source,source_layer:row.layer,definition:r.source_dataset}};
  });
  assert.equal(rows.length,4);
  for(const mode of ['side_by_side','harmonized']){
    const countries=['germany','austria'], filter={countries,indicator:'annual:'+de.indicator,from:years[0],to:years[1],mode,frequency:'annual'};
    const narrow=rows.filter(r=>r.period==='2022');
    const sample=view(mode==='harmonized'?'country_comparison':'annual',narrow,{...filter,period:'2022',view:'bar'},
      {countries,comparability_status:mode==='harmonized'?'actual_common_eligible_observations':'side_by_side_no_harmonization',
        comparison:{mode,reference_period:'2022',actual_common_periods:years,ranking:false}});
    const saved=doc({type:'country_comparison',url,title:'Isolated national comparison',countries,periods:years,
      canonical_ids:rows.map(r=>r.id),sources:[...new Map(rows.map(r=>[r.source.source_url,{institution:r.source.institution,
        dataset:r.definition,url:r.source.source_url,layer:r.layer,original_unit:r.unit}])).values()],layer:'descriptive_comparison',
      warnings:['Configuration, not a frozen dataset or a causal conclusion. Missing observations are not filled.'],
      metadata:{filters:filter,row_count:rows.length,entersModel:false}});
    const result=compare(saved,await artifact(sample));
    assert.equal(result.status,'partial_correspondence');
    assert.ok(result.differences.includes('recorded_row_set_differs'));
    assert.deepEqual(result.matched_row_ids,narrow.map(r=>r.id));
    assert.ok(result.differences.includes('row_count_unrecorded_or_differs'));
  }
});

test('SORS native annual, monthly CPI and quarterly LFS preserve the recorded non-harmonized designation',async()=>{
  const series=get('public/research-data/serbia_sors_runtime.json').series;
  for(const [key,frequency] of [['population_estimate_sors','annual'],['cpi_index_2006','monthly'],['lfs_unemployment_quarterly','quarterly']]) {
    const s=series.find(s=>s.key===key), p=s.points.find(p=>p[1]!==null);
    const row={id:'sors:'+key+':'+p[0],indicator:s.display_indicator,country:'serbia',period:p[0],value:p[1],unit:s.unit,
      layer:'serbia_sors_descriptive',status:s.status_legend[p[3]]??p[3],original_value:p[2],original_unit:s.original_unit,
      cross_country_comparable:false,source:{institution:'Statistical Office of the Republic of Serbia (SORS/RZS)',dataset:s.dataset,
        source_url:s.source_url,source_layer:'serbia_sors_descriptive',unit:s.unit,original_unit:s.original_unit}};
    const sample=view('serbia_sors',[row],{country:'serbia',sors_series:key,frequency}, {comparability_status:'serbia_only_not_cross_country_comparable'});
    const book=doc(notebookSnapshotView(sample)), a=await artifact(sample);
    assert.equal(compare(book,a).status,'compatible_live_configuration');
    assert.equal(a.rows[0].frequency,frequency);
    assert.equal(a.rows[0].cross_country_comparable,false);
    assert.equal(a.sources[0].dataset,s.dataset);
  }
});

test('German 1990 and Hungarian 1998 native Notebook ballot selections retain their source references and remain unbound',async()=>{
  const {GET}=require('../../src/app/politics-comparison.json/route.ts');
  const {readHistorySelection,historyRows}=require('../../src/lib/electionHistoryComparison.ts');
  const {historyEvidence}=require('../../src/lib/electionHistoryEvidence.ts');
  const index=await GET().json(), a=await artifact(single(de));
  for (const [country,election,ballot,denominator] of [
    ['germany','el-de-bt-1990-12-02','first_vote',46274925], ['germany','el-de-bt-1990-12-02','second_vote',46455772],
    ['hungary','el-hu-ogy-1998-05-10','hu98_territorial_list_valid_round_vote',4547682],
  ]) {
    const query=new URLSearchParams({history_countries:country,history_events:election,history_measure:'distribution',history_ballots:election+':'+ballot});
    const {selection,errors}=readHistorySelection(query,Object.keys(index),index);
    assert.deepEqual(errors,[]);
    const rows=historyRows(selection,index), book=doc(historyEvidence(rows,selection,'en')), before=JSON.stringify(book);
    assert.equal(rows[0].ballot.voteDenominator,denominator);
    assert.deepEqual(book.items[0].metadata.filters.ballot,[election+':'+ballot]);
    assert.ok(book.items[0].source_ids.length>0);
    if(country==='hungary') assert.deepEqual(book.items[0].periods,['1998-05-10 – 1998-05-24']);
    assert.equal(compare(book,a).status,'unsupported_artifact_type');
    assert.equal(JSON.stringify(book),before);
  }
});

test('regional observation tables preserve real administrative classification, territory and figure limitations',async()=>{
  const record=get('public/research-data/region_observations.json').records.find(r=>r.country_id==='poland' && r.value!==null);
  const geography=get('public/data/boundaries/v086/spatial-boundary-manifest.json').records.find(r=>r.country_id===record.country_id);
  const row={id:record.region_observation_id,country:record.country_id,indicator:record.region_indicator_id,period:record.year,
    value:record.value,unit:record.unit,status:record.value_status,layer:'regional_descriptive',region_id:record.region_id,
    classification_system:geography.classification_system,admin_level:geography.admin_level,selected_region:true,
    source:{institution:sourceInstitution(record.source_name,record.source_url),dataset:record.source_name,source_url:record.source_url,
      source_layer:'regional_descriptive',updated_at:record.last_updated,unit:record.unit}};
  // Data-only fixture. The live map export additionally includes map.svg and rendering/legend metadata.
  const sample=view('regional_map',[row],{mode:'single',layer:row.indicator,year:row.period,classification:'quantile',selected_regions:[row.region_id]},
    {page_path:'/map/',shareable_view_url:origin+'/map/',comparability_status:'within_country_geography_only'});
  const draft=notebookSnapshotView(sample);
  const inspected=await artifact(sample);
  const saved=doc({...draft,metadata:{...draft.metadata,geography:[row.country+':'+row.classification_system+':'+row.admin_level]}});
  assert.equal(compare(saved,inspected).status,'compatible_live_configuration');
  const wrong=doc({...draft,metadata:{...draft.metadata,geography:['poland:NUTS:2']}});
  assert.equal(compare(wrong,inspected).status,'conflicting_correspondence');
  const noGeo=compare(doc(draft),inspected);
  assert.equal(noGeo.status,'partial_correspondence');
  assert.ok(noGeo.differences.includes('regional_classification_unrecorded'));
  const rendering={classification:'quantile',geographies:[{country:row.country,classification:row.classification_system,level:row.admin_level}],
    legend:[{label:'Published value'}]};
  const withFixtureFigure={...sample,figure:{name:'map.svg',svg:'<svg xmlns="http://www.w3.org/2000/svg"><title>Test geography</title></svg>',metadata:rendering}};
  const withFigure=await artifact(withFixtureFigure);
  const mapped=compare(doc(notebookSnapshotView(withFixtureFigure)),withFigure);
  assert.equal(withFigure.figure.input_relationship,'unverified');
  assert.equal(withFigure.figure.attachment,'quarantined');
  assert.equal(mapped.status,'partial_correspondence');
  assert.ok(mapped.match_evidence.includes('recorded_legend_labels'));
  await assert.rejects(artifact({...sample,figure:{name:'map.svg',svg:'<svg><foreignObject/></svg>',metadata:rendering}}));
});

test('same-URL definitions and revisions stay distinguishable when the Notebook recorded only a single source identity',async()=>{
  const code='synthetic-query';
  const older={...de,id:'synthetic-old',source:{...de.source,source_code:code,definition:'Definition A'}};
  const newer={...de,id:'synthetic-new',source:{...de.source,source_code:code,definition:'Definition B'}};
  const sample=view('annual',[older,newer],{country:de.country,indicator:de.indicator});
  const book=doc(notebookSnapshotView(sample)), inspected=await artifact(sample);
  assert.equal(book.sources.length,1);
  assert.equal(inspected.sources.length,2);
  const result=compare(book,inspected);
  assert.equal(result.status,'partial_correspondence');
  assert.ok(result.source_relationships.every(s=>s.status==='ambiguous' && s.differences.includes('notebook_source_shared_by_distinct_snapshot_records')));
  // Source revision must be checked even when every other identifier, including URL, is identical.
  const conflicting=compare(saveObservation(de),await artifact(single({...de,source:{...de.source,updated_at:'2020-01-01'}})));
  assert.equal(conflicting.source_relationships[0].status,'conflicting');
  assert.ok(conflicting.source_relationships[0].differences.includes('updated_at'));
});
