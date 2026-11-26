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
  // 1. Numerical observation
  state = n.addNotebookEvidence(
    state,
    {
      type: 'observation',
      title: 'Poland GDP Growth 2025',
      labels: { en: 'Poland GDP Growth 2025', 'zh-CN': '波兰 2025 年 GDP 增长' },
      url: 'https://hy-central-europe-analysis.org/data/?country=poland&indicator=real_gdp_growth',
      canonical_ids: ['poland:real_gdp_growth:2025'],
      countries: ['poland'],
      periods: ['2025'],
      value: 3.1,
      unit: '%',
      sources: [
        {
          institution: 'Eurostat',
          dataset: 'Real GDP growth rate',
          code: 'nama_10_gdp',
          url: 'https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp?very_long_param=' + 'x'.repeat(80),
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
  // 2. Explicit null observation
  state = n.addNotebookEvidence(
    state,
    {
      type: 'observation',
      title: 'Hungary Null Observation',
      labels: { en: 'Hungary Null Observation', 'zh-CN': '匈牙利空值观测' },
      url: 'https://hy-central-europe-analysis.org/data/?country=hungary&indicator=fdi_inflow',
      canonical_ids: ['hungary:fdi_inflow:2025'],
      countries: ['hungary'],
      periods: ['2025'],
      value: null,
      unit: '% GDP',
      sources: [],
      layer: 'official_annual',
      warnings: ['Pending official publication'],
      metadata: { status: 'pending' },
    },
    'v2.0',
    collected,
  );
  // 3. Observation without recorded value (undefined)
  state = n.addNotebookEvidence(
    state,
    {
      type: 'observation',
      title: 'Czechia Unrecorded Value Observation',
      labels: { en: 'Czechia Unrecorded Value Observation', 'zh-CN': '捷克未记录数值观测' },
      url: 'https://hy-central-europe-analysis.org/data/?country=czechia&indicator=hicp_inflation',
      canonical_ids: ['czechia:hicp_inflation:2025'],
      countries: ['czechia'],
      periods: ['2025'],
      value: undefined,
      unit: '%',
      sources: [],
      layer: 'official_annual',
      warnings: [],
      metadata: {},
    },
    'v2.0',
    collected,
  );
  // 4. Live research configuration (must NOT be counted as missing numerical observation or blocked method)
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
      metadata: { filters: { indicator: 'macro:policy_rate' }, state: 'registry_only' },
    },
    'v2.0',
    collected,
  );
  // 5. Blocked method
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
      value: undefined,
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
    user_notes: 'Line 1 of user note.\nLine 2 with <img src=x onerror=alert(1)>',
  };
}

test('R1-A restores R1-B boundary: BibTeX and CSL-JSON serializers are not part of R1-A', () => {
  assert.equal('serializeBriefBibTeX' in b, false);
  assert.equal('serializeBriefCslJson' in b, false);
});

test('R1-A buildReportStudioSummary validates selection IDs and distinguishes all 9 metadata categories accurately', () => {
  const state = buildFixture();
  const before = n.serializeNotebook(state);
  const allIds = state.items.map((i) => i.id);

  // Rejects duplicate or unknown IDs consistently with buildEvidenceBrief
  assert.throws(() => b.buildReportStudioSummary(state, [allIds[0], allIds[0]]), /Invalid brief selection/);
  assert.throws(() => b.buildReportStudioSummary(state, ['nonexistent-id']), /Invalid brief selection/);

  const summary = b.buildReportStudioSummary(state, allIds);
  assert.equal(summary.selectedCount, 5);
  assert.equal(summary.totalCount, 5);
  assert.deepEqual(summary.countries, ['poland', 'hungary', 'czechia']);
  assert.deepEqual(summary.layers, ['official_annual', 'macro_descriptive', 'econometric_registry']);
  assert.equal(summary.recordedNumericalCount, 1);
  assert.equal(summary.explicitNullCount, 1);
  assert.equal(summary.unrecordedObservationCount, 1);
  assert.equal(summary.configurationCount, 1);
  assert.equal(summary.sourceCount, 2);
  assert.equal(summary.unsourcedCount, 3);
  assert.equal(summary.warningItemCount, 4);
  // Only type==='method' with state!=='active' counts (not the country_comparison with state:'descriptive_only')
  assert.equal(summary.blockedOrInactiveMethodCount, 1);
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
  assert.deepEqual(Object.keys(b.notebookBriefMessages.en), Object.keys(b.notebookBriefMessages['zh-CN']));
});

test('R1-A standalone HTML export is valid, escaped, A4 print-friendly, and avoids section-level break-inside traps', () => {
  const state = buildFixture();
  const brief = b.buildEvidenceBrief(state, state.items.slice(0, 4).map((i) => i.id), 'en', exported, 'methodological_audit');
  const html = b.serializeBriefHtml(brief, 'en');

  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('@page { size: A4; margin: 18mm; }'));
  assert.ok(html.includes('@media print'));
  assert.ok(!html.includes('section { break-inside: avoid'));
  assert.ok(html.includes('white-space: pre-wrap'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('Line 1 of user note.\nLine 2 with &lt;img'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(!html.includes('Excluded Source'));
});
