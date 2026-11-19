// Romania — Parliament (Camera Deputaților and Senat) elections of 11 December 2016, one election record per chamber,
// from the Permanent Electoral Authority's (AEP) centralised results on data.gov.ro (OGL-ROU-1.0) (owner answers
// 2026-11-18: "both" for Romania, then "ii then i": read the Chamber's 2016–2020 composition page once for the minority
// organisations, then admit 2016 with its limits stated).
// Built only from the committed transcription docs/political-data/raw/romania/parliament/evidence.json. The chambers are
// never combined. Fail-closed reconciliation per chamber:
//   - list votes (polling stations + postal) and the independent-candidate aggregate = valid votes (column e + postal d1);
//   - the lists holding seats = the lists with at least 5% of national valid votes; seats = the AEP mandate file
//     (Chamber 312, Senate 136), per constituency and in total;
//   - the two-stage allocation (constituency quota, national D'Hondt of remainders) reproduces the Senate exactly; for the
//     Chamber the same simplified model differs by one seat, so the mandate file stays the seat source (recorded);
//   - Chamber minority seats (Law 208/2015 Art. 56): organisations of national minorities without a list seat and with at
//     least 5% of the average valid votes per deputy each take one seat; the set must equal the 17 organisations the
//     Chamber lists for the 2016–2020 term; Chamber total 312 + 17 = 329.
// Not established and not published: registered voters, voters and turnout (AEP count columns are undocumented), and
// independent candidates' names (aggregated). Source vintage: AEP centralisation (file timestamp 14 December 2016), not
// the Central Electoral Bureau's final act.
//
// 2024 (owner answer "both": the owner saved the Central Electoral Bureau's final acts 2RF and 3RF of 7 December 2024 by
// hand; transcribed by eye from the scans, candidate names never transcribed). Fail-closed per chamber (reconcile2024):
//   - list and independent votes = valid votes (c); a = a1+…+a4, b = b1+…+b4, f = f1+f2, g = g1+g2;
//   - lists with at least 5% of valid votes = the lists in sections i.1, j and k; remainders ≤ votes and sum to the printed
//     total; i.2 first-stage and unassigned seats sum to the printed totals;
//   - national D'Hondt over the i.1 remainders for the unassigned seats reproduces section j for every list, except seats
//     the act does not deploy to a constituency (Senate: two POT seats; Giurgiu and Ialomița keep one slot each unfilled);
//     j per constituency never exceeds the unassigned slots, and the shortfall equals the undeployed seats;
//   - elected (k) − j = first-stage seats per list, summing to the i.2 total; a list without first-stage seats has its full
//     vote as remainder;
//   - Chamber minority seats (Art. 56): m.2 = ⌊votes of lists over the threshold ÷ 312⌋, m.3 = ⌊5% × m.2⌋; organisations
//     of national minorities without list seats and with at least m.3 votes = the 19 organisations of section m.5.
// Turnout 2024 = b ÷ a (derived; the act prints no percentage).
//
// 2020 (added 2026-11-19; owner answer "Accept, record the route"): the Central Electoral Bureau's final acts 1640
// (Senate) and 1639 (Chamber of Deputies) of 17 December 2020, from Internet Archive captures of the publisher PDFs
// saved by the owner; same section structure and the same fail-closed checks as 2024 (no undeployed seats). One list
// name contains two persons' surnames and is shown without them (title_sha256 kept).
//
// 2012 (added 2026-11-19; owner answer "Admit, seats as published"): Law 35/2008 mixed-member system from the AEP
// files on data.gov.ro; seats as printed in the AEP candidate file, not recomputed — see reconcile2012 below.
//
// Usage: node scripts/political-data/romania/build-parliament.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/romania/parliament/evidence.json';
const STORE_DIR = 'src/data/political/romania';
const EXPORT_DIR = 'public/research-data/political/romania';
export const ROMANIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
const CH = {
  CD: { code: 'cd', chamber: 'Camera Deputaților', en: 'Chamber of Deputies', zh: '众议院', listSeats: 312, listSeats2024: 312, vote: 'ro_cd_list_vote', minority: true },
  S: { code: 's', chamber: 'Senat', en: 'Senate', zh: '参议院', listSeats: 136, listSeats2024: 136, vote: 'ro_s_list_vote', minority: false },
};
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Romania build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, k = 'votes') => rows.reduce((n, r) => n + (r[k] ?? 0), 0);

/** Simplified two-stage allocation: constituency quota (qualifying votes ÷ seats), then national D'Hondt of remainders. */
export function twoStage(byCons, seatsByCons, parties, total) {
  const first = Object.fromEntries(parties.map((p) => [p, 0])), rem = { ...first }, won = { ...first };
  for (const row of byCons) {
    const S = seatsByCons.get(row.constituency); const tot = parties.reduce((n, p) => n + row[p], 0); const q = S ? tot / S : 0;
    for (const p of parties) { const f = q ? Math.floor(row[p] / q) : 0; first[p] += f; rem[p] += row[p] - f * q; }
  }
  const alloc = Object.fromEntries(parties.map((p) => [p, 0]));
  for (let i = parties.reduce((n, p) => n - first[p], total); i > 0; i -= 1) { const best = parties.reduce((b, p) => (rem[p] / (alloc[p] + 1) > rem[b] / (alloc[b] + 1) ? p : b)); alloc[best] += 1; }
  for (const p of parties) won[p] = first[p] + alloc[p];
  return won;
}

export function reconcile(ch, c, minorityOrgs) {
  const k = CH[ch], check = (ok, what) => { if (!ok) fail(`2016 ${ch}: ${what}`); };
  const valid = c.valid_votes_stations_column_e + c.valid_votes_postal_column_d1;
  check(sum(c.lists) + c.independents.votes === valid, 'list and independent votes ≠ valid votes (e + d1)');
  check(c.lists.every((l) => l.votes === l.votes_stations + l.votes_postal), 'station + postal ≠ list votes');
  check(c.lists.every((l, i) => l.row === i + 1) && c.lists.every((l, i) => !i || c.lists[i - 1].votes >= l.votes), 'rows not in descending vote order');
  check(sum(c.lists, 'list_seats') === k.listSeats, `list seats ≠ ${k.listSeats}`);
  const parties = Object.keys(c.seats_by_constituency[0]).filter((x) => !['constituency', 'name'].includes(x));
  check(c.seats_by_constituency.reduce((n, r) => n + parties.reduce((m, p) => m + r[p], 0), 0) === k.listSeats, 'constituency seats ≠ total');
  check(parties.every((p) => c.lists.find((l) => l.name === p)?.list_seats === c.seats_by_constituency.reduce((n, r) => n + r[p], 0)), 'mandate file columns ≠ list seats');
  const qualifying = c.lists.filter((l) => l.votes * 100 >= 5 * valid).map((l) => l.name);
  check(JSON.stringify([...qualifying].sort()) === JSON.stringify([...parties].sort()), 'lists with ≥ 5% ≠ lists holding seats');
  const model = twoStage(c.qualifying_votes_by_constituency, new Map(c.seats_by_constituency.map((r) => [r.constituency, parties.reduce((n, p) => n + r[p], 0)])), parties, k.listSeats);
  const diff = parties.filter((p) => model[p] !== c.lists.find((l) => l.name === p).list_seats);
  if (ch === 'S') check(diff.length === 0, `two-stage model differs: ${diff}`);
  else check(diff.length <= 2 && parties.reduce((n, p) => n + Math.abs(model[p] - c.lists.find((l) => l.name === p).list_seats), 0) <= 2, 'Chamber two-stage model differs by more than one seat');
  let minoritySeats = [];
  if (k.minority) {
    const threshold = 0.05 * (valid / k.listSeats);
    minoritySeats = c.lists.filter((l) => l.kind === 'national_minority_organisation' && l.list_seats === 0 && l.votes >= threshold).map((l) => l.cdep_abbreviation);
    check(JSON.stringify([...minoritySeats].sort()) === JSON.stringify([...minorityOrgs].sort()), 'Art. 56 minority seats ≠ the organisations the Chamber lists for 2016–2020');
    check(c.lists.filter((l) => l.kind === 'national_minority_organisation').every((l) => minoritySeats.includes(l.cdep_abbreviation) || l.votes < threshold), 'minority rule inconsistency');
  }
  return { valid, lists: c.lists.length, independents: c.independents.candidates, list_seats: k.listSeats, minority_seats: minoritySeats.length, total_seats: k.listSeats + minoritySeats.length, threshold_votes: Math.ceil(0.05 * valid),
    allocation_model: ch === 'S' ? 'reproduced exactly' : `simplified model differs by one seat (${diff.join(' / ')}); mandate file used` };
}

/** D'Hondt over the pooled remainders (national stage of Law 208/2015 Art. 94 as printed in section j). */
export function dhondt(votes, seats) {
  const names = Object.keys(votes), won = Object.fromEntries(names.map((p) => [p, 0]));
  for (let i = 0; i < seats; i += 1) { const best = names.reduce((b, p) => (votes[p] / (won[p] + 1) > votes[b] / (won[b] + 1) ? p : b)); won[best] += 1; }
  return won;
}

/** 2024: reconcile one chamber of the Central Electoral Bureau's final act (sections a–m). */
export function reconcile2024(ch, c, year = '2024') {
  const k = CH[ch], check = (ok, what) => { if (!ok) fail(`${year} ${ch}: ${what}`); };
  const n = c.counts, A = c.act;
  check(n.a === n.a1 + n.a2 + n.a3 + n.a4 && n.b === n.b1 + n.b2 + n.b3 + n.b4 && n.f === n.f1 + n.f2 && n.g === n.g1 + n.g2, 'a, b, f or g ≠ the sum of its sub-items');
  check(n.b <= n.a && n.c + n.d <= n.b, 'counts out of order (c + d ≤ b ≤ a)');
  check(sum(c.lists) + c.independents.votes === n.c, 'list and independent votes ≠ valid votes (c)');
  const order = [...c.lists.map((l) => [l.row, l.votes]), ...c.independents.ballot_rows.map((r) => [r, null])].sort((x, y) => x[0] - y[0]);
  check(order.every(([r], i) => r === i + 1) && c.independents.ballot_rows.length === c.independents.candidates, 'rows are not 1…N');
  check(c.lists.every((l, i) => !i || c.lists[i - 1].votes >= l.votes), 'lists not in descending vote order');
  const over = c.lists.filter((l) => l.votes * 100 >= 5 * n.c).map((l) => l.name);
  const same = (x) => JSON.stringify([...over].sort()) === JSON.stringify(Object.keys(x).sort());
  check(same(c.remainders_i1) && same(c.national_stage_j) && same(c.elected_k), 'lists with ≥ 5% ≠ the lists of sections i.1, j and k');
  const votesOf = (p) => c.lists.find((l) => l.name === p).votes;
  check(over.every((p) => c.remainders_i1[p] <= votesOf(p)) && Object.values(c.remainders_i1).reduce((a, b) => a + b, 0) === A.remainders_total_i1, 'i.1 remainders exceed votes or do not sum to the printed total');
  const fs1 = c.first_stage_by_constituency;
  check(fs1.length === 43 && fs1.every((r, i) => r.constituency === i + 1), 'i.2 does not list 43 constituencies');
  check(sum(fs1, 'assigned') === A.first_stage_total && sum(fs1, 'unassigned') === A.unassigned_total, 'i.2 columns ≠ printed totals');
  const entitled = dhondt(c.remainders_i1, A.unassigned_total);
  const j = Object.fromEntries(over.map((p) => [p, c.national_stage_j[p].length]));
  check(over.every((p) => j[p] <= entitled[p]), 'section j gives a list more than its D\'Hondt entitlement');
  const undeployed = Object.fromEntries(over.filter((p) => entitled[p] > j[p]).map((p) => [p, entitled[p] - j[p]]));
  const perCons = new Map(); for (const p of over) for (const x of c.national_stage_j[p]) perCons.set(x, (perCons.get(x) ?? 0) + 1);
  check(fs1.every((r) => (perCons.get(r.constituency) ?? 0) <= r.unassigned), 'section j exceeds the unassigned slots of a constituency');
  const unfilled = fs1.filter((r) => (perCons.get(r.constituency) ?? 0) < r.unassigned).map((r) => ({ constituency: r.constituency, name: r.name, slots: r.unassigned - (perCons.get(r.constituency) ?? 0) }));
  const undeployedTotal = Object.values(undeployed).reduce((a, b) => a + b, 0);
  check(unfilled.reduce((a, r) => a + r.slots, 0) === undeployedTotal, 'unfilled slots ≠ undeployed D\'Hondt seats');
  const first = Object.fromEntries(over.map((p) => [p, c.elected_k[p] - j[p]]));
  check(over.every((p) => first[p] >= 0) && Object.values(first).reduce((a, b) => a + b, 0) === A.first_stage_total, 'elected − j ≠ the first-stage seats');
  check(over.every((p) => first[p] > 0 || c.remainders_i1[p] === votesOf(p)), 'a list without first-stage seats does not carry its full vote as remainder');
  const filled = Object.values(c.elected_k).reduce((a, b) => a + b, 0);
  check(filled === A.elected_rows && filled === A.first_stage_total + A.unassigned_total - undeployedTotal && A.first_stage_total + A.unassigned_total === k.listSeats2024, 'elected rows ≠ seats filled');
  let minority = [];
  if (k.minority) {
    const m = c.minority, avg = Math.floor(over.reduce((a, p) => a + votesOf(p), 0) / k.listSeats2024), min = Math.floor(0.05 * avg);
    check(avg === m.average_votes_per_deputy_m2 && min === m.minimum_votes_m3, 'm.2 or m.3 does not recompute');
    const orgs = c.lists.filter((l) => l.kind === 'national_minority_organisation');
    check(JSON.stringify(orgs.map((l) => l.name).sort()) === JSON.stringify([...m.m1_organisations].sort()), 'minority organisations ≠ section m.1');
    minority = orgs.filter((l) => !over.includes(l.name) && l.votes >= min).map((l) => l.name);
    check(JSON.stringify([...minority].sort()) === JSON.stringify([...m.entitled_m5].sort()), 'Art. 56 minority seats ≠ section m.5');
  }
  return { valid: n.c, lists: c.lists.length, independents: c.independents.candidates, seat_slots: k.listSeats2024, list_seats_filled: filled, unfilled, undeployed, minority_seats: minority.length, total_seats: filled + minority.length, threshold_votes: Math.ceil(0.05 * n.c), first_stage: first, national_stage: j,
    allocation_model: undeployedTotal ? `national D'Hondt over the remainders reproduces section j except ${undeployedTotal} seat(s) the act does not deploy` : "national D'Hondt over the remainders reproduces section j exactly" };
}

// ── 2012 (added 2026-11-19; owner answer "Admit, seats as published") ─────────────────────────────────────────────
// Elections of 9 December 2012 under Law 35/2008 (single-member colleges with national threshold, county quotas and
// additional seats where absolute-majority college winners exceed a competitor's share), from the AEP files on
// data.gov.ro saved by the owner. Seats are the mandates printed in the AEP candidate file, not recomputed (the statute
// was not read). Fail-closed per chamber (reconcile2012):
//   - competitor and independent votes = valid votes; the same totals and counts (registered, voters, valid, null, blank)
//     at polling-station, college and county level (recorded by the evidence script, re-checked here);
//   - seats = the per-county mandate table; seat holders = the competitors with at least 5% of valid votes, plus (Chamber
//     only) national-minority organisations below 5% with exactly one seat each; independents hold none;
//   - every absolute-majority college winner holds a mandate, so a competitor's seats ≥ its absolute-majority wins;
//   - seats − colleges − minority seats = the additional seats; mandates per college sum to the seats.
export function reconcile2012(ch, c) {
  const check = (ok, what) => { if (!ok) fail(`2012 ${ch}: ${what}`); };
  const n = c.counts, X = c.cross_check, L = c.lists;
  check(sum(L) + c.independents.votes === n.valid, 'competitor and independent votes ≠ valid votes');
  check(n.valid + n.null <= n.voters && n.voters <= n.registered, 'counts out of order');
  const lvl = [n.registered, n.voters, n.valid, n.null, n.blank].join();
  check(X.counts_by_polling_stations.join() === lvl && X.counts_by_colleges.join() === lvl, 'counts differ between polling-station, college and county files');
  check(X.valid_by_polling_stations === n.valid && X.valid_by_colleges === n.valid && X.independent_votes_by_colleges === c.independents.votes && X.candidate_file_matches_college_file, 'votes differ between files');
  check(L.every((l, i) => l.row === i + 1) && L.every((l, i) => !i || L[i - 1].votes >= l.votes), 'rows not in descending vote order');
  const total = sum(L, 'seats');
  check(c.seats_by_constituency.reduce((m, r) => m + Object.values(r.seats).reduce((a, b) => a + b, 0), 0) === total, 'county mandate table ≠ total seats');
  check(L.every((l) => l.seats === c.seats_by_constituency.reduce((m, r) => m + (r.seats[l.name] ?? 0), 0)), 'county mandate table ≠ competitor seats');
  const over = L.filter((l) => l.votes * 100 >= 5 * n.valid), minority = L.filter((l) => l.kind === 'national_minority_organisation');
  check(L.filter((l) => l.seats > 0).every((l) => over.includes(l) || minority.includes(l)), 'a competitor below 5% that is not a minority organisation holds a seat');
  check(minority.every((l) => l.seats === 1 && l.votes * 100 < 5 * n.valid) && (ch === 'CD' || minority.length === 0), 'minority organisation seats out of rule');
  check(JSON.stringify(minority.map((l) => l.name)) === JSON.stringify(c.minority_organisations_seated), 'minority organisations ≠ evidence list');
  check(c.independents.seats === 0, 'an independent holds a seat');
  check(L.every((l) => l.seats >= l.absolute_majority_college_wins), 'an absolute-majority college winner without a mandate');
  check(Object.entries(c.mandates_per_college).reduce((m, [k, v]) => m + Number(k) * v, 0) === total && Object.values(c.mandates_per_college).reduce((a, b) => a + b, 0) === c.colleges, 'mandates per college ≠ total seats');
  const additional = total - c.colleges - minority.length;
  check(additional >= 0, 'fewer seats than colleges');
  return { valid: n.valid, lists: L.length, independents: c.independents.candidates, colleges: c.colleges, minority_seats: minority.length, additional_seats: additional, total_seats: total, competitors_over_5_percent: over.map((l) => l.name), absolute_majority_college_wins: sum(L, 'absolute_majority_college_wins'), allocation_model: 'seats as published in the AEP candidate file (not recomputed); checked against the threshold, the minority rule and the absolute-majority winners' };
}

function buildAep2012(out, ev, evSha, parserSha) {
  const E = ev.elections['2012'], date = E.polling_day.date, checks = {};
  for (const ch of ['CD', 'S']) {
    const k = CH[ch], c = E.chambers[ch], r = reconcile2012(ch, c), n = c.counts;
    checks[ch] = r;
    const electionId = `el-ro-${k.code}-${date}`, SRC = `src-ro-aep-${k.code}-2012`;
    const vintage = 'AEP centralised results published on data.gov.ro (files saved by the owner 2026-11-19); seats as the mandates printed in the AEP candidate file; not the Central Electoral Bureau final act';
    const prov = (record, fields, file, how = 'derived_sum_of_published_rows') => ({ source_id: SRC, source_url: E.dataset_page, source_record_id: `${file}: ${record}`, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evSha }, parser_version: 'romania-parliament-v3', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, publisher_file_sha256: E.files[file].sha256 });
    const CTY = 'rezultate2012nivelcircumscriptie.xls', CAND = 'rezultatecandidati2012.xls';
    out.elections.push({ election_id: electionId, country: 'romania', election_type: 'national_parliament', chamber: k.chamber, date, date_end: null, date_basis: E.polling_day.basis, result_coverage: ch === 'CD' ? 'all_competitors_national_independents_aggregated_minority_seats_as_published' : 'all_competitors_national_independents_aggregated', year: 2012, legislature_id: `lg-ro-${k.code}-2012`, electoral_system_id: `es-ro-${k.code}-2012`, result_status: 'official_final', result_vintage: vintage, separate_chamber_note: 'The Chamber of Deputies and the Senate are separate elections with separate ballots; their votes and seats are never combined.', later_poll_date: null, repeat_poll_date: null, provenance: [prov('polling day not printed', ['date'], CTY, 'derived_from_evidence_record')] });
    const def = 'Registered voters = voters on the permanent, supplementary and special lists; voters = persons present at the polls; valid, null and blank votes as counted per chamber (summed over the 43 constituencies; the same totals at polling-station and college level). No turnout percentage is printed; derived turnout = voters ÷ registered. Both chambers share registered voters and voters.';
    out.election_turnout.push({ election_id: electionId, country: 'romania', geography: 'national', vote_type: k.vote, result_vintage: vintage, eligible_voters: n.registered, voters_turned_out: n.voters, voters: n.voters, valid_votes: n.valid, invalid_votes: n.null, ballots_cast: null, blank_votes: n.blank, published_turnout: null, derived_turnout: (n.voters / n.registered) * 100, turnout_definition: def, turnout_basis: { numerator: 'voters_turned_out', denominator: 'registered_electorate', definition: def, sourceIds: [SRC] }, provenance: [prov('Numar Alegatori Liste / Prezenti la Urne / Voturi Valabil Exprimate / Nule / Albe, summed over constituencies', ['eligible_voters', 'voters_turned_out', 'voters', 'valid_votes', 'invalid_votes', 'blank_votes'], CTY)] });
    for (const l of c.lists) {
      const id = `ct-ro-${k.code}12-${String(l.row).padStart(2, '0')}`, isMin = l.kind === 'national_minority_organisation';
      out.electoral_contestants.push({ contestant_id: id, country: 'romania', election_id: electionId, contestant_kind: isMin ? 'national_minority_organisation' : 'party_or_political_formation_list', native_list_type: isMin ? 'organizație a cetățenilor aparținând minorităților naționale' : 'competitor electoral', kind_basis: isMin ? 'holds one Chamber seat in the AEP candidate file with less than 5% of valid votes (the national-minority route)' : 'every other competitor; party and alliance are not distinguished in the AEP files', list_number: l.row, list_number_basis: 'row ordered by national votes (the AEP files have no ballot order across colleges)', registered_label_native: null, historical_display_label: l.name, display_label_rule: l.label_basis === 'partial_personal_name_omitted' ? 'the printed name contains a person’s name; shown by the printed name without it' : 'competitor name as printed in the AEP files', label_basis: l.label_basis, ...(l.title_sha256 ? { title_sha256: l.title_sha256 } : {}), competitor_code: l.competitor_code, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`competitor code ${l.competitor_code}`, ['historical_display_label'], CTY)] });
      out.election_results.push({ result_id: `er-${id}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: k.vote, valid_votes: n.valid, total_seats: r.total_seats, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / n.valid) * 100, seats: l.seats, absolute_majority_college_wins: l.absolute_majority_college_wins, seat_basis: l.seats ? (isMin ? 'one Chamber seat for a national-minority organisation, as published in the AEP candidate file' : `mandates as published in the AEP candidate file (${l.absolute_majority_college_wins} won with an absolute majority in the college); not recomputed`) : 'no seat', published_seat_share: null, result_vintage: vintage, provenance: [prov(`competitor code ${l.competitor_code}, summed over constituencies`, ['votes'], CTY), ...(l.seats ? [prov('Mandat Atribuit = 1, counted', ['seats', 'absolute_majority_college_wins'], CAND, 'derived_count_of_published_rows')] : [])] });
    }
    const indId = `ct-ro-${k.code}12-ind`;
    out.electoral_contestants.push({ contestant_id: indId, country: 'romania', election_id: electionId, contestant_kind: 'independent_candidates_aggregate', native_list_type: 'candidați independenți', kind_basis: `${c.independents.candidates} independent candidate${c.independents.candidates === 1 ? '' : 's'} (no competitor code), aggregated; names not stored`, list_number: null, list_number_basis: null, registered_label_native: null, historical_display_label: `Candidați independenți (${c.independents.candidates})`, display_label_rule: 'aggregate of independent candidates; individual names are not stored', label_basis: 'aggregate', independent_candidates: c.independents.candidates, lead_party_id: null, party_relation_status: 'not_applicable', continuous_series_eligible: false, provenance: [prov('competitors without a code, summed', ['independent_candidates'], CTY)] });
    out.election_results.push({ result_id: `er-${indId}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: indId, vote_type: k.vote, valid_votes: n.valid, total_seats: r.total_seats, votes: c.independents.votes, published_vote_share: null, derived_vote_share: (c.independents.votes / n.valid) * 100, seats: 0, seat_basis: 'no independent candidate holds a mandate (AEP candidate file)', published_seat_share: null, result_vintage: vintage, provenance: [prov('competitors without a code, summed', ['votes'], CTY)] });
    out.legislatures.push({ legislature_id: `lg-ro-${k.code}-2012`, country: 'romania', chamber: k.chamber, official_term: '2012–2016', election_id: electionId, total_seats: r.total_seats, seats_by_mechanism: ch === 'CD' ? { single_member_colleges: r.colleges, additional_seats: r.additional_seats, national_minority_organisations: r.minority_seats } : { single_member_colleges: r.colleges, additional_seats: r.additional_seats }, mandates_per_college: c.mandates_per_college, seats_by_constituency: c.seats_by_constituency.map((x) => ({ constituency: x.constituency, name: x.name, seats: Object.entries(x.seats).map(([label, seats]) => ({ label, seats })) })), seat_count_basis: 'election_result_vintage_not_current_composition', seat_source: E.seat_source, result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('Mandat Atribuit = 1, counted per constituency and competitor', ['seats_by_constituency', 'total_seats', 'mandates_per_college'], CAND, 'derived_count_of_published_rows')] });
    out.electoral_systems.push({ electoral_system_id: `es-ro-${k.code}-2012`, country: 'romania', election_id: electionId, valid_from: date, valid_to: date, interval_basis: 'election-specific: Law 35/2008 as applied in 2012 (statute text not read; legislatie.just.ro blocked); the institutional registry holds the later statute', system_family: `mixed-member proportional: ${r.colleges} single-member colleges in 43 constituencies with a national threshold, county-level proportional allocation and additional seats where absolute-majority college winners exceed a competitor's share${ch === 'CD' ? '; national-minority organisation seats' : ''}`, vote_type: k.vote, allocation_method: 'seats as published in the AEP candidate file; the Law 35/2008 allocation is not recomputed', base_seats: r.colleges,
      vote_definitions: [{ id: k.vote, kind: 'list', label: t(`${k.en} competitor votes (college candidates summed)`, `${k.zh}竞选者得票（各选区候选人合计）`), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC] }],
      national_rules: { nationalAllocation: 'Not recomputed: seats are the mandates printed in the AEP candidate file. Checked: seat holders are exactly the competitors above 5% of valid votes (plus Chamber minority organisations), and every absolute-majority college winner holds a mandate.', districtAllocation: `Single-member colleges (${r.colleges}); a candidate with an absolute majority in the college is elected; ${r.additional_seats} additional seats arise where a competitor's absolute-majority winners exceed its share.`,
        thresholds: [{ appliesTo: 'competitor (party or alliance)', percent: 5, description: t(`The ${r.competitors_over_5_percent.length} competitors holding seats (other than minority organisations) are exactly those with at least 5% of valid votes; alliance thresholds and the alternative college criterion are not tested (statute not read).`, `获得席位的${r.competitors_over_5_percent.length}个竞选者（少数民族组织除外）恰为得票达到有效票 5% 者；未检验联盟门槛与替代的选区条件（未阅读法律原文）。`), sourceIds: [SRC] }],
        minorityRepresentation: ch === 'CD' ? t(`${r.minority_seats} organisations of national minorities below 5% hold one Chamber seat each in the AEP candidate file; the rule's vote minimum is not tested (statute not read).`, `${r.minority_seats} 个得票低于 5% 的少数民族组织在 AEP 候选人文件中各获众议院一席；未检验该规则的最低票数（未阅读法律原文）。`) : t('No minority-organisation seats in the Senate.', '参议院不设少数民族组织席位。'),
        totalSeatsDefinition: ch === 'CD' ? t(`${r.total_seats} deputies: ${r.colleges} single-member colleges, ${r.additional_seats} additional seats and ${r.minority_seats} national-minority organisation seats.`, `${r.total_seats} 名众议员：单一选区 ${r.colleges} 个、增补席位 ${r.additional_seats} 席、少数民族组织 ${r.minority_seats} 席。`) : t(`${r.total_seats} senators: ${r.colleges} single-member colleges and ${r.additional_seats} additional seats.`, `${r.total_seats} 名参议员：单一选区 ${r.colleges} 个、增补席位 ${r.additional_seats} 席。`), sourceIds: [SRC] },
      notes: t('Votes and counts are national sums of the AEP files on data.gov.ro; the polling-station, college and county files agree exactly. Seats are the mandates printed in the AEP candidate file and are not recomputed (owner decision; the Law 35/2008 text was not read). Turnout is derived. Independent candidates are aggregated without names; one competitor name containing a person’s name is shown without it.', '得票与计数为 data.gov.ro 上 AEP 文件的全国合计；投票站、选区与郡级文件完全一致。席位为 AEP 候选人文件所载席位，未重新计算（负责人决定；未阅读第 35/2008 号法律原文）。投票率为推算值。独立候选人合并列示，不存储姓名；一个含人名的竞选者名称去除人名后显示。'),
      seat_check: r, provenance: [prov('mandates', ['base_seats'], CAND, 'derived_count_of_published_rows')] });
    out.political_source_registry.push({ source_id: SRC, country: 'romania', institution: 'Autoritatea Electorală Permanentă (Permanent Electoral Authority)', dataset: `Alegeri pentru Camera Deputaților și Senat 2012 — ${k.chamber}: results per constituency, college and polling station, and candidate mandates (data.gov.ro)`, tier: 'tier1_official', url: E.dataset_page, licence_status: 'open_licence_ogl_rou_1_0', raw_redistribution: 'national sums and seat tables only; polling-station and candidate files not redistributed; candidate names never stored', licence_url: ev.rights.licence_url, attribution: 'Autoritatea Electorală Permanentă, data.gov.ro', retrieved_at: E.retrieved_at, acquisition: E.acquisition, raw_sha256: evSha, raw_path: EVIDENCE, files: E.files });
  }
  return checks;
}

export function buildRomania() {
  const buf = read(EVIDENCE);
  const ev = JSON.parse(buf), evSha = sha(buf), parserSha = sha(read('scripts/political-data/romania/build-parliament.mjs'));
  const E = ev.elections['2016'], X = E.minority_cross_check;
  const out = Object.fromEntries(ROMANIAN_STORES.map((s) => [s, []]));
  const checks = {};
  const firstDay = E.chambers.CD.protocol_dates[0][0];
  if (firstDay !== '20161211' || E.chambers.S.protocol_dates[0][0] !== '20161211') fail('earliest protocol date is not 11 December 2016');
  const date = '2016-12-11';
  for (const ch of ['CD', 'S']) {
    const k = CH[ch], c = E.chambers[ch];
    checks[ch] = reconcile(ch, c, X.organisations);
    const electionId = `el-ro-${k.code}-${date}`, SRC = `src-ro-aep-${k.code}-2016`, XSRC = 'src-ro-cdep-structure-2016';
    const vintage = 'AEP centralised results published on data.gov.ro (file timestamp 14 December 2016); not the Central Electoral Bureau final act';
    const prov = (record, fields, file = 'stations') => ({ source_id: SRC, source_url: c.files[file].url, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evSha }, parser_version: 'romania-parliament-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'derived_sum_of_published_rows', publisher_file_sha256: c.files[file].sha256 });
    out.elections.push({ election_id: electionId, country: 'romania', election_type: 'national_parliament', chamber: k.chamber, date, date_end: null, date_basis: 'polling day: the earliest transmission date of the polling-station protocols in the AEP file (11 December 2016, evening); protocols are drawn up after the close of polling', result_coverage: ch === 'CD' ? 'all_lists_national_independents_aggregated_minority_seats_by_rule' : 'all_lists_national_independents_aggregated', year: 2016, legislature_id: `lg-ro-${k.code}-2016`, electoral_system_id: `es-ro-${k.code}-2016`, result_status: 'official_final', result_vintage: vintage, separate_chamber_note: 'The Chamber of Deputies and the Senate are separate elections with separate ballots; their votes and seats are never combined.', later_poll_date: null, repeat_poll_date: null, provenance: [prov('Data trimiterii Procesului-verbal (earliest)', ['date'])] });
    const valid = checks[ch].valid;
    const def = 'Not established: the AEP files carry count columns a–g without an accepted official definition, so registered voters, voters and turnout are not published. Valid votes are proven as the sum of all list and independent votes (column e plus postal d1).';
    out.election_turnout.push({ election_id: electionId, country: 'romania', geography: 'national', vote_type: k.vote, result_vintage: vintage, eligible_voters: null, voters: null, valid_votes: valid, invalid_votes: null, ballots_cast: null, published_turnout: null, derived_turnout: null, turnout_definition: def, turnout_basis: { numerator: null, denominator: null, definition: def, sourceIds: [SRC] }, provenance: [prov('column e (polling stations) + column d1 (postal)', ['valid_votes'])] });
    const minority = new Set(ch === 'CD' ? X.organisations : []);
    for (const l of c.lists) {
      const id = `ct-ro-${k.code}16-${String(l.row).padStart(2, '0')}`;
      const mSeat = ch === 'CD' && l.kind === 'national_minority_organisation' && minority.has(l.cdep_abbreviation) ? 1 : 0;
      out.electoral_contestants.push({ contestant_id: id, country: 'romania', election_id: electionId, contestant_kind: l.kind === 'national_minority_organisation' ? 'national_minority_organisation' : 'party_or_political_formation_list', native_list_type: l.kind === 'national_minority_organisation' ? 'organizație a cetățenilor aparținând minorităților naționale' : 'listă de candidați', kind_basis: l.kind === 'national_minority_organisation' ? 'listed by the Chamber of Deputies among organisations of citizens belonging to national minorities (2016–2020 term)' : 'every other list; party and alliance are not distinguished in the AEP file', list_number: l.row, list_number_basis: 'row ordered by national votes (the AEP file has no ballot order)', registered_label_native: null, historical_display_label: l.name, display_label_rule: 'list name as printed in the AEP file', label_basis: 'verbatim', ...(l.cdep_abbreviation ? { abbreviation: l.cdep_abbreviation } : {}), lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`column "${l.name}"`, ['historical_display_label'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: k.vote, valid_votes: valid, total_seats: checks[ch].total_seats, votes: l.votes, votes_polling_stations: l.votes_stations, votes_postal: l.votes_postal, published_vote_share: null, derived_vote_share: (l.votes / valid) * 100, seats: l.list_seats + mSeat, list_seats: l.list_seats, minority_seats: mSeat, seat_basis: mSeat ? 'one Chamber seat for a national-minority organisation under Art. 56 (at least 5% of the average valid votes per deputy), confirmed by the Chamber’s 2016–2020 composition' : `list seats from the AEP mandate allocation file (${k.listSeats} seats in 43 constituencies)`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`column "${l.name}" (stations + postal)`, ['votes']), prov('mandate allocation file, TOTAL row', ['list_seats'], 'mandates')] });
    }
    const indId = `ct-ro-${k.code}16-ind`;
    out.electoral_contestants.push({ contestant_id: indId, country: 'romania', election_id: electionId, contestant_kind: 'independent_candidates_aggregate', native_list_type: 'candidați independenți', kind_basis: `${c.independents.candidates} independent candidates standing in single constituencies, aggregated; names not stored`, list_number: null, list_number_basis: null, registered_label_native: null, historical_display_label: `Candidați independenți (${c.independents.candidates})`, display_label_rule: 'aggregate of independent candidates; individual names are not stored', label_basis: 'aggregate', independent_candidates: c.independents.candidates, lead_party_id: null, party_relation_status: 'not_applicable', continuous_series_eligible: false, provenance: [prov('columns "CANDIDAT INDEPENDENT - …" summed', ['independent_candidates'])] });
    out.election_results.push({ result_id: `er-${indId}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: indId, vote_type: k.vote, valid_votes: valid, total_seats: checks[ch].total_seats, votes: c.independents.votes, published_vote_share: null, derived_vote_share: (c.independents.votes / valid) * 100, seats: 0, seat_basis: 'no independent candidate won a seat (AEP mandate file)', published_seat_share: null, result_vintage: vintage, provenance: [prov('independent columns summed', ['votes'])] });
    const parties = Object.keys(c.seats_by_constituency[0]).filter((x) => !['constituency', 'name'].includes(x));
    out.legislatures.push({ legislature_id: `lg-ro-${k.code}-2016`, country: 'romania', chamber: k.chamber, official_term: '2016–2020', election_id: electionId, total_seats: checks[ch].total_seats, seats_by_mechanism: ch === 'CD' ? { list_seats_43_constituencies: 312, national_minority_organisations: checks[ch].minority_seats } : { list_seats_43_constituencies: 136 }, seats_by_constituency: c.seats_by_constituency.map((r) => ({ constituency: r.constituency, name: r.name, seats: Object.fromEntries(parties.map((p) => [p, r[p]])) })), seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('mandate allocation file by constituency', ['seats_by_constituency', 'total_seats'], 'mandates'), ...(ch === 'CD' ? [{ source_id: XSRC, source_url: X.source, source_record_id: 'organisations of citizens belonging to national minorities, 2016–2020', retrieved_at: X.read_on, raw_snapshot: { path: EVIDENCE, sha256: evSha }, parser_version: 'romania-parliament-v1', parser_sha256: parserSha, fields_covered: ['seats_by_mechanism.national_minority_organisations'], published_or_derived: 'published' }] : [])] });
    out.electoral_systems.push({ electoral_system_id: `es-ro-${k.code}-2016`, country: 'romania', election_id: electionId, valid_from: date, valid_to: date, interval_basis: 'election-specific: Law 208/2015 as applied in 2016; the institutional registry holds the statute read from the Chamber of Deputies site (partly verified)', system_family: `list proportional representation in 43 constituencies (42 counties and Bucharest, plus abroad) with national pooling of remainders${ch === 'CD' ? '; national-minority organisation seats' : ''}`, vote_type: k.vote, allocation_method: 'constituency quota (electoral coefficient), then national D’Hondt over pooled remainders', base_seats: k.listSeats,
      vote_definitions: [{ id: k.vote, kind: 'list', label: t(`${k.en} list votes`, `${k.zh}名单票`), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC] }],
      national_rules: { nationalAllocation: 'Remaining seats are allocated nationally by D’Hondt over the pooled remainders of lists above the threshold, then assigned to constituencies.', districtAllocation: 'In each constituency lists first win as many seats as their votes contain the electoral coefficient.',
        thresholds: [{ appliesTo: 'party list', percent: 5, description: t('A list needs at least 5% of national valid votes (Law 208/2015; higher thresholds for alliances; the alternative constituency criterion is not tested here). The six lists holding seats are exactly those above 5%.', '名单须获得全国有效票至少 5%（第 208/2015 号法律；联盟门槛更高；此处未检验替代的选区条件）。获得席位的六份名单恰为超过 5% 者。'), sourceIds: [SRC] }],
        minorityRepresentation: ch === 'CD' ? t('Organisations of national minorities that win no list seat receive one Chamber seat each if they obtain at least 5% of the average valid votes per deputy (Art. 56); in 2016 seventeen did, matching the organisations the Chamber lists for its 2016–2020 term.', '未获名单席位的少数民族组织，若得票达到每名议员平均有效票的 5%，各获众议院一席（第 56 条）；2016 年有 17 个组织达到，与众议院 2016–2020 届所列组织一致。') : t('No minority-organisation seats in the Senate.', '参议院不设少数民族组织席位。'),
        totalSeatsDefinition: ch === 'CD' ? t('329 deputies: 312 list seats in 43 constituencies and 17 national-minority organisation seats.', '329 名众议员：43 个选区名单席位 312 席，少数民族组织 17 席。') : t('136 senators, all from lists in 43 constituencies.', '136 名参议员，全部由 43 个选区的名单产生。'), sourceIds: [SRC] },
      notes: t(`Votes are national sums of the AEP polling-station and postal files; seats come from the AEP mandate file. ${checks[ch].allocation_model === 'reproduced exactly' ? 'A two-stage allocation reproduces the seats exactly.' : 'A simplified two-stage allocation reproduces the seats within one seat; the official file is used.'} Turnout is not published because the AEP count columns are undocumented. Independent candidates are aggregated without names.`, `得票为 AEP 投票站文件与邮寄投票文件的全国合计；席位来自 AEP 席位分配文件。${checks[ch].allocation_model === 'reproduced exactly' ? '两阶段分配可完全复现席位。' : '简化的两阶段分配与官方席位相差一席以内；采用官方文件。'}由于 AEP 计数字段未有说明，不发布投票率。独立候选人合并列示，不存储姓名。`),
      seat_check: checks[ch], provenance: [prov('mandate allocation file', ['base_seats'], 'mandates')] });
    out.political_source_registry.push({ source_id: SRC, country: 'romania', institution: 'Autoritatea Electorală Permanentă (Permanent Electoral Authority)', dataset: `Alegeri pentru Camera Deputaților și Senat 2016 — ${k.chamber}: centralised polling-station results, postal-vote results and mandate allocation by constituency (data.gov.ro)`, tier: 'tier1_official', url: E.dataset_page, licence_status: 'open_licence_ogl_rou_1_0', raw_redistribution: 'national sums and seat tables only; polling-station files not redistributed', licence_url: ev.rights.licence_url, attribution: 'Autoritatea Electorală Permanentă, data.gov.ro', retrieved_at: E.retrieved_at, raw_sha256: evSha, raw_path: EVIDENCE, files: c.files });
  }
  out.political_source_registry.push({ source_id: 'src-ro-cdep-structure-2016', country: 'romania', institution: 'Camera Deputaților', dataset: 'Formaţiuni politice şi organizaţii reprezentate în Camera Deputaţilor, legislatura 2016–2020 (organisations of national minorities only)', tier: 'tier1_official', url: X.source, role: 'cross_check_minority_seats', licence_status: 'official_text_law_8_1996_art_9_owner_reading', raw_redistribution: 'organisation abbreviations and a text checksum only', licence_url: ev.rights.licence_url, attribution: 'Camera Deputaților', retrieved_at: X.read_on, raw_sha256: evSha, raw_path: EVIDENCE, page_block_sha256: X.block_text_sha256 });
  const checks2020 = buildBec('2020', out, ev, evSha, parserSha);
  const checks2024 = buildBec('2024', out, ev, evSha, parserSha);
  // 2012 rows come first (chronological order); the 2016–2024 rows are unchanged.
  const o12 = Object.fromEntries(ROMANIAN_STORES.map((s) => [s, []]));
  const checks2012 = buildAep2012(o12, ev, evSha, parserSha);
  for (const s of ROMANIAN_STORES) out[s] = [...o12[s], ...out[s]];
  return { ...out, checks: { 2012: checks2012, 2016: checks, 2020: checks2020, 2024: checks2024 } };
}

const BEC = {
  2020: { date: '2020-12-06', term: '2020–2024', yy: '20' },
  2024: { date: '2024-12-01', term: '2024–2028', yy: '24' },
};
const NUM_WORDS = { 18: ['eighteen', '18'], 19: ['nineteen', '19'] };

function buildBec(year, out, ev, evSha, parserSha) {
  const E = ev.elections[year], Y = BEC[year], date = E.polling_day.date, checks = {};
  if (date !== Y.date) fail(`${year} polling day`);
  for (const ch of ['CD', 'S']) {
    const k = CH[ch], c = E.chambers[ch], A = c.act, n = c.counts, r = reconcile2024(ch, c, year);
    checks[ch] = r;
    const electionId = `el-ro-${k.code}-${date}`, SRC = `src-ro-bec-${k.code}-${year}`, archived = Boolean(A.archive_copy);
    const vintage = `final: Central Electoral Bureau act no. ${A.number} of ${A.date} (${A.title}); scanned PDF ${archived ? 'from an Internet Archive capture saved by the owner' : 'saved by the owner'}, transcribed by eye`;
    const over = Object.keys(c.elected_k).length;
    const prov = (record, fields, how = 'published') => ({ source_id: SRC, source_url: A.url, source_record_id: `act ${A.number}, ${record}`, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evSha }, parser_version: 'romania-parliament-v2', parser_sha256: parserSha, fields_covered: fields, published_or_derived: how, publisher_file_sha256: A.sha256 });
    out.elections.push({ election_id: electionId, country: 'romania', election_type: 'national_parliament', chamber: k.chamber, date, date_end: null, date_basis: E.polling_day.basis, result_coverage: ch === 'CD' ? 'all_lists_national_independents_aggregated_minority_seats_by_rule' : 'all_lists_national_independents_aggregated', year: Number(year), legislature_id: `lg-ro-${k.code}-${year}`, electoral_system_id: `es-ro-${k.code}-${year}`, result_status: 'official_final', result_vintage: vintage, separate_chamber_note: 'The Chamber of Deputies and the Senate are separate elections with separate ballots; their votes and seats are never combined.', later_poll_date: null, repeat_poll_date: null, provenance: [prov(archived ? 'act date; polling day printed on the results page (polling day not printed in the result sections)' : 'act date (polling day not printed in the result sections)', ['date'], 'derived_from_evidence_record')] });
    const def = 'Registered voters = a (permanent, supplementary, mobile-ballot-box and postal lists); voters = b (persons who voted, from the same lists); valid votes = c; null votes = d. Blank ballots (h) are counted separately in the act. The act prints no turnout percentage; derived turnout = b ÷ a. Both chambers share a and b.';
    out.election_turnout.push({ election_id: electionId, country: 'romania', geography: 'national', vote_type: k.vote, result_vintage: vintage, eligible_voters: n.a, voters_turned_out: n.b, voters: n.b, valid_votes: n.c, invalid_votes: n.d, ballots_cast: null, blank_votes: n.h, published_turnout: null, derived_turnout: (n.b / n.a) * 100, turnout_definition: def, turnout_basis: { numerator: 'voters_turned_out', denominator: 'registered_electorate', definition: def, sourceIds: [SRC] }, published_or_derived_note: 'counts printed in the act (sections a–d, h); percentage derived', provenance: [prov('sections a, b, c, d and h', ['eligible_voters', 'voters_turned_out', 'voters', 'valid_votes', 'invalid_votes', 'blank_votes'])] });
    const minority = new Set(ch === 'CD' ? c.minority.entitled_m5 : []);
    for (const l of c.lists) {
      const id = `ct-ro-${k.code}${Y.yy}-${String(l.row).padStart(3, '0')}`, mSeat = minority.has(l.name) ? 1 : 0, isMin = l.kind === 'national_minority_organisation';
      const listSeats = c.elected_k[l.name] ?? 0, firstStage = r.first_stage[l.name] ?? 0, national = r.national_stage[l.name] ?? 0, undeployed = r.undeployed[l.name] ?? 0;
      out.electoral_contestants.push({ contestant_id: id, country: 'romania', election_id: electionId, contestant_kind: isMin ? 'national_minority_organisation' : 'party_or_political_formation_list', native_list_type: isMin ? 'organizație a cetățenilor aparținând minorităților naționale' : 'listă de candidați', kind_basis: isMin ? 'listed in section m.1 of the act among organisations of citizens belonging to national minorities' : 'every other list; party and alliance are not distinguished in the act', list_number: l.row, list_number_basis: 'row of section e (ordered by national votes)', registered_label_native: null, historical_display_label: l.name, display_label_rule: l.label_basis === 'partial_personal_name_omitted' ? 'the printed name contains persons’ surnames; shown by the printed name without them' : 'list name as printed in the act', label_basis: l.label_basis ?? 'verbatim', ...(l.title_sha256 ? { title_sha256: l.title_sha256 } : {}), lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`section e, row ${l.row}`, ['historical_display_label'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: k.vote, valid_votes: n.c, total_seats: r.total_seats, votes: l.votes, published_vote_share: null, derived_vote_share: (l.votes / n.c) * 100, seats: listSeats + mSeat, list_seats: listSeats, minority_seats: mSeat, first_stage_seats: firstStage, national_stage_seats: national, ...(undeployed ? { national_stage_entitlement: national + undeployed, undeployed_seats: undeployed } : {}),
        seat_basis: mSeat ? 'one Chamber seat for a national-minority organisation under Art. 56 (section m.5)' : listSeats ? `elected list members in section k (${firstStage} in the first stage, ${national} in the national stage of section j)${undeployed ? `; ${undeployed} further national-stage seat(s) of its D'Hondt entitlement were not deployed to a constituency in the act` : ''}` : 'no seat', published_seat_share: null, result_vintage: vintage, provenance: [prov(`section e, row ${l.row}`, ['votes']), ...(listSeats ? [prov('sections j and k', ['list_seats', 'national_stage_seats'], 'derived_count_of_published_rows')] : []), ...(mSeat ? [prov('section m.5', ['minority_seats'])] : [])] });
    }
    const indId = `ct-ro-${k.code}${Y.yy}-ind`;
    out.electoral_contestants.push({ contestant_id: indId, country: 'romania', election_id: electionId, contestant_kind: 'independent_candidates_aggregate', native_list_type: 'candidați independenți', kind_basis: `${c.independents.candidates} independent candidate${c.independents.candidates === 1 ? '' : 's'} (separate rows of section e), aggregated; names not stored`, list_number: null, list_number_basis: null, registered_label_native: null, historical_display_label: `Candidați independenți (${c.independents.candidates})`, display_label_rule: 'aggregate of independent candidates; individual names are not stored', label_basis: 'aggregate', independent_candidates: c.independents.candidates, lead_party_id: null, party_relation_status: 'not_applicable', continuous_series_eligible: false, provenance: [prov('section e, independent candidates summed', ['independent_candidates'], 'derived_sum_of_published_rows')] });
    out.election_results.push({ result_id: `er-${indId}`, country: 'romania', geography: 'national', election_id: electionId, contestant_ref: indId, vote_type: k.vote, valid_votes: n.c, total_seats: r.total_seats, votes: c.independents.votes, published_vote_share: null, derived_vote_share: (c.independents.votes / n.c) * 100, seats: 0, seat_basis: 'no independent candidate was elected (section k)', published_seat_share: null, result_vintage: vintage, provenance: [prov('section e, independent candidates summed', ['votes'], 'derived_sum_of_published_rows')] });
    const unfilledNote = r.unfilled.length ? `${r.seat_slots} seats under the representation norm; ${r.list_seats_filled} filled: the act deploys ${Object.entries(r.undeployed).map(([p, x]) => `${x} of the national-stage seats of ${p}`).join(', ')} to no constituency, so slots stay unfilled in ${r.unfilled.map((u) => `${u.name} (${u.slots})`).join(' and ')}; the act states no reason.` : null;
    out.legislatures.push({ legislature_id: `lg-ro-${k.code}-${year}`, country: 'romania', chamber: k.chamber, official_term: Y.term, election_id: electionId, total_seats: r.total_seats, seat_slots: r.seat_slots, seats_by_mechanism: ch === 'CD' ? { list_seats_43_constituencies: r.list_seats_filled, national_minority_organisations: r.minority_seats } : { list_seats_43_constituencies_filled: r.list_seats_filled, unfilled: r.seat_slots - r.list_seats_filled }, ...(unfilledNote ? { unfilled_seats_note: unfilledNote } : {}),
      seats_by_stage: { first_stage_by_constituency: c.first_stage_by_constituency.map((x) => ({ constituency: x.constituency, name: x.name, first_stage: x.assigned, national_stage_slots: x.unassigned })), national_stage_by_list: Object.fromEntries(Object.entries(c.national_stage_j).map(([p, cs]) => [p, Object.entries(cs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).map(([cons, seats]) => ({ constituency: Number(cons), seats }))])) },
      seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('sections i.2, j and k', ['seats_by_stage', 'total_seats'], 'derived_count_of_published_rows'), ...(ch === 'CD' ? [prov('sections m.2–m.5', ['seats_by_mechanism.national_minority_organisations'])] : [])] });
    out.electoral_systems.push({ electoral_system_id: `es-ro-${k.code}-${year}`, country: 'romania', election_id: electionId, valid_from: date, valid_to: date, interval_basis: `election-specific: Law 208/2015 as applied in ${year} (section i cites its Art. 94); the institutional registry holds the statute read from the Chamber of Deputies site (partly verified)`, system_family: `list proportional representation in 43 constituencies (42 counties and Bucharest, plus abroad) with national pooling of remainders${ch === 'CD' ? '; national-minority organisation seats' : ''}`, vote_type: k.vote, allocation_method: 'constituency quota (electoral coefficient), then national D’Hondt over pooled remainders', base_seats: k.listSeats2024,
      vote_definitions: [{ id: k.vote, kind: 'list', label: t(`${k.en} list votes`, `${k.zh}名单票`), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC] }],
      national_rules: { nationalAllocation: 'Remaining seats are allocated nationally by D’Hondt over the pooled remainders of lists above the threshold (section i.1), then assigned to constituencies (section j).', districtAllocation: 'In each constituency lists first win as many seats as their votes contain the electoral coefficient (section i.2).',
        thresholds: [{ appliesTo: 'party list', percent: 5, description: t(`A list needs at least 5% of national valid votes (Law 208/2015; higher thresholds for alliances; the alternative constituency criterion is not tested here). The ${over === 7 ? 'seven' : over === 5 ? 'five' : over} lists in sections i–k are exactly those above 5%.`, `名单须获得全国有效票至少 5%（第 208/2015 号法律；联盟门槛更高；此处未检验替代的选区条件）。第 i–k 节所列${over === 7 ? '七' : over === 5 ? '五' : over}份名单恰为超过 5% 者。`), sourceIds: [SRC] }],
        minorityRepresentation: ch === 'CD' ? t(`Organisations of national minorities that win no list seat receive one Chamber seat each if they obtain at least 5% of the average valid votes per deputy (Art. 56): the act prints an average of ${c.minority.average_votes_per_deputy_m2} and a minimum of ${c.minority.minimum_votes_m3} votes; ${NUM_WORDS[r.minority_seats][0]} organisations qualified (section m.5).`, `未获名单席位的少数民族组织，若得票达到每名议员平均有效票的 5%，各获众议院一席（第 56 条）：决议载明平均票数 ${c.minority.average_votes_per_deputy_m2}、最低票数 ${c.minority.minimum_votes_m3}；共 ${NUM_WORDS[r.minority_seats][1]} 个组织达到（第 m.5 节）。`) : t('No minority-organisation seats in the Senate.', '参议院不设少数民族组织席位。'),
        totalSeatsDefinition: ch === 'CD' ? t(`${r.total_seats} deputies: ${r.list_seats_filled} list seats in 43 constituencies and ${r.minority_seats} national-minority organisation seats.`, `${r.total_seats} 名众议员：43 个选区名单席位 ${r.list_seats_filled} 席，少数民族组织 ${r.minority_seats} 席。`) : !r.unfilled.length ? t(`${r.list_seats_filled} senators: list seats in 43 constituencies; no minority-organisation seats.`, `${r.list_seats_filled} 名参议员：43 个选区名单席位；不设少数民族组织席位。`) : t(`${r.list_seats_filled} senators elected of ${r.seat_slots} seats: two national-stage seats were not deployed to a constituency in the act (Giurgiu and Ialomița each keep one slot unfilled).`, `${r.seat_slots} 个席位中选出 ${r.list_seats_filled} 名参议员：决议未将两个全国阶段席位分配到选区（久尔久和雅洛米察各有一席空缺）。`), sourceIds: [SRC] },
      notes: t(`Votes, counts and seats are from the Central Electoral Bureau's final act no. ${A.number} of ${A.date}, transcribed by eye from the scan${archived ? ' (an Internet Archive capture of the publisher file, saved by the owner)' : ''}. ${r.allocation_model[0].toUpperCase()}${r.allocation_model.slice(1)}. Turnout is derived (b ÷ a). Independent candidates are aggregated without names.${c.lists.some((l) => l.label_basis === 'partial_personal_name_omitted') ? ' One list name containing persons’ surnames is shown without them.' : ''}`, `得票、计数与席位取自中央选举局 ${A.date} 第 ${A.number} 号最终决议，依扫描件人工转录${archived ? '（所有者保存的互联网档案馆存档的发布文件）' : ''}。${r.undeployed && Object.keys(r.undeployed).length ? '对余票的全国 D’Hondt 分配复现第 j 节，但决议未分配的席位除外。' : '对余票的全国 D’Hondt 分配完全复现第 j 节。'}投票率为推算值（b ÷ a）。独立候选人合并列示，不存储姓名。${c.lists.some((l) => l.label_basis === 'partial_personal_name_omitted') ? '一个含人名的名单名称去除人名后显示。' : ''}`),
      seat_check: r, provenance: [prov('sections i–k', ['base_seats'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'romania', institution: 'Biroul Electoral Central (Central Electoral Bureau)', dataset: `${A.title} — act no. ${A.number}, ${A.date} (${A.annex}; ${A.pages} pages, scanned)`, tier: 'tier1_official', url: A.url, licence_status: 'official_text_law_8_1996_art_9_owner_reading', raw_redistribution: 'national figures and seat tables only; the act is not redistributed and candidate names are not transcribed', licence_url: A.url, licence_url_basis: 'the act itself: an official text, reused on the owner’s reading of Law 8/1996 Art. 9 (no licence exists)', attribution: 'Biroul Electoral Central', retrieved_at: E.retrieved_at, acquisition: archived ? 'owner_download_internet_archive_copy' : 'owner_manual_download', ...(archived ? { archive_copy: A.archive_copy } : {}), raw_sha256: evSha, raw_path: EVIDENCE, publisher_file_sha256: A.sha256 });
  }
  return checks;
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function romaniaFiles(data) {
  const files = {};
  for (const store of ROMANIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Romania — Parliament elections of 9 December 2012, 11 December 2016, 6 December 2020 and 1 December 2024 (Chamber of Deputies and Senate)\n\nEight separate elections, never combined: each chamber in each year is its own election.\n\n## 2012\n\nChamber of Deputies (412 seats: 315 single-member colleges, 79 additional seats and 18 national-minority organisation seats) and Senate (176 seats: 137 colleges and 39 additional seats), under Law 35/2008. Votes and counts are national sums of the Permanent Electoral Authority\'s files on data.gov.ro (OGL-ROU-1.0); the polling-station, college and county files agree exactly. Seats are the mandates printed in the AEP candidate file and are not recomputed (owner decision; the statute text was not read): seat holders are exactly the competitors above 5% of valid votes plus the Chamber\'s minority organisations, and every absolute-majority college winner holds a mandate. Turnout is derived. One competitor name containing a person\'s name is shown without it (title_sha256 kept).\n\n## 2016\n\nChamber of Deputies (329 seats: 312 list seats and 17 national-minority organisation seats) and Senate (136 seats). Votes are national sums of the Permanent Electoral Authority\'s polling-station and postal files on data.gov.ro (OGL-ROU-1.0); list seats come from its mandate allocation files; the 17 minority seats follow Law 208/2015 Art. 56 and match the organisations the Chamber of Deputies lists for its 2016–2020 term.\n\nLimits: registered voters, voters and turnout are not published (the AEP count columns are undocumented); the source is the AEP centralisation, not the Central Electoral Bureau\'s final act; the Chamber\'s seat allocation reproduces within one seat under a simplified model (the official file is used).\n\n## 2020\n\nFrom the Central Electoral Bureau\'s final acts 1640 (Senate) and 1639 (Chamber of Deputies) of 17 December 2020, read from Internet Archive captures of the publisher PDFs saved by the owner and transcribed by eye from the scans. Chamber of Deputies: 330 seats (312 list seats and 18 national-minority organisation seats, section m.5). Senate: 136 seats. National D\'Hondt over the printed remainders reproduces the national stage (section j) exactly. The polling day (6 December 2020) is printed on the bureau\'s results page, not in the acts. One list name containing persons\' surnames is shown without them.\n\n## 2024\n\nFrom the Central Electoral Bureau\'s final acts 2RF (Senate) and 3RF (Chamber of Deputies) of 7 December 2024, saved by the owner and transcribed by eye from the scans. Chamber of Deputies: 331 seats (312 list seats and 19 national-minority organisation seats, section m.5). Senate: 134 senators elected of 136 seats; the act deploys two national-stage seats to no constituency, so Giurgiu and Ialomița each keep one slot unfilled, and states no reason. Registered voters, voters, valid and null votes are printed in the act; turnout is derived (b ÷ a). National D\'Hondt over the printed remainders reproduces the national stage (section j).\n\nLimits (2020 and 2024): the polling day is not printed in the result sections; constituency votes are not in the acts; candidate names are never transcribed.\n\nAll years: independent candidates are aggregated without names; no list is linked to a party or across elections.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'romania-political-export-v1', country: 'romania', elections: data.elections.map((e) => e.election_id), coverage: '2012: Chamber of Deputies 412 of 412 seats, Senate 176 of 176 seats (seats as published, not recomputed); 2016: Chamber of Deputies 329 of 329 seats, Senate 136 of 136 seats; 2020: Chamber of Deputies 330 of 330 seats, Senate 136 of 136 seats; 2024: Chamber of Deputies 331 of 331 seats, Senate 134 senators elected of 136 seats; national level', not_included: ['2016 registered voters, voters and turnout', 'constituency vote results', 'independent candidates’ names', 'candidate names', 'party attribution and cross-election links', '2012 college-level results and seat recomputation'], stores: ROMANIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildRomania();
  const files = romaniaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Romania stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
