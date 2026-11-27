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
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    f,
  );

const n = require('../../src/lib/researchNotebook.ts');
const msg = require('../../src/lib/researchPackageComposerMessages.ts');
const { ResearchPackageError } = require('../../src/lib/researchPackage.ts');
const { ArchiveValidationError } = require('../../src/lib/researchPackageArchive.ts');
const { SnapshotValidationError } = require('../../src/lib/researchPackageSnapshot.ts');

test('R1-C2 bilingual message dictionaries have complete key parity across EN and ZH', () => {
  const en = msg.packageComposerMessages.en;
  const zh = msg.packageComposerMessages['zh-CN'];
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  assert.deepEqual(Object.keys(en.correspondenceLabels).sort(), Object.keys(zh.correspondenceLabels).sort());
  assert.deepEqual(Object.keys(en.correspondenceDescriptions).sort(), Object.keys(zh.correspondenceDescriptions).sort());
  assert.deepEqual(Object.keys(en.rightsLabels).sort(), Object.keys(zh.rightsLabels).sort());
  assert.deepEqual(Object.keys(en.scopeLabels).sort(), Object.keys(zh.scopeLabels).sort());
  assert.deepEqual(Object.keys(en.temporalRelations).sort(), Object.keys(zh.temporalRelations).sort());
  assert.deepEqual(Object.keys(en.errorCodes).sort(), Object.keys(zh.errorCodes).sort());
  assert.equal(Object.keys(en.correspondenceLabels).length, 6);
  assert.equal(Object.keys(en.rightsLabels).length, 3);
  assert.equal(Object.keys(en.scopeLabels).length, 3);
  assert.equal(Object.keys(en.errorCodes).length, 24);
});

test('R1-C2 evidenceFingerprint detects edits to bound evidence notes and referenced sources only', () => {
  const collected = '2026-11-26T12:00:00.000Z';
  let book = n.emptyNotebook('en', 'v2.0', collected);
  book = n.addNotebookEvidence(
    book,
    {
      type: 'observation',
      title: 'Poland GDP',
      url: 'https://hy-central-europe-analysis.org/data/?country=poland',
      canonical_ids: ['poland:gdp:2025'],
      countries: ['poland'],
      periods: ['2025'],
      value: 3.1,
      unit: '%',
      sources: [{ institution: 'Eurostat', dataset: 'GDP', url: 'https://ec.europa.eu/eurostat', layer: 'official_annual' }],
      layer: 'official_annual',
      warnings: [],
      metadata: {},
    },
    'v2.0',
    collected,
  );
  const id = book.items[0].id;
  const fp1 = msg.evidenceFingerprint('proj-1', book, id);
  assert.ok(fp1);
  assert.equal(msg.evidenceFingerprint('proj-1', book, 'missing-id'), null);

  // Changing user note invalidates fingerprint
  const editedNote = { ...book, items: [{ ...book.items[0], note: 'Updated researcher note' }] };
  assert.notEqual(msg.evidenceFingerprint('proj-1', editedNote, id), fp1);

  // Changing referenced source invalidates fingerprint
  const editedSource = { ...book, sources: [{ ...book.sources[0], dataset: 'Revised GDP' }] };
  assert.notEqual(msg.evidenceFingerprint('proj-1', editedSource, id), fp1);

  // Changing project ID invalidates fingerprint
  assert.notEqual(msg.evidenceFingerprint('proj-2', book, id), fp1);
});

test('R1-C2 normalizeExpectedDigest and classifyComposerError enforce strict validation and stable codes', () => {
  assert.deepEqual(msg.normalizeExpectedDigest('   '), { ok: true, value: undefined });
  const upper = 'A'.repeat(64);
  assert.deepEqual(msg.normalizeExpectedDigest(` ${upper} `), { ok: true, value: 'a'.repeat(64) });
  assert.deepEqual(msg.normalizeExpectedDigest('not-a-sha256'), { ok: false });
  assert.deepEqual(msg.normalizeExpectedDigest('a'.repeat(63)), { ok: false });

  assert.equal(msg.classifyComposerError(new ArchiveValidationError('invalid_archive')).code, 'invalid_archive');
  assert.equal(msg.classifyComposerError(new SnapshotValidationError('unsupported_figure')).code, 'unsupported_figure');
  assert.equal(msg.classifyComposerError(new ResearchPackageError('digest_mismatch', 'mismatch')).code, 'digest_mismatch');
  assert.equal(msg.classifyComposerError(new Error('plain')).code, 'unknown_error');
});

test('R1-C2 computeReportStateKey invalidates on every exported Notebook, selection, attachment, and report field', () => {
  const collected = '2026-11-26T12:00:00.000Z';
  let book = n.emptyNotebook('en', 'v2.0', collected);
  book = n.addNotebookEvidence(
    book,
    {
      type: 'observation',
      title: 'Poland GDP',
      url: 'https://hy-central-europe-analysis.org/data/?country=poland',
      canonical_ids: ['poland:gdp:2025'],
      countries: ['poland'],
      periods: ['2025'],
      value: 3.1,
      unit: '%',
      sources: [{ institution: 'Eurostat', dataset: 'GDP', url: 'https://ec.europa.eu/eurostat', layer: 'official_annual' }],
      layer: 'official_annual',
      warnings: [],
      metadata: {},
    },
    'v2.0',
    collected,
  );
  const id = book.items[0].id;
  const baseParams = {
    projectId: 'proj-1',
    notebook: book,
    selectedIds: [id],
    attachments: [{ evidenceId: id, sha256: 'a'.repeat(64), expectedSha256: undefined }],
    locale: 'en',
    template: 'standard',
    reportTime: '2026-11-27T10:00:00.000Z',
  };
  const baseKey = msg.computeReportStateKey(baseParams);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, projectId: 'proj-2' }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, locale: 'zh-CN' }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, template: 'comparative_note' }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, reportTime: '2026-11-27T11:00:00.000Z' }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, notebook: { ...book, title: 'New Title' } }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, notebook: { ...book, research_question: 'New Q' } }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, notebook: { ...book, user_notes: 'New note' } }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, notebook: { ...book, updated_at: '2026-11-27T09:00:00.000Z' } }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, notebook: { ...book, platform_version: 'v2.1' } }), baseKey);
  assert.notEqual(msg.computeReportStateKey({ ...baseParams, attachments: [{ evidenceId: id, sha256: 'a'.repeat(64), expectedSha256: 'a'.repeat(64) }] }), baseKey);
});

test('R1-C2 computeReportStateKey independently invalidates when notebook.workspace_context changes', () => {
  const collected = '2026-11-26T12:00:00.000Z';
  const book = n.emptyNotebook('en', 'v2.0', collected);
  const baseParams = {
    projectId: 'proj-1',
    notebook: book,
    selectedIds: [],
    attachments: [],
    locale: 'en',
    template: 'standard',
    reportTime: '2026-11-27T10:00:00.000Z',
  };
  const keyUndefined = msg.computeReportStateKey(baseParams);
  const keyMacro = msg.computeReportStateKey({
    ...baseParams,
    notebook: { ...book, workspace_context: 'macro-drivers' },
  });
  const keySpatial = msg.computeReportStateKey({
    ...baseParams,
    notebook: { ...book, workspace_context: 'regional-facts' },
  });
  assert.notEqual(keyMacro, keyUndefined);
  assert.notEqual(keySpatial, keyMacro);
  assert.notEqual(keySpatial, keyUndefined);
});
