# v2.0 — Ten-country parliamentary elections: Croatia and Slovenia admitted (2026-11-18)

Brief: "Complete ten-country parliamentary election coverage and historical institutional integration" (Romania, Slovenia, Austria, Croatia). Starting commit: `c6838eb96081455b6d8bae2b4e8275d265dad84d` (origin/main).

## Owner decisions (2026-11-18)

| Question | Answer |
|---|---|
| Publication rights for RO, SI, HR and AT results | "Accept for all four": the official-texts provision of each copyright act; national and constituency figures only; no candidate names |
| Romania 2024 (bec.ro blocks plain requests) | "Open in browser pane once"; if a challenge appears, stop and use data.gov.ro |
| Austria (BMI robots.txt disallows AI agents) | "I'll download files myself" into `local-evidence/`; BMI is never contacted |
| Register www.dvk-rs.si and www.izbori.hr | "Register both": manual reading only, one request per exact file |

## A–C. Result by country

| Country | Admitted elections | Chamber coverage | Status |
|---|---|---|---|
| Croatia | 2015-11-08, 2016-09-11, 2020-07-05, 2024-04-17 | Hrvatski sabor, all 151 seats: 10 territorial constituencies × 14, constituency XI abroad (3), constituency XII national minorities (6 elections, 8 seats) | Admitted (`croatia-sabor-2015-2024`) |
| Slovenia | 2026-03-22 | Državni zbor, all 90 seats: 88 list seats (national) and the Italian and Hungarian national-community deputies; Državni svet excluded (indirectly elected) | Admitted (`slovenia-dz-2026`) |
| Romania | none | — | Blocked: parlamentare2024.bec.ro answered with a browser-verification challenge ("Verifying your browser…", HTTP 503) when opened once in the browser pane; per the owner's instruction nothing further was tried. roaep.ro stays blocked (reCAPTCHA). data.gov.ro holds only the 2012 and 2016 parliamentary datasets. |
| Austria | none | — | Waiting for the owner-downloaded BMI files (2024, 2019, 2017, 2013, 2008) in `local-evidence/` |

The first milestone (latest election for all four countries) is therefore met for Croatia and Slovenia only.

## D–E. Contestants, votes and seats (all reconciled fail-closed in the build)

| Election | Lists (constituency rows) | Individual candidates (no names) | Zero-seat rows | Seats | Valid list votes |
|---|---|---|---|---|---|
| HR 2015 | 166 | 41 | 162 | 151 | 2,225,923 (sum over constituencies I–XI) |
| HR 2016 | 177 | 29 | 154 | 151 | 1,903,230 |
| HR 2020 | 192 | 21 | 158 | 151 | 1,666,973 |
| HR 2024 | 165 | 17 | 127 | 151 | 2,120,779 |
| SI 2026 | 17 | 6 | 14 | 90 | 1,179,769 |

Checks per Croatian decision (17 per election): list votes = valid ballots; valid + invalid = ballots; printed percentages = votes ÷ valid ballots (2015 rounded, 2016 onwards truncated — detected per election and enforced); lists ≥ 5% of valid ballots = the lists the decision names; D'Hondt reproduces the seats (14 per territorial constituency, 3 abroad); minority elections elect the candidates with most votes (Serbian: three, each voter up to three votes, so no vote share); seats 140 + 3 + 8 = 151; the 2024 constituency I–X totals equal the commission's archive table (3,482,150 on the roll, 2,140,824 turned out, 61.48%).

Slovenia: list votes = valid ballots (1,179,769); valid + invalid = ballots cast (1,190,819); printed turnout 70.25% = 1,190,932 ÷ 1,695,249; seven lists ≥ 4% as named; D'Hondt over 88 seats reproduces 29/28/9/6/6/5/5; each community election's candidate votes = valid ballots (Italian 1,935; Hungarian 3,224); the commission's data file agrees on every list's votes and seats; 88 + 2 = 90.

Known 2024 Croatian outcome reproduced by grouping identical list titles: HDZ-led 61 (58 + 3 abroad), SDP-led 42, DP-led 14, Most 11, Možemo 10, IDS-led 2, NPS 2, Fokus 1, minorities 8. 2020: HDZ-led 66, SDP-led 41, DP-led 16, Most 8, Možemo 7, SsIP/Pametno/Fokus 3, HNS 1, Reformisti 1, minorities 8.

## F. Historical coverage

| Country | Officially available (seen) | Admitted | Missing / reason |
|---|---|---|---|
| Croatia | 1990–2024 in the commission archive (open-data ZIPs 2000–2024) | 2015, 2016, 2020, 2024 | 2011: decisions downloaded but the PDF text layer is damaged (split words, broken diacritics), so party names cannot be transcribed reliably; needs another extraction route. 2007 and earlier not attempted. |
| Slovenia | 2026 minutes; DVK archives for earlier elections | 2026 | 2022, 2018, 2014, 2011 not attempted in this iteration (the minutes are in Uradni list on PISRS, whose search is robots-disallowed; links must come from DVK pages). |
| Romania | 2012, 2016 on data.gov.ro (OGL-ROU-1.0); 2020, 2024 on BEC/ROAEP sites | none | 2024/2020: bot challenges; 2016/2012 possible via data.gov.ro (owner fallback) — not started. |
| Austria | BMI archive (robots disallow AI agents) | none | owner-downloaded files required |

## G. Official sources used

- Croatia: Državno izborno povjerenstvo final-results decisions, `https://www.izbori.hr/arhiva-izbora/data/parlament/<year>/izabrani/i_<type>_<unit>_0000.pdf` (68 PDFs, each identified by KLASA/URBROJ and SHA-256 in `political_source_registry.documents`); links read from the archive pages `https://www.izbori.hr/arhiva-izbora/index.html#/app/parlament-<year>` in the browser pane; licence URL: the commission's reuse page `https://www.izbori.hr/site/UserDocsImages/5469`.
- Slovenia: Zapisnik o ugotovitvi izida volitev poslancev v Državni zbor, Uradni list RS 197/2026 (`https://pisrs.si/api/uradni-list/objava/u20260197.pdf`, SHA-256 `1f446ca2…1f1d`, read in the browser pane); cross-check `https://www.dvk-rs.si/arhivi/dz2026/data/rezultati.json` and `udelezba.json`; ZASP Art. 9 read on PISRS (`https://pisrs.si/pregledPredpisa?id=ZAKO403`).
- Not used: the files at `www.dvk-rs.si/fileadmin/user_upload/rezultati.*` — the commission's own description says they are test files built from partial 2022 data.

## H–J. Electoral systems and institutional links

- `es-hr-sabor-<year>`: D'Hondt per constituency with a 5% constituency threshold; constituency XI abroad (3 seats, same rule); constituency XII national minorities (plurality per minority election; Serbian three seats). `institutional_rule_id: hr-es-sabor`.
- `es-si-dz-2026`: national D'Hondt over 88 seats among lists ≥ 4% (ZVDZ Art. 92), first distribution by the Droop quota in eight constituencies (Arts. 90–91); two national-community deputies by plurality. `institutional_rule_id: si-es-dz-constitutional`.
- Institutions registry: `store_chamber` added for `hr-sabor` and `si-drzavni-zbor`; `election_links.json` regenerated (21 → 26 elections). Croatia 2015–2020 link to period `croatia-period-2015-02-25` with `hr-2023-constituencies-act` as a later change; 2024 links to `croatia-period-2023-11-03`. Slovenia 2026 links to `slovenia-period-2013-05-24`.

## K. Party and list records

No party register was reviewed: every list is election- and constituency-specific (`continuous_series_eligible: false`, `party_relation_status: not_attributed_no_party_register_reviewed`). Croatian coalition lists keep their printed party names (`parties_named`, `list_composition: coalition_list_two_or_more_parties_named`). Person-name rule: a party name containing a living person's name is replaced by the abbreviation printed with it (e.g. `"DO i SIP"`, `A - HSP`, `NLSP`, `SIP`, `HKDU`), by the party part without the person, or omitted (row number only when nothing remains); Slovenian list names with a person use the commission's short name (`NSi, SLS, FOKUS`, `DEMOKRATI.`, `PREROD`, `GLAS UPOKOJENCEV`, `ZAUPANJE`). Historical namesakes (Ante Starčević, Stjepan Radić, braća Radić) are kept. Full titles are identified by `title_sha256`.

## L. Research exports

`public/research-data/political/croatia/` and `.../slovenia/`: the seven stores as JSON and CSV, `README.md`, `manifest.json`, each file at an exact hash in `docs/legal-security/political_admission_records.json` (so the research package may carry them).

## M. Tests

New `tests/tooling/political-croatia-slovenia.test.mjs` (9 tests: builds reproduce; HR 140/3/8 separation; no national vote share; anonymous minority candidates and three Serbian seats; person-name scan over stores, exports and evidence; D'Hondt and percentage-convention tamper checks; SI 88 + 2 with the National Council excluded; SI short names and data-file agreement; host registration and RO/AT not admitted). Updated: political-admission, political-foundation, political-phase1b (admitted lists), institutions-registry (26 links, HR/SI period checks).

## N. Main files

`scripts/political-data/croatia/build-sabor.mjs`, `scripts/political-data/slovenia/build-dz.mjs`; `docs/political-data/raw/{croatia/sabor,slovenia/dz}/evidence.json`; `docs/political-data/{croatia_sabor,slovenia_dz}_admission.json`; `src/data/political/{croatia,slovenia}/`; `public/research-data/political/{croatia,slovenia}/`; `src/lib/politicalData.ts` (gated raw-store accessors), `src/lib/politicalAdmission.ts` (two admitted rows); `docs/political-data/source-closure/political-admission-amendments.mjs`; `docs/legal-security/{political_admission_records,ui_governance_amendments,network_acquisition_registry}.json`; `docs/political-data/stage_c_decision_record.json`; institutions files above; `.gitattributes`.

## S. Codex handoff — TEN-COUNTRY PARLIAMENTARY ELECTION UI INTEGRATION (first part: Croatia and Slovenia)

Data access: `politicalCroatianStores()` and `politicalSlovenianStores()` in `src/lib/politicalData.ts` return the raw admitted stores behind the publication gate. Do **not** pass them to `electionViewsFromStores` (it assumes one national table per vote type and will throw); build constituency-aware views instead. Neither country is in any comparison set yet.

| Item | Croatia | Slovenia |
|---|---|---|
| Election ids | `el-hr-sabor-2015-11-08`, `el-hr-sabor-2016-09-11`, `el-hr-sabor-2020-07-05`, `el-hr-sabor-2024-04-17` | `el-si-dz-2026-03-22` |
| Chamber id (institutions) | `hr-sabor` (store chamber `Hrvatski sabor`) | `si-drzavni-zbor` (store chamber `Državni zbor`) |
| Rule ids | `es-hr-sabor-<year>` → `hr-es-sabor` | `es-si-dz-2026` → `si-es-dz-constitutional` |
| Units (`geography`) | `hr-ie-01` … `hr-ie-10` (territorial), `hr-ie-11` (abroad), `hr-ie-12-<minority>` (six minority elections); turnout also `hr-territorial-i-x` | `national` (88 list seats), `si-nc-italijanska`, `si-nc-madzarska` |
| Vote types | `hr_list_vote`, `hr_minority_candidate_vote` | `si_list_vote`, `si_national_community_candidate_vote` |
| Contestant ids | `ct-hr-sabor<yy>-ie<NN>-<row>`; minority `ct-hr-sabor<yy>-ie12-<minority>-<row>` | `ct-si-dz26-<row>`; communities `ct-si-dz26-nc-<ita|mad>-<row>` |
| Seat summary | `legislatures.seats_by_mechanism`, `seats_by_identical_list_title`, `seats_by_national_minority` | `legislatures.seats_by_mechanism`, `excluded_bodies` |

Required behaviour:
1. Add Croatia and Slovenia to the Politics index and country hubs with historical navigation (HR: 2015, 2016, 2020, 2024; SI: 2026).
2. Croatia: show results per constituency (select I–X, XI abroad, XII minorities); a national seat chart may use `seats_by_identical_list_title` + minorities, labelled "seats by identical list title"; never show a national vote share; minority elections show candidates as "Kandidat, red. br. N" (no names) with elected status; the Serbian election has three seats and no vote share.
3. Slovenia: national list chart (88), then the two national-community results (1 seat each, candidates without names); state that the National Council (Državni svet) is not part of the election.
4. Turnout: use `turnout_definition`; Croatian minority decisions print 100% by construction (voters stated = voters who turned out) — show the note, not a comparison.
5. Institutions: link each election to `src/lib/institutions/election_links.json` (period, changes in force, later changes).
6. Missing data: Romania and Austria show "not admitted" with the reasons in `politicalAdmission.ts` (Romania row unchanged; Austria blocked); Croatia 2011 and earlier and Slovenia before 2026 are absent, not zero.
7. Bilingual labels: list labels are original-language (`historical_display_label`); explanatory text exists in `electoral_systems.*.national_rules` (en / zh-CN).
8. Exports: link the existing research files under `public/research-data/political/{croatia,slovenia}/`.

## T. Recommended next batch

1. Austria: read the owner-downloaded BMI files (2024 first) from `local-evidence/` and admit the Nationalrat (Bundesrat excluded).
2. Romania: owner choice between manually saving RF_2.pdf/RF_3.pdf (2024) into `local-evidence/`, or admitting 2016 and 2012 (both chambers) from data.gov.ro.
3. Slovenia 2022, 2018, 2014, 2011 from the minutes in Uradni list (links from DVK pages).
4. Croatia 2011 with a different text-extraction route; 2007, 2003, 2000 after that.
5. Croatia and Slovenia in the cross-country comparison sets (after Codex builds the constituency-aware views).

## Addendum (same day): Romania 2016 admitted; deploy fix

**Deploy fix (LIVE d736f94).** The first push (010e048) failed `i18n:validate`: country hubs linked to `/politics/croatia/` and `/politics/slovenia/`, which Codex has not built. `admittedCountrySlugs` (used for links) now excludes admitted countries flagged `politicsRoute: false`; `admittedDataCountrySlugs` lists all admitted countries; `countryElectionLinks` lists elections only for countries with a page.

**Romania (owner answers "both" and "ii then i").** Admission `romania-parliament-2016` (`docs/political-data/romania_parliament2016_admission.json`), build `scripts/political-data/romania/build-parliament.mjs`.

| Election | Chamber | Lists | Independents (aggregated, no names) | Seats |
|---|---|---|---|---|
| `el-ro-cd-2016-12-11` | Camera Deputaților | 35 (17 national-minority organisations) | 39 | 329 = 312 list + 17 minority |
| `el-ro-s-2016-12-11` | Senat | 19 | 5 | 136 |

- Source: AEP files on data.gov.ro (OGL-ROU-1.0): polling-station results, postal results and mandate allocation by constituency, per chamber; downloaded once each at least 10 s apart.
- Checks per chamber: list + independent votes = valid votes (column e + postal d1; CD 7,047,384, Senate 7,052,966); seat-holding lists = lists ≥ 5% nationally; mandate files 312 / 136 by constituency; a simplified two-stage allocation reproduces the Senate exactly and the Chamber within one seat (PSD/ALDE), so the official file is the seat source; Art. 56 (5% of the average valid votes per deputy) gives 17 minority organisation seats, equal to the organisations the Chamber of Deputies lists for its 2016–2020 term (cdep.ro, read once, owner-approved; block checksum `9cf30fc6…`).
- Polling day 11 December 2016: earliest protocol transmission date in the AEP files.
- Limits (owner-accepted): no registered voters, voters or turnout (AEP count columns undocumented); source is the AEP centralisation (14 December 2016), not the BEC final act; no constituency votes.
- Institutions: `store_chamber` set for `ro-camera-deputatilor` and `ro-senat`; both elections link to `romania-period-2015-07-20` (Law 208/2015).
- Codex: `politicalRomanianStores()` (raw, gated); two separate elections — chamber selection required, never one combined chart; minority seats shown as a separate mechanism; turnout shown as "not published" with `turnout_definition`.
- Still missing: Romania 2024 and 2020 (owner to save RF_2.pdf / RF_3.pdf into `local-evidence/romania/`), 2012 (mixed-member system with single-member colleges; not started); Austria (owner files pending in `local-evidence/austria/`).

## Addendum: Slovenia 2014, 2018 and 2022 (owner reply "continue")

Admission `slovenia-dz-2014-2022` (`docs/political-data/slovenia_dz2014_2022_admission.json`); same build (`scripts/political-data/slovenia/build-dz.mjs`), now four elections.

| Election | Source document (www.dvk-rs.si) | Lists | List seats (88) | National communities |
|---|---|---|---|---|
| `el-si-dz-2014-07-13` | report 041-34/2014-286, 24 July 2014 (scan, anonymised) | 17 | SMC 36, SDS 21, DeSUS 10, SD 6, ZL 6, NSi 5, ZaAB 4 | ranking points (sole candidate in each) |
| `el-si-dz-2018-06-03` | minutes adopted 14 June 2018 (scan) | 25 | SDS 25, LMŠ 13, SD 10, SMC 10, Levica 9, NSi 7, SAB 5, DeSUS 5, SNS 4 | ranking points |
| `el-si-dz-2022-04-24` | minutes 041-5/2022-28, 7 May 2022 (scan) | 21 | Svoboda 41, SDS 27, NSi 8, SD 7, Levica 5 | votes |

- The scans have no text layer: the 1-bit page images were converted locally and read; every printed total (entitled voters, voters, ballots, invalid, valid) equals the sum of the commission's final results by polling station, which also give the exact list votes and short names. 2022 also agrees with the commission's archive data file (votes, seats, short names).
- D'Hondt over 88 seats with the 4% threshold reproduces every printed seat statement.
- 2014 and 2018 national-community results are ranking points (točk) and are stored as `points` under vote type `si_national_community_candidate_points`, never as votes; 2022 and 2026 are votes.
- Labels: 2014 and 2018 use the commission's short names (full names not transcribed); 2022 names with a person use the commission's short name (LMŠ, SAB, L'BP, NAŠA DEŽELA).
- 2011 not admitted: the polling-station file is in the legacy .xls format, so the cross-check could not be run.
- Institutions: `election_links.json` now holds 31 elections; all four Slovenian elections link to `slovenia-period-2013-05-24`.
