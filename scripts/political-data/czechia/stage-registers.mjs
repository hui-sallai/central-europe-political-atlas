// One-off: turns the owner-authorised register retrieval of 2026-11-03 (.tmp-data-refresh/political-candidate-czechia/registers,
// gitignored) into committed evidence under docs/political-data/raw/czechia/registers/. No network access. Code lists are
// archived as excerpts (only codes used by a list, with original line numbers and the full file's checksum). The 2017
// register package also holds the candidate register psrk.xml: only psrkl.xml is read; psrk.xml is never extracted or committed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './build-ps2025.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGED = path.join(root, '.tmp-data-refresh/political-candidate-czechia/registers');
const RAW = 'docs/political-data/raw/czechia/registers';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const member = (zip, name) => execFileSync('unzip', ['-p', path.join(STAGED, zip), name], { maxBuffer: 1 << 26 });
const write = (name, buf) => { fs.mkdirSync(path.join(root, RAW), { recursive: true }); fs.writeFileSync(path.join(root, RAW, name), buf); return { path: `${RAW}/${name}`, sha256: sha(Buffer.from(buf)) }; };
const staged = (name) => fs.readFileSync(path.join(STAGED, name));
const log = Object.fromEntries(JSON.parse(staged('retrieval_log.json')).map((r) => [r.file, r]));
const cp1250 = new TextDecoder('windows-1250');
const csvLine = (cells) => cells.map((v) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)).join(',');

const rkl2017 = member('ps2017_PS2017reg20171021.zip', 'psrkl.xml');
const rows2017 = [...cp1250.decode(rkl2017).matchAll(/<PS_RKL_ROW>([\s\S]*?)<\/PS_RKL_ROW>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\//g)].map((x) => [x[1], x[2]])));
const table = (buf, text = buf.toString('utf8'), sep = ',') => parseCsv(sep === ',' ? text : text.replaceAll('"', '\u0001').split(/\r?\n/).map((l) => l.split(sep).map((c) => `"${c.replaceAll('\u0001', '').replaceAll('"', '""')}"`).join(',')).join('\n'));
const objects = ([h, ...rows]) => rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
const members2021 = objects(table(staged('ps2021_psrkl_slozeni.csv'))).map((r) => r.NSTRANA);
const members2025 = objects(table(staged('ps2025_psrkl_slozeni.csv'))).map((r) => r.NSTRANA);
const vstrana2021 = objects(table(staged('ps2021_psrkl.csv'))).map((r) => r.VSTRANA);
const composition2021 = objects(table(staged('ps2021_psrkl.csv'))).flatMap((r) => r.SLOZENI.split(',').map(Number).map(String));
const use = {
  2017: { cns: new Set(rows2017.flatMap((r) => r.SLOZENI.split(',').map(Number).map(String))), cvs: new Set(rows2017.map((r) => r.VSTRANA)) },
  2021: { cns: new Set([...members2021, ...composition2021]), cvs: new Set(vstrana2021) },
  2025: { cns: new Set([...members2025, '5', '7', '47']), cvs: new Set(members2025) }, // 5, 7, 47: reviewed parties without a 2025 list, for the register crosswalk
};
const excerpt = (year, kind, key, text, sep) => {
  const lines = table(null, text, sep);
  const [head, ...rows] = lines;
  const idx = head.indexOf(key);
  let keep = rows.map((r, i) => [i + 2, r]).filter(([, r]) => use[year][kind].has(r[idx]));
  if (year === 2025 && kind === 'cvs') {
    const sl = head.indexOf('SLOZENI'), ty = head.indexOf('TYPVS');
    const extra = rows.map((r, i) => [i + 2, r]).filter(([, r]) => r[ty] === 'K' && r[sl].split(',').map(Number).sort((a, b) => a - b).join() === '1,53,721');
    keep = [...keep, ...extra.filter(([n]) => !keep.some(([m]) => m === n))].sort((a, b) => a[0] - b[0]);
  }
  return `${csvLine(['source_line', ...head])}\r\n${keep.map(([n, r]) => csvLine([String(n), ...r])).join('\r\n')}\r\n`;
};
const zip17 = 'ps2017_PS2017ciselniky20170905_csv.zip';
const c17 = { cns: member(zip17, 'cns.csv'), cvs: member(zip17, 'cvs.csv') };
const NO = { autorske_dilo: 'Neobsahuje', originalni_databaze: 'Neobsahuje', zvlastni_pravo_poriz_databaze: 'Není chráněna', osobni_udaje: 'Neobsahuje' };
const CAT = 'https://data.gov.cz/datová-sada?iri=https://data.gov.cz/zdroj/datové-sady/00025593/';
const dist = (file, role, dataset, extra) => { const l = log[file]; return { file: path.basename(l.url), role, url: l.url, catalogue_page: `${CAT}${dataset}`, catalogue_url_host_note: 'the catalogue links www.volby.cz, which redirects to volby.gov.cz', rights: NO, retrieved_at: l.retrieved_at, http_last_modified: l.last_modified, bytes: l.bytes, sha256: l.sha256, ...extra }; };
const rel = (x) => ({ archived_path: x.path, archived_sha256: x.sha256 });
const distributions = [
  dist('ps2017_PS2017reg20171021.zip', 'registers package (definitive state 21 Oct 2017, matching the original-results vintage)', 'b0a73534d723d513a41861ab786d1d77', { used_member: 'psrkl.xml', ...rel(write('ps2017_psrkl.xml', rkl2017)), not_extracted: ['psrk.xml (candidate register)'] }),
  dist(zip17, 'code lists (state 5 Sep 2017)', '9515dfca01af33f22b47da8dff6ced38', { members: { 'cns.csv': { sha256: sha(c17.cns), ...rel(write('ps2017_cns_excerpt.csv', excerpt(2017, 'cns', 'NSTRANA', cp1250.decode(c17.cns), ';'))) }, 'cvs.csv': { sha256: sha(c17.cvs), ...rel(write('ps2017_cvs_excerpt.csv', excerpt(2017, 'cvs', 'VSTRANA', cp1250.decode(c17.cvs), ';'))) } }, excerpt_note: 'windows-1250 converted to UTF-8; only codes used by a 2017 list' }),
  dist('ps2021_psrkl.csv', 'list register', '8ccd370635a42a306a27a2faf1c14a13', rel(write('ps2021_psrkl.csv', staged('ps2021_psrkl.csv')))),
  dist('ps2021_psrkl_slozeni.csv', 'list register composition', 'c036a0910e0628b3fa4abbb7ecdffe53', rel(write('ps2021_psrkl_slozeni.csv', staged('ps2021_psrkl_slozeni.csv')))),
  dist('ps2021_cns.csv', 'proposing-party code list', '3b1189943df0faf60d7f842f872065aa', rel(write('ps2021_cns_excerpt.csv', excerpt(2021, 'cns', 'NSTRANA', staged('ps2021_cns.csv').toString('utf8'))))),
  dist('ps2021_cvs.csv', 'electoral-party code list', 'b2383568a3b7887e6df9368a81d8e785', rel(write('ps2021_cvs_excerpt.csv', excerpt(2021, 'cvs', 'VSTRANA', staged('ps2021_cvs.csv').toString('utf8'))))),
  dist('ps2021_cvs_slozeni.csv', 'electoral-party composition: retrieved, not used (the SLOZENI field of the list register is used)', 'ed9287acefded92cb0880007f90d4383', { archived_path: null }),
  dist('ps2025_psrkl_slozeni.csv', 'list register composition', 'e7c18479a9eb2b4c089ee3837f5c3c88', rel(write('ps2025_psrkl_slozeni.csv', staged('ps2025_psrkl_slozeni.csv')))),
  dist('ps2025_cns.csv', 'proposing-party code list', '17ed482af74bd808dd3461f19be4df6d', rel(write('ps2025_cns_excerpt.csv', excerpt(2025, 'cns', 'NSTRANA', staged('ps2025_cns.csv').toString('utf8'))))),
  dist('ps2025_cvs.csv', 'electoral-party code list (rows whose code equals a sole proposer, and K rows with the 2025 coalition composition)', 'd3b9d1bfb3ba3b63e34c030344a27d4e', rel(write('ps2025_cvs_excerpt.csv', excerpt(2025, 'cvs', 'VSTRANA', staged('ps2025_cvs.csv').toString('utf8'))))),
  dist('ps2025_cvs_slozeni.csv', 'electoral-party composition: retrieved, not used', '18d8f7b74bc8c3aaffca1e5332c874b5', { archived_path: null }),
];
const INTERIOR = 'https://mv.gov.cz/seznam-politickych-stran';
const evidence = {
  schema_version: 'atlas-czechia-register-evidence-v1',
  retrieval: { authorised_by: 'owner reply 2026-11-03: one retrieval of these named files, rights verified per file', method: 'one sequential request per file, 5 seconds apart, identifying User-Agent', host: 'volby.gov.cz' },
  excluded: [{ file: 'https://volby.gov.cz/opendata/ps2025/csv_od/psrkl.csv', reason: 'No national catalogue entry was found for the 2025 list register (only its composition table). Under the owner rule it stays unused, so 2025 lists have no register code (VSTRANA), no POCSTRVKO and no POCMANDCR cross-check here.' }],
  code_statements: [
    { source: 'https://volby.gov.cz/opendata/ps2025/PS2025regPopis.htm', statement: 'VSTRANA in the list register is the internal code from the CVS code list, described there as a stabilised code.' },
    { source: 'https://volby.gov.cz/opendata/ps2025/PS2025ciselnikyPopis.htm', statement: 'CVS lists every electoral party and enables comparison over time between elections. No official statement of stability was located for NSTRANA.' },
  ],
  distributions,
  interior_ministry_register: {
    url: INTERIOR,
    reviewed_on: '2026-11-03',
    database_updated: '2026-10-26',
    reuse_decision: 'No reuse terms were located. Used as citation only: registration numbers, identification numbers, addresses and named persons are not reproduced. The page lists home addresses and birth dates of officers; none of that was captured.',
    limits: ['The page states extracts are informative only.', 'The history view prints the current name and abbreviation on every dated period, so it does not show past names. Dated periods exist, but their past names cannot be read from it.', 'No official crosswalk between MV records and ČSÚ NSTRANA codes was located; the crosswalk below compares the current register name with the 2025 ČSÚ code-list name of the same party.'],
    reviewed: [
      { nstrana: 768, record: 368, kind: 'movement', name: 'ANO 2011', abbreviation: 'ANO', registered_before_2017_election: true, active: true },
      { nstrana: 53, record: 120, kind: 'party', name: 'Občanská demokratická strana', abbreviation: 'ODS', registered_before_2017_election: true, active: true },
      { nstrana: 1, record: 112, kind: 'party', name: 'KDU-ČSL', abbreviation: 'KDU-ČSL', registered_before_2017_election: true, active: true },
      { nstrana: 721, record: 321, kind: 'party', name: 'TOP 09', abbreviation: 'TOP 09', registered_before_2017_election: true, active: true },
      { nstrana: 166, record: 228, kind: 'movement', name: 'STAROSTOVÉ A NEZÁVISLÍ', abbreviation: 'STAN', registered_before_2017_election: true, active: true },
      { nstrana: 720, record: 320, kind: 'party', name: 'Česká pirátská strana', abbreviation: 'Piráti', registered_before_2017_election: true, active: true },
      { nstrana: 1114, record: 468, kind: 'movement', name: 'Svoboda a přímá demokracie (SPD)', abbreviation: 'SPD', registered_before_2017_election: true, active: true },
      { nstrana: 47, record: 107, kind: 'party', name: 'Komunistická strana Čech a Moravy', abbreviation: 'KSČM', registered_before_2017_election: true, active: true },
      { nstrana: 7, record: 99, kind: 'party', name: 'Sociální demokracie', abbreviation: 'SOCDEM', abbreviation_at_lists: 'ČSSD', registered_before_2017_election: true, active: true, note: 'Current status period starts in 2013, before the 2017 election. Not the 2025 list ČSSD – Česká suverenita sociální demokracie, which has code 759 and a separate register record.' },
      { nstrana: 5, record: 142, kind: 'party', name: 'Strana zelených', abbreviation: 'Zelení', registered_before_2017_election: true, active: true },
    ],
  },
};
write('evidence.json', `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', files: fs.readdirSync(path.join(root, RAW)) }));
