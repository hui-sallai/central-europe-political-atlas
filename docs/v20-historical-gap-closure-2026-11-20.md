# Historical election data gap closure — 2026-11-20

Owner brief "historical election data gap closure: Slovakia, Czechia and pre-2014 Hungary" (2026-11-20). Owner answers:

- Slovakia: "You download by hand".
- Czechia: "One-time retrieval exception".
- Hungary 2010: "National figures per tier".

## A. Starting commit

`332cb076743abce60ce6abe36ab44d412fd53544` (deployment run 44758857153).

## B. New elections admitted

| Country | Election id | Rounds | Chamber | Seats |
|---|---|---|---|---|
| Hungary | `el-hu-ogy-2010-04-11` | 2010-04-11, 2010-04-25 | Országgyűlés (`hu-orszaggyules`) | 386 = 176 single-member + 146 territorial-list + 64 national compensation |

Slovakia and Czechia: none, because their source files are not yet obtainable under the owner's rules (section P).

## C. Coverage before and after

| Country | Before | After |
|---|---|---|
| Hungary | 2014, 2018, 2022, 2026 | **2010**, 2014, 2018, 2022, 2026 |
| Slovakia | 2023 | 2023 |
| Czechia | 2017, 2021, 2025 | 2017, 2021, 2025 |

There are 58 chamber-election records (57 before).

## D. Contestant counts (2010)

- 10 territorial-list organisations: 9 single-party lists and the FIDESZ-KDNP joint list. They include all 6 zero-seat lists (MDF, CM, MUNKÁSPÁRT, MSZDP, ÖP, MIÉP).
- 20 single-member nominating groups, including joint nominations (FIDESZ-KDNP-MVMP, MDF-SZDSZ, MDF-ÖSSZEFOGÁS) and independents aggregated without names. They appear as national sums per round: 20 in round 1 and 6 in round 2.
- One group label contains a person's name. It is stored as "…-KISGAZDA", with a checksum of the printed label.
- The national list printed as "CIVILEK" on the compensation page is recorded unmatched, with 0 votes and 0 seats.

## E. Reconciliation (`reconcile2010`, fail-closed)

- **Turnout:**
  - Round 1: registers 7,976,496 + 49,091 + 8,807 = 8,034,394, and participation 5,165,461 + 6,761 = 5,172,222. This reproduces the printed 64.38%.
  - Round 2: 2,486,111 registered and 1,160,117 took part, reproducing 46.66%. Round 2 was held in exactly the 57 constituencies left undecided in round 1.
- **Territorial lists:**
  - The list votes add up to the printed 5,132,531.
  - Both printed thresholds reproduce: the 5% threshold (256,626) must be exceeded, and the 10% threshold (513,254) must be reached by a two-party joint list.
  - The seat-holding lists are exactly the lists past the threshold. Their seats total 87 + 28 + 26 + 5 = 146.
- **Compensation:**
  - The tier has 58 seats by statute, plus 6 undistributed territorial seats, giving 64.
  - Each list's fragment votes (single-member part plus list part) match its printed total, and the totals add up to 2,753,672.
  - D'Hondt over the fragment votes reproduces 21 / 3 / 29 / 11.
- **Single-member seats:** 119 in round 1 + 57 in round 2 = 176. Per group: FIDESZ-KDNP 172, MSZP 2, FIDESZ-KDNP-MVMP 1, independent 1.
- **Composition:**
  - Each row's tiers add up to its total, and the chamber comes to 176 + 146 + 64 = 386 with no vacancy.
  - Fidesz–KDNP 262, MSZP 59, Jobbik 47, LMP 16, plus the 2 seats outside lists.
- 2014–2026 rows are unchanged.

## F. Electoral system added

`es-hu-ogy-2010` covers 2010-04-11 to 2010-04-25. It is the office's 2010 description of the seat allocation (mandleir); Act XXXIV of 1989 itself was not read.

- **Rules recorded:**
  - Mixed two-round system.
  - Statutory tiers 176 / up to 152 / at least 58.
  - Thresholds: more than 5% for a party list; at least 10% for a two-party joint list. The 15% rule for larger joint lists is not printed there, so it is not asserted.
  - Unallocated territorial seats transfer to the national tier.
  - D'Hondt for the compensation seats.
- **Ballots:**
  - `hu10_territorial_list_vote` (list, primary).
  - `hu10_smc_round1_vote` and `hu10_smc_round2_vote` (constituency, votes only, seat scope `unavailable`).
- **Institutions link:** chamber `hu-orszaggyules`, 386 seats, thresholds [5, 10], `institutional_period_id` null (the registry's earliest Hungarian period opens on 2012-01-01). `hu-2012-fundamental-law` is listed under later changes.

## G. Party and coalition links

None. FIDESZ-KDNP stays one joint entity: the office splits its votes in half only to test the threshold, and that split is not used. No 2010 contestant is linked to 2014 or later.

## H. Sources

All are on static.valasztas.hu under `/dyn/pv10/outroot/`, read once each by hand on 2026-11-20:

- Indexes and round summaries: `vdin2/hu/eredind.htm`, `vdin1/hu/l100.htm`, `vdin2/hu/l100.htm`.
- Threshold page: `vdin1/hu/l120.htm`.
- National totals per round: `vdin1/hu/l22.htm`, `vdin2/hu/l22.htm`.
- Compensation and composition: `vdin2/hu/l61.htm`, `vdin2/en/l50.htm`.
- Seat-allocation description: `vstat1/mandleir.htm`.

The source ids are `src-hu-nvi-archive-2010` and `src-hu-nvi-mandleir-2010`. The evidence is in `docs/political-data/raw/hungary/ogy/evidence.json` under `act_xxxiv_1989.2010`.

## I. Validation

- `political-hungary-ogy`: 14/14, including a new 2010 test with five tamper cases.
- Tests updated for the new election: institutions (58 links), election–macro linkage, comparative research, D4 (the published case stays pinned to its 17 elections), and the cross-country UI counts (24).
- Source-closure checkpoint and legal-security source validation pass.
- All Politics UI tests pass (100).

## J. Research exports

`public/research-data/political/hungary/*` (JSON, CSV, README, manifest) now hold five elections. The manifest coverage is `whole_chamber_all_seats_attributed_386_in_2010_199_from_2014`. The research ZIP is rebuilt by the deploy.

## K. Files modified

- `scripts/political-data/hungary/build-ogy-national.mjs` (`build2010`, `reconcile2010`).
- `docs/political-data/raw/hungary/ogy/evidence.json`.
- Stores and exports for Hungary.
- `src/lib/politicalStores.ts`: votes-only ballots carry no seats, and `constituency_seats_outside_lists` is counted.
- `src/lib/politicalNational.ts`: `seatTiers.outsideListConstituency`.
- `src/lib/politicalAdmission.ts`.
- `src/lib/institutions/election_links.json`.
- Admission records:
  - `docs/political-data/hungary_ogy2010_admission.json`
  - `docs/legal-security/political_admission_records.json`
  - `docs/political-data/source-closure/political-admission-amendments.mjs`
  - `docs/political-data/stage_c_decision_record.json`
- Registries: `docs/legal-security/network_acquisition_registry.json`, `docs/legal-security/ui_governance_amendments.json`.
- Tests and `CHANGELOG.md`.

## L–N. Final commit, deployment, URLs

These are recorded after the push. Hungary's page is `/en/politics/hungary/` (Chinese `/politics/hungary/`).

## O. Remaining historical gaps

| Country | Missing | State |
|---|---|---|
| Slovakia | 2020, 2016, 2012, 2010, 2006, 2002, 1998, 1994, 1992, 1990 | waiting for owner-saved files (P1) |
| Czechia | 2013, 2010, 2006, 2002; 1998 and 1996 have no open data on volby.gov.cz | blocked on rights evidence (P2) |
| Hungary | 2006, 2002, 1998, 1994, 1990 | not read; same archive family, so each year needs its own reading under the same scope |
| Romania | 2024 polling-day confirmation | waiting for the owner-saved Government decision |
| Austria | institutional periods before the 2008 five-year term | registry gap, later batch |
| Poland, Germany, Serbia, Croatia, Slovenia | earlier elections | backlog |

## P. Exact source blockers

1. **Slovakia.**
   - Reuse rights: volby.statistics.sk is registered as blocked because the Statistical Office's terms forbid robots and similar tools, so the assistant may not open it.
   - Other routes: minv.sk links only the 2023 State Commission minutes.
   - Next action: the owner saves each year's national files (list votes, percentages and seats; registered voters, voters, valid and invalid ballots) into `local-evidence/slovakia/<year>/`. Start with 2020 and 2016, then 2012 and 2010.
2. **Czechia.**
   - Reuse rights: the owner's exception applies only where the national catalogue (NKOD) records no protected rights. NKOD searches on 2026-11-20 found catalogue entries for 2017 onward only, and none for the PS2013, PS2010, PS2006 or PS2002 files.
   - With no entry there is no rights record, so nothing was retrieved.
   - Two ways forward are possible, and the owner must choose:
     - Accept ČSÚ's general terms for using and republishing statistical data, which the volby.gov.cz pages link to, as the basis. The owner would read those terms; csu.gov.cz is not registered.
     - Download the files by hand.
   - The ČSÚ DataStat sets VOLPS201703/202103 carry only national totals for 2002–2013, not list results, so they cannot fill the gap.
3. **Chinese/English Politics index.** Not a localisation defect: the live `/politics/` and `/en/politics/` both carried 57 history links (checked 2026-11-20 against run 44758857153), and this build renders 58 in both. A Chinese snapshot with older navigation was a cached copy; nothing for Codex to fix unless it reappears after this deploy.

## Q. Codex handoff — HISTORICAL ELECTION BACKFILL FRONTEND INTEGRATION

- **Election:**
  - Id `el-hu-ogy-2010-04-11`, country `hungary`.
  - `date` 2010-04-11, `dateEnd` 2010-04-25; `rounds` in `elections.json`.
  - Chamber `Országgyűlés` (`hu-orszaggyules`), `totalSeats` 386.
- **Ballots** (`election.national.ballots`, in order):
  1. `hu10_territorial_list_vote`: list, primary, valid votes 5,132,531.
  2. `hu10_smc_round1_vote`: constituency, votes only, 5,114,570.
  3. `hu10_smc_round2_vote`: constituency, votes only, 1,152,693; only the 57 round-2 constituencies.

  Ballots 2 and 3 have `seats`/`chamberSeats` null. Show them as vote tables, never in seat charts, and never add their votes to the list ballot.
- **Seats:**
  - On each list row: `seats` = territorial + national compensation seats (tier 210); `constituencySeats` = single-member seats of the same organisations; `chamberSeats` = the sum.
  - `seatTiers` = `{nationalList: 210, constituency: 176, outsideListConstituency: [{label: 'FIDESZ-KDNP-MVMP', kind: 'joint_candidates_without_list', seats: 1}, {label: 'Független', kind: 'independent_candidate', seats: 1}]}`.
- **New display tasks:**
  - ParliamentSeats should add one legend entry per `outsideListConstituency` item: the joint candidates' label as printed, and "Independent (not named)". Then the 386 seats are all coloured.
  - Today those two seats render grey.
- **Tier breakdown:** in `src/data/political/hungary/legislatures.json` (`lg-hu-ogy-2010`): `territorial_list_seats` 146, `national_compensation_seats` 64, `statutory_tiers` {176, 152, 58, 386}, `tier_transfer` {6 seats}.
  - Show statutory and final tiers side by side.
  - Per-row `territorial_list_seats`, `national_list_seats` and `compensation_votes` are in `election_results.json`.
- **Turnout:**
  - Round 1 is printed: 64.38% (`publishedTurnout`).
  - Round 2 is in `election_turnout.json` → `round_2` (46.66%, 57 constituencies). Label it round 2 and do not chart it as a national election turnout.
  - A turnout change between 2010 (printed) and 2014 (computed) is withheld by `compatibleTurnout`. Keep that.
- **Seat shares:**
  - Whole chamber: `chamberSeats / 386`.
  - List tiers: `seats / 210` (`activeVote.tierSeats`).
  - Never divide by 199 for 2010.
- **Rules timeline:**
  - 2010 links to rule record `es-hu-ogy-2010` with thresholds [5, 10] and no institutional period, with `hu-2012-fundamental-law` under later changes.
  - 2014+ link to `hungary-period-2012-01-01`.
  - Show the system change, 386 → 199 seats and two rounds → one round, as a rule-version change.
- **Labels:** abbreviations as printed (FIDESZ-KDNP, MSZP, Jobbik, LMP, MDF, CM, …). One label is "…-KISGAZDA"; keep the omission.
- **Exports:** `public/research-data/political/hungary/*.csv|json`, README sections "2010 (Act XXXIV of 1989)" and "2014–2026".
- **Not provided:** per-constituency and per-district results, invalid ballots per ballot type, candidates, and cross-election party links.

## R. Recommended next batch

1. Slovakia 2020 and 2016 as soon as the owner's files are staged. Use the existing `build-nrsr-national.mjs` path with year-specific rules (Act 180/2014 for 2016+; Act 333/2004 for 2006–2012).
2. Czechia 2013 and 2010 once the rights basis is decided. Use the existing `build-ps-national.mjs` path: votes from the data files, seats counted from the register's mandate flag without names, and constituency results kept at their 14 regions.
3. Hungary 2006 and 2002 from the same archive family under the same scope.
