import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire, Module } from 'node:module';

const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args);
};
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, f);
const n = require('../../src/lib/researchNotebook.ts');
const { buildReportCitationBundle } = require('../../src/lib/notebookCitations.ts');
const collected = '2026-11-25T11:14:33Z';
const generated = '2026-11-26T09:07:00+08:00';
const origin = 'https://hy-central-europe-analysis.org';
const version = 'v2.0';
const readData = name => JSON.parse(fs.readFileSync(path.resolve('src/data', name), 'utf8'));

// These Notebook collections are fixtures. Official values below are read from the admitted files;
// generic notes, missing records, and revision variants exercise the importer without changing any store.
function notebook(drafts) {
  let doc = n.emptyNotebook('en', version, collected);
  for (const draft of drafts) doc = n.addNotebookEvidence(doc, draft, version, collected);
  return n.parseNotebook(n.serializeNotebook(doc));
}
function draft(type, id, fields = {}) {
  return {
    type, title: id, canonical_ids: [id], url: origin + '/en/data/', countries: [], periods: [],
    layer: 'fixture', warnings: [], metadata: {}, sources: [], ...fields,
  };
}
function bundle(doc, ids = doc.items.map(i => i.id)) {
  return buildReportCitationBundle(doc, ids, 'en', generated, 'comparative_note', 'project-fixture');
}
function electionEvidence(country, year, voteType) {
  const rows = readData('political/' + country + '/election_turnout.json');
  const sourceRegister = readData('political/' + country + '/political_source_registry.json');
  const row = rows.find(r => r.election_id.includes('-' + year + '-') && r.vote_type === voteType);
  const src = sourceRegister.find(s => s.source_id === row.provenance[0].source_id);
  const denominator = row.valid_second_votes ?? row.valid_votes;
  const ballot = { vote_type: voteType, valid_vote_denominator: denominator, ...(row.round_scope ? {round_scope: row.round_scope} : {}) };
  return draft('series_view', row.election_id, {
    countries: [country], periods: row.round_composition?.map(r => r.date) || [row.election_id.slice(-10)],
    url: origin + '/en/politics/' + country + '/?election=' + row.election_id,
    layer: 'political', sources: [{institution: src.institution, dataset: src.dataset, url: src.url,
      layer: 'political', code: src.source_id, retrieved_at: src.retrieved_at}],
    warnings: [row.turnout_definition], metadata: {filters: ballot},
  });
}

test('German 1990 ballot denominators and Hungary 1998 valid-round context retain canonical IDs and official source edges', () => {
  const doc = notebook([electionEvidence('germany', 1990, 'first_vote'), electionEvidence('germany', 1990, 'second_vote'),
    electionEvidence('hungary', 1998, 'hu98_territorial_list_valid_round_vote')]);
  const [deFirst, deSecond, hu] = doc.items;
  const {manifest: m, cslJson} = bundle(doc, [hu.id, deSecond.id, deFirst.id]);
  assert.deepEqual(m.evidence.map(i => i.metadata.filters.valid_vote_denominator), [4547682, 46455772, 46274925]);
  assert.equal(m.evidence[0].metadata.filters.round_scope, 'valid_round_composite');
  assert.deepEqual(m.evidence[0].periods, ['1998-05-10', '1998-05-24']);
  assert.deepEqual(m.evidence[0].canonical_ids, ['el-hu-ogy-1998-05-10']);
  assert.deepEqual(m.evidence[1].canonical_ids, ['el-de-bt-1990-12-02']);
  assert.deepEqual(m.sources.map(s => s.code), ['src-hu-nvi-archive-1998', 'src-de-bwl-final-archive']);
  assert.deepEqual(m.sources.map(s => s.evidence_ids), [[hu.id], [deSecond.id, deFirst.id]]);
  const entries = new Map(JSON.parse(cslJson).map(c => [c.id, c]));
  for (const s of m.sources) {
    assert.equal(entries.get(s.citation_id).URL, s.url);
    assert.equal(s.publication_date, null);
    assert.equal(s.document_type, null);
    assert.ok(s.missing_bibliographic_fields.includes('doi'));
    assert.ok(!('issued' in entries.get(s.citation_id)));
  }
  for (const item of m.evidence) {
    assert.equal(item.reproducibility, 'live_research_configuration');
    assert.equal(entries.get(item.view_citation_id).URL, item.url);
    assert.ok(item.source_ids.every(id => m.sources.find(s => s.id === id).evidence_ids.includes(item.id)));
  }
});

function descriptiveEvidence() {
  const a = readData('historical/annual_descriptive_history.json').records[0];
  const m = readData('historical/monthly_descriptive_history.json');
  const r = m.records[0], s = m.series_sources.find(source => source.source_ref === r.source_ref);
  return [
    draft('observation', a.id, {value: a.value, unit: a.unit, layer: 'descriptive_annual', countries: [a.country_slug],
      periods: [String(a.year)], comparability: a.comparability_status, metadata: {filters: {frequency: 'annual', definition: a.definition}},
      sources: [{institution: a.source, dataset: a.source_dataset, url: a.source_query_url, layer: 'descriptive_annual', updated_at: a.updated_at}]}),
    draft('observation', r.id, {value: r.value, unit: s.unit, layer: 'descriptive_monthly', countries: [r.country_slug],
      periods: [r.period], comparability: s.comparability_status, metadata: {filters: {frequency: 'monthly', definition: s.definition}},
      sources: [{institution: s.source, dataset: s.series, url: s.source_url, layer: 'descriptive_monthly', original_unit: s.unit}]}),
  ];
}
test('descriptive annual and monthly values, source definitions, macro configuration, missing and absent values remain distinct', () => {
  const [annual, monthly] = descriptiveEvidence();
  const loading = 'Some source files could not be loaded. This package contains only loaded observations, not proof of official absence.';
  const doc = notebook([annual, monthly, draft('series_view', 'fixture-driver', {url: origin + '/data/?tab=macro_drivers',
    warnings: [loading], metadata: {filters: {transformation: 'level'}, row_count: 0}}),
  draft('observation', 'fixture-null', {value: null}), draft('observation', 'fixture-absent')]);
  const {manifestJson} = bundle(doc);
  const m = JSON.parse(manifestJson);
  for (const [index, original] of [annual, monthly].entries()) {
    assert.deepEqual(m.evidence[index].canonical_ids, original.canonical_ids);
    assert.equal(m.evidence[index].value, original.value);
    assert.equal(m.evidence[index].unit, original.unit);
    assert.equal(m.evidence[index].comparability, original.comparability);
    assert.deepEqual(m.evidence[index].metadata, original.metadata);
    assert.deepEqual(m.evidence[index].periods, original.periods);
    assert.equal(m.evidence[index].reproducibility, 'recorded_observation');
  }
  assert.equal(m.evidence[2].reproducibility, 'live_research_configuration');
  assert.deepEqual(m.evidence[2].metadata.filters, {transformation: 'level'});
  assert.ok(m.limitations.evidence[2].codes.includes('incomplete_source_loading'));
  assert.ok(m.limitations.evidence[3].codes.includes('value_explicitly_missing'));
  assert.equal(m.evidence[3].value, null);
  assert.ok(m.limitations.evidence[4].codes.includes('value_unrecorded'));
  assert.ok(!('value' in m.evidence[4]));
  assert.equal(m.limitations.snapshot_binding, 'no_verified_artifact_attached');
});

test('mixed report keeps selected order, notes, layer/revision-specific source edges and method restrictions', () => {
  const [annual] = descriptiveEvidence();
  const source = annual.sources[0];
  const revised = {...source, updated_at: '2026-01-07'};
  const otherLayer = {...source, layer: 'fixture-regional'};
  const excludedOnly = 'Fixture warning belonging only to omitted evidence';
  const doc = notebook([electionEvidence('hungary', 1998, 'hu98_territorial_list_valid_round_vote'), annual,
    draft('regional_view', 'fixture-map', {sources: [source, otherLayer], metadata: {selected_regions: ['HU11']}}),
    draft('event', 'fixture-thematic-case', {sources: [revised], warnings: ['Fixture coverage warning']}),
    draft('method', 'fixture-var', {metadata: {state: 'blocked', readiness: 'IRF publication blocked'}}),
    draft('method', 'fixture-registry', {metadata: {state: 'registry_only'}}),
    draft('source', 'fixture-excluded', {sources: [{...source, dataset: 'Fixture omitted source'}], warnings: [excludedOnly]})]);
  doc.title = 'Politikai kutatás 中文'; doc.user_notes = 'My cross-case notes'; doc.research_question = 'Scope?';
  doc.items[3].note = 'My own note — not publisher prose'; doc.items[3].warning_labels = {'zh-CN': ['示例限制']};
  doc.methodology_warnings.push('Fixture project-wide warning');
  const selected = doc.items.slice(0, -1).reverse().map(i => i.id);
  const before = n.serializeNotebook(doc);
  const out = bundle(doc, selected);
  const restored = n.parseNotebook(before);
  assert.deepEqual(bundle(restored, selected), out);
  assert.equal(n.serializeNotebook(doc), before);
  const m = out.manifest;
  assert.equal(m.schema, 'atlas-research-report-manifest-v1');
  assert.deepEqual(m.selected_evidence_ids, selected);
  assert.deepEqual(m.evidence.map(i => i.id), selected);
  assert.deepEqual([m.report.generated_at, m.report.locale, m.report.template], [generated, 'en', 'comparative_note']);
  assert.deepEqual([m.project.project_id, m.project.notebook_id], ['project-fixture', doc.notebook_id]);
  assert.equal(m.project.user_authored_notes, doc.user_notes);
  assert.equal(m.evidence[2].note, doc.items[3].note);
  assert.deepEqual(m.evidence[2].warning_labels, doc.items[3].warning_labels);
  assert.deepEqual(m.report.countries, [...new Set(m.evidence.flatMap(e => e.countries))]);
  assert.deepEqual(m.limitations.project_warnings, ['Fixture project-wide warning']);
  assert.ok(!JSON.stringify(out).includes(excludedOnly));
  assert.ok(!JSON.stringify(out).includes('Fixture omitted source'));
  assert.ok(m.limitations.evidence[0].codes.includes('registry_only_method'));
  assert.ok(m.limitations.evidence[1].codes.includes('blocked_method'));
  assert.equal(m.evidence[1].reproducibility, 'recorded_reference');
  assert.equal(m.evidence[1].metadata.readiness, 'IRF publication blocked');
  const sameUrl = m.sources.filter(s => s.url === new URL(source.url).href);
  assert.equal(sameUrl.length, 3);
  assert.equal(new Set(sameUrl.map(s => s.citation_id)).size, 3);
  assert.equal(sameUrl.find(s => s.updated_at === source.updated_at && s.layer === source.layer).evidence_ids.length, 2);
  assert.ok(!Object.hasOwn(m, 'deployment_commit'));
});
test('reject malformed or oversized inputs, dangling references, duplicate selection and ambiguous export time', () => {
  const doc = notebook([draft('source', 'fixture-one')]), id = doc.items[0].id;
  assert.throws(() => bundle(doc, ['not-present']));
  assert.throws(() => bundle(doc, [id, id]));
  assert.throws(() => bundle({...doc, title: 'x'.repeat(n.notebookLimits.bytes + 1)}));
  assert.throws(() => bundle({...doc, items: [{...doc.items[0], source_ids: ['absent']}] }));
  for (const value of ['', '2026-02-30T19:00:00Z', '2026-11-26', '2026-11-26T11:12:13']) {
    assert.throws(() => buildReportCitationBundle(doc, [id], 'en', value), /date/);
  }
  assert.throws(() => buildReportCitationBundle(doc, [id], 'en', generated, 'unknown'), /template/);
  for (const projectId of [null, {}, '../project']) {
    assert.throws(() => buildReportCitationBundle(doc, [id], 'en', generated, 'standard', projectId), /project/);
  }
  const empty = buildReportCitationBundle(notebook([]), [], 'zh-CN', generated);
  assert.deepEqual(JSON.parse(empty.cslJson), []);
  assert.equal(empty.manifest.project.project_id, null);
  assert.deepEqual(empty.manifest.evidence, []);
});

test('unsafe active links in schema-valid legacy records are withheld while raw strings remain inert JSON metadata', () => {
  const src = {institution: 'Fixture', dataset: 'Fixture', layer: 'fixture', url: 'https://example.org/old\npath'};
  const doc = notebook([draft('source', 'fixture-legacy', {url: origin + '/data/%zz', sources: [src]})]);
  const out = bundle(doc);
  assert.equal(out.manifest.evidence[0].url, null);
  assert.equal(out.manifest.sources[0].url, null);
  assert.equal(out.manifest.sources[0].recorded_url, src.url);
  assert.ok(out.manifest.limitations.sources[0].codes.includes('source_link_withheld'));
  assert.ok(out.manifest.limitations.evidence[0].codes.includes('atlas_link_withheld'));
  for (const record of JSON.parse(out.cslJson)) assert.ok(!Object.hasOwn(record, 'URL'));
  assert.ok(!out.bibtex.includes('https://'));
});

test('schema-valid imported records with large format expansion fail the combined export byte limit', () => {
  const doc = notebook(Array.from({length: 4}, (_, i) => draft('source', 'size-fixture-' + i)));
  const text = '~'.repeat(1000);
  doc.sources = Array.from({length: 320}, (_, i) => ({
    id: 's-' + i, url: 'https://example.org/fixture', institution: text, dataset: text, layer: 'fixture', code: String(i),
  }));
  doc.items.forEach((item, i) => { item.source_ids = doc.sources.slice(i * 80, (i + 1) * 80).map(s => s.id); });
  assert.equal(n.validateNotebook(doc), true);
  assert.throws(() => bundle(doc), /export size limit/);
  assert.equal(bundle(doc, [doc.items[0].id]).manifest.sources.length, 80);
});
