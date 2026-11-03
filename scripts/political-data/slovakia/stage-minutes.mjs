// One-off: turns the owner-authorised reading of 2026-11-03 (.tmp-data-refresh/political-candidate-slovakia/gazette, gitignored)
// into committed evidence under docs/political-data/raw/slovakia/nrsr2023/. No network access. Only the national section of the
// State Commission minutes is archived, cut before the first elected candidate; candidate names are never committed. Elected
// counts per list are read as the printed pairs and checked against the printed totals.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGED = path.join(root, '.tmp-data-refresh/political-candidate-slovakia/gazette');
const RAW = 'docs/political-data/raw/slovakia/nrsr2023';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fail = (m) => { throw new Error(`Slovakia staging failed: ${m}`); };
const text = (name) => fs.readFileSync(path.join(STAGED, `${name}.txt`), 'utf8');
const pdfSha = (name) => sha(fs.readFileSync(path.join(STAGED, `${name}.pdf`)));
const full = text('NR_ZapisnicaStK');
const end = full.indexOf('boli za jednotlivé politické strany alebo koalície zvolení títo kandidáti');
if (end < 0) fail('candidate section not found');
const excerpt = `${full.slice(0, end)}boli za jednotlivé politické strany alebo koalície zvolení títo kandidáti: [candidate names omitted]\n`;
fs.mkdirSync(path.join(root, RAW), { recursive: true });
fs.writeFileSync(path.join(root, RAW, 'nrsr_2023_national_section.txt'), excerpt);
// Printed order of list headers in the elected section, and the printed women/men pairs in the same order.
const elected = full.slice(end, full.indexOf('Kandidáti, ktorí sa stali náhradníkmi'));
const headers = [...elected.matchAll(/Číslo a názov politickej strany alebo koalície\n(\d+) /g)].map((m) => Number(m[1]));
const totalsAt = elected.indexOf('Celkový počet zvolených žien');
const pairs = [...elected.slice(0, totalsAt).matchAll(/^(\d{1,2})\n(\d{1,2})$/gm)].map((m) => [Number(m[1]), Number(m[2])]);
const [totalWomen, totalMen] = (elected.slice(totalsAt).match(/^\d+$/gm) ?? []).map(Number);
if (headers.length !== 7 || pairs.length !== 7) fail(`${headers.length} lists, ${pairs.length} count pairs`);
if (pairs.reduce((n, p) => n + p[0], 0) !== totalWomen || pairs.reduce((n, p) => n + p[1], 0) !== totalMen || totalWomen + totalMen !== 150) fail('elected counts do not reconcile');
const norm = (s) => s.replaceAll('\f', '').replace(/\[\[page \d+\]\]\n/g, '').replace(/(\p{L})-\n(\p{L})/gu, '$1$2').replace(/\s+/g, ' ');
const law = norm(text('ZZ_2014_180_20230301'));
const clause = (re) => (law.match(re) ?? fail(`clause ${re}`))[0];
const copyright = norm(text('ZZ_2015_185'));
const evidence = {
  schema_version: 'atlas-slovakia-nrsr-evidence-v1',
  retrieval: { authorised_by: 'owner reply 2026-11-03: read the State Commission minutes, national figures only', method: 'one request, identifying User-Agent', robots: 'www.minv.sk disallows only /?poslat-stranku, checked 2026-11-03' },
  minutes: { title: 'Zápisnica Štátnej komisie pre voľby a kontrolu financovania politických strán o výsledku volieb do Národnej rady Slovenskej republiky, 30. septembra 2023', url: 'https://www.minv.sk/swift_data/source/verejna_sprava/volby_a_referendum/100_nr_sr/NR20_ZapisnicaStK.pdf', url_note: 'the file name says NR20, but the document is the 2023 minutes', pdf_sha256: pdfSha('NR_ZapisnicaStK'), retrieved_at: fs.statSync(path.join(STAGED, 'NR_ZapisnicaStK.pdf')).mtime.toISOString(), pages: 69, national_excerpt: { path: `${RAW}/nrsr_2023_national_section.txt`, sha256: sha(excerpt), note: 'text layer before the first elected candidate; page-one labels were checked visually against the rendered page' } },
  elected_counts: { note: 'printed women and men counts per list, summed; no candidate name is stored', printed_totals: { women: totalWomen, men: totalMen }, by_list: Object.fromEntries(headers.map((h, i) => [h, pairs[i][0] + pairs[i][1]])) },
  rights: {
    basis: 'Act 185/2015 Coll. (Copyright Act) § 5(a) information and § 5(b) official decisions are not subject to copyright',
    statute: { url: 'https://static.slov-lex.sk/pdf/SK/ZZ/2015/185/ZZ_2015_185_20190101.pdf', sha256: pdfSha('ZZ_2015_185'), version: '1 January 2019' },
    quote: (copyright.match(/Za predmet autorského práva sa nepovažuje a\) .+?zahrnutá do diela, b\) text právneho predpisu, úradné rozhodnutie alebo súdne rozhodnutie/) ?? fail('§ 5 not found'))[0],
    owner_decision: 'Owner reply 2026-11-03: use the State Commission minutes, publishing national figures only, on § 5(a) and (b).',
    limits: ['This is a reading of the statute, not advice from a lawyer or a statement by the State Commission. It is weaker than the Polish basis: § 5 names information and official decisions, not official documents in general, and whether these minutes are an official decision was not settled.', 'The version of the Copyright Act read is that of 1 January 2019.', 'ŠÚ SR files on volby.statistics.sk were not used. Those terms prohibit robots and similar tools, and their CC BY 4.0 grant names www.statistics.sk.', 'Legal challenges to the 2023 result were not reviewed.'],
  },
  rules: { source: { url: 'https://static.slov-lex.sk/pdf/SK/ZZ/2014/180/ZZ_2014_180_20230301.pdf', sha256: pdfSha('ZZ_2014_180_20230301'), version: '1 March 2023' }, thresholds: clause(/§ 66 \(1\) .+?najmenej zo štyroch politických strán získali menej ako desať percent z celkového počtu odovzdaných platných hlasov\./), allocation: clause(/§ 68 Prideľovanie mandátov \(1\) .+?je republikovým volebným číslom\./) },
  not_admitted: { elections: [2020, 2016, 2012], reason: 'State Commission minutes were not located outside statistics.sk; the commission archive is described as starting in 2023.' },
  slovensko_sk: { url: 'https://www.slovensko.sk/sk/detail-sluzby?externalCode=ks_330290', finding: 'The service catalogue says ŠÚ SR provides final results as CSV over HTTP without authentication. It states no licence and does not change the ŠÚ SR terms.' },
};
fs.writeFileSync(path.join(root, RAW, 'evidence.json'), `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', by_list: evidence.elected_counts.by_list, totalWomen, totalMen }));
