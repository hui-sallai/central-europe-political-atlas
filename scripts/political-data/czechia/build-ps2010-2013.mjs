// Czechia — Chamber of Deputies elections of 2002, 2006, 2010 and 2013, national level. Built only from committed evidence
// (docs/political-data/raw/czechia/ps2002-2006/ and ps2010-2013/, staged by stage-ps2002-2006.mjs and stage-ps2010-2013.mjs
// from the ČSÚ open-data packages).
// Fail-closed: every total is reconciled before anything is returned.
//   - district sums reproduce ČSÚ's published national totals (VOLPS03: registered voters, issued envelopes, valid votes, turnout)
//   - list votes sum to valid votes in every region
//   - seats per list from the list register (POCMANDCR) equal the elected count from the candidate register's MANDAT flag
//   - §§ 48–50 of Act 247/1995 (versions in force on each polling day) re-run on the regional votes reproduce every list's seats
//   - 2013: every regional and national cell equals State Electoral Commission notice 343/2013 Sb. (checked at staging)
// Lists that recorded no vote in any polling district (2013 list 19, 2010 list 3, 2002 list 17) were not on any ballot and are not
// contestants. Coalition lists (2002 KOALICE, 2006 Koalice pro Českou republiku) keep their votes and seats whole.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './build-ps2025.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (msg) => { throw new Error(`Czechia 2002–2013 build failed: ${msg}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const codesOf = (s) => s.split(',').map(Number).sort((a, b) => a - b);
const objects = (buf) => { const [h, ...rows] = parseCsv(buf.toString('utf8')); return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const REGIONS = ['1100', '2100', '3100', '3200', '4100', '4200', '5100', '5200', '5300', '6100', '6200', '7100', '7200', '8100'];
// § 27: all districts abroad (KRAJ 9900) belong to one region drawn by lot by the State Electoral Commission for each election.
// 2013: Středočeský kraj (2100), shown by notice 343/2013 Sb. (its Středočeský column equals that region's districts plus the
// districts abroad, cell by cell). 2010: the draw was not read; Jihočeský kraj (3100) is the only region for which §§ 48–50
// reproduce the official seats, so it is used for this check only and is not published as a fact. 2002 and 2006: the draw was not
// read either, and several regions reproduce the official seats, so no region is asserted; the check requires that at least one does.
// National catalogue page of VOLPS03, as recorded in docs/political-data/raw/czechia/ps2017-2021/evidence.json.
const VOLPS03_CATALOGUE = JSON.parse(fs.readFileSync(path.join(root, 'docs/political-data/raw/czechia/ps2017-2021/evidence.json'), 'utf8')).datasets.find((d) => d.code === 'VOLPS03').catalogue_page;

const INFERRED = 'inferred: the only region for which §§ 48–50 reproduce the official seats; the § 27 draw was not read';
const SETS = [
  { raw: 'docs/political-data/raw/czechia/ps2002-2006', label: '2002 and 2006', basic: 'src-cz-csu-volps03-2002-2006', evidence: 'src-cz-ps2002-2006-evidence', first: '2006', specs: {
    2002: { start: '2002-06-14', end: '2002-06-15', lists: 28, abroad: null, abroadBasis: 'not established: the § 27 draw was not read and several regions reproduce the official seats', seats: { 3: 70, 22: 58, 23: 41, 25: 31 } },
    2006: { start: '2006-06-02', end: '2006-06-03', lists: 26, abroad: null, abroadBasis: 'not established: the § 27 draw was not read and several regions reproduce the official seats', seats: { 9: 81, 10: 74, 18: 6, 20: 26, 24: 13 } },
  } },
  { raw: 'docs/political-data/raw/czechia/ps2010-2013', label: '2010 and 2013', basic: 'src-cz-csu-volps03-2010-2013', evidence: 'src-cz-ps2010-2013-evidence', first: '2013', specs: {
    2010: { start: '2010-05-28', end: '2010-05-29', lists: 26, abroad: '3100', abroadBasis: INFERRED, seats: { 4: 24, 6: 26, 9: 56, 15: 41, 26: 53 } },
    2013: { start: '2013-10-25', end: '2013-10-26', lists: 23, abroad: '2100', abroadBasis: 'notice 343/2013 Sb.: the Středočeský column includes the districts abroad', seats: { 1: 50, 4: 26, 6: 16, 11: 14, 17: 14, 20: 47, 21: 33 } },
  } },
];
const THRESHOLDS = [
  ['political party or movement', 5, 'Lists of a single party or movement below 5% of national valid votes take no part in the allocation (§ 49(1)(a)).', '单一政党或运动的名单低于全国有效票 5% 时不参与席位分配（第 49 条第 1 款 a 项）。'],
  ['coalition of two parties or movements', 10, 'Coalitions of two below 10% take no part (§ 49(1)(b)).', '两个政党或运动组成的联盟低于 10% 时不参与（第 49 条第 1 款 b 项）。'],
  ['coalition of three parties or movements', 15, 'Coalitions of three below 15% take no part (§ 49(1)(c)).', '三个政党或运动组成的联盟低于 15% 时不参与（第 49 条第 1 款 c 项）。'],
  ['coalition of four or more parties or movements', 20, 'Coalitions of four or more below 20% take no part (§ 49(1)(d)).', '四个及以上政党或运动组成的联盟低于 20% 时不参与（第 49 条第 1 款 d 项）。'],
];

// § 48: republic mandate number = total valid votes ÷ 200, rounded; each region gets the whole quotients, remainders by size.
// § 49: lists below their threshold are excluded: 5% for one party, 10% for two, 15% for three, 20% for four or more members.
// § 50: within each region, qualifying lists' votes ÷ 1, 2, 3 …; the largest quotients win the region's seats.
export function allocate(regionVotes, totalSeats = 200, members = {}) {
  const valid = Object.fromEntries(REGIONS.map((k) => [k, Object.values(regionVotes[k]).reduce((a, b) => a + b, 0)]));
  const all = Object.values(valid).reduce((a, b) => a + b, 0);
  const rmc = Math.round(all / totalSeats);
  const regionSeats = Object.fromEntries(REGIONS.map((k) => [k, Math.floor(valid[k] / rmc)]));
  let left = totalSeats - Object.values(regionSeats).reduce((a, b) => a + b, 0);
  for (const k of [...REGIONS].sort((a, b) => (valid[b] % rmc) - (valid[a] % rmc))) { if (left <= 0) break; regionSeats[k] += 1; left -= 1; }
  const national = {};
  for (const k of REGIONS) for (const [list, v] of Object.entries(regionVotes[k])) national[list] = (national[list] ?? 0) + v;
  const threshold = (l) => [5, 10, 15, 20][Math.min(members[l] ?? 1, 4) - 1];
  const qualified = Object.keys(national).filter((l) => national[l] * 100 >= all * threshold(l));
  const seats = {};
  for (const k of REGIONS) {
    const q = qualified.flatMap((l) => Array.from({ length: regionSeats[k] }, (_, i) => ({ l, q: (regionVotes[k][l] ?? 0) / (i + 1), v: regionVotes[k][l] ?? 0 })));
    q.sort((a, b) => b.q - a.q || b.v - a.v);
    if (q[regionSeats[k] - 1] && q[regionSeats[k]] && q[regionSeats[k] - 1].q === q[regionSeats[k]].q && q[regionSeats[k] - 1].v === q[regionSeats[k]].v) fail(`region ${k}: tie at the last seat (decided by lot)`);
    for (const x of q.slice(0, regionSeats[k])) seats[x.l] = (seats[x.l] ?? 0) + 1;
  }
  return { rmc, regionSeats, qualified, seats };
}

export function buildCzechiaEarly() {
  const parserSha = sha(read('scripts/political-data/czechia/build-ps2010-2013.mjs'));
  const archived = (meta) => { const buf = read(meta.path); if (sha(buf) !== meta.sha256) fail(`${meta.path} checksum differs from evidence`); return buf; };
  const out = { elections: [], election_turnout: [], election_results: [], electoral_contestants: [], legislatures: [], electoral_systems: [], political_source_registry: [] };
  const checks = {};
  for (const set of SETS) {
  const RAW = set.raw;
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const evidenceSha = sha(evidenceBuf);
  const volps = objects(archived(evidence.volps03.excerpt));
  const RIGHTS = evidence.rights;
  const BASIC = set.basic, EVIDENCE = set.evidence;
  for (const [yearKey, spec] of Object.entries(set.specs)) {
    const year = Number(yearKey), Y = evidence.years[yearKey];
    const totals = objects(archived(Y.archived.region_totals));
    const listVotes = objects(archived(Y.archived.region_list_votes));
    const register = objects(archived(Y.archived.psrkl));
    const cvs = new Map(objects(archived(Y.archived.cvs_excerpt)).map((r) => [r.VSTRANA, r]));
    const elected = new Map(objects(archived(Y.archived.elected_counts)).map((r) => [Number(r.KSTRANA), Number(r.elected)]));
    const sum = (k) => totals.reduce((n, r) => n + Number(r[k]), 0);
    const registered = sum('VOL_SEZNAM'), envelopes = sum('VYD_OBALKY'), returned = sum('ODEVZ_OBAL'), validVotes = sum('PL_HL_CELK'), districts = sum('districts');
    const basic = Object.fromEntries(volps.filter((r) => r.Roky === yearKey).map((r) => [r.Ukazatel, { value: r.Hodnota, line: r.source_line }]));
    const published = { registered: Number(basic['Voliči v seznamu'].value), envelopes: Number(basic['Vydané obálky'].value), valid: Number(basic['Platné hlasy'].value), turnout: Number(basic['Volební účast (%)'].value), districts: Number(basic['Počet okrsků'].value) };
    if (registered !== published.registered || envelopes !== published.envelopes || validVotes !== published.valid || districts !== published.districts) fail(`${year}: district sums differ from VOLPS03`);
    if (Math.abs((envelopes / registered) * 100 - published.turnout) >= 0.005) fail(`${year}: turnout does not reproduce`);
    // Region × list votes, with districts abroad counted in the Středočeský kraj.
    const regionVotes = Object.fromEntries(REGIONS.map((k) => [k, {}])), abroad = {};
    const national = new Map();
    for (const r of listVotes) {
      const l = Number(r.KSTRANA), v = Number(r.POC_HLASU);
      if (r.KRAJ === '9900') abroad[l] = (abroad[l] ?? 0) + v; else regionVotes[r.KRAJ][l] = (regionVotes[r.KRAJ][l] ?? 0) + v;
      national.set(l, (national.get(l) ?? 0) + v);
    }
    for (const r of totals) { const s = listVotes.filter((x) => x.KRAJ === r.KRAJ).reduce((n, x) => n + Number(x.POC_HLASU), 0); if (s !== Number(r.PL_HL_CELK)) fail(`${year} ${r.KRAJ}: list votes ≠ valid votes`); }
    const onBallot = register.filter((l) => national.has(Number(l.KSTRANA)) && national.get(Number(l.KSTRANA)) > 0);
    const offBallot = register.filter((l) => !onBallot.includes(l));
    if (onBallot.length !== spec.lists) fail(`${year}: ${onBallot.length} lists with votes, expected ${spec.lists}`);
    if ([...national.values()].reduce((a, b) => a + b, 0) !== validVotes) fail(`${year}: list votes ≠ valid votes`);
    for (const l of offBallot) if ((national.get(Number(l.KSTRANA)) ?? 0) !== 0 || Number(l.POCMANDCR || 0) !== 0) fail(`${year}: list ${l.KSTRANA} without votes has votes or seats`);
    const seatOf = (l) => Number(l.POCMANDCR || 0);
    for (const l of onBallot) {
      if (seatOf(l) !== (elected.get(Number(l.KSTRANA)) ?? 0)) fail(`${year}: list ${l.KSTRANA} register seats ≠ elected count`);
      if (seatOf(l) !== (spec.seats[Number(l.KSTRANA)] ?? 0)) fail(`${year}: list ${l.KSTRANA} seats differ from the reviewed seat table`);
      if (l.PLAT_STR !== 'A') fail(`${year}: list ${l.KSTRANA} is not a valid registered list`);
      const cv = cvs.get(l.VSTRANA), n = l.SLOZENI.split(',').length;
      // 2002's code list has no TYPVS column: the member list (SLOZENI) and its count (POCSTR_SLO) must then agree with the register.
      if (!cv || codesOf(cv.SLOZENI).join() !== codesOf(l.SLOZENI).join() || (cv.TYPVS !== undefined ? cv.TYPVS !== (n > 1 ? 'K' : 'S') : Number(cv.POCSTR_SLO) !== n) || Number(l.POCSTRVKO) !== n) fail(`${year}: list ${l.KSTRANA} kind differs between the register and the code list`);
    }
    if (onBallot.reduce((n, l) => n + seatOf(l), 0) !== 200) fail(`${year}: seats ≠ 200`);
    // § 27: districts abroad belong to one region drawn by lot. Each region is tried; the official seats must be reproduced for the
    // stated region, or (where none is stated) for at least one region.
    const membersOf = Object.fromEntries(onBallot.map((l) => [l.KSTRANA, l.SLOZENI.split(',').length]));
    const withAbroad = (to) => Object.fromEntries(REGIONS.map((k) => [k, k === to ? Object.fromEntries([...new Set([...Object.keys(regionVotes[k]), ...Object.keys(abroad)])].map((l) => [l, (regionVotes[k][l] ?? 0) + (abroad[l] ?? 0)])) : regionVotes[k]]));
    const reproduces = (to) => { const sim = allocate(withAbroad(to), 200, membersOf); return Object.values(sim.regionSeats).reduce((a, b) => a + b, 0) === 200 && onBallot.every((l) => (sim.seats[l.KSTRANA] ?? 0) === seatOf(l)); };
    const regionsReproducing = REGIONS.filter(reproduces);
    if (spec.abroad ? !regionsReproducing.includes(spec.abroad) : !regionsReproducing.length) fail(`${year}: §§ 48–50 do not reproduce the official seats`);
    const sim = allocate(withAbroad(spec.abroad ?? regionsReproducing[0]), 200, membersOf);

    const coalitions = onBallot.filter((l) => l.SLOZENI.includes(',')).length;
    const electionId = `el-cz-ps-${spec.start}`, systemId = `es-cz-ps-${year}`, legislatureId = `lg-cz-ps-${year}`;
    const DATA = `src-cz-volby-ps${year}-opendata`, LAW = `src-cz-esbirka-247-1995-${year}`, CALL = `src-cz-esbirka-call-${year}`;
    const notice = evidence.results_notices[yearKey];
    const NOTICE = notice.status === 'not_located' ? null : `src-cz-esbirka-results-${year}`;
    const vintage = `final: ČSÚ open data PS${year} (data package 2023-02-24, registers 2023-04-28)${NOTICE ? `; equals State Electoral Commission notice ${notice.act.match(/č\. (\d+\/\d{4}) Sb\./)[1]} Sb.` : ''}`;
    const prov = (sourceId, url, record, meta, fields, how = 'published', extra = {}) => ({ source_id: sourceId, source_url: url, source_record_id: record, retrieved_at: Y.packages.data.retrieved_at, raw_snapshot: { path: meta.path, sha256: meta.sha256 }, parser_version: 'czechia-ps-2010-2013-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, ...extra });
    const evMeta = { path: `${RAW}/evidence.json`, sha256: evidenceSha };
    const sumProv = (record, fields) => prov(DATA, Y.packages.data.url, record, Y.archived.region_list_votes, fields, 'derived', { formula: 'sum of POC_HLASU over all polling-district rows of csv_od/pst4p.csv for the list', input_fields: ['POC_HLASU'] });
    const regProv = (record, fields) => prov(DATA, Y.packages.reg.url, record, Y.archived.psrkl, fields);
    const basicProv = (fields) => prov(BASIC, evidence.volps03.url, `VOLPS03.csv lines ${['Voliči v seznamu', 'Vydané obálky', 'Volební účast (%)', 'Platné hlasy'].map((k) => basic[k].line).join(', ')}`, evidence.volps03.excerpt, fields);
    const lawProv = (fields) => prov(LAW, evidence.statutes[yearKey].url, `Act 247/1995 Coll. §§ 24, 48–50 (${evidence.statutes[yearKey].version})`, evMeta, fields);
    out.elections.push({ election_id: electionId, country: 'czechia', election_type: 'national_parliament', chamber: 'Poslanecká sněmovna', date: spec.start, date_end: spec.end, year, legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [prov(CALL, evidence.election_calls[yearKey].url, evidence.election_calls[yearKey].act, evMeta, ['date', 'date_end', 'chamber'])] });
    out.election_turnout.push({ election_id: electionId, country: 'czechia', geography: 'national', vote_type: 'chamber_list_vote', result_vintage: vintage, eligible_voters: registered, voters: envelopes, valid_votes: validVotes, invalid_votes: null, ballots_cast: null, published_turnout: published.turnout, derived_turnout: (envelopes / registered) * 100, turnout_definition: 'Published turnout (Volební účast): issued envelopes (Vydané obálky) / registered voters (Voliči v seznamu) × 100. Returned envelopes and invalid votes are in the district tables but are not part of this published definition.', turnout_basis: { numerator: 'envelopes_issued', denominator: 'registered_electorate', definition: 'issued envelopes / registered voters × 100 (ČSÚ VOLPS03)', sourceIds: [BASIC] }, provenance: [basicProv(['eligible_voters', 'voters', 'published_turnout', 'valid_votes'])] });
    const cid = (code) => `ct-cz-ps${year}-${String(Number(code)).padStart(2, '0')}`;
    for (const l of onBallot.sort((a, b) => Number(a.KSTRANA) - Number(b.KSTRANA))) {
      const code = Number(l.KSTRANA), votes = national.get(code), seats = seatOf(l);
      const coalition = l.SLOZENI.split(',').length > 1, cv = cvs.get(l.VSTRANA);
      out.electoral_contestants.push({ contestant_id: cid(code), country: 'czechia', election_id: electionId, contestant_kind: coalition ? 'coalition' : 'party_list', kind_basis: coalition ? `list register: ${l.SLOZENI.split(',').length} proposers (SLOZENI)${cv.TYPVS ? ' and code-list type K (coalition)' : '; the 2002 code list has no type column'}` : `list register: one proposer (SLOZENI)${cv.TYPVS ? ' and code-list type S (single party or movement)' : '; the 2002 code list has no type column'}`, csu_list_code: String(code), csu_register_code: Number(l.VSTRANA), register_type: cv.TYPVS ?? null, csu_proposer_codes: codesOf(l.SLOZENI), registered_label_native: l.NAZEVCELK, historical_display_label: l.NAZEVCELK, display_label_rule: 'full list name from the list register (NAZEVCELK)', lead_party_id: null, party_relation_status: 'not_linked_identity_layer_covers_2017_onward', continuous_series_eligible: false, provenance: [regProv(`psrkl.csv KSTRANA ${code}`, ['csu_list_code', 'registered_label_native', 'csu_register_code', 'csu_proposer_codes'])] });
      out.election_results.push({ result_id: `er-${cid(code)}`, country: 'czechia', geography: 'national', election_id: electionId, contestant_ref: cid(code), vote_type: 'chamber_list_vote', valid_votes: validVotes, total_seats: 200, votes, published_vote_share: null, derived_vote_share: (votes / validVotes) * 100, seats, published_seat_share: null, result_vintage: vintage, provenance: [sumProv(`ps${year}_region_list_votes.csv KSTRANA ${code}`, ['votes']), regProv(`psrkl.csv KSTRANA ${code} POCMANDCR`, ['seats'])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'czechia', chamber: 'Poslanecká sněmovna', official_term: null, election_id: electionId, total_seats: 200, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [lawProv(['total_seats'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'czechia', election_id: electionId, valid_from: spec.start, valid_to: spec.end, interval_basis: `election-specific rule observation (Act 247/1995 Coll., ${evidence.statutes[yearKey].version}), not legal enactment dates`, system_family: 'list proportional representation in 14 regions', vote_type: 'chamber_list_vote', allocation_method: 'one scrutiny: successive divisors 1, 2, 3 … within each region', base_seats: 200, vote_definitions: [{ id: 'chamber_list_vote', kind: 'list', label: t('List votes (one list vote per voter)', '名单票（每名选民一票）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [DATA, LAW] }], national_rules: {
      nationalAllocation: 'Seats are apportioned to the 14 regions: total valid votes ÷ 200, rounded, is the republic mandate number; each region receives the whole number of mandate numbers in its valid votes, remaining seats go to the largest remainders (§ 48). There is no national second scrutiny.',
      districtAllocation: 'Within each region the votes of each qualifying list are divided by 1, 2, 3 and so on; the largest quotients up to the regional seat number each win one seat (§ 50).',
      thresholds: THRESHOLDS.map(([appliesTo, percent, en, zh]) => ({ appliesTo, percent, description: t(en, zh), sourceIds: [LAW] })),
      minorityRepresentation: null, totalSeatsDefinition: t('200 seats (§ 24).', '共 200 席（第 24 条）。'), sourceIds: [LAW] },
      notes: t(`One scrutiny by successive divisors within 14 regions, 200 seats; thresholds 5%, 10%, 15% and 20% by list type, the same §§ 48–50 text as in 2017 and different from 2021 and 2025. ${coalitions ? `${spec.lists} lists stood, ${coalitions} of them ${coalitions === 1 ? 'a coalition' : 'coalitions'}; coalition votes and seats are not divided among members.` : `All ${spec.lists} lists were single parties or movements.`} Votes are sums of the official polling-district records; re-running §§ 48–50 on them reproduces every list's seats. Districts abroad belong to one region drawn by lot (§ 27). No published vote share is stored.`, `14 个选区内一轮最高均数法分配，共 200 席；门槛按名单类型分别为 5%、10%、15%、20%，第 48–50 条文本与 2017 年相同，与 2021 和 2025 年不同。${coalitions ? `共 ${spec.lists} 份名单，其中 ${coalitions} 份为联盟；联盟的票数和席位不在成员间分配。` : `全部 ${spec.lists} 份名单均为单一政党或运动。`}票数为官方投票区记录之和；按第 48–50 条重算可复现各名单席位。国外投票区按抽签归入某一选区（第 27 条）。未存储官方公布的得票率。`),
      provenance: [lawProv(['system_family', 'allocation_method', 'base_seats', 'national_rules'])] });
    const source = (id, institution, dataset, url, rawPath, rawSha, licenceUrl, status, attribution) => ({ source_id: id, country: 'czechia', institution, dataset, tier: 'tier1_official', url, licence_status: status, raw_redistribution: status, licence_url: licenceUrl, attribution, retrieved_at: Y.packages.data.retrieved_at, raw_sha256: rawSha, raw_path: rawPath });
    out.political_source_registry.push(source(DATA, 'Český statistický úřad', `volby.gov.cz open data PS${year}: results (pst4, pst4p), registers (psrkl; psrk read for MANDAT only) and code lists (cvs), CSV packages`, Y.packages.data.url, Y.archived.region_list_votes.path, Y.archived.region_list_votes.sha256, RIGHTS.terms_url, 'cc_by_4_0_csu_terms_owner_accepted_for_volby_gov_cz', RIGHTS.attribution));
    out.political_source_registry.push(source(LAW, 'Ministerstvo vnitra — e-Sbírka', `Zákon č. 247/1995 Sb., informative consolidated version ${evidence.statutes[yearKey].version} (§§ 24, 48–50 quoted)`, evidence.statutes[yearKey].url, `${RAW}/evidence.json`, evidenceSha, evidence.statutes[yearKey].url, 'statute_not_subject_to_copyright', 'Sbírka zákonů, e-Sbírka'));
    out.political_source_registry.push(source(CALL, 'Ministerstvo vnitra — e-Sbírka', evidence.election_calls[yearKey].act, evidence.election_calls[yearKey].url, `${RAW}/evidence.json`, evidenceSha, evidence.election_calls[yearKey].url, 'statute_not_subject_to_copyright', 'Sbírka zákonů, e-Sbírka'));
    if (NOTICE) out.political_source_registry.push(source(NOTICE, 'Státní volební komise — e-Sbírka', notice.act, notice.url, `${RAW}/evidence.json`, evidenceSha, notice.url, 'statute_not_subject_to_copyright', 'Sbírka zákonů, e-Sbírka'));
    checks[year] = { abroad_region: spec.abroad, abroad_basis: spec.abroadBasis, regions_reproducing: regionsReproducing.length, lists: onBallot.length, not_on_ballot: offBallot.map((l) => Number(l.KSTRANA)), registered, envelopes, returned, validVotes, turnout: published.turnout, rmc: sim.rmc, seats_reproduced: true };
  }
  out.political_source_registry.push({ source_id: BASIC, country: 'czechia', institution: 'Český statistický úřad', dataset: `DataStat VOLPS03 — Základní údaje o volbách do Poslanecké sněmovny podle vybraných území (CSV; national ${set.label} rows archived as an excerpt)`, tier: 'tier1_official', url: evidence.volps03.url, licence_status: 'no_protected_rights_per_national_catalogue_distribution_metadata', raw_redistribution: 'no_protected_rights_per_national_catalogue_distribution_metadata', licence_url: VOLPS03_CATALOGUE, attribution: 'Český statistický úřad (ČSÚ), DataStat VOLPS03', retrieved_at: evidence.years[set.first].packages.data.retrieved_at, raw_sha256: evidence.volps03.excerpt.sha256, raw_path: evidence.volps03.excerpt.path });
  out.political_source_registry.push({ source_id: EVIDENCE, country: 'czechia', institution: 'Český statistický úřad; Ministerstvo vnitra — e-Sbírka (citation only)', dataset: `Evidence record for the ${set.label} admission: retrieval log, rights reading, statute and election-call quotes${set.label.includes('2013') ? ', results-notice comparison' : ''}`, tier: 'tier1_official', url: RIGHTS.terms_url, licence_status: 'quoted_facts_only', raw_redistribution: 'quoted_facts_only', licence_url: RIGHTS.terms_url, attribution: RIGHTS.attribution, retrieved_at: evidence.years[set.first].packages.data.retrieved_at, raw_sha256: sha(read(`${RAW}/evidence.json`)), raw_path: `${RAW}/evidence.json` });
  }
  return { stores: out, checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildCzechiaEarly().checks, null, 1));
