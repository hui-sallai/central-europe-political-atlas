import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url), resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const n = require('../../src/lib/researchNotebook.ts'), b = require('../../src/lib/notebookBrief.ts');
const collected = '2026-10-01T10:00:00.000Z', exported = '2026-10-21T11:00:00.000Z';
const source = { institution: 'Original Publisher 原机构', dataset: 'Original title [a]', url: 'https://example.org/data?series=x&unit=rate', layer: 'official_annual', retrieved_at: '2026-09-20', updated_at: '2026-09-01', original_unit: '%', normalized_unit: '%' };
const draft = { type: 'observation', title: 'GDP [recorded]', labels: { en: 'Recorded GDP', 'zh-CN': '已记录 GDP' }, url: 'https://hy-central-europe-analysis.org/data/?country=germany&indicator=gdp&from=2025', canonical_ids: ['germany:gdp:2025'], countries: ['germany'], periods: ['2025'], value: -1.234567890123, unit: '%', sources: [source], layer: 'official_annual', comparability: 'Same definition only', warnings: ['Definition warning'], metadata: { status: 'published' } };
function fixture() {
  let state = n.emptyNotebook('en', 'v2.0 stored version', collected);
  state = n.addNotebookEvidence(state, draft, state.platform_version, collected);
  state = n.addNotebookEvidence(state, { ...draft, type: 'series_view', title: 'Monthly configuration', labels: undefined, value: undefined, canonical_ids: ['monthly'], periods: ['2024-01', '2025-12'], sources: [{ ...source, dataset: 'Monthly source', url: 'https://example.org/monthly' }], layer: 'monthly_descriptive', metadata: { filters: { indicator: 'hicp_annual_rate', from: '2024-01', to: '2025-12' }, row_count: 24 } }, state.platform_version, collected);
  return { ...state, title: 'My evidence 证据', research_question: 'What differs?', user_notes: 'My own note <script>alert(1)</script>\n# Not a generated heading\n===', items: state.items.map(item => ({ ...item, note: 'Exact personal note **not an interpretation**' })) };
}
test('selection and ordering are projections; existing identities, JSON and notes never change', () => {
  const state = fixture(), before = n.serializeNotebook(state), ids = state.items.map(i => i.id);
  const brief = b.buildEvidenceBrief(state, [...ids].reverse(), 'en', exported);
  assert.ok(brief.sections.findIndex(s => s.title === '1. Monthly configuration') < brief.sections.findIndex(s => s.title === '2. Recorded GDP'));
  const selected = b.buildEvidenceBrief(state, [ids[0]], 'en', exported);
  assert.ok(!JSON.stringify(selected).includes('Monthly source'));
  assert.equal(n.serializeNotebook(state), before);
  assert.equal(n.serializeNotebook(n.parseNotebook(before)), before);
  assert.throws(() => b.buildEvidenceBrief(state, [ids[0], ids[0]], 'en', exported), /selection/);
  assert.throws(() => b.buildEvidenceBrief(state, ['unknown'], 'en', exported), /selection/);
});
test('exact negative values, genuine zero, null and absent observation values stay distinct', () => {
  const state = fixture(), id = state.items[0].id;
  for (const [value, expected] of [[draft.value, String(draft.value)], [0, '0'], [null, 'Missing / unavailable'], [undefined, 'Not recorded']]) {
    const modified = { ...state, items: [{ ...state.items[0], value }] };
    const brief = b.buildEvidenceBrief(modified, [id], 'en', exported);
    assert.equal(brief.sections.find(s => s.level === 3).fields.find(f => f.label === 'Exact recorded value').value, expected);
  }
});
test('source references, layers and all four date meanings retain recorded metadata', () => {
  const state = fixture(), brief = b.buildEvidenceBrief(state, [state.items[0].id], 'en', exported), text = JSON.stringify(brief);
  for (const value of [source.institution, source.dataset, source.url, source.retrieved_at, source.updated_at, collected, exported, '2025', 'official_annual', 'v2.0 stored version', state.sources[0].id, 'Definition warning', 'Same definition only']) assert.ok(text.includes(value), value);
  assert.ok(brief.sections.find(s => s.title === state.sources[0].id).fields.some(f => f.label === 'Source retrieval date' && f.value === source.retrieved_at));
  assert.ok(brief.sections.find(s => s.level === 3).fields.some(f => f.label === 'Notebook collection date' && f.value === collected));
});
test('configurations are labelled, never enriched, and blocked method references remain blocked', () => {
  let state = fixture();
  state = n.addNotebookEvidence(state, { ...draft, type: 'method', title: 'Blocked method', labels: undefined, canonical_ids: ['blocked'], value: undefined, sources: [], layer: 'econometric_registry', metadata: { state: 'blocked', readiness: 'unavailable' } }, state.platform_version, collected);
  const brief = b.buildEvidenceBrief(state, state.items.map(i => i.id), 'en', exported);
  const configuration = brief.sections.find(s => s.title === '2. Monthly configuration');
  assert.ok(configuration.paragraphs.some(p => p.includes('Research configuration')));
  assert.ok(!configuration.fields.some(f => f.label === 'Exact recorded value'));
  assert.ok(JSON.stringify(brief).includes('blocked'));
  assert.ok(JSON.stringify(brief).includes('econometric_registry'));
  assert.ok(brief.introduction.some(p => p.includes('not frozen datasets')));
});
test('missing optional source metadata is explicit, not fabricated from collection or export dates', () => {
  const state = n.addNotebookEvidence(n.emptyNotebook('en', 'v2.0', collected), { ...draft, sources: [{ institution: 'Publisher', dataset: 'Dataset', url: 'https://example.org/', layer: 'official' }] }, 'v2.0', collected);
  const brief = b.buildEvidenceBrief(state, [state.items[0].id], 'en', exported);
  const fields = brief.sections.at(-1).fields;
  for (const label of ['Source retrieval date', 'Source update date', 'Original source unit', 'Source code']) assert.equal(fields.find(f => f.label === label).value, 'Not recorded');
});
test('Markdown escapes stored headings, HTML, links and fences; safe original URLs remain traceable', () => {
  const state = fixture(); state.items[0].note = '![image](javascript:alert(1))\n```html\n<img src=x onerror=alert(1)>\n```';
  const text = b.serializeEvidenceBrief(b.buildEvidenceBrief(state, [state.items[0].id], 'en', exported));
  assert.ok(text.startsWith('# My evidence 证据\n'));
  assert.ok(text.includes('(<https://hy-central-europe-analysis.org/data/?country=germany&indicator=gdp&from=2025>)'));
  assert.ok(text.includes('(<https://example.org/data?series=x&unit=rate>)'));
  assert.ok(!text.replaceAll('\\<', '').includes('<script>') && !text.replaceAll('\\<', '').includes('<img ') && !text.includes('\n```') && !text.includes('\n# Not a generated heading'));
  assert.ok(text.includes('\\!\\[image\\]'));
  assert.ok(text.includes('\\=\\=\\='));
  const tricky = { ...state, sources: state.sources.map(s => ({ ...s, url: 'https://example.org/a(b)?x=<tag>' })) };
  assert.ok(b.serializeEvidenceBrief(b.buildEvidenceBrief(tricky, [state.items[0].id], 'en', exported)).includes('https://example.org/a%28b%29?x=%3Ctag%3E'));
});
test('existing unsafe-URL rules are enforced and stricter navigation exclusions remain unlinked', () => {
  const state = fixture(), invalid = structuredClone(state); invalid.items[0].url = 'javascript:alert(1)';
  assert.throws(() => b.buildEvidenceBrief(invalid, [invalid.items[0].id], 'en', exported), /Invalid notebook/);
  const control = n.addNotebookEvidence(n.emptyNotebook('en', 'v2.0', collected), { ...draft, sources: [{ ...source, url: 'https://example.org/\npath' }] }, 'v2.0', collected);
  const brief = b.buildEvidenceBrief(control, [control.items[0].id], 'en', exported);
  assert.ok(!brief.sections.at(-1).fields.find(f => f.label === 'Original source link').href);
});
test('empty notebooks and both interface languages serialize without generated claims or new schema', () => {
  for (const locale of ['en', 'zh-CN']) {
    const state = fixture(), brief = b.buildEvidenceBrief(state, state.items.map(i => i.id), locale, exported);
    assert.ok(b.serializeEvidenceBrief(brief).includes(locale === 'en' ? '## Research question' : '## 研究问题'));
    assert.ok(b.serializeEvidenceBrief(brief).includes('Original Publisher 原机构'));
    const empty = b.buildEvidenceBrief(n.emptyNotebook(locale, 'v2.0', collected), [], locale, exported);
    assert.ok(empty.sections.find(s => s.title === b.notebookBriefMessages[locale].evidence).paragraphs.includes(b.notebookBriefMessages[locale].empty));
    assert.equal(n.NOTEBOOK_SCHEMA, 'atlas-research-notebook-v1');
  }
  assert.throws(() => b.buildEvidenceBrief(fixture(), [], 'en', 'invalid'), /date/);
  assert.deepEqual(Object.keys(b.notebookBriefMessages.en), Object.keys(b.notebookBriefMessages['zh-CN']));
});
