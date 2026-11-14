// Serbia — National Assembly (Народна скупштина) elections of 2020 and 2026 (owner decision C, 2026-11-15: "选 b，两个都做").
// Built only from the committed transcription of the Republic Electoral Commission's total-results reports
// (docs/political-data/raw/serbia/nsk/evidence.json). Fail-closed: list votes must equal valid ballots, invalid plus
// valid must equal the printed ballot count, seats must total 250, and the highest-quotient allocation with the 3%
// threshold and the 35% national-minority quotient increase (Art. 128-140) must reproduce the printed seats.
// List labels follow owner rule (b): full titles (which usually contain personal names) are never stored; a title that
// names no person is kept verbatim, otherwise only the parties named in it, otherwise the row number only.
// No link is made between elections and no list is attributed to a party.
//
// Usage: node scripts/political-data/serbia/build-nsk-national.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/serbia/nsk/evidence.json';
const STORE_DIR = 'src/data/political/serbia';
const EXPORT_DIR = 'public/research-data/political/serbia';
export const SERBIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
export const LIST_VOTE = 'rs_list_vote';
const CHAMBER = 'Народна скупштина';
const SEATS = 250;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Serbia build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, key = 'votes') => rows.reduce((n, r) => n + (r[key] ?? 0), 0);

/** Highest quotients (Art. 129) with national-minority quotients below the threshold increased by 35% (Art. 140). */
export function highestQuotients(lists, seats) {
  const won = lists.map(() => 0);
  for (let i = 0; i < seats; i += 1) {
    const q = lists.map((l, k) => (l.votes / (won[k] + 1)) * (l.boost ? 1.35 : 1));
    const best = Math.max(...q);
    if (q.filter((x) => x === best).length > 1) fail('tie in the seat allocation');
    won[q.indexOf(best)] += 1;
  }
  return won;
}

export function reconcile(year, m) {
  const check = (ok, what) => { if (!ok) fail(`${year}: ${what}`); };
  const tot = m.totals;
  check(sum(m.lists) === tot.valid, 'list votes ≠ valid ballots');
  check(sum(m.lists, 'seats') === SEATS, 'seats ≠ 250');
  check(m.lists.every((l, i) => l.row === i + 1), 'rows not consecutive');
  check(new Set(m.lists.map((l) => l.title_sha256)).size === m.lists.length, 'duplicate list titles');
  if (year === '2020') {
    check(tot.invalid + tot.valid === tot.ballots_used, 'invalid plus valid ≠ ballots used');
    check(tot.voted + tot.ballots_unused === tot.ballots_received, 'voters who voted plus unused ballots ≠ ballots received');
    check(tot.ballots_used <= tot.voted, 'ballots used > voters who voted');
  } else {
    check(tot.invalid + tot.valid === tot.voted, 'invalid plus valid ≠ voters who voted');
    check(tot.voted <= tot.turned_out, 'voters who voted > voters who turned out');
  }
  // Consistency check: lists at or above 3% of voters who voted take part; below-threshold lists that hold seats are
  // treated as national-minority lists (status decided by RIK, not printed in the report, not stored).
  const threshold = 0.03 * tot.voted;
  const taking = m.lists.filter((l) => l.votes >= threshold || l.seats > 0).map((l) => ({ ...l, boost: l.votes < threshold }));
  const won = highestQuotients(taking, SEATS);
  check(won.join() === taking.map((l) => l.seats).join(), `recomputed seats ${won} differ from the report`);
  check(m.lists.filter((l) => !taking.some((x) => x.row === l.row)).every((l) => l.seats === 0), 'a list outside the allocation holds seats');
  return { lists: m.lists.length, valid: tot.valid, voted: tot.voted, registered: tot.registered_voters, seats: SEATS, threshold_votes: Math.ceil(threshold), lists_in_allocation: taking.length, minority_quotient_increase_applied_to: taking.filter((l) => l.boost).length };
}

const LABEL_RULE = {
  verbatim: 'title as printed (it names no person)',
  named_parties: 'parties named in the printed title only; the title contains personal names and is not stored',
  row_only: 'no label: the printed title contains personal names and names no party',
};

export function buildSerbia() {
  const buf = read(EVIDENCE);
  const evidence = JSON.parse(buf);
  const evidenceSha = sha(buf);
  const parserSha = sha(read('scripts/political-data/serbia/build-nsk-national.mjs'));
  const out = Object.fromEntries(SERBIAN_STORES.map((s) => [s, []]));
  const checks = {};
  const LAW = 'src-rs-law-election-mps-2022', COPYRIGHT = evidence.rights.statute.url;
  for (const year of ['2020', '2026']) {
    const m = evidence.elections[year];
    checks[year] = reconcile(year, m);
    const short = year.slice(2), electionId = m.election_id, systemId = `es-rs-nsk-${year}`, legislatureId = `lg-rs-nsk-${year}`, SRC = `src-rs-rik-total-${year}`;
    const vintage = `final: Republic Electoral Commission total-results report adopted on ${m.adopted_on} (polling on ${m.polling_day}, repeated at ${m.repeat_poll_scope} on ${m.repeat_poll_date})`;
    const prov = (id, url, record, fields, at = m.retrieved_at) => ({ source_id: id, source_url: url, source_record_id: record, retrieved_at: at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'serbia-nsk-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
    const rp = (record, fields) => prov(SRC, m.source_url, record, fields);
    const lp = (fields) => prov(LAW, evidence.rules.source.url, 'Law on the Election of Members of Parliament, Arts. 5, 128, 129, 140 (quoted)', fields, evidence.rules.source.retrieved_at);
    out.elections.push({ election_id: electionId, country: 'serbia', election_type: 'national_parliament', chamber: CHAMBER, date: m.polling_day, date_end: null, date_basis: 'polling day stated in the total-results report', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: m.repeat_poll_date, provenance: [rp('report, heading', ['date', 'repeat_poll_date', 'result_vintage'])] });
    const voted = m.totals.voted;
    const definition = year === '2020'
      ? 'Voters who voted (укупан број бирача који су гласали) / voters on the electoral roll (број бирача уписаних у бирачки списак) × 100, computed from the report. The report prints no percentage.'
      : 'Voters who voted (број бирача који су гласали) / voters on the electoral roll (број бирача уписаних у бирачки списак) × 100, computed from the report. The report prints no percentage; voters who turned out are kept separately.';
    out.election_turnout.push({ election_id: electionId, country: 'serbia', geography: 'national', vote_type: LIST_VOTE, result_vintage: vintage, eligible_voters: m.totals.registered_voters, voters: voted, valid_votes: m.totals.valid, invalid_votes: m.totals.invalid, ballots_cast: year === '2020' ? m.totals.ballots_used : m.totals.voted, published_turnout: null, derived_turnout: (voted / m.totals.registered_voters) * 100, ...(year === '2026' ? { voters_turned_out: m.totals.turned_out, polling_stations: m.totals.polling_stations } : { ballots_received: m.totals.ballots_received, ballots_unused: m.totals.ballots_unused }), turnout_definition: definition, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition, sourceIds: [SRC] }, provenance: [rp('report, items 1-7', ['eligible_voters', 'voters', 'valid_votes', 'invalid_votes', 'ballots_cast'])] });
    for (const l of m.lists) {
      const id = `ct-rs-nsk${short}-${String(l.row).padStart(2, '0')}`;
      // Row-only lists get a neutral Serbian label ("electoral list, row no. N"); the printed title is never shown.
      const label = l.display_label ?? `Изборна листа, ред. бр. ${l.row}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'serbia', election_id: electionId, contestant_kind: 'electoral_list', native_list_type: 'изборна листа', kind_basis: 'every contestant is an electoral list (Art. 5); list kind (party, coalition, citizens’ group, national minority) is not printed in the report and is not stored', list_number: l.row, list_number_basis: m.list_order, registered_label_native: null, historical_display_label: label, display_label_rule: l.label_basis === 'row_only' ? `${LABEL_RULE.row_only}; shown as \u201cИзборна листа, ред. бр. N\u201d` : LABEL_RULE[l.label_basis], label_basis: l.label_basis, title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [rp(`report, list row ${l.row}`, ['list_number', 'historical_display_label', 'title_sha256'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'serbia', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: m.totals.valid, total_seats: SEATS, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / m.totals.valid) * 100, seats: l.seats, seat_basis: 'seats printed in the total-results report (single nationwide constituency, 250 seats)', published_seat_share: null, result_vintage: vintage, provenance: [rp(`report, list row ${l.row}`, ['votes', 'seats'])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'serbia', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: SEATS, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [rp('report, seats per list', ['total_seats']), ...(year === '2026' ? [lp(['total_seats'])] : [])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'serbia', election_id: electionId, valid_from: m.polling_day, valid_to: m.polling_day, interval_basis: year === '2026' ? 'election-specific rule observation (Law on the Election of Members of Parliament, version read on the retrieval date), not legal enactment dates' : 'election-specific: the 2020 statute version was not read; the rule is recorded from the 2026 version and the printed seats reproduce under it (consistency check only)', system_family: 'list proportional representation, single nationwide constituency', vote_type: LIST_VOTE, allocation_method: 'highest quotients (D’Hondt) over 250 seats (Art. 129)', base_seats: SEATS,
      vote_definitions: [{ id: LIST_VOTE, kind: 'list', label: t('Electoral-list votes', '选举名单票'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: year === '2026' ? [SRC, LAW] : [SRC] }],
      national_rules: {
        nationalAllocation: 'One nationwide constituency; seats shared among lists by the highest-quotient system (Art. 5, Art. 129).', districtAllocation: null,
        thresholds: [{ appliesTo: 'electoral list', percent: 3, description: t('A list below 3% of the voters who voted takes no part in the seat allocation (Art. 128); national-minority lists are exempt (Art. 140).', '得票低于投票选民人数 3% 的名单不参与席位分配（第 128 条）；少数民族名单不受此限（第 140 条）。'), sourceIds: year === '2026' ? [LAW] : [SRC] }],
        minorityRepresentation: t('National-minority lists take part even below 3%; their quotients are then increased by 35% (Art. 140). Which lists had this status is decided by the commission and is not stored here.', '少数民族名单即使低于 3% 也参与分配，此时其商数提高 35%（第 140 条）。哪些名单具有这一地位由选举委员会决定，此处不存储。'),
        totalSeatsDefinition: t('250 seats, all filled from electoral lists in one nationwide constituency.', '250 席，全部由一个全国选区的选举名单产生。'),
        sourceIds: year === '2026' ? [SRC, LAW] : [SRC],
      },
      notes: t(year === '2026'
        ? 'List proportional representation with 250 seats in one nationwide constituency. Votes and seats are printed in the commission\u2019s total-results report; the seats reproduce under the quoted rules. Shares are computed here over valid ballots. List labels: full titles usually name persons and are not stored (only titles naming no person, or the parties a title names).'
        : 'List proportional representation with 250 seats in one nationwide constituency. Votes and seats are printed in the commission\u2019s total-results report. The 2020 statute version was not read: the seats reproduce under the 2026 rule (3% threshold, 35% minority quotient increase), recorded as a consistency check only. List labels: full titles usually name persons and are not stored.',
        year === '2026'
        ? '比例代表制，一个全国选区共 250 席。得票与席位来自选举委员会总结果报告；席位可按所引规则复现。此处得票率以有效票为分母计算。名单标签：完整名称通常含人名，不予存储（只存储不含人名的名称或名称中列出的政党）。'
        : '比例代表制，一个全国选区共 250 席。得票与席位来自选举委员会总结果报告。未阅读 2020 年版法律：席位可按 2026 年规则（3% 门槛、少数民族商数提高 35%）复现，仅作一致性核对。名单标签：完整名称通常含人名，不予存储。'),
      seat_check: checks[year], provenance: year === '2026' ? [lp(['allocation_method', 'thresholds', 'minorityRepresentation']), rp('report, seats', ['base_seats'])] : [rp('report, seats', ['base_seats'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'serbia', institution: 'Републичка изборна комисија (Republic Electoral Commission)', dataset: m.act, tier: 'tier1_official', url: m.source_url, licence_status: 'official_material_art_6_2_copyright_act_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_rule_b_labels_only_documents_and_full_titles_not_redistributed', licence_url: COPYRIGHT, attribution: 'Републичка изборна комисија', retrieved_at: m.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_file_sha256: m.publisher_file_sha256 });
  }
  out.political_source_registry.push({ source_id: LAW, country: 'serbia', institution: 'Правно-информациони систем Републике Србије', dataset: 'Law on the Election of Members of Parliament (14/2022, 47/2026), Arts. 5, 128, 129, 140 (quoted clauses)', tier: 'tier1_official', url: evidence.rules.source.url, licence_status: 'statute_not_subject_to_copyright', raw_redistribution: 'quoted_clauses_only', licence_url: COPYRIGHT, attribution: 'Правно-информациони систем Републике Србије', retrieved_at: evidence.rules.source.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE });
  return { ...out, checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function serbiaFiles(data) {
  const files = {};
  for (const store of SERBIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Serbia — National Assembly elections of 2020 and 2026\n\nTwo elections, whole chamber (250 seats, one nationwide constituency): electoral lists with votes and seats; voters on the electoral roll, voters who voted, valid and invalid ballots. Source: total-results reports of the Republic Electoral Commission (Републичка изборна комисија); rules from the Law on the Election of Members of Parliament. Reuse basis: official materials of state bodies are not copyright works (Copyright Act Art. 6(2)), recorded as a reading of the statute.\n\nList labels: Serbian list titles usually contain personal names. Full titles are not stored. A title that names no person is shown as printed; otherwise only the parties named in it; otherwise no label (row number only). `title_sha256` identifies the printed title. List kinds and national-minority status are not stored, and no list is linked to a party or across elections. The 2022 and 2023 elections are not included: their reports could not be read through registered, public routes.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'serbia-political-export-v1', country: 'serbia', elections: data.elections.map((e) => e.election_id), coverage: 'whole_chamber_250_of_250_seats_attributed', label_rule: 'owner rule (b) 2026-11-15: verbatim only when the title names no person; otherwise parties named in the title; otherwise row number only', not_included: ['2022 and 2023 elections (reports not reachable through registered public routes)', 'list kinds and national-minority status', 'party attribution and cross-election links', 'candidate names'], stores: SERBIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildSerbia();
  const files = serbiaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Serbia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
