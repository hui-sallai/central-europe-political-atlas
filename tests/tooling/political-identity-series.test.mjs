import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { germanInteger, linkSeries, parseDelimited, seriesId } from '../../scripts/political-data/germany/build-official-series.mjs';

const record = JSON.parse(fs.readFileSync('docs/political-data/germany_official_series_links.json', 'utf8'));
const store = (name) => JSON.parse(fs.readFileSync(`src/data/political/germany/${name}.json`, 'utf8'));

test('parsing: quoted multi-line fields and German integers; missing never becomes zero', () => {
  assert.deepEqual(parseDelimited('a;"b\nc";d\n1;2;3\n'), [['a', 'b\nc', 'd'], ['1', '2', '3']]);
  assert.equal(germanInteger('8.149.124 '), 8149124);
  assert.equal(germanInteger('–'), null);
  assert.equal(germanInteger(''), null);
  assert.equal(germanInteger('12,5'), null);
});

test('links are made by exact unique official counts only — never by name', () => {
  const elections = [{ year: 2021, election_id: 'e21' }, { year: 2025, election_id: 'e25' }];
  const contestants = [{ contestant_id: 'a', election_id: 'e21', historical_display_label: 'Same Name' }, { contestant_id: 'b', election_id: 'e25', historical_display_label: 'Same Name' }, { contestant_id: 'c', election_id: 'e25', historical_display_label: 'Other' }, { contestant_id: 'd', election_id: 'e25', historical_display_label: 'Tie' }];
  const results = [{ contestant_ref: 'a', second_votes: 10 }, { contestant_ref: 'b', second_votes: 20 }, { contestant_ref: 'c', second_votes: 30 }, { contestant_ref: 'd', second_votes: 30 }];
  const out = linkSeries({ elections, contestants, results, tableRows: [{ label: 'X', year: 2021, secondVotes: 10, note: null }, { label: 'X', year: 2025, secondVotes: 99, note: null }, { label: 'Y', year: 2025, secondVotes: 30, note: null }] });
  // Identical names in two elections are NOT linked without a matching official count.
  assert.deepEqual(out.series.map((s) => [s.authority_series_label, s.links.map((l) => l.contestant_id)]), [['X', ['a']]]);
  assert.deepEqual(out.unmatchedRows.map((r) => r.reason), ['no contestant with this exact count', 'ambiguous: several contestants share this count']);
  assert.deepEqual(out.unresolved.map((u) => u.contestant_id).sort(), ['b', 'c', 'd']);
  assert.equal(out.series[0].relationship, 'single_election');
});

test('a name change is recorded only from the authority note, not from label differences', () => {
  const elections = [{ year: 2021, election_id: 'e21' }, { year: 2025, election_id: 'e25' }];
  const contestants = [{ contestant_id: 'a', election_id: 'e21', historical_display_label: 'ABC' }, { contestant_id: 'b', election_id: 'e25', historical_display_label: 'Alpha Beta Gamma' }];
  const results = [{ contestant_ref: 'a', second_votes: 10 }, { contestant_ref: 'b', second_votes: 20 }];
  const plain = linkSeries({ elections, contestants, results, tableRows: [{ label: 'ABC', year: 2021, secondVotes: 10, note: null }, { label: 'ABC', year: 2025, secondVotes: 20, note: null }] });
  assert.equal(plain.series[0].relationship, 'same_organisation_per_authority_series');
  const noted = linkSeries({ elections, contestants, results, tableRows: [{ label: 'ABC', year: 2021, secondVotes: 10, note: 'Parteiname 2021: Old' }, { label: 'ABC', year: 2025, secondVotes: 20, note: null }] });
  assert.equal(noted.series[0].relationship, 'name_change_documented_by_authority');
});

test('committed identity record: every link reproduces the canonical count, evidence is pinned, stores unchanged', () => {
  const raw = fs.readFileSync(record.source.raw_path);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), record.source.sha256);
  assert.equal(record.canonical_stores_changed, false);
  const results = store('election_results'), contestants = store('electoral_contestants');
  let links = 0;
  for (const series of record.series) {
    assert.equal(series.series_id, seriesId(series.authority_series_label));
    for (const link of series.links) {
      links += 1;
      const result = results.find((r) => r.contestant_ref === link.contestant_id);
      assert.equal(result.second_votes, link.authority_second_votes, `${series.authority_series_label} ${link.year}`);
      assert.equal(contestants.find((c) => c.contestant_id === link.contestant_id).historical_display_label, link.original_ballot_label);
    }
  }
  assert.equal(links + record.unresolved.length, contestants.length, 'every contestant is either linked once or listed as unresolved');
  assert.equal(new Set(record.series.flatMap((s) => s.links.map((l) => l.contestant_id))).size, links, 'no contestant in two series');
  assert.ok(contestants.every((c) => c.continuous_series_eligible === false), 'canonical crosswalk flags untouched');
  assert.deepEqual(record.series_counts.published_share_cross_check_mismatches, []);
  // CDU and CSU stay separate series; Die Linke carries the authority's earlier-name note.
  const label = (l) => record.series.find((s) => s.authority_series_label === l);
  assert.ok(label('CDU') && label('CSU') && label('CDU').series_id !== label('CSU').series_id);
  assert.equal(label('Die Linke').relationship, 'name_change_documented_by_authority');
  assert.equal(label('CDU').relationship, 'same_organisation_per_authority_series');
});

test('the generated UI module matches the record and offers only multi-election series', () => {
  const ts = fs.readFileSync('src/lib/politicalSeries.ts', 'utf8');
  const multi = record.series.filter((s) => s.links.length > 1);
  for (const s of multi) assert.ok(ts.includes(s.series_id), s.authority_series_label);
  for (const s of record.series.filter((x) => x.links.length === 1)) assert.ok(!ts.includes(`"id": "${s.series_id}"`), s.authority_series_label);
  assert.ok(ts.includes(record.source.sha256));
  assert.doesNotMatch(ts, /forecast|probab|score|ideolog/i);
});
