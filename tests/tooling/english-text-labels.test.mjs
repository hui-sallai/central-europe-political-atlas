import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const { englishText } = require('../../src/i18n/reviewedText.ts');
const { indicatorDictionaryRecords } = require('../../src/lib/indicatorDictionary.ts');

test('country-profile chart titles keep the indicator English name (no "GDP, current prices" expansion)', () => {
  assert.equal(englishText('Serbia · Real GDP growth'), 'Serbia · Real GDP growth');
  for (const { nameEn } of indicatorDictionaryRecords) {
    assert.equal(englishText(`Serbia · ${nameEn}`), `Serbia · ${nameEn}`, nameEn);
    assert.equal(englishText(nameEn), nameEn, nameEn);
  }
  assert.equal(englishText('Serbia · Real GDP growth（图表，可横向滚动）'), 'Serbia · Real GDP growth(chart, horizontally scrollable)');
});

test('reviewed Chinese labels are still translated, including exact "GDP"', () => {
  assert.equal(englishText('GDP 实际增长'), 'Real GDP growth');
  assert.equal(englishText('人均 GDP'), 'GDP per capita');
  assert.equal(englishText('GDP'), 'GDP, current prices');
  assert.equal(englishText('  年份 '), '  Year ');
});
