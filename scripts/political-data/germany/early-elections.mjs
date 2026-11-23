// Germany — Bundestag elections of 2 December 1990, 16 October 1994 and 27 September 1998 (owner brief 2026-11-23;
// owner answer "Additive exception": the twelve Germany stores may gain these rows, at exact hashes recorded in
// docs/legal-security/germany_extension_records.json, while every 2002–2025 row stays byte-identical).
//
// The approved 2002–2025 slice is still built only by production.mjs (unchanged, so its parser hash in every existing
// row is unchanged). This module builds the 1990–1998 rows from committed evidence only:
//   - the final-results ZIP already archived for 2002–2025 (btw1990/1994/1998_kerg.csv, national row 999): eligible
//     voters, voters, valid and invalid first and second votes, and every column's first and second votes;
//   - the historical results CSV already archived (dl-de/by-2-0): published shares, final seats split into constituency
//     and Land-list seats, and the 1990 second votes of the two electoral areas (former FRG and West Berlin; new Länder
//     and East Berlin);
//   - docs/political-data/germany_early_elections_evidence.json, re-parsed from the archived official pages by
//     early-evidence.mjs: the national result table of each election page (labels as printed), the overhang table
//     (328 constituencies, 662/672/669 seats, 6/16/13 overhang seats by Land and party), constituencies by Land,
//     the basic-mandate clause and its 1994 application, and the Hare/Niemeyer period (1987–2005).
// Fail-closed reconciliation, per election: ZIP votes add up to valid votes on both ballots; page, ZIP and CSV agree on
// every count; valid + invalid = voters for each ballot; constituency + Land-list seats = final seats; final seats −
// overhang = 656; Hare/Niemeyer over 656 seats among the qualifying parties reproduces every party's seats before
// overhang (1990: 5% of second votes in either electoral area; 1994 and 1998: 5% nationally or three constituency seats).
// Party identity is election-specific: no contestant is linked to a party, to another election, or merged (CDU and CSU
// stay separate; in 1990 GRÜNE and B90/Gr. stay separate). Labels are those printed by the publisher.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { root, sha256 } from './acquire.mjs';
import { loadArchives } from './archive.mjs';
import { parseCsv, officialNumber } from './csv.mjs';
import { stores, buildApprovedProduction } from './production.mjs';
import { EARLY_EVIDENCE, EARLY_YEARS } from './early-evidence.mjs';

export const GERMANY_EXTENSION_FILE = 'docs/legal-security/germany_extension_records.json';
export const EARLY_LEGAL = 'docs/political-data/germany_early_legal_evidence.json';
export const GERMANY_EXTENSION_GATE = 'docs/political-data/germany_bt1990_1998_admission.json';
export const EARLY_ELECTION_IDS = { 1990: 'el-de-bt-1990-12-02', 1994: 'el-de-bt-1994-10-16', 1998: 'el-de-bt-1998-09-27' };
const DATES = { 1990: '1990-12-02', 1994: '1994-10-16', 1998: '1998-09-27' };
const TERMS = { 1990: 12, 1994: 13, 1998: 14 };
const BASE_SEATS = 656;
const PARSER = 'germany-early-elections-v1';
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
const fail = (m) => { throw new Error(`Germany 1990–1998 build failed: ${m}`); };
const check = (ok, m) => { if (!ok) fail(m); };
const pct1 = (s) => (s === null || s === undefined || /^[–—-]$/.test(s) ? null : Number(s.replace(',', '.')));

/** Hare/Niemeyer (largest remainder) — the Bundestag allocation method 1987–2005 (official glossary page). */
export function hareNiemeyer(votes, seats) {
  const total = votes.reduce((a, b) => a + b, 0), quota = votes.map((v) => (v * seats) / total), won = quota.map(Math.floor);
  const order = quota.map((q, i) => [q - Math.floor(q), i]).sort((a, b) => b[0] - a[0]);
  const left = seats - won.reduce((a, b) => a + b, 0);
  if (left > 0 && left < order.length && order[left - 1][0] === order[left][0]) fail('tie in the remainders');
  for (let k = 0; k < left; k += 1) won[order[k][1]] += 1;
  return won;
}

/** Owner-approved Germany extension record (exact hashes), or null. Problems fail closed. */
export function germanyExtension(hashOf = (rel) => (fs.existsSync(path.join(root, rel)) ? sha256(fs.readFileSync(path.join(root, rel))) : null)) {
  const file = path.join(root, GERMANY_EXTENSION_FILE);
  if (!fs.existsSync(file)) return { record: null, problems: [] };
  const records = JSON.parse(fs.readFileSync(file, 'utf8')).records ?? [];
  const problems = [];
  const r = records.find((x) => x.extension_id === 'germany-bt-1990-1998');
  if (!r) return { record: null, problems: ['germany extension record missing'] };
  if (r.status !== 'owner_approved' || r.approved_on !== '2026-11-23' || r.owner_answer !== 'Additive exception') problems.push('germany extension not owner-approved as recorded');
  for (const flag of ['existing_rows_change_allowed', 'frozen_research_sample_change_allowed', 'model_change_allowed', 'release_version_change_allowed']) if (r[flag] !== false) problems.push(`${flag} must be false`);
  if (r.gate_record !== GERMANY_EXTENSION_GATE || hashOf(GERMANY_EXTENSION_GATE) !== r.gate_record_sha256) problems.push('germany extension gate record missing or changed');
  if (hashOf(EARLY_EVIDENCE) !== r.evidence_sha256 || hashOf(EARLY_LEGAL) !== r.legal_evidence_sha256) problems.push('germany early evidence changed since approval');
  const expected = germanyFiles().sort();
  if (JSON.stringify((r.files ?? []).map((f) => f.path).sort()) !== JSON.stringify(expected)) problems.push('germany extension file set is not the twelve stores and their exports');
  if ((r.files ?? []).some((f) => !/^[0-9a-f]{64}$/.test(f.sha256 ?? ''))) problems.push('germany extension hash missing');
  return { record: problems.length ? null : r, problems };
}
export function germanyFiles() {
  return [...stores.map((s) => `src/data/political/germany/${s}.json`), ...stores.flatMap((s) => [`public/research-data/political/germany/${s}.json`, `public/research-data/political/germany/${s}.csv`]), 'public/research-data/political/germany/README.md', 'public/research-data/political/germany/manifest.json'];
}

function sourceMeta(id) { return read(`docs/political-data/raw/germany/production_${id}/metadata.json`); }

export function buildEarlyGermany() {
  const evidenceBuf = fs.readFileSync(path.join(root, EARLY_EVIDENCE)), E = JSON.parse(evidenceBuf), evidenceSha = sha256(evidenceBuf);
  const legalBuf = fs.readFileSync(path.join(root, EARLY_LEGAL)), LEGAL = JSON.parse(legalBuf), legalSha = sha256(legalBuf), legalMeta = sourceMeta('bundestag-dhb-1-1');
  check(legalMeta.sha256 === LEGAL.publisher_file_sha256 && legalMeta.source_id === LEGAL.source_id, 'legal evidence is not of the recorded Datenhandbuch file');
  const { historical, zip, members } = loadArchives();
  const csv = parseCsv(fs.readFileSync(path.join(root, historical.raw_path), 'utf8'));
  const parserSha = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
  const out = Object.fromEntries(stores.map((s) => [s, []]));
  const prov = (src, record, fields, flag = 'published', extra = {}) => ({ source_id: src.source_id, source_url: src.source_url ?? src.url, source_record_id: record, retrieved_at: src.retrieved_at, raw_snapshot: { path: src.raw_path, sha256: src.sha256 ?? src.raw_sha256 }, parser_version: PARSER, parser_sha256: parserSha, fields_covered: fields, published_or_derived: flag, ...extra });
  // Page facts come from the committed transcription; the snapshot is that file, the publisher file hash is kept.
  const pageProv = (ref, record, fields, extra = {}) => ({ source_id: ref.source_id, source_url: ref.source_url, source_record_id: record, retrieved_at: ref.retrieved_at, raw_snapshot: { path: EARLY_EVIDENCE, sha256: evidenceSha }, parser_version: PARSER, parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published', publisher_file_sha256: ref.raw_sha256, ...extra });
  const register = (ref, dataset) => {
    if (out.political_source_registry.some((s) => s.source_id === ref.source_id)) return;
    out.political_source_registry.push({ source_id: ref.source_id, country: 'germany', institution: 'Die Bundeswahlleiterin, Wiesbaden', dataset, tier: 'tier1_official', url: ref.source_url, licence_status: 'factual_metadata_only_source_link', raw_redistribution: 'not_reviewed_local_archive_only', licence_url: 'https://www.bundeswahlleiterin.de/info/impressum.html', attribution: 'Die Bundeswahlleiterin, Wiesbaden', retrieved_at: ref.retrieved_at, raw_sha256: ref.raw_sha256, raw_path: ref.raw_path, provenance: [pageProv(ref, 'metadata', ['dataset', 'url', 'raw_sha256', 'licence_status'])] });
  };
  for (const y of EARLY_YEARS) register(E.result_pages[y], `Bundestag election ${y}: national result page`);
  const legalRef = { source_id: legalMeta.source_id, source_url: legalMeta.source_url, retrieved_at: legalMeta.retrieved_at, raw_sha256: legalMeta.sha256, raw_path: legalMeta.raw_path };
  const legalP = (record, fields) => ({ ...pageProv(legalRef, record, fields), raw_snapshot: { path: EARLY_LEGAL, sha256: legalSha } });
  out.political_source_registry.push({ source_id: legalRef.source_id, country: 'germany', institution: 'Deutscher Bundestag, Parlamentsarchiv', dataset: 'Datenhandbuch zur Geschichte des Deutschen Bundestages, Kapitel 1.1 Wahlgesetze und Wahlrechtsregelungen', tier: 'tier1_official', url: legalRef.source_url, licence_status: 'factual_metadata_only_source_link', raw_redistribution: 'not_redistributed_private_use_terms', licence_url: legalMeta.terms_url, attribution: 'Deutscher Bundestag, Datenhandbuch', retrieved_at: legalRef.retrieved_at, raw_sha256: legalRef.raw_sha256, raw_path: legalRef.raw_path, provenance: [legalP('metadata', ['dataset', 'url', 'raw_sha256', 'licence_status'])] });
  register(E.basic_mandate, 'Glossary: basic-mandate clause (Grundmandatsklausel)');
  register(E.constituencies, 'Glossary: constituencies by Land since 1949 (Wahlkreise)');
  for (const [k, m] of [['overhang', sourceMeta('overhang')], ['hare_niemeyer', sourceMeta('hare-niemeyer')]]) check(m.sha256 === E[k].raw_sha256 && m.source_id === E[k].source_id, `${k}: transcription is not of the archived page already registered`);

  const overhangRef = E.overhang, hnRef = E.hare_niemeyer, wkRef = E.constituencies, bmRef = E.basic_mandate;
  check(Object.values(wkRef.by_land).reduce((a, b) => a + b, 0) === 328 && wkRef.total === 328, 'constituencies 1990–1998 ≠ 328');
  const reconciliation = {};
  for (const year of EARLY_YEARS) {
    const page = E.result_pages[year], date = DATES[year], electionId = EARLY_ELECTION_IDS[year], term = TERMS[year];
    const legislatureId = `lg-de-bt-${term}`, systemId = `es-de-bt-${year}`, oh = overhangRef.rows[year];
    check(page.heading === `Wahl zum ${term}. Deutschen Bundestag am ${{ 1990: '2. Dezember 1990', 1994: '16. Oktober 1994', 1998: '27. September 1998' }[year]}`, `${year}: page heading/date`);
    // ZIP member: header rows 6–7 (party, ballot), national row 999.
    const memberName = `btw${year}_kerg.csv`, member = members[memberName];
    check(member, `${year}: ZIP member missing`);
    const zr = parseCsv(member.text), h1 = zr[5], h2 = zr[6], nat = zr.find((r) => r[0] === '999');
    const zipRec = (col, fields) => prov(zip, `${member.sha256}:${memberName}:${zr.indexOf(nat) + 1}:${col}`, fields, 'published', { source_member: memberName, source_member_sha256: member.sha256, source_column: col });
    const at = (label, ballot) => { const i = h1.findIndex((x, k) => x === label && h2[k] === ballot); check(i >= 0, `${year}: column ${label}/${ballot}`); return i; };
    const totals = { eligible: Number(nat[at('Wahlberechtigte', '')]), voters: Number(nat[at(year === 1990 || year === 1994 || year === 1998 ? 'Wähler' : 'Wählende', '')]), invalidFirst: Number(nat[at('Ungültige', 'Erststimmen')]), invalidSecond: Number(nat[at('Ungültige', 'Zweitstimmen')]), validFirst: Number(nat[at('Gültige', 'Erststimmen')]), validSecond: Number(nat[at('Gültige', 'Zweitstimmen')]) };
    check(totals.validFirst + totals.invalidFirst === totals.voters && totals.validSecond + totals.invalidSecond === totals.voters, `${year}: valid + invalid ≠ voters`);
    // Every party column, joined to its first/second pair by the header label.
    const cols = new Map();
    for (let i = 9; i < h1.length; i += 1) {
      if (!h1[i]) continue;
      const ballot = h2[i] === 'Erststimmen' ? 'first' : h2[i] === 'Zweitstimmen' ? 'second' : fail(`${year}: ballot of column ${i}`);
      const e = cols.get(h1[i]) ?? { label: h1[i], first: null, second: null, firstCol: null, secondCol: null };
      check(e[ballot] === null, `${year}: duplicate column ${h1[i]}`);
      e[ballot] = Number(nat[i]); e[`${ballot}Col`] = i; cols.set(h1[i], e);
    }
    const entries = [...cols.values()];
    check(sum(entries, 'first') === totals.validFirst && sum(entries, 'second') === totals.validSecond, `${year}: ZIP party columns ≠ valid votes`);
    // Page: totals rows and party rows; "Sonstige" is the publisher's subtotal of the parties below it, not a contestant.
    const prow = (label) => page.rows.find((r) => r.label === label) ?? fail(`${year}: page row ${label}`);
    check(prow('Wahlberechtigte').first_votes === totals.eligible && prow('Wähler, Wahlbeteiligung').first_votes === totals.voters && prow('Ungültig').first_votes === totals.invalidFirst && prow('Ungültig').second_votes === totals.invalidSecond && prow('Gültig').first_votes === totals.validFirst && prow('Gültig').second_votes === totals.validSecond, `${year}: page totals ≠ ZIP`);
    const headRows = ['Wahlberechtigte', 'Wähler, Wahlbeteiligung', 'Ungültig', 'Gültig'];
    const partyRows = page.rows.filter((r) => !headRows.includes(r.label) && r.label !== 'Sonstige');
    const seatRows = partyRows.filter((r) => r.seats !== null), sonst = prow('Sonstige'), others = page.rows.slice(page.rows.indexOf(sonst) + 1);
    check(sonst.first_votes === sum(others, 'first_votes') && sonst.second_votes === sum(others, 'second_votes'), `${year}: "Sonstige" ≠ the parties listed under it`);
    check(sum(seatRows, 'seats') === oh.total_seats, `${year}: page seats ≠ ${oh.total_seats}`);
    // Historical CSV rows for the year.
    const hist = csv.map((row, index) => ({ row, index })).filter(({ row }) => row[1] === String(year));
    const hrow = (label) => hist.find(({ row }) => row[0] === label) ?? fail(`${year}: CSV row ${label}`);
    const totalRow = hrow('gültige Stimmen/Sitze insgesamt');
    check(officialNumber(totalRow.row[79]) === oh.total_seats && officialNumber(totalRow.row[81]) === 328 && officialNumber(totalRow.row[81]) + officialNumber(totalRow.row[83]) === oh.total_seats, `${year}: CSV seat totals`);
    check(oh.constituencies === 328 && oh.total_seats - oh.overhang_seats === BASE_SEATS, `${year}: total − overhang ≠ ${BASE_SEATS}`);
    const turnoutRow = hrow('Wählende');
    check(officialNumber(turnoutRow.row[3]) === totals.voters && pct1(turnoutRow.row[5]) === pct1(prow('Wähler, Wahlbeteiligung').first_percent), `${year}: CSV turnout`);

    const histProv = (index, fields, columns, extra = {}) => prov(historical, `csv-record-${index + 1}`, fields, 'published', { columns, ...extra });
    // Contestants: every ZIP column pair, joined to exactly one page row and one CSV row by the same counts.
    const contestants = [];
    for (const e of entries) {
      const f = e.first === 0 && e.firstCol !== null ? 0 : e.first, s = e.second;
      const aggregate = ['Übrige', 'Einzelbewerber'].includes(e.label);
      const pageMatch = partyRows.filter((r) => (r.first_votes ?? 0) === (f ?? 0) && (r.second_votes ?? 0) === (s ?? 0));
      check(pageMatch.length === 1, `${year}: ${e.label} matches ${pageMatch.length} page rows`);
      const histMatch = hist.filter(({ row }) => !['Wahlberechtigte', 'Wählende', 'ungültige Stimmen', 'gültige Stimmen/Sitze insgesamt'].includes(row[0]) && (officialNumber(row[3]) ?? 0) === (f ?? 0) && (officialNumber(row[4]) ?? 0) === (s ?? 0));
      check(histMatch.length === 1, `${year}: ${e.label} matches ${histMatch.length} CSV rows`);
      const p = pageMatch[0], hm = histMatch[0];
      check(aggregate === (p.label === 'Wählergruppen/Einzelbewerber'), `${year}: aggregate row alignment`);
      const seats = officialNumber(hm.row[79]), direct = officialNumber(hm.row[81]), list = officialNumber(hm.row[83]);
      check(seats === p.seats && (seats ?? 0) === (direct ?? 0) + (list ?? 0), `${year}: ${e.label} seats`);
      check(pct1(hm.row[6]) === pct1(p.second_percent) && pct1(hm.row[5]) === pct1(p.first_percent), `${year}: ${e.label} published shares differ between page and CSV`);
      contestants.push({ ...e, first: e.firstCol === null ? null : f, page: p, hist: hm, seats, direct, list, aggregate,
        west: year === 1990 && e.secondCol !== null ? { votes: officialNumber(hm.row[72]) ?? 0, published_percent: pct1(hm.row[74]) } : undefined,
        east: year === 1990 && e.secondCol !== null ? { votes: officialNumber(hm.row[76]) ?? 0, published_percent: pct1(hm.row[78]) } : undefined });
    }
    check(contestants.length === partyRows.length, `${year}: page lists ${partyRows.length} rows, ZIP ${contestants.length}`);
    // Seats: overhang by party from the overhang table; Hare/Niemeyer over 656 among qualifying parties.
    const ohByParty = {};
    for (const part of oh.by_land) ohByParty[part.party] = (ohByParty[part.party] ?? 0) + part.seats;
    const pageLabelOf = (c) => c.page.label;
    for (const party of Object.keys(ohByParty)) check(contestants.some((c) => c.label === party), `${year}: overhang party ${party} not a contestant`);
    const withSeats = contestants.filter((c) => c.seats), base = withSeats.map((c) => c.seats - (ohByParty[c.label] ?? 0));
    let qualifying, areaTotals = null;
    if (year === 1990) {
      const wt = officialNumber(totalRow.row[72]), et = officialNumber(totalRow.row[76]);
      areaTotals = { west: { valid_second_votes: wt, label: 'Früheres Bundesgebiet und Berlin-West' }, east: { valid_second_votes: et, label: 'Neue Länder und Berlin-Ost' } };
      check(wt + et === totals.validSecond, '1990: electoral-area second votes ≠ national valid second votes');
      qualifying = contestants.filter((c) => c.secondCol !== null && !c.aggregate && (c.west.votes * 100 >= 5 * wt || c.east.votes * 100 >= 5 * et));
    } else qualifying = contestants.filter((c) => c.secondCol !== null && !c.aggregate && (c.second * 100 >= 5 * totals.validSecond || (c.direct ?? 0) >= 3));
    const hn = hareNiemeyer(qualifying.map((c) => c.second), BASE_SEATS);
    check(JSON.stringify(qualifying.map((c) => c.label)) === JSON.stringify(withSeats.map((c) => c.label)), `${year}: qualifying parties ≠ parties holding seats`);
    check(hn.join() === base.join(), `${year}: Hare/Niemeyer ${hn} ≠ seats before overhang ${base}`);
    const nationalOnly = year === 1990 ? contestants.filter((c) => c.secondCol !== null && !c.aggregate && c.second * 100 >= 5 * totals.validSecond).map((c) => c.label) : null;
    reconciliation[year] = { qualifying: qualifying.map(pageLabelOf), hare_niemeyer_656: Object.fromEntries(qualifying.map((c, i) => [pageLabelOf(c), hn[i]])), overhang: ohByParty, national_5_percent_only_would_qualify: nationalOnly?.map((l) => contestants.find((c) => c.label === l).page.label) ?? null };

    // Rows ------------------------------------------------------------------------------------------------------------
    const pageRef = page, pageRowRec = (label) => `${pageRef.caption}: row "${label}"`;
    const pageP = (label, fields) => pageProv(pageRef, pageRowRec(label), fields);
    const ohP = (fields) => pageProv(overhangRef, `${overhangRef.table_heading}: row ${year}`, fields, { printed_row: oh.printed });
    const hnP = (fields) => pageProv(hnRef, 'main article', fields);
    const bmP = (fields) => pageProv(bmRef, 'main article', fields);
    const wkP = (fields) => pageProv(wkRef, `table column ${wkRef.column}`, fields);
    const totalP = histProv(totalRow.index, ['total_seats', 'constituency_mandates', 'list_mandates'], [79, 81, 83]);
    out.elections.push({ election_id: electionId, country: 'germany', election_type: 'national_parliament', chamber: 'Bundestag', date, year, legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'final', result_vintage: 'final', later_poll_date: null, repeat_poll_date: null,
      provenance: [pageP('heading', ['date', 'year', 'chamber', 'legislature_id']), { ...zipRec(3, ['result_status', 'result_vintage']), source_record_id: `${member.sha256}:${memberName}:1-4`, printed_heading: `Wahl zum ${term}. Deutschen Bundestag; Endgültige Ergebnisse der Erst- und Zweitstimmen nach Wahlkreisen` }] });
    out.legislatures.push({ legislature_id: legislatureId, country: 'germany', chamber: 'Bundestag', official_term: term, election_id: electionId, total_seats: oh.total_seats, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: 'final', start_date: null, end_date: null, date_status: 'not_acquired_not_asserted',
      statutory_base_seats: BASE_SEATS, statutory_base_seats_basis: 'derived: final seats minus overhang seats, both published (overhang table); equals twice the 328 constituencies',
      overhang_seats: oh.overhang_seats, constituency_count: 328, constituency_mandates: officialNumber(totalRow.row[81]), list_mandates: officialNumber(totalRow.row[83]),
      overhang_by_land: oh.by_land,
      provenance: [pageP('heading', ['official_term', 'chamber']), totalP, ohP(['total_seats', 'overhang_seats', 'overhang_by_land', 'constituency_count']), { ...ohP(['statutory_base_seats']), published_or_derived: 'derived', formula: 'total_seats - overhang_seats', input_fields: ['total_seats', 'overhang_seats'] }, wkP(['constituency_count'])] });
    const ruleNotes = year === 1990
      ? t(`Reunification election (first all-German Bundestag). 656 statutory seats (328 constituencies, 328 list seats) plus 6 overhang seats = 662. Hare/Niemeyer allocation of 656 seats by second votes. The 5% threshold was applied separately in the two electoral areas — former Federal territory with West Berlin, and new Länder with East Berlin — not nationwide: PDS (2.4% nationally, 11.1% in the eastern area) and Bündnis 90/Grüne (1.2%, 6.1% east) took seats, while the western GRÜNE (3.8% nationally, 4.8% in the western area) did not. The official tables report the two areas separately and Hare/Niemeyer reproduces every party's seats only with this rule; the Tenth Act amending the Federal Electoral Act (promulgated 10 October 1990, BGBl. I S. 2141), adopted after the Federal Constitutional Court's judgment of 29 September 1990, set this separate-area threshold.`, `两德统一后的首次全德联邦议院选举。法定席位656席（328个选区、328个名单席位），另有6个超额席位，共662席。按第二票以Hare/Niemeyer方法分配656席。5%门槛在两个选举区域分别适用（原联邦地区及西柏林；新联邦州及东柏林），而非全国统一适用：民社党（全国2.4%，东部11.1%）与联盟90/绿党（全国1.2%，东部6.1%）获得席位，西部绿党（全国3.8%，西部4.8%）未获席位。官方统计分两个区域列示，且仅在此规则下Hare/Niemeyer方法能复现各党席位；该规则由1990年10月10日公布的《联邦选举法第十修正法》（BGBl. I S. 2141）确立，系依联邦宪法法院1990年9月29日判决而通过。`)
      : t(`656 statutory seats (328 constituencies, 328 list seats) plus ${oh.overhang_seats} overhang seats = ${oh.total_seats}. Hare/Niemeyer allocation of 656 seats by second votes among parties with at least 5% of the national second votes or at least three constituency seats (basic-mandate clause).${year === 1994 ? ' In 1994 the PDS (4.4%) took part through the basic-mandate clause with four constituency seats.' : ''} Overhang seats were not compensated.`, `法定席位656席（328个选区、328个名单席位），另有${oh.overhang_seats}个超额席位，共${oh.total_seats}席。在全国第二票达到5%或赢得至少三个选区席位（基本议席条款）的政党之间，按第二票以Hare/Niemeyer方法分配656席。${year === 1994 ? '1994年民社党（4.4%）凭四个选区席位依基本议席条款参与分配。' : ''}超额席位不予补偿。`);
    const firstDef = { id: 'first_vote', kind: 'constituency', label: t('First votes (constituency candidates)', '第一票（选区候选人）'), denominator: 'valid_votes', seatScope: 'unavailable', sourceIds: [zip.source_id, historical.source_id] };
    const secondDef = { id: 'second_vote', kind: 'list', label: t('Second votes (party-list vote)', '第二票（政党名单票）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [zip.source_id, historical.source_id] };
    const thresholds = year === 1990
      ? [{ appliesTo: 'second votes in the electoral area of the former Federal territory and West Berlin', percent: 5, description: t('5% of the valid second votes in this electoral area (applied separately; a party reaching it in either area took part in the allocation).', '本选举区域有效第二票的5%（分区域适用；在任一区域达到即参与分配）。'), sourceIds: [legalRef.source_id, historical.source_id] },
        { appliesTo: 'second votes in the electoral area of the new Länder and East Berlin', percent: 5, description: t('5% of the valid second votes in this electoral area (applied separately).', '本选举区域有效第二票的5%（分区域适用）。'), sourceIds: [legalRef.source_id, historical.source_id] },
        { appliesTo: 'constituency seats', percent: null, description: t('Basic-mandate clause: three constituency seats (official glossary, in force until 2021; not applied in 1990).', '基本议席条款：三个选区席位（官方术语表，适用至2021年；1990年未适用）。'), sourceIds: [bmRef.source_id] }]
      : [{ appliesTo: 'national second votes', percent: 5, description: t('5% of the valid second votes in the electoral area (federal territory).', '全国（选举区域）有效第二票的5%。'), sourceIds: [historical.source_id, overhangRef.source_id] },
        { appliesTo: 'constituency seats', percent: null, description: t(`Basic-mandate clause: a party with at least three constituency seats took part even below 5%.${year === 1994 ? ' Applied in 1994 (PDS).' : ''}`, `基本议席条款：赢得至少三个选区席位的政党即使未达5%也参与分配。${year === 1994 ? '1994年适用（民社党）。' : ''}`), sourceIds: [bmRef.source_id] }];
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'germany', election_id: electionId, valid_from: date, valid_to: date, interval_basis: 'election-specific rule observation, not legal enactment dates', system_family: 'personalised proportional representation', vote_type: 'second_vote', allocation_method: 'Hare/Niemeyer', base_seats: BASE_SEATS,
      vote_definitions: [secondDef, firstDef],
      national_rules: { nationalAllocation: 'Hare/Niemeyer over 656 seats by second votes among qualifying parties; overhang seats kept without compensation', districtAllocation: 'plurality in 328 single-member constituencies (first votes)', thresholds, minorityRepresentation: null, totalSeatsDefinition: t(`Final seats including ${oh.overhang_seats} overhang seats (656 + ${oh.overhang_seats} = ${oh.total_seats}).`, `含${oh.overhang_seats}个超额席位的最终席位（656 + ${oh.overhang_seats} = ${oh.total_seats}）。`), sourceIds: [hnRef.source_id, overhangRef.source_id, wkRef.source_id, bmRef.source_id, legalRef.source_id] },
      ...(year === 1990 ? { threshold_areas: areaTotals } : {}),
      legal_basis: LEGAL.laws.filter((l) => l.applies_to.includes(year)).map(({ law_id, title, bundestag_document, adopted_by_bundestag, promulgated, gazette, court_decision, summary_en, summary_zh }) => ({ law_id, title, bundestag_document, adopted_by_bundestag, promulgated, in_force: null, gazette, ...(court_decision ? { court_decision } : {}), summary: t(summary_en, summary_zh), source_id: legalRef.source_id })),
      legal_basis_dates: 'adopted_by_bundestag and promulgated as printed in the Bundestag Datenhandbuch; entry-into-force dates are not printed there and are not asserted (in_force: null)',
      ...(year !== 1990 ? { rejected_rule_proposals: LEGAL.rejected_proposals.filter((p) => (year === 1994 ? /12\//.test(p.bundestag_document) : /13\//.test(p.bundestag_document))).map((p) => ({ bundestag_document: p.bundestag_document, summary: t(p.summary_en, p.summary_zh), source_id: legalRef.source_id })) } : {}),
      seat_reproduction: { method: 'Hare/Niemeyer', seats: BASE_SEATS, qualifying_contestants: qualifying.map((c) => c.page.label), seats_before_overhang: Object.fromEntries(qualifying.map((c, i) => [c.page.label, hn[i]])), overhang_by_party: ohByParty, reproduces_published_seats: true },
      notes: ruleNotes,
      provenance: [hnP(['allocation_method']), ohP(['base_seats', 'notes']), wkP(['national_rules']), bmP(['national_rules']), legalP(`laws applying to the ${term}th Bundestag election`, ['legal_basis', 'national_rules', 'notes']), { ...histProv(totalRow.index, ['seat_reproduction'], [4, 79, 81, 83]), published_or_derived: 'derived', formula: 'Hare/Niemeyer over 656 seats among qualifying parties; plus published overhang seats', input_fields: ['second_votes', 'constituency_mandates', 'overhang_seats'] }] });
    const turnoutP = [zipRec(at('Wahlberechtigte', ''), ['eligible_voters']), zipRec(at('Wähler', ''), ['voters']), histProv(turnoutRow.index, ['published_turnout'], [5, 6])];
    out.election_turnout.push({ election_id: electionId, country: 'germany', geography: 'national', vote_type: 'second_vote', result_vintage: 'final', eligible_voters: totals.eligible, voters: totals.voters, valid_second_votes: totals.validSecond, invalid_second_votes: totals.invalidSecond, published_turnout: pct1(turnoutRow.row[6]), derived_turnout: (100 * totals.voters) / totals.eligible, turnout_definition: 'Atlas calculation: voters / eligible voters × 100; published turnout retained separately',
      ...(year === 1990 ? { electoral_area_valid_second_votes: { west: areaTotals.west.valid_second_votes, east: areaTotals.east.valid_second_votes } } : {}),
      provenance: [...turnoutP, zipRec(at('Gültige', 'Zweitstimmen'), ['valid_second_votes']), zipRec(at('Ungültige', 'Zweitstimmen'), ['invalid_second_votes']), ...(year === 1990 ? [histProv(totalRow.index, ['electoral_area_valid_second_votes'], [72, 76])] : []), { ...zipRec(at('Wähler', ''), ['derived_turnout', 'turnout_definition']), published_or_derived: 'derived', formula: '100 * voters / eligible_voters', input_fields: ['voters', 'eligible_voters'] }] });
    out.election_turnout.push({ election_id: electionId, country: 'germany', geography: 'national', vote_type: 'first_vote', result_vintage: 'final', eligible_voters: totals.eligible, voters: totals.voters, valid_votes: totals.validFirst, invalid_votes: totals.invalidFirst, published_turnout: pct1(turnoutRow.row[5]), derived_turnout: (100 * totals.voters) / totals.eligible, turnout_definition: 'Atlas calculation: voters / eligible voters × 100; published turnout retained separately (one turnout for both ballots)',
      provenance: [...turnoutP, zipRec(at('Gültige', 'Erststimmen'), ['valid_votes']), zipRec(at('Ungültige', 'Erststimmen'), ['invalid_votes']), { ...zipRec(at('Wähler', ''), ['derived_turnout', 'turnout_definition']), published_or_derived: 'derived', formula: '100 * voters / eligible_voters', input_fields: ['voters', 'eligible_voters'] }] });
    let n = 0;
    for (const c of contestants) {
      n += 1;
      const id = `ct-de-${year}-${String(n).padStart(2, '0')}`;
      const kind = c.aggregate ? 'aggregate_voter_groups_and_individual_candidates' : c.secondCol !== null ? 'party_list' : 'party_constituency_candidates_only';
      const recCol = c.secondCol ?? c.firstCol;
      const labelP = { ...zipRec(recCol, ['registered_label_native']), source_record_id: `${member.sha256}:${memberName}:6:${recCol}` };
      const shownP = pageP(c.page.label, ['historical_display_label']);
      out.electoral_contestants.push({ contestant_id: id, country: 'germany', election_id: electionId, contestant_kind: kind, registered_label_native: c.label, historical_display_label: c.page.label, lead_party_id: null, party_relation_status: c.aggregate ? 'not_a_party_aggregate' : 'requires_manual_review', continuous_series_eligible: false,
        ...(c.aggregate ? { aggregate_note: t('Publisher aggregate of constituency nominations by voter groups and individual candidates; not one contestant and never added to party rows.', '发布机构对选民团体及个人候选人选区提名的汇总，不是单一参选者，不与政党行相加。') } : {}),
        provenance: [labelP, shownP] });
      out.party_identity_crosswalk.push({ source_id: zip.source_id, source_party_id: `${member.sha256}:${memberName}:6:${recCol}`, source_label: c.label, country: 'germany', valid_from: date, valid_to: date, target_kind: 'contestant', target_id: id, canonical_party_id: null, match_basis: 'manual_review', match_status: 'confirmed_election_specific_record', party_relation_status: c.aggregate ? 'not_a_party_aggregate' : 'requires_manual_review', continuous_series_eligible: false, reviewer_note: 'Official result column to persisted election-specific contestant; no cross-election, legal-entity or alliance continuity decision.', provenance: [labelP] });
      if (c.secondCol !== null) {
        const hp = histProv(c.hist.index, ['published_vote_share', 'seats', 'constituency_mandates', 'list_mandates'], [6, 79, 81, 83], { compilation_label: c.hist.row[0], alignment_basis: 'unique exact national first- and second-vote counts in the same election; not party identity' });
        out.election_results.push({ result_id: `er-${id}`, country: 'germany', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: 'second_vote', valid_second_votes: totals.validSecond, total_seats: oh.total_seats, second_votes: c.second, published_vote_share: pct1(c.hist.row[6]), derived_vote_share: (100 * c.second) / totals.validSecond, seats: c.seats, derived_seat_share: c.seats === null ? null : (100 * c.seats) / oh.total_seats, result_vintage: 'final',
          constituency_mandates: c.seats === null ? null : c.direct ?? 0, list_mandates: c.seats === null ? null : c.list ?? 0, overhang_seats: c.seats === null ? null : ohByParty[c.label] ?? 0,
          ...(c.seats !== null ? { seats_before_overhang_derived: c.seats - (ohByParty[c.label] ?? 0) } : {}),
          ...(year === 1990 ? { electoral_area_second_votes: { west: c.west, east: c.east } } : {}),
          provenance: [zipRec(c.secondCol, ['second_votes']), hp, ...(c.seats !== null ? [ohP(['overhang_seats'])] : []), ...(year === 1990 ? [histProv(c.hist.index, ['electoral_area_second_votes'], [72, 74, 76, 78])] : []), { ...zipRec(c.secondCol, ['derived_vote_share']), published_or_derived: 'derived', formula: '100 * second_votes / valid_second_votes', input_fields: ['second_votes', `${electionId}:valid_second_votes`] }, { ...histProv(c.hist.index, ['derived_seat_share'], [79]), published_or_derived: 'derived', formula: '100 * seats / total_seats; null remains null', input_fields: ['seats', `${legislatureId}:total_seats`] }, ...(c.seats !== null ? [{ ...ohP(['seats_before_overhang_derived']), published_or_derived: 'derived', formula: 'seats - overhang_seats', input_fields: ['seats', 'overhang_seats'] }] : [])] });
      }
      if (c.firstCol !== null) {
        out.election_results.push({ result_id: `er-${id}-first`, country: 'germany', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: 'first_vote', valid_votes: totals.validFirst, votes: c.first, published_vote_share: pct1(c.hist.row[5]), derived_vote_share: (100 * c.first) / totals.validFirst, seats: null, result_vintage: 'final',
          constituency_mandates: c.aggregate ? 0 : c.seats === null ? null : c.direct ?? 0,
          provenance: [zipRec(c.firstCol, ['votes']), histProv(c.hist.index, ['published_vote_share', 'constituency_mandates'], [5, 81], { compilation_label: c.hist.row[0], alignment_basis: 'unique exact national first- and second-vote counts in the same election; not party identity' }), { ...zipRec(c.firstCol, ['derived_vote_share']), published_or_derived: 'derived', formula: '100 * votes / valid_votes', input_fields: ['votes', `${electionId}:first_vote:valid_votes`] }] });
      }
      out.reconciliation_log.push({ reconciliation_id: `rc-${id}`, country: 'germany', election_id: electionId, contestant_id: id, category: c.aggregate ? 'aggregate_not_contestant' : 'party_identity_difference', status: c.aggregate ? 'documented' : 'requires_manual_review', note: c.aggregate ? 'Publisher aggregate of voter-group and individual constituency nominations; kept as one aggregate row, never split or added to parties.' : 'Election-specific result is sourced. Canonical party relation unresolved; excluded from continuous party series.', provenance: [labelP] });
    }
    out.reconciliation_log.push({ reconciliation_id: `rc-de-bt-${year}-seats`, country: 'germany', election_id: electionId, category: 'match', status: 'documented', compared_field: 'seats', official_value: oh.total_seats, note: `Hare/Niemeyer over 656 seats among ${qualifying.map((c) => c.page.label).join(', ')} reproduces every party's seats before overhang; adding the published overhang seats (${Object.entries(ohByParty).map(([p, s]) => `${p} ${s}`).join(', ')}) gives the published final seats (${oh.total_seats}).${year === 1990 ? ` A single national 5% threshold would have admitted only ${nationalOnly.map((l) => contestants.find((c) => c.label === l).page.label).join(', ')}.` : ''}`, provenance: [totalP, ohP(['overhang_seats']), hnP(['allocation_method'])] });
  }
  // ParlGov (academic, CC0) — national seat totals only, as for 2002–2025.
  const parlgovMeta = read('docs/political-data/raw/germany/parlgov-2024/metadata.json');
  check(sha256(fs.readFileSync(path.join(root, parlgovMeta.raw_path))) === parlgovMeta.sha256, 'ParlGov checksum');
  const table = parseCsv(fs.readFileSync(path.join(root, parlgovMeta.raw_path), 'utf8'), ','), header = table.shift();
  const academic = table.map((row, index) => ({ row: Object.fromEntries(header.map((k, i) => [k, row[i]])), index: index + 2 })).filter(({ row }) => row.country_name_short === 'DEU' && row.election_type === 'parliament');
  for (const e of out.elections) {
    const rows = academic.filter(({ row }) => row.election_date === e.date), leg = out.legislatures.find((l) => l.election_id === e.election_id);
    const totals = [...new Set(rows.map(({ row }) => Number(row.seats_total)))];
    check(totals.length === 1, `ParlGov total for ${e.year}`);
    out.reconciliation_log.push({ reconciliation_id: `rc-parlgov-${e.year}`, country: 'germany', election_id: e.election_id, category: totals[0] === leg.total_seats ? 'match' : 'definition_difference', status: 'documented', compared_field: 'seats_total', official_value: leg.total_seats, harmonized_value: totals[0], note: 'National seat total comparison only; party names and academic party IDs are not promoted to official identities.', provenance: [prov({ ...parlgovMeta, raw_path: parlgovMeta.raw_path }, rows.map((r) => `csv-record-${r.index}`).join(' | '), ['harmonized_value', 'category'])] });
  }
  return { data: out, reconciliation };
}

/** The canonical twelve Germany stores: 1990–1998 rows (only under the owner-approved extension) followed by the approved 2002–2025 slice. */
export function buildCanonicalGermany({ candidate = false } = {}) {
  const base = buildApprovedProduction();
  // candidate: the rows the owner is asked to approve (used only to write the files whose hashes the record then pins).
  const { record, problems } = candidate ? { record: true, problems: [] } : germanyExtension();
  if (problems.length) fail(problems.join('; '));
  if (!record) return base;
  const { data: early } = buildEarlyGermany();
  return Object.fromEntries(stores.map((s) => [s, [...early[s], ...base[s]]]));
}

/** Splits canonical stores into the early rows and the approved base slice (by election, or by source for the registry). */
export function splitCanonicalGermany(data) {
  const earlyIds = new Set(Object.values(EARLY_ELECTION_IDS));
  const isEarly = (row) => earlyIds.has(row.election_id) || (row.target_id && /^ct-de-(1990|1994|1998)-/.test(row.target_id));
  const early = {}, base = {};
  for (const s of stores) {
    const n = s === 'political_source_registry' ? data[s].filter((r) => /^src-de-(bwl-(election-(1990|1994|1998)|basic-mandate|constituencies)|bundestag-dhb-1-1)$/.test(r.source_id)).length : data[s].filter(isEarly).length;
    early[s] = data[s].slice(0, n); base[s] = data[s].slice(n);
  }
  return { early, base };
}

export function validateEarlyGermany(early) {
  const ids = Object.values(EARLY_ELECTION_IDS);
  assert.deepEqual(early.elections.map((e) => e.election_id), ids);
  assert.deepEqual(early.legislatures.map((l) => l.total_seats), [662, 672, 669]);
  assert.deepEqual(early.legislatures.map((l) => l.overhang_seats), [6, 16, 13]);
  for (const l of early.legislatures) { assert.equal(l.statutory_base_seats, 656); assert.equal(l.total_seats - l.overhang_seats, 656); assert.equal(l.constituency_mandates, 328); assert.equal(l.constituency_mandates + l.list_mandates, l.total_seats); }
  const contestants = new Map(early.electoral_contestants.map((c) => [c.contestant_id, c]));
  const sources = new Set(early.political_source_registry.map((s) => s.source_id));
  for (const e of early.elections) {
    const leg = early.legislatures.find((l) => l.election_id === e.election_id), sys = early.electoral_systems.find((s) => s.election_id === e.election_id);
    for (const vt of ['second_vote', 'first_vote']) {
      const tr = early.election_turnout.filter((r) => r.election_id === e.election_id && r.vote_type === vt);
      assert.equal(tr.length, 1);
      const rows = early.election_results.filter((r) => r.election_id === e.election_id && r.vote_type === vt);
      const valid = vt === 'second_vote' ? tr[0].valid_second_votes : tr[0].valid_votes, invalid = vt === 'second_vote' ? tr[0].invalid_second_votes : tr[0].invalid_votes;
      assert.equal(valid + invalid, tr[0].voters);
      assert.equal(rows.reduce((n, r) => n + (vt === 'second_vote' ? r.second_votes : r.votes), 0), valid, `${e.year} ${vt} votes`);
      for (const r of rows) { assert.ok(contestants.has(r.contestant_ref)); assert.ok(Math.abs(r.derived_vote_share - r.published_vote_share) <= 0.051, `${r.result_id} share`); }
      if (vt === 'second_vote') {
        assert.equal(rows.filter((r) => r.seats !== null).reduce((n, r) => n + r.seats, 0), leg.total_seats);
        assert.equal(rows.reduce((n, r) => n + (r.overhang_seats ?? 0), 0), leg.overhang_seats);
        assert.equal(rows.reduce((n, r) => n + (r.constituency_mandates ?? 0), 0), 328);
      } else assert.ok(rows.every((r) => r.seats === null));
    }
    assert.equal(sys.base_seats, 656); assert.equal(sys.allocation_method, 'Hare/Niemeyer'); assert.equal(sys.seat_reproduction.reproduces_published_seats, true);
    assert.ok(sys.legal_basis.length && sys.legal_basis.every((l) => l.in_force === null && /^BGBl\. I{1,2} S\. \d+$/.test(l.gazette)));
    if (e.year === 1990) { assert.equal(sys.national_rules.thresholds.filter((x) => x.percent === 5).length, 2); assert.ok(sys.legal_basis.some((l) => l.gazette === 'BGBl. I S. 2141')); }
  }
  for (const c of early.electoral_contestants) { assert.equal(c.lead_party_id, null); assert.equal(c.continuous_series_eligible, false); }
  assert.ok(!/"(?:atlas_.*score|polling|prediction|ideology|left_right|populism|extremism|risk_score)"\s*:/.test(JSON.stringify(early)), 'No prohibited measurements or scores');
  for (const rows of Object.values(early)) for (const row of rows) for (const p of row.provenance ?? []) assert.ok(p.source_id && p.raw_snapshot?.sha256 && p.fields_covered?.length);
  return { status: 'pass', elections: early.elections.length, contestants: contestants.size, sources: sources.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--write-candidate')) {
  const { politicalExportFiles } = await import('./export.mjs');
  const data = buildCanonicalGermany({ candidate: true });
  for (const s of stores) fs.writeFileSync(path.join(root, 'src/data/political/germany', `${s}.json`), JSON.stringify(data[s], null, 2) + '\n');
  for (const [name, content] of Object.entries(politicalExportFiles(data))) fs.writeFileSync(path.join(root, 'public/research-data/political/germany', name), content);
  console.log(JSON.stringify({ status: 'written', elections: data.elections.length, files: germanyFiles().map((f) => [f, sha256(fs.readFileSync(path.join(root, f)))]) }));
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { data, reconciliation } = buildEarlyGermany();
  console.log(JSON.stringify({ ...validateEarlyGermany(data), counts: Object.fromEntries(stores.map((s) => [s, data[s].length])), reconciliation }, null, 1));
}
