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

Labels: Austria 2002 uses the official short names (none names a person). Slovenia 2011 has no commission short names, so the three printed names containing a person's name are shown without it (`DRŽAVLJANSKA LISTA`, `POZITIVNA SLOVENIJA`, `SLS - SLOVENSKA LJUDSKA STRANKA`; `label_basis: partial_personal_name_omitted`, `title_sha256` kept). No candidate names anywhere.

## 3. Chamber-specific coverage after this iteration

| Country | Elections | Contestants per election | Seats |
|---|---|---|---|
| Austria | 2002, 2013, 2017, 2019, 2024 | 9, 14, 16, 13, 12 parties | 183 each |
| Croatia | 2011, 2015, 2016, 2020, 2024 | 369, 207, 206, 213, 182 (per-constituency lists + minority candidates) | 151 each |
| Romania — Camera Deputaților | 2016, 2024 | 35 + independents aggregate; 49 + independents aggregate | 329; 331 |
| Romania — Senat | 2016, 2024 | 19 + aggregate; 30 + aggregate | 136; 134 of 136 |
| Slovenia | 2011, 2014, 2018, 2022, 2026 | 20, 17, 25, 21, 21 lists (+ community candidates) | 90 each |

## 4. Historical rules and institutional links

- `src/lib/institutions/election_links.json` now holds 40 elections. Austria 2002 links to **no** institutional period: the registry records Austrian periods only from 28 October 2008 (five-year term, voting age 16), so `institutional_period_id` is `null` and `at-2008-five-year-term` is listed under `later_changes` (no later rule applied retroactively). Slovenia 2011 links to `slovenia-period-2000-07-25` (Art. 80 amendment in force; the 2013 change is later).
- Each election keeps its own `electoral_systems` record (thresholds, allocation, special representation) — the link test asserts thresholds come from the election's own record, never the current law.

## 5. Source limitations still open (exact)

- **Romania 2020** (both chambers): the BEC 2020 final acts are on the BEC site, which this environment cannot use (browser challenge). Needs the owner to save the Senate and Chamber "rezultate finale" PDFs into `local-evidence/romania/`.
- **Romania 2012** (both chambers; mixed-member system of Law 35/2008, single-member colleges and compensation seats, 412 + 176 seats with overhang): the AEP package on data.gov.ro lists six files (`rezultatenivelsectieparlamentare2012.csv`, `statisticinivelcolegiu.xls`, `rezultate2012nivelcircumscriptie.xls`, `rezultate2012-statisticapelocalitati.xls`, `rezultate2012-statisticastrainatatepetari.xls`, `rezultatecandidati2012.xls`). This environment's safety layer refused file downloads on 2026-11-19; owner download (or an explicit permission) needed. Candidate names in `rezultatecandidati2012.xls` would be counted, never stored.
- **Slovenia 2011 cross-check**: the commission's polling-station file `Voltive-DZ2011-koncni-izid-po-voliscih.xls` (www.dvk-rs.si) was refused by the safety layer; 2011 rests on the report alone (stated in the notes and the gate record). The .xls reader now exists, so the file can be checked as soon as it is saved locally.
- **Slovenia 2008, 2004, 2000 and earlier**: the commission archive pages were not read (same refusal); owner download of each year's report and station file needed.
- **Austria 2006 and 2008**: the owner-saved workbooks carry votes but no seats. Needs the seat tables (`nrw_06_mandatsspiegel*.pdf` or the 2006 announcement; the 2008 Mandatsspiegel). Austria before 2002: not supplied.
- **Croatia 2007, 2003, 2000** (and the bicameral Sabor before 2001): the izbori.hr archive for those years was not read; owner download of the per-constituency final decisions needed.
- **Polling days to confirm**: Romania 2024 and Austria 2024 (registry `background_to_verify`); Austria 2002 and 2013 come from the registry's harmonised dates.

## 6. Exports, tests, files

- Research exports regenerated: `public/research-data/political/austria/*` and `public/research-data/political/slovenia/*` (JSON, CSV, README, manifest); the research ZIP is rebuilt by the deploy.
- Tests: `tests/tooling/political-austria.test.mjs` (2002 seats row, Länder tamper, D'Hondt tamper), `tests/tooling/political-croatia-slovenia.test.mjs` (2011 seats in list order, partial-name labels, stage seats, points elections), `tests/tooling/institutions-registry.test.mjs` (40 links, Austria 2002 without a period). Targeted run: 170 pass, 0 fail.
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

- Austria: `el-at-nr-2002-11-24`, `el-at-nr-2013-09-29`, `el-at-nr-2017-10-15`, `el-at-nr-2019-09-29`, `el-at-nr-2024-09-29`
- Croatia: `el-hr-sabor-2011-12-04`, `el-hr-sabor-2015-11-08`, `el-hr-sabor-2016-09-11`, `el-hr-sabor-2020-07-05`, `el-hr-sabor-2024-04-17`
- Romania: `el-ro-cd-2016-12-11`, `el-ro-s-2016-12-11`, `el-ro-cd-2024-12-01`, `el-ro-s-2024-12-01`
- Slovenia: `el-si-dz-2011-12-04`, `el-si-dz-2014-07-13`, `el-si-dz-2018-06-03`, `el-si-dz-2022-04-24`, `el-si-dz-2026-03-22`

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
- HR: per constituency, 5% of the constituency's votes, D'Hondt (14 seats each in I–X; abroad 3); minorities elected separately (constituency XII, `hr-ie-12-<minority>`); 2015+ preferential vote (`changes_in_force`), 2023 Constituencies Act applies to 2024 only.
- RO: 5% of national valid votes (alliances higher); constituency quota then national D'Hondt over remainders; Chamber minority seats under Law 208/2015 Art. 56 (one seat each for organisations reaching 5% of the average votes per deputy).
- SI: 4% nationally; Droop quota in eight constituencies, D'Hondt over 88 nationally; two national-community deputies by separate ballots.

### G. Special constituency handling

- HR: `geography` `hr-ie-01` … `hr-ie-10` (territorial), `hr-ie-11` (abroad), `hr-ie-12-<minority>` (minority elections; candidates without names). **No national vote share**: lists differ by constituency. Seats per constituency; national seats only via `legislatures.seats_by_identical_list_title`.
- SI: `geography` `national` (88) and `si-nc-italijanska` / `si-nc-madzarska` (one seat each). 2011, 2014, 2018 communities: `vote_type` `si_national_community_candidate_points` with `points` (ranked ballots) — show as points, never as votes or shares. 2022, 2026: votes.
- RO: Chamber rows carry `list_seats` and `minority_seats` (show minority seats as a separate mechanism). 2024 rows also carry `first_stage_seats` and `national_stage_seats`; the Senate 2024 POT row carries `national_stage_entitlement` 9 and `undeployed_seats` 2, and `legislatures.lg-ro-s-2024` has `seat_slots` 136, `total_seats` 134 and `unfilled_seats_note` (show "134 of 136", with the note). Independents are one aggregate row per chamber (`contestant_kind: independent_candidates_aggregate`).
- AT: 2019 and 2024 rows carry `regional_seats`, `land_seats`, `federal_seats`; `legislatures.seats_by_land` lists Länder and 39 regional constituencies. Contestants `label_basis: row_only` (`Wahlvorschlag, Spalte 6`) must never be expanded.

### H. Sources

Each row's `provenance[]` names `source_id`; `political_source_registry` gives URL, publisher file SHA-256, licence basis (`licence_url`, `licence_status`), and acquisition (`owner_manual_download` for the BEC acts and BMI files). Show source title + URL as the other countries do.

### I. Historical comparison fields

`elections[].date`, `year`, `chamber`, `result_vintage`, `date_basis`; `legislatures[].total_seats` (+ `seat_slots` RO 2024 Senate); `election_turnout[]` `eligible_voters`, `voters`/`voters_turned_out`, `valid_votes`, `invalid_votes`, `published_turnout`, `derived_turnout`, `turnout_definition`, `turnout_basis`; `electoral_systems[]` `system_family`, `allocation_method`, `national_rules.thresholds[].percent`, `minorityRepresentation`, `totalSeatsDefinition`; institutional context from `election_links.json` (`institutional_period_id`, `changes_in_force`, `later_changes`).

### J. Chart data and numerical definitions

- Vote share = `votes / valid_votes × 100` (`derived_vote_share`); use `published_vote_share` only where printed (SI 2011–2026 national lists, HR). Seat share = `seats / total_seats`. Keep vote share and seat share in separate encodings.
- Turnout: use `published_turnout` when not null, else `derived_turnout`, labelled as derived. RO 2016: turnout is `null` by design (undocumented AEP columns) — show "not published", never compute. RO 2024: derived from printed counts (b ÷ a). AT: derived (votes cast ÷ eligible). SI national: printed; communities derived.
- Never add HR constituencies into a national vote total; never combine RO chambers; never put SI points on a vote axis; never treat AT `row_only` labels as names.

### K. Components to reuse

`PoliticalExplorerAlpha` (country page shell), `ParliamentSeats` (seat composition), `CountryElectionHistory` (hub block; it reads `politicalComparisonCountries()`), `PoliticalNationalDetails`, `PoliticalCountryComparison` / `PoliticalVerifiedComparison` (cross-country metadata only, no rankings). These consume `PoliticalElectionView`; write a small adapter per store shape: AT and SI general = one national ballot (SI communities as extra ballots), RO = one view per chamber and year with chamber selection, HR = per-constituency views plus a seats-only national summary.

### L. Routes to add (zh and en)

`src/app/(zh)/politics/{austria,croatia,romania,slovenia}/page.tsx` and `src/app/(english)/en/politics/{…}/page.tsx`; extend `src/app/(zh)/politics/page.tsx` / English index to all countries with admitted records; country hubs `src/app/(zh)/countries/[slug]/page.tsx` (and en) through `CountryElectionHistory`.

### M. Remaining data limitations

See section 5. In addition: no constituency-level vote results for AT, RO, SI (national only); no party attribution or cross-election party series for the four countries (`continuous_party_series` 0); RO 2016 is the AEP centralisation, not the BEC act; SI 2011 has no second source; AT 2002 has no institutional period in the registry.
