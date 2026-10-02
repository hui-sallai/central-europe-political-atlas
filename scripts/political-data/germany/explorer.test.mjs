import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptiveShare, measureValue } from '../../../src/lib/politicalExplorer.ts';

test('descriptive shares preserve null and real zero', () => {
  assert.equal(descriptiveShare(null, 630), null);
  assert.equal(descriptiveShare(0, 630), 0);
  assert.equal(descriptiveShare(63, 630), 10);
});
test('invalid counts and denominators are rejected', () => {
  for (const [n, d] of [[1, 0], [-1, 100], [101, 100], [1.5, 100], [1, Infinity]]) {
    assert.throws(() => descriptiveShare(n, d), RangeError);
  }
});
test('derived votes do not inherit rounded published percentages or fill missing seats', () => {
  const result = { secondVotes: 499, publishedVoteShare: 5, seats: null };
  const election = { validSecondVotes: 10000, totalSeats: 630 };
  assert.equal(measureValue(result, election, 'vote_share'), 4.99);
  assert.equal(measureValue(result, election, 'seat_share'), null);
  assert.equal(measureValue(result, election, 'seats'), null);
});
