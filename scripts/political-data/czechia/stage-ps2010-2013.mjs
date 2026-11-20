// One-off: turns the owner-authorised retrieval of 2026-11-21 (.tmp-data-refresh/political-candidate-czechia/historical,
// gitignored) of the PS2010 and PS2013 open-data CSV packages into committed evidence under
// docs/political-data/raw/czechia/ps2010-2013/. No network access.
//
// What is committed: the list register (psrkl, list-level fields only), the code-list rows used by a list, the per-region sums
// of the polling-district tables (pst4, pst4p POC_HLASU only) with the full files' checksums, and the number of elected
// candidates per list counted from the candidate register's MANDAT flag. Candidate names, preferential votes (HLASY_xx) and
// any other candidate field are never written. The browser readings of e-Sbírka (statute versions, election calls, the 2013
// results notice) are recorded as quotes and checksums.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './build-ps2025.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGED = path.join(root, '.tmp-data-refresh/political-candidate-czechia/historical');
const VOLPS03 = path.join(root, '../stable-release/.tmp-data-refresh/political-candidate-czechia/datastat/VOLPS03.csv');
const RAW = 'docs/political-data/raw/czechia/ps2010-2013';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const fail = (m) => { throw new Error(`Czechia 2010/2013 staging failed: ${m}`); };
const member = (zip, name) => execFileSync('unzip', ['-p', path.join(STAGED, zip), name], { maxBuffer: 1 << 28 });
const objects = (buf) => { const [h, ...rows] = parseCsv(buf.toString('utf8').replace(/^﻿/, '')); return { head: h, rows: rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))) }; };
const csvLine = (cells) => cells.map((v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v))).join(',');
const write = (name, text) => { fs.mkdirSync(path.join(root, RAW), { recursive: true }); fs.writeFileSync(path.join(root, RAW, name), text); return { path: `${RAW}/${name}`, sha256: sha(Buffer.from(text)) }; };
const log = JSON.parse(fs.readFileSync(path.join(STAGED, 'retrieval_log.json'), 'utf8'));
const logOf = (file) => log.find((l) => l.file === file) ?? fail(`${file} not in the retrieval log`);
const REGIONS = ['1100', '2100', '3100', '3200', '4100', '4200', '5100', '5200', '5300', '6100', '6200', '7100', '7200', '8100'];
const LIST_FIELDS = ['KSTRANA', 'VSTRANA', 'NAZEVCELK', 'NAZEV_STRK', 'ZKRATKAK30', 'ZKRATKAK8', 'POCSTRVKO', 'SLOZENI', 'STAVREG', 'PLAT_STR', 'SLOZNEPLAT', 'POCMANDCR'];

const files = {};
const years = {};
for (const year of [2013, 2010]) {
  const zips = { data: `ps${year}_PS${year}_data_20230224_csv.zip`, reg: `ps${year}_PS${year}_reg_20230428_csv.zip`, cisel: `ps${year}_PS${year}_cisel_20230224_csv.zip` };
  for (const z of Object.values(zips)) if (sha(fs.readFileSync(path.join(STAGED, z))) !== logOf(z).sha256) fail(`${z} differs from its retrieval log`);
  const pst4Buf = member(zips.data, 'csv_od/pst4.csv'), pst4pBuf = member(zips.data, 'csv_od/pst4p.csv');
  const psrklBuf = member(zips.reg, 'csv_od/psrkl.csv'), psrkBuf = member(zips.reg, 'csv_od/psrk.csv'), cvsBuf = member(zips.cisel, 'csv_od/cvs.csv');
  const pst4 = objects(pst4Buf).rows, pst4p = objects(pst4pBuf).rows, psrkl = objects(psrklBuf).rows, cvs = objects(cvsBuf);
  // Region totals and region × list sums from the polling-district tables (one row per district; KRAJ 9900 = districts abroad).
  const totals = new Map(), votes = new Map();
  for (const r of pst4) { if (!REGIONS.includes(r.KRAJ) && r.KRAJ !== '9900') fail(`${year}: unexpected KRAJ ${r.KRAJ}`); const t = totals.get(r.KRAJ) ?? { districts: 0, VOL_SEZNAM: 0, VYD_OBALKY: 0, ODEVZ_OBAL: 0, PL_HL_CELK: 0 }; t.districts += 1; for (const k of ['VOL_SEZNAM', 'VYD_OBALKY', 'ODEVZ_OBAL', 'PL_HL_CELK']) t[k] += Number(r[k]); totals.set(r.KRAJ, t); }
  for (const r of pst4p) { const key = `${r.KRAJ}|${Number(r.KSTRANA)}`; votes.set(key, (votes.get(key) ?? 0) + Number(r.POC_HLASU)); }
  for (const [kraj, t] of totals) { let s = 0; for (const [k, v] of votes) if (k.startsWith(`${kraj}|`)) s += v; if (s !== t.PL_HL_CELK) fail(`${year} ${kraj}: list votes ${s} ≠ valid votes ${t.PL_HL_CELK}`); }
  // Elected candidates per list: only the KSTRANA and MANDAT columns are read; nothing else from psrk is kept.
  const elected = new Map();
  for (const r of objects(psrkBuf).rows) if (r.MANDAT === 'A') elected.set(Number(r.KSTRANA), (elected.get(Number(r.KSTRANA)) ?? 0) + 1);
  const usedCvs = new Set(psrkl.map((l) => l.VSTRANA));
  const order = [...REGIONS, '9900'];
  files[year] = {
    region_totals: write(`ps${year}_region_totals.csv`, `${csvLine(['KRAJ', 'districts', 'VOL_SEZNAM', 'VYD_OBALKY', 'ODEVZ_OBAL', 'PL_HL_CELK'])}\r\n${order.map((k) => csvLine([k, ...Object.values(totals.get(k))])).join('\r\n')}\r\n`),
    region_list_votes: write(`ps${year}_region_list_votes.csv`, `${csvLine(['KRAJ', 'KSTRANA', 'POC_HLASU'])}\r\n${[...votes].map(([k, v]) => [...k.split('|'), v]).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]) || Number(a[1]) - Number(b[1])).map(csvLine).join('\r\n')}\r\n`),
    psrkl: write(`ps${year}_psrkl.csv`, `${csvLine(LIST_FIELDS)}\r\n${psrkl.map((l) => csvLine(LIST_FIELDS.map((k) => l[k] ?? ''))).join('\r\n')}\r\n`),
    cvs_excerpt: write(`ps${year}_cvs_excerpt.csv`, `${csvLine(['source_line', ...cvs.head])}\r\n${cvs.rows.map((r, i) => [i + 2, r]).filter(([, r]) => usedCvs.has(r.VSTRANA)).map(([n, r]) => csvLine([n, ...cvs.head.map((k) => r[k])])).join('\r\n')}\r\n`),
    elected_counts: write(`ps${year}_elected_counts.csv`, `${csvLine(['KSTRANA', 'elected'])}\r\n${[...elected].sort((a, b) => a[0] - b[0]).map(csvLine).join('\r\n')}\r\n`),
  };
  years[year] = {
    packages: Object.fromEntries(Object.entries(zips).map(([role, z]) => { const l = logOf(z); return [role, { url: l.url, retrieved_at: l.retrieved_at, http_last_modified: l.last_modified, bytes: l.bytes, sha256: l.sha256 }]; })),
    members_read: { 'csv_od/pst4.csv': sha(pst4Buf), 'csv_od/pst4p.csv': sha(pst4pBuf), 'csv_od/psrkl.csv': sha(psrklBuf), 'csv_od/psrk.csv': sha(psrkBuf), 'csv_od/cvs.csv': sha(cvsBuf) },
    psrk_note: 'csv_od/psrk.csv (candidate register) is read only for KSTRANA and MANDAT to count elected candidates per list; no candidate field is stored',
    pst4p_note: 'only KRAJ, KSTRANA and POC_HLASU are read; the preferential-vote columns HLASY_01… are never read into the archive',
    districts: pst4.length,
    archived: files[year],
  };
}

// ČSÚ DataStat VOLPS03 (already archived for 2017/2021): the national 2010 and 2013 rows are excerpted with their line numbers.
const volps = fs.readFileSync(VOLPS03);
const vLines = parseCsv(volps.toString('utf8').replace(/^﻿/, ''));
const vh = vLines[0];
const keep = vLines.map((r, i) => [i + 1, r]).filter(([n, r]) => n > 1 && ['2010', '2013'].includes(r[vh.indexOf('Roky')]) && r[vh.indexOf('Uz0234569C')] === 'CZ');
const volpsExcerpt = write('VOLPS03_cz_2010_2013_excerpt.csv', `${csvLine(['source_line', ...vh])}\r\n${keep.map(([n, r]) => csvLine([n, ...r])).join('\r\n')}\r\n`);
const prior = JSON.parse(fs.readFileSync(path.join(root, 'docs/political-data/raw/czechia/ps2017-2021/evidence.json'), 'utf8'));
const volpsMeta = prior.datasets.find((d) => d.code === 'VOLPS03').distributions[0];
if (sha(volps) !== volpsMeta.sha256) fail('staged VOLPS03.csv differs from the 2026-11-02 evidence checksum');

const terms = fs.readFileSync(path.join(STAGED, 'csu_terms.html'));
const evidence = {
  schema_version: 'atlas-political-evidence-v1',
  country: 'czechia',
  elections: ['Volby do Poslanecké sněmovny Parlamentu ČR, 28–29 May 2010', 'Volby do Poslanecké sněmovny Parlamentu ČR, 25–26 October 2013'],
  captured_on: '2026-11-21',
  retrieval: {
    authorised_by: "owner answer 2026-11-21 'Accept ČSÚ general terms (Recommended)': read ČSÚ's general terms by hand; if they permit reuse with attribution, retrieve the PS2013 and PS2010 CSV packages once each",
    method: 'one sequential request per named package, 5 seconds apart, identifying User-Agent; robots.txt of volby.gov.cz disallows /pls/ only',
  },
  rights: {
    basis: 'ČSÚ general terms for using and further publishing statistical data, linked from the footer of the volby.gov.cz open-data pages ("Podmínky pro využívání a další zveřejňování statistických údajů ČSÚ")',
    terms_url: 'https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu',
    terms_read_at: '2026-11-21',
    terms_html_sha256: sha(terms),
    quote: 'Statistické informace Českého statistického úřadu zveřejněné prostřednictvím internetových stránek https://csu.gov.cz jsou licencovány v souladu s CC BY 4.0.',
    licence: 'CC BY 4.0',
    attribution: 'Český statistický úřad (ČSÚ), volby.gov.cz open data; terms: https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu',
    scope_note: 'The operative sentence names csu.gov.cz, not volby.gov.cz. The owner accepted these terms as the basis for the volby.gov.cz files on 2026-11-21; the national catalogue (NKOD) has no entry for the 2010 or 2013 files.',
    personal_data: 'The candidate register is not redistributed; only per-list elected counts are derived from it.',
  },
  years,
  volps03: { code: 'VOLPS03', url: volpsMeta.url, sha256: volpsMeta.sha256, excerpt: volpsExcerpt, note: 'national rows for 2010 and 2013 (registered voters, issued envelopes, valid votes, turnout, polling districts)' },
  election_calls: {
    2010: { act: 'Rozhodnutí prezidenta republiky č. 37/2010 Sb. ze dne 5. února 2010 o vyhlášení voleb do Poslanecké sněmovny Parlamentu České republiky', url: 'https://e-sbirka.gov.cz/sb/2010/37', quote: 'na pátek 28. května 2010 a sobotu 29. května 2010.', read: '2026-11-21, browser innerText' },
    2013: { act: 'Rozhodnutí prezidenta republiky č. 266/2013 Sb. ze dne 28. srpna 2013 o vyhlášení voleb do Poslanecké sněmovny Parlamentu České republiky', url: 'https://e-sbirka.gov.cz/sb/2013/266', quote: 'na pátek 25. října 2013 a sobotu 26. října 2013.', read: '2026-11-21, browser innerText' },
  },
  results_notices: {
    2013: {
      act: 'Sdělení Státní volební komise č. 343/2013 Sb. ze dne 30. října 2013 o vyhlášení a uveřejnění celkových výsledků voleb do Poslanecké sněmovny Parlamentu České republiky konaných ve dnech 25. a 26. října 2013',
      url: 'https://e-sbirka.gov.cz/sb/2013/343',
      excerpt_sha256: '8eb57ec95c367f820a0f13e25ea0ac490e3ddb3af09df76b3120d16002717a9e',
      excerpt_scope: 'browser innerText from "SDĚLENÍ" to the start of the elected-candidates section (5,223 characters); candidate names were not captured',
      quotes: ['Celkový počet osob zapsaných ve výpisech ze stálých seznamů voličů a ze zvláštních seznamů voličů:\t8 424 227', 'Celkový počet voličů, kterým byly vydány úřední obálky:\t5 010 944', 'CELKEM\t…\t4 969 984'],
      comparison: { cells: 360, differences: 0, rows: '23 lists with a result (1–18, 20–24) and CELKEM', columns: '14 regions and CELKEM ČR', abroad_rule: 'votes cast in districts abroad (KRAJ 9900) are included in the Středočeský kraj column; every other region equals its own districts' },
      not_listed: 'list 19 (ČSS) appears in the list register but not in the notice and has no votes in any polling district',
    },
    2010: { status: 'not_located', note: 'The State Electoral Commission notice for 2010 was not found through web search or the e-Sbírka search box on 2026-11-21. National totals are reconciled to ČSÚ VOLPS03 instead.' },
  },
  statutes: {
    2010: { act: 'Zákon č. 247/1995 Sb.', version: 'znění 14. 9. 2009 – 15. 6. 2010', url: 'https://e-sbirka.gov.cz/sb/1995/247/2009-09-14?zalozka=text', status: 'informativní znění systému e-Sbírka (informative consolidated text)', captured_sections: '§ 48 to § 51, browser innerText; § 27 quoted', captured_sha256: '261943c99972557de396144176574fe709e16bd03bf27927407a13d3f1470d7d' },
    2013: { act: 'Zákon č. 247/1995 Sb.', version: 'znění 26. 6. 2012 – 6. 4. 2014', url: 'https://e-sbirka.gov.cz/sb/1995/247/2012-06-26?zalozka=text', status: 'informativní znění systému e-Sbírka (informative consolidated text)', captured_sections: '§ 48 to § 51, browser innerText', captured_sha256: '261943c99972557de396144176574fe709e16bd03bf27927407a13d3f1470d7d' },
    identical_note: '§§ 48–51 read identically in both versions (same checksum of the captured text).',
    clauses: {
      s27: 'Všechny zvláštní volební okrsky v zahraničí jsou podřazeny pod volební kraj určený losem Státní volební komisí do 7 dnů od vyhlášení voleb prezidentem republiky.',
      s24: 'Poslanecká sněmovna má 200 poslanců, kteří jsou voleni na dobu čtyř let.',
      s48_1: 'vydělí ho počtem poslanců. Číslo takto vypočtené a zaokrouhlené na jednotky je republikovým mandátovým číslem.',
      s49_1a: 'které politické strany nebo politická hnutí získaly méně než 5 procent,',
      s49_1b: 'které koalice, složené ze 2 politických stran, popřípadě politických hnutí získaly méně než 10 procent,',
      s49_1c: 'které koalice, složené ze 3 politických stran, popřípadě politických hnutí získaly méně než 15 procent,',
      s49_1d: 'které koalice, složené z nejméně 4 a více politických stran, popřípadě politických hnutí získaly méně než 20 procent z celkového počtu platných hlasů.',
      s49_3a: 'u politických stran nebo politických hnutí hranici 5 procent na hranici 4 procent',
      s50_1: 'Počet platných hlasů pro každou z politických stran, politických hnutí a koalic, které postoupily do skrutinia, se v rámci každého volebního kraje postupně dělí čísly 1; 2; 3 a dále vždy číslem o 1 vyšším.',
    },
  },
};
write('evidence.json', `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', files: Object.fromEntries(Object.entries(files).map(([y, f]) => [y, Object.keys(f)])), volps03_rows: keep.length }));
