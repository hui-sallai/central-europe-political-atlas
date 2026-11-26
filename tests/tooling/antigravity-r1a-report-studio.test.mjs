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
require.extensions['.ts'] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    f,
  );

const n = require('../../src/lib/researchNotebook.ts');
const b = require('../../src/lib/notebookBrief.ts');

const collected = '2026-11-26T08:00:00.000Z';
const exported = '2026-11-26T09:00:00.000Z';

function buildFixture() {
  let state = n.emptyNotebook('en', 'v2.0', collected);
  state = n.addNotebookEvidence(
    state,
    {
      type: 'observation',
      title: 'GDP Growth 2025 [5% & #1]',
      labels: { en: 'GDP Growth 2025 [5% & #1]', 'zh-CN': '2025 年 GDP 增长' },
      url: 'https://hy-central-europe-analysis.org/data/?country=poland&indicator=real_gdp_growth',
      canonical_ids: ['poland:real_gdp_growth:2025'],
      countries: ['poland'],
      periods: ['2025'],
      value: 3.1,
      unit: '%',
      sources: [
        {
          institution: 'Eurostat & National Accounts',
          dataset: 'Real GDP growth_rate %',
          code: 'nama_10_gdp',
          url: 'https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp',
          layer: 'official_annual',
          original_unit: '%',
          retrieved_at: '2026-11-01',
          updated_at: '2026-10-15',
        },
      ],
      layer: 'official_annual',
      comparability: 'Harmonized ESA 2010 annual definition',
      warnings: ['Headline revision possible'],
      metadata: { status: 'published' },
    },
    'v2.0',
    collected,
  );
  state = n.addNotebookEvidence(
    state,
    {
      type: 'country_comparison',
      title: 'Policy rate comparison',
      labels: { en: 'Policy rate comparison', 'zh-CN': '政策利率比较' },
      url: 'https://hy-central-europe-analysis.org/data/?compare_countries=poland,hungary&comparison_indicator=macro:policy_rate',
      canonical_ids: ['macro:policy_rate'],
      countries: ['poland', 'hungary'],
      periods: ['2024-01', '2025-12'],
      value: undefined,
      sources: [],
      layer: 'macro_descriptive',
      warnings: ['Policy instruments differ by central bank'],
      metadata: { filters: { indicator: 'macro:policy_rate' } },
    },
    'v2.0',
    collected,
  );
  state = n.addNotebookEvidence(
    state,
    {
      type: 'method',
      title: 'Blocked VAR dynamic response',
      labels: { en: 'Blocked VAR dynamic response', 'zh-CN': '受限 VAR 动态响应' },
      url: 'https://hy-central-europe-analysis.org/models/?skill=var_time_series',
      canonical_ids: ['var_dynamic_response'],
      countries: ['hungary'],
      periods: ['2010-2025'],
      value: null,
      sources: [
        {
          institution: 'Excluded Source',
          dataset: 'Unselected dataset',
          url: 'https://example.org/excluded',
          layer: 'econometric_registry',
        },
      ],
      layer: 'econometric_registry',
      warnings: ['Formal VAR dynamic responses and IRFs remain blocked'],
      metadata: { state: 'blocked' },
    },
    'v2.0',
    collected,
  );
  return {
    ...state,
    title: 'Report Studio <script>alert(1)</script>',
    research_question: 'How do macro & fiscal indicators align?',
    user_notes: 'Personal note with <img src=x onerror=alert(1)>',
  };
}

test('R1-A buildReportStudioSummary computes exact provenance & integrity counts without mutating notebook', () => {
  const state = buildFixture();
  const before = n.serializeNotebook(state);
  const allIds = state.items.map((i) => i.id);
  const summary = b.buildReportStudioSummary(state, allIds);

  assert.equal(summary.selectedCount, 3);
  assert.equal(summary.totalCount, 3);
  assert.deepEqual(summary.countries, ['poland', 'hungary']);
  assert.deepEqual(summary.layers, ['official_annual', 'macro_descriptive', 'econometric_registry']);
  assert.equal(summary.sourceCount, 2);
  assert.equal(summary.warningItemCount, 3);
  assert.equal(summary.missingValueCount, 1);
  assert.equal(summary.configurationCount, 1);
  assert.equal(summary.blockedOrInactiveCount, 1);
  assert.equal(summary.unsourcedCount, 1);
  assert.equal(n.serializeNotebook(state), before);
  assert.equal(n.NOTEBOOK_SCHEMA, 'atlas-research-notebook-v1');
});

test('R1-A templates (standard, comparative_note, methodological_audit) project cleanly in EN and ZH', () => {
  const state = buildFixture();
  const ids = state.items.map((i) => i.id);

  for (const locale of ['en', 'zh-CN']) {
    const standard4 = b.buildEvidenceBrief(state, ids, locale, exported);
    const standard5 = b.buildEvidenceBrief(state, ids, locale, exported, 'standard');
    assert.deepEqual(standard5, standard4);

    const comparative = b.buildEvidenceBrief(state, ids, locale, exported, 'comparative_note');
    assert.ok(comparative.sections.some((s) => s.title === b.notebookBriefMessages[locale].comparativeSection));

    const audit = b.buildEvidenceBrief(state, ids, locale, exported, 'methodological_audit');
    const auditIdx = audit.sections.findIndex((s) => s.title === b.notebookBriefMessages[locale].auditSection);
    const warnIdx = audit.sections.findIndex((s) => s.title === b.notebookBriefMessages[locale].notebookWarnings);
    const evIdx = audit.sections.findIndex((s) => s.title === b.notebookBriefMessages[locale].evidence);
    assert.ok(auditIdx > 0 && warnIdx === auditIdx + 1 && warnIdx < evIdx);
  }
});

test('R1-A BibTeX and CSL-JSON exports include only selected sources, escape syntax, and omit unsafe URLs', () => {
  const state = buildFixture();
  const selectedIds = [state.items[0].id, state.items[1].id];

  const bib = b.serializeBriefBibTeX(state, selectedIds, 'en', exported);
  assert.ok(bib.includes('@misc{source_'));
  assert.ok(bib.includes('@misc{atlas_'));
  assert.ok(bib.includes('Eurostat \\& National Accounts'));
  assert.ok(bib.includes('Real GDP growth\\_rate \\%'));
  assert.ok(bib.includes('Live Atlas configuration; not a frozen dataset'));
  assert.ok(!bib.includes('Excluded Source'));

  const csl = JSON.parse(b.serializeBriefCslJson(state, selectedIds, 'en', exported));
  assert.equal(csl.length, 3); // 1 selected source + 2 selected Atlas items
  assert.equal(csl[0].type, 'dataset');
  assert.equal(csl[0].author[0].literal, 'Eurostat & National Accounts');
  assert.deepEqual(csl[0].accessed, { 'date-parts': [[2026, 11, 1]] });
  assert.equal(csl[1].type, 'webpage');
  assert.ok(!JSON.stringify(csl).includes('Excluded Source'));

  // Unsafe URL omitted cleanly
  const unsafe = structuredClone(state);
  unsafe.sources[0].url = 'https://example.org/\nnewline';
  const safeBib = b.serializeBriefBibTeX(unsafe, [unsafe.items[0].id], 'en', exported);
  assert.ok(!safeBib.includes('newline'));
  const safeCsl = JSON.parse(b.serializeBriefCslJson(unsafe, [unsafe.items[0].id], 'en', exported));
  assert.equal(safeCsl[0].URL, undefined);
});

test('R1-A standalone HTML export escapes HTML/script injection and includes print styling', () => {
  const state = buildFixture();
  const brief = b.buildEvidenceBrief(state, state.items.map((i) => i.id), 'en', exported, 'methodological_audit');
  const html = b.serializeBriefHtml(brief, 'en');

  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('@media print'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});
