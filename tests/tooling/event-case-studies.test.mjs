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
const { eventCaseStudies, annualPhase } = require('../../src/lib/eventCaseStudies.ts');
const links = require('../../src/lib/eventAnalysisLinks.ts');
const engine = require('../../src/lib/eventWindowEngine.ts');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const events = read('src/data/events/events.json').records;
const observations = read('src/data/observations/observations.json').records;
const projects = read('src/data/projects/projects.json').records;
const macro = read('public/research-data/macro_driver_runtime.json').records;
const texts = (study) => [study.title, study.research_question, study.date_note, ...study.establishes, ...study.uncertain, ...study.milestones.map((m) => m.text), ...study.chain.flatMap((l) => [l.step, l.timing]), ...study.annual.map((a) => a.role), study.window?.role, study.window?.comparison?.rationale, study.window?.external?.rationale, study.window_blocker, study.comparison_note, ...study.alternatives.map((a) => a.text), ...study.concurrent_projects.flatMap((p) => [p.label, p.status]), ...study.can_establish, ...study.cannot_establish, ...study.sources.map((s) => s.supports)].filter(Boolean);
// Same row mapping as EventWindowWorkbench for macro-driver series (outcome id = driver:transformation).
const macroSeries = (outcome, country) => macro.filter((row) => `${row[1]}:${row[7]}` === outcome && (row[2] ?? country) === country).map((row) => ({ observation_id: `${row[0]}:${country}`, country, period: row[4], indicator: outcome, value: row[5], transformation: row[7], unit: row[6], value_semantics: row[7] === 'yoy_rate' ? 'yoy_rate' : 'currency_level' }));

test('two reviewed cases on existing verified historical events, with different mechanisms', () => {
  assert.deepEqual(eventCaseStudies.map((s) => s.event_id), ['cz-2023-10-16-repowereu-plan', 'hu-2022-08-12-catl-debrecen']);
  const channels = new Set();
  for (const study of eventCaseStudies) {
    const event = events.find((row) => row.event_id === study.event_id);
    assert.ok(event, study.event_id);
    assert.equal(event.data_status, 'verified');
    const record = links.getEventAnalysis(study.event_id);
    assert.ok(record && record.period === 'historical', `${study.event_id}: builds on an existing historical analysis record`);
    channels.add(record.mechanism.channel.en);
    assert.ok(study.sources.length && study.sources.every((s) => /^https:\/\//.test(s.url)));
  }
  assert.equal(channels.size, 2);
});

test('milestones and stages are documented, never inferred; an announcement is not an investment', () => {
  for (const study of eventCaseStudies) {
    const sourceUrls = new Set(study.sources.map((s) => s.url));
    for (const milestone of study.milestones) {
      assert.match(milestone.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(sourceUrls.has(milestone.source_url), `${study.event_id}: milestone cites a listed source`);
      assert.ok(study.stages_documented.includes(milestone.stage), `${study.event_id}: milestone stage is a documented stage`);
    }
    for (const stage of study.stages_documented) assert.ok(!study.stages_not_documented.includes(stage));
    assert.ok(!study.stages_documented.includes('observed_outcome') || study.milestones.some((m) => m.stage === 'observed_outcome'), 'no observed outcome without a documented milestone');
  }
  const catl = eventCaseStudies.find((s) => s.event_id === 'hu-2022-08-12-catl-debrecen');
  assert.deepEqual(catl.stages_documented, ['announcement']);
  assert.ok(catl.stages_not_documented.includes('implementation') && catl.stages_not_documented.includes('observed_outcome'));
  assert.ok(catl.chain.some((l) => l.basis === 'unsupported_connection' && /announced amount/.test(l.step.en)), 'announced amount is explicitly not realised FDI');
  const repower = eventCaseStudies.find((s) => s.event_id === 'cz-2023-10-16-repowereu-plan');
  assert.ok(repower.date_note && /2023-10-16/.test(repower.date_note.en) && /17 October 2023/.test(repower.date_note.en), 'event-record date difference is disclosed, record unchanged');
  assert.equal(events.find((row) => row.event_id === repower.event_id).date, '2023-10-16');
});

test('chains label every link, and indicators are only explained links from the analysis record', () => {
  for (const study of eventCaseStudies) {
    const kinds = new Set(study.chain.map((l) => l.basis));
    for (const kind of ['documented_fact', 'documented_mechanism', 'research_hypothesis', 'unsupported_connection']) assert.ok(kinds.has(kind), `${study.event_id}: ${kind}`);
    const record = links.getEventAnalysis(study.event_id);
    for (const item of study.annual) {
      const link = record.indicators.find((l) => l.indicator_id === item.indicator_id);
      assert.ok(link && link.frequency === 'annual' && link.basis !== 'unsupported', `${study.event_id}: ${item.indicator_id} is an explained annual link`);
      assert.ok(observations.some((o) => o.country_slug === events.find((e) => e.event_id === study.event_id).country_slug && o.indicator === item.indicator_id && o.value !== null), 'published observations exist');
    }
    if (study.window) assert.ok(links.linkedWindowOutcomes(study.event_id).includes(study.window.outcome), 'window outcome is an explained monthly link');
    else assert.ok(study.window_blocker, 'a missing window is explained');
    for (const project of study.concurrent_projects) assert.ok(projects.some((p) => p.id === project.project_id && p.country_slug === events.find((e) => e.event_id === study.event_id).country_slug));
  }
});

test('bilingual text without causal or predictive claims', () => {
  const causal = /\b(caused|causes|led to|resulted in|impact of the (plan|announcement|event)|boosted|will (raise|lower|increase|reduce))\b/i;
  for (const study of eventCaseStudies) for (const text of texts(study)) {
    assert.ok(text.zh.trim() && text.en.trim(), `${study.event_id}: bilingual`);
    assert.doesNotMatch(text.en, /[㐀-鿿]/u);
    assert.doesNotMatch(text.en, causal, `${study.event_id}: ${text.en}`);
  }
  for (const study of eventCaseStudies) assert.ok(study.cannot_establish.some((item) => /no comparison group and no identification strategy/.test(item.en)));
});

test('the demonstration window passes the existing engine gate on published data; the event month stays separate', () => {
  const study = eventCaseStudies.find((s) => s.window);
  const event = events.find((row) => row.event_id === study.event_id);
  const series = macroSeries(study.window.outcome, event.country_slug);
  const result = engine.computeEventWindow(event, series, { preMonths: 12, postMonths: 12 });
  assert.equal(result.gate, 'full');
  assert.equal(result.event_period, '2023-10');
  assert.equal(result.pre_observations, 12);
  assert.equal(result.post_observations, 12);
  assert.deepEqual(result.missing_periods, []);
  assert.equal(result.change_semantics, 'percentage_points');
  assert.equal(result.points.length, 25, 'pre, event month and post are separate periods');
  assert.equal(result.event_period_value, result.points.find((p) => p.relative_month === 0).value);
  const comparison = engine.computeEventWindow({ ...event, country_slug: study.window.comparison.country }, macroSeries(study.window.outcome, study.window.comparison.country), { preMonths: 12, postMonths: 12 });
  assert.equal(comparison.gate, 'full', 'comparison uses the same engine and definition');
  assert.ok(macroSeries(study.window.external.outcome, event.country_slug).length, 'external series is published');
  // Missing months are reported, never filled.
  const gapped = engine.computeEventWindow(event, series.filter((p) => p.period !== '2023-12'), { preMonths: 12, postMonths: 12 });
  assert.deepEqual(gapped.missing_periods, ['2023-12']);
  assert.equal(gapped.post_observations, 11);
});

test('annual phases split before / event year / after without statistics', () => {
  assert.equal(annualPhase(2021, '2022-08-12'), 'pre');
  assert.equal(annualPhase(2022, '2022-08-12'), 'event');
  assert.equal(annualPhase(2024, '2022-08-12'), 'post');
});
