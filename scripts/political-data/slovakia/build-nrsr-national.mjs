// Slovakia — National Council election of 30 September 2023, national level. Built only from the committed national section
// of the State Commission minutes (docs/political-data/raw/slovakia/nrsr2023/). Fail-closed: every total is reconciled before
// anything is written. A list's kind is taken only from what the minutes state; lists below the thresholds stay not established.
//
// Usage: node scripts/political-data/slovakia/build-nrsr-national.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW = 'docs/political-data/raw/slovakia/nrsr2023';
const STORE_DIR = 'src/data/political/slovakia';
const EXPORT_DIR = 'public/research-data/political/slovakia';
export const SLOVAK_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Slovakia build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const int = (s) => { const n = Number(String(s).replace(/\s/g, '')); if (!Number.isSafeInteger(n)) fail(`not a whole number: ${s}`); return n; };

export function parseMinutes(text) {
  const s = text.replaceAll('\f', '').replace(/\[\[page \d+\]\]\n/g, '').replace(/^\d+ \/ 69$/gm, '').replace(/^Číslo a názov politickej strany alebo koalície Počet platných\nhlasov\nPodiel platných\nhlasov v %$/gm, '');
  const table = s.slice(s.indexOf('Počet platných hlasov odovzdaných pre každú'), s.indexOf('Spolu ')).replace(/^.*\n/, '');
  const lists = [...table.matchAll(/^(\d{1,2}) ([\s\S]+?) ?\n?(\d{1,3}(?: \d{3})*)\n(\d{1,2},\d{2})$/gm)].map((m) => ({ code: Number(m[1]), label: m[2].replace(/\s*\n\s*/g, ' ').trim(), votes: int(m[3]), share: Number(m[4].replace(',', '.')) }));
  const qualified = s.slice(s.indexOf('najmenej 5% tieto politické strany'), s.indexOf('najmenej 7% tieto koalície'));
  const coalitions = s.slice(s.indexOf('najmenej 7% tieto koalície'), s.indexOf('Na základe výsledkov hlasovania'));
  const codes = (part) => [...part.matchAll(/^(\d{1,2}) /gm)].map((m) => Number(m[1]));
  return { lists, validVotes: int((s.match(/^Spolu ([\d ]+)$/m) ?? fail('valid-vote total not found'))[1]), partyCodes: codes(qualified), coalitionCodes: codes(coalitions) };
}

export function buildSlovakia() {
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const evidenceSha = sha(evidenceBuf);
  const parserSha = sha(read('scripts/political-data/slovakia/build-nrsr-national.mjs'));
  const m = evidence.minutes;
  const excerpt = read(m.national_excerpt.path);
  if (sha(excerpt) !== m.national_excerpt.sha256) fail('excerpt checksum differs from evidence');
  const { lists, validVotes, partyCodes, coalitionCodes } = parseMinutes(excerpt.toString('utf8'));
  const seats = evidence.elected_counts.by_list;
  // Visually checked page-one figures: the text layer scrambles these labels, so values are matched to the rendered page.
  const registered = 4388872, voters = 3007123, turnout = 68.51;
  for (const value of ['4 388 872', '3 007 123', '68,51', '6 014']) if (!excerpt.toString('utf8').includes(value)) fail(`${value} not in excerpt`);
  if (lists.length !== 25 || lists.map((l) => l.code).join() !== Array.from({ length: 25 }, (_, i) => i + 1).join()) fail(`expected lists 1–25, got ${lists.map((l) => l.code)}`);
  if (lists.reduce((n, l) => n + l.votes, 0) !== validVotes) fail('list votes ≠ valid votes');
  if (Object.values(seats).reduce((n, v) => n + v, 0) !== 150) fail('seats ≠ 150');
  if (Math.floor((voters * 10000) / registered) / 100 !== turnout) fail('turnout does not reproduce');
  for (const l of lists) if (Math.floor((l.votes * 10000) / validVotes) / 100 !== l.share) fail(`list ${l.code} share is not the truncated share`);
  if ([...partyCodes, ...coalitionCodes].sort((a, b) => a - b).join() !== Object.keys(seats).map(Number).sort((a, b) => a - b).join()) fail('lists passing a threshold differ from lists with seats');
  const electionId = 'el-sk-nrsr-2023-09-30', systemId = 'es-sk-nrsr-2023', legislatureId = 'lg-sk-nrsr-2023', SRC = 'src-sk-state-commission-minutes-2023', LAW = 'src-sk-act-180-2014', EVIDENCE = 'src-sk-nrsr-evidence';
  const vintage = 'final: State Commission minutes on the result of the election of 30 September 2023';
  const prov = (id, url, record, rawPath, rawSha, fields, at = m.retrieved_at) => ({ source_id: id, source_url: url, source_record_id: record, retrieved_at: at, raw_snapshot: { path: rawPath, sha256: rawSha }, parser_version: 'slovakia-nrsr-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
  const mp = (record, fields) => prov(SRC, m.url, record, m.national_excerpt.path, m.national_excerpt.sha256, fields);
  const lawUrl = evidence.rules.source.url, rights = evidence.rights.statute.url;
  const lp = (fields) => prov(LAW, lawUrl, 'Act 180/2014 Coll. §§ 66, 68 (quoted)', `${RAW}/evidence.json`, evidenceSha, fields);
  const out = Object.fromEntries(SLOVAK_STORES.map((s) => [s, []]));
  out.elections.push({ election_id: electionId, country: 'slovakia', election_type: 'national_parliament', chamber: 'Národná rada', date: '2023-09-30', date_end: null, year: 2023, legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, provenance: [mp('minutes, title', ['date', 'chamber', 'result_vintage'])] });
  out.election_turnout.push({ election_id: electionId, country: 'slovakia', geography: 'national', vote_type: 'nrsr_list_vote', result_vintage: vintage, eligible_voters: registered, voters, valid_votes: validVotes, invalid_votes: null, ballots_cast: null, published_turnout: turnout, derived_turnout: (voters / registered) * 100, turnout_definition: 'Published turnout (účasť voličov) reproduces as voters who took part / voters on the electoral rolls × 100, truncated to two decimals. Invalid votes are not stated in the minutes and are not reconstructed.', turnout_basis: { numerator: 'voters', denominator: 'registered_electorate', definition: 'voters who took part / voters on the electoral rolls × 100 (State Commission minutes)', sourceIds: [SRC] }, provenance: [mp('minutes, page 1 summary', ['eligible_voters', 'voters', 'published_turnout', 'valid_votes'])] });
  for (const l of lists) {
    const id = `ct-sk-nrsr2023-${String(l.code).padStart(2, '0')}`;
    const kind = partyCodes.includes(l.code) ? 'party_list' : coalitionCodes.includes(l.code) ? 'coalition' : 'electoral_list_kind_not_established';
    out.electoral_contestants.push({ contestant_id: id, country: 'slovakia', election_id: electionId, contestant_kind: kind, kind_basis: kind === 'electoral_list_kind_not_established' ? 'the minutes state a kind only for lists that passed a threshold' : 'stated by the threshold finding in the minutes', list_number: l.code, registered_label_native: l.label, historical_display_label: l.label, display_label_rule: 'official list name as printed in the minutes', lead_party_id: null, party_relation_status: kind === 'coalition' ? 'coalition_members_not_established_no_vote_or_seat_attribution' : 'party_register_not_reviewed', continuous_series_eligible: false, provenance: [mp(`minutes, list ${l.code}`, ['list_number', 'registered_label_native', 'contestant_kind'])] });
    out.election_results.push({ result_id: `er-${id}`, country: 'slovakia', geography: 'national', election_id: electionId, contestant_ref: id, vote_type: 'nrsr_list_vote', valid_votes: validVotes, total_seats: 150, votes: l.votes, published_vote_share: l.share, derived_vote_share: (l.votes / validVotes) * 100, seats: seats[l.code] ?? 0, seat_basis: seats[l.code] ? 'sum of the printed women and men elected for this list' : 'did not pass a threshold, recorded as 0', published_seat_share: null, result_vintage: vintage, provenance: [mp(`minutes, list ${l.code}`, ['votes', 'published_vote_share', 'seats'])] });
  }
  out.legislatures.push({ legislature_id: legislatureId, country: 'slovakia', chamber: 'Národná rada', official_term: null, election_id: electionId, total_seats: 150, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [mp('minutes, printed elected totals', ['total_seats'])] });
  out.electoral_systems.push({ electoral_system_id: systemId, country: 'slovakia', election_id: electionId, valid_from: '2023-09-30', valid_to: '2023-09-30', interval_basis: 'election-specific rule observation (Act 180/2014 Coll., version of 1 March 2023), not legal enactment dates', system_family: 'list proportional representation in one national district', vote_type: 'nrsr_list_vote', allocation_method: 'national quota: votes of qualifying lists ÷ 151, then largest remainders (§ 68)', base_seats: 150, vote_definitions: [{ id: 'nrsr_list_vote', kind: 'list', label: t('List votes (one list vote per voter)', '名单票（每名选民一票）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC, LAW] }], national_rules: { nationalAllocation: 'The votes of qualifying lists are divided by 151; each list receives the whole number of quotas in its votes, and remaining seats go to the largest remainders (§ 68).', districtAllocation: null, thresholds: [{ appliesTo: 'political party', percent: 5, description: t('Parties below 5% of valid votes take no part in the allocation (§ 66(2)(a)).', '低于有效票 5% 的政党不参与席位分配（第 66 条第 2 款 a 项）。'), sourceIds: [LAW] }, { appliesTo: 'coalition of two or three parties', percent: 7, description: t('Coalitions of two or three parties below 7% take no part (§ 66(2)(b)).', '两或三个政党组成的联盟低于 7% 时不参与（第 66 条第 2 款 b 项）。'), sourceIds: [LAW] }, { appliesTo: 'coalition of four or more parties', percent: 10, description: t('Coalitions of at least four parties below 10% take no part (§ 66(2)(c)).', '至少四个政党组成的联盟低于 10% 时不参与（第 66 条第 2 款 c 项）。'), sourceIds: [LAW] }], minorityRepresentation: null, totalSeatsDefinition: t('150 seats, as the sum of the elected counts printed in the minutes.', '共 150 席，为会议记录所列当选人数之和。'), sourceIds: [LAW, SRC] }, notes: t('List proportional representation with one national district and 150 seats; thresholds 5%, 7% and 10% by list type. Published shares are truncated to two decimals. The minutes state a list kind only for lists that passed a threshold, so 18 lists have no established kind. Coalition votes and seats are not divided among members.', '单一全国选区的名单比例代表制，共 150 席；门槛按名单类型分别为 5%、7%、10%。公布的得票率截断保留两位小数。会议记录仅载明通过门槛的名单类型，因此 18 个名单类型尚未确定。联盟的票数和席位不分配给各成员。'), provenance: [lp(['system_family', 'allocation_method', 'base_seats', 'national_rules']), mp('minutes', ['notes'])] });
  out.political_source_registry.push({ source_id: SRC, country: 'slovakia', institution: 'Štátna komisia pre voľby a kontrolu financovania politických strán', dataset: m.title, tier: 'tier1_official', url: m.url, licence_status: 'published_facts_section_5a_copyright_act_no_licence', raw_redistribution: 'national_section_excerpt_only_candidates_not_redistributed', licence_url: rights, attribution: 'Štátna komisia pre voľby a kontrolu financovania politických strán', retrieved_at: m.retrieved_at, raw_sha256: m.national_excerpt.sha256, raw_path: m.national_excerpt.path, publisher_pdf_sha256: m.pdf_sha256 });
  out.political_source_registry.push({ source_id: LAW, country: 'slovakia', institution: 'Slov-Lex', dataset: 'Act 180/2014 Coll. §§ 66, 68, version of 1 March 2023 (quoted clauses)', tier: 'tier1_official', url: lawUrl, licence_status: 'statute_not_subject_to_copyright', raw_redistribution: 'quoted_clauses_only', licence_url: rights, attribution: 'Zbierka zákonov, Slov-Lex', retrieved_at: m.retrieved_at, raw_sha256: evidenceSha, raw_path: `${RAW}/evidence.json` });
  return { ...out, checks: { lists: lists.length, validVotes, registered, voters, turnout, seats: 150 } };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function slovakiaFiles(data) {
  const files = {};
  for (const store of SLOVAK_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Slovakia — National Council election of 30 September 2023 (national level)\n\nOne election: electoral lists with their numbers, votes, truncated published shares and seats; voters on the rolls, voters who took part, valid votes and turnout. Source: minutes of the State Commission for Elections and Control of Financing of Political Parties, on the Interior Ministry site. Rules: Act 180/2014 Coll., version of 1 March 2023.\n\nRights basis: Copyright Act (version of 1 February 2023) § 5(a), information, for results the State Commission must publish under Act 180/2014 § 69. It is not established that the minutes are an official decision under § 5(b), or how the database right in § 135 applies. This is a reading of the statute, not a statement by the State Commission, and no licence exists. National figures only.\n\nA list\'s kind is given only where the minutes state it, for lists that passed a threshold; 18 lists have no established kind. A coalition\'s votes and seats belong to the coalition.\n\ncontinuous_party_series is 0: one election cannot form a series.\n\nNot included: 2020, 2016 and 2012 (minutes not located outside statistics.sk), ŠÚ SR files, invalid votes, regional results, candidates and elected deputies.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'slovakia-political-export-v1', country: 'slovakia', elections: data.elections.map((e) => e.election_id), continuous_party_series: 0, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildSlovakia();
  const files = slovakiaFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Slovakia stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', ...data.checks, files: Object.keys(files).length }));
}
