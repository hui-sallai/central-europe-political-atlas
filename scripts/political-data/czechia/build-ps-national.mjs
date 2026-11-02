// Czechia — Chamber of Deputies elections 2017, 2021 and 2025, national level. Combines the 2025 build
// (build-ps2025.mjs, unchanged rules) with 2017 and 2021 built here from committed official evidence only
// (docs/political-data/raw/czechia/ps2017-2021/): ČSÚ DataStat VOLPS201703 and VOLPS202103 (votes, shares and seats by
// electoral list) and the VOLPS03 national excerpt. Fail-closed: every total is reconciled before anything is written.
// No network access; list kinds, coalition members and cross-election identities come from build-identity.mjs and never from labels.
//
// Usage: node scripts/political-data/czechia/build-ps-national.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildCzechia2025, CZECH_STORES, parseCsv } from './build-ps2025.mjs';
import { buildCzechIdentity, IDENTITY_STORES } from './build-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW = 'docs/political-data/raw/czechia/ps2017-2021';
const STORE_DIR = 'src/data/political/czechia';
const EXPORT_DIR = 'public/research-data/political/czechia';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (msg) => { throw new Error(`Czechia build failed: ${msg}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const NO_RIGHTS = { autorske_dilo: 'Neobsahuje', originalni_databaze: 'Neobsahuje', zvlastni_pravo_poriz_databaze: 'Není chráněna', osobni_udaje: 'Neobsahuje' };
const INDICATORS = ['Platné hlasy', 'Platné hlasy v %', 'Získané mandáty', 'Získané mandáty v %'];

const ELECTIONS = {
  2017: {
    code: 'VOLPS201703', listColumn: 'VSTRANAPS2017', start: '2017-10-20', end: '2017-10-21', lists: 31, status: 'official_final',
    vintage: 'original results: ČSÚ DataStat VOLPS201703 v1 (data updated 2026-08-13); does not reflect Supreme Administrative Court resolution Vol 58/2017-173',
    family: 'list proportional representation in 14 regions',
    allocation: 'one scrutiny: successive divisors 1, 2, 3 … within each region',
    national: 'Seats are apportioned to the 14 regions: total valid votes ÷ 200, rounded, is the national seat quota; each region receives the whole number of quotas in its valid votes, remaining seats go to the largest remainders (§ 48). There is no national second scrutiny.',
    district: 'Within each region the votes of each qualifying list are divided by 1, 2, 3 and so on; the largest quotients up to the regional seat number each win one seat (§ 50).',
    thresholds: [
      ['political party or movement', 5, 'Lists of a single party or movement below 5% of national valid votes take no part in the allocation (§ 49(1)(a)).', '单一政党或运动的名单低于全国有效票 5% 时不参与席位分配（第 49 条第 1 款 a 项）。'],
      ['coalition of two parties or movements', 10, 'Coalitions of two below 10% take no part (§ 49(1)(b)).', '两个政党或运动组成的联盟低于 10% 时不参与（第 49 条第 1 款 b 项）。'],
      ['coalition of three parties or movements', 15, 'Coalitions of three below 15% take no part (§ 49(1)(c)).', '三个政党或运动组成的联盟低于 15% 时不参与（第 49 条第 1 款 c 项）。'],
      ['coalition of four or more parties or movements', 20, 'Coalitions of four or more below 20% take no part (§ 49(1)(d)).', '四个及以上政党或运动组成的联盟低于 20% 时不参与（第 49 条第 1 款 d 项）。'],
    ],
    notes: t('One scrutiny by successive divisors within 14 regions, 200 seats; thresholds 5%, 10%, 15% and 20% by list type. These rules differ from 2021 and 2025. Results are the original results: Supreme Administrative Court resolution Vol 58/2017-173 changed which candidate of one list was elected in one region; the official seats-by-list tables are identical before and after it, and any recalculated vote totals are not shown here. List kinds come from the ČSÚ registers; no threshold outcome is computed for individual lists. Published vote shares are truncated to two decimals.', '在 14 个选区内按连续除数（1、2、3……）进行一轮计票分配，共 200 席；门槛按名单类型分别为 5%、10%、15%、20%。这些规则与 2021、2025 年不同。此处为原始结果：最高行政法院第 Vol 58/2017-173 号裁定改变了一个选区内某名单的当选候选人；官方的各名单席位表在裁定前后完全相同，重新计算后的得票总数未在此显示。名单类型来自捷克统计局登记册；不为单个名单计算门槛结果。公布的得票率截断保留两位小数。'),
  },
  2021: {
    code: 'VOLPS202103', listColumn: 'VSTRANAPS2021', start: '2021-10-08', end: '2021-10-09', lists: 22, status: 'official_final',
    vintage: 'final: ČSÚ DataStat VOLPS202103 v1 (data updated 2026-08-12)',
    family: 'list proportional representation in 14 regions',
    allocation: 'two scrutinies: regional quota (votes ÷ (seats + 2)), then national remainders (÷ (unallocated seats + 1))',
    national: 'Seats are first apportioned to the 14 regions: total valid votes ÷ 200, rounded, is the national seat quota; each region receives the whole number of quotas in its valid votes, remaining seats go to the largest remainders (§ 48). The second scrutiny allocates unassigned seats nationally: summed remainders ÷ (unassigned seats + 1), rounded (§ 51).',
    district: 'First scrutiny within each region: valid votes of the qualifying lists ÷ (regional seats + 2), rounded, is the regional quota; each list receives the number of whole quotas in its regional votes (§ 50).',
    thresholds: [
      ['political party or movement', 5, 'Lists of a single party or movement below 5% of national valid votes take no part in the allocation (§ 49(1)(a)).', '单一政党或运动的名单低于全国有效票 5% 时不参与席位分配（第 49 条第 1 款 a 项）。'],
      ['coalition of two parties or movements', 8, 'Coalitions of two below 8% take no part (§ 49(1)(b)).', '两个政党或运动组成的联盟低于 8% 时不参与（第 49 条第 1 款 b 项）。'],
      ['coalition of three or more parties or movements', 11, 'Coalitions of three or more below 11% take no part (§ 49(1)(c)).', '三个及以上政党或运动组成的联盟低于 11% 时不参与（第 49 条第 1 款 c 项）。'],
    ],
    notes: t('Two scrutinies in 14 regions, 200 seats; thresholds 5%, 8% and 11% by list type, in force from 1 July 2021 and different from 2017. ČSÚ reports that Supreme Administrative Court ruling Vol 102/2021 reset one list\'s substitutes in one region and left the list of elected deputies unchanged. List kinds come from the ČSÚ registers; no threshold outcome is computed for individual lists. Published vote shares are truncated to two decimals.', '14 个选区、两轮计票分配，共 200 席；门槛按名单类型分别为 5%、8%、11%，自 2021 年 7 月 1 日起施行，与 2017 年不同。捷克统计局称，最高行政法院第 Vol 102/2021 号裁定重新确定了一个选区内某名单的候补人，当选议员名单不变。名单类型来自捷克统计局登记册；不为单个名单计算门槛结果。公布的得票率截断保留两位小数。'),
  },
};

function buildHistory() {
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const evidenceSha = sha(evidenceBuf);
  const byCode = Object.fromEntries(evidence.datasets.map((d) => [d.code, d]));
  for (const code of ['VOLPS201703', 'VOLPS202103', 'VOLPS03']) for (const dist of (byCode[code] ?? fail(`${code} missing`)).distributions) for (const [k, v] of Object.entries(NO_RIGHTS)) if (dist.rights?.[k] !== v) fail(`${code} ${dist.format}: rights field ${k} is not '${v}'`);
  const basicDist = byCode.VOLPS03.distributions[0];
  const excerptBuf = read(basicDist.excerpt.path);
  if (sha(excerptBuf) !== basicDist.excerpt.sha256) fail('VOLPS03 excerpt checksum differs from evidence');
  const stagedBasic = path.join(root, '.tmp-data-refresh/political-candidate-czechia/datastat/VOLPS03.csv');
  if (fs.existsSync(stagedBasic)) {
    const full = fs.readFileSync(stagedBasic);
    if (sha(full) !== basicDist.sha256) fail('staged VOLPS03.csv checksum differs from evidence');
    const lines = parseCsv(full.toString('utf8'));
    for (const r of parseCsv(excerptBuf.toString('utf8')).slice(1)) if (JSON.stringify(lines[Number(r[0]) - 1]) !== JSON.stringify(r.slice(1))) fail(`excerpt line ${r[0]} differs from the staged file`);
  }
  const [exHeader, ...exRows] = parseCsv(excerptBuf.toString('utf8'));
  const parserSha = sha(read('scripts/political-data/czechia/build-ps-national.mjs'));
  const retrieved = evidence.retrieval.batch_completed_at;
  const prov = (sourceId, url, recordId, rawPath, rawSha, fields, retrievedAt = retrieved) => ({ source_id: sourceId, source_url: url, source_record_id: recordId, retrieved_at: retrievedAt, raw_snapshot: { path: rawPath, sha256: rawSha }, parser_version: 'czechia-ps-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
  const out = Object.fromEntries(CZECH_STORES.map((s) => [s, []]));
  const checks = {};
  const BASIC = 'src-cz-csu-volps03-2017-2021', PAGE = 'src-cz-volby-ps2017-2021-pages';
  for (const [yearKey, spec] of Object.entries(ELECTIONS)) {
    const year = Number(yearKey);
    const dist = byCode[spec.code].distributions.find((d) => d.format === 'CSV');
    const buf = read(dist.archived_path);
    if (sha(buf) !== dist.sha256) fail(`${spec.code}.csv checksum differs from evidence`);
    const [header, ...rows] = parseCsv(buf.toString('utf8'));
    const C = { ind: header.indexOf('Ukazatel'), code: header.indexOf(spec.listColumn), label: header.indexOf('Volební strana'), year: header.indexOf('Roky'), terr: header.indexOf('Uz02A'), value: header.indexOf('Hodnota') };
    if (Object.values(C).some((i) => i < 0)) fail(`${spec.code} columns differ from the published schema`);
    const lists = new Map();
    for (const [i, r] of rows.entries()) {
      if (r[C.year] !== yearKey || r[C.terr] !== 'CZ') continue;
      const entry = lists.get(r[C.code]) ?? { code: r[C.code], label: r[C.label], lines: {} };
      if (entry.label !== r[C.label]) fail(`${year}: list ${r[C.code]} has two labels`);
      if (entry.lines[r[C.ind]]) fail(`${year}: duplicate ${r[C.ind]} for list ${r[C.code]}`);
      entry.lines[r[C.ind]] = { value: r[C.value], line: i + 2 };
      lists.set(r[C.code], entry);
    }
    for (const l of lists.values()) for (const ind of INDICATORS) if (!l.lines[ind]) fail(`${year}: list ${l.code} missing ${ind}`);
    const total = lists.get('0') ?? fail(`${year}: national total row missing`);
    const contestants = [...lists.values()].filter((l) => l.code !== '0').sort((a, b) => Number(a.code) - Number(b.code));
    if (contestants.length !== spec.lists) fail(`${year}: ${contestants.length} lists, expected ${spec.lists}`);
    const int = (s, what) => { if (!/^\d+$/.test(s)) fail(`${year}: ${what} is not a whole number: ${s}`); return Number(s); };
    const validVotes = int(total.lines['Platné hlasy'].value, 'valid votes');
    const totalSeats = int(total.lines['Získané mandáty'].value, 'seats');
    if (contestants.reduce((n, l) => n + int(l.lines['Platné hlasy'].value, 'votes'), 0) !== validVotes) fail(`${year}: list votes ≠ total valid votes`);
    if (totalSeats !== 200 || contestants.reduce((n, l) => n + int(l.lines['Získané mandáty'].value, 'seats'), 0) !== 200) fail(`${year}: seats ≠ 200`);
    for (const l of contestants) if (Math.floor((Number(l.lines['Platné hlasy'].value) * 10000) / validVotes) / 100 !== Number(l.lines['Platné hlasy v %'].value)) fail(`${year}: list ${l.code} published share is not the truncated share`);
    const basic = Object.fromEntries(exRows.filter((r) => r[exHeader.indexOf('Roky')] === yearKey).map((r) => [r[exHeader.indexOf('Ukazatel')], { value: r[exHeader.indexOf('Hodnota')], line: Number(r[0]) }]));
    const registered = int(basic['Voliči v seznamu']?.value ?? '', 'registered voters');
    const envelopes = int(basic['Vydané obálky']?.value ?? '', 'issued envelopes');
    const turnout = Number(basic['Volební účast (%)']?.value);
    if (int(basic['Platné hlasy']?.value ?? '', 'VOLPS03 valid votes') !== validVotes) fail(`${year}: VOLPS03 valid votes differ`);
    if (Math.abs((envelopes / registered) * 100 - turnout) >= 0.005) fail(`${year}: turnout does not reproduce`);

    const SEATS = `src-cz-csu-volps${year}03`, LAW = `src-cz-esbirka-247-1995-${year}`;
    const statute = evidence.statutes[yearKey];
    const electionId = `el-cz-ps-${spec.start}`, systemId = `es-cz-ps-${year}`, legislatureId = `lg-cz-ps-${year}`;
    const seatsProv = (record, fields) => prov(SEATS, dist.url, record, dist.archived_path, dist.sha256, fields);
    const lawProv = (fields) => prov(LAW, statute.url, `Act 247/1995 Coll. §§ 48–51 (${statute.version})`, `${RAW}/evidence.json`, evidenceSha, fields);
    const pageProv = (fields) => prov(PAGE, evidence.official_pages.find((p) => p.url.includes(`ps${year}/`)).url, 'seats-allocation page', `${RAW}/evidence.json`, evidenceSha, fields);
    out.elections.push({ election_id: electionId, country: 'czechia', election_type: 'national_parliament', chamber: 'Poslanecká sněmovna', date: spec.start, date_end: spec.end, year, legislature_id: legislatureId, electoral_system_id: systemId, result_status: spec.status, result_vintage: spec.vintage, later_poll_date: null, repeat_poll_date: null, court_revision: evidence.court_revisions[yearKey], provenance: [pageProv(['date', 'date_end', 'chamber']), seatsProv(`national rows, Roky=${year}, Uz02A=CZ`, ['result_vintage'])] });
    out.election_turnout.push({ election_id: electionId, country: 'czechia', geography: 'national', vote_type: 'chamber_list_vote', result_vintage: spec.vintage, eligible_voters: registered, voters: envelopes, valid_votes: validVotes, invalid_votes: null, ballots_cast: null, published_turnout: turnout, derived_turnout: (envelopes / registered) * 100, turnout_definition: 'Published turnout (Volební účast): issued envelopes (Vydané obálky) / registered voters (Voliči v seznamu) × 100; the ballots-cast and invalid-vote counts are not in the admitted datasets and are not reconstructed', turnout_basis: { numerator: 'envelopes_issued', denominator: 'registered_electorate', definition: 'issued envelopes / registered voters × 100 (ČSÚ VOLPS03)', sourceIds: [BASIC] }, provenance: [prov(BASIC, basicDist.url, `VOLPS03.csv lines ${['Voliči v seznamu', 'Vydané obálky', 'Volební účast (%)', 'Platné hlasy'].map((k) => basic[k].line).join(', ')}`, basicDist.excerpt.path, basicDist.excerpt.sha256, ['eligible_voters', 'voters', 'published_turnout', 'valid_votes'], basicDist.retrieved_at)] });
    const cid = (code) => `ct-cz-ps${year}-${String(Number(code)).padStart(2, '0')}`;
    for (const l of contestants) {
      const prefix = `${Number(l.code)} `;
      if (!l.label.startsWith(prefix)) fail(`${year}: label of list ${l.code} does not start with its ballot number`);
      out.electoral_contestants.push({ contestant_id: cid(l.code), country: 'czechia', election_id: electionId, contestant_kind: 'electoral_list_kind_not_established', csu_list_code: l.code, registered_label_native: l.label, historical_display_label: l.label.slice(prefix.length), display_label_rule: 'official label without the leading ballot number when it equals the ČSÚ list code', lead_party_id: null, party_relation_status: 'not_established_no_official_register_reviewed', continuous_series_eligible: false, provenance: [seatsProv(`${spec.code}.csv line ${l.lines['Platné hlasy'].line}`, ['csu_list_code', 'registered_label_native'])] });
      const votes = Number(l.lines['Platné hlasy'].value), seats = Number(l.lines['Získané mandáty'].value);
      out.election_results.push({ result_id: `er-${cid(l.code)}`, country: 'czechia', geography: 'national', election_id: electionId, contestant_ref: cid(l.code), vote_type: 'chamber_list_vote', valid_votes: validVotes, total_seats: totalSeats, votes, published_vote_share: Number(l.lines['Platné hlasy v %'].value), derived_vote_share: (votes / validVotes) * 100, seats, published_seat_share: Number(l.lines['Získané mandáty v %'].value), result_vintage: spec.vintage, provenance: [seatsProv(`${spec.code}.csv lines ${INDICATORS.map((i) => l.lines[i].line).join(', ')}`, ['votes', 'published_vote_share', 'seats', 'published_seat_share'])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'czechia', chamber: 'Poslanecká sněmovna', official_term: null, election_id: electionId, total_seats: totalSeats, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: spec.vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [seatsProv(`${spec.code}.csv line ${total.lines['Získané mandáty'].line}`, ['total_seats'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'czechia', election_id: electionId, valid_from: spec.start, valid_to: spec.end, interval_basis: `election-specific rule observation (Act 247/1995 Coll., ${statute.version}), not legal enactment dates`, system_family: spec.family, vote_type: 'chamber_list_vote', allocation_method: spec.allocation, base_seats: 200, vote_definitions: [{ id: 'chamber_list_vote', kind: 'list', label: t('List votes (one list vote per voter)', '名单票（每名选民一票）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SEATS, LAW] }], national_rules: { nationalAllocation: spec.national, districtAllocation: spec.district, thresholds: spec.thresholds.map(([appliesTo, percent, en, zh]) => ({ appliesTo, percent, description: t(en, zh), sourceIds: [LAW] })), minorityRepresentation: null, totalSeatsDefinition: t('200 seats, as recorded in the official result data.', '官方结果数据记载共 200 席。'), sourceIds: [LAW] }, notes: spec.notes, provenance: [lawProv(['system_family', 'allocation_method', 'base_seats', 'national_rules']), pageProv(['notes'])] });
    const source = (id, institution, dataset, url, rawPath, rawSha, licenceUrl, status, attribution, retrievedAt = retrieved) => ({ source_id: id, country: 'czechia', institution, dataset, tier: 'tier1_official', url, licence_status: status, raw_redistribution: status, licence_url: licenceUrl, attribution, retrieved_at: retrievedAt, raw_sha256: rawSha, raw_path: rawPath });
    out.political_source_registry.push(source(SEATS, 'Český statistický úřad', `DataStat ${spec.code} — Získané mandáty ve volbách do Poslanecké sněmovny podle volebních stran (CSV)`, dist.url, dist.archived_path, dist.sha256, byCode[spec.code].catalogue_page, 'no_protected_rights_per_national_catalogue_distribution_metadata', `Český statistický úřad (ČSÚ), DataStat ${spec.code}`));
    out.political_source_registry.push(source(LAW, 'Ministerstvo vnitra — e-Sbírka', `Zákon č. 247/1995 Sb., informative consolidated version ${statute.version} (§§ 48–51 quoted)`, statute.url, `${RAW}/evidence.json`, evidenceSha, statute.url, 'statute_not_subject_to_copyright', 'Sbírka zákonů, e-Sbírka'));
    checks[year] = { lists: contestants.length, validVotes, totalSeats, registered, envelopes, turnout };
  }
  const shared = (id, institution, dataset, url, rawPath, rawSha, licenceUrl, status, attribution, retrievedAt) => ({ source_id: id, country: 'czechia', institution, dataset, tier: 'tier1_official', url, licence_status: status, raw_redistribution: status, licence_url: licenceUrl, attribution, retrieved_at: retrievedAt, raw_sha256: rawSha, raw_path: rawPath });
  out.political_source_registry.push(shared(BASIC, 'Český statistický úřad', 'DataStat VOLPS03 — Základní údaje o volbách do Poslanecké sněmovny podle vybraných území (CSV; national 2017 and 2021 rows archived as an excerpt)', basicDist.url, basicDist.excerpt.path, basicDist.excerpt.sha256, byCode.VOLPS03.catalogue_page, 'no_protected_rights_per_national_catalogue_distribution_metadata', 'Český statistický úřad (ČSÚ), DataStat VOLPS03', basicDist.retrieved_at));
  out.political_source_registry.push(shared(PAGE, 'Český statistický úřad', 'volby.gov.cz PS 2017, PS 2017 NSS and PS 2021 results applications: seats-allocation pages (quoted facts)', 'https://volby.gov.cz/app/ps2021/cs/seats-allocation', `${RAW}/evidence.json`, evidenceSha, 'https://csu.gov.cz/conditions_for_use_and_further_dissemination', 'quoted_facts_only', 'Český statistický úřad (ČSÚ), volby.gov.cz', retrieved));
  return { stores: out, checks };
}

export function buildCzechiaNational() {
  const recent = buildCzechia2025();
  const history = buildHistory();
  const data = {};
  for (const store of CZECH_STORES) data[store] = [...history.stores[store], ...recent[store]];
  for (const store of CZECH_STORES) for (const key of [{ elections: 'election_id', electoral_contestants: 'contestant_id', election_results: 'result_id', legislatures: 'legislature_id', electoral_systems: 'electoral_system_id', political_source_registry: 'source_id' }[store]].filter(Boolean)) if (new Set(data[store].map((r) => r[key])).size !== data[store].length) fail(`duplicate ${key}`);
  const identity = buildCzechIdentity(data);
  data.electoral_contestants = identity.contestants;
  data.political_source_registry = [...data.political_source_registry, ...identity.sources];
  for (const store of IDENTITY_STORES) data[store] = identity[store];
  return { ...data, checks: { ...history.checks, 2025: recent.checks }, identity: identity.checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function czechiaFiles(data) {
  const files = {};
  const stores = [...CZECH_STORES, ...IDENTITY_STORES];
  for (const store of stores) files[`${STORE_DIR}/${store}.json`] = JSON.stringify(data[store], null, 2) + '\n';
  for (const store of stores) {
    files[`${EXPORT_DIR}/${store}.json`] = JSON.stringify(data[store], null, 2) + '\n';
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Czechia — Chamber of Deputies elections 2017, 2021 and 2025 (national level)\n\nThree elections: electoral lists with ČSÚ list codes, list votes, published (truncated) and derived shares, seats; registered voters, issued envelopes and turnout. Source: Český statistický úřad (ČSÚ), DataStat VOLPS201703, VOLPS202103, VOLPS202503 and VOLPS03; the national open-data catalogue records no copyright work, no original database, no database maker\'s right and no personal data for these distributions. Rules: Act 247/1995 Coll. (e-Sbírka informative versions); the thresholds and allocation method changed between 2017 and 2021.\n\n2017 figures are the original results: ČSÚ states that VOLPS201703 does not reflect Supreme Administrative Court resolution Vol 58/2017-173, which changed which candidate of one list was elected in one region; seats by list are unchanged.\n\nIdentity: each list is an election-specific contestant. political_parties, contestant_members and party_identity_links record its kind and proposers from the ČSÚ registers (no protected rights per catalogue metadata; 2025 uses the composition table, because the 2025 list register has no catalogue entry and is unused). A same_party link needs the same ČSÚ proposer code and an Interior Ministry register review, cited but not reproduced. Coalition votes and seats are never divided among members. Links with status unresolved are not continuity.\n\nNot included: regional results, candidates and preferential votes.\n';
  files[`${EXPORT_DIR}/manifest.json`] = JSON.stringify({ schema_version: 'czechia-political-export-v1', country: 'czechia', elections: data.elections.map((e) => e.election_id), continuous_party_series: data.party_identity_links.filter((l) => l.relation === 'same_party' && l.status === 'verified' && !data.party_identity_links.some((x) => x.relation === 'same_party' && x.status === 'verified' && x.toContestant === l.fromContestant)).length, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2) + '\n';
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCzechiaNational();
  const files = czechiaFiles(data);
  if (process.argv.includes('--write')) {
    for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  } else {
    const stale = Object.entries(files).filter(([rel, content]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== content).map(([rel]) => rel);
    if (stale.length) { console.error(`Czechia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); }
  }
  console.log(JSON.stringify({ status: 'pass', ...data.checks, files: Object.keys(files).length }));
}
