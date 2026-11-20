# Historical parliamentary election backfill — 2026-11-20

Owner brief "Central Europe Political Atlas v2.0 — historical parliamentary election backfill and institutional rule completion" (2026-11-20). Owner answers the same day:

- Slovakia: "minv.sk minutes (Recommended)".
- Hungary: "Same scope as 2022 (Recommended)".
- Czechia: "You download by hand (Recommended)".
- Austria and Romania: "Austria: read RIS notice", "Romania: you stage files", "Romania: cite IPU Parline".

## A. Starting commit

`41a972bb3e83ab37d3d2b0cb6680599ac13ab978` ("Pin reviewed Linux layouts for the ten-country election directory"), production run 44622385105.

## B. Elections newly admitted

| Election id | Country | Chamber | Polling day | Seats | Sources |
|---|---|---|---|---|---|
| `el-hu-ogy-2014-04-06` | hungary | Országgyűlés (`hu-orszaggyules`) | 2014-04-06 | 199 (93 list + 106 district) | NVB minutes in minutes form, threshold and seat-calculation pages (static.valasztas.hu/dyn/pv14); composition page `l50.html` |
| `el-hu-ogy-2018-04-08` | hungary | Országgyűlés (`hu-orszaggyules`) | 2018-04-08 | 199 (93 list + 106 district, of which 1 independent) | NVB list-result minutes PDF, annex to Kúria decisions Kvk.V.37.548/2018/14., Kvk.I.37.551/2018/9., Kvk.I.37.552/2018/9. (sha256 `e4ca8a14…8b06612`); composition page `l50.html` |

## C. Years by country after this iteration

| Country | Admitted parliamentary elections |
|---|---|
| Germany | 2002, 2005, 2009, 2013, 2017, 2021, 2025 |
| Czechia | 2017, 2021, 2025 |
| Slovakia | 2023 |
| Poland | 2011, 2015, 2019, 2023 |
| Hungary | **2014, 2018**, 2022, 2026 |
| Serbia | 2020, 2022, 2023, 2026 |
| Austria | 2002, 2006, 2008, 2013, 2017, 2019, 2024 |
| Croatia | 1992, 1993 (Županijski dom), 1995, 2000, 2003, 2007, 2011, 2015, 2016, 2020, 2024 |
| Slovenia | 2000, 2004, 2008, 2011, 2014, 2018, 2022, 2026 |
| Romania | 2012, 2016, 2020, 2024 (Chamber of Deputies and Senate each) |

57 chamber elections are linked in `src/lib/institutions/election_links.json` (55 before).

## D. Contestant coverage

- 2018: all 23 party lists and all 13 nationality lists, with the minutes' row numbers, organisation identifiers and drawn ballot numbers.
- 2014: all 18 party lists and all 13 nationality lists, with drawn ballot numbers; the 2014 archive prints no organisation identifiers (`minutes_list_id` null).
- Zero-seat lists are kept. Joint lists stay whole: 2018 rows 9 (MSZP–Párbeszéd) and 13 (Fidesz–KDNP); 2014 rows 6 (FIDESZ-KDNP) and 17 (MSZP-EGYÜTT-DK-PM-MLP).
- The 2014 list "… SZÖVETSÉGESEI" begins with a person's name. It is stored without the name (`label_basis: partial_personal_name_omitted`, `printed_label_sha256`).

## E. Vote and seat reconciliation (`build-ogy-national.mjs`, fail-closed)

| Check | 2014 | 2018 |
|---|---|---|
| Registers (address + transfer + foreign + postal = total) | 8,241,488 | 8,312,173 |
| Participation (station + envelopes = total) | 5,096,524 | 5,796,268 |
| Invalid + valid = stamped ballots | 46,173 + 5,047,363 | 59,585 + 5,732,283 |
| Party + nationality votes = valid | 5,027,820 + 19,543 | 5,694,751 + 37,532 |
| Printed 5/10/15% thresholds = ceil of valid | 252,369 / 504,737 / 757,105 | 286,615 / 573,229 / 859,843 |
| Preferential quota = floor(all list votes ÷ 93 ÷ 4) | 22,022 (none reached) | 23,831 (German list, 1 seat) |
| Highest averages over list + surplus votes | 37 / 28 / 23 / 5 of 93 | 42 / 25 / 12 / 7 / 6 of 92 |
| Composition: list seats = minutes, 93 + 106 = 199 | yes | yes, with 1 independent district seat |

The 2022 and 2026 rows are byte-identical apart from checksums.

## F. Electoral rules

- Both new elections link to `es-hu-ogy-2014` / `es-hu-ogy-2018`. These hold the Act CCIII of 2011 rules: 106 single-member districts plus 93 national list seats, the 5/10/15% thresholds, surplus votes and highest averages, and the nationality preferential quota.
- Both are linked to the institutions registry period `hungary-period-2012-01-01` (Fundamental Law). Later changes listed: `hu-2026-amendment-16`, `hu-2026-amendment-17`.
- 2010 and earlier ran under the previous 386-seat, two-round system (Act XXXIV of 1989). None of those rules were copied or assumed.

## G. Party identity relationships

None added. Hungarian minutes give organisation identifiers per election, so an identifier is not an identity; no party register was reviewed, and `continuous_party_series` stays 0.

## H. Romania and Austria metadata

- **Austria 2024.** The polling day is now sourced to BGBl. II Nr. 169/2024, § 2 ("als Wahltag der 29. September 2024 festgesetzt"), read in RIS. The legal basis printed in the ordinance is § 1 Abs. 2 NRWO; the reference day is 9 July 2024. The election row's `date_basis` no longer contains `background_to_verify`, so the page drops "Registry date awaiting confirmation". New source: `src-at-ris-wahlausschreibung-2024`.
- **Romania 2024 Senate.** The figures are unchanged: statutory size 136 (`seat_slots`), 134 filled (`total_seats`), 2 unfilled (`seats_by_mechanism.unfilled`), allocated to POT but deployed to no constituency (Giurgiu, Ialomița).
  - The legislature note and the seat definition now add the IPU Parline explanation, labelled as a secondary source: POT had too few candidates there, and the bureau left the seats vacant. New source: `src-ro-ipu-parline-s-2024`, tier `tier2_secondary_reference`.
  - No Central Electoral Bureau decision on the vacancy was read.
  - The 1 December 2024 polling day stays marked for confirmation until the owner stages the Government decision. The IPU page also shows 1 Dec 2024, but it is secondary and was not used for the date.

## I. Sources and research exports

- `public/research-data/political/hungary/*` (7 stores × JSON/CSV, README, manifest) now hold four elections. The Austrian and Romanian exports were regenerated.
- The research package is built by the existing deploy (no second package).
- Admission records:
  - `docs/political-data/hungary_ogy2014_2018_admission.json`
  - `docs/political-data/austria_nationalrat2024_polling_day_admission.json`
  - `docs/political-data/romania_senate2024_vacancy_note_admission.json`
  - Exact hashes in `docs/legal-security/political_admission_records.json` (32 records).
- The network registry records this session's readings: static.valasztas.hu, RIS, minv.sk, volby.gov.cz and the new data.ipu.org entry.
- On volby.gov.cz, the 2010, 2006 and 2002 index pages were read with an in-page request from the open 2013 page. No data file was taken.

## J. Tests

- Updated: `political-hungary-ogy` (four elections, a new 2014/2018 test, the independent seat, the person-name check), `institutions-registry` (57 links), `election-macro-linkage` and `comparative-election-research` (Hungary counts), and `comparative-research-case` (D4 pinned).
- The published D4 case is now fixed to its 17 elections (`RESEARCH_CASE.electionIds`), so its 12 pairs and findings are unchanged.
- D1 (election–macro linkage) is designed to include every admitted election and now has Hungary 2014/2018 rows (all with "not documented as released before polling").

## K–M. Final commit, deployment, URLs

See the commit and the deployment record after push: `/research-data/deployment_provenance.json`, `/research-data/research-data-v2.0.zip`, `/en/politics/hungary/`.

## N. Remaining gaps (not admitted)

| Country | Missing elections | Blocker |
|---|---|---|
| Slovakia | 2020, 2016, 2012, 2010, 2006, 2002, 1998, 1994, 1992 (ČSFR-era Slovak National Council), 1990 | volby.statistics.sk forbids robots in its terms; minv.sk links only the 2023 State Commission minutes. Candidate route: the result announcements published in the Collection of Laws (Zbierka zákonov) on static.slov-lex.sk (registered), which would need the gazette numbers from the owner. |
| Czechia | 2013, 2010, 2006, 2002 (open data exists); 1998, 1996 (no open data on volby.gov.cz) | ČSÚ DataStat holds only national totals for these years. The full files are on volby.gov.cz (scripted download not allowed); waiting for owner-saved `PS<year>_data_*_csv.zip`, `PS<year>_reg_*_csv.zip`, `PS<year>_cisel_*_csv.zip` |
| Hungary | 2010, 2006, 2002, 1998, 1994, 1990 | Different 386-seat, three-tier, two-round system; no source or rules read; needs a separate decision |
| Romania | 2024 polling-day confirmation; reason for the unfilled seats from a primary source | Government decision and any BEC decision to be staged by the owner in `local-evidence/romania/2024/` |
| Poland | 2007 and earlier | not investigated in this iteration |
| Germany, Serbia, Austria, Croatia, Slovenia | earlier elections | not prioritised (substantial series already) |

## O. Codex handoff — ten-country historical election explorer

The data needs no new research. Integrate from the stores below.

- **Hungary data** (`src/data/political/hungary/*.json` through `politicalHungarianElectionViews()`):
  - Four election ids: `el-hu-ogy-2014-04-06`, `el-hu-ogy-2018-04-08`, `el-hu-ogy-2022-04-03`, `el-hu-ogy-2026-04-12`.
  - Systems `es-hu-ogy-<year>`; legislatures `lg-hu-ogy-<year>`; chamber id `hu-orszaggyules`.
- **Seat measures:**
  - `seats` = national list tier (÷ 93).
  - `constituencySeats` and `chamberSeats` = whole chamber (÷ 199). Use `seatMeasureScope()` and `listTierSeatShare()` / `chamberSeatShare()`; never divide `seats` by 199.
- **Independent seat (new):**
  - 2018 has `national.seatTiers.independentConstituency = 1` and `legislatures[].independent_constituency_seats = 1`. The list rows add up to 105 district seats and 198 whole-chamber seats.
  - Show one extra "Independent (not named)" line in the composition view so the parliament totals 199. Do not create a contestant for it.
- **Ballots:**
  - Party-list (`hu_party_list_vote`) and nationality-list (`hu_nationality_list_vote`) votes are separate ballots, each with its own denominator.
  - Turnout is computed (`derived_turnout`, voters ÷ all registers); no printed percentage exists.
- **Labels:**
  - 2014 labels are the printed abbreviations (e.g. FIDESZ-KDNP, MSZP-EGYÜTT-DK-PM-MLP, MNOÖ). Show them as printed.
  - The list with `label_basis: partial_personal_name_omitted` shows "… SZÖVETSÉGESEI"; keep the omission.
- **Party identity:** no links across Hungarian elections. Do not draw party lines across years; draw election-by-election composition only.
- **Austria 2024:** `date_basis` no longer triggers "Registry date awaiting confirmation"; nothing to change in the component.
- **Romania 2024 Senate:**
  - Show statutory 136, elected 134 and unfilled 2 from `legislatures.json` (`seat_slots`, `total_seats`, `seats_by_mechanism.unfilled`).
  - Show the note `unfilled_seats_note`, which now ends with the IPU secondary-source sentence, and the seat definition (EN/ZH) in `electoral_systems.national_rules.totalSeatsDefinition`.
  - Keep the date flag: its basis still contains `background_to_verify`.
- **Valid comparison measures:**
  - Turnout over time within a country, on the same basis only (`compatibleTurnout`).
  - Vote share within one ballot.
  - Seat share within one scope.
  - Chamber size and rule versions from `election_links.json` (`chamber_id`, `seats`, `thresholds`, `institutional_period_id`, `changes_in_force`, `later_changes`).
- **Not valid:**
  - Cross-country party equivalence.
  - Pooled vote shares across ballots.
  - Hungarian district votes (not held).
  - Linking any Hungarian list across years.
- **D4 research case:** stays on its published 17 elections (`RESEARCH_CASE.electionIds`). Do not feed new elections into it without a research decision.

## P. Recommended next batch

1. Czechia 2013, 2010, 2006 and 2002, from the owner-saved volby.gov.cz CSV ZIPs. Votes come from the data file; seats are counted from the register's mandate flag, without names. This is the existing Czech builder path.
2. Slovakia 2020 and 2016 from the Collection of Laws announcements on static.slov-lex.sk, if the owner supplies the gazette numbers. Otherwise from owner-saved statistics.sk files, with the owner deciding the scope of its terms.
3. Romania 2024 polling day from the owner-staged Government decision.
4. Hungary 2010 and earlier only after a decision on sources and on modelling the three-tier, two-round system.
