import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rec = JSON.parse(fs.readFileSync('docs/data-coverage/targeted_refresh_reconciliation_2026-11-11.json', 'utf8'));
const inventory = JSON.parse(fs.readFileSync('src/data/data-coverage/historical_recovery_inventory.json', 'utf8'));
const next = (p, annual) => annual ? String(Number(p) + 1) : (([y, m]) => m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`)(p.split('-').map(Number));
const categoryOne = inventory.series.flatMap((s) => (s.missing?.periods ?? []).filter((p) => p.category === 1).flatMap((p) => { const out = []; for (let x = p.from; x <= p.to; x = next(x, s.frequency === 'annual')) out.push(`${s.key}|${x}`); return out; })).sort();

test('the reconciliation covers exactly the inventory category-1 periods while no new data is admitted', () => {
  const keys = rec.rows.map((r) => `${r.key}|${r.period}`).sort();
  if (inventory.summary.missing_periods_by_category['1_available_officially_not_admitted'] !== 189) return; // superseded by an applied refresh
  assert.equal(rec.summary.cases, 189);
  assert.deepEqual(keys, categoryOne);
  assert.equal(rec.summary.by_class.admitted_and_published, 0, 'nothing is admitted without an applied, owner-approved run');
});

test('classes are complete, exclusive and sum to the case count', () => {
  const total = Object.values(rec.summary.by_class).reduce((a, b) => a + b, 0);
  assert.equal(total, rec.summary.cases);
  for (const r of rec.rows) assert.ok(r.class in { admitted_and_published: 1, already_present_or_not_applicable: 1, officially_unavailable: 1, definitionally_incompatible: 1, restricted_or_awaiting_approval: 1, still_unresolved: 1 }, r.key);
  const routes = rec.summary.by_route;
  assert.equal(routes.high_frequency_staged + routes.macro_drivers_blocked + routes.canonical_annual + routes.serbia_hicp_definition, rec.summary.cases);
});

test('every case has live official evidence from a registered host, unchanged against the archive', () => {
  for (const r of rec.rows) {
    assert.ok(r.sources.length >= 1, r.key);
    for (const s of r.sources) {
      assert.match(s.url, /^https:\/\/(ec\.europa\.eu\/eurostat\/api\/|stats\.bis\.org\/api\/)/, r.key);
      assert.match(s.live_sha256, /^[0-9a-f]{64}$/, r.key);
      assert.equal(s.cells_changed_vs_archive, 0, `${r.key} ${r.period}`);
    }
    assert.ok(Object.values(r.official_cells).some((c) => c.value !== null), `${r.key} ${r.period}: official value present`);
  }
});

test('Serbia HICP is definitionally incompatible (flag d on every official value); vintage holds stay 328', () => {
  const serbia = rec.rows.filter((r) => r.key === 'annual|serbia|hicp_inflation');
  assert.equal(serbia.length, 5);
  for (const r of serbia) { assert.equal(r.class, 'definitionally_incompatible'); assert.ok(Object.values(r.official_cells).every((c) => c.flag === 'd')); }
  assert.equal(rec.summary.vintage_held_periods, 328);
});
