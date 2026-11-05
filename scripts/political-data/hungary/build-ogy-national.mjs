// Hungary — National Assembly elections of 2026 and 2022. Built only from the committed transcription of the
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
  check(m.participation.at_polling_stations + m.participation.transfer_and_foreign_envelopes + m.participation.valid_postal_documents === m.participation.total, 'participation ≠ printed total');
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
  check(m.constituency_minutes_summarised === 106, 'constituency minutes ≠ 106');
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
  check(total('constituency_seats') === 106 && comp.printed_totals.constituency_seats === 106, 'constituency seats ≠ 106');
  check(total('list_seats') === 93 && comp.printed_totals.list_seats === 93, 'list seats ≠ 93');
  check(total('total_seats') === 199 && comp.printed_totals.total_seats === 199, 'seats ≠ 199');
  check(comp.unattributed_seats === 0, 'seats held outside the lists of the minutes');
  return (ballot, row) => constituency.get(`${ballot}:${row}`) ?? 0;
}

export function buildHungary() {
  const buf = read(EVIDENCE);
  const evidence = JSON.parse(buf);
  const evidenceSha = sha(buf);
  const parserSha = sha(read('scripts/political-data/hungary/build-ogy-national.mjs'));
  const out = Object.fromEntries(HUNGARIAN_STORES.map((s) => [s, []]));
  const checks = {};
  const LAW = 'src-hu-act-ccIII-2011', rights = evidence.rights.statute.url;
  for (const year of ['2022', '2026']) {
    const m = evidence.minutes[year];
    checks[year] = reconcile(m);
    const comp = evidence.chamber_composition?.[year] ?? null;
    const constituencyOf = comp ? reconcileComposition(m, comp) : null;
    if (comp) checks[year].wholeChamber = { constituency: 106, list: 93, total: 199 };
    const COMP = `src-hu-nvi-composition-${year}`;
    const short = year.slice(2), electionId = m.election_id, systemId = `es-hu-ogy-${year}`, legislatureId = `lg-hu-ogy-${year}`, SRC = `src-hu-nvb-minutes-${year}`;
    const vintage = `final: National Election Commission minutes on the national list result, drawn up on ${m.drawn_up_on}; the official application shows the result as legally final`;
    const prov = (id, url, record, fields, at = m.retrieved_at) => ({ source_id: id, source_url: url, source_record_id: record, retrieved_at: at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'hungary-ogy-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
    const mp = (record, fields) => prov(SRC, m.url, record, fields);
    const cp = (record, fields) => prov(COMP, comp.url, record, fields, comp.read_at);
    const chamber = (ballot, row, listSeats) => comp
      ? { seat_scope: 'national_list_tier', constituency_seats: constituencyOf(ballot, row), whole_chamber_seats: listSeats + constituencyOf(ballot, row) }
      : { seat_scope: 'national_list_tier', constituency_seats: null, whole_chamber_seats: null };
    const compNote = comp ? "; constituency and whole-chamber seats from the election office's composition page, reconciled to 93 + 106 = 199" : '; constituency seats are not included';
    const lp = (fields) => prov(LAW, evidence.rules.source.url, 'Act CCIII of 2011 §§ 3, 13, 14, 16 (quoted)', fields, evidence.rules.source.retrieved_at);
    out.elections.push({ election_id: electionId, country: 'hungary', election_type: 'national_parliament', chamber: CHAMBER, date: m.polling_day, date_end: null, date_basis: 'heading of the official results application, read by hand; the minutes state when they were drawn up, not the polling day', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [mp('minutes, title', ['chamber', 'result_vintage'])] });
    const definition = 'Voters who took part (szavazó választópolgárok száma összesen) / voters on all registers (a választópolgárok száma összesen) × 100, computed from the minutes. The minutes print no percentage.';
    const allLists = { stamped_ballots: m.ballots.stamped_ballots, invalid_ballots: m.ballots.invalid, valid_ballots_party_and_nationality: m.ballots.valid };
    out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: PARTY_VOTE, result_vintage: vintage, eligible_voters: m.registers.total, voters: m.participation.total, valid_votes: m.party_list_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: (m.participation.total / m.registers.total) * 100, list_ballot_counts: allLists, turnout_definition: definition, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition, sourceIds: [SRC] }, provenance: [mp('minutes, registers, participation and party-list total', ['eligible_voters', 'voters', 'valid_votes', 'list_ballot_counts'])] });
    out.election_turnout.push({ election_id: electionId, country: 'hungary', geography: 'national', vote_type: NATIONALITY_VOTE, result_vintage: vintage, eligible_voters: null, voters: null, valid_votes: m.nationality_list_total, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: null, turnout_definition: null, provenance: [mp('minutes, nationality-list total', ['valid_votes'])] });
    for (const l of m.party_lists) {
      const id = `ct-hu-ogy${short}-p${String(l.row).padStart(2, '0')}`, joint = m.joint_party_list_rows.includes(l.row);
      out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: joint ? 'coalition' : 'party_list', native_list_type: joint ? 'közös pártlista' : 'önálló pártlista', kind_basis: m.kind_basis, list_number: l.row, minutes_list_id: l.id, registered_label_native: l.label, historical_display_label: l.label, display_label_rule: 'list name as printed in the minutes', lead_party_id: null, party_relation_status: joint ? 'organisations_printed_in_the_list_name_only_no_vote_or_seat_attribution' : 'party_register_not_reviewed', continuous_series_eligible: false, provenance: [mp(`minutes, party list ${l.row}`, ['list_number', 'registered_label_native', 'minutes_list_id'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: PARTY_VOTE, valid_votes: m.party_list_total, total_seats: 199, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / m.party_list_total) * 100, seats: l.seats ?? 0, ...chamber('party', l.row, l.seats ?? 0), seat_basis: (l.seats !== undefined ? 'national list seats printed in the minutes' : 'no national list seat in the minutes, recorded as 0') + compNote, surplus_votes: l.surplus ?? null, votes_for_list_seat_allocation: l.total_for_allocation ?? null, published_seat_share: null, result_vintage: vintage, provenance: [mp(`minutes, party list ${l.row}`, ['votes', 'seats', 'surplus_votes', 'votes_for_list_seat_allocation']), ...(comp ? [cp(`composition page, party list ${l.row}`, ['constituency_seats', 'whole_chamber_seats'])] : [])] });
    }
    for (const l of m.nationality_lists) {
      const id = `ct-hu-ogy${short}-n${String(l.row).padStart(2, '0')}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'hungary', election_id: electionId, contestant_kind: 'nationality_list', native_list_type: 'nemzetiségi lista', kind_basis: 'nationality-list table of the minutes', list_number: l.row, minutes_list_id: l.id, registered_label_native: l.label, historical_display_label: l.label, display_label_rule: 'list name as printed in the minutes', lead_party_id: null, party_relation_status: 'not_a_party', continuous_series_eligible: false, provenance: [mp(`minutes, nationality list ${l.row}`, ['list_number', 'registered_label_native', 'minutes_list_id'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'hungary', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: NATIONALITY_VOTE, valid_votes: m.nationality_list_total, total_seats: 199, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / m.nationality_list_total) * 100, seats: l.seats ?? 0, ...chamber('nationality', l.row, l.seats ?? 0), seat_basis: (l.preferential ? 'preferential nationality seat printed in the minutes' : 'no seat in the minutes, recorded as 0') + (comp ? '; a nationality list holds no constituency seat' : ''), surplus_votes: null, votes_for_list_seat_allocation: null, published_seat_share: null, result_vintage: vintage, provenance: [mp(`minutes, nationality list ${l.row}`, ['votes', 'seats']), ...(comp ? [cp(`composition page, nationality list ${l.row}`, ['constituency_seats', 'whole_chamber_seats'])] : [])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'hungary', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: 199, seat_count_basis: 'statutory_total_not_current_composition', seat_attribution: comp ? 'complete' : 'none', national_list_seats: comp ? 93 : null, constituency_seats: comp ? 106 : null, result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [lp(['total_seats']), ...(comp ? [cp('composition page, totals', ['seat_attribution', 'national_list_seats', 'constituency_seats'])] : [])] });
    const preferentialNote = m.preferential_seats.length
      ? t('One nationality list reached the preferential quota and received one seat, leaving 92 seats for party lists.', '一个民族名单达到优惠配额并获得一席，政党名单分配其余 92 席。')
      : t('No nationality list reached the preferential quota, so all 93 list seats went to party lists.', '没有民族名单达到优惠配额，因此 93 个名单席位全部分配给政党名单。');
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'hungary', election_id: electionId, valid_from: m.polling_day, valid_to: m.polling_day, interval_basis: 'election-specific rule observation (Act CCIII of 2011, version read on the retrieval date; the minutes apply the same thresholds and method), not legal enactment dates', system_family: 'mixed: 106 single-member districts and 93 national list seats', vote_type: PARTY_VOTE, allocation_method: 'national list seats: highest averages over list votes plus surplus votes (§ 16)', base_seats: 199, vote_definitions: [
      { id: PARTY_VOTE, kind: 'list', label: t('Party-list votes', '政党名单票'), denominator: 'valid_votes', seatScope: 'tier_only', tierSeats: 93, sourceIds: [SRC, LAW] },
      { id: NATIONALITY_VOTE, kind: 'minority', label: t('Nationality-list votes', '民族名单票'), denominator: 'valid_votes', seatScope: 'tier_only', tierSeats: 93, sourceIds: [SRC, LAW] },
    ], national_rules: { nationalAllocation: 'List votes plus surplus votes (töredékszavazat) of qualifying party lists, shared out by highest averages (§ 16).', districtAllocation: 'One round in each of 106 single-member districts; the candidate with the most valid votes is elected (§ 13). Results of this tier are not included.', thresholds: [
      { appliesTo: 'party list', percent: 5, description: t('A party list below 5% of all valid party-list and nationality-list votes wins no list seat (§ 14(1)).', '政党名单得票低于政党名单和民族名单有效票总数的 5% 时，不获得名单席位（第 14 条第 1 款）。'), sourceIds: [LAW] },
      { appliesTo: 'joint party list of two parties', percent: 10, description: t('A joint list of two parties below 10% of the same total wins no list seat (§ 14(2)).', '两党联合名单低于同一总数的 10% 时，不获得名单席位（第 14 条第 2 款）。'), sourceIds: [LAW] },
      { appliesTo: 'joint party list of more than two parties', percent: 15, description: t('A joint list of more than two parties below 15% of the same total wins no list seat (§ 14(2)).', '两党以上联合名单低于同一总数的 15% 时，不获得名单席位（第 14 条第 2 款）。'), sourceIds: [LAW] },
    ], minorityRepresentation: t('A nationality list wins one preferential seat if its votes reach the quota: all national list votes ÷ 93 ÷ 4, whole part (§ 16(d) and (e)). Nationality lists are a separate ballot with their own denominator here.', '民族名单得票达到配额（全部全国名单票 ÷ 93 ÷ 4，取整数部分）时获得一个优惠席位（第 16 条 d、e 项）。此处民族名单是单独的选票，使用各自的分母。'), totalSeatsDefinition: t('199 seats by statute: 106 single-member districts and 93 national list seats (§ 3). Seats shown per list are national list seats only.', '法定 199 席：106 个单一选区席位和 93 个全国名单席位（第 3 条）。各名单显示的席位仅为全国名单席位。'), sourceIds: [LAW, SRC] }, notes: comp ? t(`Mixed system with 199 seats: 93 national list seats and 106 single-member district seats. Every seat is attributed here: list seats come from the minutes, district seats from the election office's composition page, and the two add up to 199. "National list seats" are the list tier only; "whole-chamber seats" add the district seats. Shares are computed here within each ballot. The election office's application prints shares over party-list and nationality-list votes together, so its figures differ. ${preferentialNote.en} A joint list's votes and seats, including the district seats of candidates nominated by the same organisations, are not divided among its organisations.`, `混合选制，共 199 席：93 个全国名单席位和 106 个单一选区席位。此处每个席位都已归属：名单席位来自会议记录，选区席位来自选举办公室的议会构成页面，两者合计 199 席。"全国名单席位"仅指名单层级；"全议院席位"另加选区席位。得票率在各选票内部计算。选举办公室的应用程序按政党名单票和民族名单票合计计算得票率，因此数字不同。${preferentialNote['zh-CN']}联合名单的票数和席位（包括由相同组织共同提名的候选人赢得的选区席位）不分配给其各组织。`) : t(`Mixed system with 199 seats. The list and seat figures here cover only the national list tier: 93 of the 199 seats. Seats won in the 106 single-member districts are not shown for any list, so these figures do not show which list won the most seats overall. Shares are computed here within each ballot. The election office's application prints shares over party-list and nationality-list votes together, so its figures differ. ${preferentialNote.en} A joint list's votes and seats are not divided among its organisations.`, `混合选制，共 199 席。此处的名单和席位数字仅涵盖全国名单层级，即 199 席中的 93 席。任何名单都不显示 106 个单一选区赢得的席位，因此这些数字不能说明哪个名单赢得的总席位最多。得票率在各选票内部计算。选举办公室的应用程序按政党名单票和民族名单票合计计算得票率，因此数字不同。${preferentialNote['zh-CN']}联合名单的票数和席位不分配给其各组织。`), provenance: [lp(['system_family', 'allocation_method', 'base_seats', 'national_rules']), mp('minutes', ['notes'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'hungary', institution: 'Nemzeti Választási Bizottság', dataset: m.title, tier: 'tier1_official', url: m.url, licence_status: 'official_document_section_1_4_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_only_pdf_and_names_not_redistributed', licence_url: rights, attribution: 'Nemzeti Választási Bizottság', retrieved_at: m.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_pdf_sha256: m.pdf_sha256 });
  }
  for (const year of ['2022', '2026']) {
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
  const whole = ['2022', '2026'].every((y) => data.legislatures.find((l) => l.election_id.includes(`-${y}-`))?.seat_attribution === 'complete');
  files[`${EXPORT_DIR}/README.md`] = whole ? '# Hungary — National Assembly elections of 2022 and 2026\n\nTwo elections: party lists and nationality lists with their numbers, votes, national list seats, single-member constituency seats and whole-chamber seats; voters on all registers, voters who took part, and ballot counts. Sources: minutes of the National Election Commission on the national list result, transcribed from scanned PDFs identified by checksum; the election office\'s composition page of each election for constituency seats, read by hand once. Rules: Act CCIII of 2011.\n\nSeat scopes: `seats` are national list seats (`seat_scope` = `national_list_tier`, 93 seats in all). `constituency_seats` are single-member district seats (106 in all). `whole_chamber_seats` = `seats` + `constituency_seats` (199 in all). Divide `seats` by 93 for a list-tier share and `whole_chamber_seats` by 199 for whole-chamber representation; `seats` ÷ 199 describes neither. Every one of the 199 seats is attributed: each composition row is matched to the list of the minutes nominated by the same organisations, its list seats must equal the minutes, and the build fails otherwise. A nationality list holds no constituency seat.\n\nDenominators: party-list and nationality-list votes are separate ballots, each with its own total. `derived_vote_share` is computed within one ballot. The election office\'s application prints shares over both ballots together, so its figures differ. `surplus_votes` and `votes_for_list_seat_allocation` are the seat-allocation inputs in the minutes and are never added to `votes`. Constituency votes are not held. Turnout is computed from the counts in the minutes, because they print no percentage.\n\nRights basis: Copyright Act (Act LXXVI of 1999) § 1(4), official notices and case documents, for minutes whose content the National Election Office must publish under Act XXXVI of 2013 § 76(2)(e), extended by the owner on 2026-11-06 to the office\'s official composition pages for aggregate seat counts only. This is a reading of the statute accepted by the owner, not a statement by the office, and no licence exists. The office\'s Impresszum is on a host that disallows robots and was not read. National figures only.\n\nA joint list\'s votes and seats, including the constituency seats of candidates nominated by the same organisations, belong to the joint list and are never divided among its organisations. The list kind comes from the printed name and the official application; for 2022 no official joint-list label was read.\n\ncontinuous_party_series is 0: the minutes give each nominating organisation an identifier specific to one election, joint lists are election-specific, and no party register was reviewed, so no link is made between the two elections, even where a name repeats.\n\nNot included: 2018 and earlier, constituency votes and per-district results, county results, candidates, elected deputies, and the application\'s CSV.\n' : '# Hungary — National Assembly elections of 2022 and 2026 (national list tier)\n\nTwo elections: party lists and nationality lists with their numbers, votes and national list seats; voters on all registers, voters who took part, and ballot counts. Source: minutes of the National Election Commission on the national list result, transcribed from scanned PDFs identified by checksum. Rules: Act CCIII of 2011.\n\nCoverage: these figures cover the national list tier only, 93 of 199 seats. Seats and votes in the 106 single-member districts are not included, so nothing here shows which list won the most seats overall.\n\nDenominators: party-list and nationality-list votes are separate ballots, each with its own total. `derived_vote_share` is computed within one ballot. The election office\'s application prints shares over both ballots together, so its figures differ. `surplus_votes` and `votes_for_list_seat_allocation` are the seat-allocation inputs in the minutes and are never added to `votes`. Turnout is computed from the counts in the minutes, because they print no percentage.\n\nRights basis: Copyright Act (Act LXXVI of 1999) § 1(4), official notices and case documents, for minutes whose content the National Election Office must publish under Act XXXVI of 2013 § 76(2)(e). This is a reading of the statute accepted by the owner, not a statement by the office, and no licence exists. The office\'s Impresszum is on a host that disallows robots and was not read. National figures only.\n\nA joint list\'s votes and seats belong to the joint list. The list kind comes from the printed name and the official application; for 2022 no official joint-list label was read.\n\ncontinuous_party_series is 0: no party register was reviewed, so no link is made between the two elections, even where a name repeats.\n\nNot included: 2018 and earlier, constituency results, county results, candidates, elected deputies, and the application\'s CSV.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'hungary-political-export-v1', country: 'hungary', elections: data.elections.map((e) => e.election_id), coverage: whole ? 'whole_chamber_199_of_199_seats_attributed' : 'national_list_tier_93_of_199_seats', seat_scopes: whole ? { seats: 'national_list_tier (93)', constituency_seats: 'single-member constituencies (106)', whole_chamber_seats: 'whole chamber (199)' } : { seats: 'national_list_tier (93)' }, continuous_party_series: 0, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildHungary();
  const files = hungaryFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Hungary stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
