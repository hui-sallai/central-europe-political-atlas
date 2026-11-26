// Synthetic imported notebook for parser acceptance. All titles, observations and source IDs are test data.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename);

const { emptyNotebook, addNotebookEvidence, parseNotebook } = require('../../src/lib/researchNotebook.ts');
const { buildReportCitationBundle } = require('../../src/lib/notebookCitations.ts');
const collected = '2026-10-01T11:11:11.000Z';
const reportTime = '2026-11-26T19:30:00.000Z';
const url = 'https://example.org/a_b/%7Bseries%7D?unit=50%25&lang=hu#part_2';
const title = String.raw`Árvíztűrő tükörfúrógép 中文 {archive} 50% A&B _ # $ ^ ~ \AtlasMarker{}`;
const institution = String.raw`Intézmény 机构 } \AtlasMarker{ S&A`;

export function parserFixture() {
  const original = { dataset:title, institution, url, layer:'fixture-layer', retrieved_at:'2024-02-29', updated_at:'2025-04-30' };
  const secondRevision = { ...original, retrieved_at:'2025-01-09', updated_at:'2025-05-01' };
  const undated = { institution:'Őrség', dataset:'未注明日期', url:'https://example.org/undated', layer:'fixture-layer' };
  const draft = {
    type:'series_view', title:'Áttekintés / 历史', url:'https://hy-central-europe-analysis.org/en/data/?country=hungary&tab=compare',
    canonical_ids:['synthetic-parser-fixture'], countries:['hungary'], periods:[], layer:'descriptive', metadata:{},
    warnings:[], sources:[original, secondRevision, undated],
  };
  const collectedNotebook = addNotebookEvidence(emptyNotebook('en','v2.0',collected),draft,'v2.0',collected);
  const ids = ['key/one', 'key?one', 'ű'.repeat(100)];
  const imported = parseNotebook(JSON.stringify({
    ...collectedNotebook, notebook_id:'synthetic-parser-notebook',
    sources:collectedNotebook.sources.map((source, i) => ({ ...source, id:ids[i] })),
    items:[{ ...collectedNotebook.items[0], id:ids[0], source_ids:ids }],
  }));
  return {bundle:buildReportCitationBundle(imported,[ids[0]],'en',reportTime,'standard','synthetic-project'), url, title, institution};
}
