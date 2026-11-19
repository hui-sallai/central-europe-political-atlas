// Croatia — Croatian Parliament (Hrvatski sabor) elections, from the State Electoral Commission's (Državno izborno
// povjerenstvo, DIP) final-results decisions ("konačni rezultati"), one per constituency and per national-minority
// election (owner brief 2026-11-18 "Complete ten-country parliamentary election coverage"; owner answers: rights basis
// accepted for official texts, www.izbori.hr registered for manual reading).
// Built only from the committed transcription docs/political-data/raw/croatia/sabor/evidence.json (figures, party
// names and checksums; candidate names are never stored). Fail-closed reconciliation per constituency:
//   - list votes = valid ballots; valid + invalid = ballots; ballots ≤ voters who turned out ≤ voters on the roll;
//   - printed list percentages = votes ÷ valid ballots, truncated (2016 onwards) or rounded (2011, 2015) to two decimals;
//   - lists at or above 5% of valid ballots = the lists the decision names as taking part (Art. 41);
//   - D'Hondt over those lists reproduces the printed seats (14 per territorial constituency, 3 abroad);
//   - national-minority elections: elected candidates = seats by law and are the candidates with most votes;
//   - seats: 10 × 14 + 3 + 8 = 151 from 2011. In 2000, 2003 and 2007 (added 2026-11-19 from decisions the owner saved)
//     the seats abroad were not fixed: the decision prints the valid votes in I–X, the quotient (÷ 140) and the seats
//     abroad (valid votes abroad ÷ quotient), all checked here; minority seats were 5 in 2000 and 8 in 2003 and 2007,
//     so the chamber had 151, 152 and 153 seats.
//   - 1992 (mixed system, Chamber of Representatives only, 138 seats): see reconcile1992 below.
//   - 1995 (mixed system, Chamber of Representatives only, 127 seats): see reconcile1995 below.
// Votes are kept per constituency: lists differ between constituencies, so no national vote share is computed.
// Seats are also grouped by identical printed list title (a factual grouping, not a party attribution).
//
// Usage: node scripts/political-data/croatia/build-sabor.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/croatia/sabor/evidence.json';
const STORE_DIR = 'src/data/political/croatia';
const EXPORT_DIR = 'public/research-data/political/croatia';
export const CROATIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
export const LIST_VOTE = 'hr_list_vote';
export const MINORITY_VOTE = 'hr_minority_candidate_vote';
export const YEARS = ['2000', '2003', '2007', '2011', '2015', '2016', '2020', '2024'];
const CHAMBER = 'Hrvatski sabor';
const TERRITORIAL_SEATS = 14;
const TOTAL = 151;
/** Seats by mechanism for one election: fixed from 2011 (3 abroad, 8 minority); before, recorded per election. */
export function structureOf(year, E) {
  const s = E.seat_structure;
  if (!s) return { diaspora: 3, diasporaBasis: 'fixed', minorityElections: 6, minority: 8, total: TOTAL };
  const st = { diaspora: s.diaspora_seats, diasporaBasis: s.diaspora_seat_basis, minorityElections: s.minority_elections, minority: s.minority_seats, total: s.total };
  if (s.territorial_constituencies !== 10 || s.territorial_seats_each !== TERRITORIAL_SEATS || st.total !== 140 + st.diaspora + st.minority) fail(`${year}: seat structure does not add up`);
  return st;
}
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Croatia build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, key = 'votes') => rows.reduce((n, r) => n + (r[key] ?? 0), 0);
/** Percentages as printed by the commission: truncated (2016 onwards) or rounded (2015) to two decimals, per election. */
const pct2 = (num, den, convention) => ((convention === 'rounded_two_decimals' ? Math.round((num * 10000) / den) : Math.floor((num * 10000) / den)) / 100).toFixed(2).replace('.', ',');
const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const geoOf = (u) => (u.kind === 'national_minority' ? `hr-ie-12-${u.minority_code}` : `hr-ie-${String(u.constituency_number).padStart(2, '0')}`);

/** D'Hondt (highest averages); a tie for the last seat fails closed. */
export function dhondt(votes, seats) {
  const won = votes.map(() => 0);
  for (let i = 0; i < seats; i += 1) {
    const q = votes.map((v, k) => v / (won[k] + 1));
    const best = Math.max(...q);
    if (q.filter((x) => x === best).length > 1) fail('tie in the seat allocation');
    won[q.indexOf(best)] += 1;
  }
  return won;
}

export function reconcileUnit(year, u, convention, st = { diaspora: 3 }) {
  const check = (ok, what) => { if (!ok) fail(`${year} ${u.unit_key}: ${what}`); };
  const T = u.totals;
  check(T.invalid + T.valid === T.voted_by_ballots, 'valid + invalid ≠ ballots');
  if (T.turned_out === null) check(T.voted_by_ballots <= T.registered, 'ballots > registered');
  else check(T.voted_by_ballots <= T.turned_out && T.turned_out <= T.registered, 'ballots ≤ turned out ≤ registered violated');
  if (u.kind === 'national_minority') {
    const c = u.candidates;
    check(c.every((x, i) => x.row === i + 1), 'candidate rows not consecutive');
    const elected = c.filter((x) => x.elected);
    check(elected.length === u.seats_by_law, `elected ${elected.length} ≠ seats by law ${u.seats_by_law}`);
    const top = [...c].sort((a, b) => b.votes - a.votes).slice(0, u.seats_by_law);
    check(top.every((x) => x.elected), 'elected candidates are not those with most votes');
    if (u.seats_by_law === 1) check(sum(c) === T.valid, 'candidate votes ≠ valid ballots (one vote per ballot)');
    else check(sum(c) <= u.seats_by_law * T.valid, 'candidate votes exceed seats × valid ballots');
    return { unit: u.unit_key, kind: u.kind, candidates: c.length, seats: u.seats_by_law, valid: T.valid };
  }
  const L = u.lists;
  check(L.every((x, i) => x.row === i + 1), 'list rows not consecutive');
  check(sum(L) === T.valid, 'list votes ≠ valid ballots');
  if (!['truncated_two_decimals', 'rounded_two_decimals'].includes(convention)) fail(`${year}: unknown percentage convention`);
  check(L.every((x) => pct2(x.votes, T.valid, convention) === x.printed_percent), `printed percentage ≠ votes ÷ valid ballots (${convention})`);
  for (let i = 1; i < L.length; i += 1) check(L[i - 1].votes >= L[i].votes, 'rows not in descending vote order');
  const seats = u.kind === 'diaspora' ? st.diaspora : TERRITORIAL_SEATS;
  check(sum(L, 'seats') === seats, `seats ≠ ${seats}`);
  const taking = L.filter((x) => x.votes * 100 >= 5 * T.valid);
  // 2003 abroad: the decision names only the seat-winning list as taking part (recorded as allocation_wording).
  const named = u.allocation_wording === 'seat_winning_lists_only' ? taking.filter((x) => x.seats > 0).length : taking.length;
  check(named === u.lists_in_allocation_printed, `lists at or above 5% (${named}) ≠ lists named in the decision (${u.lists_in_allocation_printed})`);
  const won = dhondt(taking.map((x) => x.votes), seats);
  check(won.join() === taking.map((x) => x.seats).join(), `D'Hondt seats ${won} differ from the decision`);
  check(L.filter((x) => !taking.includes(x)).every((x) => x.seats === 0), 'a list below 5% holds seats');
  // Section IV lists the seat-winning lists in order; some 2011 decisions also list a threshold list with 0 seats.
  const iv = u.seats_section_iv_in_order.join();
  check(iv === taking.filter((x) => x.seats > 0).map((x) => x.seats).join() || iv === taking.map((x) => x.seats).join(), 'section IV seat order mismatch');
  return { unit: u.unit_key, kind: u.kind, lists: L.length, valid: T.valid, seats, threshold_votes: Math.ceil(0.05 * T.valid), lists_in_allocation: taking.length };
}

const unitName = (u) => (u.kind === 'national_minority' ? `the ${u.minority_en} minority election` : `constituency ${roman[u.constituency_number]}`);
const joinEn = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** Election-specific texts for 2000, 2003 and 2007 (non-fixed quota abroad; 5 or 8 minority seats). */
export function historicalTexts(year, st, q, E, units) {
  const byKey = Object.fromEntries(units.map((u) => [u.unit_key, u]));
  const rp = E.repeat_poll ?? null;
  const minority = st.minority === 5
    ? t('Five members for national minorities were elected in a separate constituency (XII) covering the whole country: one each for the Serbian, Hungarian and Italian minorities, one for the Czech and Slovak minorities and one for the Austrian, German, Rusyn, Ukrainian and Jewish minorities. Each was elected as an individual candidate; candidate names are not stored here.', '少数民族的 5 名议员在覆盖全国的单独选区（第 XII 选区）选出：塞尔维亚族、匈牙利族、意大利族各 1 名，捷克族与斯洛伐克族共 1 名，奥地利族、德意志族、卢森尼亚族、乌克兰族和犹太族共 1 名。每名议员以个人候选人身份当选；此处不存储候选人姓名。')
    : t('Eight members for national minorities were elected in a separate constituency (XII) covering the whole country: three for the Serbian minority (the Serbian candidates’ votes add up to more than the valid ballots, as voters could mark more than one candidate), one each for the Hungarian and Italian minorities, one for the Czech and Slovak minorities, and one each for two groups of other minorities. Each was elected as an individual candidate; candidate names are not stored here.', '少数民族的 8 名议员在覆盖全国的单独选区（第 XII 选区）选出：塞尔维亚族 3 名（塞尔维亚族候选人得票合计多于有效选票，选民可选多名候选人），匈牙利族、意大利族各 1 名，捷克族与斯洛伐克族共 1 名，另两组其他少数民族各 1 名。每名议员以个人候选人身份当选；此处不存储候选人姓名。');
  const diaspora = t(`${st.diaspora} members were elected in the constituency for voters without residence in Croatia (XI). The number was not fixed: the decision divides the valid votes in the ten territorial constituencies (${q.valid_votes_i_x}) by 140, giving a quotient of ${q.quotient}, and the valid votes abroad (${q.valid_votes_abroad}) by that quotient (${q.ratio}), giving ${st.diaspora} seats. Seats were then shared by the same list rules as in the territorial constituencies.`, `在克罗地亚无居所的选民所属选区（第 XI 选区）选出 ${st.diaspora} 名议员。席位数不固定：决定以十个地域选区的有效票（${q.valid_votes_i_x}）除以 140 得商数 ${q.quotient}，再以境外有效票（${q.valid_votes_abroad}）除以该商数（${q.ratio}），得 ${st.diaspora} 席；名单规则与地域选区相同。`);
  const total = t(`${st.total} seats: 140 from ten territorial constituencies, ${st.diaspora} from the constituency abroad and ${st.minority} for national minorities.`, `${st.total} 席：十个地域选区 140 席、境外选区 ${st.diaspora} 席、少数民族 ${st.minority} 席。`);
  const chamberEn = E.chamber_printed ? ` The ${year} decisions name the chamber ${E.chamber_printed} (Chamber of Representatives of the Croatian State Parliament); this record covers that chamber only. Their turnout section prints counts without percentages, so turnout is derived.` : '';
  const chamberZh = E.chamber_printed ? ` ${year} 年决定所称议院为 ${E.chamber_printed}（克罗地亚国家议会代表院）；本记录仅涵盖该议院。决定的投票情况部分只印人数、未印百分比，投票率为推算。` : '';
  const repeatEn = rp ? ` The polling days printed in the decisions for ${joinEn(rp.units.map((k) => unitName(byKey[k])))} include repeat voting on ${rp.date}; their figures include it.` : '';
  const repeatZh = rp ? ` ${rp.units.length} 份决定所印投票日包括 ${rp.date} 的重新投票，其数字已包含在内。` : '';
  const notes = t(`Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. There was no preferential vote before the 2015 amendments: candidates were elected in list order. Independent lists are printed with their leader's name (NEOVISNA LISTA - …); they are shown as NEOVISNA LISTA and the name is not stored.${chamberEn}${repeatEn}`, `得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。2015 年修正之前没有优先票：候选人按名单顺序当选。独立名单印有领衔人姓名（NEOVISNA LISTA - …），此处显示为 NEOVISNA LISTA，不存储姓名。${chamberZh}${repeatZh}`);
  return { minority, diaspora, total, notes };
}

// ── 1995 (added 2026-11-19; owner answer "1992, 1993 and 1995 only") ──────────────────────────────────────────────
// Chamber of Representatives (Zastupnički dom), 29 October 1995, from the Electoral Commission's scanned results
// document (35 decisions of 14 November 1995, URBROJ 470–504), read by eye. Mixed system, 127 seats: 80 national-list
// seats (D'Hondt among lists with at least 5%), 28 single-member constituencies (most votes), 12 seats from special lists
// for voters abroad, 4 single-seat national-minority constituencies and one three-seat constituency (each voter several
// votes; percentages printed on all candidate votes). Every printed count, percentage and seat is checked.
export const SMD_VOTE = 'hr_single_member_candidate_vote';
const r2 = (num, den, conv = 'rounded_two_decimals') => ((conv === 'truncated_two_decimals' ? Math.floor((num * 10000) / den) : Math.round((num * 10000) / den)) / 100).toFixed(2);
const pnorm = (s) => s.replace(',', '.');

export function reconcile1995(E) {
  const check = (ok, what) => { if (!ok) fail(`1995: ${what}`); };
  const S = E.seat_structure;
  check(S.national_lists + S.single_member + S.special_lists_abroad + S.minority_single_seat + S.minority_multi_seat === S.total, 'seat structure does not add up');
  const head = (x, label) => {
    const valid = x.voted - x.invalid;
    check(valid > 0 && x.voted <= x.registered, `${label}: counts out of order`);
    // Rounded everywhere in 1995 except the special-list header, which prints truncated values (recorded in the evidence).
    const conv = x.header_percent_convention ?? 'rounded_two_decimals';
    check(r2(x.voted, x.registered, conv) === pnorm(x.voted_printed_percent), `${label}: printed turnout ≠ voted ÷ registered (${conv})`);
    check(r2(x.invalid, x.voted, conv) === pnorm(x.invalid_printed_percent), `${label}: printed invalid share ≠ invalid ÷ voted (${conv})`);
    return valid;
  };
  const listTier = (x, label, seats) => {
    const valid = head(x, label), L = x.lists;
    check(L.every((l, i) => l.row === i + 1), `${label}: rows not consecutive`);
    check(sum(L) === valid, `${label}: list votes ≠ voters − invalid ballots`);
    check(L.every((l) => r2(l.votes, valid) === pnorm(l.printed_percent)), `${label}: printed percentage ≠ votes ÷ valid ballots`);
    const taking = L.filter((l) => l.votes * 100 >= 5 * valid);
    if (x.lists_in_allocation_printed !== undefined) check(taking.length === x.lists_in_allocation_printed, `${label}: lists at or above 5% (${taking.length}) ≠ lists named (${x.lists_in_allocation_printed})`);
    const won = dhondt(taking.map((l) => l.votes), seats);
    check(won.join() === taking.map((l) => l.seats).join(), `${label}: D'Hondt ${won} ≠ printed seats`);
    check(L.filter((l) => !taking.includes(l)).every((l) => l.seats === 0) && sum(L, 'seats') === seats, `${label}: seats ≠ ${seats}`);
    return { lists: L.length, valid, seats, threshold_votes: Math.ceil(0.05 * valid), lists_in_allocation: taking.length };
  };
  const nat = listTier(E.national_list, 'national lists', S.national_lists);
  const abroad = listTier(E.special_list, 'special lists', S.special_lists_abroad);
  check(E.single_member.length === S.single_member && E.single_member.every((u, i) => u.number === i + 1), `single-member constituencies ≠ ${S.single_member}`);
  const byNominator = {};
  for (const u of E.single_member) {
    const valid = head(u, `constituency ${u.unit}`), C = u.candidates;
    check(C.every((c, i) => c.row === i + 1) && sum(C) === valid, `constituency ${u.unit}: candidate votes ≠ valid ballots`);
    check(C.every((c) => r2(c.votes, valid) === pnorm(c.printed_percent)), `constituency ${u.unit}: printed percentage ≠ votes ÷ valid ballots`);
    const top = Math.max(...C.map((c) => c.votes)), el = C.filter((c) => c.elected);
    check(C.filter((c) => c.votes === top).length === 1 && el.length === 1 && el[0].votes === top, `constituency ${u.unit}: the elected candidate does not have most votes`);
    byNominator[el[0].nominated_by] = (byNominator[el[0].nominated_by] ?? 0) + 1;
  }
  let minority = 0;
  for (const u of E.special_constituencies) {
    const valid = head(u, `special constituency ${u.unit}`), C = u.candidates, all = sum(C);
    if (u.seats === 1) check(all === valid && u.percent_base === 'valid_ballots', `special constituency ${u.unit}: candidate votes ≠ valid ballots`);
    else check(all > valid && all <= u.seats * valid && u.percent_base === 'all_candidate_votes', `special constituency ${u.unit}: several-vote total out of range`);
    check(C.every((c) => r2(c.votes, u.seats === 1 ? valid : all) === pnorm(c.printed_percent)), `special constituency ${u.unit}: printed percentage ≠ votes ÷ ${u.percent_base}`);
    const top = [...C].sort((a, b) => b.votes - a.votes);
    check(top[u.seats - 1].votes > (top[u.seats]?.votes ?? -1), `special constituency ${u.unit}: tie for the last seat`);
    check(C.filter((c) => c.elected).length === u.seats && top.slice(0, u.seats).every((c) => c.elected), `special constituency ${u.unit}: elected ≠ candidates with most votes`);
    minority += u.seats;
  }
  const single = E.special_constituencies.filter((u) => u.seats === 1);
  check(single.length === S.minority_single_seat && minority - single.length === S.minority_multi_seat, 'minority seats ≠ seat structure');
  const total = nat.seats + abroad.seats + E.single_member.length + minority;
  check(total === S.total, `seats ${total} ≠ ${S.total}`);
  return { national_lists: nat, special_lists_abroad: abroad, single_member: E.single_member.length, single_member_seats_by_nominator: byNominator, national_minorities: minority, total };
}

function build1995(evidence, evidenceSha, parserSha) {
  const E = evidence.elections['1995'], D = E.document, out = Object.fromEntries(CROATIAN_STORES.map((s) => [s, []]));
  const check = reconcile1995(E), S = E.seat_structure;
  const electionId = `el-hr-sabor-${E.polling_day}`, SRC = 'src-hr-izbori-final-1995', vintage = `final: Electoral Commission of the Republic of Croatia decisions of ${E.decision_date} (KLASA ${E.klasa}, 35 decisions, URBROJ 56605-95-470 to -504) in the scanned results document, transcribed by eye`;
  const prov = (record, fields, how = 'published') => ({ source_id: SRC, source_url: D.url, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'croatia-sabor-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, publisher_file_sha256: D.publisher_file_sha256 });
  const NAT = 'hr-national-list', ABR = 'hr-special-list-abroad', smdGeo = (u) => `hr-smd-${String(u.number).padStart(2, '0')}`, spGeo = (u) => `hr-special-${u.unit}`;
  const nameSp = (u) => `${u.unit}. posebna izborna jedinica${u.seat_printed ? ` (${u.seat_printed[0]}${u.seat_printed.slice(1).toLowerCase()})` : ''}`;
  out.elections.push({ election_id: electionId, country: 'croatia', election_type: 'national_parliament', chamber: CHAMBER, chamber_printed: E.chamber_printed, chamber_scope: 'Zastupnički dom (Chamber of Representatives) only; the Županijski dom (Chamber of Counties) was elected separately and is not part of this election', date: E.polling_day, date_end: null, date_basis: 'polling day stated in each decision (“na dan 29. listopada 1995.”)', result_coverage: 'all_tiers_lists_and_single_member_candidates_minority_candidates_without_names', year: 1995, legislature_id: 'lg-hr-sabor-1995', electoral_system_id: 'es-hr-sabor-1995', result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null,
    constituency_structure: [
      { unit: 'national_list', constituencies: [NAT], seats: S.national_lists, vote_type: LIST_VOTE },
      { unit: 'single_member', constituencies: E.single_member.map(smdGeo), seats_each: 1, seats: S.single_member, vote_type: SMD_VOTE },
      { unit: 'special_list_abroad', constituencies: [ABR], seats: S.special_lists_abroad, vote_type: LIST_VOTE },
      { unit: 'national_minority', constituencies: E.special_constituencies.map(spGeo), seats: S.minority_single_seat + S.minority_multi_seat, vote_type: MINORITY_VOTE },
    ],
    provenance: [prov('decision headings (polling day, decision date)', ['date', 'result_vintage'])] });
  const turnout = (x, geo, vt, label, record) => {
    const def = `Voters who voted (glasovalo je) / voters on the roll (birača upisanih u popise birača) × 100, as printed in the decision for ${label}.`;
    out.election_turnout.push({ election_id: electionId, country: 'croatia', geography: geo, vote_type: vt, result_vintage: vintage, eligible_voters: x.registered, voters_turned_out: null, voters: x.voted, valid_votes: x.voted - x.invalid, invalid_votes: x.invalid, ballots_cast: x.voted, published_turnout: Number(pnorm(x.voted_printed_percent)), derived_turnout: (x.voted / x.registered) * 100, valid_votes_basis: 'voters who voted minus invalid ballots (the decisions print no separate count of valid ballots)', turnout_definition: def, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: def, sourceIds: [SRC] }, provenance: [prov(`${record}, section I`, ['eligible_voters', 'voters', 'invalid_votes', 'published_turnout'])] });
  };
  turnout(E.national_list, NAT, LIST_VOTE, 'the national lists (all voters in Croatia)', `decision URBROJ ${E.national_list.urbroj}`);
  turnout(E.special_list, ABR, LIST_VOTE, 'the special lists (voters without residence in Croatia)', `decision URBROJ ${E.special_list.urbroj}`);
  for (const u of E.single_member) turnout(u, smdGeo(u), SMD_VOTE, `single-member constituency ${u.unit}`, `decision URBROJ ${u.urbroj}`);
  for (const u of E.special_constituencies) turnout(u, spGeo(u), MINORITY_VOTE, nameSp(u), `decision URBROJ ${u.urbroj}`);
  const listRows = (x, geo, tag, seats, record, art) => {
    const valid = x.voted - x.invalid;
    for (const l of x.lists) {
      const id = `ct-hr-sabor95-${tag}-${String(l.row).padStart(2, '0')}`, coalition = l.parties_named_count > 1;
      out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: geo, contestant_kind: 'electoral_list', native_list_type: tag === 'dl' ? 'državna lista' : 'posebna lista', list_composition: coalition ? 'coalition_list_two_or_more_parties_named' : 'single_name_list_kind_not_printed', kind_basis: 'the decision prints each list with the names of the parties that submitted it', parties_named: l.parties_named, parties_named_count: l.parties_named_count, list_number: l.row, list_number_basis: 'row in the decision (lists in the order printed)', registered_label_native: null, historical_display_label: l.name, display_label_rule: 'list name as printed', label_basis: 'verbatim', title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`${record}, list row ${l.row}`, ['list_number', 'historical_display_label'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: geo, election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: valid, total_seats: seats, votes: l.votes, published_vote_share: Number(pnorm(l.printed_percent)), derived_vote_share: (l.votes / valid) * 100, seats: l.seats, seat_basis: `${tag === 'dl' ? 'national lists' : 'special lists for voters abroad'}: D'Hondt over ${seats} seats among lists with at least 5% of valid ballots (${art}); reproduces the printed seats`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`${record}, list row ${l.row}`, ['votes', 'published_vote_share', 'seats'])] });
    }
  };
  listRows(E.national_list, NAT, 'dl', S.national_lists, `decision URBROJ ${E.national_list.urbroj}`, E.national_list.allocation_article);
  listRows(E.special_list, ABR, 'pl', S.special_lists_abroad, `decision URBROJ ${E.special_list.urbroj}`, E.special_list.allocation_article);
  for (const u of E.single_member) {
    const valid = u.voted - u.invalid;
    for (const c of u.candidates) {
      const id = `ct-hr-sabor95-smd${String(u.number).padStart(2, '0')}-${String(c.row).padStart(2, '0')}`, independent = c.nominated_by === 'Nezavisni kandidat';
      out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: smdGeo(u), contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: 'single-member constituency: individual candidates, each printed with the parties that nominated them or as an independent candidate', list_number: c.row, list_number_basis: 'row in the decision (candidates in alphabetical order)', registered_label_native: null, historical_display_label: `${independent ? 'Nezavisni kandidat' : c.nominated_by}, red. br. ${c.row}`, nominated_by: independent ? null : c.nominated_by.split(','), independent, display_label_rule: 'candidate names are not stored: the nominating parties as printed (abbreviations) or "Nezavisni kandidat", with the row number', label_basis: 'nominator_and_row', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(`decision URBROJ ${u.urbroj}, candidate row ${c.row}`, ['list_number', 'nominated_by'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: smdGeo(u), election_id: electionId, contestant_ref: id, vote_type: SMD_VOTE, valid_votes: valid, total_seats: 1, votes: c.votes, published_vote_share: Number(pnorm(c.printed_percent)), derived_vote_share: (c.votes / valid) * 100, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: `single-member constituency ${u.unit}: the candidate with most votes is elected (Art. 23)`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision URBROJ ${u.urbroj}, candidate row ${c.row} and the elected candidate`, ['votes', 'published_vote_share', 'seats'])] });
    }
  }
  for (const u of E.special_constituencies) {
    const valid = u.voted - u.invalid;
    for (const c of u.candidates) {
      const id = `ct-hr-sabor95-pj${u.unit}-${String(c.row).padStart(2, '0')}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: spGeo(u), contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: 'national-minority special constituency: individual candidates', list_number: c.row, list_number_basis: 'row in the decision', registered_label_native: null, historical_display_label: `Kandidat, red. br. ${c.row}`, display_label_rule: 'candidate names and nominators are not stored; the row number in the decision identifies the candidate', label_basis: 'row_only', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(`decision URBROJ ${u.urbroj}, candidate row ${c.row}`, ['list_number'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: spGeo(u), election_id: electionId, contestant_ref: id, vote_type: MINORITY_VOTE, valid_votes: valid, total_seats: u.seats, votes: c.votes, published_vote_share: u.seats === 1 ? Number(pnorm(c.printed_percent)) : null, ...(u.seats > 1 ? { printed_share_of_all_candidate_votes: Number(pnorm(c.printed_percent)) } : {}), derived_vote_share: u.seats === 1 ? (c.votes / valid) * 100 : null, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: u.seats === 1 ? `${nameSp(u)}: one member, the candidate with most votes (Art. 23)` : `${nameSp(u)}: three members, the three candidates with most votes (Art. 58a); voters could vote for more than one candidate, so the candidates' votes exceed the valid ballots and the printed percentages are shares of all candidate votes`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision URBROJ ${u.urbroj}, candidate row ${c.row} and the elected candidates`, ['votes', 'seats'])] });
    }
  }
  const bySeats = (x) => x.lists.filter((l) => l.seats > 0).map((l) => ({ label: l.name, title_sha256: l.title_sha256, seats: l.seats }));
  out.legislatures.push({ legislature_id: 'lg-hr-sabor-1995', country: 'croatia', chamber: CHAMBER, chamber_printed: E.chamber_printed, official_term: null, election_id: electionId, total_seats: S.total, seat_count_basis: 'election_result_vintage_not_current_composition', seats_by_mechanism: { national_lists: S.national_lists, single_member_constituencies: S.single_member, special_lists_abroad: S.special_lists_abroad, national_minorities: S.minority_single_seat + S.minority_multi_seat }, seats_by_national_list: bySeats(E.national_list), seats_by_special_list: bySeats(E.special_list), single_member_seats_by_nominator: Object.entries(check.single_member_seats_by_nominator).sort((a, b) => b[1] - a[1]).map(([nominated_by, seats]) => ({ nominated_by, seats })), seats_by_national_minority_constituency: E.special_constituencies.map((u) => ({ constituency: spGeo(u), seat_printed: u.seat_printed, seats: u.seats })), seat_grouping_note: 'Seats are listed per tier as printed; nominators of single-member winners are grouped by the identical printed nominator string. No seat is attributed to a party across tiers.', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('sum of the 35 decisions', ['total_seats', 'seats_by_mechanism'], 'derived_count_of_published_rows')] });
  out.electoral_systems.push({ electoral_system_id: 'es-hr-sabor-1995', country: 'croatia', election_id: electionId, institutional_rule_id: 'hr-es-sabor', valid_from: E.polling_day, valid_to: E.polling_day, interval_basis: `election-specific: the rules applied in the 1995 decisions (${E.act_cited}); the 5% threshold and D'Hondt reproduce the printed list seats; the institutional registry record hr-es-sabor holds the current statutory text`, system_family: 'mixed: national lists (proportional) and single-member constituencies (plurality), special lists for voters abroad, national-minority constituencies', vote_type: LIST_VOTE, allocation_method: "National lists: D'Hondt over 80 seats among lists with at least 5% of valid ballots (Art. 24). Single-member constituencies: most votes (Art. 23). Special lists abroad: D'Hondt over 12 seats among lists with at least 5% (Art. 24a). Minority constituencies: most votes (one seat each; three seats in constituency 5, Art. 58a).", base_seats: S.total,
    vote_definitions: [
      { id: LIST_VOTE, kind: 'list', label: t('List votes (national lists and special lists abroad)', '名单票（全国名单与境外特别名单）'), denominator: 'valid_votes', seatScope: 'national_list_or_special_list', sourceIds: [SRC] },
      { id: SMD_VOTE, kind: 'candidate', label: t('Single-member constituency candidate votes', '单一选区候选人票'), denominator: 'valid_votes', seatScope: 'single_member_constituency', sourceIds: [SRC] },
      { id: MINORITY_VOTE, kind: 'candidate', label: t('National-minority candidate votes', '少数民族候选人票'), denominator: 'valid_votes', seatScope: 'minority_constituency', sourceIds: [SRC] },
    ],
    national_rules: {
      nationalAllocation: "80 seats by D'Hondt among national lists with at least 5% of valid ballots; the five lists named in the decision are exactly those above 5%. Thresholds for coalition lists are not printed in the decisions and are not tested.",
      districtAllocation: '28 single-member constituencies: the candidate with most votes is elected.',
      thresholds: [{ appliesTo: 'national list and special list', percent: 5, description: t('A list needs at least 5% of valid ballots to take part in the seat allocation; this reproduces the printed seats (coalition thresholds are not printed and not tested).', '名单须获得有效票至少 5% 才能参与席位分配；按此可复现所列席位（联盟门槛未印出，未检验）。'), sourceIds: [SRC] }],
      minorityRepresentation: t('Seven members for national minorities were elected in five special constituencies: one each in constituencies 1–4 (the decisions name them by seat: Buje, Osijek, Daruvar, Osijek, and print no minority name) and three in constituency 5, where voters could vote for more than one candidate. Candidate names are not stored.', '少数民族的 7 名议员在五个特别选区选出：第 1–4 特别选区各 1 名（决定按所在地命名：布耶、奥西耶克、达鲁瓦尔、奥西耶克，未印少数民族名称），第 5 特别选区 3 名，选民可选多名候选人。不存储候选人姓名。'),
      diasporaRepresentation: t('Twelve members were elected from special lists by voters without residence in Croatia; only one list passed 5% and won all twelve seats.', '在克罗地亚无居所的选民按特别名单选出 12 名议员；只有一份名单超过 5%，获得全部 12 席。'),
      totalSeatsDefinition: t('127 seats in the Chamber of Representatives: 80 national-list seats, 28 single-member seats, 12 seats from special lists abroad and 7 national-minority seats.', '代表院 127 席：全国名单 80 席、单一选区 28 席、境外特别名单 12 席、少数民族 7 席。'),
      sourceIds: [SRC],
    },
    notes: t("Read by eye from the commission's scanned 1995 results document (35 decisions). Every count, printed percentage and seat reproduces: list votes and candidate votes equal the valid ballots (voters minus invalid ballots), printed turnout and invalid shares recompute, D'Hondt with the 5% threshold reproduces the list seats, and each elected candidate has most votes. Candidates in single-member constituencies are shown by their nominating parties as printed (or as independent) and row number; no candidate name is stored. This election covers the Chamber of Representatives only.", '依委员会 1995 年扫描结果文件（35 份决定）人工读取。所有计数、所列百分比和席位均可复现：名单票与候选人票等于有效票（投票人数减无效票），所列投票率与无效票比例可重算，按 5% 门槛的 D’Hondt 复现名单席位，每名当选者得票最多。单一选区候选人按所印提名政党（或独立候选人）及行号显示，不存储候选人姓名。本次选举仅涵盖代表院。'),
    seat_check: check, provenance: [prov('decisions (allocation sections)', ['allocation_method', 'thresholds', 'base_seats'])] });
  out.political_source_registry.push({ source_id: SRC, country: 'croatia', institution: `${E.issuer}; archive of the State Electoral Commission (Državno izborno povjerenstvo)`, dataset: `${D.title} — ${D.pages} scanned pages, 35 decisions of ${E.decision_date} (KLASA ${E.klasa})`, tier: 'tier1_official', url: D.url, archive_page: D.archive_page, licence_status: 'official_text_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_party_names_only_documents_and_candidate_names_not_redistributed', licence_url: evidence.rights.publisher_reuse_page, rights_basis: evidence.rights.basis, attribution: 'Izborna komisija Republike Hrvatske; Državno izborno povjerenstvo Republike Hrvatske', retrieved_at: E.retrieved_at, acquisition: E.acquisition, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_file_sha256: D.publisher_file_sha256, transcription: D.kind });
  return { out, check };
}

// ── 1992 (added 2026-11-19; owner answer "1992, 1993 and 1995 only") ──────────────────────────────────────────────
// Chamber of Representatives (Zastupnički dom), 2 August 1992, from the Electoral Commission's scanned decisions: the
// national-list decision (URBROJ 527, 10 August 1992) and 64 constituency decisions (URBROJ 463–526, 11 August 1992),
// read by OCR with every unit reconciled and failing or unusual units read by eye. Mixed system, 138 seats: 60 national-
// list seats (D'Hondt; a 3% threshold reproduces them), 60 single-member constituencies (most votes), 4 national-minority
// special constituencies, and 14 members declared elected from national lists under Arts. 10 and 26(1): 13 for the
// Serbian community and one more for minorities under 8% of the population. Every 1992 percentage is printed on the
// voters who voted (invalid ballots included), not on valid ballots.
export function reconcile1992(E) {
  const check = (ok, what) => { if (!ok) fail(`1992: ${what}`); };
  const S = E.seat_structure;
  check(E.percent_base === 'voters_who_voted' && E.percent_convention === 'rounded_two_decimals', 'unexpected percentage base or convention');
  check(S.national_lists + S.single_member + S.minority_special_constituencies + S.serb_seats_from_national_lists + S.minority_seats_from_national_lists === S.total, 'seat structure does not add up');
  const head = (x, label) => {
    check(x.invalid >= 0 && x.voted > x.invalid && x.voted <= x.registered, `${label}: counts out of order`);
    check(r2(x.voted, x.registered) === pnorm(x.voted_printed_percent), `${label}: printed turnout ≠ voted ÷ registered`);
    check(r2(x.invalid, x.voted) === pnorm(x.invalid_printed_percent), `${label}: printed invalid share ≠ invalid ÷ voted`);
  };
  const rowsCheck = (R, x, label) => {
    check(R.every((r, i) => r.row === i + 1), `${label}: rows not consecutive`);
    check(sum(R) + x.invalid === x.voted, `${label}: votes + invalid ballots ≠ voters`);
    check(R.every((r) => r2(r.votes, x.voted) === pnorm(r.printed_percent)), `${label}: printed percentage ≠ votes ÷ voters`);
  };
  const N = E.national_list, L = N.lists;
  head(N, 'national lists'); rowsCheck(L, N, 'national lists');
  const valid = N.voted - N.invalid;
  const onVoters = L.filter((l) => l.votes * 100 >= N.threshold_percent * N.voted), onValid = L.filter((l) => l.votes * 100 >= N.threshold_percent * valid);
  check(onVoters.length === onValid.length && onVoters.every((l) => onValid.includes(l)), 'the threshold selects different lists on voters and on valid ballots');
  const won = dhondt(onVoters.map((l) => l.votes), S.national_lists);
  check(won.join() === onVoters.map((l) => l.seats).join(), `national lists: D'Hondt ${won} ≠ printed seats`);
  check(L.filter((l) => !onVoters.includes(l)).every((l) => l.seats === 0) && sum(L, 'seats') === S.national_lists, `national lists: seats ≠ ${S.national_lists}`);
  const M = E.national_minority_seats_from_lists, rowOk = (b) => b.every((x) => L.some((l) => l.row === x.row) && x.seats > 0);
  check(rowOk(M.serbian.seats_by_list) && sum(M.serbian.seats_by_list, 'seats') === M.serbian.seats && M.serbian.seats === S.serb_seats_from_national_lists, 'Serbian seats from national lists ≠ seat structure');
  check(r2(M.serbian.census_1981_serbs, M.serbian.census_1981_population).startsWith(M.serbian.census_share_printed), 'printed 1981 census share ≠ Serbs ÷ population');
  const U8 = M.minorities_under_8_percent;
  check(rowOk(U8.seats_by_list) && sum(U8.seats_by_list, 'seats') === U8.seats && U8.seats === S.minority_seats_from_national_lists, 'minority seat from national lists ≠ seat structure');
  check(U8.elected_in_special_constituencies === E.special_constituencies.length && U8.elected_in_special_constituencies + U8.seats === U8.minimum_seats, 'minority seats ≠ the printed minimum of five');
  check(E.single_member.length === S.single_member && E.single_member.every((u, i) => u.number === i + 1 && u.urbroj === `56605-92-${463 + i}`), `single-member constituencies ≠ ${S.single_member} decisions in URBROJ order`);
  const byNominator = {};
  const plurality = (u, label) => {
    head(u, label); rowsCheck(u.candidates, u, label);
    const C = u.candidates, top = Math.max(...C.map((c) => c.votes)), el = C.filter((c) => c.elected);
    check(C.filter((c) => c.votes === top).length === 1 && el.length === 1 && el[0].votes === top, `${label}: the elected candidate does not have most votes`);
    return el[0];
  };
  for (const u of E.single_member) { const w = plurality(u, `constituency ${u.unit}`); byNominator[w.nominated_by] = (byNominator[w.nominated_by] ?? 0) + 1; }
  check(E.special_constituencies.length === S.minority_special_constituencies && E.special_constituencies.every((u, i) => u.unit === i + 1 && u.seats === 1 && u.urbroj === `56605-92-${523 + i}`), 'special constituencies ≠ seat structure');
  for (const u of E.special_constituencies) plurality(u, `special constituency ${u.unit}`);
  const total = S.national_lists + E.single_member.length + E.special_constituencies.length + M.serbian.seats + U8.seats;
  check(total === S.total, `seats ${total} ≠ ${S.total}`);
  return { national_lists: { lists: L.length, voters: N.voted, seats: S.national_lists, threshold_percent: N.threshold_percent, threshold_votes_on_voters: Math.ceil((N.threshold_percent / 100) * N.voted), lists_in_allocation: onVoters.length }, single_member: E.single_member.length, single_member_seats_by_nominator: byNominator, national_minorities_special_constituencies: E.special_constituencies.length, seats_from_national_lists_arts_10_26: M.serbian.seats + U8.seats, total };
}

function build1992(evidence, evidenceSha, parserSha) {
  const E = evidence.elections['1992'], D = E.documents, out = Object.fromEntries(CROATIAN_STORES.map((s) => [s, []]));
  const check = reconcile1992(E), S = E.seat_structure, N = E.national_list, M = E.national_minority_seats_from_lists;
  const electionId = `el-hr-sabor-${E.polling_day}`, SRC_L = 'src-hr-izbori-final-1992-lists', SRC_U = 'src-hr-izbori-final-1992-constituencies';
  const vintage = `final: Electoral Commission of the Republic of Croatia decisions (KLASA ${E.klasa}): national lists of ${E.decision_dates.national_lists} (URBROJ 56605-92-527) and 64 constituency decisions of ${E.decision_dates.constituencies} (URBROJ 56605-92-463 to -526), scanned; read by OCR with every unit reconciled and checked by eye where needed`;
  const prov = (src, record, fields, how = 'published') => { const d = src === SRC_L ? D.national_lists : D.constituencies; return { source_id: src, source_url: d.url, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'croatia-sabor-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, publisher_file_sha256: d.publisher_file_sha256 }; };
  const NAT = 'hr-national-list', smdGeo = (u) => `hr-smd-${String(u.number).padStart(2, '0')}`, spGeo = (u) => `hr-special-${u.unit}`;
  const nameSp = (u) => `${u.unit}. posebna izborna jedinica (${u.seat_printed[0]}${u.seat_printed.slice(1).toLowerCase()})`;
  const shareBase = 'voters who voted (invalid ballots included), as printed in the 1992 decisions';
  out.elections.push({ election_id: electionId, country: 'croatia', election_type: 'national_parliament', chamber: CHAMBER, chamber_printed: E.chamber_printed, chamber_scope: 'Zastupnički dom (Chamber of Representatives) only; the Županijski dom (Chamber of Counties) was elected separately in 1993 and is not part of this election', date: E.polling_day, date_end: null, date_basis: 'polling day stated in each decision (“na dan 2. kolovoza 1992.”)', result_coverage: 'all_tiers_lists_and_single_member_candidates_minority_candidates_without_names', year: 1992, legislature_id: 'lg-hr-sabor-1992', electoral_system_id: 'es-hr-sabor-1992', result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null,
    constituency_structure: [
      { unit: 'national_list', constituencies: [NAT], seats: S.national_lists, vote_type: LIST_VOTE },
      { unit: 'single_member', constituencies: E.single_member.map(smdGeo), seats_each: 1, seats: S.single_member, vote_type: SMD_VOTE },
      { unit: 'national_minority', constituencies: E.special_constituencies.map(spGeo), seats: S.minority_special_constituencies, vote_type: MINORITY_VOTE },
      { unit: 'members_declared_elected_from_national_lists', constituencies: [NAT], seats: S.serb_seats_from_national_lists + S.minority_seats_from_national_lists, vote_type: null, basis: 'Arts. 10 and 26(1): 13 seats for the Serbian community and one for minorities under 8%, filled from candidates on national lists' },
    ],
    provenance: [prov(SRC_L, 'decision URBROJ 56605-92-527 heading (polling day, decision date)', ['date', 'result_vintage']), prov(SRC_U, 'constituency decision headings', ['date'])] });
  const turnout = (x, geo, vt, label, src, record) => {
    const def = `Voters who voted (glasovalo je) / voters on the roll (birača upisanih u popise birača) × 100, as printed in the decision for ${label}.`;
    out.election_turnout.push({ election_id: electionId, country: 'croatia', geography: geo, vote_type: vt, result_vintage: vintage, eligible_voters: x.registered, voters_turned_out: null, voters: x.voted, valid_votes: x.voted - x.invalid, invalid_votes: x.invalid, ballots_cast: x.voted, published_turnout: Number(pnorm(x.voted_printed_percent)), derived_turnout: (x.voted / x.registered) * 100, valid_votes_basis: 'voters who voted minus invalid ballots (the decisions print no separate count of valid ballots)', turnout_definition: def, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: def, sourceIds: [src] }, provenance: [prov(src, `${record}, section I`, ['eligible_voters', 'voters', 'invalid_votes', 'published_turnout'])] });
  };
  turnout(N, NAT, LIST_VOTE, 'the national lists (all voters)', SRC_L, `decision URBROJ ${N.urbroj}`);
  for (const u of E.single_member) turnout(u, smdGeo(u), SMD_VOTE, `single-member constituency ${u.unit}`, SRC_U, `decision URBROJ ${u.urbroj}`);
  for (const u of E.special_constituencies) turnout(u, spGeo(u), MINORITY_VOTE, nameSp(u), SRC_U, `decision URBROJ ${u.urbroj}`);
  const extra = (row) => ({ serbian: M.serbian.seats_by_list.find((x) => x.row === row)?.seats ?? 0, under8: M.minorities_under_8_percent.seats_by_list.find((x) => x.row === row)?.seats ?? 0 });
  for (const l of N.lists) {
    const id = `ct-hr-sabor92-dl-${String(l.row).padStart(2, '0')}`, x = extra(l.row);
    out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: NAT, contestant_kind: 'electoral_list', native_list_type: 'državna lista', list_composition: l.parties_named_count > 1 ? 'coalition_list_two_or_more_parties_named' : 'single_name_list_kind_not_printed', kind_basis: 'the decision prints each list with the names of the parties that submitted it', parties_named: l.parties_named, parties_named_count: l.parties_named_count, list_number: l.row, list_number_basis: 'row in the decision (lists in the order printed)', registered_label_native: null, historical_display_label: l.name, display_label_rule: 'list name as printed', label_basis: 'verbatim', title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(SRC_L, `decision URBROJ ${N.urbroj}, section I list row ${l.row}`, ['list_number', 'historical_display_label'])] });
    out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: NAT, election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: N.voted - N.invalid, total_seats: S.national_lists, votes: l.votes, published_vote_share: Number(pnorm(l.printed_percent)), derived_vote_share: (l.votes / N.voted) * 100, share_base: shareBase, seats: l.seats, seat_basis: `national lists: D'Hondt over ${S.national_lists} seats among lists with at least ${N.threshold_percent}% (${N.allocation_article}); reproduces the printed seats`,
      ...(x.serbian || x.under8 ? { members_declared_elected_from_list: x.serbian + x.under8, members_declared_elected_basis: [x.serbian ? `${x.serbian} for the Serbian community (${M.serbian.article})` : null, x.under8 ? `${x.under8} for minorities under 8% of the population (${M.minorities_under_8_percent.article})` : null].filter(Boolean).join('; ') } : {}),
      published_seat_share: null, result_vintage: vintage, provenance: [prov(SRC_L, `decision URBROJ ${N.urbroj}, sections I–III list row ${l.row}`, ['votes', 'published_vote_share', 'seats', ...(x.serbian || x.under8 ? ['members_declared_elected_from_list'] : [])])] });
  }
  for (const u of E.single_member) {
    for (const c of u.candidates) {
      const id = `ct-hr-sabor92-smd${String(u.number).padStart(2, '0')}-${String(c.row).padStart(2, '0')}`, independent = c.nominated_by === 'NK';
      out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: smdGeo(u), contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: 'single-member constituency: individual candidates, each printed with the abbreviation of the nominating parties or NK (nezavisni kandidat, independent)', list_number: c.row, list_number_basis: 'row in the decision (candidates in alphabetical order)', registered_label_native: null, historical_display_label: `${independent ? 'NK (nezavisni kandidat)' : c.nominated_by}, red. br. ${c.row}`, nominated_by: independent ? null : c.nominated_by.split(' - '), independent, display_label_rule: 'candidate names are not stored: the nominator abbreviations as printed (or NK, independent), with the row number', label_basis: 'nominator_and_row', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(SRC_U, `decision URBROJ ${u.urbroj}, candidate row ${c.row}`, ['list_number', 'nominated_by'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: smdGeo(u), election_id: electionId, contestant_ref: id, vote_type: SMD_VOTE, valid_votes: u.voted - u.invalid, total_seats: 1, votes: c.votes, published_vote_share: Number(pnorm(c.printed_percent)), derived_vote_share: (c.votes / u.voted) * 100, share_base: shareBase, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: `single-member constituency ${u.unit}: the candidate with most votes is elected`, published_seat_share: null, result_vintage: vintage, provenance: [prov(SRC_U, `decision URBROJ ${u.urbroj}, candidate row ${c.row} and the elected candidate`, ['votes', 'published_vote_share', 'seats'])] });
    }
  }
  for (const u of E.special_constituencies) {
    for (const c of u.candidates) {
      const id = `ct-hr-sabor92-pj${u.unit}-${String(c.row).padStart(2, '0')}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: spGeo(u), contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: 'national-minority special constituency: individual candidates', list_number: c.row, list_number_basis: 'row in the decision', registered_label_native: null, historical_display_label: `Kandidat, red. br. ${c.row}`, display_label_rule: 'candidate names and nominators are not stored; the row number in the decision identifies the candidate', label_basis: 'row_only', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(SRC_U, `decision URBROJ ${u.urbroj}, candidate row ${c.row}`, ['list_number'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: spGeo(u), election_id: electionId, contestant_ref: id, vote_type: MINORITY_VOTE, valid_votes: u.voted - u.invalid, total_seats: 1, votes: c.votes, published_vote_share: Number(pnorm(c.printed_percent)), derived_vote_share: (c.votes / u.voted) * 100, share_base: shareBase, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: `${nameSp(u)}: one member, the candidate with most votes`, published_seat_share: null, result_vintage: vintage, provenance: [prov(SRC_U, `decision URBROJ ${u.urbroj}, candidate row ${c.row} and the elected candidate`, ['votes', 'published_vote_share', 'seats'])] });
    }
  }
  const byRow = (b) => b.map((x) => { const l = N.lists.find((y) => y.row === x.row); return { label: l.name, title_sha256: l.title_sha256, seats: x.seats }; });
  out.legislatures.push({ legislature_id: 'lg-hr-sabor-1992', country: 'croatia', chamber: CHAMBER, chamber_printed: E.chamber_printed, official_term: null, election_id: electionId, total_seats: S.total, seat_count_basis: 'election_result_vintage_not_current_composition', seats_by_mechanism: { national_lists: S.national_lists, single_member_constituencies: S.single_member, national_minorities_special_constituencies: S.minority_special_constituencies, serbian_community_from_national_lists: S.serb_seats_from_national_lists, minorities_under_8_percent_from_national_lists: S.minority_seats_from_national_lists }, seats_by_national_list: N.lists.filter((l) => l.seats > 0).map((l) => ({ label: l.name, title_sha256: l.title_sha256, seats: l.seats })), members_declared_elected_from_national_lists: { serbian_community: byRow(M.serbian.seats_by_list), minorities_under_8_percent: byRow(M.minorities_under_8_percent.seats_by_list) }, single_member_seats_by_nominator: Object.entries(check.single_member_seats_by_nominator).sort((a, b) => b[1] - a[1]).map(([nominated_by, seats]) => ({ nominated_by, seats })), seats_by_national_minority_constituency: E.special_constituencies.map((u) => ({ constituency: spGeo(u), seat_printed: u.seat_printed, seats: 1 })), seat_grouping_note: 'Seats are listed per tier as printed; nominators of single-member winners are grouped by the identical printed nominator string. Members declared elected from national lists (Arts. 10 and 26(1)) are counted per list and kept apart from the 60 D’Hondt seats. No seat is attributed to a party across tiers.', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov(SRC_L, 'decision URBROJ 56605-92-527 sections I–III', ['total_seats', 'seats_by_mechanism'], 'derived_count_of_published_rows'), prov(SRC_U, 'sum of the 64 constituency decisions', ['single_member_seats_by_nominator'], 'derived_count_of_published_rows')] });
  out.electoral_systems.push({ electoral_system_id: 'es-hr-sabor-1992', country: 'croatia', election_id: electionId, institutional_rule_id: 'hr-es-sabor', valid_from: E.polling_day, valid_to: E.polling_day, interval_basis: `election-specific: the rules applied in the 1992 decisions (${E.act_cited}); a 3% threshold and D'Hondt reproduce the printed list seats; the institutional registry record hr-es-sabor holds the current statutory text`, system_family: 'mixed: national lists (proportional) and single-member constituencies (plurality), national-minority special constituencies, and members for national communities declared elected from national lists', vote_type: LIST_VOTE, allocation_method: "National lists: D'Hondt over 60 seats; a 3% threshold reproduces the printed seats (the decision prints neither the threshold nor the lists taking part). Single-member constituencies and special constituencies: most votes. 13 members for the Serbian community and one more for minorities under 8% are declared elected from candidates on national lists (Arts. 10 and 26(1)).", base_seats: S.total,
    vote_definitions: [
      { id: LIST_VOTE, kind: 'list', label: t('National-list votes', '全国名单票'), denominator: 'ballots_cast', seatScope: 'national_list', sourceIds: [SRC_L] },
      { id: SMD_VOTE, kind: 'candidate', label: t('Single-member constituency candidate votes', '单一选区候选人票'), denominator: 'ballots_cast', seatScope: 'single_member_constituency', sourceIds: [SRC_U] },
      { id: MINORITY_VOTE, kind: 'candidate', label: t('National-minority candidate votes', '少数民族候选人票'), denominator: 'ballots_cast', seatScope: 'minority_constituency', sourceIds: [SRC_U] },
    ],
    national_rules: {
      nationalAllocation: "60 seats by D'Hondt among the national lists; a 3% threshold (of voters or of valid ballots — both give the same seven lists) reproduces the printed seats. Percentages are printed on the voters who voted, invalid ballots included.",
      districtAllocation: '60 single-member constituencies: the candidate with most votes is elected.',
      thresholds: [{ appliesTo: 'national list', percent: 3, description: t('Not printed in the decision; a 3% threshold reproduces the printed seats (the same seven lists pass on voters or on valid ballots). The statute text was not read in this iteration.', '决定未印门槛；3% 门槛可复现所列席位（按投票人数或有效票计算，通过的均为同样七份名单）。本轮未阅读法律原文。'), sourceIds: [SRC_L] }],
      minorityRepresentation: t('Four members for national minorities under 8% of the population were elected in four special constituencies (the decisions name them by seat: Buje, Osijek, Daruvar, Osijek, and print no minority name). As these minorities were entitled to at least five members, one more candidate from a national list was declared elected. For the Serbian community, entitled to representation in proportion to its 1981 census share (printed 11.5%, stated as 13 members), 13 candidates on national lists were declared elected (2 from the HNS list, 8 from the SDP list and 3 from the Srpska narodna stranka list). Candidate names are not stored.', '少数民族中人口占比低于 8% 者在四个特别选区选出 4 名议员（决定按所在地命名：布耶、奥西耶克、达鲁瓦尔、奥西耶克，未印少数民族名称）。由于这些少数民族至少应有 5 名议员，另从全国名单宣布 1 名候选人当选。塞尔维亚族群按 1981 年人口普查占比（印为 11.5%，决定写明为 13 名）享有代表权，从全国名单宣布 13 名候选人当选（HNS 名单 2 名、SDP 名单 8 名、Srpska narodna stranka 名单 3 名）。不存储候选人姓名。'),
      diasporaRepresentation: t('There were no separate lists for voters abroad in 1992.', '1992 年没有境外选民的单独名单。'),
      totalSeatsDefinition: t('138 seats in the Chamber of Representatives: 60 national-list seats, 60 single-member seats, 4 seats in national-minority special constituencies, and 14 members declared elected from national lists (13 for the Serbian community, 1 for minorities under 8%).', '代表院 138 席：全国名单 60 席、单一选区 60 席、少数民族特别选区 4 席，另从全国名单宣布当选 14 名（塞尔维亚族群 13 名、占比低于 8% 的少数民族 1 名）。'),
      sourceIds: [SRC_L, SRC_U],
    },
    notes: t("From the commission's scanned 1992 decisions (the national-list decision and 64 constituency decisions), read by OCR; every unit reconciles, and units whose OCR failed a check were read by eye from the page images. List and candidate votes plus invalid ballots equal the voters; every printed percentage is votes ÷ voters (invalid ballots included), so vote shares here use that base; printed turnout and invalid shares recompute; D'Hondt reproduces the 60 list seats; each elected candidate has most votes. Candidates in single-member constituencies are shown by their nominators as printed (or NK, independent) and row number; no candidate name is stored. This election covers the Chamber of Representatives only.", '依委员会 1992 年扫描决定（全国名单决定与 64 份选区决定）经 OCR 读取；每个单位均可核对，OCR 未通过核对的单位按页面图像人工读取。名单票与候选人票加无效票等于投票人数；所列百分比均为得票 ÷ 投票人数（含无效票），故此处得票率采用同一基数；所列投票率与无效票比例可重算；D’Hondt 复现 60 个名单席位；每名当选者得票最多。单一选区候选人按所印提名者（或 NK，独立候选人）及行号显示，不存储候选人姓名。本次选举仅涵盖代表院。'),
    seat_check: check, provenance: [prov(SRC_L, 'decision URBROJ 56605-92-527 sections I–III', ['allocation_method', 'thresholds', 'base_seats'])] });
  const reg = (id, d, dataset) => out.political_source_registry.push({ source_id: id, country: 'croatia', institution: `${E.issuer}; archive of the State Electoral Commission (Državno izborno povjerenstvo)`, dataset, tier: 'tier1_official', url: d.url, archive_page: E.archive_page, licence_status: 'official_text_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_party_names_only_documents_and_candidate_names_not_redistributed', licence_url: evidence.rights.publisher_reuse_page, rights_basis: evidence.rights.basis, attribution: 'Izborna komisija Republike Hrvatske; Državno izborno povjerenstvo Republike Hrvatske', retrieved_at: E.retrieved_at, acquisition: E.acquisition, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_file_sha256: d.publisher_file_sha256, transcription: E.kind, received_not_used: Object.values(D).filter((x) => !x.used).map((x) => ({ file: x.file, publisher_file_sha256: x.publisher_file_sha256, role: x.role })) });
  reg(SRC_L, D.national_lists, `${D.national_lists.file} — ${D.national_lists.pages} scanned pages: ${D.national_lists.role}`);
  reg(SRC_U, D.constituencies, `${D.constituencies.file} — ${D.constituencies.pages} scanned pages: ${D.constituencies.role}`);
  return { out, check };
}

export function buildCroatia() {
  const buf = read(EVIDENCE);
  const evidence = JSON.parse(buf);
  const evidenceSha = sha(buf);
  const parserSha = sha(read('scripts/political-data/croatia/build-sabor.mjs'));
  const out = Object.fromEntries(CROATIAN_STORES.map((s) => [s, []]));
  const checks = {};
  for (const year of YEARS) {
    const E = evidence.elections[year];
    const units = E.units;
    const st = structureOf(year, E);
    const historical = st.diasporaBasis === 'non_fixed_quota';
    const unitChecks = units.map((u) => reconcileUnit(year, u, E.percent_convention, st));
    const terr = units.filter((u) => u.kind === 'territorial'), abroad = units.filter((u) => u.kind === 'diaspora'), minor = units.filter((u) => u.kind === 'national_minority');
    if (terr.length !== 10 || abroad.length !== 1 || minor.length !== st.minorityElections) fail(`${year}: expected 10 territorial, 1 diaspora and ${st.minorityElections} minority decisions`);
    if (sum(minor, 'seats_by_law') !== st.minority) fail(`${year}: minority seats ${sum(minor, 'seats_by_law')} ≠ ${st.minority}`);
    if (historical && minor.some((u) => u.seats_by_law > 1 && sum(u.candidates) <= u.totals.valid)) fail(`${year}: a multi-seat minority election whose candidate votes do not exceed the valid ballots`);
    const seatTotal = sum(terr.flatMap((u) => u.lists), 'seats') + sum(abroad.flatMap((u) => u.lists), 'seats') + sum(minor, 'seats_by_law');
    if (seatTotal !== st.total) fail(`${year}: seats ${seatTotal} ≠ ${st.total}`);
    let quota = null;
    if (historical) {
      // Non-fixed quota abroad: valid votes I–X ÷ 140 = quotient; valid votes abroad ÷ quotient = seats (round and floor agree).
      const q = abroad[0].non_fixed_quota, validIX = sum(terr.map((u) => u.totals), 'valid'), ratio = abroad[0].totals.valid / q.quotient_printed;
      if (q.valid_votes_i_x_printed !== validIX) fail(`${year}: printed valid votes I–X ${q.valid_votes_i_x_printed} ≠ sum of the ten decisions ${validIX}`);
      if (q.quotient_printed !== Math.round(validIX / 140)) fail(`${year}: printed quotient ≠ valid votes I–X ÷ 140`);
      if (Math.round(ratio) !== Math.floor(ratio) || q.seats_printed !== Math.round(ratio) || q.seats_printed !== st.diaspora) fail(`${year}: seats abroad ≠ valid votes abroad ÷ quotient`);
      quota = { valid_votes_i_x: validIX, quotient: q.quotient_printed, valid_votes_abroad: abroad[0].totals.valid, ratio: Number(ratio.toFixed(3)), seats_abroad: q.seats_printed, article_printed: q.article_printed };
    }
    const tt = E.archive_turnout_table ?? null;
    if (tt && (sum(terr.map((u) => u.totals), 'registered') !== tt.registered || sum(terr.map((u) => u.totals), 'turned_out') !== tt.turned_out)) fail(`${year}: territorial totals differ from the archive turnout table`);
    checks[year] = { units: unitChecks, seats: { territorial: 140, diaspora: st.diaspora, national_minority: st.minority, total: seatTotal }, ...(quota ? { non_fixed_quota_abroad: quota } : {}), territorial_turnout_matches_archive_table: tt ? true : 'no archive table printed for this election' };
    const short = year.slice(2), electionId = `el-hr-sabor-${E.polling_day}`, systemId = `es-hr-sabor-${year}`, legislatureId = `lg-hr-sabor-${year}`, SRC = `src-hr-dip-final-${year}`;
    const decisionDates = [...new Set(units.map((u) => u.decision_date))];
    const rp = E.repeat_poll ?? null;
    const vintage = historical
      ? `final: State Electoral Commission final-results decisions of ${decisionDates.join(', ')} (${units.length} decisions: ten territorial constituencies, the constituency abroad and ${['', '', '', '', '', 'five', 'six'][minor.length]} national-minority elections)${rp ? `; the polling days printed in ${rp.units.length} decision${rp.units.length > 1 ? 's' : ''} include repeat voting on ${rp.date}` : ''}`
      : `final: State Electoral Commission final-results decisions of ${decisionDates.join(', ')} (17 decisions: ten territorial constituencies, the constituency abroad and six national-minority elections)`;
    const prov = (record, fields, unit) => ({ source_id: SRC, source_url: unit ? unit.url : E.archive_page, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'croatia-sabor-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published', ...(unit ? { publisher_file_sha256: unit.publisher_file_sha256 } : {}) });
    const extraDays = [...new Set(units.map((u) => u.polling_days_printed))];
    out.elections.push({ election_id: electionId, country: 'croatia', election_type: 'national_parliament', chamber: CHAMBER, date: E.polling_day, date_end: null, date_basis: `polling day stated in the decisions; the decisions print the polling days as ${extraDays.map((d) => `“${d}”`).join(' and ')}`, result_coverage: 'all_lists_all_constituencies_minority_candidates_without_names', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: rp ? rp.date : null,
      constituency_structure: [
        { unit: 'territorial', constituencies: terr.map(geoOf), seats_each: 14, seats: 140, vote_type: LIST_VOTE },
        { unit: 'diaspora', constituencies: abroad.map(geoOf), seats: st.diaspora, ...(historical ? { seats_basis: 'non_fixed_quota_printed_in_decision' } : {}), vote_type: LIST_VOTE },
        { unit: 'national_minority', constituencies: minor.map(geoOf), seats: st.minority, vote_type: MINORITY_VOTE },
      ],
      provenance: [prov('decision headings (polling days, decision dates)', ['date', 'result_vintage'])] });
    // Turnout: one row per decision, plus the territorial I–X total printed on the archive page.
    for (const u of units) {
      const T = u.totals;
      const minority = u.kind === 'national_minority';
      const noTurnedOut = T.turned_out === null;
      const rollMinority = minority && E.minority_registered_basis === 'minority_electoral_roll';
      const pct = noTurnedOut ? T.voted_by_ballots_pct : T.turned_out_pct;
      const definition = pct === null
        ? `Voters who voted by ballot (glasovalo je prema listićima) / voters on the ${rollMinority ? 'electoral roll of the minority (birača upisanih u popise birača)' : 'roll (birača upisanih u popis birača)'} × 100, derived from the counts printed in the ${year} decision, which prints no turnout percentage and no separate count of voters who turned out.`
        : rollMinority
        ? `Voters who voted / voters on the electoral roll of the minority (ukupno birača) × 100, as printed in the ${year} decision.`
        : noTurnedOut
        ? `Voters who voted by ballot (glasovalo je prema glasačkim listićima) / voters ${minority ? 'stated' : 'on the roll'} (ukupno birača) × 100, as printed in the decision; the ${year} decisions print no separate count of voters who turned out.`
        : minority
        ? 'Voters who turned out (glasovanju je pristupilo) / voters stated (ukupno birača) × 100, as printed. For a national-minority election the decision states as voters the minority voters who turned out, so the printed turnout is 100% and is not comparable with the territorial constituencies.'
        : 'Voters who turned out (glasovanju je pristupilo) / voters on the roll (ukupno birača) × 100, as printed in the decision; voters who voted by ballot (prema glasačkim listićima) are kept separately.';
      out.election_turnout.push({ election_id: electionId, country: 'croatia', geography: geoOf(u), vote_type: minority ? MINORITY_VOTE : LIST_VOTE, result_vintage: vintage, eligible_voters: T.registered, voters_turned_out: T.turned_out, voters: T.voted_by_ballots, valid_votes: T.valid, invalid_votes: T.invalid, ballots_cast: T.voted_by_ballots, published_turnout: pct === null ? null : Number(pct.replace(',', '.')), derived_turnout: ((noTurnedOut ? T.voted_by_ballots : T.turned_out) / T.registered) * 100, turnout_definition: definition, turnout_basis: { numerator: noTurnedOut ? 'voters' : 'voters_turned_out', denominator: minority && !rollMinority ? 'voters_stated_in_minority_decision' : 'registered_electorate', definition, sourceIds: [SRC] }, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section I`, ['eligible_voters', 'voters_turned_out', 'voters', 'valid_votes', 'invalid_votes', ...(pct === null ? [] : ['published_turnout'])], u)] });
    }
    const tr = sum(terr.map((u) => u.totals), 'registered'), vb = sum(terr.map((u) => u.totals), 'voted_by_ballots');
    const hasTO = terr.every((u) => u.totals.turned_out !== null), to = hasTO ? sum(terr.map((u) => u.totals), 'turned_out') : null;
    const aggDef = `Ten territorial constituencies (I–X) together: sums of the ten decisions${tt ? '; voters on the roll and voters who turned out equal the total printed on the commission’s archive page (UKUPNO REPUBLIKA HRVATSKA)' : ''}. The constituency abroad and the national-minority elections are not included.${hasTO ? '' : ' The decisions print no count of voters who turned out; turnout here is voters who voted by ballot over voters on the roll.'}`;
    out.election_turnout.push({ election_id: electionId, country: 'croatia', geography: 'hr-territorial-i-x', vote_type: LIST_VOTE, result_vintage: vintage, eligible_voters: tr, voters_turned_out: to, voters: vb, valid_votes: sum(terr.map((u) => u.totals), 'valid'), invalid_votes: sum(terr.map((u) => u.totals), 'invalid'), ballots_cast: vb, published_turnout: tt ? Number(tt.percent.replace(',', '.')) : null, derived_turnout: ((hasTO ? to : vb) / tr) * 100,
      turnout_definition: aggDef,
      turnout_basis: { numerator: hasTO ? 'voters_turned_out' : 'voters', denominator: 'registered_electorate', definition: 'Sum of constituencies I–X; abroad and minority elections excluded.', sourceIds: [SRC] }, published_or_derived_note: tt ? 'sums derived from the decisions; percentage printed on the archive page' : 'sums and percentage derived from the decisions', provenance: [tt ? prov('archive page turnout table (UKUPNO REPUBLIKA HRVATSKA)', ['eligible_voters', 'voters_turned_out', 'published_turnout']) : prov('sum of decisions I–X, section I', ['eligible_voters', 'voters'])] });
    // Contestants and results.
    const groups = new Map();
    for (const u of units) {
      const geo = geoOf(u), unitSeats = u.kind === 'national_minority' ? u.seats_by_law : u.kind === 'diaspora' ? st.diaspora : TERRITORIAL_SEATS;
      const unitLabel = u.kind === 'national_minority' ? `XII. izborna jedinica — ${u.minority_en} national minority` : `${roman[u.constituency_number]}. izborna jedinica${u.kind === 'diaspora' ? ' (abroad)' : ''}`;
      if (u.kind === 'national_minority') {
        for (const c of u.candidates) {
          const id = `ct-hr-sabor${short}-ie12-${u.minority_code.split('_')[0]}-${String(c.row).padStart(2, '0')}`;
          out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: geo, contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: historical ? 'national-minority members are elected as individual candidates; the decision prints each candidate, with a deputy where one stood, and the elected candidate’s nominator' : 'national-minority members are elected as individual candidates (each with a deputy); the decision prints the candidate, the deputy and the nominator', list_number: c.row, list_number_basis: 'row in the State Electoral Commission decision', registered_label_native: null, historical_display_label: `Kandidat, red. br. ${c.row}`, display_label_rule: 'candidate names and nominators are not stored; the row number in the decision identifies the candidate', label_basis: 'row_only', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section II row ${c.row}`, ['list_number'], u)] });
          out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: geo, election_id: electionId, contestant_ref: id, vote_type: MINORITY_VOTE, valid_votes: u.totals.valid, total_seats: unitSeats, votes: c.votes, published_vote_share: null, derived_vote_share: unitSeats === 1 ? (c.votes / u.totals.valid) * 100 : null, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: `${unitLabel}: ${unitSeats} seat${unitSeats > 1 ? 's' : ''} filled by the candidate${unitSeats > 1 ? 's' : ''} with most votes (decision section III)${unitSeats > 1 ? (historical ? '; the candidates’ votes add up to more than the valid ballots (voters could mark more than one candidate), so no vote share is computed' : '; each voter could vote for up to three candidates, so no vote share is computed') : ''}`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, sections II–III row ${c.row}`, ['votes', 'seats'], u)] });
        }
        continue;
      }
      const cn = String(u.constituency_number).padStart(2, '0');
      for (const l of u.lists) {
        const id = `ct-hr-sabor${short}-ie${cn}-${String(l.row).padStart(2, '0')}`;
        const label = l.parties_named.length ? l.parties_named.join(', ') : `Lista, red. br. ${l.row}`;
        out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: geo, contestant_kind: 'electoral_list', native_list_type: 'lista', list_composition: l.parties_named_count > 1 ? 'coalition_list_two_or_more_parties_named' : 'single_name_list_kind_not_printed', kind_basis: 'the decision prints each list with the party names under which it stood; a list naming two or more parties is a coalition list; a list naming one party or a citizens’ list title is not further classified', parties_named: l.parties_named, parties_named_count: l.parties_named_count, list_number: l.row, list_number_basis: 'row in the State Electoral Commission decision (ordered by votes; ballot numbers are not printed)', registered_label_native: null, historical_display_label: label, display_label_rule: { verbatim: 'party names as printed', abbreviation_for_personal_name: 'party names as printed; a party name containing a person’s name is shown by the abbreviation printed with it', partial_personal_name_omitted: 'party names as printed; a party name containing a person’s name (no abbreviation printed) is omitted', leader_name_omitted: 'independent list printed with its leader’s name (NEOVISNA LISTA - …): shown as NEOVISNA LISTA; the name is not stored', row_only: 'the only party name contains a person’s name: shown by row number only' }[l.label_basis], label_basis: l.label_basis, title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section II list row ${l.row}`, ['list_number', 'parties_named', 'title_sha256'], u)] });
        out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: geo, election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: u.totals.valid, total_seats: unitSeats, votes: l.votes, published_vote_share: Number(l.printed_percent.replace(',', '.')), derived_vote_share: (l.votes / u.totals.valid) * 100, seats: l.seats, seat_basis: `${unitLabel}: D'Hondt over lists with at least 5% of valid ballots, ${unitSeats} seats (decision sections III–IV)`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, sections II–IV list row ${l.row}`, ['votes', 'published_vote_share', 'seats'], u)] });
        const gk = l.group_sha256 ?? l.title_sha256;
        const g = groups.get(gk) ?? { label, title_sha256: gk, constituencies: [], seats: 0 };
        g.constituencies.push(geo); g.seats += l.seats; groups.set(gk, g);
      }
    }
    const seatGroups = [...groups.values()].filter((g) => g.seats > 0).sort((a, b) => b.seats - a.seats || a.label.localeCompare(b.label));
    out.legislatures.push({ legislature_id: legislatureId, country: 'croatia', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: st.total, seat_count_basis: 'election_result_vintage_not_current_composition', seats_by_mechanism: { territorial_constituencies: 140, constituency_abroad: st.diaspora, national_minorities: st.minority }, seats_by_identical_list_title: seatGroups, seats_by_national_minority: minor.map((u) => ({ constituency: geoOf(u), minority: u.minority_en, seats: u.seats_by_law })), seat_grouping_note: 'Seats of lists with an identical printed title are added across constituencies; lists with different titles (different coalition partners) are not combined and no seat is attributed to a party. National-minority seats are listed by community without affiliation.', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov(`sum of the ${units.length} decisions`, ['total_seats', 'seats_by_mechanism', 'seats_by_identical_list_title'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'croatia', election_id: electionId, institutional_rule_id: 'hr-es-sabor', valid_from: E.polling_day, valid_to: E.polling_day, interval_basis: historical ? `election-specific: the rules applied in the ${year} decisions (${E.act_cited}; the 5% constituency threshold, D'Hondt and the non-fixed quota abroad reproduce the printed seats); the institutional registry record hr-es-sabor holds the current statutory text read from the official gazette` : `election-specific: the rules applied in the ${year} decisions (Election Act as cited in each decision, 5% constituency threshold and D'Hondt reproduce the printed seats); the institutional registry record hr-es-sabor holds the current statutory text read from the official gazette`, system_family: 'list proportional representation in ten territorial constituencies and one constituency abroad; plurality election of national-minority members', vote_type: LIST_VOTE, allocation_method: historical ? "D'Hondt within each constituency among lists with at least 5% of valid ballots; seats abroad set by the non-fixed quota printed in the decision; national-minority members: candidates with most votes (articles as cited in each decision)" : "D'Hondt within each constituency among lists with at least 5% of valid ballots (Arts. 40–41); national-minority members: candidates with most votes (Art. 46)", base_seats: st.total,
      vote_definitions: [
        { id: LIST_VOTE, kind: 'list', label: t('Constituency list votes', '选区名单票'), denominator: 'valid_votes', seatScope: 'constituency', sourceIds: [SRC] },
        { id: MINORITY_VOTE, kind: 'candidate', label: t('National-minority candidate votes', '少数民族候选人票'), denominator: 'valid_votes', seatScope: 'minority_constituency', sourceIds: [SRC] },
      ],
      national_rules: {
        nationalAllocation: null,
        districtAllocation: historical ? `Ten territorial constituencies with 14 seats each and one constituency abroad with ${st.diaspora} seats (non-fixed quota); in each, seats are shared by D'Hondt among lists with at least 5% of the constituency's valid ballots.` : "Ten territorial constituencies with 14 seats each and one constituency abroad with 3 seats; in each, seats are shared by D'Hondt among lists with at least 5% of the constituency's valid ballots.",
        thresholds: [{ appliesTo: 'electoral list, per constituency', percent: 5, description: historical ? t('A list needs at least 5% of the valid ballots in the constituency to take part in its seat allocation (as cited in each decision).', '名单须获得本选区有效票至少 5% 才能参与该选区席位分配（各决定均引用）。') : t('A list needs at least 5% of the valid ballots in the constituency to take part in its seat allocation (Art. 41, as cited in each decision).', '名单须获得本选区有效票至少 5% 才能参与该选区席位分配（第 41 条，各决定均引用）。'), sourceIds: [SRC] }],
        minorityRepresentation: historical ? historicalTexts(year, st, quota, E, units).minority : t('Eight members for national minorities are elected in a separate constituency (XII) covering the whole country: three for the Serbian minority (each voter may vote for up to three candidates), one each for the Hungarian and Italian minorities, one for the Czech and Slovak minorities, and one each for two groups of other minorities. Each member is elected as an individual candidate with a deputy; candidate names are not stored here.', '少数民族的 8 名议员在覆盖全国的单独选区（第 XII 选区）选出：塞尔维亚族 3 名（每名选民最多可投 3 名候选人），匈牙利族、意大利族各 1 名，捷克族与斯洛伐克族共 1 名，另两组其他少数民族各 1 名。每名议员以个人候选人身份（另有替补）当选；此处不存储候选人姓名。'),
        diasporaRepresentation: historical ? historicalTexts(year, st, quota, E, units).diaspora : t('Three members are elected in the constituency for voters without residence in Croatia (XI), by the same list rules as the territorial constituencies.', '在克罗地亚无居所的选民所属选区（第 XI 选区）选出 3 名议员，名单规则与地域选区相同。'),
        totalSeatsDefinition: historical ? historicalTexts(year, st, quota, E, units).total : t('151 seats: 140 from ten territorial constituencies, 3 from the constituency abroad and 8 for national minorities.', '151 席：十个地域选区 140 席、境外选区 3 席、少数民族 8 席。'),
        sourceIds: [SRC],
      },
      notes: historical ? historicalTexts(year, st, quota, E, units).notes : Number(year) >= 2015 ? t("Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. A preferential vote decides which candidates of a list are elected; candidate votes are not stored.", '得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。优先票决定名单中哪些候选人当选；不存储候选人得票。')
        : t("Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. There was no preferential vote before the 2015 amendments: candidates were elected in list order. The 2011 decisions have a damaged text layer, so list names come from the commission's open-data workbooks, matched to the decisions by votes; list leaders' names are not stored.", '得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。2015 年修正之前没有优先票：候选人按名单顺序当选。2011 年决定的文本层受损，名单名称来自委员会开放数据工作簿，按得票与决定匹配；不存储名单领衔人姓名。'),
      seat_check: checks[year], provenance: [prov('decisions sections III–IV', ['allocation_method', 'thresholds', 'base_seats'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'croatia', institution: 'Državno izborno povjerenstvo Republike Hrvatske (State Electoral Commission)', dataset: `Konačni rezultati izbora zastupnika u Hrvatski sabor ${year} — 17 final-results decisions (territorial constituencies I–X, constituency XI abroad, constituency XII national minorities)`, tier: 'tier1_official', url: E.archive_page, licence_status: 'official_text_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_party_names_only_documents_and_candidate_names_not_redistributed', licence_url: evidence.rights.publisher_reuse_page, rights_basis: evidence.rights.basis, attribution: 'Državno izborno povjerenstvo Republike Hrvatske', retrieved_at: E.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, ...(E.names_source ? { names_source: E.names_source } : {}), ...(historical ? { acquisition: E.acquisition, received_not_used: [E.open_data_zip_received_not_used] } : {}), documents: units.map((u) => ({ unit: geoOf(u), url: u.url, klasa: u.klasa, urbroj: u.urbroj, decision_date: u.decision_date, publisher_file_sha256: u.publisher_file_sha256 })) });
  }
  // 1992 and 1995 rows come first (chronological order); the 2000–2024 rows are unchanged.
  const { out: o92, check: c92 } = build1992(evidence, evidenceSha, parserSha);
  const { out: o95, check: c95 } = build1995(evidence, evidenceSha, parserSha);
  for (const s of CROATIAN_STORES) out[s] = [...o92[s], ...o95[s], ...out[s]];
  return { ...out, checks: { 1992: c92, 1995: c95, ...checks } };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function croatiaFiles(data) {
  const files = {};
  for (const store of CROATIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = `# Croatia — Croatian Parliament (Hrvatski sabor) elections\n\nElections: ${data.elections.map((e) => e.date).join(', ')}. Whole chamber in every election (${data.legislatures.map((l) => `${l.election_id.slice(-10, -6)}: ${l.total_seats}`).join(', ')} seats): ten territorial constituencies (14 seats each), one constituency abroad (3 seats from 2011; in 2000, 2003 and 2007 the number was set by a non-fixed quota printed in the decision: ${data.legislatures.filter((l) => l.seats_by_mechanism.constituency_abroad !== undefined && l.seats_by_mechanism.constituency_abroad !== 3).map((l) => l.seats_by_mechanism.constituency_abroad).join(', ')} seats) and the national-minority elections in constituency XII (8 seats; 5 in 2000). 1992 (Chamber of Representatives only, 138 seats) used a mixed system: 60 seats from national lists (D'Hondt; a 3% threshold reproduces them), 60 single-member constituencies (most votes), 4 national-minority special constituencies, and 14 members declared elected from national lists (13 for the Serbian community, 1 for minorities under 8%; \`members_declared_elected_from_list\`); every 1992 percentage is printed on the voters who voted, invalid ballots included (\`share_base\`) (\`geography\` hr-national-list, hr-smd-01 … hr-smd-60, hr-special-1 … hr-special-4). 1995 (Chamber of Representatives only, 127 seats) used a mixed system: 80 seats from national lists (D'Hondt, 5%), 28 single-member constituencies (most votes), 12 seats from special lists for voters abroad and 7 national-minority seats in five special constituencies (\`geography\` hr-national-list, hr-smd-01 … hr-smd-28, hr-special-list-abroad, hr-special-1 … hr-special-5); single-member candidates are shown by their nominating parties and row number, never by name. Source: final-results decisions of the State Electoral Commission (Državno izborno povjerenstvo), one per constituency and per minority election, identified by KLASA/URBROJ and file checksum in \`political_source_registry\`.\n\nUnits: results are per constituency (\`geography\` hr-ie-01 … hr-ie-11, hr-ie-12-<minority>). The same party may stand in different coalitions in different constituencies, so list votes are not added into national vote shares. \`legislatures.seats_by_identical_list_title\` adds seats only across lists with the same printed title. Turnout is printed per decision (the 2000 decisions print turnout counts without percentages, so 2000 turnout is derived); \`hr-territorial-i-x\` sums constituencies I–X and, for 2024, matches the commission’s archive table.\n\nLabels: lists are stored with the party names printed in the decision. Party names containing a living person’s name are shown by the abbreviation printed with them, or omitted (row number only when nothing remains); independent lists printed with their leader’s name (2000–2007) are shown as NEOVISNA LISTA; \`title_sha256\` identifies the full printed title. National-minority candidates are stored without names or nominators (row number, votes, elected). No list is linked to a party or across elections.\n\nReuse basis: official texts of state bodies are not protected by copyright (Croatian Copyright Act), recorded as the owner’s reading of the statute, not a licence.\n`;
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'croatia-political-export-v1', country: 'croatia', elections: data.elections.map((e) => e.election_id), coverage: 'whole_chamber_all_seats_per_constituency', seats_by_election: Object.fromEntries(data.legislatures.map((l) => [l.election_id, l.total_seats])), units: 'constituency (hr-ie-01..11) and national-minority election (hr-ie-12-*); 1992: hr-national-list, hr-smd-01..60, hr-special-1..4; 1995: hr-national-list, hr-smd-01..28, hr-special-list-abroad, hr-special-1..5', label_rule: 'party names as printed; names of persons replaced by the printed abbreviation or omitted; minority candidates without names', not_included: ['candidate names and preferential votes', 'polling-station results', 'party attribution and cross-election links', 'national vote shares (lists differ between constituencies)'], stores: CROATIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCroatia();
  const files = croatiaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Croatia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: Object.fromEntries(Object.entries(data.checks).map(([y, c]) => [y, c.units ? { seats: c.seats, units: c.units.length } : { total: c.total, single_member_seats_by_nominator: c.single_member_seats_by_nominator }])), files: Object.keys(files).length }));
}
