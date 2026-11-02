// Czechia — identity layer over the admitted Chamber of Deputies lists. Reads committed register evidence only
// (docs/political-data/raw/czechia/registers/). Distinguishes the election-specific list, the proposing party or movement,
// the coalition, coalition members, verified legal-party continuity, and explicitly unresolved relationships.
// Continuity needs the same ČSÚ proposer code AND an Interior Ministry register review; names never link anything.
// Coalition votes and seats are never divided among members. Fail-closed on any disagreement between files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './build-ps2025.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW = 'docs/political-data/raw/czechia/registers';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const fail = (msg) => { throw new Error(`Czechia identity build failed: ${msg}`); };
const objects = (text) => { const [h, ...rows] = parseCsv(text); return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const codes = (s) => s.split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
export const IDENTITY_STORES = ['political_parties', 'contestant_members', 'party_identity_links'];
const YEARS = [2017, 2021, 2025];

function registers(evidence) {
  const check = (rel) => { const hit = evidence.distributions.flatMap((d) => [d, ...Object.values(d.members ?? {})]).find((d) => d.archived_path === rel) ?? fail(`${rel} not in evidence`); if (sha(read(rel)) !== hit.archived_sha256) fail(`${rel} checksum differs from evidence`); return { path: rel, sha256: hit.archived_sha256, retrieved_at: evidence.distributions.find((d) => d.archived_path === rel || Object.values(d.members ?? {}).includes(hit)).retrieved_at }; };
  const text = (file) => { const meta = check(`${RAW}/${file}`); return { meta, text: read(meta.path) }; };
  const xml = text('ps2017_psrkl.xml');
  const list2017 = [...new TextDecoder('windows-1250').decode(xml.text).matchAll(/<PS_RKL_ROW>([\s\S]*?)<\/PS_RKL_ROW>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\//g)].map((x) => [x[1], x[2]])));
  const rkl21 = text('ps2021_psrkl.csv'), sl21 = text('ps2021_psrkl_slozeni.csv'), sl25 = text('ps2025_psrkl_slozeni.csv');
  const table = (file) => objects(text(file).text.toString('utf8'));
  const grouped = (rows) => { const out = new Map(); for (const r of rows) { if (r.TYPSLOZENI !== 'P') fail(`unexpected composition type ${r.TYPSLOZENI}`); out.set(Number(r.KSTRANA), [...(out.get(Number(r.KSTRANA)) ?? []), Number(r.NSTRANA)].sort((a, b) => a - b)); } return out; };
  const composition21 = grouped(objects(sl21.text.toString('utf8')));
  const lists = {
    2017: new Map(list2017.map((r) => [Number(r.KSTRANA), { members: codes(r.SLOZENI), vstrana: Number(r.VSTRANA), count: Number(r.POCSTRVKO), seats: Number(r.POCMANDCR), valid: r.PLAT_STR }])),
    2021: new Map(objects(rkl21.text.toString('utf8')).map((r) => [Number(r.KSTRANA), { members: codes(r.SLOZENI), vstrana: Number(r.VSTRANA), count: Number(r.POCSTRVKO), seats: Number(r.POCMANDCR), valid: r.PLAT_STR }])),
    2025: new Map([...grouped(objects(sl25.text.toString('utf8')))].map(([k, members]) => [k, { members, vstrana: null, count: null, seats: null, valid: 'A' }])),
  };
  for (const [k, l] of lists[2021]) if (JSON.stringify(composition21.get(k)) !== JSON.stringify(l.members)) fail(`2021 list ${k}: register and composition table differ`);
  const cns = Object.fromEntries(YEARS.map((y) => [y, new Map(table(`ps${y}_cns_excerpt.csv`).map((r) => [Number(r.NSTRANA), r]))]));
  const cvs = Object.fromEntries(YEARS.map((y) => [y, new Map(table(`ps${y}_cvs_excerpt.csv`).map((r) => [Number(r.VSTRANA), r]))]));
  const main = { 2017: xml.meta, 2021: rkl21.meta, 2025: sl25.meta };
  const urls = { 2017: 'https://volby.gov.cz/opendata/ps2017/ps2017_opendata.htm', 2021: 'https://volby.gov.cz/opendata/ps2021/ps2021_opendata.htm', 2025: 'https://volby.gov.cz/opendata/ps2025/ps2025_opendata_seznam.htm' };
  const catalogue = { 2017: evidence.distributions[0].catalogue_page, 2021: evidence.distributions.find((d) => d.url.endsWith('ps2021/csv_od/psrkl.csv')).catalogue_page, 2025: evidence.distributions.find((d) => d.url.endsWith('ps2025/csv_od/psrkl_slozeni.csv')).catalogue_page };
  return { lists, cns, cvs, main, urls, catalogue };
}

export function buildCzechIdentity(data) {
  const evidenceBuf = read(`${RAW}/evidence.json`);
  const evidence = JSON.parse(evidenceBuf);
  const evidenceSha = sha(evidenceBuf);
  const parserSha = sha(read('scripts/political-data/czechia/build-identity.mjs'));
  const R = registers(evidence);
  const EVIDENCE = 'src-cz-register-evidence';
  const SRC = (y) => `src-cz-csu-registers-${y}`;
  for (const d of evidence.distributions) for (const k of ['autorske_dilo', 'originalni_databaze', 'zvlastni_pravo_poriz_databaze', 'osobni_udaje']) if (!/^(Neobsahuje|Není chráněna)$/.test(d.rights?.[k] ?? '')) fail(`${d.url}: rights field ${k}`);
  const prov = (y, record, fields) => [{ source_id: SRC(y), source_url: R.urls[y], source_record_id: record, retrieved_at: R.main[y].retrieved_at, raw_snapshot: { path: R.main[y].path, sha256: R.main[y].sha256 }, parser_version: 'czechia-identity-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' }, { source_id: EVIDENCE, source_url: `${RAW}/evidence.json`, source_record_id: 'code lists and register review', retrieved_at: R.main[y].retrieved_at, raw_snapshot: { path: `${RAW}/evidence.json`, sha256: evidenceSha }, parser_version: 'czechia-identity-v1', parser_sha256: parserSha, fields_covered: fields, published_or_derived: 'published' }];
  const reviewed = new Map(evidence.interior_ministry_register.reviewed.map((r) => [r.nstrana, r]));
  for (const [code, r] of reviewed) {
    if (R.cns[2025].get(code)?.NAZEV_STRN !== r.name || R.cns[2025].get(code).ZKRATKAN8 !== r.abbreviation) fail(`register crosswalk: code ${code} differs from the 2025 code list`);
    for (const y of YEARS) if ([...R.lists[y].values()].some((l) => l.members.includes(code)) && R.cns[y].get(code).ZKRATKAN8 !== (r.abbreviation_at_lists ?? r.abbreviation)) fail(`register crosswalk: code ${code} abbreviation differs in ${y}`);
  }
  const yearOf = (c) => Number(c.election_id.match(/ps-(\d{4})/)[1]);
  const partyId = (code, y) => (reviewed.has(code) ? `pp-cz-n${String(code).padStart(4, '0')}` : `pp-cz-${y}-n${String(code).padStart(4, '0')}`);
  const results = new Map(data.election_results.map((r) => [r.contestant_ref, r]));
  const contestants = [], members = [], parties = new Map();
  const checks = { kinds: {}, seats_crosschecked: 0 };
  for (const c of data.electoral_contestants) {
    const y = yearOf(c), ballot = Number(c.csu_list_code);
    const l = R.lists[y].get(ballot) ?? fail(`${y}: list ${ballot} has no register composition`);
    if (l.valid !== 'A') fail(`${y}: list ${ballot} is not a valid registered list`);
    if (l.seats !== null) { if (l.seats !== results.get(c.contestant_id).seats) fail(`${y}: list ${ballot} seats differ between register and DataStat`); checks.seats_crosschecked += 1; }
    if (l.count !== null && l.count !== l.members.length) fail(`${y}: list ${ballot} member count differs`);
    const cv = R.cvs[y].get(l.vstrana ?? l.members[0]);
    if (l.members.length === 1 && (!cv || cv.TYPVS !== 'S' || codes(cv.SLOZENI).join() !== String(l.members[0]))) fail(`${y}: list ${ballot} code-list row does not show a single party or movement`);
    if (l.vstrana !== null && l.members.length > 1 && cv?.TYPVS !== 'K') fail(`${y}: list ${ballot} code-list row is not a coalition`);
    const kind = l.members.length > 1 ? 'coalition' : 'party_list';
    checks.kinds[`${y}_${kind}`] = (checks.kinds[`${y}_${kind}`] ?? 0) + 1;
    const record = `KSTRANA ${ballot}`, provenance = prov(y, record, ['contestant_kind', 'csu_proposer_codes']);
    for (const code of l.members) {
      const name = R.cns[y].get(code) ?? fail(`${y}: proposer ${code} missing from the code list`);
      const id = partyId(code, y), rev = reviewed.get(code);
      const entry = parties.get(id) ?? { atlas_party_id: id, country: 'czechia', entity_kind: rev?.kind ?? 'party_or_movement_not_distinguished', csu_proposer_code: code, registered_name: rev?.name ?? null, abbreviation: rev?.abbreviation ?? null, ...(rev?.abbreviation_at_lists ? { abbreviation_at_lists: rev.abbreviation_at_lists } : {}), names_in_csu_code_list: {}, identity_status: rev ? 'register_reviewed_continuous_legal_entity' : 'election_specific_proposer_code_only', continuous_series_eligible: Boolean(rev), legal_register_citation: rev ? `${evidence.interior_ministry_register.url}?id=${rev.record}` : null, provenance: [] };
      entry.names_in_csu_code_list[y] = name.NAZEV_STRN;
      entry.provenance.push(...prov(y, `NSTRANA ${code}`, ['names_in_csu_code_list']).slice(0, 1));
      parties.set(id, entry);
      members.push({ contestant_id: c.contestant_id, atlas_party_id: id, country: 'czechia', election_id: c.election_id, membership_basis: l.members.length > 1 ? 'official_coalition_composition' : 'official_sole_proposer', review_status: 'verified_same_election_membership', provenance });
    }
    contestants.push({ ...c, contestant_kind: kind, kind_basis: l.vstrana === null ? 'number of proposers in the official composition table (2025 list register unused: no catalogue rights entry)' : 'register type TYPVS and composition SLOZENI', csu_register_code: l.vstrana, register_type: l.vstrana === null ? null : cv.TYPVS, csu_proposer_codes: l.members, lead_party_id: kind === 'party_list' ? partyId(l.members[0], y) : null, party_relation_status: kind === 'party_list' ? 'sole_proposer_same_election' : 'coalition_no_vote_or_seat_attribution', continuous_series_eligible: false, provenance: [...c.provenance, ...provenance] });
  }
  const byElection = Object.fromEntries(YEARS.map((y) => [y, contestants.filter((c) => yearOf(c) === y)]));
  const links = [];
  const link = (a, b, relation, basis, status, y1, y2, note, extra = {}) => links.push({ country: 'czechia', fromElection: a.election_id, fromContestant: a.contestant_id, toElection: b.election_id, toContestant: b.contestant_id, relation, basis, status, sourceIds: [SRC(y1), SRC(y2), EVIDENCE], note, ...extra });
  const allCodes = [...new Set(contestants.flatMap((c) => c.csu_proposer_codes))].sort((a, b) => a - b);
  for (const code of allCodes) {
    const steps = YEARS.map((y) => ({ y, list: byElection[y].find((c) => c.csu_proposer_codes.includes(code)) ?? null })).filter((s) => s.list);
    const own = steps.filter((s) => s.list.contestant_kind === 'party_list');
    for (let i = 1; i < own.length; i += 1) {
      const [a, b] = [own[i - 1], own[i]];
      const between = steps.filter((s) => s.y > a.y && s.y < b.y).map((s) => s.list.contestant_id);
      if (reviewed.has(code)) {
        link(a.list, b.list, 'same_party', 'official_register', 'verified', a.y, b.y, 'same ČSÚ proposer code; one Interior Ministry registration active since before the first election', between.length ? { intervening_coalition_lists: between } : {});
      } else {
        const [n1, n2] = [R.cns[a.y].get(code).NAZEV_STRN, R.cns[b.y].get(code).NAZEV_STRN];
        link(a.list, b.list, 'same_party', 'unresolved', 'unresolved', a.y, b.y, n1 === n2 ? 'same ČSÚ code and code-list name; legal register not reviewed' : 'same ČSÚ code but different code-list name; a rename and a reused code cannot be told apart without a dated official document', { code_list_name_changed: n1 !== n2 });
      }
    }
    if (!reviewed.has(code)) continue;
    for (let i = 1; i < steps.length; i += 1) {
      const [a, b] = [steps[i - 1], steps[i]];
      if (a.list.contestant_kind !== b.list.contestant_kind) link(a.list, b.list, 'alliance_membership', 'unresolved', 'unresolved', a.y, b.y, 'discontinuous: own list and coalition membership are different units; no votes or seats are attributed to a member');
    }
  }
  const coalitions = contestants.filter((c) => c.contestant_kind === 'coalition');
  for (const a of coalitions) for (const b of coalitions) {
    if (yearOf(a) >= yearOf(b) || a.csu_proposer_codes.join() !== b.csu_proposer_codes.join()) continue;
    if (R.lists[yearOf(a)].get(Number(a.csu_list_code)).vstrana !== [...R.cvs[yearOf(b)].values()].filter((r) => r.TYPVS === 'K' && codes(r.SLOZENI).join() === b.csu_proposer_codes.join()).map((r) => Number(r.VSTRANA))[0]) fail('coalition register code differs across elections');
    link(a, b, 'same_coalition_composition', 'official_register', 'verified', yearOf(a), yearOf(b), 'same official members and register code; a coalition is a list-level unit, not a legal party');
  }
  const verifiedLinks = links.filter((l) => l.status === 'verified' && l.relation === 'same_party');
  const eligible = new Set(verifiedLinks.flatMap((l) => [l.fromContestant, l.toContestant]));
  for (const c of contestants) c.continuous_series_eligible = eligible.has(c.contestant_id);
  const roots = verifiedLinks.filter((l) => !verifiedLinks.some((x) => x.toContestant === l.fromContestant));
  const source = (id, y) => ({ source_id: id, country: 'czechia', institution: 'Český statistický úřad', dataset: `Registers for the ${y} Chamber of Deputies election: ${y === 2025 ? 'list composition (psrkl_slozeni)' : 'list register (psrkl)'} with code lists (CNS, CVS)`, tier: 'tier1_official', url: R.urls[y], licence_status: 'no_protected_rights_per_national_catalogue_distribution_metadata', raw_redistribution: 'no_protected_rights_per_national_catalogue_distribution_metadata', licence_url: R.catalogue[y], attribution: 'Český statistický úřad (ČSÚ), volby.gov.cz', retrieved_at: R.main[y].retrieved_at, raw_sha256: R.main[y].sha256, raw_path: R.main[y].path });
  const sources = [...YEARS.map((y) => source(SRC(y), y)), { source_id: EVIDENCE, country: 'czechia', institution: 'Český statistický úřad; Ministerstvo vnitra (citation only)', dataset: 'Register evidence record: per-file rights metadata, code-list excerpts and the Interior Ministry register review', tier: 'tier1_official', url: R.urls[2025], licence_status: 'quoted_facts_only', raw_redistribution: 'quoted_facts_only', licence_url: R.catalogue[2025], attribution: 'ČSÚ; Ministerstvo vnitra (cited, not reproduced)', retrieved_at: R.main[2025].retrieved_at, raw_sha256: evidenceSha, raw_path: `${RAW}/evidence.json` }];
  return { contestants, sources, political_parties: [...parties.values()], contestant_members: members, party_identity_links: links, checks: { ...checks, parties: parties.size, members: members.length, links: links.length, verified_same_party_links: verifiedLinks.length, continuous_party_series: roots.length } };
}
