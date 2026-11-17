// Slovenia — National Assembly (Državni zbor) elections, from the National Electoral Commission's (Državna volilna
// komisija, DVK) minutes establishing the result ("Zapisnik o ugotovitvi izida volitev"), published in the official
// gazette (Uradni list RS), cross-checked against DVK's own result data file (owner brief 2026-11-18; owner answers:
// rights basis accepted for official texts, www.dvk-rs.si registered for manual reading).
// Built only from the committed transcription docs/political-data/raw/slovenia/dz/evidence.json (figures, list names
// and checksums; candidate names, dates of birth and addresses printed in the minutes are never stored).
// Fail-closed reconciliation:
//   - general election (88 seats): list votes = valid ballots; valid + invalid = ballots cast ≤ voters who voted ≤
//     entitled voters; printed percentages = votes ÷ valid ballots (rounded, two decimals); lists at or above 4% of all
//     list votes = the lists the minutes name; D'Hondt over all 88 seats among them (Art. 92) reproduces the seats;
//   - national-community elections (Italian, Hungarian; one seat each): candidate votes = valid ballots; valid + invalid
//     = ballots cast; the elected candidate has most votes;
//   - seats: 88 + 2 = 90. The National Council (Državni svet) is not a directly elected chamber and is not included.
//
// Usage: node scripts/political-data/slovenia/build-dz.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'docs/political-data/raw/slovenia/dz/evidence.json';
const STORE_DIR = 'src/data/political/slovenia';
const EXPORT_DIR = 'public/research-data/political/slovenia';
export const SLOVENIAN_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
export const LIST_VOTE = 'si_list_vote';
export const COMMUNITY_VOTE = 'si_national_community_candidate_vote';
export const COMMUNITY_POINTS = 'si_national_community_candidate_points';
export const YEARS = ['2014', '2018', '2022', '2026'];
const CHAMBER = 'Državni zbor';
const GENERAL = 88, TOTAL = 90;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Slovenia build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const sum = (rows, key = 'votes') => rows.reduce((n, r) => n + (r[key] ?? 0), 0);
const pct2 = (num, den) => (Math.round((num * 10000) / den) / 100).toFixed(2).replace('.', ',');

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

export function reconcile(year, E) {
  const check = (ok, what) => { if (!ok) fail(`${year}: ${what}`); };
  const g = E.general, L = g.lists;
  check(L.every((x, i) => x.row === i + 1), 'list rows not consecutive');
  check(sum(L) === g.valid, 'list votes ≠ valid ballots');
  check(g.valid + g.invalid === g.ballots_cast, 'valid + invalid ≠ ballots cast');
  check(g.ballots_cast <= g.voted && g.voted <= g.entitled, 'ballots ≤ voted ≤ entitled violated');
  check(pct2(g.voted, g.entitled) === g.voted_printed_percent, 'printed turnout ≠ voted ÷ entitled');
  check(L.every((x) => x.printed_percent === undefined || pct2(x.votes, g.valid) === x.printed_percent), 'printed percentage ≠ votes ÷ valid ballots (rounded)');
  for (let i = 1; i < L.length; i += 1) check(L[i - 1].votes >= L[i].votes, 'rows not in descending vote order');
  check(sum(L, 'seats') === GENERAL, `seats ≠ ${GENERAL}`);
  const taking = L.filter((x) => x.votes * 100 >= g.threshold_percent * g.valid);
  check(taking.length === g.lists_in_allocation_printed, `lists at or above ${g.threshold_percent}% (${taking.length}) ≠ lists named in the minutes (${g.lists_in_allocation_printed})`);
  const won = dhondt(taking.map((x) => x.votes), GENERAL);
  check(won.join() === taking.map((x) => x.seats).join(), `D'Hondt seats ${won} differ from the minutes`);
  check(L.filter((x) => !taking.includes(x)).every((x) => x.seats === 0), 'a list below the threshold holds seats');
  const nc = E.national_communities;
  check(nc.length === 2, 'expected two national-community elections');
  for (const c of nc) {
    check(c.on_roll + c.with_certificate === c.entitled, `${c.community}: roll + certificates ≠ entitled`);
    check(c.valid + c.invalid === c.ballots_cast && c.ballots_cast <= c.voted && c.voted <= c.entitled, `${c.community}: ballot accounting`);
    const n = c.candidates.length, key = c.method === 'points' ? 'points' : 'votes';
    check(['votes', 'points'].includes(c.method ?? 'votes'), `${c.community}: unknown counting method`);
    // Plain votes (2022 onwards): candidate votes = valid ballots. Ranking points (2014, 2018): a ballot gives at most
    // n + (n - 1) + … + 1 points; a sole candidate receives exactly one point per valid ballot.
    if (key === 'votes') check(sum(c.candidates) === c.valid, `${c.community}: candidate votes ≠ valid ballots`);
    else check(n === 1 ? c.candidates[0].points === c.valid : sum(c.candidates, 'points') <= (c.valid * n * (n + 1)) / 2, `${c.community}: points inconsistent with valid ballots`);
    const el = c.candidates.filter((x) => x.elected);
    check(el.length === 1 && el[0][key] === Math.max(...c.candidates.map((x) => x[key])), `${c.community}: elected candidate does not have the most ${key}`);
  }
  return { lists: L.length, valid: g.valid, threshold_votes: Math.ceil((g.threshold_percent / 100) * g.valid), lists_in_allocation: taking.length, general_seats: GENERAL, national_community_seats: 2, total_seats: GENERAL + nc.length };
}

export function buildSlovenia() {
  const buf = read(EVIDENCE);
  const evidence = JSON.parse(buf);
  const evidenceSha = sha(buf);
  const parserSha = sha(read('scripts/political-data/slovenia/build-dz.mjs'));
  const out = Object.fromEntries(SLOVENIAN_STORES.map((s) => [s, []]));
  const checks = {};
  for (const year of YEARS) {
    const E = evidence.elections[year];
    checks[year] = reconcile(year, E);
    if (checks[year].total_seats !== TOTAL) fail(`${year}: seats ≠ ${TOTAL}`);
    const M = E.minutes, X = E.cross_check, g = E.general;
    const short = year.slice(2), electionId = E.election_id, systemId = `es-si-dz-${year}`, legislatureId = `lg-si-dz-${year}`, SRC = `src-si-dvk-minutes-${year}`, XSRC = `src-si-dvk-data-${year}`;
    const vintage = `final: National Electoral Commission ${M.kind === 'report' ? 'report on the result' : 'minutes establishing the result'}, adopted ${M.adopted}${M.gazette ? ` (${M.gazette})` : ''}`;
    const points = E.national_communities.every((c) => c.method === 'points'), CTYPE = points ? COMMUNITY_POINTS : COMMUNITY_VOTE;
    if (!points && E.national_communities.some((c) => c.method === 'points')) fail(`${year}: mixed counting methods`);
    const prov = (record, fields, src = SRC, url = M.url, fileSha = M.publisher_file_sha256) => ({ source_id: src, source_url: url, source_record_id: record, retrieved_at: E.retrieved_at, raw_snapshot: { path: EVIDENCE, sha256: evidenceSha }, parser_version: 'slovenia-dz-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published', publisher_file_sha256: fileSha });
    const cross = (record, fields) => prov(record, fields, XSRC, X.url, X.publisher_file_sha256);
    out.elections.push({ election_id: electionId, country: 'slovenia', election_type: 'national_parliament', chamber: CHAMBER, date: E.polling_day, date_end: null, date_basis: 'polling day stated in the minutes', result_coverage: 'all_lists_and_both_national_community_elections_candidates_without_names', year: Number(year), legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null,
      constituency_structure: [
        { unit: 'general', constituencies: ['si-national'], seats: GENERAL, vote_type: LIST_VOTE, note: 'eight constituencies of 11 seats; list seats are fixed nationally (Art. 92), so national figures are the unit of the result' },
        { unit: 'national_community', constituencies: E.national_communities.map((c) => `si-nc-${c.community}`), seats: 2, vote_type: CTYPE },
      ],
      provenance: [prov('minutes heading and section I.A', ['date', 'result_vintage'])] });
    const genDef = 'Voters who voted (glasovalo je skupaj) / voters entitled to vote (pravico voliti je imelo) × 100, as printed in the minutes (section I.A, items 1–2).';
    out.election_turnout.push({ election_id: electionId, country: 'slovenia', geography: 'national', vote_type: LIST_VOTE, result_vintage: vintage, eligible_voters: g.entitled, voters: g.voted, valid_votes: g.valid, invalid_votes: g.invalid, ballots_cast: g.ballots_cast, published_turnout: Number(g.voted_printed_percent.replace(',', '.')), derived_turnout: (g.voted / g.entitled) * 100, entitled_on_roll: g.entitled_on_roll, entitled_with_certificate: g.entitled_with_certificate, turnout_definition: genDef, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: genDef, sourceIds: [SRC] }, provenance: [prov('section I.A items 1–5', ['eligible_voters', 'voters', 'ballots_cast', 'invalid_votes', 'valid_votes', 'published_turnout']), cross('slovenija (gl, upr) and root (glas, velj, nev)', ['voters', 'ballots_cast', 'valid_votes', 'invalid_votes'])] });
    for (const c of E.national_communities) {
      const def = `Voters who voted / voters entitled to vote in the ${c.community_en} national-community constituency (on the roll plus voters with a certificate) × 100, computed from the minutes; the minutes print no percentage.`;
      out.election_turnout.push({ election_id: electionId, country: 'slovenia', geography: `si-nc-${c.community}`, vote_type: CTYPE, result_vintage: vintage, eligible_voters: c.entitled, voters: c.voted, valid_votes: c.valid, invalid_votes: c.invalid, ballots_cast: c.ballots_cast, published_turnout: null, derived_turnout: (c.voted / c.entitled) * 100, turnout_definition: def, turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: def, sourceIds: [SRC] }, provenance: [prov(`section II (${c.community_en} community)`, ['eligible_voters', 'voters', 'ballots_cast', 'invalid_votes', 'valid_votes'])] });
    }
    for (const l of g.lists) {
      const id = `ct-si-dz${short}-${String(l.row).padStart(2, '0')}`;
      out.electoral_contestants.push({ contestant_id: id, country: 'slovenia', election_id: electionId, contestant_kind: 'electoral_list', native_list_type: 'lista kandidatov', kind_basis: 'every contestant in the general election is a list of candidates; whether a list was proposed by one party, several parties or voters is not printed in the minutes and is not stored', list_number: l.row, list_number_basis: 'row in the minutes table (ordered by votes)', dvk_list_id: l.dvk_list_id, registered_label_native: null, historical_display_label: l.display_label, display_label_rule: { verbatim: 'list name as printed', dvk_short_name_for_personal_name: 'the printed name contains a person’s name; shown by the short name the commission publishes in its result data file', dvk_short_name: 'the commission’s short list name from its final results by polling station (full names are not transcribed)' }[l.label_basis], label_basis: l.label_basis, title_sha256: l.title_sha256, lead_party_id: null, party_relation_status: 'not_attributed_no_party_register_reviewed', continuous_series_eligible: false, provenance: [prov(`section I.B item 6, row ${l.row}`, ['list_number']), cross(l.dvk_list_id ? `list st=${l.dvk_list_id}` : `column ${l.dvk_short_name}`, ['historical_display_label'])] });
      out.election_results.push({ result_id: `er-${id}`, country: 'slovenia', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: LIST_VOTE, valid_votes: g.valid, total_seats: GENERAL, votes: l.votes, published_vote_share: l.printed_percent ? Number(l.printed_percent.replace(',', '.')) : null, derived_vote_share: (l.votes / g.valid) * 100, seats: l.seats, seat_basis: "D'Hondt over all 88 seats among lists with at least 4% of all list votes nationally (Art. 92; minutes items 7–9)", in_seat_allocation: l.votes * 100 >= g.threshold_percent * g.valid, published_seat_share: null, result_vintage: vintage, provenance: [prov(`section I.B item 6 and the seat statement, row ${l.row}`, ['votes', 'seats']), cross(l.dvk_list_id ? `list st=${l.dvk_list_id} (gl, man)` : `column ${l.dvk_short_name} summed over polling stations`, ['votes'])] });
    }
    for (const c of E.national_communities) {
      for (const k of c.candidates) {
        const id = `ct-si-dz${short}-nc-${c.community.slice(0, 3)}-${String(k.row).padStart(2, '0')}`;
        out.electoral_contestants.push({ contestant_id: id, country: 'slovenia', election_id: electionId, constituency: `si-nc-${c.community}`, contestant_kind: 'individual_candidate', native_list_type: 'kandidat', kind_basis: `the ${c.community_en} national community elects one deputy from individual candidates in a separate constituency`, list_number: k.row, list_number_basis: 'row in the minutes', registered_label_native: null, historical_display_label: `Kandidat, zap. št. ${k.row}`, display_label_rule: 'candidate names are not stored; the row number in the minutes identifies the candidate', label_basis: 'row_only', name_stored: false, lead_party_id: null, party_relation_status: 'not_attributed_candidate_contest', continuous_series_eligible: false, provenance: [prov(`section II (${c.community_en} community), row ${k.row}`, ['list_number'])] });
        out.election_results.push({ result_id: `er-${id}`, country: 'slovenia', geography: `si-nc-${c.community}`, election_id: electionId, contestant_ref: id, vote_type: CTYPE, valid_votes: c.valid, total_seats: 1, votes: points ? null : k.votes, ...(points ? { points: k.points } : {}), published_vote_share: null, derived_vote_share: points ? null : (k.votes / c.valid) * 100, seats: k.elected ? 1 : 0, elected: k.elected, seat_basis: points ? `${c.community_en} national-community constituency: one deputy, the candidate with most points from ranked ballots (minutes section II prints points, točk)` : `${c.community_en} national-community constituency: one deputy, the candidate with most votes (minutes section II)`, published_seat_share: null, result_vintage: vintage, provenance: [prov(`section II (${c.community_en} community), row ${k.row}`, [points ? 'points' : 'votes', 'seats'])] });
      }
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'slovenia', chamber: CHAMBER, official_term: null, election_id: electionId, total_seats: TOTAL, seats_by_mechanism: { general_lists: GENERAL, italian_national_community: 1, hungarian_national_community: 1 }, seat_count_basis: 'election_result_vintage_not_current_composition', excluded_bodies: [{ body: 'Državni svet (National Council)', reason: 'interest-representation council elected indirectly; not a directly elected chamber and not part of this election' }], result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [prov('section I.Č item 9 and section II', ['total_seats', 'seats_by_mechanism'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'slovenia', election_id: electionId, institutional_rule_id: 'si-es-dz-constitutional', valid_from: E.polling_day, valid_to: E.polling_day, interval_basis: `election-specific: rules applied in the ${year} minutes (${M.act_cited}); the institutional registry record si-es-dz-constitutional holds the statutory text read from PISRS`, system_family: 'list proportional representation (eight 11-seat constituencies, seats fixed nationally) plus two national-community deputies elected separately', vote_type: LIST_VOTE, allocation_method: "D'Hondt over all 88 seats nationally among lists with at least 4% (Art. 92); first distribution in constituencies by the Droop quota (Arts. 90–91), remaining seats to constituencies by largest remainders (Art. 93)", base_seats: TOTAL,
      vote_definitions: [
        { id: LIST_VOTE, kind: 'list', label: t('List votes (general election)', '名单票（一般选举）'), denominator: 'valid_votes', seatScope: 'general_88', sourceIds: [SRC, XSRC] },
        points ? { id: COMMUNITY_POINTS, kind: 'candidate', label: t('National-community candidate points (ranked ballot)', '民族共同体候选人得分（排序投票）'), denominator: null, seatScope: 'national_community_constituency', sourceIds: [SRC] } : { id: COMMUNITY_VOTE, kind: 'candidate', label: t('National-community candidate votes', '民族共同体候选人票'), denominator: 'valid_votes', seatScope: 'national_community_constituency', sourceIds: [SRC] },
      ],
      national_rules: {
        nationalAllocation: "Seats per list are fixed by D'Hondt over all 88 seats among lists with at least 4% of all list votes (Art. 92).",
        districtAllocation: 'Each of eight constituencies elects 11 deputies: a list first wins seats there by the Droop quota (Arts. 90–91); the remaining seats are assigned to constituencies by largest remainders (Art. 93).',
        thresholds: [{ appliesTo: 'list of candidates, nationally', percent: 4, description: t('A list needs at least 4% of all list votes in the country to take part in the seat allocation (minutes item 7, ZVDZ Art. 90(2) and 92(3)).', '名单须获得全国全部名单票至少 4% 才能参与席位分配（纪要第 7 项，ZVDZ 第 90 条第 2 款、第 92 条第 3 款）。'), sourceIds: [SRC] }],
        minorityRepresentation: points ? t(`The Italian and the Hungarian national communities each elect one deputy in a separate constituency, from individual candidates. In ${year} voters ranked the candidates and the minutes print points (točk); the candidate with most points is elected. Members of these communities also vote in the general election. Candidate names are not stored.`, `意大利族和匈牙利族民族共同体各在单独选区从个人候选人中选出一名议员。${year} 年选民对候选人排序，纪要列出得分（točk），得分最多者当选。这些共同体成员也参加一般选举。不存储候选人姓名。`) : t('The Italian and the Hungarian national communities each elect one deputy in a separate constituency, from individual candidates; the candidate with most votes is elected. Members of these communities also vote in the general election. Candidate names are not stored.', '意大利族和匈牙利族民族共同体各在单独选区从个人候选人中选出一名议员，得票最多者当选。这些共同体成员也参加一般选举。不存储候选人姓名。'),
        totalSeatsDefinition: t('90 seats: 88 from lists of candidates and 2 national-community deputies. The National Council (Državni svet) is a separate, indirectly elected body and is not part of this election.', '90 席：名单产生 88 席，民族共同体议员 2 席。国民委员会（Državni svet）是另行间接选举的机构，不属于本次选举。'),
        sourceIds: [SRC],
      },
      notes: year === '2026' ? t("National list votes and seats are printed in the commission's minutes and agree with its result data file; the seats reproduce by D'Hondt with the 4% threshold. Vote shares are printed in the minutes (rounded to two decimals). Constituency-level results are not stored in this release.", '全国名单得票与席位见选举委员会纪要，并与其结果数据文件一致；席位可按 D’Hondt 与 4% 门槛复现。得票率见纪要（四舍五入至两位小数）。本次未存储选区级结果。')
        : t(`The commission's ${M.kind === 'report' ? 'report' : 'minutes'} (a scanned document) prints the totals, the seats and the national-community results; national list votes are the sums of its final results by polling station, which equal the printed totals, and the seats reproduce by D'Hondt with the 4% threshold. Vote shares are computed here. Constituency-level results are not stored in this release.`, `选举委员会的${M.kind === 'report' ? '报告' : '纪要'}（扫描件）列出总数、席位和民族共同体结果；全国名单票为其按投票站最终结果的合计，与所列总数一致，席位可按 D’Hondt 与 4% 门槛复现。得票率在此计算。本次未存储选区级结果。`),
      seat_check: checks[year], provenance: [prov('section I.C–Č items 7–9', ['allocation_method', 'thresholds', 'base_seats'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'slovenia', institution: 'Državna volilna komisija (National Electoral Commission)', dataset: `${M.title} (${[M.gazette, M.dvk_number ? `DVK ${M.dvk_number}` : null].filter(Boolean).join('; ')})`, tier: 'tier1_official', url: M.url, licence_status: 'official_text_zasp_art_9_owner_reading_no_licence', raw_redistribution: 'transcribed_figures_and_list_names_only_document_and_personal_data_not_redistributed', licence_url: evidence.rights.url, attribution: M.gazette ? 'Državna volilna komisija; Uradni list Republike Slovenije' : 'Državna volilna komisija', retrieved_at: E.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_file_sha256: M.publisher_file_sha256, acquisition: M.how });
    out.political_source_registry.push({ source_id: XSRC, country: 'slovenia', institution: 'Državna volilna komisija (National Electoral Commission)', dataset: X.title, tier: 'tier1_official', url: X.url, role: 'cross_check_and_short_names', licence_status: 'official_text_zasp_art_9_owner_reading_no_licence', raw_redistribution: 'list short names and cross-check only', licence_url: evidence.rights.url, attribution: 'Državna volilna komisija', retrieved_at: X.retrieved_at, raw_sha256: evidenceSha, raw_path: EVIDENCE, publisher_file_sha256: X.publisher_file_sha256, ...(X.turnout_file_sha256 ? { turnout_file_sha256: X.turnout_file_sha256 } : {}), ...(X.data_file ? { data_file: X.data_file, data_file_sha256: X.data_file_sha256 } : {}) });
  }
  return { ...out, checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function sloveniaFiles(data) {
  const files = {};
  for (const store of SLOVENIAN_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = `# Slovenia — National Assembly (Državni zbor) elections\n\nElections: ${data.elections.map((e) => e.date).join(', ')}. Whole chamber (90 seats): 88 deputies from lists of candidates (national figures; seats fixed nationally by D'Hondt among lists with at least 4%) and two national-community deputies (Italian and Hungarian), elected separately from individual candidates. Source: the National Electoral Commission's minutes establishing the result, published in the official gazette (Uradni list RS), cross-checked against the commission's result data file.\n\nLabels: list names as printed in the minutes; a name containing a person's name is shown by the short name the commission publishes. National-community candidates are stored without names. The National Council (Državni svet) is not a directly elected chamber and is not included. No list is linked to a party or across elections. Constituency-level results are not included in this release.\n\nReuse basis: official texts are not protected by copyright (ZASP Art. 9), recorded as the owner's reading of the statute, not a licence.\n`;
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'slovenia-political-export-v1', country: 'slovenia', elections: data.elections.map((e) => e.election_id), coverage: 'whole_chamber_90_of_90_seats', units: 'national (general election) and si-nc-* (national-community elections)', label_rule: 'list names as printed; names containing a person replaced by the commission short name; national-community candidates without names', not_included: ['candidate names and personal data', 'constituency and district results', 'party attribution and cross-election links', 'Državni svet (indirectly elected)'], stores: SLOVENIAN_STORES }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildSlovenia();
  const files = sloveniaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Slovenia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', checks: data.checks, files: Object.keys(files).length }));
}
