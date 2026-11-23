# Germany 1990–1998 and Slovenia 1992–1996 — historical parliamentary elections (2026-11-23)

Owner brief of 2026-11-23 ("Germany 1990–1998 & Slovenia 1992–1996 historical parliamentary election expansion").
Owner answers in this session: **"Additive exception"** (Germany stores may gain earlier elections at exact hashes,
2002–2025 rows unchanged), **"Register bundestag.de"** (manual reading for the legal basis), **"I'll save both"**
(the owner saves the Slovenian 1992 and 1996 gazette reports; www.uradni-list.si stays blocked for the assistant).

## A. Starting point

- Starting HEAD: `3a63ccc` (main; Hungary 1998 integration merged through PR #1).
- Branch: `data/de-si-early-2026-11-23` in worktree `hu-wt`.

## B. Elections admitted

| Country | Election ID | Polling day | Chamber | Seats | Status |
|---|---|---|---|---|---|
| Germany | `el-de-bt-1990-12-02` | 1990-12-02 | Bundestag (12th) `lg-de-bt-12` | 662 | admitted |
| Germany | `el-de-bt-1994-10-16` | 1994-10-16 | Bundestag (13th) `lg-de-bt-13` | 672 | admitted |
| Germany | `el-de-bt-1998-09-27` | 1998-09-27 | Bundestag (14th) `lg-de-bt-14` | 669 | admitted |
| Slovenia | (1992, 1996) | 1992-12-06, 1996-11-10 | Državni zbor | 90 | see §J |

## C. Coverage before and after

- Germany: 2002–2025 (7) → 1990–2025 (10).
- Slovenia: see §J.

## D. Official sources (Germany)

| Source ID | What | Use |
|---|---|---|
| `src-de-bwl-final-archive` | `btw_kerg.zip` (archived 2026-10-01; members `btw1990_kerg.csv`, `btw1994_kerg.csv`, `btw1998_kerg.csv`, national row 999) | eligible voters, voters, valid/invalid first and second votes, every column's first and second votes, labels as registered |
| `src-de-bwl-historical-results` | `btw_ab49_datenbank_ergebnisse.csv` (dl-de/by-2-0; archived 2026-10-01) | published shares, final seats split into constituency (Wahlkreis) and Land-list seats, 1990 second votes of the two electoral areas |
| `src-de-bwl-election-1990/1994/1998` | official result pages bundeswahlleiterin.de/bundestagswahlen/<year>.html (fetched once each, 2026-11-23) | polling day, labels as printed on the result page, "Sonstige" subtotal check, seats per party |
| `src-de-bwl-overhang` | glossary "Überhangmandate" (already registered) | 328 constituencies, 662/672/669 seats, overhang seats by Land and party |
| `src-de-bwl-hare-niemeyer` | glossary "Hare/Niemeyer" (already registered) | Hare/Niemeyer used 1987–2005 |
| `src-de-bwl-basic-mandate` | glossary "Grundmandatsklausel" | three-constituency clause; its 1994 application (PDS) |
| `src-de-bwl-constituencies` | glossary "Wahlkreise" | 328 constituencies by Land for 1990–1998 |
| `src-de-bundestag-dhb-1-1` | Bundestag Datenhandbuch ch. 1.1 (PDF sha256 `bb9184ee…`, read in the browser pane; not stored — bundestag.de terms: private use) | legal basis: law titles, Bundestag adoption and promulgation dates, BGBl references (facts only) |
| `src-parlgov-2024-election` | ParlGov 2024 (academic, CC0) | seat-total reconciliation only (662/672/669 match) |

Committed evidence: `docs/political-data/germany_early_elections_evidence.json` (re-parsed from the archived pages by
`scripts/political-data/germany/early-evidence.mjs`; archived HTML is git-ignored) and
`docs/political-data/germany_early_legal_evidence.json` (facts only).

## E. Contestant coverage (Germany)

Every column of the final-results file is one election-specific contestant; nothing is dropped, merged or split.

| Election | Contestants | Second-vote rows | First-vote rows | Seat-holding |
|---|---|---|---|---|
| 1990 | 26 (24 lists, EFP constituency-only, 1 aggregate) | 24 | 26 | 6 |
| 1994 | 33 | 22 | 33 | 6 |
| 1998 | 41 | 33 | 37 | 6 |

- Labels: `historical_display_label` = label printed on the official result page (e.g. `F.D.P.`, `B90/Gr.`,
  `Die Tierschutzpartei`, `BFB-Die Offensive`); `registered_label_native` = the final-results file's column header.
- CDU and CSU are separate contestants; in 1990 GRÜNE (western list) and B90/Gr. (eastern list) are separate.
- The page subtotal "Sonstige" is checked against the parties listed under it and is not stored.
- "Wählergruppen/Einzelbewerber" (first votes only; file headers `Übrige`/`Einzelbewerber`) is one row with
  `contestant_kind: aggregate_voter_groups_and_individual_candidates`, `party_relation_status: not_a_party_aggregate`.
- Parties with constituency candidates but no Land list: `contestant_kind: party_constituency_candidates_only`
  (first-vote row only).
- No party, alliance or continuity link: `lead_party_id: null`, `continuous_series_eligible: false`,
  `party_relation_status: requires_manual_review`; the verified identity series (2002–2025) is unchanged.

## F. Electorate and turnout (Germany)

| Election | Eligible | Voters | Published turnout | Valid 1st | Invalid 1st | Valid 2nd | Invalid 2nd |
|---|---|---|---|---|---|---|---|
| 1990 | 60,436,560 | 46,995,915 | 77.8 | 46,274,925 | 720,990 | 46,455,772 | 540,143 |
| 1994 | 60,452,009 | 47,737,999 | 79.0 | 46,949,356 | 788,643 | 47,105,174 | 632,825 |
| 1998 | 60,762,751 | 49,947,087 | 82.2 | 49,166,580 | 780,507 | 49,308,512 | 638,575 |

Turnout = voters ÷ eligible (one turnout for both ballots; published value kept, derived value labelled).
valid + invalid = voters on each ballot. Page, final-results file and historical CSV agree on every count.

## G. First and second votes (Germany)

Two ballots per election in `election_turnout` and `election_results` (`vote_type: second_vote | first_vote`):
second-vote rows carry `second_votes`; first-vote rows carry `votes` and `seats: null`. Shares: `published_vote_share`
(one decimal, as published) and `derived_vote_share` (votes ÷ valid votes of the same ballot). Rows of different ballots
are never added together.

Seat-holding parties (second votes, published share, final seats = constituency + list, overhang):

- 1990: CDU 17,055,116 / 36.7 / 268 = 192 + 76 (6 overhang); CSU 3,302,980 / 7.1 / 51 = 43 + 8; SPD 15,545,366 / 33.5 /
  239 = 91 + 148; F.D.P. 5,123,233 / 11.0 / 79 = 1 + 78; PDS 1,129,578 / 2.4 / 17 = 1 + 16; B90/Gr. 559,207 / 1.2 / 8 = 0 + 8.
- 1994: CDU 16,089,960 / 34.2 / 244 = 177 + 67 (12); SPD 17,140,354 / 36.4 / 252 = 103 + 149 (4); F.D.P. 3,258,407 / 6.9 /
  47; CSU 3,427,196 / 7.3 / 50 = 44 + 6; GRÜNE 3,424,315 / 7.3 / 49; PDS 2,066,176 / 4.4 / 30 = 4 + 26.
- 1998: SPD 20,181,269 / 40.9 / 298 = 212 + 86 (13); CDU 14,004,908 / 28.4 / 198 = 74 + 124; CSU 3,324,480 / 6.7 / 47 = 38 + 9;
  GRÜNE 3,301,624 / 6.7 / 47; F.D.P. 3,080,955 / 6.2 / 43; PDS 2,515,454 / 5.1 / 36 = 4 + 32.

## H. Chamber size and overhang seats (Germany)

| | 1990 | 1994 | 1998 |
|---|---|---|---|
| Statutory seats (`statutory_base_seats`) | 656 | 656 | 656 |
| Constituencies | 328 | 328 | 328 |
| Overhang seats | 6 (CDU: MV 2, ST 3, TH 1) | 16 (CDU 12: BW 2, MV 2, ST 2, TH 3, SN 3; SPD 4: HB 1, BB 3) | 13 (SPD: HH 1, MV 2, BB 3, ST 4, TH 3) |
| Final seats | 662 | 672 | 669 |
| Constituency / Land-list seats | 328 / 334 | 328 / 344 | 328 / 341 |

656 is stored as derived (final − overhang, both published) and matches the 1990 treaty act (518 → 656 members).
Hare/Niemeyer over 656 seats among the qualifying parties reproduces every party's seats before overhang exactly
(`electoral_systems[].seat_reproduction`). Overhang seats were not compensated (the 1996 compensation proposal was rejected).

## I. Germany 1990 threshold

- Rule: the Tenth Act amending the Federal Electoral Act (adopted 5 Oct 1990, promulgated 10 Oct 1990, BGBl. I S. 2141),
  following the Federal Constitutional Court judgment of 29 Sep 1990: the threshold applied separately to the two
  electoral areas (territories of the two German states before 3 Oct 1990); list associations limited to parties seated
  in the former GDR. Source: Bundestag Datenhandbuch ch. 1.1.
- Data: `electoral_systems` 1990 has two 5% thresholds (`appliesTo` per electoral area) plus the basic-mandate clause
  (not applied); `threshold_areas` and `election_turnout.electoral_area_valid_second_votes` (west 37,426,103; east
  9,029,669); every 1990 second-vote row has `electoral_area_second_votes` (votes and published % per area).
- Effect, from the data: PDS (2.4% nationally, 11.1% east) and B90/Gr. (1.2%, 6.1% east) took part; GRÜNE (3.8%
  nationally, 4.8% west, 0.1% east) did not. A single national 5% threshold would have admitted only CDU, CSU, SPD, F.D.P.
- 1994 and 1998: one national threshold; the proposal to regionalise it again for 1994 (BT-Drs. 12/5130) was rejected on
  20 Jan 1994. 1994: PDS took part through the basic-mandate clause (4 constituency seats, 4.4%).

## J. Slovenia 1992 and 1996 — not admitted yet (owner files pending)

What the commission's archive pages (www.dvk-rs.si, registered for manual reading; read once each in the browser pane on
2026-11-23) establish, and what they do not:

| | 1992 (6 Dec 1992) | 1996 (10 Nov 1996) |
|---|---|---|
| Entitled voters | 1,491,374 | 1,542,218 (1,541,872 on the roll + 346 with a certificate) |
| Voted | — (not printed) | 1,136,679 (1,136,333 by roll + 346 with certificate; 5,312 by post) |
| Ballots cast | 1,277,604 | 1,136,211 |
| Invalid / valid | — / 1,188,378 | 67,007 / 1,069,204 |
| Published turnout | 85,6 % (= ballots ÷ entitled, 85.666 truncated) | 73,70 % (= voted ÷ entitled, 73.704; ballots ÷ entitled would be 73.674) |
| Lists | 26 rows (incl. one "NEODVISNI KANDIDATI" aggregate); votes add up to 1,188,378 exactly | 22 lists = 1,061,806 + independent candidates in units (NK1–NK3) 7,398 = 1,069,204 exactly |
| Printed shares | all reproduce except LIBERALNA STRANKA (printed 2,01 %, votes give 1,52 %) | as printed |
| Seats (88 + 2) | **only a seating graphic** | **only an image marked "Izračun je opravil SRC in CVI"** (computed by computing centres), not loading |
| National communities | **not on the 1992 pages** | units 9 (Italian) and 10 (Hungarian): electorate, voted, ballots, invalid and ranking points per candidate; the page heading of unit 10 says "italijanske" (as printed) |

Not admitted because the official seat allocation (88 general seats by list) is not available for either year from an
official text, and 1992 lacks the national-community results. Owner answer "I'll save both": the reports in Uradni list
RS (1996: `https://www.uradni-list.si/_pdf/1996/Ur/u1996065.pdf`, named in the brief; 1992: the issue carrying the
1992 National Assembly election report, to be located by the owner) are to be saved under
`local-evidence/slovenia/1996/` and `local-evidence/slovenia/1992/`. www.uradni-list.si stays blocked for the assistant.

Legal framework read on PISRS (registered for manual reading): ZVDZ, SOP 1992-01-2068, adopted 10 Sep 1992, published
12 Sep 1992 (Uradni list RS 44/92), in force 27 Sep 1992; amended before 1996 by 13/93 and 60/95 (20 Oct 1995); the
4% threshold came with UZ80 (2000). The pre-2000 wording of Arts. 90–93 (threshold and national allocation) is not in
the consolidated text and will be taken from the reports, which cite the provisions applied.

When the files arrive: extend `scripts/political-data/slovenia/build-dz.mjs` (YEARS, a pre-2000 rule path in
`reconcile`), add evidence entries `1992` and `1996` (labels as printed; personal names omitted under the existing
label rule; candidate names never stored), admission records `slovenia-dz-1992-1996`, and the institutions period.
Nothing for Slovenia is committed in this iteration.

## K. Historical electoral-system rules added (Germany)

`electoral_systems` rows `es-de-bt-1990`, `es-de-bt-1994`, `es-de-bt-1998`: `allocation_method` Hare/Niemeyer,
`base_seats` 656, `vote_definitions` (second_vote list / whole chamber; first_vote constituency / votes only),
`national_rules` (allocation, constituencies, thresholds, total-seat definition), `seat_reproduction`, `legal_basis`
(law titles, BT-Drs., adopted, promulgated, `in_force: null`, BGBl), `rejected_rule_proposals` (1994, 1998),
`threshold_areas` (1990). Notes in English and Chinese.

## L. Institutional periods

`src/lib/institutions/countries/germany.json` gains five dated changes (source `de-bundestag-dhb-1-1`): the 1990 treaty
act (adopted 1990-08-23, promulgated 1990-08-29), the Tenth Act (1990-10-05 / 1990-10-10; `applies_only_to` the 1990
election — a transitional rule that opens no period and is in force at no other election; new builder field), the
Eleventh (1993-04-29 / 1993-07-27), Thirteenth (1996-10-11 / 1996-11-18) and Fourteenth Acts (1998-03-05 / 1998-04-23).
Entry-into-force dates are not printed by the source and are not asserted (`effective: null`, `effective_note`).

| Election | Period | Changes in force |
|---|---|---|
| 1990 | `germany-period-1990-08-29` | Basic Law, treaty act, Tenth Act |
| 1994 | `germany-period-1993-07-27` | Basic Law, treaty act, Eleventh Act |
| 1998 | `germany-period-1998-04-23` | Basic Law, treaty act, Eleventh, Thirteenth, Fourteenth Acts |
| 2002–2021 | `germany-period-1998-04-23` (was 1949-05-23) | as 1998 |
| 2025 | `germany-period-2024-07-30` (unchanged) | as before plus the 1990–1998 acts |

The 2002–2021 links move to the period opened by the last dated electoral-law change before them. The treaty act
carries a note: its 656-seat count was replaced from 2002 (1996 act) and in 2025 (2023 reform); the registry records no
repeal of the act itself. Election links: 65 → 68.

## M. Scripts and exports

- `node scripts/political-data/germany/early-evidence.mjs [--write]` — re-parse the archived pages (local) into the evidence.
- `node scripts/political-data/germany/early-elections.mjs` — build and validate the 1990–1998 rows; `node scripts/political-data/germany/write-early-candidate.mjs`
  writes the canonical stores and exports (2002–2025 from production.mjs + 1990–1998).
- `node scripts/political-data/germany/validate.mjs` / `export-cli.mjs --check` (`pnpm political-data:validate`) — the
  base slice must equal production.mjs exactly; the early rows validate on their own rules; the whole equals the build.
- Exports: `public/research-data/political/germany/*` (12 stores × JSON/CSV, README, manifest with `years`
  1990–2025). CSV columns of 2002–2025 keep their order; new columns are appended (empty cells on 2002–2025 lines).
- Owner record: `docs/legal-security/germany_extension_records.json` (38 files at exact hashes; gate record
  `docs/political-data/germany_bt1990_1998_admission.json`). `frozen-boundary.mjs` and the source-closure checkpoint
  accept Germany file changes only at these hashes (`approvedGermanyExtensionFiles`).

## N. Validation

- `pnpm political-data:validate` pass (10 elections; base 209 contestants unchanged); `political-data:test` 7/7.
- `tests/tooling/political-germany-early.test.mjs` (9): byte-identical 2002–2025 JSON rows vs `3a63ccc`; CSV lines keep
  their text; counts and turnout; ballots separate; Hare/Niemeyer; 1990 areas; contestant separation; fail-closed
  extension; Explorer views; no person data or chapter text.
- Updated tests: German counts 7 → 10 (views), D1/D2/D3 reference sets exclude 1990–1998 and keep exact results, D4 at
  17, institutions links 68 and 1990–1998 period assertions, identity series limited to the 2002–2025 record.
- Full local CI mirror (40 steps): ALL_OK — tooling 568 pass / 0 fail / 4 skipped; UI 918 pass / 2 skipped; build, i18n, SEO, UI regression, legal-security, checkpoint and research-export checks pass.

## O. Modified files

Data: `src/data/political/germany/*.json` (9 of 12 change; political_parties, party_names, contestant_members unchanged),
`public/research-data/political/germany/*`. Evidence: `docs/political-data/germany_early_elections_evidence.json`,
`germany_early_legal_evidence.json`, `germany_bt1990_1998_admission.json`, `raw/germany/production_{election-1990,
election-1994,election-1998,basic-mandate,constituencies,bundestag-dhb-1-1}/metadata.json`. Governance:
`docs/legal-security/{germany_extension_records,network_acquisition_registry,ui_governance_amendments}.json`,
`docs/political-data/source-closure/{political-admission-amendments,ui-amendments,validate}.mjs`. Scripts:
`scripts/political-data/germany/{early-evidence,early-elections,validate,export,export-cli,frozen-boundary}.mjs`,
`scripts/political-data-audit/validate.mjs`, `scripts/institutions/build-institutions.mjs`. Presentation (UI amendment
`germany-1990-1998-admission-2026-11-23`): `src/lib/institutions/{countries/germany.json,election_links.json}`,
`src/lib/{politicalAdmission,politicalData,comparativeElectionResearch}.ts`,
`src/components/{PoliticalExplorerAlpha,PoliticalPartyHistory,PoliticalEconomicContext}.tsx`. Tests: listed in §N.

## P. Commits

Branch `data/de-si-early-2026-11-23` (local, not pushed): `6e83299` (Germany 1990–1998 extension), `4a01125`
(store typing, UI amendment), `fcb87ae` (research samples and party-history scope), plus this report and CHANGELOG.

## Q. GitHub Actions and deployment

- Push 1 (owner 推送上线): `7bc1c8f` → deploy run 45180210575 failed at Release QA: `publication-validation.mjs` built
  the expected Germany exports from the 2002–2025 slice only. Fixed in `7d33fcf` (canonical 1990–2025 build).
- Push 2 (owner 推送上线): `7d33fcf` → deploy run 45189280356 failed at the research-data guard test: a module imported
  by `release:validate` contained the store writer. CodeQL also opened #21–#23 on the archived-page parser.
  Fixed in `85cc8b8` (writer moved to `write-early-candidate.mjs`; single-pass entity decoding, stable tag stripping).
- Production stayed on `3a63ccc` throughout. `85cc8b8` passes the deploy workflow's steps locally (export, research
  package, lint, typecheck, tooling 568/0, build, legal-security, Release QA, static secret scan, UI tests) and waits
  for the owner's next 推送上线. After deployment the elections appear at `/politics/germany/?election=el-de-bt-1990-12-02`
  (and `/en/…`), likewise for 1994 and 1998.

## R. Codex handoff — GERMANY AND SLOVENIA EARLY PARLIAMENTARY ELECTION FRONTEND INTEGRATION

1. **Election IDs**: `el-de-bt-1990-12-02`, `el-de-bt-1994-10-16`, `el-de-bt-1998-09-27` (Slovenia: none admitted yet).
2. **Country / chamber**: `germany`, store chamber `Bundestag`, registry chamber `de-bundestag`; legislatures
   `lg-de-bt-12`, `lg-de-bt-13`, `lg-de-bt-14`.
3. **Dates**: 1990-12-02, 1994-10-16, 1998-09-27 (single polling day each).
4. **Paths**: stores `src/data/political/germany/`; exports `public/research-data/political/germany/`; builder
   `scripts/political-data/germany/early-elections.mjs`; evidence `docs/political-data/germany_early_*.json`.
5. **Ballot identifiers**: `vote_type` `second_vote` (primary; whole-chamber seats) and `first_vote` (constituency
   ballot, `seatScope: "unavailable"`, `seats: null`). Turnout rows per ballot; `valid_second_votes` /
   `valid_votes`. Never add the two ballots.
6. **Shares**: `published_vote_share` (one decimal, publisher) and `derived_vote_share` (votes ÷ valid votes of the
   same ballot). 1990 area shares in `electoral_area_second_votes.{west,east}.published_percent`.
7. **Chamber sizes**: `legislatures.total_seats` 662/672/669; `statutory_base_seats` 656 (derived, labelled);
   `constituency_mandates` 328; `list_mandates` 334/344/341; `overhang_seats` 6/16/13; `overhang_by_land`.
8. **Overhang / allocation**: per result row `constituency_mandates`, `list_mandates`, `overhang_seats`,
   `seats_before_overhang_derived`; per system `seat_reproduction` (Hare/Niemeyer 656, qualifying contestants,
   overhang by party). Seat-holding parties only; zero-seat rows keep `seats: null` as in 2002–2025.
9. **1990 thresholds**: `electoral_systems[es-de-bt-1990].national_rules.thresholds` has two 5% entries with
   `appliesTo` naming the electoral area, plus the basic-mandate clause (`percent: null`); `threshold_areas`;
   `election_turnout.electoral_area_valid_second_votes`; legal basis entry `BGBl. I S. 2141`.
10. **Slovenia minority metadata**: pending (§J); reuse the existing `si_national_community_candidate_points` vote type.
11. **System IDs**: `es-de-bt-1990`, `es-de-bt-1994`, `es-de-bt-1998`.
12. **Institutional links**: `src/lib/institutions/election_links.json` (periods in §L); change records in
    `countries/germany.json`; the Tenth Act has `applies_only_to`.
13. **Exports**: as §M; the research ZIP picks them up through the existing pipeline.
14. **Missing / restricted**: no entry-into-force dates; no constituency-level results stored; no party identity
    across elections for 1990–1998 (the 2002–2025 authority series is unchanged and not extended); Datenhandbuch text
    and archived HTML are not redistributed.
15. **Components to reuse**: `PoliticalExplorerAlpha` (election selector, results disclosure, turnout chart,
    two-election comparison), `ElectionBallotLabelComparison`, `ElectionHistoryFigures`, the institutional history
    panel, `PoliticalPartyHistory` (German panel now scoped to the series record), Notebook collect.
16. **Adaptation requirements**:
    - Show the first-vote ballot of 1990–1998 as its own ballot (the view already exposes `national.ballots`); label it
      "first votes (constituency candidates)" and never sum it with second votes.
    - Seat-composition and votes–seats charts for 1990–1998: use second-vote seats; show `overhang_seats` and the
      656 statutory size in the chart caption; 662/672/669 are final sizes.
    - 1990: show the two area thresholds and the area shares (west/east) next to the national share; do not render a
      single national 5% line for 1990.
    - Two-election comparison 1998 → 2002: chamber size and allocation method differ (656 Hare/Niemeyer → 598
      Hare/Niemeyer) and the constituency count changes (328 → 299); keep the existing rule-difference notes.
    - The aggregate contestant `aggregate_voter_groups_and_individual_candidates` must not appear as a party in
      charts or comparisons; `party_constituency_candidates_only` rows have no second votes.
    - Research panels: `researchSampleElections` keeps 1990–1998 out of the election–macro table and comparative
      questions; keep that boundary.
17. **Acceptance tests**: 10 German elections in the selector and turnout chart; 1990 page shows two ballots, 662
    seats, 6 overhang, the area thresholds; 1994 shows the basic-mandate note for PDS; 1998 → 2002 comparison shows
    the 656 → 598 change; results CSV has 384 rows; German party-history panel still lists 7 elections; election–macro
    table still 31 rows; no "no list" rows for 1990–1998; mobile width without horizontal scroll.

## S. Remaining gaps and inherited backlog

- Slovenia 1992 and 1996: owner-saved gazette reports (§J).
- Germany 1990–1998: no entry-into-force dates; no identity review across elections; constituency-level data not stored.
- Inherited (unchanged): Poland 2007, 2005, 2001, 1990s; Czechia 1998, 1996; Slovakia 2020, 2016, 2012, 2010 and older
  (owner manual staging; the 2020 and 2016 national summaries are still needed; list files already staged are not
  requested again); Hungary 1994 and 1990 (pages and pre-1997 threshold wording); Austria 1999, 1995, 1994, 1990;
  Romania 2008, 2004, 2000 and older; Serbia 2016, 2014, 2012, 2008 and earlier; historical economic and regional
  gaps; energy, FDI and EU funding research; event-indicator evidence gaps; remaining bilingual inconsistencies.

## U. Recommended next batch

Slovenia 1992 and 1996 as soon as the two reports are saved (the build path is ready to extend); then Czechia 1998 and
1996 or Poland 2007–2001, whichever has owner-cleared sources first.
