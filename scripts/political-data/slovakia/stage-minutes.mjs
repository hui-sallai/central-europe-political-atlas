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
const copyright2019 = norm(text('ZZ_2015_185'));
const htmlBuf = fs.readFileSync(path.join(STAGED, 'ZZ_2015_185_20230201.html'));
const copyright = htmlBuf.toString('utf8').replace(/<[^>]+>/g, ' ').replaceAll('&nbsp;', ' ').replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/, 2 \) /g, ', ').replace(/(\d) \)/g, '$1)');
const quote = (re, from = copyright) => (from.match(re) ?? fail(`copyright clause ${re}`))[0];
const SECTION_5 = /Za predmet autorského práva sa nepovažuje a\) .+?zahrnutá do diela, b\) text právneho predpisu, úradné rozhodnutie alebo súdne rozhodnutie/;
if (quote(SECTION_5) !== quote(SECTION_5, copyright2019)) fail('§ 5(a) and (b) differ between the 2019 and 2023 versions');
const evidence = {
  schema_version: 'atlas-slovakia-nrsr-evidence-v1',
  retrieval: { authorised_by: 'owner reply 2026-11-03: read the State Commission minutes, national figures only', method: 'one request, identifying User-Agent', robots: 'www.minv.sk disallows only /?poslat-stranku, checked 2026-11-03' },
  minutes: { title: 'Zápisnica Štátnej komisie pre voľby a kontrolu financovania politických strán o výsledku volieb do Národnej rady Slovenskej republiky, 30. septembra 2023', url: 'https://www.minv.sk/swift_data/source/verejna_sprava/volby_a_referendum/100_nr_sr/NR20_ZapisnicaStK.pdf', url_note: 'the file name says NR20, but the document is the 2023 minutes', pdf_sha256: pdfSha('NR_ZapisnicaStK'), retrieved_at: fs.statSync(path.join(STAGED, 'NR_ZapisnicaStK.pdf')).mtime.toISOString(), pages: 69, national_excerpt: { path: `${RAW}/nrsr_2023_national_section.txt`, sha256: sha(excerpt), note: 'text layer before the first elected candidate; page-one labels were checked visually against the rendered page' } },
  elected_counts: { note: 'printed women and men counts per list, summed; no candidate name is stored', printed_totals: { women: totalWomen, men: totalMen }, by_list: Object.fromEntries(headers.map((h, i) => [h, pairs[i][0] + pairs[i][1]])) },
  rights: {
    basis: 'Act 185/2015 Coll. (Copyright Act), version of 1 February 2023: § 5(a) excludes information from copyright. § 5(b) excludes official decisions, but it is not established that these minutes are one.',
    statute: { url: 'https://static.slov-lex.sk/static/SK/ZZ/2015/185/20230201.html', sha256: sha(htmlBuf), version: '1 February 2023', corrects: 'https://static.slov-lex.sk/pdf/SK/ZZ/2015/185/ZZ_2015_185_20190101.pdf' },
    quote: quote(SECTION_5),
    database_right: { quote_135: quote(/Ak databáza vykazuje kvalitatívne alebo kvantitatívne podstatný vklad .+?jej kvalitatívne alebo kvantitatívne podstatnej časti\./), quote_138_3: quote(/Do osobitného práva k databáze nezasahuje používateľ databázy, ktorý bez súhlasu zhotoviteľa databázy vykoná extrakciu alebo reutilizáciu kvalitatívne alebo kvantitatívne nepodstatnej časti jej obsahu, a to na akýkoľvek účel\./) },
    statutory_publication: clause(/Štátna komisia zverejní celkové výsledky volieb po podpísaní zápisnice o výsledku volieb/),
    minutes_required_content: clause(/Štátna komisia vyhotoví zápisnicu o výsledku volieb/),
    owner_decision: 'Owner reply 2026-11-03: use the State Commission minutes, publishing national figures only, on § 5(a) and (b). Findings of 2026-11-04 narrow how that basis is described and are flagged for owner review.',
    findings: ['§ 5(a) and (b) read the same in the 2019 and 2023 versions, so correcting the version changes the citation, not the wording.', 'Act 180/2014 § 69 calls this document minutes (zápisnica) and requires the State Commission to publish overall results. Nothing read classifies it as an official decision (úradné rozhodnutie), so § 5(b) is not relied on as settled.', 'The published figures are facts the State Commission must publish, which supports § 5(a). § 5(a) concerns information within a work and does not by itself clear a selection or a dataset.', 'The database right (§ 135) arises only with a substantial investment in a database. It was not established whether the minutes are a database. § 138(3) permits extracting an insubstantial part; the national section is 2 of 69 pages, yet it may be qualitatively substantial, so that exception is not assumed.'],
    limits: ['This is a reading of the statute, not advice from a lawyer or a statement by the State Commission. No licence or written permission exists.', 'The 1 February 2023 version was read as named by the owner; whether a later amendment took effect before 30 September 2023 was not checked.', 'ŠÚ SR files on volby.statistics.sk were not used. Those terms prohibit robots and similar tools, and their CC BY 4.0 grant names www.statistics.sk.', 'Legal challenges to the 2023 result were not reviewed.'],
  },
  rules: { source: { url: 'https://static.slov-lex.sk/pdf/SK/ZZ/2014/180/ZZ_2014_180_20230301.pdf', sha256: pdfSha('ZZ_2014_180_20230301'), version: '1 March 2023' }, thresholds: clause(/§ 66 \(1\) .+?najmenej zo štyroch politických strán získali menej ako desať percent z celkového počtu odovzdaných platných hlasov\./), allocation: clause(/§ 68 Prideľovanie mandátov \(1\) .+?je republikovým volebným číslom\./) },
  not_admitted: { elections: [2020, 2016, 2012], reason: 'State Commission minutes were not located outside statistics.sk; the commission archive is described as starting in 2023.' },
  slovensko_sk: { url: 'https://www.slovensko.sk/sk/detail-sluzby?externalCode=ks_330290', finding: 'The service catalogue says ŠÚ SR provides final results as CSV over HTTP without authentication. It states no licence and does not change the ŠÚ SR terms.' },
};
fs.writeFileSync(path.join(root, RAW, 'evidence.json'), `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', by_list: evidence.elected_counts.by_list, totalWomen, totalMen }));
