// One-off: turns the owner-authorised gazette readings of 2026-11-03 (.tmp-data-refresh/political-candidate-poland/gazette,
// gitignored) into committed evidence under docs/political-data/raw/poland/sejm/. No network access. Only Part I (national
// figures) of each PKW notice is archived; Part II names every candidate and is never committed. Statutes are quoted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGED = path.join(root, '.tmp-data-refresh/political-candidate-poland/gazette');
const RAW = 'docs/political-data/raw/poland/sejm';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const log = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(STAGED, 'retrieval_log.json'))).map((r) => [r.file, r]));
log['DU_2023_2234.pdf'] = { url: 'https://eli.gov.pl/eli/DU/2023/2234/ogl/pol/pdf', sha256: sha(fs.readFileSync(path.join(STAGED, 'DU_2023_2234.pdf'))), retrieved_at: '2026-11-02T19:19:00.000Z' };
const text = (name) => fs.readFileSync(path.join(STAGED, `${name}.txt`), 'utf8');
const fail = (m) => { throw new Error(`Poland staging failed: ${m}`); };
const meta = (name) => { const l = log[`${name}.pdf`] ?? fail(`${name} missing`); const [t, y, p] = name.split('_'); return { citation: `${t === 'DU' ? 'Dz.U.' : 'M.P.'} ${y} poz. ${p}`, url: `https://eli.gov.pl/eli/${t}/${y}/${p}/ogl`, pdf_url: l.url, pdf_sha256: l.sha256, retrieved_at: l.retrieved_at }; };
fs.mkdirSync(path.join(root, RAW), { recursive: true });
const NOTICES = { 2011: { name: 'DU_2011_1294', dated: '2011-10-11', poll: '2011-10-09', resolution: 'DU_2011_1676', statute: 'DU_2011_112' }, 2015: { name: 'DU_2015_1731', dated: '2015-10-27', poll: '2015-10-25', resolution: 'DU_2016_120', statute: 'DU_2011_112' }, 2019: { name: 'DU_2019_1955', dated: '2019-10-14', poll: '2019-10-13', resolution: 'DU_2020_9', statute: 'DU_2019_684' }, 2023: { name: 'DU_2023_2234', dated: '2023-10-17', poll: '2023-10-15', resolution: 'DU_2024_52', statute: 'DU_2022_1277' } };
const elections = {};
for (const [year, n] of Object.entries(NOTICES)) {
  const full = text(n.name);
  const start = full.indexOf('Dział I.'), end = full.search(/Dział II\b/) >= 0 ? full.search(/Dział II\b/) : full.indexOf('[[page 3]]'); // the 2011 PDF has no usable Part II heading in its text layer
  if (start < 0 || end <= start) fail(`${n.name}: Part I not found`);
  const excerpt = `${full.slice(0, start).split('\n').filter((l) => /OBWIESZCZENIE|PAŃSTWOWEJ KOMISJI|z dnia|o wynikach|przeprowadzonych/.test(l)).join('\n')}\n${full.slice(start, end)}`;
  if (/kandydat skreślony/.test(excerpt)) fail(`${n.name}: excerpt contains candidate rows`);
  const file = `sejm_${year}_part_I.txt`;
  fs.writeFileSync(path.join(root, RAW, file), excerpt);
  if (!/stwierdza ważność/.test(text(n.resolution))) fail(`${n.resolution}: no validity finding`);
  elections[year] = { poll_date: n.poll, notice_dated: n.dated, notice: meta(n.name), national_excerpt: { path: `${RAW}/${file}`, sha256: sha(excerpt), note: 'text layer of Part I, extracted with macOS PDFKit; the PDF is identified by its checksum and is not redistributed because Part II lists candidates' }, validity_resolution: { ...meta(n.resolution), finding: 'Supreme Court declared the Sejm election valid' }, rules_text: meta(n.statute) };
}
// The rule articles are read from the versions cited by the notices and must say the same thing in each one.
const norm = (s) => s.replaceAll("\f", "").replace(/\[\[page \d+\]\]\n/g, '').replace(/^Dziennik Ustaw.*$/gm, '').replace(/(\p{L})-\n(\p{L})/gu, '$1$2').replace(/\s+/g, ' ').replace(/(\d) %/g, '$1%');
const clause = (name, re) => (norm(text(name)).match(re) ?? fail(`${name}: clause ${re} not found`))[0];
const CLAUSES = { threshold: /Art\. 196\. § 1\. .+?w skali kraju\. § 2\. .+?w skali kraju\./, minority_exemption_start: /Art\. 197\. § 1\. Komitety wyborcze utworzone przez wyborców zrzeszonych w zarejestrowanych organizacjach mniejszości narodowych mogą korzystać ze zwolnienia list tych komitetów z warunku, o którym mowa w art\. 196 § 1/, allocation: /Art\. 232\. § 1\. .+?przypada jej liczb kolejno największych\./, committee_types: /§ 2\. W wyborach do Sejmu i do Senatu oraz w wyborach do Parlamentu Europejskiego w Rzeczypospolitej Polskiej komitety wyborcze mogą być tworzone przez partie polityczne i koalicje partii politycznych oraz przez wyborców\./, seats: /Art\. 193\. § 1\. Do Sejmu wybiera się 460 posłów/, committee_name: /Art\. 92\. § 1\. Nazwa komitetu wyborczego partii politycznej zawiera wyrazy „Komitet Wyborczy” oraz nazwę partii politycznej lub skrót nazwy tej partii, wynikające z wpisu do ewidencji partii politycznych\./ };
const rules = {};
for (const [key, re] of Object.entries(CLAUSES)) {
  const versions = ['DU_2011_112', 'DU_2019_684', 'DU_2022_1277'].map((name) => clause(name, re));
  if (new Set(versions).size !== 1) fail(`${key} differs between statute versions`);
  rules[key] = versions[0];
}
const art4 = clause('DU_2025_24', /Art\. 4\. Nie stanowią przedmiotu prawa autorskiego: 1\) akty normatywne lub ich urzędowe projekty; 2\) urzędowe dokumenty, materiały, znaki i symbole;/);
// Party register numbers (EwP) as PKW prints them in its annual party-report communiqués. Only the five named rows are kept.
function identityReview() {
  const SOURCES = { 2011: 'MP_2012_881', 2016: 'MP_2017_981', 2019: 'MP_2020_621', 2021: 'MP_2022_584' };
  const rows = (ewp) => Object.entries(SOURCES).flatMap(([year, name]) => { const m = text(name).match(new RegExp(`([^\\n]*?)\\(EwP ${ewp}\\)`)); return m ? [{ report_year: Number(year), source: name, printed: m[0].replace(/^(Załącznik nr \d+ |\d+\. )/, '').trim() }] : []; });
  const PARTIES = [
    { ewp: 124, name: 'Prawo i Sprawiedliwość', committee_names: ['Prawo i Sprawiedliwość'] },
    { ewp: 131, name: 'Platforma Obywatelska Rzeczypospolitej Polskiej', label: 'Platforma Obywatelska RP', committee_names: ['Platforma Obywatelska RP'] },
    { ewp: 34, name: 'Polskie Stronnictwo Ludowe', committee_names: ['Polskie Stronnictwo Ludowe'] },
    { ewp: 87, name: 'Nowa Lewica', label: 'Nowa Lewica', label_at_lists: 'Sojusz Lewicy Demokratycznej', committee_names: ['Sojusz Lewicy Demokratycznej', 'Nowa Lewica'] },
    { ewp: 400, name: 'Konfederacja Wolność i Niepodległość', committee_names: ['Konfederacja Wolność i Niepodległość'] },
  ];
  return {
    rule: 'A party committee name contains the party name or abbreviation as entered in the party register (Electoral Code Art. 92 § 1). A series link needs the same EwP number in PKW communiqués.',
    communiques: Object.fromEntries(Object.entries(SOURCES).map(([year, name]) => [year, meta(name)])),
    parties: PARTIES.map((p) => { const printed = rows(p.ewp); if (!printed.length) fail(`EwP ${p.ewp} not printed`); return { ...p, printed }; }),
    limits: ['The latest communiqué read covers 2021, so the 2023 committee link rests on the register name printed for 2021 and on Art. 92 § 1. PKW\'s 2024 communiqué was not located on eli.gov.pl.', 'A coalition committee\'s members are not printed in these sources, so a party in a coalition has no figure and no link for that election.', 'The Art. 4 decision of 2026-11-03 named result notices; relying on it for these communiqués is an extension of the same basis.', 'The court register itself was not read.'],
    committee_review: { read: meta('MP_2024_348'), finding: 'The PKW communiqué of 13 March 2024 lists committees, including coalition committees, without member parties.' },
  };
}
const evidence = {
  schema_version: 'atlas-poland-sejm-evidence-v1',
  retrieval: { authorised_by: 'owner replies 2026-11-03: one reading per named document on eli.gov.pl', method: 'one sequential request per file, 5 seconds apart, identifying User-Agent', host: 'eli.gov.pl', robots: 'User-agent: * with empty Disallow, checked 2026-11-03' },
  rights: {
    basis: 'Act of 4 February 1994 on Copyright and Related Rights, Art. 4(2): official documents and materials are not subject to copyright',
    statute: meta('DU_2025_24'), quote: art4,
    owner_decision: 'Owner reply 2026-11-03: gazette-published PKW result notices close the reuse gates for national figures only.',
    limits: ['This is a reading of the statute, not advice from a lawyer or a statement by PKW. Commentary disputes how far "official material" extends; a notice published in the official gazette is a strong case, not a settled one.', 'It covers these notices only. The files on danewyborcze.kbw.gov.pl stay unused: that site\'s legal-information page is still empty (rechecked 2026-11-03).'],
  },
  rules_clauses: rules,
  rules_note: 'Clauses are identical in the 2011 original, the 2019 consolidated text and the 2022 consolidated text. The 2015 notice cites the 2011 Act as amended; the version in force in 2015 was not read separately.',
  elections,
  identity_review: identityReview(),
};
fs.writeFileSync(path.join(root, RAW, 'evidence.json'), `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', files: fs.readdirSync(path.join(root, RAW)) }));
