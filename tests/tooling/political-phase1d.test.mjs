import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { applyEvidence, loadEvidence, readiness } from '../../scripts/political-data/romania/evidence.mjs';
import { validateCandidate } from '../../scripts/political-data/romania/validate-candidate.mjs';
import { stationIndex } from '../../scripts/political-data/romania/build-candidate.mjs';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { electionViewsFromStores } = require('../../src/lib/politicalStores.ts');
const { compareCountries } = require('../../src/lib/politicalExplorer.ts');

const H = 'a'.repeat(64);
const prov = [{ source_id: 's1', raw_snapshot: { sha256: H }, parser_sha256: H }];
const stores = () => ({
  elections: [{ election_id: 'el-ro-cd-2016-12-11', date: '2016-12-11', year: 2016, chamber: 'Camera Deputaților', legislature_id: 'lg', electoral_system_id: 'es', result_status: 'candidate_unreconciled', result_vintage: 'v', provenance: prov }],
  election_turnout: [{ election_id: 'el-ro-cd-2016-12-11', valid_votes: 100, published_turnout: null, derived_turnout: null, eligible_voters: null, voters: null, provenance: prov }],
  electoral_contestants: [['c1', 'LIST A'], ['c2', 'UNIUNEA X']].map(([id, label]) => ({ contestant_id: id, registered_label_native: label, historical_display_label: label, lead_party_id: null, continuous_series_eligible: false, provenance: prov })),
  election_results: [['c1', 90, 3], ['c2', 10, null]].map(([id, votes, seats]) => ({ election_id: 'el-ro-cd-2016-12-11', contestant_ref: id, valid_votes: 100, total_seats: null, votes, published_vote_share: null, derived_vote_share: votes, seats, seats_basis: seats ? 'sum over 43 constituencies' : 'not in the constituency allocation file', derived_seat_share: null, provenance: prov })),
  aggregate_rows_not_contestants: [{ votes: 0 }],
  legislatures: [{ legislature_id: 'lg', total_seats: null, seats_allocated_in_constituency_file: 3, provenance: prov }],
  electoral_systems: [{ electoral_system_id: 'es', system_family: 'list PR', allocation_method: 'not established', base_seats: null, vote_type: 'chamber_list_vote', notes: { en: 'n', 'zh-CN': 'n' }, provenance: prov }],
  political_source_registry: [{ source_id: 's1', dataset: 'd', url: 'https://example.com/x', licence_url: 'https://example.com/l', attribution: 'AEP, OGL-ROU-1.0', licence_status: 'open_licence_recorded_in_atlas_registry_not_production_authorised', raw_sha256: H }],
});
const checks = { main_file_column_e_equals_sum_of_list_votes: true, postal_bureau_not_in_station_file: true, every_seat_winning_list_matches_a_results_list: true };

function stage(manifest, files = { 'results.pdf': 'official results' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-evidence-'));
  fs.mkdirSync(path.join(dir, 'evidence'));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'evidence', name), body);
  if (manifest) fs.writeFileSync(path.join(dir, 'evidence', 'evidence.json'), JSON.stringify(manifest(crypto.createHash('sha256').update('official results').digest('hex'))));
  return dir;
}
const doc = (sha, extra = {}) => ({ id: 'final', kind: 'final_results', title: 'Final results', issuer: 'BEC', url: 'https://example.com/r', file: 'results.pdf', sha256: sha, reuse_basis: 'official publication', ...extra });

test('without staged evidence every source-definition field stays blocked and nothing is invented', () => {
  const evidence = loadEvidence(stage(null));
  assert.equal(evidence.present, false);
  const { stores: out } = applyEvidence(stores(), evidence);
  const r = readiness({ stores: out, evidence, log: [], checks });
  assert.equal(r.technically_ready_for_activation, false);
  assert.equal(r.authorisation.production_authorised, false);
  for (const field of ['election_date', 'total_chamber_seats', 'minority_representation', 'count_column_definitions', 'published_turnout', 'turnout_definition', 'published_vote_share']) assert.ok(r.summary.blocked.includes(field), field);
  assert.deepEqual(validateCandidate(out).failures, []);
});

test('evidence is accepted only for staged documents with matching checksums, a reuse basis and locators', () => {
  const evidence = loadEvidence(stage((sha) => ({ documents: [doc(sha), doc('0'.repeat(64), { id: 'bad-hash' }), doc(sha, { id: 'no-reuse', reuse_basis: '' }), doc(sha, { id: 'missing', file: 'absent.pdf' })], facts: {
    total_chamber_seats: { value: 5, document_id: 'final', locator: 'table 1' },
    published_turnout: { value: 39.5, document_id: 'bad-hash', locator: 'p. 2' },
    turnout_definition: { text: 'voters / registered voters', document_id: 'final' },
    minority_seats: [{ organisation_label_native: 'UNIUNEA X', seats: 1, document_id: 'final', locator: 'annex 2' }],
    published_vote_shares: [{ list_label_native: 'LIST A', value: 90.0, document_id: 'final', locator: 'table 3' }],
    election_date: { value: '2016-12-10', document_id: 'final', locator: 'p. 1' },
  } })));
  assert.deepEqual(Object.keys(evidence.documents), ['final']);
  assert.deepEqual(evidence.rejected.map((r) => r.reason).sort(), ['document file is not staged', 'reuse basis is required', 'sha256 does not match the staged file']);
  const { stores: out, log } = applyEvidence(stores(), evidence);
  assert.equal(out.legislatures[0].total_seats, 5);
  assert.equal(out.election_turnout[0].published_turnout, null, 'fact citing a rejected document is ignored');
  assert.equal(out.election_turnout[0].turnout_definition_evidence, undefined, 'fact without a locator is ignored');
  assert.ok(log.some((entry) => entry.fact === 'election_date' && entry.status === 'conflict'), 'a date conflict is reported, not silently applied');
  assert.equal(out.elections[0].date_basis, undefined);
  assert.equal(out.minority_representation.length, 1);
  assert.equal(out.election_results.find((row) => row.contestant_ref === 'c2').seats, null, 'minority seats stay out of the list results');
  assert.equal(out.election_results.find((row) => row.contestant_ref === 'c1').published_vote_share, 90);
  assert.deepEqual(validateCandidate(out).failures, []);
});

test('validator refuses unevidenced or inconsistent totals, turnout and minority seats', () => {
  const broken = (change) => { const s = stores(); s.minority_representation = []; change(s); return validateCandidate(s).failures; };
  assert.ok(broken((s) => { s.legislatures[0].total_seats = 3; }).length, 'Chamber size without evidence');
  assert.ok(broken((s) => { s.legislatures[0].total_seats = 3; s.legislatures[0].total_seats_evidence = { document_id: 'd', locator: 'l' }; s.minority_representation = [{ organisation_label_native: 'UNIUNEA X', seats: 1, evidence: { document_id: 'd' } }]; }).length, 'Chamber size smaller than list plus minority seats');
  assert.ok(broken((s) => { s.election_turnout[0].published_turnout = 39.5; }).length, 'turnout without evidence');
  assert.ok(broken((s) => { s.election_results[0].published_vote_share = 90; }).length, 'published share without evidence');
  assert.ok(broken((s) => { s.minority_representation = [{ organisation_label_native: 'UNIUNEA X', seats: 0, evidence: { document_id: 'd' } }]; }).length, 'zero minority seats');
  assert.ok(broken((s) => { s.elections[0].date_basis = 'official_document'; }).length, 'official date without its document');
});

test('postal bureau is detected as separate from the station file (no double counting)', () => {
  const main = stationIndex('n,ctry,constituency,name,station,x,Data trimiterii Procesului-verbal\n1,R,43,D,1,0,20161212_01\n2,R,43,D,2,0,20161212_05\n', ',', 2, 4);
  const postal = stationIndex('t;constituency;name;station\nCD;43;D;418\n', ';', 1, 3);
  assert.deepEqual(main.keys, ['43|1', '43|2']);
  assert.equal(main.first_stamp, '20161212_01');
  assert.ok(postal.keys.every((key) => !main.keys.includes(key)));
  const overlapping = stationIndex('t;constituency;name;station\nCD;43;D;2\n', ';', 1, 3);
  assert.ok(overlapping.keys.some((key) => main.keys.includes(key)));
});

test('committed readiness status never grants authorisation and matches the candidate state', () => {
  const r = JSON.parse(fs.readFileSync('docs/political-data/romania_publication_readiness.json', 'utf8'));
  assert.equal(r.authorisation.production_authorised, false);
  assert.deepEqual(r.authorisation.registry_authorises, ['germany']);
  assert.equal(r.technically_ready_for_activation, false);
  assert.ok(r.summary.blocked.includes('total_chamber_seats') && r.summary.blocked.includes('published_turnout'));
  assert.ok(r.summary.publishable_pending_authorisation.includes('list_votes_national'));
  const template = JSON.parse(fs.readFileSync('docs/political-data/romania_evidence_template.json', 'utf8'));
  assert.equal(template.documents_required.length, 7);
  assert.equal(fs.existsSync('src/data/political/romania'), false);
});

test('the candidate stores fit the existing comparison model without placeholders', { skip: !fs.existsSync('.tmp-data-refresh/political-candidate-romania/candidate/stores/elections.json') }, () => {
  const dir = '.tmp-data-refresh/political-candidate-romania/candidate/stores';
  const s = Object.fromEntries(fs.readdirSync(dir).map((name) => [path.basename(name, '.json'), JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))]));
  const [romania] = electionViewsFromStores({ elections: s.elections, turnout: s.election_turnout, results: s.election_results, contestants: s.electoral_contestants, legislatures: s.legislatures, systems: s.electoral_systems, sources: s.political_source_registry }, { slug: 'romania', name: { en: 'Romania', 'zh-CN': '罗马尼亚' }, voteLabel: { en: 'Chamber list votes', 'zh-CN': '众议院名单票' }, originalLanguage: 'ro' });
  assert.equal(romania.validSecondVotes, 7047384);
  assert.equal(romania.totalSeats, null);
  assert.equal(romania.publishedTurnout, null);
  assert.equal(romania.chamber, 'Camera Deputaților');
  assert.ok(romania.results.every((result) => result.publishedVoteShare === null));
  const german = { ...romania, electionId: 'de', year: 2017, chamber: 'Bundestag', system: { ...romania.system, allocationMethod: 'Sainte-Laguë/Schepers' } };
  const comparison = compareCountries(german, romania);
  assert.equal(comparison.rows.find((row) => row.key === 'turnout').b, null);
  assert.equal(comparison.rows.find((row) => row.key === 'seats').b, null);
  assert.equal(comparison.rows.find((row) => row.key === 'chamber').b, 'Camera Deputaților');
});
