import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { isIndependent, labelKey, parseCsvLine, sumStations } from '../../scripts/political-data/romania/build-candidate.mjs';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { alignByLabel, chartResults, compareElections } = require('../../src/lib/politicalExplorer.ts');
const result = (label, votes, share, seats) => ({ contestantId: label, nativeLabel: label, secondVotes: votes, publishedVoteShare: share, seats, sourceId: 's' });
const election = (year, results, extra = {}) => ({ electionId: `e${year}`, year, date: `${year}-01-01`, resultVintage: 'final', validSecondVotes: 1000, totalSeats: 100, publishedTurnout: 70, eligibleVoters: 2000, voters: 1400, system: { family: 'f', allocationMethod: 'm', baseSeats: 100, voteType: 'second_vote' }, notes: { en: '', 'zh-CN': '' }, sources: [], results, ...extra });

test('election comparison works at election level only and never links lists across elections', () => {
  const a = election(2021, [result('Die Linke', 50, 4.9, 39), result('SPD', 300, 25.7, 206), result('Tiny', 1, 0.1, null)]);
  const b = election(2025, [result('DIE LINKE', 90, 8.8, 64), result('SPD', 200, 16.4, 120)], { publishedTurnout: 82.5, totalSeats: 90 });
  const rows = compareElections(a, b);
  assert.equal(rows.find((row) => row.key === 'turnout').difference, 12.5);
  assert.equal(rows.find((row) => row.key === 'seats').difference, -10);
  assert.equal(rows.find((row) => row.key === 'seat_lists').a, 2);
  assert.equal(compareElections(a, { ...b, publishedTurnout: null }).find((row) => row.key === 'turnout').difference, null);
  const aligned = alignByLabel(a, b);
  assert.equal(aligned.find((row) => row.label === 'SPD').a.seats, 206);
  assert.equal(aligned.find((row) => row.label === 'Die Linke').b, null);
  assert.equal(aligned.find((row) => row.label === 'DIE LINKE').a, null);
  for (const row of aligned) assert.deepEqual(Object.keys(row).sort(), ['a', 'b', 'label']);
  assert.deepEqual(chartResults(a).map((r) => r.nativeLabel), ['SPD', 'Die Linke']);
});

test('Germany stays the only production country and its stores are untouched by this phase', () => {
  assert.deepEqual(fs.readdirSync('src/data/political'), ['germany']);
  assert.deepEqual(fs.readdirSync('public/research-data/political'), ['germany']);
  const component = fs.readFileSync('src/components/PoliticalExplorerAlpha.tsx', 'utf8');
  // The explorer may say that a Romanian candidate exists in staging; it must never import or embed Romanian data.
  assert.doesNotMatch(component, /political\/romania|ct-ro-|el-ro-|PARTIDUL/);
  assert.match(fs.readFileSync('src/lib/politicalData.ts', 'utf8'), /politicalComparisonCountries\(\): PoliticalCountryView\[\] \{\n  return \[\];/);
  assert.doesNotMatch(fs.readFileSync('src/lib/politicalData.ts', 'utf8'), /political\/romania|from "@\/data\/political\/(?!germany)/);
});

test('Romania candidate builder: national sums only, Chamber only, no candidate names, staging only', () => {
  const builder = fs.readFileSync('scripts/political-data/romania/build-candidate.mjs', 'utf8');
  for (const target of [...builder.matchAll(/writeFileSync\(([^;]+);/g)].map((m) => m[1])) assert.doesNotMatch(target, /src\/data|public\/research-data/);
  assert.doesNotMatch(builder, /siap2016s|bvcs-1|mandate-pe-competitori-pe-circumscripii-s\b/, 'Senate files are never referenced');
  assert.equal(isIndependent('CANDIDAT INDEPENDENT - SOMEONE'), true);
  assert.equal(isIndependent('PARTIDUL SOCIAL DEMOCRAT'), false);
  assert.equal(labelKey('PARTIDUL NAŢIONAL  LIBERAL'), labelKey('PARTIDUL NAȚIONAL LIBERAL'));
  assert.deepEqual(parseCsvLine('1,"A, B",3', ','), ['1', 'A, B', '3']);
  const summed = sumStations('n,e,L1,L2,stamp\n1,5,2,3,x\n2,4,,4,y\n', ',', 2, ['e'], 1);
  assert.deepEqual(summed.votes, [2, 7]);
  assert.equal(summed.counts.e, 9);
  assert.throws(() => sumStations('n,e,L1\n1,5,abc\n', ',', 2, ['e']), /non-integer/);
  const status = JSON.parse(fs.readFileSync('docs/political-data/romania_candidate_status.json', 'utf8'));
  assert.equal(status.state, 'candidate_not_authorised_for_production');
  assert.equal(status.licence.title, 'OGL-ROU-1.0');
  assert.doesNotMatch(builder, /data\.gov\.ro\/api\//, 'the robots-disallowed API path is not used');
  assert.doesNotMatch(builder, /\bfetch\(|https\.get|curl/, 'the builder never fetches');
  assert.equal(status.consistency_checks.main_file_column_e_equals_sum_of_list_votes, true);
  assert.doesNotMatch(JSON.stringify(status), /CANDIDAT INDEPENDENT -/);
  for (const source of Object.values(status.sources)) assert.match(source.sha256, /^[0-9a-f]{64}$/);
});

test('polling stays a proposal: no data, no forecast fields, source policy unchanged', () => {
  const proposal = JSON.parse(fs.readFileSync('docs/political-data/polling_measurement_schema_proposal.json', 'utf8'));
  assert.equal(proposal.state, 'proposal_not_approved_no_data');
  assert.ok(!('records' in proposal) && !('observations' in proposal));
  assert.doesNotMatch(Object.keys(proposal.fields).join(' '), /probab|forecast|projection|ideology|score/);
  assert.match(fs.readFileSync('docs/political-data/political_source_policy.md', 'utf8'), /polls/);
  assert.equal(fs.existsSync('src/data/political/polling'), false);
});
