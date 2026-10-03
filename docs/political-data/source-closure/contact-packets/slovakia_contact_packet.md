# Slovakia — clarification packet for Štatistický úrad SR (ŠÚ SR)

Status: **prepared, not sent.** No authority has been contacted. **No further automated collection from statistics.sk will occur until this is clarified** (the evidence script refuses statistics.sk hosts).

## Institution and contact

- Institution: Štatistický úrad Slovenskej republiky, Lamačská cesta 3/C, P.O. Box 67, 840 00 Bratislava 4 (as shown on the publisher's pages, viewed 2026-10-03).
- Contact page: https://slovak.statistics.sk/wps/portal/ext/aboutus/contact/
- Suggested channel (verify on the contact page before sending; addresses were read from pages viewed, not archived): Informačný servis `info@statistics.sk`. The open-data/API page names `vbd@statistics.sk` for open-data questions — either may be used; send to one.
- Suggested subject: *Volebné výsledky NR SR v CSV (volby.statistics.sk/opendata) — podmienky licencie CC BY 4.0 a spôsob získavania*

## What is already documented (not asked again)

- Terms page *Conditions for use and further dissemination of the SO SR statistical information* — https://slovak.statistics.sk/wps/portal/ext/aboutus/webpage/terms/ (last update 26.10.2020): information “released by the Statistical Office of the SR through the website www.statistics.sk” may be disseminated (copied, distributed, communicated to the public), used and used commercially, with SO SR indicated as source, under CC BY 4.0; documents covered by third-party IP are excluded; **“Use of robots, spiders, crawlers and similar data gathering and extraction tools is expressly prohibited.”** (viewed once by the agent in the interactive browser pane on 2026-10-03 — a documentation page view, no data download; quoted, not archived; the owner may re-confirm and archive it manually)
- API help page: “All information is subject to the license terms of the Creative Commons Attribution License (cc-by) 4.0.” (viewed 2026-10-03)
- The official election dataset list (`volby.statistics.sk/tree.html`, “Údaje na stiahnutie”, compiled under Government Resolution No. 59/2015 on the Open Government Partnership) names all seven national files below by exact file name and size.

## What remains unresolved

1. The operative terms name **www.statistics.sk**; the files are served from **volby.statistics.sk**. The election-specific open-data statement (CSV results of elections and referendums since 2001) is no longer visible on the live portal after the 15 September 2026 restructuring, so it cannot be cited as current text.
2. Whether a person's manual browser download is permitted, and whether scripted retrieval of a few static final files is covered by the robots/spiders prohibition or available via an approved endpoint.
3. Confirmation of the attribution form and how changes and derived values should be indicated.
4. Whether the terms' exclusion of documents covered by third-party IP affects any of these files.

## Files in question (seven national vote files, already retrieved before the prohibition was found; local only)

| URL | SHA-256 |
|---|---|
| https://volby.statistics.sk/opendata/nrsr/2002/NRSR_2002_tab03.csv | `02823a10d7f695e4bf4f003b33a191ed52dac8b189aff5d65f6c2ae3a7b551d0` |
| https://volby.statistics.sk/opendata/nrsr/2006/NRSR_2006_tab05.csv | `52be0e3d282a4f5618705c5a4a99dcef585b244f3a5a72603ec50c7e23727983` |
| https://volby.statistics.sk/opendata/nrsr/2010/NRSR_2010_tab09.csv | `67ec053a625a946affb9058757c5c3ab9edc6d49fb92e883a1aa81976f1d02a6` |
| https://volby.statistics.sk/opendata/nrsr/2012/NRSR_2012_tab09.csv | `bca69f1264ef04bd399acca4430f4163e9f1e4e0c862dae472b85e5ec4d8475b` |
| https://volby.statistics.sk/opendata/nrsr/2016/NRSR_2016_tab13.csv | `0a9ef5ec2fba9a5cc8b71a0669991429978b467593e5a781ab25f9a861bf5bbd` |
| https://volby.statistics.sk/opendata/nrsr/2020/NRSR_2020_tab03a.csv | `bca99840d8d864218020a2953abf7a8b7a01842a573d90aa65bfb26aac60ea63` |
| https://volby.statistics.sk/opendata/nrsr/2023/NRSR2023_SK_tab03a.csv | `97f5660514a8572f1d76a1afa9e4b70a33fcd78f633134b720d3cc99cc3cd3ff` |

Also needed later (not downloaded): national summary tables (e.g. `NRSR_2020_tab01.csv`, `NRSR2023_SK_tab01.csv`), seat-allocation tables (`…tab04.csv`, `…tab04x.csv`) and subject lists (`NRSR_2016_tab20.csv`, `NRSR_2020_tab0a.csv`, `NRSR2023_SK_tab0a.csv`).

Dataset list evidence: https://volby.statistics.sk/tree.html — `e4a3ebc357fe7e117abb0957217b1307293966b0f9395b9b02dd8381b6faaed8` (2026-10-03T10:04Z).

## English enquiry

> Dear Sir or Madam,
>
> We maintain a non-commercial public research website on Central European data ([project URL]). We would like to use the official results of the elections to the National Council of the Slovak Republic, specifically the national result files published at volby.statistics.sk/opendata/nrsr/ (for example NRSR_2016_tab13.csv and NRSR2023_SK_tab03a.csv).
>
> We have read your *Conditions for use and further dissemination of the SO SR statistical information* and the open-data API documentation stating CC BY 4.0. To make sure we comply, could you please confirm:
>
> 1. Are the election-result CSV files on volby.statistics.sk/opendata covered by these CC BY 4.0 conditions, with no third-party rights excluded? (yes/no)
> 2. Is manual download of the final historical CSV files through a web browser permitted?
> 3. Does the prohibition of robots, spiders and similar tools apply to scripted retrieval of a small number of static final-result files, or is there an approved API or endpoint for these files? We have stopped all automated retrieval and will not resume it before your answer.
> 4. Under CC BY 4.0, may we (a) publish normalized factual extracts (votes, vote shares, seats, turnout, contestant names) and clearly labelled derived values, and (b) redistribute the original CSV files?
> 5. We intend to attribute as your conditions describe (“Source: Štatistický úrad SR”, licence CC BY 4.0, with a link to the conditions page, without implying endorsement). Is this correct, and how should modifications and derived values be indicated?
>
> Thank you very much. Kind regards,
> [Name], [affiliation], [contact e-mail]

## Slovak draft (machine-assisted; native-speaker review recommended before sending)

> Vážená pani, vážený pán,
>
> prevádzkujeme nekomerčnú verejnú výskumnú webovú stránku o údajoch krajín strednej Európy ([URL projektu]). Radi by sme využili oficiálne výsledky volieb do Národnej rady Slovenskej republiky, konkrétne celoštátne súbory s výsledkami zverejnené na volby.statistics.sk/opendata/nrsr/ (napríklad NRSR_2016_tab13.csv a NRSR2023_SK_tab03a.csv).
>
> Oboznámili sme sa s Vašimi *Podmienkami používania a ďalšieho šírenia štatistických informácií ŠÚ SR* a s dokumentáciou API otvorených údajov, ktorá uvádza licenciu CC BY 4.0. Aby sme postupovali v súlade s nimi, prosíme o potvrdenie:
>
> 1. Vzťahujú sa tieto podmienky CC BY 4.0 na súbory CSV s výsledkami volieb na volby.statistics.sk/opendata, bez výnimky pre práva tretích osôb? (áno/nie)
> 2. Je povolené ručné stiahnutie konečných historických súborov CSV prostredníctvom webového prehliadača?
> 3. Vzťahuje sa zákaz používania robotov, pavúkov a podobných nástrojov aj na skriptované stiahnutie malého počtu statických súborov s konečnými výsledkami, alebo existuje pre tieto súbory schválené API či rozhranie? Všetko automatizované sťahovanie sme zastavili a pred Vašou odpoveďou ho neobnovíme.
> 4. Môžeme podľa licencie CC BY 4.0 (a) zverejňovať normalizované faktické výňatky (počty hlasov, podiely hlasov, mandáty, volebnú účasť, názvy politických subjektov) a zreteľne označené odvodené hodnoty a (b) ďalej šíriť pôvodné súbory CSV?
> 5. Zdroj chceme uvádzať podľa Vašich podmienok („Zdroj: Štatistický úrad SR“, licencia CC BY 4.0, s odkazom na stránku s podmienkami, bez dojmu podpory z Vašej strany). Je to správne a ako máme označiť úpravy a odvodené hodnoty?
>
> Ďakujeme. S pozdravom,
> [Meno], [inštitúcia], [e-mail]

## What closes which gate (decision matrix SK1–SK4)

| Answer | Gate effect |
|---|---|
| Q1 yes (incl. no third-party exclusion) | reuse_right, normalized republication and raw redistribution → closed (the terms text itself permits copying and distribution) |
| Q2 yes, Q3 “prohibited” | manual → closed, automated → stays blocked → acquisition mode **manual_only** (variant 1B-manual) |
| Q3 approved endpoint named | automated → closed for that endpoint only |
| Q5 confirmed / wording given | attribution and transformation disclosure → closed |

**Not sufficient:** a general statement that “all SO SR data are CC BY” that names neither the election files nor volby.statistics.sk; any answer silent on the robots question.
