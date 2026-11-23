// Germany 1990, 1994 and 1998 (owner brief 2026-11-23, answer "Additive exception"): transcription of the official
// pages that the canonical build cannot re-read in CI, because archived HTML is not committed (.gitignore). This script
// re-parses the local archive (docs/political-data/raw/germany/production_*/source.html, each checked against its
// metadata sha256) and writes or checks docs/political-data/germany_early_elections_evidence.json. The figures in that
// file are transcribed, never edited by hand; the build (early-elections.mjs) reconciles them against the committed
// final-results ZIP and the committed historical results CSV.
//
// Usage: node scripts/political-data/germany/early-evidence.mjs [--write]   (default: check, when the archive is present)
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { root, sha256 } from './acquire.mjs';

export const EARLY_EVIDENCE = 'docs/political-data/germany_early_elections_evidence.json';
export const EARLY_YEARS = [1990, 1994, 1998];
const raw = (id) => `docs/political-data/raw/germany/production_${id}`;
const meta = (id) => JSON.parse(fs.readFileSync(path.join(root, raw(id), 'metadata.json'), 'utf8'));
const decode = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&shy;/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, ' ').trim();
const num = (s) => (/^[–—-]$/.test(s) || s === 'X' ? null : Number(s.replaceAll('.', '').replace(',', '.')));

function source(id) {
  const m = meta(id), file = path.join(root, m.raw_path);
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  assert.equal(sha256(bytes), m.sha256, `${id}: archived page changed`);
  const html = bytes.toString('utf8'), main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  return { m, html: main, text: decode(main.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')) };
}
const srcRef = (m) => ({ source_id: m.source_id, source_url: m.source_url, retrieved_at: m.retrieved_at, raw_sha256: m.sha256, raw_path: m.raw_path });

function resultPage(year) {
  const s = source(`election-${year}`);
  if (!s) return null;
  const heading = s.text.match(/Wahl zum \d+\. Deutschen Bundestag am [^H]+?(?= Hier)/)?.[0];
  const table = s.html.match(/<table class="tablesaw table-stimmen"[\s\S]*?<\/table>/)[0];
  const rows = [...table.matchAll(/<tr>\s*<th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)].map(([, label, cells]) => {
    const v = [...cells.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => decode(c[1]));
    assert.equal(v.length, 5, `${year}: five value cells per row`);
    return { label: decode(label), first_votes: num(v[0]), first_percent: v[1], second_votes: num(v[2]), second_percent: v[3], seats: num(v[4]) };
  });
  return { ...srcRef(s.m), heading, caption: decode(table.match(/<caption>([\s\S]*?)<\/caption>/)[1]), rows };
}

function overhangTable() {
  const s = source('overhang');
  const out = {};
  for (const year of EARLY_YEARS) {
    const next = { 1990: '1994', 1994: '1998', 1998: '2002' }[year];
    const seg = s.text.match(new RegExp(` ${year} (\\d+) (\\d+) (\\d+) (.*?) ${next} \\d+ \\d+ `))?.slice(1);
    assert.ok(seg, `overhang row ${year}`);
    const parts = [...seg[3].matchAll(/([A-ZÄÖÜ][a-zäöüß-]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?) (\d+) (CDU|SPD|CSU)/g)].map(([, land, n, party]) => ({ land, seats: Number(n), party }));
    out[year] = { constituencies: Number(seg[0]), total_seats: Number(seg[1]), overhang_seats: Number(seg[2]), by_land: parts, printed: `${year} ${seg.join(' ')}` };
    assert.equal(parts.reduce((n, p) => n + p.seats, 0), out[year].overhang_seats, `overhang parts ${year}`);
  }
  return { ...srcRef(s.m), table_heading: 'Bei Bundestagswahlen entstandene Überhangmandate 1949 - 2009 (Stand bei der Wahl)', rows: out };
}

function constituencies() {
  const s = source('constituencies');
  const t = s.text.slice(s.text.indexOf('Verteilung der Bundestagswahlkreise auf die Bundesländer seit 1949'));
  const lands = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen', 'Insgesamt'];
  const columns = ['1949 - 1953', '1957 - 1961', '1965 - 1976', '1980 - 1987', '1990 - 1998', '2002', '2005', '2009', '2013', '2017 - 2021', '2025'];
  const col = columns.indexOf('1990 - 1998'), rows = {};
  for (const land of lands) {
    const m = t.match(new RegExp(`${land}((?: (?:\\d+|-)){${columns.length}})(?: |$)`));
    assert.ok(m, `constituency row ${land}`);
    const cells = m[1].trim().split(' ');
    rows[land] = Number(cells[col]);
  }
  const total = rows.Insgesamt; delete rows.Insgesamt;
  assert.equal(Object.values(rows).reduce((a, b) => a + b, 0), total, 'constituencies by Land add up');
  return { ...srcRef(s.m), column: '1990 - 1998', footnote: 'Ab 1990 nach dem Gebietsstand seit dem 3. Oktober 1990.', by_land: rows, total };
}

function basicMandate() {
  const s = source('basic-mandate');
  const sentence = s.text.match(/Bundestagswahl 1994: [^.]+?\. Ihr wurden \d+ Landeslistensitze zugeteilt\./)?.[0];
  const rule = s.text.match(/Bei der Verteilung der Sitze auf die Landeslisten der Parteien wurden bis zur Bundestagswahl 2021 auch Parteien berücksichtigt, die nicht die 5-%-Hürde \(Sperrklausel\) überwunden hatten, aber in mindestens drei Wahlkreisen \(bei der Bundestagswahl 1953 genügte noch ein Wahlkreis\) einen Sitz errungen hatten\./)?.[0];
  assert.ok(sentence && rule, 'basic-mandate statements');
  return { ...srcRef(s.m), rule, application_1994: sentence };
}

function hareNiemeyer() {
  const s = source('hare-niemeyer');
  const period = s.text.match(/Bei den Wahlen vom 11\. bis zum 16\. Deutschen Bundestag von 1987 bis 2005 wurde die Sitzzuteilung nach dem Hare\/Niemeyer-Verfahren vorgenommen/)?.[0];
  assert.ok(period, 'Hare/Niemeyer period');
  return { ...srcRef(s.m), period };
}

export function extractEarlyEvidence() {
  const pages = Object.fromEntries(EARLY_YEARS.map((y) => [y, resultPage(y)]));
  if (Object.values(pages).some((p) => !p) || !source('overhang') || !source('constituencies') || !source('basic-mandate') || !source('hare-niemeyer')) return null;
  return {
    schema_version: 'germany-early-elections-evidence-v1',
    brief: 'owner brief 2026-11-23 (Germany 1990–1998 and Slovenia 1992–1996); owner answer "Additive exception"',
    transcription_rule: 'Re-parsed from the archived official pages by scripts/political-data/germany/early-evidence.mjs; never edited by hand. Archived HTML is not redistributed.',
    result_pages: pages,
    overhang: overhangTable(),
    constituencies: constituencies(),
    basic_mandate: basicMandate(),
    hare_niemeyer: hareNiemeyer(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = extractEarlyEvidence();
  if (!out) { console.log(JSON.stringify({ status: 'skipped', reason: 'archived HTML not present locally (not committed)' })); process.exit(0); }
  const text = JSON.stringify(out, null, 2) + '\n';
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, EARLY_EVIDENCE), text);
  else assert.equal(fs.readFileSync(path.join(root, EARLY_EVIDENCE), 'utf8'), text, 'Early evidence differs from the archived pages');
  console.log(JSON.stringify({ status: 'pass', years: EARLY_YEARS, sha256: sha256(Buffer.from(text)) }));
}
