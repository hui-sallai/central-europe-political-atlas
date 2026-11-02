// Poland — Sejm elections 2011, 2015, 2019 and 2023, national level. Built only from committed Part I excerpts of the PKW
// result notices published in Dziennik Ustaw (docs/political-data/raw/poland/sejm/). Fail-closed: every total is reconciled
// before anything is written. Committee type follows the official name (Electoral Code Art. 84 § 2). Coalition members are
// not stated and not derived from names. A party link needs Art. 92 § 1 and the same party register number (EwP) printed by
// PKW; identical names without that review stay unresolved.
//
// Usage: node scripts/political-data/poland/build-sejm-national.mjs [--write]   (default: check committed files)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW = 'docs/political-data/raw/poland/sejm';
const STORE_DIR = 'src/data/political/poland';
const EXPORT_DIR = 'public/research-data/political/poland';
export const POLAND_STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry', 'political_parties', 'contestant_members', 'party_identity_links'];
const EXPECTED = { 2011: { lists: 11, valid: 14369503, turnout: 48.92 }, 2015: { lists: 17, valid: 15200671, turnout: 50.92 }, 2019: { lists: 10, valid: 18470710, turnout: 61.74 }, 2023: { lists: 12, valid: 21596674, turnout: 74.38 } };
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (m) => { throw new Error(`Poland build failed: ${m}`); };
const t = (en, zh) => ({ en, 'zh-CN': zh });
const int = (s) => { const n = Number(String(s).replace(/\s/g, '')); if (!Number.isSafeInteger(n)) fail(`not a whole number: ${s}`); return n; };
const dec = (s) => Number(String(s).replace(',', '.'));
const normalise = (s) => s.replaceAll("\f", "").replace(/\[\[page \d+\]\]\n/g, '').replace(/^Dziennik Ustaw.*Poz\. \d+\s*$/gm, '').replace(/(\p{L})-\n(\p{L})/gu, '$1$2').replace(/\s+/g, ' ');
const key = (name) => name.toLocaleLowerCase('pl').replace(/\s+/g, ' ').trim();

export function parseNotice(text, year) {
  const s = normalise(text);
  const one = (re, what) => (s.match(re) ?? fail(`${year}: ${what} not found`))[1];
  const national = {
    committees: int(one(/przez (\d+) komitet/, 'committee count')),
    eligible: int(one(/Liczba osób uprawnionych do głosowania wyn\p{L}+ ([\d ]+?)[.;]/u, 'electorate')),
    issued: int(one(year === 2023 ? /\(łącznie\) ([\d ]+)\./ : year === 2011 ? /Karty do głosowania wydano ([\d ]+) osobom/ : /Liczba osób, którym wydano karty do głosowania wyniosła: ([\d ]+),/, 'ballots issued')),
    invalidBallots: int(one(/Liczba kart nieważnych wyniosła ([\d ]+)\./, 'invalid ballots')),
    validBallots: int(one(/Liczba kart ważnych wyniosła ([\d ]+)\./, 'valid ballots')),
    turnout: dec(one(/Frekwencja wyborcza wyniosła ([\d,]+)%/, 'turnout')),
    invalidVotes: int(one(/Liczba głosów nieważnych wyniosła ([\d ]+),/, 'invalid votes')),
    validVotes: int(one(/Liczba głosów ważnych wyniosła ([\d ]+),/, 'valid votes')),
  };
  const scope = '(?: w okręgu(?: wyborczym)? nr (\\d+))?';
  const lists = [...s.matchAll(new RegExp(`na list(?:y|ę) nr (\\d+) zgłoszon\\p{L}+${scope} przez (.+?)${scope} oddano ([\\d ]+?) głos\\p{L}*, to jest ([\\d,]+) ?%`, 'gu'))].map((m, i) => ({ item: i + 1, listNumber: Number(m[1]), district: m[2] ?? m[4] ?? null, committee: m[3].trim(), votes: int(m[5]), share: dec(m[6]) }));
  const part4 = s.slice(s.indexOf('liczbę mandatów:') + 1 || fail(`${year}: seats section not found`));
  const seated = [...part4.matchAll(new RegExp(`list(?:y|a) nr (\\d+) zgłoszon\\p{L}+${scope} przez (.+?)${scope} uzyskał\\p{L}* (\\d+) mandat`, 'gu'))].map((m) => ({ listNumber: Number(m[1]), committee: m[3].trim(), seats: Number(m[5]) }));
  for (const list of lists) {
    const hit = seated.find((x) => x.listNumber === list.listNumber && key(x.committee) === key(list.committee));
    list.inAllocation = Boolean(hit);
    list.seats = hit?.seats ?? 0;
  }
  if (seated.length !== lists.filter((l) => l.inAllocation).length) fail(`${year}: a seat row matches no list`);
  return { national, lists };
}

export function committeeType(name) {
  if (/^koalicyjny komitet wyborczy /i.test(name)) return { contestant_kind: 'coalition', committee_type: 'coalition_committee' };
  if (/^komitet wyborczy wyborców /i.test(name)) return { contestant_kind: 'voters_committee_list', committee_type: 'voters_committee' };
  if (/^komitet wyborczy /i.test(name)) return { contestant_kind: 'party_list', committee_type: 'party_committee' };
  return fail(`unknown committee type: ${name}`);
}

export function buildPoland() {
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const evidenceSha = sha(evidenceBuf);
  const parserSha = sha(read('scripts/political-data/poland/build-sejm-national.mjs'));
  const rightsUrl = evidence.rights.statute.url;
  const out = Object.fromEntries(POLAND_STORES.map((s) => [s, []]));
  const checks = {};
  const LAW = 'src-pl-electoral-code-rules', EVIDENCE = 'src-pl-sejm-evidence';
  const prov = (id, url, record, rawPath, rawSha, fields, at) => ({ source_id: id, source_url: url, source_record_id: record, retrieved_at: at, raw_snapshot: { path: rawPath, sha256: rawSha }, parser_version: 'poland-sejm-national-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' });
  const lawProv = (fields) => prov(LAW, evidence.elections[2023].rules_text.url, 'Electoral Code Art. 84, 193, 196, 197, 232 (quoted)', `${RAW}/evidence.json`, evidenceSha, fields, evidence.elections[2023].rules_text.retrieved_at);
  const byElection = {};
  for (const year of Object.keys(EXPECTED).map(Number)) {
    const e = evidence.elections[year], want = EXPECTED[year];
    const textBuf = read(e.national_excerpt.path);
    if (sha(textBuf) !== e.national_excerpt.sha256) fail(`${year}: excerpt checksum differs from evidence`);
    const { national: n, lists } = parseNotice(textBuf.toString('utf8'), year);
    if (lists.length !== want.lists || n.committees !== want.lists) fail(`${year}: ${lists.length} lists, notice says ${n.committees}, expected ${want.lists}`);
    if (n.validVotes !== want.valid) fail(`${year}: valid votes`);
    if (lists.reduce((x, l) => x + l.votes, 0) !== n.validVotes) fail(`${year}: list votes ≠ valid votes`);
    if (lists.reduce((x, l) => x + l.seats, 0) !== 460) fail(`${year}: seats ≠ 460`);
    if (n.validVotes + n.invalidVotes !== n.validBallots) fail(`${year}: valid + invalid votes ≠ valid ballots`);
    if (n.turnout !== want.turnout || Math.abs((n.validBallots / n.eligible) * 100 - n.turnout) >= 0.005) fail(`${year}: turnout does not reproduce from valid ballots`);
    for (const l of lists) { const digits = String(l.share).split('.')[1]?.length ?? 0; if (Math.abs((l.votes / n.validVotes) * 100 - l.share) > (digits > 2 ? 0.0005 : 0.005) + 1e-9) fail(`${year}: list ${l.listNumber} share does not reproduce`); }
    const electionId = `el-pl-sejm-${e.poll_date}`, systemId = `es-pl-sejm-${year}`, legislatureId = `lg-pl-sejm-${year}`, SRC = `src-pl-pkw-notice-${year}`;
    const vintage = `final: PKW notice of ${e.notice_dated} (${e.notice.citation}); validity declared by the Supreme Court (${e.validity_resolution.citation})`;
    const noticeProv = (record, fields) => prov(SRC, e.notice.url, record, e.national_excerpt.path, e.national_excerpt.sha256, fields, e.notice.retrieved_at);
    out.elections.push({ election_id: electionId, country: 'poland', election_type: 'national_parliament', chamber: 'Sejm', date: e.poll_date, date_end: null, year, legislature_id: legislatureId, electoral_system_id: systemId, result_status: 'official_final', result_vintage: vintage, later_poll_date: null, repeat_poll_date: null, validity_resolution: { citation: e.validity_resolution.citation, url: e.validity_resolution.url, finding: e.validity_resolution.finding }, provenance: [noticeProv('Part I', ['date', 'chamber', 'result_vintage'])] });
    out.election_turnout.push({ election_id: electionId, country: 'poland', geography: 'national', vote_type: 'sejm_list_vote', result_vintage: vintage, eligible_voters: n.eligible, voters: n.validBallots, ballots_issued: n.issued, invalid_ballots: n.invalidBallots, valid_votes: n.validVotes, invalid_votes: n.invalidVotes, ballots_cast: n.validBallots, published_turnout: n.turnout, derived_turnout: (n.validBallots / n.eligible) * 100, turnout_definition: 'Published turnout (frekwencja wyborcza) reproduces as valid ballots (karty ważne) / eligible voters (uprawnieni) × 100. Valid ballots equal valid plus invalid votes.', turnout_basis: { numerator: 'valid_ballots', denominator: 'registered_electorate', definition: 'valid ballots / eligible voters × 100 (reproduced from the PKW notice)', sourceIds: [SRC] }, provenance: [noticeProv('Part I, chapter 2', ['eligible_voters', 'voters', 'ballots_issued', 'invalid_ballots', 'valid_votes', 'invalid_votes', 'published_turnout'])] });
    const cid = (l) => `ct-pl-sejm${year}-${String(l.item).padStart(2, '0')}`;
    byElection[year] = lists.map((l) => ({ ...l, id: cid(l), electionId }));
    for (const l of lists) {
      const kind = committeeType(l.committee);
      out.electoral_contestants.push({ contestant_id: cid(l), country: 'poland', election_id: electionId, ...kind, kind_basis: 'official committee name, under Electoral Code Art. 84 § 2 (parties, coalitions of parties, voters)', list_number: l.listNumber, list_number_is_unique: lists.filter((x) => x.listNumber === l.listNumber).length === 1, notice_item: l.item, district_restriction: l.district === null ? null : Number(l.district), registered_label_native: l.committee, historical_display_label: l.committee, display_label_rule: 'official committee name as printed in the notice', lead_party_id: null, party_relation_status: kind.contestant_kind === 'coalition' ? 'coalition_members_not_stated_in_notice_no_vote_or_seat_attribution' : kind.committee_type === 'voters_committee' ? 'voters_committee_no_party' : 'committee_party_register_not_reviewed', continuous_series_eligible: false, provenance: [noticeProv(`Part I, chapter 3, point 1, item ${l.item}`, ['list_number', 'registered_label_native', 'committee_type'])] });
      out.election_results.push({ result_id: `er-${cid(l)}`, country: 'poland', geography: 'national', election_id: electionId, contestant_ref: cid(l), vote_type: 'sejm_list_vote', valid_votes: n.validVotes, total_seats: 460, votes: l.votes, published_vote_share: l.share, derived_vote_share: (l.votes / n.validVotes) * 100, seats: l.seats, seat_basis: l.inAllocation ? 'stated in the notice' : 'excluded from seat allocation by the notice, recorded as 0', in_seat_allocation: l.inAllocation, published_seat_share: null, result_vintage: vintage, provenance: [noticeProv(`Part I, chapter 3, item ${l.item}`, ['votes', 'published_vote_share', 'seats', 'in_seat_allocation'])] });
    }
    out.legislatures.push({ legislature_id: legislatureId, country: 'poland', chamber: 'Sejm', official_term: null, election_id: electionId, total_seats: 460, seat_count_basis: 'election_result_vintage_not_current_composition', result_vintage: vintage, start_date: null, end_date: null, date_status: 'not_acquired_not_asserted', provenance: [noticeProv('Part I, chapter 1, point 2', ['total_seats'])] });
    out.electoral_systems.push({ electoral_system_id: systemId, country: 'poland', election_id: electionId, valid_from: e.poll_date, valid_to: e.poll_date, interval_basis: `election-specific rule observation (Electoral Code; rule text read: ${e.rules_text.citation}), not legal enactment dates`, system_family: 'open-list proportional representation in 41 districts', vote_type: 'sejm_list_vote', allocation_method: 'successive divisors 1, 2, 3 … within each district (d’Hondt)', base_seats: 460, vote_definitions: [{ id: 'sejm_list_vote', kind: 'list', label: t('List votes (one vote for a candidate on a list)', '名单票（投给名单上的一名候选人）'), denominator: 'valid_votes', seatScope: 'whole_chamber', sourceIds: [SRC, LAW] }], national_rules: { nationalAllocation: 'Lists that pass the national threshold take part in the allocation; there is no national second tier.', districtAllocation: 'In each of the 41 districts the votes of each qualifying list are divided by 1, 2, 3 and so on; the largest quotients up to the district seat number each win one seat (Art. 232).', thresholds: [{ appliesTo: 'committee of a party or of voters', percent: 5, description: t('Lists below 5% of national valid votes take no part in the allocation (Art. 196 § 1).', '低于全国有效票 5% 的名单不参与席位分配（第 196 条第 1 款）。'), sourceIds: [LAW] }, { appliesTo: 'coalition committee', percent: 8, description: t('Coalition committee lists need 8% of national valid votes (Art. 196 § 2).', '联盟委员会名单须获得全国有效票 8%（第 196 条第 2 款）。'), sourceIds: [LAW] }], minorityRepresentation: t('Committees formed by voters in registered national-minority organisations may be exempted from the 5% threshold on a declaration to PKW (Art. 197).', '由已登记少数民族组织选民组成的委员会，可向国家选举委员会声明后免受 5% 门槛限制（第 197 条）。'), totalSeatsDefinition: t('460 seats (Art. 193).', '共 460 席（第 193 条）。'), sourceIds: [LAW] }, notes: t('Open-list proportional representation in 41 districts, 460 seats. Electoral lists are presented by election committees, which are specific to one election. Published vote shares are rounded by PKW. A list’s number can repeat when committees stand in different districts, so list numbers are not unique.', '41 个选区的开放名单比例代表制，共 460 席。名单由各届选举专设的选举委员会提出。公布的得票率由国家选举委员会四舍五入。不同选区的委员会可使用相同的名单编号，因此名单编号并不唯一。'), provenance: [lawProv(['system_family', 'allocation_method', 'base_seats', 'national_rules']), noticeProv('Part I, chapter 1', ['notes'])] });
    out.political_source_registry.push({ source_id: SRC, country: 'poland', institution: 'Państwowa Komisja Wyborcza', dataset: `Obwieszczenie PKW z dnia ${e.notice_dated} o wynikach wyborów do Sejmu (${e.notice.citation}), Part I`, tier: 'tier1_official', url: e.notice.url, licence_status: 'official_document_not_subject_to_copyright_art_4', raw_redistribution: 'part_I_excerpt_only_candidates_not_redistributed', licence_url: rightsUrl, attribution: `Państwowa Komisja Wyborcza, ${e.notice.citation}`, retrieved_at: e.notice.retrieved_at, raw_sha256: e.national_excerpt.sha256, raw_path: e.national_excerpt.path, publisher_pdf_sha256: e.notice.pdf_sha256 });
    checks[year] = { lists: lists.length, validVotes: n.validVotes, invalidVotes: n.invalidVotes, validBallots: n.validBallots, eligible: n.eligible, turnout: n.turnout, seats: 460 };
  }
  const statute = evidence.elections[2023].rules_text;
  out.political_source_registry.push({ source_id: LAW, country: 'poland', institution: 'Sejm RP — Dziennik Ustaw', dataset: 'Kodeks wyborczy, Art. 84, 193, 196, 197, 232 (quoted clauses)', tier: 'tier1_official', url: statute.url, licence_status: 'statute_not_subject_to_copyright', raw_redistribution: 'quoted_clauses_only', licence_url: rightsUrl, attribution: 'Dziennik Ustaw', retrieved_at: statute.retrieved_at, raw_sha256: evidenceSha, raw_path: `${RAW}/evidence.json` });
  out.political_source_registry.push({ source_id: EVIDENCE, country: 'poland', institution: 'Państwowa Komisja Wyborcza; Sąd Najwyższy', dataset: 'Evidence record: notices, validity resolutions, rights basis and identity review', tier: 'tier1_official', url: evidence.elections[2023].notice.url, licence_status: 'quoted_facts_only', raw_redistribution: 'quoted_facts_only', licence_url: rightsUrl, attribution: 'PKW; Sąd Najwyższy; Dziennik Ustaw', retrieved_at: statute.retrieved_at, raw_sha256: evidenceSha, raw_path: `${RAW}/evidence.json` });
  const years = Object.keys(byElection).map(Number).sort();
  const review = evidence.identity_review;
  const stripped = (name) => key(name).replace(/^komitet wyborczy /, '');
  const eligible = new Set();
  const verifiedPairs = new Set();
  const provOf = (y, record, fields) => prov(`src-pl-pkw-notice-${y}`, evidence.elections[y].notice.url, record, evidence.elections[y].national_excerpt.path, evidence.elections[y].national_excerpt.sha256, fields, evidence.elections[y].notice.retrieved_at);
  const evidenceProv = (record, fields) => prov(EVIDENCE, `${RAW}/evidence.json`, record, `${RAW}/evidence.json`, evidenceSha, fields, statute.retrieved_at);
  for (const party of review.parties) {
    const id = `pp-pl-ewp${String(party.ewp).padStart(4, '0')}`;
    const own = years.flatMap((y) => byElection[y].filter((l) => committeeType(l.committee).committee_type === 'party_committee' && party.committee_names.some((n) => key(n) === stripped(l.committee))).map((l) => ({ y, l })));
    if (!own.length) fail(`EwP ${party.ewp}: no committee matches`);
    out.political_parties.push({ atlas_party_id: id, country: 'poland', entity_kind: 'party', party_register_number_ewp: party.ewp, registered_name: party.name, abbreviation: party.label ?? party.name, ...(party.label_at_lists ? { abbreviation_at_lists: party.label_at_lists } : {}), names_printed_by_pkw: party.printed.map((p) => ({ report_year: p.report_year, printed: p.printed })), identity_status: 'pkw_register_number_reviewed', continuous_series_eligible: own.length > 1, legal_register_citation: review.communiques[party.printed.at(-1).report_year].url, provenance: [evidenceProv(`identity_review EwP ${party.ewp}`, ['party_register_number_ewp', 'registered_name'])] });
    for (const { y, l } of own) {
      out.contestant_members.push({ contestant_id: l.id, atlas_party_id: id, country: 'poland', election_id: l.electionId, membership_basis: 'party committee name under Electoral Code Art. 92 § 1 and register number printed by PKW', review_status: 'verified_same_election_membership', provenance: [provOf(y, `Part I, chapter 3, item ${l.item}`, ['atlas_party_id']), evidenceProv(`identity_review EwP ${party.ewp}`, ['atlas_party_id'])] });
      const c = out.electoral_contestants.find((x) => x.contestant_id === l.id);
      c.lead_party_id = id; c.party_relation_status = 'party_committee_register_number_reviewed';
    }
    for (let i = 1; i < own.length; i += 1) {
      const [a, b] = [own[i - 1], own[i]];
      const skipped = years.filter((y) => y > a.y && y < b.y);
      verifiedPairs.add(`${a.l.id}>${b.l.id}`); eligible.add(a.l.id); eligible.add(b.l.id);
      out.party_identity_links.push({ country: 'poland', fromElection: a.l.electionId, fromContestant: a.l.id, toElection: b.l.electionId, toContestant: b.l.id, relation: 'same_party', basis: 'official_register', status: 'verified', sourceIds: [`src-pl-pkw-notice-${a.y}`, `src-pl-pkw-notice-${b.y}`, EVIDENCE], note: `same party register number EwP ${party.ewp}`, ...(skipped.length ? { elections_without_own_list: skipped } : {}) });
    }
  }
  for (const c of out.electoral_contestants) c.continuous_series_eligible = eligible.has(c.contestant_id);
  // Same printed name in two elections without a register review is recorded, never treated as continuity.
  const names = [...new Set(years.flatMap((y) => byElection[y].map((l) => key(l.committee))))];
  for (const name of names) {
    const seen = years.flatMap((y) => byElection[y].filter((l) => key(l.committee) === name).map((l) => ({ y, l })));
    for (let i = 1; i < seen.length; i += 1) {
      const [a, b] = [seen[i - 1], seen[i]];
      if (verifiedPairs.has(`${a.l.id}>${b.l.id}`)) continue;
      out.party_identity_links.push({ country: 'poland', fromElection: a.l.electionId, fromContestant: a.l.id, toElection: b.l.electionId, toContestant: b.l.id, relation: 'same_party', basis: 'unresolved', status: 'unresolved', sourceIds: [`src-pl-pkw-notice-${a.y}`, `src-pl-pkw-notice-${b.y}`, EVIDENCE], note: 'same printed committee name in two elections; committees are election-specific and no register number was reviewed', code_list_name_changed: false });
    }
  }
  const prune = (s) => JSON.parse(JSON.stringify(s));
  return { ...prune(out), checks };
}

const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
export function polandFiles(data) {
  const files = {};
  for (const store of POLAND_STORES) {
    files[`${STORE_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    files[`${EXPORT_DIR}/${store}.json`] = `${JSON.stringify(data[store], null, 2)}\n`;
    const keys = [...new Set(data[store].flatMap((row) => Object.keys(row)))];
    files[`${EXPORT_DIR}/${store}.csv`] = [keys.map(cell).join(','), ...data[store].map((row) => keys.map((k) => cell(row[k])).join(','))].join('\r\n') + '\r\n';
  }
  files[`${EXPORT_DIR}/README.md`] = '# Poland — Sejm elections 2011, 2015, 2019 and 2023 (national level)\n\nFour elections: election committees with their list numbers, votes, published shares and seats; eligible voters, ballots, valid and invalid votes and turnout. Source: Państwowa Komisja Wyborcza, result notices published in Dziennik Ustaw (Dz.U. 2011 poz. 1294, 2015 poz. 1731, 2019 poz. 1955, 2023 poz. 2234); validity declared by the Supreme Court (Dz.U. 2011 poz. 1676, 2016 poz. 120, 2020 poz. 9, 2024 poz. 52).\n\nRights basis: these notices are treated as official documents outside copyright under Art. 4(2) of the Copyright Act. That is a reading of the statute, not a statement by PKW. It covers national figures from these notices only.\n\nLists belong to election committees, which exist for one election. A coalition committee\'s votes and seats belong to the coalition. Its members are not stated in these notices and are not derived from its name.\n\nParty identity: a party committee name contains the registered party name or abbreviation (Electoral Code Art. 92 § 1), and PKW communiqués in Monitor Polski print each party\'s register number (EwP). A verified link in party_identity_links needs the same EwP. A party in a coalition has no figure for that election. Other committees printed with the same name are links with status unresolved: a shared name is not evidence of one legal party. The latest communiqué read covers 2021.\n\nNot included: district or polling-station results, candidates and elected deputies.\n';
  files[`${EXPORT_DIR}/manifest.json`] = `${JSON.stringify({ schema_version: 'poland-political-export-v1', country: 'poland', elections: data.elections.map((e) => e.election_id), continuous_party_series: data.political_parties.filter((p) => p.continuous_series_eligible).length, files: Object.keys(files).filter((f) => f.startsWith(EXPORT_DIR) && !f.endsWith('manifest.json')).map((f) => ({ name: path.basename(f), sha256: sha(Buffer.from(files[f])) })) }, null, 2)}\n`;
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildPoland();
  const files = polandFiles(data);
  if (process.argv.includes('--write')) for (const [rel, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); }
  else { const stale = Object.entries(files).filter(([rel, c]) => !fs.existsSync(path.join(root, rel)) || fs.readFileSync(path.join(root, rel), 'utf8') !== c).map(([rel]) => rel); if (stale.length) { console.error(`Poland stores or exports out of date: ${stale.join(', ')}`); process.exit(1); } }
  console.log(JSON.stringify({ status: 'pass', ...data.checks, links: data.party_identity_links.length, files: Object.keys(files).length }));
}
