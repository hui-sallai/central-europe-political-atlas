# v2.0 — Four-country election completion and ten-country integration handoff (2026-11-19)

Owner brief of 2026-11-19 ("Four-country election completion and ten-country political data integration handoff"). This iteration continues `docs/v20-ten-country-elections-2026-11-18.md`; nothing admitted there was re-ingested.

## 1. Starting point

- Starting commit: `3a44f6d` (production, deploy run 44302229651, research package `47480742…`).
- Already admitted and live before this iteration (canonical stores `src/data/political/<country>/`, exact-hash records in `docs/legal-security/political_admission_records.json`):

| Country | Elections | Chamber(s) |
|---|---|---|
| Croatia | 2011, 2015, 2016, 2020, 2024 | Hrvatski sabor (151: 140 territorial + 3 abroad + 8 minority) |
| Slovenia | 2014, 2018, 2022, 2026 | Državni zbor (90: 88 list + 2 national-community) |
| Romania | 2016, 2024 | Camera Deputaților and Senat, separate elections |
| Austria | 2013, 2017, 2019, 2024 | Nationalrat (183) |

- Why the public Politics index still shows six countries: the four countries are admitted as research data with `politicsRoute: false` in `src/lib/politicalAdmission.ts`. `admittedCountrySlugs` (pages and links) therefore excludes them, `countryElectionLinks` returns nothing for them, and no `/politics/<slug>/` route exists. The national view adapter (`electionViewsFromStores` in `src/lib/politicalStores.ts`) cannot read constituency, multi-chamber or multi-ballot stores, so the four countries are exposed only as raw stores (`politicalCroatianStores()`, `politicalSlovenianStores()`, `politicalRomanianStores()`, `politicalAustrianStores()`). This is the frontend work in section 17; no data link is missing.

## 2. Newly admitted in this iteration

| Admission | Election | Source | Reconciliation |
|---|---|---|---|
| `austria-nationalrat-2002` | `el-at-nr-2002-11-24` (Nationalrat, 183) | BMI final-result workbook `NRW02_E_DL.xls` (owner-saved `nrw02_e_dl.zip`), read with a standard-library .xls reader | 9 parties; party votes = valid 4,909,645; valid + invalid = cast; nine Land rows = national row; seats from the workbook's own `Mandate` row (ÖVP 79, SPÖ 69, FPÖ 18, GRÜNE 17); parties with seats = parties ≥ 4%; national D'Hondt over 183 reproduces every party's seats |
| `slovenia-dz-2011` | `el-si-dz-2011-12-04` (Državni zbor, 90) | DVK report on the result, adopted 16 December 2011 (scan) | 20 lists; list votes = valid 1,102,256; valid + invalid = 1,121,475 ballots; printed turnout 65,60 and all 20 printed percentages recompute; 7 lists ≥ 4% = lists named; D'Hondt over 88 reproduces the printed seats (PS 28, SDS 26, SD 10, DLGV 8, DeSUS 6, SLS 6, NSi 4); stage seats 61 constituency + 27 national; Italian (1,009 valid, one candidate) and Hungarian (3,324 valid, two candidates) community elections reconcile as ranking points |

| `croatia-sabor-2000-2007` (second batch, owner-saved files) | `el-hr-sabor-2000-01-03` (151), `el-hr-sabor-2003-11-23` (152), `el-hr-sabor-2007-11-25` (153) | DIP final-results decisions (16, 17 and 17 PDFs with a text layer, saved by the owner from the exact archive links) | per decision: list votes = valid, valid + invalid = ballots, printed percentages recompute (rounded), lists ≥ 5% = lists named (2003 abroad names only the seat-winning list, recorded), D'Hondt reproduces every constituency; abroad seats by the printed non-fixed quota (valid I–X ÷ 140 = 19,816, 17,209, 17,067; abroad 6, 4, 5); minorities 5 seats in 2000 (Serbian 1), 8 in 2003 and 2007; HDZ 46, 66 and 66 seats by identical title |
| `slovenia-dz-2004-2008` (second batch) | `el-si-dz-2004-10-03` (90), `el-si-dz-2008-09-21` (90); 2011 cross-check | DVK archived official result pages (URADNI IZID / Uradni izidi), saved by the owner; 2011 polling-station .xls | 23 and 17 lists; list votes = valid (968,772; 1,051,827); printed turnout 60,65 and 63,10 and all printed percentages recompute; 7 lists ≥ 4% = 7 seat-holding lists in the composition table; D'Hondt over 88 reproduces the seats; both community elections reconcile as points. 2011: 3,914 station rows add up to the workbook total, which equals every figure of the report |

Labels: Austria 2002 uses the official short names (none names a person). Slovenia 2011 has no commission short names, so the three printed names containing a person's name are shown without it (`DRŽAVLJANSKA LISTA`, `POZITIVNA SLOVENIJA`, `SLS - SLOVENSKA LJUDSKA STRANKA`; `label_basis: partial_personal_name_omitted`, `title_sha256` kept). No candidate names anywhere. Croatia 2000–2007: independent lists printed as "NEOVISNA LISTA - <leader>" are shown as `NEOVISNA LISTA` (`label_basis: leader_name_omitted`, 74 distinct printed titles, never grouped); one party name containing a person's name is shown by its printed abbreviation (`BV-TREĆI BLOK`). Slovenia 2004: two lists that are a person's name are shown by row number and one as `SAMOSTOJNI KANDIDAT`.

**Not admitted from the second batch:** Slovenia 2000 from the archive pages — every saved 2000 page is marked "Neuradni" (unofficial; 99.93% of polling stations counted). It was admitted in the third batch from the official report (below).

### Third batch (owner ZIP `Election_Archives_Croatia_Slovenia.zip`; owner answers "Accept, record the route" and "1992, 1993 and 1995 only")

| Admission | Election | Source | Reconciliation |
|---|---|---|---|
| `slovenia-dz-2000` | `el-si-dz-2000-10-15` (90) | Republic Electoral Commission report, Uradni list RS 98/2000 (item 4130), page extract of an Internet Archive copy saved by the owner; correction 102/2000 (personal data only) | 23 lists; list votes = valid 1,079,280; valid + invalid = 1,116,218 ballots ≤ 1,116,423 voters ≤ 1,586,695 entitled; 22 of 23 printed percentages recompute; 8 lists ≥ 4% = lists named; D'Hondt over 88 reproduces the printed seats (LDS 34, SDS 14, ZLSD 11, SLS+SKD 9, NSi 8, DeSUS 4, SNS 4, SMS 4), stage seats 60 + 28; both community elections reconcile as points. The printed turnout 70,37 (counts give 70,36) and NSi's 8,76 (votes give 8,77) are kept as `…_not_reproduced` text only; the build fails unless each is exactly 0.01 off |
| `romania-parliament-2020` | `el-ro-cd-2020-12-06` (330), `el-ro-s-2020-12-06` (136) | Central Electoral Bureau final acts 1639 (Chamber) and 1640 (Senate) of 17 December 2020, Internet Archive captures of the publisher PDFs saved by the owner; read by eye from the rotated scans | per chamber: list + independent votes = valid (5,901,959; 5,908,364); a, b, f = their sub-items; 5 lists ≥ 5% = sections i–k; remainders = printed totals; i.2 = 219 + 93 and 53 + 83; national D'Hondt over the remainders = section j exactly, filling every constituency's slots; elected − j = first stage; m.2 15,942 and m.3 797 recompute; all 18 minority organisations = m.5. Chamber PSD 110, PNL 93, USR PLUS 55, AUR 33, UDMR 21 + 18 minority; Senate 47, 41, 25, 14, 9 |

| `croatia-sabor-1992` | `el-hr-sabor-1992-08-02` (Zastupnički dom, 138) | Electoral Commission decisions saved by the owner from izbori.hr: national lists (6 scanned pages, URBROJ 527 of 10 August 1992) and 64 constituency decisions (65 pages, URBROJ 463–526 of 11 August 1992); read by OCR with every unit reconciled, 18 units and all nominator columns checked by eye. Files 3–5 (analytical tables; quotient table with candidate names) received, not used | national lists: 17 lists + invalid = voters 2,690,873; every printed percentage = votes ÷ voters (invalid included — the 1992 base); a 3% threshold gives the same seven lists on voters or valid ballots, D'Hondt over 60 → HDZ 31, HSLS 12, HSP 5, HNS 4, HSS 3, SDP 3, DA–IDS–RDS 2; 60 single-member constituencies: candidate votes + invalid = voters, every percentage and turnout recomputes, winner = most votes (HDZ 54, IDS 3, HSLS 1, RDS 1, independent 1); minority special constituencies 1–4 one seat each; members declared elected from national lists (Arts. 10, 26(1)): 13 Serbian-community seats (HNS 2, SDP 8, SNS 3) and 1 more for minorities under 8% (HSLS list; 4 + 1 = printed minimum 5); 60 + 60 + 4 + 13 + 1 = 138 |
| `croatia-sabor-1995` | `el-hr-sabor-1995-10-29` (Zastupnički dom, 127) | Electoral Commission results document (41 scanned pages, 35 decisions of 14 November 1995, URBROJ 470–504), saved by the owner from izbori.hr; read by eye | national lists: 14 lists = valid 2,417,374, five ≥ 5% = lists named, D'Hondt over 80 → HDZ 42, HSS–IDS–HNS–HKDU–SBHS 16, HSLS 10, SDP 8, HSP 4; special lists abroad: 7 lists = valid 107,772, HDZ 12 of 12; 28 single-member constituencies: candidate votes = valid, every printed percentage and turnout recomputes, winner = most votes (HDZ 21); minority constituencies 1–4 one seat each, 5 three seats (several votes per voter, percentages of all candidate votes); 80 + 28 + 12 + 7 = 127. Special-list header percentages are truncated (recorded); all others rounded |

Labels: Slovenia 2000 — six lists that are persons' names are shown by row number and one as `NEODVISNI KANDIDAT`. Romania 2020 — one party name that contains two persons' surnames is shown as `PARTIDUL NAȚIONAL ȚĂRĂNESC` (`partial_personal_name_omitted`, `title_sha256` kept).

| `austria-nationalrat-2006-2008` | `el-at-nr-2006-10-01`, `el-at-nr-2008-09-28` (Nationalrat, 183 each) | BMI final-result workbooks (already held) and the final seat tables the owner saved afterwards (`nrw_06_mandatsspiegelv.pdf`, `nrw_08_mandatsspiegel.pdf`; 2006 also `nrw_06_mandate_3.pdf`) | party votes = valid (4,708,281; 4,887,309); nine Länder = national row; seat parties = parties ≥ 4% (BZÖ 4.11% in 2006); national D'Hondt over 183 → 2006 ÖVP 66, SPÖ 68, FPÖ 21, GRÜNE 21, BZÖ 7; 2008 SPÖ 57, ÖVP 51, FPÖ 34, BZÖ 21, GRÜNE 20; seat tables consistent across tiers (43 regional constituencies before the 2013 reform); 2006 third-stage table = seat table. Person-named short names (MATIN, STARK; FRITZ, [KHK], STARK) shown by column only |

**Not admitted from the third batch:** none outstanding for Austria (2006 and 2008 admitted once the owner saved the seat tables). Croatia 1993 and Romania 2012 are received and pending (new seat models). Croatia 1992 and 1995 were admitted (above). Croatia 1990 is out of scope by owner answer.

## 3. Chamber-specific coverage after this iteration

| Country | Elections | Contestants per election | Seats |
|---|---|---|---|
| Austria | 2002, 2006, 2008, 2013, 2017, 2019, 2024 | 9, 12, 15, 14, 16, 13, 12 parties | 183 each |
| Croatia | 1992, 1995, 2000, 2003, 2007, 2011, 2015, 2016, 2020, 2024 | 1992: 17 national lists, 618 single-member and 12 minority candidates; 1995: 14 national + 7 special lists, 175 single-member and 20 minority candidates; then 312, 412, 323, 369, 207, 206, 213, 182 (per-constituency lists + minority candidates) | 138 (1992) and 127 (1995, Chamber of Representatives), 151, 152, 153, then 151 each |
| Romania — Camera Deputaților | 2016, 2020, 2024 | 35, 41, 49 lists + independents aggregate | 329; 330; 331 |
| Romania — Senat | 2016, 2020, 2024 | 19, 23, 30 + aggregate | 136; 136; 134 of 136 |
| Slovenia | 2000, 2004, 2008, 2011, 2014, 2018, 2022, 2026 | 23, 23, 17, 20, 17, 25, 21, 21 lists (+ community candidates) | 90 each |

## 4. Historical rules and institutional links

- `src/lib/institutions/election_links.json` now holds 52 elections (second batch: + Croatia 2000, 2003, 2007 and Slovenia 2004, 2008; third batch: + Slovenia 2000 → `slovenia-period-2000-07-25`, Romania 2020 Chamber and Senate → `romania-period-2015-07-20`; Croatia 1992 and 1995 → `croatia-period-1990-12-22`, with the 2000 and 2001 changes as later changes). Croatia 2000 links to `croatia-period-1990-12-22` (before the 2000 and 2001 constitutional changes, which are `later_changes`; the 2000 decisions name the chamber Zastupnički dom Hrvatskoga državnog sabora); 2003 and 2007 link to `croatia-period-2001-03-28`. Slovenia 2004 and 2008 link to `slovenia-period-2000-07-25`. Austria 2002 links to **no** institutional period: the registry records Austrian periods only from 28 October 2008 (five-year term, voting age 16), so `institutional_period_id` is `null` and `at-2008-five-year-term` is listed under `later_changes` (no later rule applied retroactively). Slovenia 2011 links to `slovenia-period-2000-07-25` (Art. 80 amendment in force; the 2013 change is later).
- Each election keeps its own `electoral_systems` record (thresholds, allocation, special representation) — the link test asserts thresholds come from the election's own record, never the current law.

## 5. Source limitations still open (exact)

- ~~Romania 2020~~ — admitted in the third batch (Internet Archive captures of the BEC acts).
- **Romania 2012** (both chambers; mixed-member system of Law 35/2008, single-member colleges and compensation seats, 412 + 176 seats with overhang): the AEP package on data.gov.ro lists six files (`rezultatenivelsectieparlamentare2012.csv`, `statisticinivelcolegiu.xls`, `rezultate2012nivelcircumscriptie.xls`, `rezultate2012-statisticapelocalitati.xls`, `rezultate2012-statisticastrainatatepetari.xls`, `rezultatecandidati2012.xls`). The owner supplied all six files in the third batch (data.gov.ro); not yet built (mixed-member seat model). Candidate names in `rezultatecandidati2012.xls` would be counted, never stored.
- ~~Slovenia 2011 cross-check~~ — resolved in the second batch (owner-saved .xls; every figure agrees).
- ~~Slovenia 2000~~ — admitted in the third batch from the gazette report; the archived 2000 pages stay unused (unofficial). **Slovenia 2004 and 2008**: admitted from the official pages alone; the minutes or polling-station files would add a second source. Slovenia 1996 and earlier: not supplied.
- ~~Austria 2006 and 2008~~ — admitted (seat tables saved by the owner). Austria before 2002: not supplied.
- ~~Croatia 2007, 2003, 2000~~ — admitted in the second batch. Croatia before 2000: 1990 (out of scope, owner answer), 1992 and 1995 (Chamber of Representatives) admitted in the third batch; 1993 (Chamber of Counties) supplied, pending. The three results ZIPs were received and not used (polling-station tables; the decisions reconcile on their own).
- **Polling days to confirm**: Romania 2024 and Austria 2024 (registry `background_to_verify`); Austria 2002 and 2013 come from the registry's harmonised dates.

## 6. Exports, tests, files

- Research exports regenerated: `public/research-data/political/austria/*` and `public/research-data/political/slovenia/*` (JSON, CSV, README, manifest); the research ZIP is rebuilt by the deploy.
- Tests: `tests/tooling/political-austria.test.mjs` (2002 seats row, Länder tamper, D'Hondt tamper), `tests/tooling/political-croatia-slovenia.test.mjs` (2011 seats in list order, partial-name labels, stage seats, points elections), `tests/tooling/institutions-registry.test.mjs` (40 links, Austria 2002 without a period). Targeted run: 170 pass, 0 fail.
- Second batch tests: `political-croatia-slovenia.test.mjs` (seat structure per year 151/152/153, non-fixed quota recomputed and a tampered quotient fails the build, 2003 abroad wording, independent-list labels, 2000 counts-only turnout, repeat-voting dates, Slovenia 2004/2008 page source and D'Hondt tamper, 2011 cross-check source, no 2000 row) and `institutions-registry.test.mjs` (45 links; Croatia 2000 before the 2001 change).
- Modified: `scripts/political-data/austria/build-nationalrat.mjs`, `scripts/political-data/slovenia/build-dz.mjs`, both evidence files under `docs/political-data/raw/`, two new gate records (`austria_nationalrat2002_admission.json`, `slovenia_dz2011_admission.json`), `political-admission-amendments.mjs`, `political_admission_records.json`, `stage_c_decision_record.json`, `ui_governance_amendments.json`, `src/lib/politicalAdmission.ts`, `src/lib/institutions/election_links.json`, the stores and exports of both countries, the three tests, `CHANGELOG.md`.

## 7. Production data URLs (after deploy)

- `https://hy-central-europe-analysis.org/research-data/political/{austria,croatia,romania,slovenia}/elections.json` (and `election_results.csv`, `electoral_contestants.json`, `legislatures.json`, `electoral_systems.json`, `election_turnout.json`, `political_source_registry.json`, `README.md`, `manifest.json`)
- `https://hy-central-europe-analysis.org/research-data/research-data-v2.0.zip`; provenance `https://hy-central-europe-analysis.org/research-data/deployment_provenance.json`

## 8. Recommended next milestone

1. Codex: the four country election pages and the ten-country Politics index (section 17).
2. Owner download batch (one pass): Romania 2020 (2 PDFs), Romania 2012 (6 data.gov.ro files), Austria 2006 and 2008 seat tables, Slovenia 2011 station file and 2008/2004/2000 reports, Croatia 2007/2003/2000 decisions. Each then follows the existing build and gate path.

---

## 17. Codex handoff — TEN-COUNTRY PARLIAMENTARY ELECTION FRONTEND COMPLETION

Do not repeat source research. All figures below are admitted, reconciled and exact-hash recorded; consume the stores as they are.

### A. Election IDs (new countries)

- Austria: `el-at-nr-2002-11-24`, `el-at-nr-2006-10-01`, `el-at-nr-2008-09-28`, `el-at-nr-2013-09-29`, `el-at-nr-2017-10-15`, `el-at-nr-2019-09-29`, `el-at-nr-2024-09-29`
- Croatia: `el-hr-sabor-1992-08-02`, `el-hr-sabor-1995-10-29`, `el-hr-sabor-2000-01-03`, `el-hr-sabor-2003-11-23`, `el-hr-sabor-2007-11-25`, `el-hr-sabor-2011-12-04`, `el-hr-sabor-2015-11-08`, `el-hr-sabor-2016-09-11`, `el-hr-sabor-2020-07-05`, `el-hr-sabor-2024-04-17`
- Romania: `el-ro-cd-2016-12-11`, `el-ro-s-2016-12-11`, `el-ro-cd-2020-12-06`, `el-ro-s-2020-12-06`, `el-ro-cd-2024-12-01`, `el-ro-s-2024-12-01`
- Slovenia: `el-si-dz-2000-10-15`, `el-si-dz-2004-10-03`, `el-si-dz-2008-09-21`, `el-si-dz-2011-12-04`, `el-si-dz-2014-07-13`, `el-si-dz-2018-06-03`, `el-si-dz-2022-04-24`, `el-si-dz-2026-03-22`

### B. Countries and chambers

Nationalrat (AT, 183; the Bundesrat is not elected and must not be attached); Hrvatski sabor (HR, 151); Camera Deputaților and Senat (RO, two separate elections per year — never one chart, never summed); Državni zbor (SI, 90; Državni svet excluded).

### C. Years — see A. Existing six countries unchanged (DE 2002–2025, CZ 2017–2025, PL 2011–2023, SK 2023, HU 2022/2026, RS 2020–2026).

### D. Data files

`src/data/political/<country>/{elections,election_turnout,election_results,electoral_contestants,legislatures,electoral_systems,political_source_registry}.json`; public mirrors under `public/research-data/political/<country>/` (JSON + CSV + README + manifest). Accessors in `src/lib/politicalData.ts`: `politicalAustrianStores()`, `politicalCroatianStores()`, `politicalRomanianStores()`, `politicalSlovenianStores()` (each passes `gatedStores` → publication gate; a test calls all four).

### E. Registry updates Codex must make

1. `src/lib/politicalAdmission.ts`: remove `politicsRoute: false` for a country only in the same change that adds its `/politics/<slug>/` route (zh and en). `admittedCountrySlugs` then includes it, `countryElectionLinks` (`src/lib/institutionalRegistry.ts`) starts returning its links, and i18n/SEO validators require the route.
2. Update `tests/tooling/political-admission.test.mjs` (the exclusion list `['croatia','slovenia','romania','austria']`) and `tests/ui/politics-cross-country.spec.ts` accordingly.
3. Lib changes need a UI governance amendment (`docs/legal-security/ui_governance_amendments.json`), as for every earlier lib change.

### F. Election-specific rules (from each election's `electoral_systems` record)

- AT: 4% nationally or a regional seat; Hare quota in regional and Land constituencies, federal D'Hondt over 183 (`national_rules`).
- HR: per constituency, 5% of the constituency's votes, D'Hondt (14 seats each in I–X; abroad 3 from 2011, and in 2000, 2003 and 2007 6, 4 and 5 seats by the non-fixed quota in `seat_check.non_fixed_quota_abroad`); minorities elected separately (constituency XII, `hr-ie-12-<minority>`); 2015+ preferential vote (`changes_in_force`), 2023 Constituencies Act applies to 2024 only.
- RO: 5% of national valid votes (alliances higher); constituency quota then national D'Hondt over remainders; Chamber minority seats under Law 208/2015 Art. 56 (one seat each for organisations reaching 5% of the average votes per deputy).
- SI: 4% nationally; Droop quota in eight constituencies, D'Hondt over 88 nationally; two national-community deputies by separate ballots. 2004 and 2008 records come from result pages that cite no act (`interval_basis` says so).

### G. Special constituency handling

- HR 1992 (mixed system, own geographies): `hr-national-list` (60, D'Hondt), `hr-smd-01` … `hr-smd-60` (candidates by nominator and row; `NK` = independent, shown as `NK (nezavisni kandidat)`), `hr-special-1` … `hr-special-4` (minority, one seat each). **Every 1992 share is of voters who voted, invalid ballots included** (`share_base`; vote definitions use `denominator: ballots_cast`), unlike 1995 and later (valid ballots). National-list rows of HNS, SDP, Srpska narodna stranka and HSLS carry `members_declared_elected_from_list` (14 in all) — members declared elected under Arts. 10 and 26(1), counted apart from the 60 D'Hondt `seats`; `legislatures.lg-hr-sabor-1992.members_declared_elected_from_national_lists` groups them. Total 138 = `seats_by_mechanism` sum, not the sum of `seats` in result rows (124).
- HR 1995 (mixed system, own geographies): `hr-national-list` (80, D'Hondt; a real national tier, so a national vote share is valid here), `hr-smd-01` … `hr-smd-28` (`vote_type` `hr_single_member_candidate_vote`, candidates labelled by nominator and row, `nominated_by` array or `independent: true`), `hr-special-list-abroad` (12), `hr-special-1` … `hr-special-5` (minority; `hr-special-5` elects three, rows carry `printed_share_of_all_candidate_votes` and `published_vote_share: null`). `legislatures.lg-hr-sabor-1995` has `seats_by_national_list`, `seats_by_special_list`, `single_member_seats_by_nominator`. The election record carries `chamber_scope` (Chamber of Representatives only).
- HR: `geography` `hr-ie-01` … `hr-ie-10` (territorial), `hr-ie-11` (abroad), `hr-ie-12-<minority>` (minority elections; candidates without names). 2000 has five minority elections, one of them a different group (`hr-ie-12-austrijska_njemacka_rusinska_ukrajinska_zidovska`), and its Serbian election elects one member; 2000 turnout rows have `published_turnout: null` (turnout printed as counts only; list percentages are printed). 2003 and 2007 carry `repeat_poll_date`. **No national vote share**: lists differ by constituency. Seats per constituency; national seats only via `legislatures.seats_by_identical_list_title`.
- SI: `geography` `national` (88) and `si-nc-italijanska` / `si-nc-madzarska` (one seat each). 2000: national turnout row has `published_turnout: null` and `printed_turnout_not_reproduced: 70.37`; one list row has `published_vote_share: null` and `printed_vote_share_not_reproduced: 8.76` — show derived values, and the printed text only as a footnote. 2000, 2004, 2008, 2011, 2014, 2018 communities: `vote_type` `si_national_community_candidate_points` with `points` (ranked ballots) — show as points, never as votes or shares. 2022, 2026: votes.
- RO: Chamber rows carry `list_seats` and `minority_seats` (show minority seats as a separate mechanism). 2020 and 2024 rows also carry `first_stage_seats` and `national_stage_seats`; the Senate 2024 POT row carries `national_stage_entitlement` 9 and `undeployed_seats` 2, and `legislatures.lg-ro-s-2024` has `seat_slots` 136, `total_seats` 134 and `unfilled_seats_note` (show "134 of 136", with the note). Independents are one aggregate row per chamber (`contestant_kind: independent_candidates_aggregate`).
- AT: 2006, 2008, 2019 and 2024 rows carry `regional_seats`, `land_seats`, `federal_seats`; `legislatures.seats_by_land` lists Länder and the regional constituencies (43 in 2006/2008, 39 from 2013). 2006 and 2008 link to no institutional period (they predate 28 October 2008). Contestants `label_basis: row_only` (`Wahlvorschlag, Spalte 6`) must never be expanded.

### H. Sources

Each row's `provenance[]` names `source_id`; `political_source_registry` gives URL, publisher file SHA-256, licence basis (`licence_url`, `licence_status`), and acquisition (`owner_manual_download` for the 2024 BEC acts and BMI files; `owner_download_internet_archive_copy` with `archive_copy` for the 2020 BEC acts and the Slovenian 2000 report). Show source title + URL as the other countries do.

### I. Historical comparison fields

`elections[].date`, `year`, `chamber`, `result_vintage`, `date_basis`; `legislatures[].total_seats` (+ `seat_slots` RO 2024 Senate); `election_turnout[]` `eligible_voters`, `voters`/`voters_turned_out`, `valid_votes`, `invalid_votes`, `published_turnout`, `derived_turnout`, `turnout_definition`, `turnout_basis`; `electoral_systems[]` `system_family`, `allocation_method`, `national_rules.thresholds[].percent`, `minorityRepresentation`, `totalSeatsDefinition`; institutional context from `election_links.json` (`institutional_period_id`, `changes_in_force`, `later_changes`).

### J. Chart data and numerical definitions

- Vote share = `votes / valid_votes × 100` (`derived_vote_share`); use `published_vote_share` only where printed (SI 2011–2026 national lists, HR). Seat share = `seats / total_seats`. Keep vote share and seat share in separate encodings.
- Turnout: use `published_turnout` when not null, else `derived_turnout`, labelled as derived. RO 2016: turnout is `null` by design (undocumented AEP columns) — show "not published", never compute. RO 2020 and 2024: derived from printed counts (b ÷ a). AT: derived (votes cast ÷ eligible). SI national: printed; communities derived.
- Never add HR constituencies into a national vote total; never combine RO chambers; never put SI points on a vote axis; never treat AT `row_only` labels as names.

### K. Components to reuse

`PoliticalExplorerAlpha` (country page shell), `ParliamentSeats` (seat composition), `CountryElectionHistory` (hub block; it reads `politicalComparisonCountries()`), `PoliticalNationalDetails`, `PoliticalCountryComparison` / `PoliticalVerifiedComparison` (cross-country metadata only, no rankings). These consume `PoliticalElectionView`; write a small adapter per store shape: AT and SI general = one national ballot (SI communities as extra ballots), RO = one view per chamber and year with chamber selection, HR = per-constituency views plus a seats-only national summary.

### L. Routes to add (zh and en)

`src/app/(zh)/politics/{austria,croatia,romania,slovenia}/page.tsx` and `src/app/(english)/en/politics/{…}/page.tsx`; extend `src/app/(zh)/politics/page.tsx` / English index to all countries with admitted records; country hubs `src/app/(zh)/countries/[slug]/page.tsx` (and en) through `CountryElectionHistory`.

### M. Remaining data limitations

See section 5. In addition: no constituency-level vote results for AT, RO, SI (national only); no party attribution or cross-election party series for the four countries (`continuous_party_series` 0); RO 2016 is the AEP centralisation, not the BEC act; SI 2004 and 2008 have no second source (2011 is now cross-checked); AT 2002 has no institutional period in the registry; HR 2000's chamber name differs from the registry's chamber label (shown in the 2000 `electoral_systems.notes`).
