// Hungary — National Assembly elections of 2014, 2018, 2022 and 2026. Built only from the committed transcription of the
// National Election Commission minutes (docs/political-data/raw/hungary/ogy/evidence.json). Fail-closed: every printed total is
// reconciled and the list seats are recomputed by the statutory method before anything is written. Party-list and nationality-list
// votes stay separate ballots with separate denominators; constituency votes are not held. A joint list's votes and seats are
// never divided among its organisations, and no link is made between elections.
//
// Usage: node scripts/political-data/hungary/build-ogy-national.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/hungary/ogy/evidence.json';
const STORE_DIR = 'src/data/political/hungary';
const EXPORT_DIR = 'public/research-data/political/hungary';
export const HUNGARIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
export const PARTY_VOTE = 'hu_party_list_vote';
export const NATIONALITY_VOTE = 'hu_nationality_list_vote';
export const YEARS = ['2014', '2018', '2022', '2026'];
const CHAMBER = 'Országgyűlés';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Hungary build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, key = 'votes') => rows.reduce((n, r) => n + (r[key] ?? 0), 0);

/** Highest averages as in § 16(g): each list's votes divided by 1, 2, 3 …; a tie for the last seat fails the build. */
export function highestAverages(votes, seats) {
  const won = votes.map(() => 0);
  for (let i = 0; i < seats; i += 1) {
    const quotients = votes.map((v, k) => v / (won[k] + 1));
    const best = Math.max(...quotients);
    if (quotients.filter((q) => q === best).length > 1) fail('tie in the seat allocation');
    won[quotients.indexOf(best)] += 1;
  }
  return won;
}

export function reconcile(m) {
  const qualifying = m.party_lists.filter((l) => l.seats !== undefined);
  const check = (ok, what) => { if (!ok) fail(`${m.election_id}: ${what}`); };
  check(sum(m.party_lists) === m.party_list_total, 'party-list votes ≠ printed party-list total');
  check(sum(m.nationality_lists) === m.nationality_list_total, 'nationality-list votes ≠ printed nationality-list total');
  check(m.party_list_total + m.nationality_list_total === m.ballots.valid, 'party plus nationality votes ≠ valid ballots');
  check(m.ballots.invalid + m.ballots.valid === m.ballots.stamped_ballots, 'invalid plus valid ≠ stamped ballots');
  check(m.registers.address_rolls + m.registers.transfer + m.registers.foreign_mission + m.registers.postal === m.registers.total, 'registers ≠ printed total');
  check(Object.entries(m.participation).filter(([k]) => k !== 'total').reduce((n, [, v]) => n + v, 0) === m.participation.total, 'participation ≠ printed total');
  for (const l of qualifying) check(l.votes + l.surplus === l.total_for_allocation, `list ${l.row}: list plus surplus votes ≠ printed total`);
  check(sum(qualifying) === m.qualifying_totals.list_votes && sum(qualifying, 'surplus') === m.qualifying_totals.surplus && sum(qualifying, 'total_for_allocation') === m.qualifying_totals.total, 'qualifying totals differ');
  check(m.qualifying_totals.total + m.nationality_list_total === m.all_national_list_votes, 'all national list votes differ');
  check(Math.floor(m.all_national_list_votes / 93 / 4) === m.preferential_quota, 'preferential quota does not reproduce');
  check(Math.ceil(m.ballots.valid * 0.05) === m.printed_thresholds.five_percent && Math.ceil(m.ballots.valid * 0.1) === m.printed_thresholds.ten_percent && Math.ceil(m.ballots.valid * 0.15) === m.printed_thresholds.fifteen_percent, 'printed thresholds do not reproduce');
  for (const l of m.party_lists) {
    const min = m.joint_party_list_rows.includes(l.row) ? null : m.printed_thresholds.five_percent;
    if (min !== null) check((l.seats !== undefined) === (l.votes >= min), `list ${l.row}: threshold finding differs`);
  }
  const preferential = m.nationality_lists.filter((l) => l.votes >= m.preferential_quota).map((l) => l.row);
  check(preferential.join() === m.preferential_seats.join(), 'preferential seats do not reproduce');
  for (const l of m.nationality_lists) if (l.preferential) check(l.votes - m.preferential_quota === l.votes_less_quota, `nationality list ${l.row}: reduced votes differ`);
  check(m.list_seats_to_distribute === 93 - preferential.length, 'seats to distribute ≠ 93 minus preferential seats');
  const won = highestAverages(qualifying.map((l) => l.total_for_allocation), m.list_seats_to_distribute);
  check(won.join() === qualifying.map((l) => l.seats).join(), `recomputed list seats ${won} differ from the minutes`);
  check(sum(qualifying, 'seats') + preferential.length === 93, 'list seats ≠ 93');
  check(m.constituency_minutes_summarised === 106 || (m.constituency_minutes_summarised === null && m.source_form === 'html_minutes_form'), 'constituency minutes ≠ 106');
  return { partyLists: m.party_lists.length, nationalityLists: m.nationality_lists.length, qualifying: qualifying.length, partyVotes: m.party_list_total, nationalityVotes: m.nationality_list_total, voters: m.participation.total, registered: m.registers.total, listSeats: 93 };
}

/**
 * Whole-chamber composition, read by hand from the election office's composition page (owner decision 2026-11-06). Every row must
 * name a list of the minutes; its list seats must equal the minutes; list plus constituency seats must equal the row total; and the
 * tiers must come to 93 + 106 = 199. A seat that cannot be attributed to a list of the minutes fails the build: nothing is guessed.
 * Returns constituency seats by ballot and row, 0 for every list the page does not show (the page accounts for all 199 seats).
 */
export function reconcileComposition(m, comp) {
  const check = (ok, what) => { if (!ok) fail(`${m.election_id} composition: ${what}`); };
  check(comp && comp.election_id === m.election_id, 'missing or for another election');
  const lists = { party: m.party_lists, nationality: m.nationality_lists };
  const seen = new Set();
  const constituency = new Map();
  for (const r of comp.rows) {
    const list = lists[r.ballot]?.find((l) => l.row === r.row);
    check(list, `row ${r.ballot} ${r.row} is not a list of the minutes`);
    check(!seen.has(`${r.ballot}:${r.row}`), `row ${r.ballot} ${r.row} appears twice`);
    seen.add(`${r.ballot}:${r.row}`);
    for (const k of ['list_seats', 'constituency_seats', 'total_seats']) check(Number.isSafeInteger(r[k]) && r[k] >= 0, `row ${r.ballot} ${r.row}: ${k} is not a count`);
    check(r.list_seats === (list.seats ?? (list.preferential ? 1 : 0)), `row ${r.ballot} ${r.row}: list seats ${r.list_seats} differ from the minutes`);
    check(r.list_seats + r.constituency_seats === r.total_seats, `row ${r.ballot} ${r.row}: list plus constituency seats ≠ total`);
    check(r.ballot === 'party' || r.constituency_seats === 0, `row ${r.ballot} ${r.row}: a nationality list holds no constituency seat`);
    constituency.set(`${r.ballot}:${r.row}`, r.constituency_seats);
  }
  for (const l of m.party_lists) if (l.seats) check(seen.has(`party:${l.row}`), `party list ${l.row} won list seats but is missing from the page`);
  for (const l of m.nationality_lists) if (l.preferential) check(seen.has(`nationality:${l.row}`), `nationality list ${l.row} won a seat but is missing from the page`);
  const total = (k) => comp.rows.reduce((n, r) => n + r[k], 0);
  const independent = comp.independent_constituency_seats ?? 0;
  check(Number.isSafeInteger(independent) && independent >= 0, 'independent constituency seats are not a count');
  check(total('constituency_seats') + independent === 106 && comp.printed_totals.constituency_seats === 106, 'constituency seats ≠ 106');
  check(total('list_seats') === 93 && comp.printed_totals.list_seats === 93, 'list seats ≠ 93');
  check(total('total_seats') + independent === 199 && comp.printed_totals.total_seats === 199, 'seats ≠ 199');
  check(comp.unattributed_seats === 0, 'seats held outside the lists of the minutes');
  return (ballot, row) => constituency.get(`${ballot}:${row}`) ?? 0;
}

export const TERRITORIAL_VOTE_2010 = 'hu10_territorial_list_vote';
export const SMC_R1_VOTE_2010 = 'hu10_smc_round1_vote';
export const SMC_R2_VOTE_2010 = 'hu10_smc_round2_vote';

/** Largest-quotient-free check of the national compensation tier: D'Hondt over total fragment votes. */
export function reconcile2010(x) {
  const check = (ok, what) => { if (!ok) fail(`${x.election_id}: ${what}`); };
  const r1 = x.round1, r2 = x.round2;
  check(r1.registers.on_roll_at_close + r1.registers.added_with_certificate === r1.registers.on_roll_at_end, 'round 1 roll at end');
  check(r1.registers.on_roll_at_end + r1.registers.foreign_mission === r1.registers.total, 'round 1 registers total');
  check(r1.participation.at_domestic_stations + r1.participation.declarations === r1.participation.total, 'round 1 participation');
  check((Math.round(r1.participation.total / r1.registers.total * 10000) / 100) === r1.printed_turnout_percent, 'round 1 printed turnout');
  check(r2.registers.on_roll_at_close + r2.registers.added_with_certificate === r2.registers.on_roll_at_end && r2.registers.on_roll_at_end + r2.registers.foreign_mission === r2.registers.total, 'round 2 registers');
  check(r2.participation.at_domestic_stations + r2.participation.declarations === r2.participation.total, 'round 2 participation');
  check((Math.round(r2.participation.total / r2.registers.total * 10000) / 100) === r2.printed_turnout_percent, 'round 2 printed turnout');
  check(r1.constituencies.valid_decided + r1.constituencies.valid_undecided + r1.constituencies.invalid === 176 && r2.constituencies.total === r1.constituencies.valid_undecided + r1.constituencies.invalid, 'round 2 held in every undecided constituency');
  const T = x.threshold_page.territorial_list_votes_total;
  check(sum(x.territorial_lists) === T, 'territorial list votes ≠ printed national total');
  check(Math.floor(T * 0.05) === x.threshold_page.five_percent_exceed && Math.ceil(T * 0.10) === x.threshold_page.ten_percent_reach, 'printed thresholds do not reproduce');
  for (const l of x.territorial_lists) check((l.seats > 0) === (l.joint ? l.votes >= x.threshold_page.ten_percent_reach : l.votes > x.threshold_page.five_percent_exceed), `${l.label}: threshold finding differs from the seats`);
  check(sum(x.territorial_lists, 'seats') === x.territorial_seats_total, 'territorial seats ≠ printed total');
  const st = x.statutory_tiers;
  check(st.single_member + st.territorial_lists + st.national_compensation_minimum === st.total, 'statutory tiers ≠ 386');
  check(x.compensation.seats_to_distribute === st.national_compensation_minimum + (st.territorial_lists - x.territorial_seats_total), 'compensation seats ≠ 58 + undistributed territorial seats');
  for (const c of x.compensation.lists) check(c.smc_fragment + c.list_fragment === c.total, `${c.label}: fragment parts ≠ total`);
  check(sum(x.compensation.lists, 'total') === x.compensation.fragment_total, 'fragment votes ≠ printed total');
  const won = highestAverages(x.compensation.lists.filter((c) => c.total > 0).map((c) => c.total), x.compensation.seats_to_distribute);
  check(won.join() === x.compensation.lists.filter((c) => c.total > 0).map((c) => c.seats).join(), `recomputed compensation seats ${won} differ`);
  check(sum(x.smc_round1) === x.smc_round1_total && sum(x.smc_round2) === x.smc_round2_total, 'single-member vote totals differ');
  check(Object.values(x.smc_seats_final).reduce((n, v) => n + v, 0) === st.single_member, 'single-member seats ≠ 176');
  check(x.smc_round1.find((r) => r.label === 'FIDESZ-KDNP').round1_seats === x.round1.constituencies.valid_decided && x.smc_round1_seats === x.round1.constituencies.valid_decided, 'round-1 seats ≠ decided constituencies');
  check(sum(x.smc_round2, 'seats_derived') === r2.constituencies.valid_decided, 'round-2 seats ≠ round-2 constituencies');
  for (const r of x.smc_round2) check(((x.smc_round1.find((q) => q.label === r.label)?.round1_seats ?? 0) + r.seats_derived) === (x.smc_seats_final[r.label] ?? 0), `${r.label}: round seats ≠ final`);
  const comp = x.composition, rows = comp.rows;
  for (const row of rows) check(row.smc + row.territorial + row.national === row.total, `${row.label_on_page}: tiers ≠ total`);
  check(sum(rows, 'smc') === comp.printed_totals.smc && sum(rows, 'territorial') === comp.printed_totals.territorial && sum(rows, 'national') === comp.printed_totals.national && sum(rows, 'total') === comp.printed_totals.total, 'composition totals differ');
  check(comp.printed_totals.smc === 176 && comp.printed_totals.territorial === x.territorial_seats_total && comp.printed_totals.national === x.compensation.seats_to_distribute && comp.printed_totals.total === 386 && comp.vacant === 0, 'final tiers ≠ 176 + 146 + 64 = 386');
  for (const l of x.territorial_lists) {
    const row = rows.find((r) => r.attributed_to === l.label);
    const nat = x.compensation.lists.find((c) => c.label === l.national_list_label);
    check((row?.territorial ?? 0) === l.seats, `${l.label}: territorial seats ≠ composition`);
    check((row?.national ?? 0) === (nat?.seats ?? 0), `${l.label}: national seats ≠ composition`);
    check((row?.smc ?? 0) === (x.smc_seats_final[l.label] ?? 0), `${l.label}: single-member seats ≠ composition`);
  }
  return { territorialLists: x.territorial_lists.length, smcRound1Groups: x.smc_round1.length, registered: r1.registers.total, voters: r1.participation.total, seats: { single_member: 176, territorial: x.territorial_seats_total, national: x.compensation.seats_to_distribute, total: 386 } };
}

function build2010(x, out, { evidenceSha, parserSha, rights }) {
  const checks = reconcile2010(x);
  const electionId = x.election_id, SRC = 'src-hu-nvi-archive-2010', LAW1989 = 'src-hu-nvi-mandleir-2010', at = x.read_at;
  const prov = (id, page, fields, how = 'published') => ({ source_id: id, source_url: x.pages[page], source_record_id: page, retrieved_at: at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'hungary-ogy-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how });
  const vintage = `final: National Election Office archive of the 2010 election, round 1 (${x.page_states.round1}) and round 2 (${x.page_states.round2}); national totals and seat tables only`;
  const outside = x.composition.rows.filter((r) => !x.territorial_lists.some((l) => l.label === r.attributed_to));
  out.elections.push({ election_id: electionId, country: 'hungary', election_type: 'national_parliament', chamber: CHAMBER, date: x.rounds[0].date, date_end: x.rounds[1].date, date_basis: x.polling_day_basis, rounds: x.rounds.map((r) => ({ round: r.round, date: r.date })), year: 2010, legislature_id: 'lg-hu-ogy-2010', electoral_system_id: 'es-hu-ogy-2010', result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [prov(SRC, 'index_round2', ['date', 'date_end', 'rounds'])] });
  const def1 = 'Round 1: voters who took part / all voters on the rolls (including foreign-mission rolls) × 100, as printed (64.38%). Round 2 was held only in the 57 undecided single-member constituencies and is recorded separately.';
  const r1 = x.round1, r2 = x.round2;
  out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: TERRITORIAL_VOTE_2010, result_vintage: vintage, eligible_voters: r1.registers.total, voters: r1.participation.total, valid_votes: x.threshold_page.territorial_list_votes_total, invalid_votes: null, ballots_cast: null, published_turnout: r1.printed_turnout_percent, derived_turnout: (r1.participation.total / r1.registers.total) * 100, round: 1, round_2: { date: x.rounds[1].date, constituencies: r2.constituencies.total, eligible_voters: r2.registers.total, voters: r2.participation.total, published_turnout: r2.printed_turnout_percent }, turnout_definition: def1, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: def1, sourceIds: [SRC] }, provenance: [prov(SRC, 'round1_summary', ['eligible_voters', 'voters', 'published_turnout']), prov(SRC, 'threshold', ['valid_votes']), prov(SRC, 'round2_summary', ['round_2'])] });
  out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: SMC_R1_VOTE_2010, result_vintage: vintage, eligible_voters: null, voters: null, valid_votes: x.smc_round1_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: null, round: 1, turnout_definition: null, provenance: [prov(SRC, 'national_totals_round1', ['valid_votes'], 'derived_sum_of_published_rows')] });
  out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: SMC_R2_VOTE_2010, result_vintage: vintage, eligible_voters: null, voters: null, valid_votes: x.smc_round2_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: null, round: 2, turnout_definition: null, provenance: [prov(SRC, 'national_totals_round2', ['valid_votes'], 'derived_sum_of_published_rows')] });
  x.territorial_lists.forEach((l, i) => {
    const id = `ct-hu-ogy10-t${String(i + 1).padStart(2, '0')}`, row = x.composition.rows.find((r) => r.attributed_to === l.label), nat = x.compensation.lists.find((c) => c.label === l.national_list_label);
    const smc = x.smc_seats_final[l.label] ?? 0, list = l.seats + (nat?.seats ?? 0);
    out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: l.joint ? 'coalition' : 'party_list', native_list_type: l.joint ? 'közös területi lista' : 'önálló területi lista', kind_basis: "threshold page tables 'Önálló területi listát állító pártok' and 'Közös területi listát állító pártok'", list_number: i + 1, list_number_basis: 'order of the threshold page (by votes); the archive prints no national list identifier', minutes_list_id: null, registered_label_native: l.label, historical_display_label: l.label, display_label_rule: 'abbreviation as printed on the national pages', national_list_label: l.national_list_label ?? null, lead_party_id: null, party_relation_status: l.joint ? 'organisations_printed_in_the_list_name_only_no_vote_or_seat_attribution' : 'party_register_not_reviewed', continuous_series_eligible: false, provenance: [prov(SRC, 'threshold', ['registered_label_native', 'contestant_kind'])] });
    out.election_results.push({ result_id: `er-${id}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: TERRITORIAL_VOTE_2010, valid_votes: x.threshold_page.territorial_list_votes_total, total_seats: 386, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / x.threshold_page.territorial_list_votes_total) * 100, seats: list, territorial_list_seats: l.seats, national_list_seats: nat?.seats ?? 0, compensation_votes: nat ? nat.total : null, seat_scope: 'list_tiers_territorial_and_national', constituency_seats: smc, whole_chamber_seats: list + smc, seat_basis: `territorial-list seats ${l.seats} + national compensation seats ${nat?.seats ?? 0}; single-member seats ${smc} of candidates nominated by the same organisations; composition page reconciled to 176 + 146 + 64 = 386`, surplus_votes: null, votes_for_list_seat_allocation: null, published_seat_share: null, result_vintage: vintage, provenance: [prov(SRC, 'threshold', ['votes']), prov(SRC, 'national_totals_round1', ['territorial_list_seats']), prov(SRC, 'compensation', ['national_list_seats', 'compensation_votes']), prov(SRC, 'composition', ['constituency_seats', 'whole_chamber_seats'])] });
  });
  for (const [ballot, rows, page] of [[SMC_R1_VOTE_2010, x.smc_round1, 'national_totals_round1'], [SMC_R2_VOTE_2010, x.smc_round2, 'national_totals_round2']]) rows.forEach((r, i) => {
    const r1i = x.smc_round1.findIndex((q) => (q.label ?? q.display) === (r.label ?? r.display));
    const id = `ct-hu-ogy10-c${String(r1i + 1).padStart(2, '0')}`, label = r.label ?? r.display;
    if (ballot === SMC_R1_VOTE_2010) out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: r.aggregate ? 'independent_candidates_aggregate' : 'nominating_organisation_candidates', native_list_type: r.aggregate ? 'független jelöltek' : 'egyéni jelöltet állító szervezet', kind_basis: 'national totals page, single-member candidates column, summed per nominating organisation by the office', list_number: null, minutes_list_id: null, registered_label_native: r.label, historical_display_label: label, display_label_rule: r.label_basis ? 'label as printed, without the personal name it contains' : r.aggregate ? 'aggregate of independent candidates; names not stored' : 'abbreviation as printed on the national pages', ...(r.label_basis ? { label_basis: r.label_basis, printed_label_sha256: r.printed_label_sha256 } : {}), lead_party_id: null, party_relation_status: r.aggregate ? 'not_applicable' : 'party_register_not_reviewed', continuous_series_eligible: false, provenance: [prov(SRC, page, ['registered_label_native'])] });
    out.election_results.push({ result_id: `er-${id}-r${ballot === SMC_R1_VOTE_2010 ? 1 : 2}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: ballot, valid_votes: ballot === SMC_R1_VOTE_2010 ? x.smc_round1_total : x.smc_round2_total, total_seats: 386, votes: r.votes, published_vote_share: null, derived_vote_share: (r.votes / (ballot === SMC_R1_VOTE_2010 ? x.smc_round1_total : x.smc_round2_total)) * 100, seats: null, constituency_seats: null, whole_chamber_seats: null, single_member_seats_won_final: x.smc_seats_final[r.label] ?? 0, ...(ballot === SMC_R1_VOTE_2010 ? { round1_seats: r.round1_seats ?? 0 } : { round2_seats_derived: r.seats_derived }), seat_scope: 'votes_only_seats_on_list_rows', seat_basis: 'votes-only ballot: national sum of single-member candidate votes per nominating organisation, as printed; seats are attributed on the territorial-list row of the same organisations or, without a list, outside the lists (legislature record)', published_seat_share: null, result_vintage: vintage, provenance: [prov(SRC, page, ['votes', ballot === SMC_R1_VOTE_2010 ? 'round1_seats' : 'round2_seats_derived'])] });
  });
  out.legislatures.push({ legislature_id: 'lg-hu-ogy-2010', country: 'hungary', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: 386, seat_count_basis: 'final_allocation_of_the_election_not_current_composition', seat_attribution: 'complete', national_list_seats: x.territorial_seats_total + x.compensation.seats_to_distribute, constituency_seats: 176, territorial_list_seats: x.territorial_seats_total, national_compensation_seats: x.compensation.seats_to_distribute, statutory_tiers: x.statutory_tiers, tier_transfer: { from: 'territorial lists', to: 'national compensation lists', seats: x.statutory_tiers.territorial_lists - x.territorial_seats_total, basis: x.rules_quoted.transfer }, constituency_seats_outside_lists: outside.map((r) => ({ label: r.attributed_to.startsWith('independent') ? 'Független' : r.attributed_to.split(' ')[0], kind: r.attributed_to.startsWith('independent') ? 'independent_candidate' : 'joint_candidates_without_list', seats: r.smc })), unmatched_national_lists: x.unmatched_national_lists, result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov(SRC, 'composition', ['total_seats', 'seat_attribution', 'national_list_seats', 'constituency_seats', 'constituency_seats_outside_lists']), prov(LAW1989, 'rules', ['statutory_tiers', 'tier_transfer'])] });
  const T = (en, zh) => t(en, zh);
  out.electoral_systems.push({ electoral_system_id: 'es-hu-ogy-2010', country: 'hungary', election_id: electionId, valid_from: x.rounds[0].date, valid_to: x.rounds[1].date, interval_basis: 'election-specific rule observation from the office\'s 2010 description of the seat allocation (mandleir); the statute (Act XXXIV of 1989) was not read', system_family: 'mixed, two rounds: 176 single-member constituencies, up to 152 territorial-list seats in 20 districts and at least 58 national compensation seats', vote_type: TERRITORIAL_VOTE_2010, allocation_method: 'territorial lists in 20 districts; national compensation seats by D\'Hondt over fragment votes', base_seats: 386,
    vote_definitions: [
      { id: TERRITORIAL_VOTE_2010, kind: 'list', label: T('Territorial-list votes (round 1)', '地区名单票（第一轮）'), denominator: 'valid_votes', seatScope: 'tier_only', tierSeats: x.territorial_seats_total + x.compensation.seats_to_distribute, sourceIds: [SRC, LAW1989] },
      { id: SMC_R1_VOTE_2010, kind: 'constituency', label: T('Single-member candidate votes, round 1 (national sum)', '单一选区候选人票，第一轮（全国合计）'), denominator: 'valid_votes', seatScope: 'unavailable', sourceIds: [SRC] },
      { id: SMC_R2_VOTE_2010, kind: 'constituency', label: T('Single-member candidate votes, round 2 (57 constituencies, national sum)', '单一选区候选人票，第二轮（57 个选区，全国合计）'), denominator: 'valid_votes', seatScope: 'unavailable', sourceIds: [SRC] },
    ],
    national_rules: { nationalAllocation: `National compensation lists: ${x.compensation.seats_to_distribute} seats (58 by statute plus ${x.statutory_tiers.territorial_lists - x.territorial_seats_total} territorial seats that could not be allocated) shared by D'Hondt over fragment votes (unused single-member votes of the first valid round plus unused territorial-list votes).`, districtAllocation: 'Single-member constituencies in up to two rounds: round 1 decides with more than half the valid votes and more than half the voters taking part; otherwise round 2 (25 April 2010) decides by plurality. Territorial lists in 20 districts among lists over the threshold.',
      thresholds: [
        { appliesTo: 'party list', percent: 5, description: T('A party list must exceed 5% of all territorial-list votes nationally (5,132,531 in 2010) to win territorial or national list seats.', '政党名单须在全国地区名单票（2010 年为 5,132,531 张）中超过 5%，方可获得地区或全国名单席位。'), sourceIds: [LAW1989, SRC] },
        { appliesTo: 'joint list of two parties', percent: 10, description: T('A joint list of two parties must reach 10% of the same total.', '两党联合名单须达到同一总数的 10%。'), sourceIds: [LAW1989, SRC] },
      ],
      minorityRepresentation: null,
      totalSeatsDefinition: T(`386 seats. By statute 176 single-member, up to 152 territorial-list and at least 58 national compensation seats; in 2010 the final allocation was 176 + 146 + 64, because ${x.statutory_tiers.territorial_lists - x.territorial_seats_total} territorial seats passed to the national lists. Each list row shows its territorial plus national list seats, its single-member seats (candidates of the same organisations) and their sum. Two single-member seats were won outside the lists: one by joint FIDESZ-KDNP-MVMP candidates and one by an independent candidate (not named).`, `386 席。法定为 176 个单一选区席位、最多 152 个地区名单席位和至少 58 个全国补偿席位；2010 年最终分配为 176 + 146 + 64，因为 ${x.statutory_tiers.territorial_lists - x.territorial_seats_total} 个地区席位转入全国名单。每个名单行显示其地区及全国名单席位、单一选区席位（同一组织提名的候选人）及两者之和。有 2 个单一选区席位不属于任何名单：1 个由 FIDESZ-KDNP-MVMP 联合候选人赢得，1 个由独立候选人赢得（不列姓名）。`), sourceIds: [LAW1989, SRC] },
    notes: T(`Mixed two-round system with 386 seats under Act XXXIV of 1989, different from the 199-seat system from 2014. Three ballots are kept apart: territorial-list votes (round 1, the list ballot shown by default), single-member candidate votes in round 1 and in round 2 (national sums per nominating organisation; votes only). Shares are computed within each ballot; ballots are never pooled. Round 2 was held only in 57 constituencies. Seat totals per list cover both list tiers and the single-member seats of candidates nominated by the same organisations; the office's threshold page splits the FIDESZ-KDNP list's votes in half only to test the threshold, and this split is not used. No list is linked to a later election.`, `386 席的两轮混合制（1989 年第 XXXIV 号法），与 2014 年起的 199 席制度不同。三种选票分开保存：地区名单票（第一轮，默认显示的名单票）、第一轮和第二轮的单一选区候选人票（按提名组织的全国合计，仅票数）。得票率在各选票内部计算，从不合并。第二轮只在 57 个选区举行。各名单的席位合计包括两个名单层级以及同一组织提名候选人赢得的单一选区席位；选举办公室的门槛页面仅为检验门槛而将 FIDESZ-KDNP 名单票平分，此处不采用该拆分。没有任何名单与后来的选举相连。`),
    provenance: [prov(LAW1989, 'rules', ['system_family', 'base_seats', 'national_rules']), prov(SRC, 'compensation', ['allocation_method'])] });
  out.political_source_registry.push({ source_id: SRC, country: 'hungary', institution: 'Nemzeti Választási Iroda (Országos Választási Iroda archive)', dataset: '2010. évi országgyűlési képviselő választás — national result pages, rounds 1 and 2 (summary, threshold, national totals, compensation, composition)', tier: 'tier1_official', url: x.pages.index_round2, licence_status: 'official_result_publication_section_1_4_copyright_act_owner_reading_no_licence', raw_redistribution: 'national figures and seat counts only; pages not saved; no candidate names', licence_url: rights, attribution: 'Nemzeti Választási Iroda', retrieved_at: at, raw_sha256: evidenceSha, raw_path: EVIDENCE, pages: x.pages, access: x.access });
  out.political_source_registry.push({ source_id: LAW1989, country: 'hungary', institution: 'Nemzeti Választási Iroda (Országos Választási Iroda archive)', dataset: 'Mandátumkiosztás leírása — 2010 description of the seat allocation (quoted clauses)', tier: 'tier1_official', url: x.pages.rules, licence_status: 'official_result_publication_section_1_4_copyright_act_owner_reading_no_licence', raw_redistribution: 'quoted_clauses_only', licence_url: rights, attribution: 'Nemzeti Választási Iroda', retrieved_at: at, raw_sha256: evidenceSha, raw_path: EVIDENCE, statute_not_read: 'Act XXXIV of 1989' });
  return checks;
}

export function buildHungary() {
  const buf = read(EVIDENCE);
  const evidence = JSON.parse(buf);
  const evidenceSha = sha(buf);
  const parserSha = sha(read('scripts/political-data/hungary/build-ogy-national.mjs'));
  const out = Object.fromEntries(HUNGARIAN_STORES.map((s) => [s, []]));
  const checks = {};
  const LAW = 'src-hu-act-ccIII-2011', rights = evidence.rights.statute.url;
  if (evidence.act_xxxiv_1989?.['2010']) checks['2010'] = build2010(evidence.act_xxxiv_1989['2010'], out, { evidenceSha, parserSha, rights });
  for (const year of YEARS) {
    const m = evidence.minutes[year];
    checks[year] = reconcile(m);
    const comp = evidence.chamber_composition?.[year] ?? null;
    const constituencyOf = comp ? reconcileComposition(m, comp) : null;
    if (comp) checks[year].wholeChamber = { constituency: 106, list: 93, total: 199 };
    const COMP = `src-hu-nvi-composition-${year}`;
    const short = year.slice(2), electionId = m.election_id, systemId = `es-hu-ogy-${year}`, legislatureId = `lg-hu-ogy-${year}`, SRC = `src-hu-nvb-minutes-${year}`;
    const minutesVintage = m.source_form === 'html_minutes_form'
      ? `final: National Election Commission minutes on the national list result as published in minutes form in the National Election Office archive, ${m.page_states} (votes and national list seats)`
      : m.drawn_up_on === null
        ? `final: National Election Commission minutes on the national list result as the annex to the Kúria's review decisions (votes and national list seats)`
        : `final: National Election Commission minutes on the national list result, drawn up on ${m.drawn_up_on} (votes and national list seats)`;
    const vintage = m.drawn_up_on === null
      ? `${minutesVintage}; National Election Office chamber-composition record, ${comp.page_states} (constituency and whole-chamber seats)`
      : comp
        ? `final: National Election Commission minutes on the national list result, drawn up on ${m.drawn_up_on} (votes and national list seats); National Election Office chamber-composition record, ${comp.page_states} (constituency and whole-chamber seats); the official application shows the result as legally final`
        : `final: National Election Commission minutes on the national list result, drawn up on ${m.drawn_up_on}; the official application shows the result as legally final`;
    const prov = (id, url, record, fields, at = m.retrieved_at) => ({ source_id: id, source_url: url, source_record_id: record, retrieved_at: at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'hungary-ogy-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
    const mp = (record, fields) => prov(SRC, m.url, record, fields);
    const cp = (record, fields) => prov(COMP, comp.url, record, fields, comp.read_at);
    const chamber = (ballot, row, listSeats) => comp
      ? { seat_scope: 'national_list_tier', constituency_seats: constituencyOf(ballot, row), whole_chamber_seats: listSeats + constituencyOf(ballot, row) }
      : { seat_scope: 'national_list_tier', constituency_seats: null, whole_chamber_seats: null };
    const compNote = comp ? "; constituency and whole-chamber seats from the election office's composition page, reconciled to 93 + 106 = 199" : '; constituency seats are not included';
    const lp = (fields) => prov(LAW, evidence.rules.source.url, 'Act CCIII of 2011 §§ 3, 13, 14, 16 (quoted)', fields, evidence.rules.source.retrieved_at);
    out.elections.push({ election_id: electionId, country: 'hungary', election_type: 'national_parliament', chamber: CHAMBER, date: m.polling_day, date_end: null, date_basis: m.polling_day_basis ?? 'heading of the official results application, read by hand; the minutes state when they were drawn up, not the polling day', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [mp('minutes, title', ['chamber', 'result_vintage'])] });
    const definition = 'Voters who took part (szavazó választópolgárok száma összesen) / voters on all registers (a választópolgárok száma összesen) × 100, computed from the minutes. The minutes print no percentage.';
    const allLists = { stamped_ballots: m.ballots.stamped_ballots, invalid_ballots: m.ballots.invalid, valid_ballots_party_and_nationality: m.ballots.valid };
    out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: PARTY_VOTE, result_vintage: vintage, eligible_voters: m.registers.total, voters: m.participation.total, valid_votes: m.party_list_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: (m.participation.total / m.registers.total) * 100, list_ballot_counts: allLists, turnout_definition: definition, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition, sourceIds: [SRC] }, provenance: [mp('minutes, registers, participation and party-list total', ['eligible_voters', 'voters', 'valid_votes', 'list_ballot_counts'])] });
    out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: NATIONALITY_VOTE, result_vintage: vintage, eligible_voters: null, voters: null, valid_votes: m.nationality_list_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: null, turnout_definition: null, provenance: [mp('minutes, nationality-list total', ['valid_votes'])] });
    for (const l of m.party_lists) {
      const id = `ct-hu-ogy${short}-p${String(l.row).padStart(2, '0')}`, joint = m.joint_party_list_rows.includes(l.row);
      out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: joint ? 'coalition' : 'party_list', native_list_type: joint ? 'közös pártlista' : 'önálló pártlista', kind_basis: m.kind_basis, list_number: l.row, minutes_list_id: l.id, ...(l.ballot_number !== undefined ? { ballot_number: l.ballot_number } : {}), registered_label_native: l.label, historical_display_label: l.label, display_label_rule: l.label_basis ? 'list name as printed in the minutes, without the personal name it begins with' : 'list name as printed in the minutes', ...(l.label_basis ? { label_basis: l.label_basis, printed_label_sha256: l.printed_label_sha256 } : {}), lead_party_id: null, party_relation_status: joint ? 'organisations_printed_in_the_list_name_only_no_vote_or_seat_attribution' : 'party_register_not_reviewed', continuous_series_eligible: false, provenance: [mp(`minutes, party list ${l.row}`, ['list_number', 'registered_label_native', 'minutes_list_id'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: PARTY_VOTE, valid_votes: m.party_list_total, total_seats: 199, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / m.party_list_total) * 100, seats: l.seats ?? 0, ...chamber('party', l.row, l.seats ?? 0), seat_basis: (l.seats !== undefined ? 'national list seats printed in the minutes' : 'no national list seat in the minutes, recorded as 0') + compNote, surplus_votes: l.surplus ?? null, votes_for_list_seat_allocation: l.total_for_allocation ?? null, published_seat_share: null, result_vintage: vintage, provenance: [mp(`minutes, party list ${l.row}`, ['votes', 'seats', 'surplus_votes', 'votes_for_list_seat_allocation']), ...(comp ? [cp(`composition page, party list ${l.row}`, ['constituency_seats', 'whole_chamber_seats'])] : [])] });
    }
    for (const l of m.nationality_lists) {
      const id = `ct-hu-ogy${short}-n${String(l.row).padStart(2, '0')}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: 'nationality_list', native_list_type: 'nemzetiségi lista', kind_basis: 'nationality-list table of the minutes', list_number: l.row, minutes_list_id: l.id, ...(l.ballot_number !== undefined ? { ballot_number: l.ballot_number } : {}), registered_label_native: l.label, historical_display_label: l.label, display_label_rule: 'list name as printed in the minutes', lead_party_id: null, party_relation_status: 'not_a_party', continuous_series_eligible: false, provenance: [mp(`minutes, nationality list ${l.row}`, ['list_number', 'registered_label_native', 'minutes_list_id'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: NATIONALITY_VOTE, valid_votes: m.nationality_list_total, total_seats: 199, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / m.nationality_list_total) * 100, seats: l.seats ?? 0, ...chamber('nationality', l.row, l.seats ?? 0), seat_basis: (l.preferential ? 'preferential nationality seat printed in the minutes' : 'no seat in the minutes, recorded as 0') + (comp ? '; a nationality list holds no constituency seat' : ''), surplus_votes: null, votes_for_list_seat_allocation: null, published_seat_share: null, result_vintage: vintage, provenance: [mp(`minutes, nationality list ${l.row}`, ['votes', 'seats']), ...(comp ? [cp(`composition page, nationality list ${l.row}`, ['constituency_seats', 'whole_chamber_seats'])] : [])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'hungary', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: 199, seat_count_basis: 'statutory_total_not_current_composition', seat_attribution: comp ? 'complete' : 'none', national_list_seats: comp ? 93 : null, constituency_seats: comp ? 106 : null, ...(comp && comp.independent_constituency_seats !== undefined ? { independent_constituency_seats: comp.independent_constituency_seats } : {}), result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [lp(['total_seats']), ...(comp ? [cp('composition page, totals', ['seat_attribution', 'national_list_seats', 'constituency_seats'])] : [])] });
    const preferentialNote = m.preferential_seats.length
      ? t('One nationality list reached the preferential quota and received one seat, leaving 92 seats for party lists.', '一个民族名单达到优惠配额并获得一席，政党名单分配其余 92 席。')
      : t('No nationality list reached the preferential quota, so all 93 list seats went to party lists.', '没有民族名单达到优惠配额，因此 93 个名单席位全部分配给政党名单。');
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'hungary', election_id: electionId, valid_from: m.polling_day, valid_to: m.polling_day, interval_basis: 'election-specific rule observation (Act CCIII of 2011, version read on the retrieval date; the minutes apply the same thresholds and method), not legal enactment dates', system_family: 'mixed: 106 single-member districts and 93 national list seats', vote_type: PARTY_VOTE, allocation_method: 'national list seats: highest averages over list votes plus surplus votes (§ 16)', base_seats: 199, vote_definitions: [
      { id: PARTY_VOTE, kind: 'list', label: t('Party-list votes', '政党名单票'), denominator: 'valid_votes', seatScope: 'tier_only', tierSeats: 93, sourceIds: [SRC, LAW] },
      { id: NATIONALITY_VOTE, kind: 'minority', label: t('Nationality-list votes', '民族名单票'), denominator: 'valid_votes', seatScope: 'tier_only', tierSeats: 93, sourceIds: [SRC, LAW] },
    ], national_rules: { nationalAllocation: 'List votes plus surplus votes (töredékszavazat) of qualifying party lists, shared out by highest averages (§ 16).', districtAllocation: 'One round in each of 106 single-member districts; the candidate with the most valid votes is elected (§ 13).' + (comp ? " District seats per list come from the National Election Office's chamber-composition record; district votes and per-district results are not held." : ' Results of this tier are not included.'), thresholds: [
      { appliesTo: 'party list', percent: 5, description: t('A party list below 5% of all valid party-list and nationality-list votes wins no list seat (§ 14(1)).', '政党名单得票低于政党名单和民族名单有效票总数的 5% 时，不获得名单席位（第 14 条第 1 款）。'), sourceIds: [LAW] },
      { appliesTo: 'joint party list of two parties', percent: 10, description: t('A joint list of two parties below 10% of the same total wins no list seat (§ 14(2)).', '两党联合名单低于同一总数的 10% 时，不获得名单席位（第 14 条第 2 款）。'), sourceIds: [LAW] },
      { appliesTo: 'joint party list of more than two parties', percent: 15, description: t('A joint list of more than two parties below 15% of the same total wins no list seat (§ 14(2)).', '两党以上联合名单低于同一总数的 15% 时，不获得名单席位（第 14 条第 2 款）。'), sourceIds: [LAW] },
    ], minorityRepresentation: t('A nationality list wins one preferential seat if its votes reach the quota: all national list votes ÷ 93 ÷ 4, whole part (§ 16(d) and (e)). Nationality lists are a separate ballot with their own denominator here.', '民族名单得票达到配额（全部全国名单票 ÷ 93 ÷ 4，取整数部分）时获得一个优惠席位（第 16 条 d、e 项）。此处民族名单是单独的选票，使用各自的分母。'), totalSeatsDefinition: comp ? t("199 seats by statute: 106 single-member districts and 93 national list seats (§ 3). Each list shows its national list seats (National Election Commission minutes), its district seats (National Election Office chamber-composition record) and their sum, the whole-chamber seats.", '法定 199 席：106 个单一选区席位和 93 个全国名单席位（第 3 条）。各名单显示全国名单席位（国家选举委员会会议记录）、选区席位（国家选举办公室议会构成记录）及两者之和，即全议院席位。') : t('199 seats by statute: 106 single-member districts and 93 national list seats (§ 3). Seats shown per list are national list seats only.', '法定 199 席：106 个单一选区席位和 93 个全国名单席位（第 3 条）。各名单显示的席位仅为全国名单席位。'), sourceIds: comp ? [LAW, SRC, COMP] : [LAW, SRC] }, notes: comp ? t(`Mixed system with 199 seats: 93 national list seats and 106 single-member district seats. Every seat is attributed here: list seats come from the minutes, district seats from the election office's composition page, and the two add up to 199. "National list seats" are the list tier only; "whole-chamber seats" add the district seats. Shares are computed here within each ballot. The election office's application prints shares over party-list and nationality-list votes together, so its figures differ. ${preferentialNote.en} A joint list's votes and seats, including the district seats of candidates nominated by the same organisations, are not divided among its organisations.`, `混合选制，共 199 席：93 个全国名单席位和 106 个单一选区席位。此处每个席位都已归属：名单席位来自会议记录，选区席位来自选举办公室的议会构成页面，两者合计 199 席。"全国名单席位"仅指名单层级；"全议院席位"另加选区席位。得票率在各选票内部计算。选举办公室的应用程序按政党名单票和民族名单票合计计算得票率，因此数字不同。${preferentialNote['zh-CN']}联合名单的票数和席位（包括由相同组织共同提名的候选人赢得的选区席位）不分配给其各组织。`) : t(`Mixed system with 199 seats. The list and seat figures here cover only the national list tier: 93 of the 199 seats. Seats won in the 106 single-member districts are not shown for any list, so these figures do not show which list won the most seats overall. Shares are computed here within each ballot. The election office's application prints shares over party-list and nationality-list votes together, so its figures differ. ${preferentialNote.en} A joint list's votes and seats are not divided among its organisations.`, `混合选制，共 199 席。此处的名单和席位数字仅涵盖全国名单层级，即 199 席中的 93 席。任何名单都不显示 106 个单一选区赢得的席位，因此这些数字不能说明哪个名单赢得的总席位最多。得票率在各选票内部计算。选举办公室的应用程序按政党名单票和民族名单票合计计算得票率，因此数字不同。${preferentialNote['zh-CN']}联合名单的票数和席位不分配给其各组织。`), provenance: [lp(['system_family', 'allocation_method', 'base_seats', 'national_rules']), mp('minutes', ['notes'])] });
    const independent = comp?.independent_constituency_seats ?? 0;
    if (independent) {
      const sys = out.electoral_systems.at(-1);
      sys.notes = t(`${sys.notes.en} ${independent === 1 ? 'One district seat was' : `${independent} district seats were`} won by an independent candidate: counted in the 106 district seats and the 199, attributed to no list, and not named.`, `${sys.notes['zh-CN']}${independent} 个选区席位由独立候选人赢得：计入 106 个选区席位和 199 席，不归属任何名单，也不列出姓名。`);
    }
    out.political_source_registry.push({ source_id: SRC, country: 'hungary', institution: 'Nemzeti Választási Bizottság', dataset: m.title, tier: 'tier1_official', url: m.url, licence_status: 'official_document_section_1_4_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_only_pdf_and_names_not_redistributed', licence_url: rights, attribution: 'Nemzeti Választási Bizottság', retrieved_at: m.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, ...(m.pdf_sha256 ? { publisher_pdf_sha256: m.pdf_sha256 } : { publisher_pages: [m.url, ...Object.values(m.allocation_pages ?? {})], access: 'read by hand once in a browser; no scanned minutes are linked for this election' }) });
  }
  for (const year of YEARS) {
    const comp = evidence.chamber_composition?.[year];
    if (comp) out.political_source_registry.push({ source_id: `src-hu-nvi-composition-${year}`, country: 'hungary', institution: 'Nemzeti Választási Iroda', dataset: comp.page_heading, tier: 'tier1_official', url: comp.url, licence_status: 'official_result_publication_section_1_4_copyright_act_owner_reading_no_licence', licence_url: evidence.rights.statute.url, retrieved_at: comp.read_at, raw_path: EVIDENCE, raw_sha256: sha(read(EVIDENCE)), raw_record: `chamber_composition.${year}`, access: 'read by hand once in a browser; the page is built in the browser and its data endpoints were not requested', use: 'constituency and whole-chamber seat counts of the lists in the minutes, only after reconciliation', not_used: 'candidate names, constituency-level results and any per-district figure' });
  }
  out.political_source_registry.push({ source_id: LAW, country: 'hungary', institution: 'Nemzeti Jogszabálytár', dataset: 'Act CCIII of 2011 §§ 3, 13, 14, 16 (quoted clauses)', tier: 'tier1_official', url: evidence.rules.source.url, licence_status: 'statute_not_subject_to_copyright', raw_redistribution: 'quoted_clauses_only', licence_url: rights, attribution: 'Nemzeti Jogszabálytár', retrieved_at: evidence.rules.source.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE });
  return { ...out, checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function hungaryFiles(data) {
  const files = {};
  for (const store of HUNGARIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  const whole = YEARS.every((y) => data.legislatures.find((l) => l.election_id.includes(`-${y}-`))?.seat_attribution === 'complete');
  files[`${EXPORT_DIR}/README.md`] = whole ? '# Hungary — National Assembly elections of 2010, 2014, 2018, 2022 and 2026\n\n## 2010 (Act XXXIV of 1989)\n\n386 seats in two rounds (11 and 25 April 2010) and three tiers: by statute 176 single-member, up to 152 territorial-list and at least 58 national compensation seats; the final allocation was 176 + 146 + 64 because 6 territorial seats passed to the national lists. Three ballots are kept apart, each with its own total: territorial-list votes (round 1; `hu10_territorial_list_vote`), and national sums of single-member candidate votes per nominating organisation in round 1 and round 2 (`hu10_smc_round1_vote`, `hu10_smc_round2_vote`; votes only, `seats` null). Each territorial-list row holds `territorial_list_seats`, `national_list_seats` (compensation, recomputed by D\'Hondt over the printed fragment votes), `constituency_seats` (single-member seats of candidates nominated by the same organisations) and `whole_chamber_seats`. Two single-member seats were won outside the lists (joint FIDESZ-KDNP-MVMP candidates; one independent): see `constituency_seats_outside_lists` in the legislature record. Turnout is the printed round-1 figure (64.38%); round 2 (57 constituencies, 46.66%) is in `round_2`. Sources: the National Election Office\'s 2010 archive pages (round summaries, threshold, national totals, compensation, composition) and its description of the seat allocation, read once each by hand; national figures only, no per-constituency rows, no candidate names. One single-member organisation label containing a person\'s name is stored without it.\n\n## 2014–2026 (Act CCIII of 2011)\n\nFour elections under Act CCIII of 2011: party lists and nationality lists with their numbers, votes, national list seats, single-member constituency seats and whole-chamber seats; voters on all registers, voters who took part, and ballot counts. Sources: minutes of the National Election Commission on the national list result, transcribed from PDFs identified by checksum (2018: the minutes printed as the annex to the Kúria\'s review decisions; 2014: the same minutes published only as an HTML page in minutes form, with the threshold and seat-calculation pages of the same archive, read by hand once); the election office\'s composition page of each election for constituency seats, read by hand once. Rules: Act CCIII of 2011.\n\nSeat scopes: `seats` are national list seats (`seat_scope` = `national_list_tier`, 93 seats in all). `constituency_seats` are single-member district seats (106 in all). `whole_chamber_seats` = `seats` + `constituency_seats` (199 in all). Divide `seats` by 93 for a list-tier share and `whole_chamber_seats` by 199 for whole-chamber representation; `seats` ÷ 199 describes neither. Every one of the 199 seats is attributed: each composition row is matched to the list of the minutes nominated by the same organisations, its list seats must equal the minutes, and the build fails otherwise. A nationality list holds no constituency seat. In 2018 one constituency seat was won by an independent candidate: it is counted in `independent_constituency_seats` of the legislature record, attributed to no list, and not named.\n\nDenominators: party-list and nationality-list votes are separate ballots, each with its own total. `derived_vote_share` is computed within one ballot. The election office\'s application prints shares over both ballots together, so its figures differ. `surplus_votes` and `votes_for_list_seat_allocation` are the seat-allocation inputs in the minutes and are never added to `votes`. Constituency votes are not held. Turnout is computed from the counts in the minutes, because they print no percentage.\n\nRights basis: Copyright Act (Act LXXVI of 1999) § 1(4), official notices and case documents, for minutes whose content the National Election Office must publish under Act XXXVI of 2013 § 76(2)(e), extended by the owner on 2026-11-06 to the office\'s official composition pages for aggregate seat counts only. This is a reading of the statute accepted by the owner, not a statement by the office, and no licence exists. The office\'s Impresszum is on a host that disallows robots and was not read. National figures only.\n\nA joint list\'s votes and seats, including the constituency seats of candidates nominated by the same organisations, belong to the joint list and are never divided among its organisations. The list kind comes from the printed name and the official application; for 2022 no official joint-list label was read.\n\ncontinuous_party_series is 0: the minutes give each nominating organisation an identifier specific to one election, joint lists are election-specific, and no party register was reviewed, so no link is made between elections, even where a name repeats. 2014 list names are abbreviations as printed; one 2014 list name that begins with a person\'s name is stored without it (`label_basis`, `printed_label_sha256`).\n\nNot included: 2006 and earlier, constituency votes and per-district results, county results, candidates, elected deputies, and the application\'s CSV.\n' : '# Hungary — National Assembly elections of 2022 and 2026 (national list tier)\n\nTwo elections: party lists and nationality lists with their numbers, votes and national list seats; voters on all registers, voters who took part, and ballot counts. Source: minutes of the National Election Commission on the national list result, transcribed from scanned PDFs identified by checksum. Rules: Act CCIII of 2011.\n\nCoverage: these figures cover the national list tier only, 93 of 199 seats. Seats and votes in the 106 single-member districts are not included, so nothing here shows which list won the most seats overall.\n\nDenominators: party-list and nationality-list votes are separate ballots, each with its own total. `derived_vote_share` is computed within one ballot. The election office\'s application prints shares over both ballots together, so its figures differ. `surplus_votes` and `votes_for_list_seat_allocation` are the seat-allocation inputs in the minutes and are never added to `votes`. Turnout is computed from the counts in the minutes, because they print no percentage.\n\nRights basis: Copyright Act (Act LXXVI of 1999) § 1(4), official notices and case documents, for minutes whose content the National Election Office must publish under Act XXXVI of 2013 § 76(2)(e). This is a reading of the statute accepted by the owner, not a statement by the office, and no licence exists. The office\'s Impresszum is on a host that disallows robots and was not read. National figures only.\n\nA joint list\'s votes and seats belong to the joint list. The list kind comes from the printed name and the official application; for 2022 no official joint-list label was read.\n\ncontinuous_party_series is 0: no party register was reviewed, so no link is made between the two elections, even where a name repeats.\n\nNot included: 2018 and earlier, constituency results, county results, candidates, elected deputies, and the application\'s CSV.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'hungary-political-export-v1', country: 'hungary', elections: data.elections.map((e) => e.election_id), coverage: whole ? 'whole_chamber_all_seats_attributed_386_in_2010_199_from_2014' : 'national_list_tier_93_of_199_seats', seat_scopes: whole ? { seats: 'national list tier (93; 2010: territorial + national lists, 210)', constituency_seats: 'single-member constituencies (106; 2010: 176)', whole_chamber_seats: 'whole chamber (199; 2010: 386)' } : { seats: 'national_list_tier (93)' }, continuous_party_series: 0, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildHungary();
  const files = hungaryFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Hungary stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
