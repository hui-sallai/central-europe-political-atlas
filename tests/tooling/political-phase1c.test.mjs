import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { validateCandidate } from '../../scripts/political-data/romania/validate-candidate.mjs';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { electionViewsFromStores } = require('../../src/lib/politicalStores.ts');
const { compareCountries, measureValue, descriptiveShare } = require('../../src/lib/politicalExplorer.ts');
const germany = (name) => JSON.parse(fs.readFileSync(`src/data/political/germany/${name}.json`, 'utf8'));
const germanViews = () => electionViewsFromStores({ elections: germany('elections'), turnout: germany('election_turnout'), results: germany('election_results'), contestants: germany('electoral_contestants'), legislatures: germany('legislatures'), systems: germany('electoral_systems'), sources: germany('political_source_registry') }, { slug: 'germany', name: { en: 'Germany', 'zh-CN': '德国' }, voteLabel: { en: 'Second votes', 'zh-CN': '第二票' }, originalLanguage: 'de' });

const H = 'a'.repeat(64);
const prov = (id) => [{ source_id: id, raw_snapshot: { sha256: H }, parser_sha256: H }];
const fixture = () => ({
  elections: [{ election_id: 'el-ro-cd-2016-12-11', date: '2016-12-11', year: 2016, chamber: 'Camera Deputaților', legislature_id: 'lg', electoral_system_id: 'es', result_status: 'candidate_unreconciled', result_vintage: 'v', provenance: prov('s1') }],
  election_turnout: [{ election_id: 'el-ro-cd-2016-12-11', valid_votes: 100, published_turnout: null, derived_turnout: null, eligible_voters: null, voters: null, provenance: prov('s1') }],
  electoral_contestants: [['c1', 'LIST A'], ['c2', 'LIST B']].map(([id, label]) => ({ contestant_id: id, registered_label_native: label, historical_display_label: label, lead_party_id: null, continuous_series_eligible: false, provenance: prov('s1') })),
  election_results: [['c1', 60, 3], ['c2', 30, null]].map(([id, votes, seats]) => ({ election_id: 'el-ro-cd-2016-12-11', contestant_ref: id, valid_votes: 100, total_seats: null, votes, published_vote_share: null, derived_vote_share: votes, seats, derived_seat_share: null, provenance: prov('s1') })),
  aggregate_rows_not_contestants: [{ votes: 10 }],
  legislatures: [{ legislature_id: 'lg', total_seats: null, seats_allocated_in_constituency_file: 3, provenance: prov('s1') }],
  electoral_systems: [{ electoral_system_id: 'es', system_family: 'list PR', allocation_method: 'not established', base_seats: null, vote_type: 'chamber_list_vote', notes: { en: 'n', 'zh-CN': 'n' }, provenance: prov('s1') }],
  political_source_registry: [{ source_id: 's1', dataset: 'd', url: 'https://example.com/x', licence_url: 'https://example.com/l', attribution: 'AEP, OGL-ROU-1.0', licence_status: 'open_licence_recorded_in_atlas_registry_not_production_authorised', raw_sha256: H }],
});
const mutate = (change) => { const stores = fixture(); change(stores); return validateCandidate(stores).failures; };

test('candidate validator: a consistent candidate passes but is never production-ready', () => {
  const { failures, blocking } = validateCandidate(fixture());
  assert.deepEqual(failures, []);
  assert.ok(blocking.some((item) => /owner authorisation/.test(item)) && blocking.length >= 6);
});

test('candidate validator rejects broken totals, invented values, identity claims, persons and Senate data', () => {
  assert.ok(mutate((s) => { s.election_results[0].votes = 61; }).length, 'votes no longer sum to valid votes');
  assert.ok(mutate((s) => { s.election_results[1].seats = 0; }).length, 'missing seats turned into zero');
  assert.ok(mutate((s) => { s.legislatures[0].total_seats = 3; }).length, 'chamber size asserted from a partial sum');
  assert.ok(mutate((s) => { s.election_results[0].published_vote_share = 60; }).length, 'derived share presented as published');
  assert.ok(mutate((s) => { s.election_turnout[0].derived_turnout = 39.5; }).length, 'turnout derived from unconfirmed columns');
  assert.ok(mutate((s) => { s.electoral_contestants[0].continuous_series_eligible = true; }).length, 'continuity asserted');
  assert.ok(mutate((s) => { s.electoral_contestants[0].historical_display_label = 'Renamed'; }).length, 'original label altered');
  assert.ok(mutate((s) => { s.electoral_contestants[1].registered_label_native = s.electoral_contestants[1].historical_display_label = 'CANDIDAT INDEPENDENT - A PERSON'; }).length, 'individual candidate stored');
  assert.ok(mutate((s) => { s.elections[0].chamber = 'Senat'; }).length, 'Senate data');
  assert.ok(mutate((s) => { s.elections[0].election_id = 'el-ro-cd-2016-12-10'; }).length, 'identifier and date disagree');
  assert.ok(mutate((s) => { s.elections[0].result_status = 'final'; }).length, 'candidate labelled final');
  assert.ok(mutate((s) => { s.election_results[0].provenance = prov('unknown'); }).length, 'unregistered source');
  assert.ok(mutate((s) => { s.political_source_registry[0].licence_status = 'verified_open_licence'; }).length, 'candidate marked production-authorised');
});

test('the store adapter reads a second country in the same schema; missing totals stay missing', () => {
  const s = fixture();
  const [view] = electionViewsFromStores({ elections: s.elections, turnout: s.election_turnout, results: s.election_results, contestants: s.electoral_contestants, legislatures: s.legislatures, systems: s.electoral_systems, sources: s.political_source_registry }, { slug: 'fixture', name: { en: 'Fixture', 'zh-CN': '样例' }, voteLabel: { en: 'List votes', 'zh-CN': '名单票' }, originalLanguage: 'ro' });
  assert.equal(view.validSecondVotes, 100);
  assert.equal(view.totalSeats, null);
  assert.equal(view.results[0].secondVotes, 60);
  assert.equal(measureValue(view.results[0], view, 'seat_share'), null);
  assert.equal(measureValue(view.results[1], view, 'seats'), null);
  assert.equal(descriptiveShare(3, null), null);
  const german = germanViews().find((item) => item.year === 2017);
  const comparison = compareCountries(german, view);
  assert.equal(comparison.yearsApart, 1);
  assert.equal(comparison.sameAllocationMethod, false);
  assert.deepEqual(Object.keys(comparison.rows[0]).sort(), ['a', 'b', 'key'], 'no difference, rank or score fields');
  assert.equal(comparison.rows.find((row) => row.key === 'seats').b, null);
  assert.doesNotMatch(JSON.stringify(comparison), /rank|score|difference/);
});

test('Germany views are unchanged by the adapter refactor', () => {
  const views = germanViews();
  assert.equal(views.length, 7);
  const v2021 = views.find((item) => item.year === 2021);
  assert.equal(v2021.totalSeats, 735);
  assert.equal(v2021.results.length, 40);
  assert.equal(views.at(-1).publishedTurnout, 82.5);
  assert.equal(views.at(-1).country, 'germany');
});

test('staged Romania candidate (when present locally) is consistent and stays outside the published tree', { skip: !fs.existsSync('.tmp-data-refresh/political-candidate-romania/candidate/stores/elections.json') }, () => {
  const dir = '.tmp-data-refresh/political-candidate-romania/candidate/stores';
  const stores = Object.fromEntries(fs.readdirSync(dir).map((name) => [path.basename(name, '.json'), JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))]));
  assert.deepEqual(validateCandidate(stores).failures, []);
  assert.equal(stores.electoral_contestants.length, 35);
  assert.equal(stores.legislatures[0].seats_allocated_in_constituency_file, 312);
  assert.equal(fs.existsSync('src/data/political/romania'), false);
  assert.equal(fs.existsSync('public/research-data/political/romania'), false);
});
