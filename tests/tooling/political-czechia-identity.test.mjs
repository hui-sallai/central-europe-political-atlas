import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const data = require('../../src/lib/politicalData.ts');
const { continuousPartyLink } = require('../../src/lib/politicalIdentity.ts');
const { linkedUnitComparison } = require('../../src/lib/politicalContinuity.ts');
const STORE = 'src/data/political/czechia';
const contestants = read(`${STORE}/electoral_contestants.json`), links = read(`${STORE}/party_identity_links.json`), members = read(`${STORE}/contestant_members.json`), parties = read(`${STORE}/political_parties.json`);
const results = read(`${STORE}/election_results.json`);
const list = (year, code) => contestants.find((c) => c.contestant_id === `ct-cz-ps${year}-${String(code).padStart(2, '0')}`);
const verified = links.filter((l) => l.relation === 'same_party' && l.status === 'verified');
const panel = data.politicalCzechContinuity();
const entity = (label) => panel.entities.find((e) => e.label === label);

test('evidence: every register file has no-protected-rights metadata, a checksum and an exact retrieval record', () => {
  const evidence = read('docs/political-data/raw/czechia/registers/evidence.json');
  assert.equal(evidence.distributions.length, 11);
  for (const d of evidence.distributions) {
    assert.deepEqual(d.rights, { autorske_dilo: 'Neobsahuje', originalni_databaze: 'Neobsahuje', zvlastni_pravo_poriz_databaze: 'Není chráněna', osobni_udaje: 'Neobsahuje' }, d.url);
    assert.match(d.url, /^https:\/\/volby\.gov\.cz\/opendata\/ps20(17|21|25)\//);
    assert.match(d.catalogue_page, /data\.gov\.cz/);
    if (d.archived_path) assert.equal(sha(d.archived_path), d.archived_sha256);
    for (const m of Object.values(d.members ?? {})) assert.equal(sha(m.archived_path), m.archived_sha256);
  }
  assert.ok(evidence.excluded.some((x) => x.file.endsWith('ps2025/csv_od/psrkl.csv')), 'the 2025 list register has no catalogue entry and stays unused');
  assert.ok(!evidence.distributions.some((d) => d.url.endsWith('ps2025/csv_od/psrkl.csv')));
});

test('no candidate data or Interior Ministry identifiers are committed', () => {
  const dir = 'docs/political-data/raw/czechia/registers';
  const names = fs.readdirSync(path.join(root, dir));
  assert.ok(!names.some((n) => /psrk\.|\.zip$/.test(n)), 'no candidate register, no package');
  const xml = fs.readFileSync(path.join(root, dir, 'ps2017_psrkl.xml'), 'latin1');
  assert.doesNotMatch(xml, /<(JMENO|PRIJMENI|DATUMNAR|VEK|TITULPRED)>/);
  const published = [`${dir}/evidence.json`, `${STORE}/political_parties.json`, `${STORE}/party_identity_links.json`, `${STORE}/contestant_members.json`].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  assert.doesNotMatch(published, /\bMV-\d+-\d+\/VS-\d{4}\b|\bVSC?\/1-\d+\/\d{2}\b|\bVS-\d+\/SDR\b|registration_number|identification_number|\bico\b/i, 'register identifiers are cited, not reproduced');
  assert.doesNotMatch(published, /\b\d{5}\s+Praha\b|\b\d{2}\. \d{2}\. (19|20)\d{2}\b/, 'no addresses or register dates of persons');
  assert.doesNotMatch(published, /@[a-z0-9-]+\.[a-z]{2,}/i);
});

test('kinds and coalitions: official composition, with single-party codes equal in the 2017 and 2021 registers', () => {
  assert.deepEqual(['2017', '2021', '2025'].map((y) => contestants.filter((c) => c.election_id.includes(`ps-${y}`) && c.contestant_kind === 'coalition').length), [0, 2, 1]);
  assert.deepEqual(list(2021, 13).csu_proposer_codes, [1, 53, 721]);
  assert.deepEqual(list(2021, 17).csu_proposer_codes, [166, 720]);
  assert.deepEqual(list(2025, 11).csu_proposer_codes, [1, 53, 721]);
  assert.equal(list(2021, 13).register_type, 'K');
  assert.equal(list(2025, 11).register_type, null, '2025 list register unused');
  for (const c of contestants.filter((x) => x.csu_register_code !== null && x.contestant_kind === 'party_list')) assert.equal(c.csu_register_code, c.csu_proposer_codes[0], c.contestant_id);
  for (const c of contestants) assert.deepEqual(members.filter((m) => m.contestant_id === c.contestant_id).length, c.csu_proposer_codes.length);
  for (const m of members) assert.equal(m.review_status, 'verified_same_election_membership');
});

test('coalition votes and seats stay whole: stores reconcile and no member receives a figure', () => {
  assert.equal(results.filter((r) => r.election_id.includes('ps-2021')).reduce((n, r) => n + r.seats, 0), 200);
  const views = data.politicalCzechElectionViews();
  const spolu = views[1].results.find((r) => r.contestantId === 'ct-cz-ps2021-13');
  assert.equal(spolu.partyId, null);
  assert.equal(spolu.memberPartyIds.length, 3);
  assert.equal(spolu.seats, 71);
  for (const label of ['ODS', 'KDU-ČSL', 'TOP 09']) {
    const [y2017, y2021, y2025] = entity(label).rows;
    assert.equal(y2017.status, 'own_list', label);
    for (const row of [y2021, y2025]) { assert.equal(row.status, 'coalition_member'); assert.equal(row.share, null); assert.equal(row.seats, null); assert.equal(row.change, null); }
    assert.equal(y2021.coalition.seats, 71);
    assert.equal(y2025.coalition.seats, 52);
  }
  for (const key of ['votes', 'seats', 'published_vote_share']) for (const m of members) assert.ok(!(key in m));
});

test('continuity: only reviewed parties with their own lists; exact series and links', () => {
  assert.deepEqual(parties.filter((p) => p.continuous_series_eligible).map((p) => p.abbreviation).sort(), ['ANO', 'KDU-ČSL', 'KSČM', 'ODS', 'Piráti', 'SOCDEM', 'SPD', 'STAN', 'TOP 09', 'Zelení'].sort());
  assert.deepEqual(verified.map((l) => `${l.fromContestant}>${l.toContestant}`).sort(), ['ct-cz-ps2017-21>ct-cz-ps2021-20', 'ct-cz-ps2021-20>ct-cz-ps2025-22', 'ct-cz-ps2017-29>ct-cz-ps2021-04', 'ct-cz-ps2021-04>ct-cz-ps2025-06', 'ct-cz-ps2017-07>ct-cz-ps2025-23', 'ct-cz-ps2017-15>ct-cz-ps2025-16', 'ct-cz-ps2017-04>ct-cz-ps2021-05', 'ct-cz-ps2017-08>ct-cz-ps2021-18', 'ct-cz-ps2017-09>ct-cz-ps2021-01'].sort());
  const views = data.politicalCzechElectionViews();
  const by = (id) => views.find((v) => v.electionId === id);
  for (const l of verified) assert.equal(continuousPartyLink(l, by(l.fromElection), by(l.toElection)), true, l.fromContestant);
  for (const l of links.filter((x) => x.status !== 'verified')) assert.equal(continuousPartyLink(l, by(l.fromElection), by(l.toElection)), false, l.fromContestant);
  for (const c of contestants) assert.equal(c.continuous_series_eligible, verified.some((l) => l.fromContestant === c.contestant_id || l.toContestant === c.contestant_id), c.contestant_id);
});

test('shared code and shared name never link: rename traps stay unresolved', () => {
  const pair = (from, to) => links.find((l) => l.fromContestant === from && l.toContestant === to);
  const referendum = pair(list(2017, 19).contestant_id, list(2025, 20).contestant_id);
  assert.equal(referendum.status, 'unresolved');
  assert.equal(referendum.code_list_name_changed, true);
  assert.equal(pair(list(2021, 3).contestant_id, list(2025, 7).contestant_id).status, 'unresolved');
  const left = pair(list(2021, 11).contestant_id, list(2025, 9).contestant_id);
  assert.equal(left.status, 'unresolved', 'an identical name without a register review is not continuity');
  assert.equal(left.code_list_name_changed, false);
  // The current register name of ČSSD is SOCDEM; the 2025 list labelled ČSSD is another code and never joins that series.
  assert.deepEqual(list(2025, 7).csu_proposer_codes, [759]);
  assert.ok(!links.some((l) => l.status === 'verified' && l.fromContestant === list(2021, 5).contestant_id));
  assert.deepEqual(entity('SOCDEM (ČSSD)').rows.map((r) => r.status), ['own_list', 'own_list', 'no_list']);
  assert.ok(parties.filter((p) => !p.continuous_series_eligible).every((p) => /^pp-cz-20\d\d-n/.test(p.atlas_party_id)), 'unreviewed proposers keep election-specific ids');
  assert.equal(new Set(parties.map((p) => p.atlas_party_id)).size, parties.length);
});

test('outputs: changes come from official values; rule changes and coalition periods are flagged', () => {
  const [a17, a21, a25] = entity('ANO').rows;
  assert.equal(a17.change, null);
  assert.equal(a21.change.seatsChange, 72 - 78);
  assert.equal(a21.change.rulesChanged, true);
  assert.equal(a25.change.seatsChange, 8);
  assert.equal(a25.change.rulesChanged, false);
  const stan = entity('STAN').rows;
  assert.equal(stan[1].status, 'coalition_member');
  assert.equal(stan[2].change.fromYear, 2017);
  assert.equal(stan[2].change.acrossCoalitionPeriod, true);
  const spolu = panel.entities.find((e) => e.kind === 'coalition');
  assert.deepEqual(spolu.rows.map((r) => r.status), ['no_list', 'coalition_list', 'coalition_list']);
  assert.equal(spolu.rows[2].change.seatsChange, 52 - 71);
  assert.equal(panel.entities.length, 11);
  assert.equal(panel.unresolved.length, links.filter((l) => l.relation === 'same_party' && l.status === 'unresolved').length);
});

test('election-to-election comparison lists verified units only, in date order', () => {
  const views = data.politicalCzechElectionViews(), identity = data.politicalCzechIdentityLinks();
  const labels = (x, y) => linkedUnitComparison(views, identity, x, y).rows.map((r) => r.kind);
  assert.deepEqual(labels(views[0], views[1]), Array(5).fill('party'), '2017–2021: ANO, SPD, KSČM, ČSSD and Zelení');
  assert.equal(labels(views[1], views[2]).filter((k) => k === 'coalition').length, 1, '2021–2025 includes SPOLU as a coalition');
  assert.equal(labels(views[1], views[2]).filter((k) => k === 'party').length, 2);
  assert.equal(labels(views[0], views[2]).length, 4, '2017–2025: ANO, SPD, STAN, Piráti');
  assert.equal(linkedUnitComparison(views, identity, views[2], views[0]).a.year, 2017);
});

test('Germany is untouched: same views, no Czech links reach the German series', () => {
  const de = data.politicalElectionViews();
  assert.equal(de.length, 7);
  assert.ok(de.every((v) => v.country === 'germany'));
  assert.ok(links.every((l) => l.country === 'czechia'));
  assert.ok(members.every((m) => m.country === 'czechia'));
});
