// Austria — Nationalrat elections of 2013, 2017, 2019 and 2024 (whole chamber, 183 seats), from the Federal Ministry of
// the Interior's (BMI / Bundeswahlbehörde) final-result workbooks, announcements (Verlautbarung § 108 Abs. 6 NRWO), the
// signed 2024 decision and the final seat tables (Mandatsspiegel), all saved by the owner by hand (owner brief
// 2026-11-18 "Complete ten-country parliamentary election coverage"; answers "Accept for all four" — official works,
// UrhG § 7 — and "I'll download files myself"; the assistant never contacts www.bmi.gv.at).
// Built only from the committed transcription docs/political-data/raw/austria/nationalrat/evidence.json. Fail-closed:
//   - party votes = valid votes; valid + invalid = votes cast ≤ eligible voters; the nine Länder rows add up to the
//     national row for every column;
//   - 2013, 2017, 2019: the announcement's totals and party sums equal the workbook; 2024: the signed decision's national
//     row equals the workbook;
//   - seats: 183 in total; the parties holding seats are exactly those with at least 4% of valid votes (no party below 4%
//     won a regional seat where the seat table shows them); national D'Hondt over 183 seats among them reproduces every
//     party's seats (third Ermittlungsverfahren, NRWO § 107);
//   - 2019 and 2024 seat tables: federal total = third stage + Länder; each Land = second stage + its regional
//     constituencies; 2019 equals the announcement.
// Labels: the official short name (Kurzbezeichnung); a printed party name is stored only when it names no person; a short
// name that is a person's name is replaced by its column position. Candidate names are never stored.
//
// Usage: node scripts/political-data/austria/build-nationalrat.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/austria/nationalrat/evidence.json';
const STORE_DIR = 'src/data/political/austria';
const EXPORT_DIR = 'public/research-data/political/austria';
export const AUSTRIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
const SEATS = 183, THRESHOLD = 4, VOTE = 'at_nr_party_vote', YEARS = ['2013', '2017', '2019', '2024'];
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Austria build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/** D'Hondt over `seats` among the given parties (NRWO § 107, third Ermittlungsverfahren). */
export function dhondt(votes, seats) {
  const names = Object.keys(votes), won = Object.fromEntries(names.map((p) => [p, 0]));
  for (let i = 0; i < seats; i += 1) { const best = names.reduce((b, p) => (votes[p] / (won[p] + 1) > votes[b] / (won[b] + 1) ? p : b)); won[best] += 1; }
  return won;
}

/** Seats per party key for one election: from the announcement (2013–2019) or the seat table (2024). */
const seatsOf = (E) => E.announcement?.seats_B ?? E.seat_table.national.total;

export function reconcile(year, E) {
  const check = (ok, what) => { if (!ok) fail(`${year}: ${what}`); };
  const n = E.national, P = E.parties, keys = P.map((p) => p.key);
  check(new Set(keys).size === keys.length && P.every((p, i) => p.column === i + 1), 'party keys not unique or columns not 1…N');
  check(sum(P.map((p) => p.votes)) === n.valid, 'party votes ≠ valid votes');
  check(n.valid + n.invalid === n.cast && n.cast <= n.eligible, 'valid + invalid ≠ votes cast, or cast > eligible');
  check(E.laender.length === 9 && P.every((p, i) => sum(E.laender.map((l) => l.votes[i])) === p.votes), 'the nine Länder do not add up to the national party votes');
  if (E.announcement) {
    const A = E.announcement;
    check(['eligible', 'cast', 'invalid', 'valid'].every((k) => A.totals_A[k] === n[k]), 'announcement totals ≠ workbook');
    check(A.party_sums_A.length === P.length && A.party_sums_A.every((x, i) => x.key === P[i].key && x.votes === P[i].votes), 'announcement party sums ≠ workbook');
  } else {
    const nums = E.signed_decision.national_row_text.replace(/^G00000 Österreich /, '').split(' ').map((x) => (x.includes(',') ? null : Number(x.replaceAll('.', ''))));
    const counts = nums.filter((x) => x !== null);
    check(JSON.stringify(counts) === JSON.stringify([n.eligible, n.cast, n.invalid, n.valid, ...P.map((p) => p.votes)]), 'signed decision national row ≠ workbook');
  }
  const seats = seatsOf(E);
  check(Object.keys(seats).every((k) => keys.includes(k)) && sum(Object.values(seats)) === SEATS, `seats do not sum to ${SEATS} or name an unknown party`);
  const over = P.filter((p) => p.votes * 100 >= THRESHOLD * n.valid).map((p) => p.key);
  check(JSON.stringify([...over].sort()) === JSON.stringify(Object.keys(seats).filter((k) => seats[k] > 0).sort()), `parties holding seats ≠ parties with at least ${THRESHOLD}%`);
  const model = dhondt(Object.fromEntries(over.map((k) => [k, P.find((p) => p.key === k).votes])), SEATS);
  check(over.every((k) => model[k] === seats[k]), "national D'Hondt over 183 seats does not reproduce the seats");
  let stages = null;
  if (E.seat_table) {
    const T = E.seat_table, sp = T.parties, nat = T.national;
    check(sp.every((k) => keys.includes(k)) && sp.every((k) => nat.total[k] === nat.third[k] + nat.laender[k]), 'seat table: federal total ≠ third stage + Länder');
    check(T.laender.length === 9 && sp.every((k) => sum(T.laender.map((l) => l.total[k])) === nat.laender[k]), 'seat table: Länder ≠ federal Länder row');
    check(T.laender.every((l) => sp.every((k) => l.total[k] === l.second[k] + l.rwk_sum[k] && l.rwk_sum[k] === sum(l.rwk.map((r) => r.seats[k])))), 'seat table: a Land ≠ second stage + regional constituencies');
    check(sum(T.laender.map((l) => l.rwk.length)) === 39, 'seat table: not 39 regional constituencies');
    if (E.announcement) check(sp.every((k) => nat.total[k] === E.announcement.seats_B[k]), 'seat table ≠ announcement');
    stages = Object.fromEntries(sp.map((k) => [k, { regional: sum(T.laender.map((l) => l.rwk_sum[k])), land: sum(T.laender.map((l) => l.second[k])), federal: nat.third[k] }]));
  }
  return { valid: n.valid, parties: P.length, seat_parties: over.length, total_seats: SEATS, threshold_votes: Math.ceil((THRESHOLD / 100) * n.valid), dhondt: 'national D’Hondt over 183 seats among parties with at least 4% reproduces every party’s seats', stages };
}

const LABEL_RULE = {
  official_short_name: 'official short name (Kurzbezeichnung) as printed in the BMI result workbook',
  abbreviation_for_personal_name: 'official short name; the printed party name contains a person’s name and is not stored (SHA-256 only)',
  row_only: 'the official short name is a person’s name: shown by column position only',
};

export function buildAustria() {
  const buf = read(EVIDENCE);
  const ev = JSON.parse(buf), evSha = sha(buf), parserSha = sha(read('scripts/political-data/austria/build-nationalrat.mjs'));
  const out = Object.fromEntries(AUSTRIAN_STORES.map((s) => [s, []]));
  const checks = {};
  for (const year of YEARS) {
    const E = ev.elections[year], r = reconcile(year, E), n = E.national, date = E.polling_day.date;
    checks[year] = r;
    if (!date.startsWith(year)) fail(`${year}: polling day`);
    const yy = year.slice(2), electionId = `el-at-nr-${date}`, SRC = `src-at-bmi-nr-${year}`;
    const vintage = E.announcement ? `final: announcement of the Bundeswahlbehörde ${E.announcement.gz} of ${E.announcement.date} and the BMI final-result workbook` : `final: decision of the Bundeswahlbehörde of ${E.signed_decision.date} (signed PDF and workbook) and the final seat table`;
    const file = (k) => ({ workbook: E.workbook, announcement: E.announcement, signed: E.signed_decision, seats: E.seat_table }[k]);
    const prov = (k, record, fields, how = 'published') => ({ source_id: SRC, source_url: file(k).url, source_record_id: `${file(k).file}: ${record}`, retrieved_at: '2026-11-18', raw_snapshot: { path: EVIDENCE, sha256: evSha }, parser_version: 'austria-nationalrat-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, publisher_file_sha256: file(k).sha256 });
    const totalsSrc = E.announcement ? 'announcement' : 'signed';
    out.elections.push({ election_id: electionId, country: 'austria', election_type: 'national_parliament', chamber: 'Nationalrat', date, date_end: null, date_basis: E.polling_day.basis, result_coverage: 'all_parties_national', year: Number(year), legislature_id: `lg-at-nr-${year}`, electoral_system_id: `es-at-nr-${year}`, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [E.announcement && E.polling_day.basis.startsWith('printed') ? prov('announcement', 'heading', ['date']) : prov('workbook', 'polling day from the national election source registry', ['date'], 'derived_from_evidence_record')] });
    const def = 'Eligible voters (Wahlberechtigte), votes cast (abgegebene Stimmen, including postal ballots), invalid and valid votes as printed; derived turnout = votes cast ÷ eligible voters.';
    out.election_turnout.push({ election_id: electionId, country: 'austria', geography: 'national', vote_type: VOTE, result_vintage: vintage, eligible_voters: n.eligible, voters_turned_out: n.cast, voters: n.cast, valid_votes: n.valid, invalid_votes: n.invalid, ballots_cast: n.cast, published_turnout: null, derived_turnout: (n.cast / n.eligible) * 100, turnout_definition: def, turnout_basis: { numerator: 'voters_turned_out', denominator: 'registered_electorate', definition: def, sourceIds: [SRC] }, published_or_derived_note: 'counts printed; percentage derived', provenance: [prov(totalsSrc, E.announcement ? 'section A' : 'row G00000 Österreich', ['eligible_voters', 'voters_turned_out', 'valid_votes', 'invalid_votes'])] });
    const seats = seatsOf(E);
    for (const p of E.parties) {
      const id = `ct-at-nr${yy}-${String(p.column).padStart(2, '0')}`;
      const basis = p.person_name === 'in_short_name' ? 'row_only' : p.person_name === 'in_printed_name' ? 'abbreviation_for_personal_name' : 'official_short_name';
      const label = basis === 'row_only' ? `Wahlvorschlag, Spalte ${p.column}` : p.short_name;
      out.electoral_contestants.push({ contestant_id: id, country: 'austria', election_id: electionId, contestant_kind: 'party_or_electoral_group', native_list_type: 'wahlwerbende Partei', kind_basis: 'every contestant is a wahlwerbende Partei under the NRWO; party and electoral group are not distinguished', list_number: p.column, list_number_basis: 'column position in the BMI result workbook (ballot order not asserted)', registered_label_native: null, printed_party_name: p.printed_name ?? null, historical_display_label: label, display_label_rule: LABEL_RULE[basis], label_basis: basis, ...(p.printed_name_sha256 ? { title_sha256: p.printed_name_sha256 } : {}), lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov('workbook', `column ${p.column}`, ['historical_display_label', 'list_number']), ...(E.announcement ? [prov('announcement', 'section A', ['printed_party_name', 'title_sha256'])] : [])] });
      const st = r.stages?.[p.key];
      out.election_results.push({ result_id: `er-${id}`, country: 'austria', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: VOTE, valid_votes: n.valid, total_seats: SEATS, votes: p.votes, published_vote_share: null, derived_vote_share: (p.votes / n.valid) * 100, seats: seats[p.key] ?? 0, ...(st ? { regional_seats: st.regional, land_seats: st.land, federal_seats: st.federal } : {}), seat_basis: seats[p.key] ? (st ? `final seat table: ${st.regional} in regional constituencies, ${st.land} in the Länder (second stage), ${st.federal} federal (third stage)` : 'section B of the announcement (seats per party after the third Ermittlungsverfahren)') : 'no seat (below 4% and no regional seat)', published_seat_share: null, result_vintage: vintage, provenance: [prov(totalsSrc, E.announcement ? 'section A (Parteisummen)' : 'row G00000 Österreich', ['votes']), ...(seats[p.key] ? [prov(E.seat_table ? 'seats' : 'announcement', E.seat_table ? 'Österreich (Bundesgebiet)' : 'section B', ['seats'])] : [])] });
    }
    const keyLabel = (k) => { const p = E.parties.find((x) => x.key === k); return p.short_name ?? `Wahlvorschlag, Spalte ${p.column}`; };
    out.legislatures.push({ legislature_id: `lg-at-nr-${year}`, country: 'austria', chamber: 'Nationalrat', official_term: null, election_id: electionId, total_seats: SEATS, seats_by_party: Object.fromEntries(Object.entries(seats).map(([k, v]) => [keyLabel(k), v])), ...(E.seat_table ? { seats_by_land: E.seat_table.laender.map((l) => ({ land: l.nr, name: l.name, total: l.total, second_stage: l.second, regional: l.rwk.map((x) => ({ constituency: x.code, name: x.name, seats: x.seats })) })), federal_stage: E.seat_table.national.third } : {}), seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov(E.seat_table ? 'seats' : 'announcement', E.seat_table ? 'final seat table' : 'section B', ['total_seats', 'seats_by_party'])] });
    out.electoral_systems.push({ electoral_system_id: `es-at-nr-${year}`, country: 'austria', election_id: electionId, valid_from: date, valid_to: date, interval_basis: 'election-specific: Nationalrats-Wahlordnung 1992 as applied (the announcements cite §§ 107–108); the institutional registry holds the statute', system_family: 'list proportional representation in three tiers: 39 regional constituencies, 9 Land constituencies and the federal constituency', vote_type: VOTE, allocation_method: 'Hare quota (Wahlzahl) in regional and Land constituencies, then federal D’Hondt over all 183 seats', base_seats: SEATS,
      vote_definitions: [{ id: VOTE, kind: 'list', label: t('Party votes (Parteistimmen)', '政党票'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC] }],
      national_rules: { nationalAllocation: 'Third Ermittlungsverfahren: D’Hondt over 183 seats among qualifying parties nationally; seats already won in the regional and Land constituencies are deducted.', districtAllocation: 'First and second Ermittlungsverfahren: a party wins as many seats in a regional or Land constituency as its votes contain the Wahlzahl of the Land.',
        thresholds: [{ appliesTo: 'party', percent: THRESHOLD, description: t('A party takes part in the Land and federal stages with at least 4% of national valid votes or a seat in a regional constituency (Grundmandat). In every admitted election the parties holding seats are exactly those above 4%.', '政党须获得全国有效票至少 4%，或在某一地区选区获得一席（基础议席），方可参加州级与联邦级分配。在已准入的每次选举中，获得席位的政党恰为超过 4% 者。'), sourceIds: [SRC] }],
        minorityRepresentation: null,
        totalSeatsDefinition: t('183 members of the Nationalrat (NRWO § 1).', '国民议会 183 名议员（《国民议会选举法》第 1 条）。'), sourceIds: [SRC] },
      notes: t(`Votes and counts are the national row of the BMI final-result workbook${E.announcement ? ', equal to the Bundeswahlbehörde announcement' : ', equal to the signed decision'}; seats from ${E.seat_table ? 'the final seat table' : 'the announcement'}. National D’Hondt over 183 seats among parties above 4% reproduces every party’s seats. Turnout is derived. Candidate names are not stored.`, `得票与计数取自内政部最终结果工作簿的全国行${E.announcement ? '，与联邦选举委员会公告一致' : '，与签署的决定一致'}；席位取自${E.seat_table ? '最终席位表' : '公告'}。对超过 4% 的政党按全国 D’Hondt 分配 183 席，可复现各党席位。投票率为推算值。不存储候选人姓名。`),
      seat_check: r, provenance: [prov(E.seat_table ? 'seats' : 'announcement', E.seat_table ? 'final seat table' : 'section B', ['base_seats'])] });
    const files = Object.fromEntries(Object.entries({ workbook: E.workbook, announcement: E.announcement, signed_decision: E.signed_decision, seat_table: E.seat_table }).filter(([, v]) => v).map(([k, v]) => [k, { file: v.file, url: v.url, sha256: v.sha256 }]));
    out.political_source_registry.push({ source_id: SRC, country: 'austria', institution: 'Bundesministerium für Inneres — Bundeswahlbehörde', dataset: `Nationalratswahl ${year}: final result (${Object.values(files).map((f) => f.file).join(', ')})`, tier: 'tier1_official', url: E.workbook.url, licence_status: 'official_work_urhg_7_owner_reading', reuse_terms_note: 'BMI Impressum permits attributed reuse except for commercial purposes; the Atlas is non-commercial', raw_redistribution: 'national figures and seat tables only; the files are not redistributed and candidate names are not stored', licence_url: ev.rights.terms_url, licence_url_basis: 'BMI Impressum reuse clause (read 2026-10-03, SHA-256 in the evidence); the reuse basis is the official-works reading of UrhG § 7', attribution: 'Bundesministerium für Inneres (Bundeswahlbehörde)', retrieved_at: '2026-11-18', acquisition: 'owner_manual_download', raw_sha256: evSha, raw_path: EVIDENCE, files });
  }
  return { ...out, checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function austriaFiles(data) {
  const files = {};
  for (const store of AUSTRIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = `# Austria — Nationalrat elections ${data.elections.map((e) => e.date).join(', ')}\n\nWhole chamber (183 seats), national level. Source: the Federal Ministry of the Interior's final-result workbooks (national row), the Bundeswahlbehörde's announcements under § 108 (6) NRWO (2013, 2017, 2019) or its signed decision (2024), and the final seat tables (2019, 2024), saved by the owner; checksums in \`political_source_registry\`. Every year: party votes add up to the valid votes, the nine Länder add up to the national row, and national D'Hondt over 183 seats among the parties above 4% reproduces every party's seats. 2019 and 2024 also give seats by tier (regional constituencies, Länder, federal).\n\nLabels: the official short name (Kurzbezeichnung). Printed party names are stored only when they name no person (otherwise SHA-256 only); a short name that is a person's name is shown by its column position. No candidate names. No party is linked across elections.\n\nTurnout is derived (votes cast ÷ eligible voters). The 2013 and 2024 polling days are not printed in the supplied files and come from the national election source registry.\n\nReuse basis: official works are free of copyright (UrhG § 7), recorded as the owner's reading of the statute, not a licence; the BMI Impressum permits attributed non-commercial reuse.\n`;
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'austria-political-export-v1', country: 'austria', elections: data.elections.map((e) => e.election_id), coverage: 'Nationalrat 183 of 183 seats per election; national level; seats by tier for 2019 and 2024', not_included: ['candidate names and preference votes', 'municipal, district and Land vote results', 'party attribution and cross-election links', '2002, 2006 and 2008 elections (legacy .xls workbooks not read)'], stores: AUSTRIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildAustria();
  const files = austriaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Austria stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
