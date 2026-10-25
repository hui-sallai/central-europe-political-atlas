// Czechia — Chamber of Deputies election 3–4 October 2025, national level. Builds the political stores and public
// exports from committed official evidence only (docs/political-data/raw/czechia/ps2025/): ČSÚ DataStat VOLPS202503
// (votes, shares and seats by electoral list), the VOLPS03 national 2025 excerpt (electorate, issued envelopes, turnout,
// valid votes) and evidence.json (distribution rights, official pages, Act 247/1995 Coll. clauses). Fail-closed: every
// total is reconciled against the official totals before anything is written. No network access, no inference of list
// kind, coalition membership or cross-election party identity.
//
// Usage: node scripts/political-data/czechia/build-ps2025.mjs [--write]   (default: check that committed files match)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW = 'docs/political-data/raw/czechia/ps2025';
const STORE_DIR = 'src/data/political/czechia';
const EXPORT_DIR = 'public/research-data/political/czechia';
export const CZECH_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (msg) => { throw new Error(`Czechia 2025 build failed: ${msg}`); };

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

export function buildCzechia2025() {
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const byCode = Object.fromEntries(evidence.datasets.map((d) => [d.code, d]));
  const NO_RIGHTS = { autorske_dilo: 'Neobsahuje', originalni_databaze: 'Neobsahuje', zvlastni_pravo_poriz_databaze: 'Není chráněna', osobni_udaje: 'Neobsahuje' };
  for (const code of ['VOLPS202503', 'VOLPS03']) {
    const dataset = byCode[code] ?? fail(`${code} missing from evidence`);
    for (const dist of dataset.distributions) for (const [k, v] of Object.entries(NO_RIGHTS)) if (dist.rights?.[k] !== v) fail(`${code} ${dist.format}: rights field ${k} is not '${v}'`);
  }
  const seatsDist = byCode.VOLPS202503.distributions.find((d) => d.format === 'CSV');
  const basicDist = byCode.VOLPS03.distributions.find((d) => d.format === 'CSV');
  const seatsBuf = read(seatsDist.archived_path);
  if (sha(seatsBuf) !== seatsDist.sha256) fail('VOLPS202503.csv checksum differs from evidence');
  const excerptBuf = read(basicDist.excerpt.path);
  if (sha(excerptBuf) !== basicDist.excerpt.sha256) fail('VOLPS03 excerpt checksum differs from evidence');
  // When the full VOLPS03 file is staged locally, every excerpt row must be the exact row at its source line.
  const staged = path.join(root, '.tmp-data-refresh/political-candidate-czechia/datastat/VOLPS03.csv');
  if (fs.existsSync(staged)) {
    const full = fs.readFileSync(staged);
    if (sha(full) !== basicDist.sha256) fail('staged VOLPS03.csv checksum differs from evidence');
    const lines = parseCsv(full.toString('utf8'));
    for (const r of parseCsv(excerptBuf.toString('utf8')).slice(1)) if (JSON.stringify(lines[Number(r[0]) - 1]) !== JSON.stringify(r.slice(1))) fail(`excerpt line ${r[0]} differs from the staged file`);
  }

  const [seatHeader, ...seatRows] = parseCsv(seatsBuf.toString('utf8'));
  const col = (name) => seatHeader.indexOf(name);
  const C = { ind: col('Ukazatel'), code: col('VSTRANAPS2025'), label: col('Volební strana'), year: col('Roky'), terr: col('Uz02A'), value: col('Hodnota') };
  if (Object.values(C).some((i) => i < 0)) fail('VOLPS202503 columns differ from the published schema');
  const national = seatRows.map((r, i) => ({ r, line: i + 2 })).filter(({ r }) => r[C.year] === '2025' && r[C.terr] === 'CZ');
  const lists = new Map();
  for (const { r, line } of national) {
    const entry = lists.get(r[C.code]) ?? { code: r[C.code], label: r[C.label], lines: {} };
    if (entry.label !== r[C.label]) fail(`list ${r[C.code]} has two labels`);
    if (entry.lines[r[C.ind]]) fail(`duplicate ${r[C.ind]} for list ${r[C.code]}`);
    entry.lines[r[C.ind]] = { value: r[C.value], line };
    lists.set(r[C.code], entry);
  }
  const INDICATORS = ['Platné hlasy', 'Platné hlasy v %', 'Získané mandáty', 'Získané mandáty v %'];
  for (const l of lists.values()) for (const ind of INDICATORS) if (!l.lines[ind]) fail(`list ${l.code}: missing ${ind}`);
  const total = lists.get('0') ?? fail('national total row missing');
  const contestants = [...lists.values()].filter((l) => l.code !== '0').sort((a, b) => Number(a.code) - Number(b.code));
  const int = (s, what) => { if (!/^\d+$/.test(s)) fail(`${what} is not a whole number: ${s}`); return Number(s); };
  const validVotes = int(total.lines['Platné hlasy'].value, 'total valid votes');
  const totalSeats = int(total.lines['Získané mandáty'].value, 'total seats');
  const voteSum = contestants.reduce((n, l) => n + int(l.lines['Platné hlasy'].value, `votes ${l.code}`), 0);
  const seatSum = contestants.reduce((n, l) => n + int(l.lines['Získané mandáty'].value, `seats ${l.code}`), 0);
  if (voteSum !== validVotes) fail(`list votes ${voteSum} ≠ total valid votes ${validVotes}`);
  if (seatSum !== totalSeats || totalSeats !== 200) fail(`seats ${seatSum} / ${totalSeats} ≠ 200 (§ 24)`);
  if (!/200 poslanců/.test(evidence.statute.clauses.s24)) fail('statute § 24 clause missing');
  for (const l of contestants) {
    const votes = Number(l.lines['Platné hlasy'].value), published = Number(l.lines['Platné hlasy v %'].value);
    // Official rule: shares are given to two decimals without rounding.
    if (Math.floor((votes * 10000) / validVotes) / 100 !== published) fail(`list ${l.code}: published share ${published} is not the truncated share`);
    const seats = Number(l.lines['Získané mandáty'].value);
    if (Math.abs((seats / totalSeats) * 100 - Number(l.lines['Získané mandáty v %'].value)) > 1e-9) fail(`list ${l.code}: seat share`);
  }

  const [exHeader, ...exRows] = parseCsv(excerptBuf.toString('utf8'));
  const basic = Object.fromEntries(exRows.map((r) => [r[exHeader.indexOf('Ukazatel')], { value: r[exHeader.indexOf('Hodnota')], line: Number(r[0]) }]));
  const registered = int(basic['Voliči v seznamu']?.value ?? '', 'registered voters');
  const envelopes = int(basic['Vydané obálky']?.value ?? '', 'issued envelopes');
  const turnout = Number(basic['Volební účast (%)']?.value);
  if (int(basic['Platné hlasy']?.value ?? '', 'VOLPS03 valid votes') !== validVotes) fail('VOLPS03 valid votes differ from VOLPS202503');
  if (Math.abs((envelopes / registered) * 100 - turnout) >= 0.005) fail('published turnout is not issued envelopes / registered voters');

  const parserSha = sha(read('scripts/political-data/czechia/build-ps2025.mjs'));
  const retrieved = evidence.retrieval.batch_completed_at;
  const prov = (sourceId, url, recordId, rawPath, rawSha, fields, kind = 'published') => ({ source_id: sourceId, source_url: url, source_record_id: recordId, retrieved_at: retrieved, raw_snapshot: { path: rawPath, sha256: rawSha }, parser_version: 'czechia-ps2025-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: kind });
  const SEATS = 'src-cz-csu-volps202503', BASIC = 'src-cz-csu-volps03', LAW = 'src-cz-esbirka-247-1995', PAGE = 'src-cz-volby-ps2025-pages';
  const evidenceSha = sha(evidenceBuf);
  const electionId = 'el-cz-ps-2025-10-03', systemId = 'es-cz-ps-2025', legislatureId = 'lg-cz-ps-2025', vintage = 'final: ČSÚ DataStat VOLPS202503 v1 (data updated 2026-08-12)';
  const lawProv = (fields) => prov(LAW, evidence.statute.url, 'Act 247/1995 Coll. §§ 24, 26, 48–51 (version 1 Jan – 9 Oct 2025)', `${RAW}/evidence.json`, evidenceSha, fields);
  const pageProv = (fields) => prov(PAGE, evidence.official_pages[0].url, 'seats-allocation and home pages', `${RAW}/evidence.json`, evidenceSha, fields);

  const elections = [{ election_id: electionId, country: 'czechia', election_type: 'national_parliament', chamber: 'Poslanecká sněmovna', date: '2025-10-03', date_end: '2025-10-04', year: 2025, legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [pageProv(['date', 'date_end', 'chamber']), prov(SEATS, seatsDist.url, 'national rows, Roky=2025, Uz02A=CZ', seatsDist.archived_path, seatsDist.sha256, ['result_vintage'])] }];
  const election_turnout = [{ election_id: electionId, country: 'czechia', geography: 'national', vote_type: 'chamber_list_vote', result_vintage: vintage, eligible_voters: registered, voters: envelopes, valid_votes: validVotes, invalid_votes: null, ballots_cast: null, published_turnout: turnout, derived_turnout: (envelopes / registered) * 100, turnout_definition: 'Published turnout (Volební účast): issued envelopes (Vydané obálky) / registered voters (Voliči v seznamu) × 100; the ballots-cast and invalid-vote counts are not in the admitted datasets and are not reconstructed', turnout_basis: { numerator: 'envelopes_issued', denominator: 'registered_electorate', definition: 'issued envelopes / registered voters × 100 (ČSÚ VOLPS03)', sourceIds: [BASIC] }, provenance: [prov(BASIC, basicDist.url, `VOLPS03.csv lines ${[basic['Voliči v seznamu'], basic['Vydané obálky'], basic['Volební účast (%)'], basic['Platné hlasy']].map((x) => x.line).join(', ')}`, basicDist.excerpt.path, basicDist.excerpt.sha256, ['eligible_voters', 'voters', 'published_turnout', 'valid_votes'])] }];
  const contestantId = (code) => `ct-cz-ps2025-${String(code).padStart(2, '0')}`;
  const electoral_contestants = contestants.map((l) => ({ contestant_id: contestantId(l.code), country: 'czechia', election_id: electionId, contestant_kind: 'electoral_list_kind_not_established', csu_list_code: l.code, registered_label_native: l.label, historical_display_label: l.label.startsWith(`${l.code} `) ? l.label.slice(l.code.length + 1) : l.label, display_label_rule: 'official label without the leading ballot number when it equals the ČSÚ list code', lead_party_id: null, party_relation_status: 'not_established_no_official_register_reviewed', continuous_series_eligible: false, provenance: [prov(SEATS, seatsDist.url, `VOLPS202503.csv line ${l.lines['Platné hlasy'].line}`, seatsDist.archived_path, seatsDist.sha256, ['csu_list_code', 'registered_label_native'])] }));
  const election_results = contestants.map((l) => {
    const votes = Number(l.lines['Platné hlasy'].value), seats = Number(l.lines['Získané mandáty'].value);
    return { result_id: `er-${contestantId(l.code)}`, country: 'czechia', geography: 'national', election_id: electionId, contestant_ref: contestantId(l.code), vote_type: 'chamber_list_vote', valid_votes: validVotes, total_seats: totalSeats, votes, published_vote_share: Number(l.lines['Platné hlasy v %'].value), derived_vote_share: (votes / validVotes) * 100, seats, published_seat_share: Number(l.lines['Získané mandáty v %'].value), result_vintage: vintage, provenance: [prov(SEATS, seatsDist.url, `VOLPS202503.csv lines ${INDICATORS.map((i) => l.lines[i].line).join(', ')}`, seatsDist.archived_path, seatsDist.sha256, ['votes', 'published_vote_share', 'seats', 'published_seat_share'])] };
  });
  const legislatures = [{ legislature_id: legislatureId, country: 'czechia', chamber: 'Poslanecká sněmovna', official_term: null, election_id: electionId, total_seats: totalSeats, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [lawProv(['total_seats']), prov(SEATS, seatsDist.url, `VOLPS202503.csv line ${total.lines['Získané mandáty'].line}`, seatsDist.archived_path, seatsDist.sha256, ['total_seats'])] }];
  const t = (en, zh) => ({ en, 'zh-CN': zh });
  const electoral_systems = [{
    electoral_system_id: systemId, country: 'czechia', election_id: electionId, valid_from: '2025-10-03', valid_to: '2025-10-04', interval_basis: 'election-specific rule observation (Act 247/1995 Coll., version in force 1 January – 9 October 2025), not legal enactment dates',
    system_family: 'list proportional representation in 14 regions', vote_type: 'chamber_list_vote', allocation_method: 'two scrutinies: regional quota (votes ÷ (seats + 2)), then national remainders (÷ (unallocated seats + 1))', base_seats: 200,
    vote_definitions: [{ id: 'chamber_list_vote', kind: 'list', label: t('List votes (one list vote per voter)', '名单票（每名选民一票）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SEATS, LAW] }],
    national_rules: {
      nationalAllocation: 'Seats are first apportioned to the 14 regions: total valid votes ÷ 200, rounded, is the national seat quota; each region receives the whole number of quotas in its valid votes, remaining seats go to the largest remainders (§ 48). The second scrutiny allocates unassigned seats nationally: summed remainders ÷ (unassigned seats + 1), rounded (§ 51).',
      districtAllocation: 'First scrutiny within each region: valid votes of the qualifying lists ÷ (regional seats + 2), rounded, is the regional quota; each list receives the number of whole quotas in its regional votes (§ 50).',
      thresholds: [
        { appliesTo: 'political party or movement', percent: 5, description: t('Lists of a single party or movement below 5% of national valid votes take no part in the allocation (§ 49(1)(a)).', '单一政党或运动的名单低于全国有效票 5% 时不参与席位分配（第 49 条第 1 款 a 项）。'), sourceIds: [LAW] },
        { appliesTo: 'coalition of two parties or movements', percent: 8, description: t('Coalitions of two parties or movements below 8% take no part (§ 49(1)(b)).', '两个政党或运动组成的联盟低于 8% 时不参与（第 49 条第 1 款 b 项）。'), sourceIds: [LAW] },
        { appliesTo: 'coalition of three or more parties or movements', percent: 11, description: t('Coalitions of three or more below 11% take no part (§ 49(1)(c)); if fewer than two lists qualify, the thresholds are lowered step by step (§ 49(3)–(5)).', '三个及以上政党或运动组成的联盟低于 11% 时不参与（第 49 条第 1 款 c 项）；若晋级名单少于两个，门槛逐级降低（第 49 条第 3—5 款）。'), sourceIds: [LAW] },
      ],
      minorityRepresentation: null,
      totalSeatsDefinition: t('200 deputies elected for four years (§ 24 of Act 247/1995 Coll.).', '200 名议员，任期四年（第 247/1995 号法律第 24 条）。'),
      sourceIds: [LAW],
    },
    notes: t('Proportional representation in 14 regions, 200 seats. Which threshold applied to each list depends on whether it was a single party or movement or a coalition; the admitted datasets do not state list kinds, so the Atlas does not assign a threshold to individual lists. Published vote shares are truncated to two decimals.', '14 个选区的比例代表制，共 200 席。每个名单适用哪一门槛取决于其为单一政党／运动还是联盟；已准入的数据集未注明名单类型，因此 Atlas 不为单个名单指定门槛。公布的得票率截断保留两位小数。'),
    provenance: [lawProv(['system_family', 'allocation_method', 'base_seats', 'national_rules']), pageProv(['notes'])],
  }];
  const source = (id, institution, dataset, url, rawPath, rawSha, licenceUrl, licenceStatus, attribution) => ({ source_id: id, country: 'czechia', institution, dataset, tier: 'tier1_official', url, licence_status: licenceStatus, raw_redistribution: licenceStatus, licence_url: licenceUrl, attribution, retrieved_at: retrieved, raw_sha256: rawSha, raw_path: rawPath });
  const rights = 'no_protected_rights_per_national_catalogue_distribution_metadata';
  const political_source_registry = [
    source(SEATS, 'Český statistický úřad', 'DataStat VOLPS202503 — Získané mandáty ve volbách do Poslanecké sněmovny podle volebních stran (CSV)', seatsDist.url, seatsDist.archived_path, seatsDist.sha256, byCode.VOLPS202503.catalogue_page, rights, 'Český statistický úřad (ČSÚ), DataStat VOLPS202503'),
    source(BASIC, 'Český statistický úřad', 'DataStat VOLPS03 — Základní údaje o volbách do Poslanecké sněmovny podle vybraných území (CSV; national 2025 rows archived as an excerpt)', basicDist.url, basicDist.excerpt.path, basicDist.excerpt.sha256, byCode.VOLPS03.catalogue_page, rights, 'Český statistický úřad (ČSÚ), DataStat VOLPS03'),
    source(LAW, 'Ministerstvo vnitra — e-Sbírka', 'Zákon č. 247/1995 Sb., informative consolidated version 1 January – 9 October 2025 (§§ 24, 26, 48–51 quoted)', evidence.statute.url, `${RAW}/evidence.json`, evidenceSha, evidence.statute.url, 'statute_not_subject_to_copyright', 'Sbírka zákonů, e-Sbírka'),
    source(PAGE, 'Český statistický úřad', 'volby.gov.cz PS 2025 results application: seats-allocation and home pages (quoted)', evidence.official_pages[0].url, `${RAW}/evidence.json`, evidenceSha, 'https://csu.gov.cz/conditions_for_use_and_further_dissemination', 'quoted_facts_only', 'Český statistický úřad (ČSÚ), volby.gov.cz'),
  ];
  return { elections, election_turnout, election_results, electoral_contestants, legislatures, electoral_systems, political_source_registry, checks: { lists: contestants.length, validVotes, totalSeats, registered, envelopes, turnout } };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function czechiaFiles(data) {
  const files = {};
  for (const store of CZECH_STORES) files[`${STORE_DIR}/${store}.json`] = JSON.stringify(data[store], null, 2) + '\n';
  for (const store of CZECH_STORES) {
    files[`${EXPORT_DIR}/${store}.json`] = JSON.stringify(data[store], null, 2) + '\n';
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Czechia — Chamber of Deputies election 2025 (national level)\n\nOne election, 3–4 October 2025: 26 electoral lists with ČSÚ list codes, list votes, published (truncated) and derived shares, seats; registered voters, issued envelopes and turnout. Source: Český statistický úřad (ČSÚ), DataStat VOLPS202503 and VOLPS03; the national open-data catalogue records no copyright work, no original database, no database maker\'s right and no personal data for these distributions. Rules: Act 247/1995 Coll. (e-Sbírka informative version).\n\nNot included: list kinds (party, movement or coalition), coalition membership, cross-election party identity, regional results, candidates and preferential votes.\n';
  files[`${EXPORT_DIR}/manifest.json`] = JSON.stringify({ schema_version: 'czechia-political-export-v1', country: 'czechia', elections: ['el-cz-ps-2025-10-03'], continuous_party_series: 0, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2) + '\n';
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCzechia2025();
  const files = czechiaFiles(data);
  if (process.argv.includes('--write')) {
    for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  } else {
    const stale = Object.entries(files).filter(([rel, content]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== content).map(([rel]) => rel);
    if (stale.length) { console.error(`Czechia 2025 stores or exports out of date: ${stale.join(', ')}`); process.exit(1); }
  }
  console.log(JSON.stringify({ status: 'pass', ...data.checks, files: Object.keys(files).length }));
}
