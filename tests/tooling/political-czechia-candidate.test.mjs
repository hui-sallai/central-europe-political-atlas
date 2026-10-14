import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkCandidate, missingFromSchema, nationalCandidate, scanXml, STRUCTURE } from '../../scripts/political-data/czechia/build-candidate.mjs';

// SYNTHETIC fixture shaped after the audited field names; not ČSÚ data.
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VYSLEDKY><CR><UCAST ZAPSANI_VOLICI="1000" VYDANE_OBALKY="700" UCAST_PROC="70.00" PLATNE_HLASY="690"/>
<STRANA KSTRANA="1" NAZ_STR="Strana A"><HODNOTY_STRANA HLASY="400" PROC_HLASU="57.97"/></STRANA>
<STRANA KSTRANA="2" NAZ_STR="Koalice B &amp; C"><HODNOTY_STRANA HLASY="250" PROC_HLASU="36.23"/></STRANA>
<STRANA KSTRANA="3" NAZ_STR="Strana D"><HODNOTY_STRANA HLASY="40" PROC_HLASU="5.80"/></STRANA></CR>
<KRAJ CIS_KRAJ="1" POCMANDATU="6"><STRANA KSTRANA="1"><HODNOTY_STRANA HLASY="200" PROC_HLASU="58.0" MANDATY="4"/></STRANA><STRANA KSTRANA="2"><HODNOTY_STRANA HLASY="120" PROC_HLASU="35.0" MANDATY="2"/></STRANA></KRAJ>
<KRAJ CIS_KRAJ="2" POCMANDATU="4"><STRANA KSTRANA="1"><HODNOTY_STRANA HLASY="200" PROC_HLASU="58.0" MANDATY="2"/></STRANA><STRANA KSTRANA="2"><HODNOTY_STRANA HLASY="130" PROC_HLASU="37.0" MANDATY="2"/></STRANA></KRAJ></VYSLEDKY>`;
const xsd = ['CR', 'KRAJ', 'UCAST', 'ZAPSANI_VOLICI', 'VYDANE_OBALKY', 'UCAST_PROC', 'PLATNE_HLASY', 'STRANA', 'KSTRANA', 'NAZ_STR', 'HODNOTY_STRANA', 'HLASY', 'PROC_HLASU', 'MANDATY', 'POCMANDATU'].map((n) => `<xs:element name="${n}"/>`).join('');

test('the builder refuses to read the results unless the official XSD declares every field it uses', () => {
  assert.deepEqual(missingFromSchema(xsd), []);
  assert.deepEqual(missingFromSchema(xsd.replace('name="MANDATY"', 'name="X"')), ['MANDATY']);
  assert.ok(STRUCTURE.list.attributes.includes('KSTRANA'));
});

test('national totals: published values kept, regional rows used only for official seat sums', () => {
  const c = nationalCandidate(scanXml(xml));
  assert.equal(c.turnout.valid_votes, 690);
  assert.equal(c.turnout.published_turnout, 70);
  assert.deepEqual(c.lists.map((l) => [l.ballot_number, l.native_label, l.votes, l.published_vote_share]), [['1', 'Strana A', 400, 57.97], ['2', 'Koalice B & C', 250, 36.23], ['3', 'Strana D', 40, 5.8]]);
  assert.deepEqual([...c.seats], [['1', 6], ['2', 4]], 'coalition seats stay with the coalition; no seat is invented for list 3');
  assert.deepEqual(c.regionTotals, [6, 4]);
  const r = checkCandidate(c);
  assert.deepEqual(r.failures, []);
  assert.equal(r.totalSeats, 10);
});

test('arithmetic checks against the audited definitions fail closed', () => {
  const bad = (from, to) => checkCandidate(nationalCandidate(scanXml(xml.replace(from, to)))).failures;
  assert.ok(bad('PLATNE_HLASY="690"', 'PLATNE_HLASY="691"').length, 'votes do not sum');
  assert.ok(bad('UCAST_PROC="70.00"', 'UCAST_PROC="71.00"').length, 'turnout identity');
  assert.ok(bad('PROC_HLASU="57.97"', 'PROC_HLASU="58.97"').length, 'share identity');
  assert.ok(bad('POCMANDATU="6"', 'POCMANDATU="7"').length, 'seats do not sum to regional totals');
  assert.throws(() => nationalCandidate(scanXml(xml.replace('HLASY="40"', 'HLASY="4x"'))), /integer/);
  assert.throws(() => nationalCandidate(scanXml(xml.replace(/<UCAST [^>]*\/>/, ''))), /one national UCAST/);
});

test('staging only: no regional output, no network access, no production paths, coalitions not split', () => {
  const builder = fs.readFileSync('scripts/political-data/czechia/build-candidate.mjs', 'utf8');
  assert.doesNotMatch(builder, /\bfetch\(|https\.get|curl/);
  for (const target of [...builder.matchAll(/writeFileSync\(([^;]+);/g)].map((m) => m[1])) assert.doesNotMatch(target, /src\/data|public\/research-data/);
  assert.doesNotMatch(builder, /CIS_KRAJ|okres|obec|okrsk/i, 'no regional or municipal identifiers are carried');
  assert.equal(fs.existsSync('src/data/political/czechia'), false);
  const status = JSON.parse(fs.readFileSync('docs/political-data/czechia_candidate_status.json', 'utf8'));
  assert.equal(status.production_authorised, false);
  assert.ok(status.blockers.some((b) => /reuse/i.test(b.item)));
  assert.equal(status.candidate_built, false);
});
