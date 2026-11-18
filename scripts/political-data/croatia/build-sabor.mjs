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
  const chamberEn = E.chamber_printed ? ` The ${year} decisions name the chamber ${E.chamber_printed} (Chamber of Representatives of the Croatian State Parliament); this record covers that chamber only. They print counts without percentages.` : '';
  const chamberZh = E.chamber_printed ? ` ${year} 年决定所称议院为 ${E.chamber_printed}（克罗地亚国家议会代表院）；本记录仅涵盖该议院。决定只印有人数，未印百分比。` : '';
  const repeatEn = rp ? ` The polling days printed in the decisions for ${joinEn(rp.units.map((k) => unitName(byKey[k])))} include repeat voting on ${rp.date}; their figures include it.` : '';
  const repeatZh = rp ? ` ${rp.units.length} 份决定所印投票日包括 ${rp.date} 的重新投票，其数字已包含在内。` : '';
  const notes = t(`Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. There was no preferential vote before the 2015 amendments: candidates were elected in list order. Independent lists are printed with their leader's name (NEOVISNA LISTA - …); they are shown as NEOVISNA LISTA and the name is not stored.${chamberEn}${repeatEn}`, `得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。2015 年修正之前没有优先票：候选人按名单顺序当选。独立名单印有领衔人姓名（NEOVISNA LISTA - …），此处显示为 NEOVISNA LISTA，不存储姓名。${chamberZh}${repeatZh}`);
  return { minority, diaspora, total, notes };
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
        ? `Voters who voted by ballot (glasovalo je prema listićima) / voters on the ${rollMinority ? 'electoral roll of the minority (birača upisanih u popise birača)' : 'roll (birača upisanih u popis birača)'} × 100, derived from the counts printed in the ${year} decision, which prints no percentages and no separate count of voters who turned out.`
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
  return { ...out, checks };
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
  files[`${EXPORT_DIR}/README.md`] = `# Croatia — Croatian Parliament (Hrvatski sabor) elections\n\nElections: ${data.elections.map((e) => e.date).join(', ')}. Whole chamber in every election (${data.legislatures.map((l) => `${l.election_id.slice(-10, -6)}: ${l.total_seats}`).join(', ')} seats): ten territorial constituencies (14 seats each), one constituency abroad (3 seats from 2011; in 2000, 2003 and 2007 the number was set by a non-fixed quota printed in the decision: ${data.legislatures.filter((l) => l.seats_by_mechanism.constituency_abroad !== 3).map((l) => l.seats_by_mechanism.constituency_abroad).join(', ')} seats) and the national-minority elections in constituency XII (8 seats; 5 in 2000). Source: final-results decisions of the State Electoral Commission (Državno izborno povjerenstvo), one per constituency and per minority election, identified by KLASA/URBROJ and file checksum in \`political_source_registry\`.\n\nUnits: results are per constituency (\`geography\` hr-ie-01 … hr-ie-11, hr-ie-12-<minority>). The same party may stand in different coalitions in different constituencies, so list votes are not added into national vote shares. \`legislatures.seats_by_identical_list_title\` adds seats only across lists with the same printed title. Turnout is printed per decision (the 2000 decisions print counts only, so 2000 turnout is derived); \`hr-territorial-i-x\` sums constituencies I–X and, for 2024, matches the commission’s archive table.\n\nLabels: lists are stored with the party names printed in the decision. Party names containing a living person’s name are shown by the abbreviation printed with them, or omitted (row number only when nothing remains); independent lists printed with their leader’s name (2000–2007) are shown as NEOVISNA LISTA; \`title_sha256\` identifies the full printed title. National-minority candidates are stored without names or nominators (row number, votes, elected). No list is linked to a party or across elections.\n\nReuse basis: official texts of state bodies are not protected by copyright (Croatian Copyright Act), recorded as the owner’s reading of the statute, not a licence.\n`;
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'croatia-political-export-v1', country: 'croatia', elections: data.elections.map((e) => e.election_id), coverage: 'whole_chamber_all_seats_per_constituency', seats_by_election: Object.fromEntries(data.legislatures.map((l) => [l.election_id, l.total_seats])), units: 'constituency (hr-ie-01..11) and national-minority election (hr-ie-12-*)', label_rule: 'party names as printed; names of persons replaced by the printed abbreviation or omitted; minority candidates without names', not_included: ['candidate names and preferential votes', 'polling-station results', 'party attribution and cross-election links', 'national vote shares (lists differ between constituencies)'], stores: CROATIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCroatia();
  const files = croatiaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Croatia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: Object.fromEntries(Object.entries(data.checks).map(([y, c]) => [y, { seats: c.seats, units: c.units.length }])), files: Object.keys(files).length }));
}
