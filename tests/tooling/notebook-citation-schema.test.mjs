import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parserFixture } from '../fixtures/citation-interchange.mjs';

// Use the Draft 7 validator already installed by the project's development-only ESLint.
const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve('eslint/package.json'));
const Ajv = eslintRequire('ajv');
const upstream = readFileSync(new URL('../fixtures/csl-1.0.2/csl-data.json', import.meta.url));
const sha256 = '257f86d4c3f19e15c7208657512ad4c9559a3b0d83b03360ed006c5f02d2977c';

test('CSL export validates against the unmodified official 1.0.2 Draft 7 input schema', () => {
  assert.equal(createHash('sha256').update(upstream).digest('hex'), sha256);
  const validate = new Ajv({allErrors:true}).compile(JSON.parse(upstream));
  const {bundle, title, url} = parserFixture();
  const entries = JSON.parse(bundle.cslJson);
  assert.ok(validate(entries), JSON.stringify(validate.errors));
  assert.equal(entries.length,4);
  assert.equal(new Set(entries.map(entry => entry.id.toLowerCase())).size,4);
  const revisions = entries.filter(entry => entry.URL === url);
  assert.equal(revisions.length,2);
  assert.ok(revisions.every(entry => entry.type === 'document' && entry.title === title));
  assert.deepEqual(revisions.map(entry => entry.accessed['date-parts'][0]).sort(), [[2024,2,29],[2025,1,9]]);
  assert.equal(entries.find(entry => entry.type === 'webpage').URL.startsWith('https://hy-central-europe-analysis.org/'),true);
  for (const entry of entries) {
    for (const key of ['issued','author','publisher','DOI','edition']) assert.ok(!Object.hasOwn(entry,key));
  }
  assert.equal(validate([{ id:'invalid',type:'not-a-csl-type' }]),false);
  assert.equal(validate([{ id:'invalid',type:'document',accessed:{'date-parts':'2025-01-01'} }]),false);
  assert.equal(validate([{ ...entries[0], atlas_invented_property:true }]),false);
});
