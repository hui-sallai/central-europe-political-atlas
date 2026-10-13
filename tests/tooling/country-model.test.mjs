import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { countryModelMeaning, countryModelRange } = require('../../src/lib/countryModelPresentation.ts');
const { modelCards, modelOutputs } = require('../../src/lib/modelFramework.ts');
test('all existing model meanings have English presentation translations without modifying metadata', () => {
  const before = JSON.stringify([modelCards, modelOutputs]);
  for (const card of modelCards) {
    assert.equal(countryModelMeaning(card, 'zh-CN'), card.output_meaning);
    assert.ok(!/[\u3400-\u9fff]/u.test(countryModelMeaning(card, 'en')));
    assert.ok(!countryModelMeaning(card, 'en').includes('not translated'));
    assert.equal(countryModelRange(card), '0–100');
  }
  assert.equal(JSON.stringify([modelCards, modelOutputs]), before);
});
test('an unspecified range or unreviewed interpretation is never invented', () => {
  const card = { ...modelCards[0], calculation_logic: 'Undefined', output_meaning: 'Unknown' };
  assert.equal(countryModelRange(card), null);
  assert.match(countryModelMeaning(card, 'en'), /not translated/);
});
