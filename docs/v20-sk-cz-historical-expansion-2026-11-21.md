# Slovakia and Czechia historical expansion, Hungary 2010 institutional period — 2026-11-21

Owner brief: "Slovakia and Czechia historical election expansion and historical institutional data completion" (2026-11-21).
Starting commit: `efca2765d2e7ae28e0432f179d253abc977a3ea0` (deploy run 44815221876).

Owner answers (2026-11-21):
- Slovakia: "You save files, § 5(a) basis (Recommended)".
- Czechia: "Accept ČSÚ general terms (Recommended)".

## 1. Outcome

| Item | Result |
|---|---|
| Czechia 2013 and 2010 (P0, first batch) | **Admitted.** `el-cz-ps-2013-10-25` and `el-cz-ps-2010-05-28` |
| Hungary 2010 dated institutional period (§7) | **Done.** `hungary-period-1989-10-30`; Hungary is now 5 of 5 |
| Slovakia 2020, 2016, 2012, 2010 and earlier | **Not admitted.** Waiting for owner-saved files (section 4) |
| Czechia 2006, 2002 | **Not admitted.** Next batch; the same route applies (section 6) |

Chamber elections: 58 → 60. Czechia now covers 2010, 2013, 2017, 2021 and 2025. Every previously admitted result, seat count and turnout figure is unchanged; tests check this row by row.

## 2. Czechia 2010 and 2013

### Sources and rights

- **Data:** ČSÚ open-data CSV packages on volby.gov.cz, retrieved once each on 2026-11-21:
  - `PS{2013,2010}_data_20230224_csv.zip`
  - `_reg_20230428_csv.zip`
  - `_cisel_20230224_csv.zip`
- **Rights:** the ČSÚ terms, read the same day, state that statistical information published through csu.gov.cz is licensed CC BY 4.0. The volby.gov.cz pages link these terms in their footer, and the owner accepted them for these files.
  - Rights entry `src-cz-volby-ps2010-2013`: `cleared_with_conditions`, `verified`.
  - The general `src-cz-volby` entry stays `blocked`.
  - Attribution entry `csu-volby-ps2010-2013`.
- **Election calls:** presidential decisions 37/2010 Sb. (28–29 May 2010) and 266/2013 Sb. (25–26 October 2013), read on e-Sbírka.
- **Rules:** Act 247/1995 Coll. in the versions in force on each polling day, both read on e-Sbírka; §§ 48–51 read identically in both:
  - 14 Sep 2009 – 15 Jun 2010;
  - 26 Jun 2012 – 6 Apr 2014.
- **Official result check:** State Electoral Commission notice 343/2013 Sb. The 2010 notice was not located.

### Reconciliation

| | 2010 | 2013 |
|---|---|---|
| Polling districts | 14,894 | 14,873 |
| Registered voters | 8,415,892 | 8,424,227 |
| Issued envelopes | 5,268,098 | 5,010,944 |
| Valid votes | 5,230,859 | 4,969,984 |
| Published turnout | 62.6% | 59.48% |
| Lists that stood (contestants) | 26 | 23 |
| Lists with seats | ČSSD 56, ODS 53, TOP 09 41, KSČM 26, VV 24 | ČSSD 50, ANO 2011 47, KSČM 33, TOP 09 26, ODS 16, Úsvit 14, KDU-ČSL 14 |

How the build checks these figures:
- District sums equal ČSÚ VOLPS03 for registered voters, envelopes, valid votes and district counts, and reproduce the published turnout.
- List votes sum to valid votes in every region.
- Register seats (`POCMANDCR`) equal the elected count per list (`MANDAT`).
- §§ 48–50 re-run on the regional votes reproduce every list's seats.
- For 2013, all 360 cells of notice 343/2013 Sb. (23 lists plus total × 14 regions plus national) equal the district sums.
- Districts abroad belong to one region drawn by lot (§ 27):
  - 2013: Středočeský, shown by the notice.
  - 2010: Jihočeský, inferred. It is the only region that reproduces the official seats, and it is used in the check only.

Lists without any vote:
- 2010 list 3 and 2013 list 19 are in the register but recorded no vote in any district. The 2013 notice does not list no. 19.
- Neither is a contestant. Their register rows stay in the evidence.

### What is stored

National rows only, in the same stores as 2017–2025:
- `elections`, `election_turnout`, `election_results`, `electoral_contestants`, `legislatures`, `electoral_systems`, `political_source_registry`.

How the new rows differ:
- `published_vote_share` is null. The derived share is computed, and no published share is claimed.
- Contestants are `party_list`: every list had one proposer and code-list type S.
- `party_relation_status` is `not_linked_identity_layer_covers_2017_onward`.

Evidence (`docs/political-data/raw/czechia/ps2010-2013/`):
- per-region totals and region × list vote sums;
- the list register (list fields only);
- the code-list rows used;
- per-list elected counts;
- the VOLPS03 excerpt.

No candidate name, preferential vote or other candidate field is committed.

Scripts:
- `scripts/political-data/czechia/stage-ps2010-2013.mjs` (one-off staging);
- `scripts/political-data/czechia/build-ps2010-2013.mjs` (build and checks, including the § 48–50 re-run);
- merged by `build-ps-national.mjs`.

Admission:
- record `czechia-ps-2010-2013` (exact hashes, baseline d68d0e1);
- gate record `docs/political-data/czechia_ps2010_2013_admission.json`.

## 3. Hungary 2010 institutional period

Sources, each read once by hand on njt.jog.gov.hu:

| Source id | Act | Read |
|---|---|---|
| `hu-act-xxxi-1989` | 1989. évi XXXI. törvény az Alkotmány módosításáról | Adopted 1989-10-18; promulgated 1989-10-23; repealed from 2012-01-01 |
| `hu-act-xxxiv-1989` | 1989. évi XXXIV. törvény az országgyűlési képviselők választásáról | Adopted 1989-10-20; promulgated and in force 1989-10-30 (§ 56(1)); § 4: 386 seats; § 8(5) thresholds; repealed by Act CCIII of 2011 § 26(a) from 2012-01-01 |

Effects:
- Hungary 2010 is linked to `hungary-period-1989-10-30` and to `hu-constitution-1949-as-amended-1989` (new `previous_constitutions`).
- Elections from 2014 list both 1989 acts under `repealed_before`, not as in force.
- The constitutional amendment's effective date is not asserted: no entry-into-force clause was found.

## 4. Slovakia: waiting for owner files

Why there is no Slovak admission yet:
- The only source with full results is volby.statistics.sk. Collecting from it automatically is not allowed.
- The minv.sk file named `NR20_ZapisnicaStK.pdf` is the 2023 minutes, already admitted.
- No minutes or Collection of Laws results notice was found for 2020, 2016, 2012 or 2010.

The owner chose to save the files by hand, with the Copyright Act § 5(a) basis used for 2023.

Needed in `local-evidence/slovakia/<year>/`, 2020 and 2016 first, then 2012 and 2010:
- For each year, the national result tables from volby.statistics.sk:
  - voters on the rolls, voters who took part, valid votes and turnout;
  - votes and shares for every list;
  - seats per list;
- or the State Commission minutes PDF, if it is listed there.

The build reuses `build-nrsr-national.mjs`, with the year's rules from Act 180/2014 (2016, 2020) or Act 333/2004 (2010, 2012), read on static.slov-lex.sk.

## 5. Other inherited gaps (not worked on)

- **Austria, 4 of 7 elections with a dated period:** 2002, 2006 and 2008 come before the earliest recorded Austrian change. This needs the dated Nationalrat-Wahlordnung 1992 amendments from RIS.
- **Romania:** the 2024 polling-day source still needs the owner-staged Government decision.
- **Czechia:**
  - Change `cz-2021-chamber-electoral-rules` has no effective date in the registry. The 2021 rule record cites the version "1. 7. 2021 – 30. 6. 2024".
  - The identity layer covers 2017 onward, so 2010 and 2013 lists are unlinked. Linking them needs the Interior Ministry register review that the identity rule already requires.
- **Hungary:** 1990–2006 are not admitted. The 1989 period would now cover them.

## 6. Recommended next batch

1. **Czechia 2006 and 2002.** Same route and owner decision type, using the ps2006 and ps2002 open-data packages; the same §§ 48–50 check applies. Hold until the owner extends the 2026-11-21 answer to these two years: it named 2013 and 2010.
2. **Slovakia 2020 and 2016** once files are saved.
3. **Czech identity extension to 2010/2013**, only with the register review the rule needs.

## 7. Checks

- Tooling: all files pass, including the new `tests/tooling/political-czechia-2010-2013.test.mjs` (5 tests).
- Count updates:
  - 58 → 60 links;
  - Czech views 3 → 5;
  - D1 17 elections;
  - D4 case 22 inputs, with the published case still pinned to 17.
- D2 and D3 keep their original reference sets exact. A separate test checks that Czechia 2010 and 2013 enter D3.
- The full CI mirror runs before any push.

## 8. Codex handoff — SLOVAKIA AND CZECHIA HISTORICAL ELECTION FRONTEND INTEGRATION

New data, all through the existing store contract, with no new page needed:

| Election ID | Country | Chamber | Date | Seats | Contestants | System id | Period |
|---|---|---|---|---|---|---|---|
| `el-cz-ps-2010-05-28` | czechia | `cz-poslanecka-snemovna` (store `Poslanecká sněmovna`) | 2010-05-28 – 05-29 | 200 | 26 (`ct-cz-ps2010-NN`) | `es-cz-ps-2010` | `czechia-period-1993-01-01` |
| `el-cz-ps-2013-10-25` | czechia | same | 2013-10-25 – 10-26 | 200 | 23 (`ct-cz-ps2013-NN`) | `es-cz-ps-2013` | `czechia-period-2012-10-01` |

Where the data is:
- **Stores:** `src/data/political/czechia/*.json`.
- **Research export:** `public/research-data/political/czechia/{elections,election_turnout,election_results,electoral_contestants,electoral_systems,legislatures,political_source_registry}.{json,csv}`, with README and manifest updated.
- **Turnout definition:** issued envelopes / registered voters × 100 (`turnout_basis.numerator: envelopes_issued`), the same as 2017–2025, so turnout is comparable within Czechia.
- **Sources:** `src-cz-volby-ps{2010,2013}-opendata`, `src-cz-esbirka-247-1995-{2010,2013}`, `src-cz-esbirka-call-{2010,2013}`, `src-cz-esbirka-results-2013`, `src-cz-csu-volps03-2010-2013`, `src-cz-ps2010-2013-evidence`.

Comparison restrictions:
- `published_vote_share` is null for 2010/2013. Use `derived_vote_share`, labelled as computed from votes.
- 2010/2013 and 2017 share the same rules; 2021 and 2025 differ: thresholds 5/8/11 and two scrutinies.
- No party continuity crosses 2013→2017. `politicalCzechContinuity()` now uses only 2017–2025.
- Czech and German turnout definitions differ (envelopes vs voters), as before.

Hungary 2010 changes:
- `institutional_period_id` and `constitution_id` changed, and there is a new optional `repealed_before`.
- The comparison panel now shows "1989-10-30 until (exclusive) 2012-01-01" for 2010. The spec was updated.

Codex tasks:
1. Confirm 2010 and 2013 appear in the Czech year selectors, history turnout, seat composition and the ten-country comparison, in English and Chinese.
2. Show "computed share" where `published_vote_share` is null; never present it as published.
3. Optionally show `repealed_before` next to "Changes in force", and the 1989 Hungarian changes in the Hungary timeline.
4. Fix only confirmed regressions; the comparison engine is unchanged.
