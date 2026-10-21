import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url), resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve('src', id.slice(2)) : id, ...args); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const n = require('../../src/lib/researchNotebook.ts'), p = require('../../src/lib/notebookProjects.ts');
const draft = { type: 'workspace', title: 'Saved configuration', url: 'https://hy-central-europe-analysis.org/workspaces/inflation_monetary_policy/', canonical_ids: ['inflation_monetary_policy'], countries: ['hungary'], periods: ['2025'], sources: [{ institution: 'Publisher', dataset: 'Recorded source', url: 'https://example.org/record', layer: 'descriptive' }], layer: 'workspace_setup', warnings: ['No conclusions'], metadata: { filters: { from: 2025 } } };
const legacy = () => ({ ...n.addNotebookEvidence(n.emptyNotebook('en', 'v2.0'), draft, 'v2.0'), title: 'Original', user_notes: 'Preserve 原文' });
function io(seed) {
  const map = new Map(seed ? [[n.NOTEBOOK_STORAGE_KEY, n.serializeNotebook(seed)]] : []), writes = [];
  let quota = false, denied = false, queue = Promise.resolve();
  return { map, writes, quota: value => quota = value, denied: value => denied = value,
    get: key => { if (denied) throw Error('Denied'); return map.get(key) ?? null; },
    set: (key, value) => { if (denied || quota) throw Error('Full'); writes.push(key); map.set(key, value); },
    lock: operation => { const next = queue.then(operation); queue = next.catch(() => {}); return next; },
  };
}
const store = adapter => { const result = new p.NotebookProjectStore('en', 'v2.0', adapter); result.load(); return result; };
const settled = async value => { while (value.view().busy) await new Promise(resolve => setImmediate(resolve)); };
test('unavailable browser locking fails closed without a legacy write or destructive switch', async () => {
  const adapter = io(legacy()), before = adapter.get(n.NOTEBOOK_STORAGE_KEY);
  adapter.lock = async () => { throw Error('Browser locking unavailable'); };
  const s = store(adapter); s.update(s.view().activeId, book => ({ ...book, user_notes: 'Export me' })); await settled(s);
  assert.equal(s.view().state, 'memory'); assert.equal(s.view().notebook.user_notes, 'Export me');
  assert.equal(await s.create('Blocked'), false); assert.equal(adapter.get(n.NOTEBOOK_STORAGE_KEY), before);
  assert.equal(adapter.get(p.NOTEBOOK_PROJECTS_KEY), null);
});
test('legacy data reads without writes, then migrates atomically preserving every Notebook and evidence ID', async () => {
  const book = legacy();
  book.sources.push({ id: 'unused-source', institution: 'Original extra source', dataset: 'Unattached reference', url: 'https://example.org/extra', layer: 'recorded' });
  book.methodology_warnings.push('Keep standalone warning');
  const adapter = io(book), original = adapter.map.get(n.NOTEBOOK_STORAGE_KEY), s = store(adapter);
  assert.equal(n.serializeNotebook(s.view().notebook), original); assert.equal(adapter.writes.length, 0);
  s.update(s.view().activeId, value => ({ ...value, title: 'Renamed' })); await settled(s);
  const saved = p.parseProjectRegistry(adapter.map.get(p.NOTEBOOK_PROJECTS_KEY));
  assert.equal(saved.projects[0].notebook.notebook_id, book.notebook_id);
  assert.deepEqual(saved.projects[0].notebook.items, book.items); assert.deepEqual(saved.projects[0].notebook.sources, book.sources);
  assert.deepEqual(saved.projects[0].notebook.methodology_warnings, book.methodology_warnings);
  assert.equal(adapter.map.get(n.NOTEBOOK_STORAGE_KEY), original);
  assert.ok(adapter.writes.every(key => key === p.NOTEBOOK_PROJECTS_KEY));
});
test('independent creation, active collection, switching, renaming, deletion and reload never merge evidence', async () => {
  const adapter = io(legacy()), s = store(adapter), originalId = s.view().activeId;
  assert.ok(await s.create('Second')); const second = s.view().activeId;
  assert.equal(s.view().notebook.items.length, 0);
  s.add(second, { ...draft, canonical_ids: ['second'], periods: ['2026'] }); await settled(s);
  assert.equal(s.view().notebook.items.length, 1);
  assert.ok(await s.switchTo(originalId)); assert.deepEqual(s.view().notebook.items[0].canonical_ids, draft.canonical_ids);
  assert.equal(store(adapter).view().activeId, originalId);
  assert.ok(await s.delete(originalId)); assert.equal(s.view().activeId, second); assert.equal(s.view().projects.length, 1);
  assert.ok(await s.delete(second)); assert.equal(s.view().projects.length, 1); assert.equal(s.view().notebook.items.length, 0);
});
test('import as new preserves duplicate notebook IDs in distinct project wrappers; replace only changes the active wrapper', async () => {
  const adapter = io(legacy()), s = store(adapter), first = s.view().activeId, imported = legacy();
  assert.ok(await s.create(imported.title, imported)); const second = s.view().activeId;
  assert.notEqual(first, second); assert.equal(s.view().notebook.notebook_id, imported.notebook_id);
  const before = n.serializeNotebook(s.view().projects[0].notebook);
  assert.ok(await s.replace(second, { ...imported, title: 'Replacement' }));
  assert.equal(n.serializeNotebook(s.view().projects[0].notebook), before);
  assert.equal(n.parseNotebook(n.serializeNotebook(s.view().notebook)).title, 'Replacement');
});
test('quota failure retains edits in memory and blocks structural changes; retry saves without touching legacy', async () => {
  const adapter = io(legacy()), s = store(adapter), original = adapter.map.get(n.NOTEBOOK_STORAGE_KEY);
  adapter.quota(true); s.update(s.view().activeId, value => ({ ...value, user_notes: 'Unsaved edit' })); await settled(s);
  assert.equal(s.view().state, 'memory'); assert.equal(s.view().notebook.user_notes, 'Unsaved edit');
  assert.equal(await s.create('Unsafe'), false); assert.equal(await s.delete(s.view().activeId), false);
  assert.equal(await s.replace(s.view().activeId, legacy()), false); assert.equal(adapter.map.get(n.NOTEBOOK_STORAGE_KEY), original);
  adapter.quota(false); assert.ok(await s.retry()); assert.equal(s.view().state, 'ready'); assert.equal(store(adapter).view().notebook.user_notes, 'Unsaved edit');
});
test('failed switch never accepts the target and storage denial keeps exportable edits', async () => {
  const adapter = io(legacy()), s = store(adapter), first = s.view().activeId; await s.create('Second'); const second = s.view().activeId;
  adapter.quota(true); assert.equal(await s.switchTo(first), false); assert.equal(s.view().activeId, second);
  const denied = io(); denied.denied(true); const memory = store(denied); assert.equal(memory.view().state, 'memory');
  memory.update(memory.view().activeId, value => ({ ...value, title: 'Memory only' }));
  assert.equal(n.parseNotebook(n.serializeNotebook(memory.view().notebook)).title, 'Memory only');
});
test('corrupt registry is protected even when valid legacy data exists; legacy corruption can be explicitly replaced', async () => {
  const adapter = io(legacy()); adapter.map.set(p.NOTEBOOK_PROJECTS_KEY, '{broken'); const s = store(adapter);
  assert.equal(s.view().issue, 'registry_corrupt'); assert.equal(s.view().raw, '{broken');
  assert.equal(await s.create('Not allowed'), false); assert.equal(await s.clear(s.view().activeId), false); assert.equal(adapter.map.get(p.NOTEBOOK_PROJECTS_KEY), '{broken');
  const old = io(); old.map.set(n.NOTEBOOK_STORAGE_KEY, '{legacy broken'); const recover = store(old);
  assert.equal(recover.view().issue, 'legacy_corrupt'); assert.ok(await recover.clear(recover.view().activeId));
  assert.equal(old.map.get(n.NOTEBOOK_STORAGE_KEY), '{legacy broken'); assert.equal(recover.view().state, 'ready');
});
test('clean cross-tab updates retain each tab’s explicit project target; remote active deletion preserves a local copy', async () => {
  const adapter = io(legacy()), a = store(adapter); await a.create('Second'); const second = a.view().activeId;
  const b = store(adapter); await a.switchTo('legacy');
  b.storageChanged(p.NOTEBOOK_PROJECTS_KEY, adapter.get(p.NOTEBOOK_PROJECTS_KEY)); assert.equal(b.view().activeId, second);
  a.update('legacy', book => ({ ...book, title: 'Remote title' })); await settled(a);
  b.storageChanged(p.NOTEBOOK_PROJECTS_KEY, adapter.get(p.NOTEBOOK_PROJECTS_KEY)); assert.equal(b.view().projects[0].notebook.title, 'Remote title');
  await a.switchTo(second); await a.delete(second);
  b.storageChanged(p.NOTEBOOK_PROJECTS_KEY, adapter.get(p.NOTEBOOK_PROJECTS_KEY));
  assert.equal(b.view().state, 'memory'); assert.equal(b.view().activeId, second); assert.equal(b.view().issue, 'conflict');
});
test('conflicting writers never overwrite remote evidence; recovery creates a distinct project with unchanged content', async () => {
  const adapter = io(legacy()), a = store(adapter), b = store(adapter);
  a.update(a.view().activeId, book => ({ ...book, user_notes: 'Remote saved note' })); await settled(a);
  b.update(b.view().activeId, book => ({ ...book, user_notes: 'Local pending note' })); await settled(b);
  assert.equal(b.view().state, 'memory'); assert.equal(store(adapter).view().notebook.user_notes, 'Remote saved note');
  const localId = b.view().notebook.notebook_id; assert.ok(await b.recoverCopy());
  assert.equal(b.view().projects.length, 2); assert.equal(b.view().projects[0].notebook.user_notes, 'Remote saved note');
  assert.equal(b.view().notebook.user_notes, 'Local pending note'); assert.equal(b.view().notebook.notebook_id, localId);
});
test('storage events cannot replace unsaved edits and delayed collectors cannot enter a new project', async () => {
  const adapter = io(legacy()), s = store(adapter), old = s.view().activeId; await s.create('Second'); const second = s.view().activeId;
  assert.equal(s.add(old, draft), false); assert.equal(s.view().notebook.items.length, 0); assert.equal(s.view().issue, 'target_changed');
  adapter.quota(true); s.update(second, book => ({ ...book, user_notes: 'Keep pending' })); await settled(s);
  s.storageChanged(p.NOTEBOOK_PROJECTS_KEY, 'different'); assert.equal(s.view().notebook.user_notes, 'Keep pending');
});
test('strict registry validation enforces unchanged notebook URLs, limits, active IDs and bounded project count', async () => {
  const registry = p.singleNotebookProject(legacy()), valid = p.serializeProjectRegistry(registry);
  assert.equal(p.serializeProjectRegistry(p.parseProjectRegistry(valid)), valid);
  for (const mutate of [v => v.active_id = 'missing', v => v.projects.push(v.projects[0]), v => v.schema = 'future', v => v.projects[0].notebook.items[0].url = 'javascript:alert(1)', v => v.projects[0].extra = 'unreviewed']) {
    const copy = structuredClone(registry); mutate(copy); assert.throws(() => p.serializeProjectRegistry(copy));
  }
  const adapter = io(), s = store(adapter); for (let i = 1; i < p.projectLimits.projects; i++) assert.ok(await s.create(`P${i}`));
  assert.equal(await s.create('Over limit'), false); assert.equal(s.view().projects.length, 10);
  assert.equal(n.NOTEBOOK_SCHEMA, 'atlas-research-notebook-v1'); assert.equal(n.notebookLimits.bytes, 750000);
});
