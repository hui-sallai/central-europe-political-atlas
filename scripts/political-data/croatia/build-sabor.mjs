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
//   - seats: 10 × 14 + 3 + 8 = 151.
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
export const YEARS = ['2011', '2015', '2016', '2020', '2024'];
const CHAMBER = 'Hrvatski sabor';
const SEATS = { territorial: 14, diaspora: 3 };
const TOTAL = 151;
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

export function reconcileUnit(year, u, convention) {
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
  const seats = SEATS[u.kind];
  check(sum(L, 'seats') === seats, `seats ≠ ${seats}`);
  const taking = L.filter((x) => x.votes * 100 >= 5 * T.valid);
  check(taking.length === u.lists_in_allocation_printed, `lists at or above 5% (${taking.length}) ≠ lists named in the decision (${u.lists_in_allocation_printed})`);
  const won = dhondt(taking.map((x) => x.votes), seats);
  check(won.join() === taking.map((x) => x.seats).join(), `D'Hondt seats ${won} differ from the decision`);
  check(L.filter((x) => !taking.includes(x)).every((x) => x.seats === 0), 'a list below 5% holds seats');
  // Section IV lists the seat-winning lists in order; some 2011 decisions also list a threshold list with 0 seats.
  const iv = u.seats_section_iv_in_order.join();
  check(iv === taking.filter((x) => x.seats > 0).map((x) => x.seats).join() || iv === taking.map((x) => x.seats).join(), 'section IV seat order mismatch');
  return { unit: u.unit_key, kind: u.kind, lists: L.length, valid: T.valid, seats, threshold_votes: Math.ceil(0.05 * T.valid), lists_in_allocation: taking.length };
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
    const unitChecks = units.map((u) => reconcileUnit(year, u, E.percent_convention));
    const terr = units.filter((u) => u.kind === 'territorial'), abroad = units.filter((u) => u.kind === 'diaspora'), minor = units.filter((u) => u.kind === 'national_minority');
    if (terr.length !== 10 || abroad.length !== 1 || minor.length !== 6) fail(`${year}: expected 10 territorial, 1 diaspora and 6 minority decisions`);
    const seatTotal = sum(terr.flatMap((u) => u.lists), 'seats') + sum(abroad.flatMap((u) => u.lists), 'seats') + sum(minor, 'seats_by_law');
    if (seatTotal !== TOTAL) fail(`${year}: seats ${seatTotal} ≠ ${TOTAL}`);
    const tt = E.archive_turnout_table ?? null;
    if (tt && (sum(terr.map((u) => u.totals), 'registered') !== tt.registered || sum(terr.map((u) => u.totals), 'turned_out') !== tt.turned_out)) fail(`${year}: territorial totals differ from the archive turnout table`);
    checks[year] = { units: unitChecks, seats: { territorial: 140, diaspora: 3, national_minority: 8, total: seatTotal }, territorial_turnout_matches_archive_table: tt ? true : 'no archive table printed for this election' };
    const short = year.slice(2), electionId = `el-hr-sabor-${E.polling_day}`, systemId = `es-hr-sabor-${year}`, legislatureId = `lg-hr-sabor-${year}`, SRC = `src-hr-dip-final-${year}`;
    const decisionDates = [...new Set(units.map((u) => u.decision_date))];
    const vintage = `final: State Electoral Commission final-results decisions of ${decisionDates.join(', ')} (17 decisions: ten territorial constituencies, the constituency abroad and six national-minority elections)`;
    const prov = (record, fields, unit) => ({ source_id: SRC, source_url: unit ? unit.url : E.archive_page, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'croatia-sabor-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published', ...(unit ? { publisher_file_sha256: unit.publisher_file_sha256 } : {}) });
    const extraDays = [...new Set(units.map((u) => u.polling_days_printed))];
    out.elections.push({ election_id: electionId, country: 'croatia', election_type: 'national_parliament', chamber: CHAMBER, date: E.polling_day, date_end: null, date_basis: `polling day stated in the decisions; the decisions print the polling days as ${extraDays.map((d) => `“${d}”`).join(' and ')}`, result_coverage: 'all_lists_all_constituencies_minority_candidates_without_names', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null,
      constituency_structure: [
        { unit: 'territorial', constituencies: terr.map(geoOf), seats_each: 14, seats: 140, vote_type: LIST_VOTE },
        { unit: 'diaspora', constituencies: abroad.map(geoOf), seats: 3, vote_type: LIST_VOTE },
        { unit: 'national_minority', constituencies: minor.map(geoOf), seats: 8, vote_type: MINORITY_VOTE },
      ],
      provenance: [prov('decision headings (polling days, decision dates)', ['date', 'result_vintage'])] });
    // Turnout: one row per decision, plus the territorial I–X total printed on the archive page.
    for (const u of units) {
      const T = u.totals;
      const minority = u.kind === 'national_minority';
      const noTurnedOut = T.turned_out === null;
      const rollMinority = minority && E.minority_registered_basis === 'minority_electoral_roll';
      const definition = rollMinority
        ? `Voters who voted / voters on the electoral roll of the minority (ukupno birača) × 100, as printed in the ${year} decision.`
        : noTurnedOut
        ? `Voters who voted by ballot (glasovalo je prema glasačkim listićima) / voters ${minority ? 'stated' : 'on the roll'} (ukupno birača) × 100, as printed in the decision; the ${year} decisions print no separate count of voters who turned out.`
        : minority
        ? 'Voters who turned out (glasovanju je pristupilo) / voters stated (ukupno birača) × 100, as printed. For a national-minority election the decision states as voters the minority voters who turned out, so the printed turnout is 100% and is not comparable with the territorial constituencies.'
        : 'Voters who turned out (glasovanju je pristupilo) / voters on the roll (ukupno birača) × 100, as printed in the decision; voters who voted by ballot (prema glasačkim listićima) are kept separately.';
      out.election_turnout.push({ election_id: electionId, country: 'croatia', geography: geoOf(u), vote_type: minority ? MINORITY_VOTE : LIST_VOTE, result_vintage: vintage, eligible_voters: T.registered, voters_turned_out: T.turned_out, voters: T.voted_by_ballots, valid_votes: T.valid, invalid_votes: T.invalid, ballots_cast: T.voted_by_ballots, published_turnout: Number((noTurnedOut ? T.voted_by_ballots_pct : T.turned_out_pct).replace(',', '.')), derived_turnout: ((noTurnedOut ? T.voted_by_ballots : T.turned_out) / T.registered) * 100, turnout_definition: definition, turnout_basis: { numerator: noTurnedOut ? 'voters' : 'voters_turned_out', denominator: minority && !rollMinority ? 'voters_stated_in_minority_decision' : 'registered_electorate', definition, sourceIds: [SRC] }, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section I`, ['eligible_voters', 'voters_turned_out', 'voters', 'valid_votes', 'invalid_votes', 'published_turnout'], u)] });
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
      const geo = geoOf(u), unitSeats = u.kind === 'national_minority' ? u.seats_by_law : SEATS[u.kind];
      const unitLabel = u.kind === 'national_minority' ? `XII. izborna jedinica — ${u.minority_en} national minority` : `${roman[u.constituency_number]}. izborna jedinica${u.kind === 'diaspora' ? ' (abroad)' : ''}`;
      if (u.kind === 'national_minority') {
        for (const c of u.candidates) {
          const id = `ct-hr-sabor${short}-ie12-${u.minority_code.split('_')[0]}-${String(c.row).padStart(2, '0')}`;
          out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: geo, contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: 'national-minority members are elected as individual candidates (each with a deputy); the decision prints the candidate, the deputy and the nominator', list_number: c.row, list_number_basis: 'row in the State Electoral Commission decision', registered_label_native: null, historical_display_label: `Kandidat, red. br. ${c.row}`, display_label_rule: 'candidate names and nominators are not stored; the row number in the decision identifies the candidate', label_basis: 'row_only', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section II row ${c.row}`, ['list_number'], u)] });
          out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: geo, election_id: electionId, contestant_ref: id, vote_type: MINORITY_VOTE, valid_votes: u.totals.valid, total_seats: unitSeats, votes: c.votes, published_vote_share: null, derived_vote_share: unitSeats === 1 ? (c.votes / u.totals.valid) * 100 : null, seats: c.elected ? 1 : 0, elected: c.elected, seat_basis: `${unitLabel}: ${unitSeats} seat${unitSeats > 1 ? 's' : ''} filled by the candidate${unitSeats > 1 ? 's' : ''} with most votes (decision section III)${unitSeats > 1 ? '; each voter could vote for up to three candidates, so no vote share is computed' : ''}`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, sections II–III row ${c.row}`, ['votes', 'seats'], u)] });
        }
        continue;
      }
      const cn = String(u.constituency_number).padStart(2, '0');
      for (const l of u.lists) {
        const id = `ct-hr-sabor${short}-ie${cn}-${String(l.row).padStart(2, '0')}`;
        const label = l.parties_named.length ? l.parties_named.join(', ') : `Lista, red. br. ${l.row}`;
        out.electoral_contestants.push({ contestant_id: id, country: 'croatia', election_id: electionId, constituency: geo, contestant_kind: 'electoral_list', native_list_type: 'lista', list_composition: l.parties_named_count > 1 ? 'coalition_list_two_or_more_parties_named' : 'single_name_list_kind_not_printed', kind_basis: 'the decision prints each list with the party names under which it stood; a list naming two or more parties is a coalition list; a list naming one party or a citizens’ list title is not further classified', parties_named: l.parties_named, parties_named_count: l.parties_named_count, list_number: l.row, list_number_basis: 'row in the State Electoral Commission decision (ordered by votes; ballot numbers are not printed)', registered_label_native: null, historical_display_label: label, display_label_rule: { verbatim: 'party names as printed', abbreviation_for_personal_name: 'party names as printed; a party name containing a person’s name is shown by the abbreviation printed with it', partial_personal_name_omitted: 'party names as printed; a party name containing a person’s name (no abbreviation printed) is omitted', row_only: 'the only party name contains a person’s name: shown by row number only' }[l.label_basis], label_basis: l.label_basis, title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, section II list row ${l.row}`, ['list_number', 'parties_named', 'title_sha256'], u)] });
        out.election_results.push({ result_id: `er-${id}`, country: 'croatia', geography: geo, election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: u.totals.valid, total_seats: unitSeats, votes: l.votes, published_vote_share: Number(l.printed_percent.replace(',', '.')), derived_vote_share: (l.votes / u.totals.valid) * 100, seats: l.seats, seat_basis: `${unitLabel}: D'Hondt over lists with at least 5% of valid ballots, ${unitSeats} seats (decision sections III–IV)`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`decision ${u.klasa} / ${u.urbroj}, sections II–IV list row ${l.row}`, ['votes', 'published_vote_share', 'seats'], u)] });
        const gk = l.group_sha256 ?? l.title_sha256;
        const g = groups.get(gk) ?? { label, title_sha256: gk, constituencies: [], seats: 0 };
        g.constituencies.push(geo); g.seats += l.seats; groups.set(gk, g);
      }
    }
    const seatGroups = [...groups.values()].filter((g) => g.seats > 0).sort((a, b) => b.seats - a.seats || a.label.localeCompare(b.label));
    out.legislatures.push({ legislature_id: legislatureId, country: 'croatia', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: TOTAL, seat_count_basis: 'election_result_vintage_not_current_composition', seats_by_mechanism: { territorial_constituencies: 140, constituency_abroad: 3, national_minorities: 8 }, seats_by_identical_list_title: seatGroups, seats_by_national_minority: minor.map((u) => ({ constituency: geoOf(u), minority: u.minority_en, seats: u.seats_by_law })), seat_grouping_note: 'Seats of lists with an identical printed title are added across constituencies; lists with different titles (different coalition partners) are not combined and no seat is attributed to a party. National-minority seats are listed by community without affiliation.', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('sum of the 17 decisions', ['total_seats', 'seats_by_mechanism', 'seats_by_identical_list_title'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'croatia', election_id: electionId, institutional_rule_id: 'hr-es-sabor', valid_from: E.polling_day, valid_to: E.polling_day, interval_basis: `election-specific: the rules applied in the ${year} decisions (Election Act as cited in each decision, 5% constituency threshold and D'Hondt reproduce the printed seats); the institutional registry record hr-es-sabor holds the current statutory text read from the official gazette`, system_family: 'list proportional representation in ten territorial constituencies and one constituency abroad; plurality election of national-minority members', vote_type: LIST_VOTE, allocation_method: "D'Hondt within each constituency among lists with at least 5% of valid ballots (Arts. 40–41); national-minority members: candidates with most votes (Art. 46)", base_seats: TOTAL,
      vote_definitions: [
        { id: LIST_VOTE, kind: 'list', label: t('Constituency list votes', '选区名单票'), denominator: 'valid_votes', seatScope: 'constituency', sourceIds: [SRC] },
        { id: MINORITY_VOTE, kind: 'candidate', label: t('National-minority candidate votes', '少数民族候选人票'), denominator: 'valid_votes', seatScope: 'minority_constituency', sourceIds: [SRC] },
      ],
      national_rules: {
        nationalAllocation: null,
        districtAllocation: "Ten territorial constituencies with 14 seats each and one constituency abroad with 3 seats; in each, seats are shared by D'Hondt among lists with at least 5% of the constituency's valid ballots.",
        thresholds: [{ appliesTo: 'electoral list, per constituency', percent: 5, description: t('A list needs at least 5% of the valid ballots in the constituency to take part in its seat allocation (Art. 41, as cited in each decision).', '名单须获得本选区有效票至少 5% 才能参与该选区席位分配（第 41 条，各决定均引用）。'), sourceIds: [SRC] }],
        minorityRepresentation: t('Eight members for national minorities are elected in a separate constituency (XII) covering the whole country: three for the Serbian minority (each voter may vote for up to three candidates), one each for the Hungarian and Italian minorities, one for the Czech and Slovak minorities, and one each for two groups of other minorities. Each member is elected as an individual candidate with a deputy; candidate names are not stored here.', '少数民族的 8 名议员在覆盖全国的单独选区（第 XII 选区）选出：塞尔维亚族 3 名（每名选民最多可投 3 名候选人），匈牙利族、意大利族各 1 名，捷克族与斯洛伐克族共 1 名，另两组其他少数民族各 1 名。每名议员以个人候选人身份（另有替补）当选；此处不存储候选人姓名。'),
        diasporaRepresentation: t('Three members are elected in the constituency for voters without residence in Croatia (XI), by the same list rules as the territorial constituencies.', '在克罗地亚无居所的选民所属选区（第 XI 选区）选出 3 名议员，名单规则与地域选区相同。'),
        totalSeatsDefinition: t('151 seats: 140 from ten territorial constituencies, 3 from the constituency abroad and 8 for national minorities.', '151 席：十个地域选区 140 席、境外选区 3 席、少数民族 8 席。'),
        sourceIds: [SRC],
      },
      notes: Number(year) >= 2015 ? t("Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. A preferential vote decides which candidates of a list are elected; candidate votes are not stored.", '得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。优先票决定名单中哪些候选人当选；不存储候选人得票。')
        : t("Votes are shown per constituency. The same party can stand in different coalitions in different constituencies, so constituency list votes are not added into national vote shares. Seats reproduce by D'Hondt with the 5% constituency threshold. There was no preferential vote before the 2015 amendments: candidates were elected in list order. The 2011 decisions have a damaged text layer, so list names come from the commission's open-data workbooks, matched to the decisions by votes; list leaders' names are not stored.", '得票按选区列示。同一政党在不同选区可能参加不同联盟，因此不把各选区名单票相加为全国得票率。席位可按 D’Hondt 与选区 5% 门槛复现。2015 年修正之前没有优先票：候选人按名单顺序当选。2011 年决定的文本层受损，名单名称来自委员会开放数据工作簿，按得票与决定匹配；不存储名单领衔人姓名。'),
      seat_check: checks[year], provenance: [prov('decisions sections III–IV', ['allocation_method', 'thresholds', 'base_seats'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'croatia', institution: 'Državno izborno povjerenstvo Republike Hrvatske (State Electoral Commission)', dataset: `Konačni rezultati izbora zastupnika u Hrvatski sabor ${year} — 17 final-results decisions (territorial constituencies I–X, constituency XI abroad, constituency XII national minorities)`, tier: 'tier1_official', url: E.archive_page, licence_status: 'official_text_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_party_names_only_documents_and_candidate_names_not_redistributed', licence_url: evidence.rights.publisher_reuse_page, rights_basis: evidence.rights.basis, attribution: 'Državno izborno povjerenstvo Republike Hrvatske', retrieved_at: E.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, ...(E.names_source ? { names_source: E.names_source } : {}), documents: units.map((u) => ({ unit: geoOf(u), url: u.url, klasa: u.klasa, urbroj: u.urbroj, decision_date: u.decision_date, publisher_file_sha256: u.publisher_file_sha256 })) });
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
  files[`${EXPORT_DIR}/README.md`] = `# Croatia — Croatian Parliament (Hrvatski sabor) elections\n\nElections: ${data.elections.map((e) => e.date).join(', ')}. Whole chamber (151 seats): ten territorial constituencies (14 seats each), one constituency abroad (3 seats) and six national-minority elections in constituency XII (8 seats). Source: final-results decisions of the State Electoral Commission (Državno izborno povjerenstvo), one per constituency and per minority election, identified by KLASA/URBROJ and file checksum in \`political_source_registry\`.\n\nUnits: results are per constituency (\`geography\` hr-ie-01 … hr-ie-11, hr-ie-12-<minority>). The same party may stand in different coalitions in different constituencies, so list votes are not added into national vote shares. \`legislatures.seats_by_identical_list_title\` adds seats only across lists with the same printed title. Turnout is printed per decision; \`hr-territorial-i-x\` sums constituencies I–X and matches the commission’s archive table.\n\nLabels: lists are stored with the party names printed in the decision. Party names containing a living person’s name are shown by the abbreviation printed with them, or omitted (row number only when nothing remains); \`title_sha256\` identifies the full printed title. National-minority candidates are stored without names or nominators (row number, votes, elected). No list is linked to a party or across elections.\n\nReuse basis: official texts of state bodies are not protected by copyright (Croatian Copyright Act), recorded as the owner’s reading of the statute, not a licence.\n`;
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'croatia-political-export-v1', country: 'croatia', elections: data.elections.map((e) => e.election_id), coverage: 'whole_chamber_151_of_151_seats_per_constituency', units: 'constituency (hr-ie-01..11) and national-minority election (hr-ie-12-*)', label_rule: 'party names as printed; names of persons replaced by the printed abbreviation or omitted; minority candidates without names', not_included: ['candidate names and preferential votes', 'polling-station results', 'party attribution and cross-election links', 'national vote shares (lists differ between constituencies)'], stores: CROATIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildCroatia();
  const files = croatiaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Croatia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: Object.fromEntries(Object.entries(data.checks).map(([y, c]) => [y, { seats: c.seats, units: c.units.length }])), files: Object.keys(files).length }));
}
