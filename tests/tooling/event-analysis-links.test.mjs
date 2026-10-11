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
const links = require('../../src/lib/eventAnalysisLinks.ts');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const events = read('src/data/events/events.json').records;
const indicators = new Set(read('src/data/indicators/indicators.json').records.map((row) => row.id));
const observations = read('src/data/observations/observations.json').records;
const workbench = fs.readFileSync(path.join(root, 'src/components/EventWindowWorkbench.tsx'), 'utf8');
const monthlyOutcomes = new Set([...workbench.matchAll(/^\s+"?([a-z_]+(?::[a-z_]+)?)"?: "[^"]+",$/gm)].map((match) => match[1]));

test('every reviewed record points at an existing verified event and restates its own source', () => {
  assert.equal(links.eventAnalysisRecords.length, 4);
  for (const record of links.eventAnalysisRecords) {
    const event = events.find((row) => row.event_id === record.event_id);
    assert.ok(event, record.event_id);
    assert.equal(event.data_status, 'verified');
    assert.ok(record.sources.some((source) => source.url === event.source_url), `${record.event_id}: source must be the event's own source`);
    for (const text of [record.overview, ...record.context, ...record.uncertainties, record.mechanism.channel, ...record.mechanism.alternatives, ...record.limitations, ...record.indicators.map((link) => link.rationale), ...record.event_actors, ...record.research_topics]) {
      assert.ok(text.zh.trim() && text.en.trim(), `${record.event_id}: bilingual text`);
      assert.doesNotMatch(text.en, /[㐀-鿿]/u);
    }
    assert.ok(record.mechanism.steps.some((step) => step.kind === 'research_hypothesis'), 'hypotheses are labelled');
    assert.ok(record.limitations.some((item) => /cannot show that the event caused/.test(item.en)), 'non-causal limitation present');
  }
});

test('links are explicit, explained and only point at indicators the Atlas can show', () => {
  for (const record of links.eventAnalysisRecords) for (const link of record.indicators) {
    assert.ok(['documented', 'proposed', 'unsupported'].includes(link.basis));
    if (link.frequency === 'monthly') assert.ok(monthlyOutcomes.has(link.indicator_id), `${link.indicator_id} is not a workbench outcome`);
    else if (link.basis !== 'unsupported') {
      assert.ok(indicators.has(link.indicator_id), link.indicator_id);
      const slug = events.find((row) => row.event_id === record.event_id).country_slug;
      assert.ok(observations.some((row) => row.country_slug === slug && row.indicator === link.indicator_id && row.value !== null), `${record.event_id}: ${link.indicator_id} has no published observation`);
    }
  }
});

test('no numerical effect, score or forecast wording in the reviewed text', () => {
  const text = JSON.stringify(links.eventAnalysisRecords);
  assert.doesNotMatch(text, /impact score|probability|will (increase|reduce|raise|lower)|caused by|导致了|影响分数|预测/);
});

test('an event category never yields a link; publishers are never presented as actors', () => {
  const plain = events.find((row) => row.event_type === 'regional' && !links.getEventAnalysis(row.event_id));
  assert.deepEqual(links.linkedWindowOutcomes(plain.event_id), []);
  assert.deepEqual(links.eventAnalysisLevels(plain), { background: plain.source_url ? 'available' : 'unavailable', mechanism: 'unavailable', indicators: 'unavailable', window_link: 'unavailable' });
  assert.equal(links.eventActors({ event_id: 'x', actor: 'ORF', source_name: 'ORF' }).actors, null);
  assert.equal(links.eventActors({ event_id: 'x', actor: '待编码', source_name: 'ORF' }).actors, null);
  assert.deepEqual(links.eventActors({ event_id: 'x', actor: '捷克政府', source_name: 'ORF' }).actors, [{ zh: '捷克政府', en: '捷克政府' }]);
  assert.deepEqual(links.linkedWindowOutcomes('cz-2023-10-16-repowereu-plan'), ['hicp_energy_annual_rate:yoy_rate']);
  assert.equal(links.eventAnalysisLevels(events.find((row) => row.event_id === 'pl-2024-04-23-nuctech-fsr-inspection')).indicators, 'unavailable');
});

test('the event-window engine and its gates are untouched', () => {
  const engine = fs.readFileSync(path.join(root, 'src/lib/eventWindowEngine.ts'), 'utf8');
  assert.match(engine, /const FULL_GATE = \{ pre: 12, post: 6 \} as const;/);
  assert.match(engine, /const EXPLORATORY_GATE = \{ pre: 6, post: 3 \} as const;/);
  assert.doesNotMatch(workbench, /suggestedOutcomes/);
});
