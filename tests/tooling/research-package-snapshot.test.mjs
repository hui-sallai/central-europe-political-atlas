import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire, Module} from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, file);

const {buildSnapshot, sourceInstitution} = require('../../src/lib/researchSnapshot.ts');
const {buildZip} = require('../../src/lib/clientZip.ts');
const {inspectSnapshot} = require('../../src/lib/researchPackageSnapshot.ts');
const timestamp = '2026-11-25T10:22:03.000Z';
const observations = JSON.parse(fs.readFileSync('src/data/observations/observations.json')).records;
function annualRow(record) {
  return {id:record.id, country:record.country_slug, indicator:record.indicator, period:String(record.year),
    value:record.value, unit:record.unit, layer:'formal_observation', status:record.status,
    source:{institution:sourceInstitution(record.source_name,record.source_url), dataset:record.source_name,
      source_url:record.source_url, source_layer:'formal', updated_at:record.updated_at, unit:record.unit, status:record.status}};
}
const observed = annualRow(observations.find(r => r.id==='macro:germany:gdp_current_eur:2021'));
const pending = annualRow(observations.find(r => r.country_slug==='germany' && r.status==='pending' && r.source_url.startsWith('https://')));
function input(rows=[observed], overrides={}) {
  return {title:'Data Explorer', locale:'en', view_type:'annual', page_path:'/en/data/',
    shareable_view_url:'https://hy-central-europe-analysis.org/en/data/', filters:{country:'germany'},
    countries:[...new Set(rows.map(r => r.country))], indicators:[...new Set(rows.map(r => r.indicator))], rows, ...overrides};
}
function bytes(sample, mutations={}) {
  const files = buildSnapshot(sample, timestamp).files.map(f => ({...f, content:mutations[f.name]?.(f.content) ?? f.content}));
  return buildZip(files,timestamp);
}
const sha = b => createHash('sha256').update(b).digest('hex');
async function rejected(data, code) {
  await assert.rejects(inspectSnapshot(data), error => error.code===code);
}

test('UTF-8 bilingual STORE exports retain observed and missing annual rows with their source revisions and exact artifact digests', async()=>{
  for(const locale of ['zh-CN','en']) {
    const data = bytes(input([observed,pending],{locale}));
    const a = await inspectSnapshot(data);
    assert.equal(a.sha256,sha(data)); assert.equal(a.byteLength,data.length);
    assert.deepEqual(a.rows.map(r=>[r.id,r.value,r.status,r.frequency]),[
      [observed.id,observed.value,observed.status,'annual'],[pending.id,null,'pending','annual']]);
    assert.deepEqual(a.sources.map(s=>[s.source_url,s.updated_at]),[observed,pending].map(r=>[r.source.source_url,r.source.updated_at]));
    assert.equal(a.figure,null);
  }
});

test('quoted CSV preserves embedded commas, quotes, line endings, Unicode, writer-protected formulas and negative numbers', async()=>{
  // Reserved-character text is synthetic; no additional observations are admitted.
  const label='quoted "value",\r\n第二行';
  const row={...observed,value:-1.25,comment:label,note:'=SUM(A1)',source:{...observed.source,dataset:'=synthetic formula marker'}};
  const data=bytes(input([row])), a=await inspectSnapshot(data);
  assert.deepEqual([a.rows[0].value,a.rows[0].extras.comment,a.rows[0].extras.note],[-1.25,label,"'=SUM(A1)"]);
  assert.equal(a.sources[0].dataset,'=synthetic formula marker');
  await rejected(bytes(input([row]),{'sources.csv':s=>s.replace("'=synthetic","=synthetic")}), 'source_mismatch');
  await rejected(bytes(input([row]),{'data.csv':s=>s.replace("'=SUM","=SUM")}), 'unsafe_content');
});

test('tampered inventories, noncanonical manifest keys, missing CSV columns and mismatched references fail closed',async()=>{
  const sample=input();
  const manifest = mutate => s => {const m=JSON.parse(s); mutate(m);return JSON.stringify(m,null,2)+'\n';};
  for(const [mutations,code] of [
    [{'manifest.json':manifest(m=>m.observation_count++)},'inconsistent_scope'],
    [{'manifest.json':manifest(m=>m.files.reverse())},'invalid_inventory'],
    [{'manifest.json':manifest(m=>m.time_range.to='2026')},'invalid_manifest'],
    [{'manifest.json':s=>s.replace('"locale":','"locale": "en",\n  "locale":')},'invalid_manifest'],
    [{'data.csv':s=>s.replace('"id","country"','"id","id"')},'invalid_csv'],
    [{'data.csv':s=>s.replace('"source-1"','"source-2"')},'source_mismatch'],
    [{'data.csv':s=>s.slice(0,-2)},'invalid_csv'],
    [{'sources.csv':s=>s.replace('source-1','wrong-source')},'source_mismatch'],
    [{'citation.txt':s=>s+'other material'},'invalid_manifest'],
    [{'view-url.txt':s=>s+'#changed'},'invalid_manifest'],
    [{'README.md':s=>s+'unrecorded content'},'invalid_manifest'],
  ]) await rejected(bytes(sample,mutations),code);
});

test('contradictory missing states, units, layers, dates, frequencies and country or indicator scopes are rejected',async()=>{
  for(const [sample,code] of [
    [input([{...observed,value:null}]),'invalid_observation'],
    [input([{...pending,value:0}]),'invalid_observation'],
    [input([{...observed,source:undefined}]),'source_mismatch'],
    [input([{...observed,unit:'synthetic second unit'}]),'source_mismatch'],
    [input([{...observed,layer:'historical_descriptive'}]),'source_mismatch'],
    [input([{...observed,layer:'unsupported_private_model'}]),'invalid_observation'],
    [input([{...observed,period:'2021-13'}]),'invalid_observation'],
    [input([{...observed,period:'2021-12'}]),'inconsistent_scope'],
    [input([observed,observed]),'invalid_observation'],
    [input([observed],{countries:['austria']}),'inconsistent_scope'],
    [input([observed],{indicators:['unemployment_rate']}),'inconsistent_scope'],
    [input([{...observed,source:{...observed.source,updated_at:'2026-02-31'}}]),'source_mismatch'],
  ]) await rejected(bytes(sample),code);
});

test('explicit native country, indicator and period filters cannot contradict rows; qualified metric keys and annual boundaries transfer',async()=>{
  const monthly={...observed,period:'2021-06'};
  const make=(filters)=>input([monthly],{view_type:'high_frequency',filters});
  const safe=await inspectSnapshot(bytes(make({country:'germany',indicator:'monthly:'+observed.indicator,from:'2021',to:'2021'})));
  assert.equal(safe.rows[0].frequency,'monthly');
  for(const filters of [
    {country:'poland'}, {countries:['serbia']}, {indicator:'monthly:other_indicator'},
    {area:'scope:euro_area'}, {driver:'other_indicator'}, {from:'2022'}, {to:'2021-05'},
  ]) await rejected(bytes(make(filters)),'inconsistent_scope');
});

test('unsafe URL schemes and executable markup in metadata, row extras and source fields are rejected',async()=>{
  for(const sample of [
    input([observed],{shareable_view_url:'https://example.org/en/data/'}),
    input([observed],{filters:{help_url:'file:///private/example'}}),
    input([{...observed,comment:'<script>0</script>'}]),
    input([{...observed,documentation_url:'http://example.org/path'}]),
    input([{...observed,source:{...observed.source,source_url:'https://user@example.org/'}}]),
    input([observed],{limitations:['![external](https://example.org/picture)']}),
  ]) await rejected(bytes(sample),'unsafe_content');
});

test('untrusted static figure metadata and figure digest are separate from data membership and render correctness',async()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg"><title>GDP</title><rect width="10" height="8" fill="#fff"/></svg>';
  const metadata={selection:'current_filtered_rows',palette:'neutral_print',title:'Data Explorer'};
  const sample=input([observed],{figure:{name:'figure.svg',svg,metadata}});
  const a=await inspectSnapshot(bytes(sample));
  assert.deepEqual(a.figure,{name:'figure.svg',sha256:sha(svg),byteLength:Buffer.byteLength(svg),metadata,input_relationship:'unverified',attachment:'quarantined'});
  for(const bad of ['<svg><foreignObject/></svg>','<svg><image href="https://example.org/a.png"/></svg>',
    '<svg><path onload="example"/></svg>','<svg><rect fill="url(https://example.org/file)"/></svg>','<svg><g></svg>']){
    await rejected(bytes(sample,{'figure.svg':()=>bad}),'unsupported_figure');
  }
});

function styledChart(style) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><line style="' + style + '"/></svg>';
  return bytes(input([observed], {figure:{name:'figure.svg', svg, metadata:{
    selection:'current_filtered_rows', palette:'neutral_print', title:'Data Explorer',
  }}}));
}

test('native chart stroke widths and dash lists remain inspectable and quarantined', async () => {
  for (const style of [
    'stroke-width:0', 'stroke-width:2.2;', 'stroke-width:.75',
    'stroke-dasharray:4 2', 'stroke-dasharray:1, 2.5, .5',
    '  stroke-width: 1.2;\tstroke-dasharray: 4 , 2;\r\n',
  ]) {
    const result = await inspectSnapshot(styledChart(style));
    assert.equal(result.figure.attachment, 'quarantined');
    assert.equal(result.figure.input_relationship, 'unverified');
  }
});

test('stroke style grammar rejects malformed declarations, other properties, resource references and invalid decimals', async () => {
  for (const style of [
    '', ' ', 'stroke-width', 'stroke-width:;', ';stroke-width:1', 'stroke-width:1;;',
    'stroke-width:1 stroke-dasharray:4 2', 'opacity:1', 'stroke-width:1;fill:red',
    'stroke-width:url(https://example.invalid/style)', 'stroke-width:2px',
    'stroke-width:1.', 'stroke-width:.', 'stroke-width:1.2.3', 'stroke-width:-1', 'stroke-width:1e2',
    'stroke-width:1 2', 'stroke-dasharray:1,,2', 'stroke-dasharray:,2', 'stroke-dasharray:2,',
  ]) await rejected(styledChart(style), 'unsupported_figure');
});

test('style length and declaration budgets enforce exact boundaries independently of elapsed time', async () => {
  const valid = 'stroke-width:1';
  const atLength = valid.padEnd(1024, ' ');
  const atCount = Array(16).fill(valid).join(';');
  for (const style of [atLength, atCount]) {
    assert.equal((await inspectSnapshot(styledChart(style))).figure.attachment, 'quarantined');
  }
  for (const style of [atLength + ' ', atCount + ';' + valid, valid.padEnd(8192, '0')]) {
    await rejected(styledChart(style), 'size_limit');
  }
  await rejected(styledChart('stroke-width:bad;'.repeat(16)), 'unsupported_figure');
});

test('ordinary SVG attribute checks retain the URI restriction on non-style attributes', async () => {
  const figure = {
    name:'figure.svg',
    svg:'<svg xmlns="http://www.w3.org/2000/svg"><path id="series-code-2026"/></svg>',
    metadata:{selection:'current_filtered_rows', palette:'neutral_print', title:'Data Explorer'},
  };
  const sample = input([observed], {figure});
  assert.equal((await inspectSnapshot(bytes(sample))).figure.attachment, 'quarantined');
  await rejected(bytes(sample, {'figure.svg': svg => svg.replace('series-code-2026', 'https://example.invalid/document')}), 'unsupported_figure');
});
