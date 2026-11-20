# Slovakia and Czechia historical expansion, Hungary 2010 institutional period — 2026-11-21

Owner brief: "Slovakia and Czechia historical election expansion and historical institutional data completion" (2026-11-21).
Starting commit: `efca2765d2e7ae28e0432f179d253abc977a3ea0` (deploy run 44815221876).

## 1. Outcome

| Item | Result |
|---|---|
| Hungary 2010 dated institutional period (§7) | **Done.** Linked to `hungary-period-1989-10-30`; Hungary is now 5/5 |
| Slovakia 2020, 2016, 2012, 2010 and earlier (§3) | **Not admitted.** No usable source under the current owner rules (section 3) |
| Czechia 2013, 2010, 2006, 2002 (§4) | **Not admitted.** The rights basis for the files is still open (section 4) |

No election was added. The published count stays at 58 chamber elections, and the results, seats and turnout of every admitted election are unchanged.

## 2. Hungary 2010 institutional period

Sources, each read once by hand on njt.jog.gov.hu (registered host, statutes only):

| Source id | Act | Read |
|---|---|---|
| `hu-act-xxxi-1989` | 1989. évi XXXI. törvény az Alkotmány módosításáról | Adopted 1989-10-18; promulgated 1989-10-23; repealed from 2012-01-01 (Fundamental Law transitional provisions, Art. 31(3)(c)). No entry-into-force clause was found on the page |
| `hu-act-xxxiv-1989` | 1989. évi XXXIV. törvény az országgyűlési képviselők választásáról | Adopted 1989-10-20; promulgated 1989-10-30; § 56(1) "E törvény a kihirdetése napján lép hatályba"; § 4: 386 seats (176 single-member, 152 territorial, 58 compensation); § 8(5) thresholds; repealed by Act CCIII of 2011 § 26(a) from 2012-01-01 |

Registry changes (`src/lib/institutions/countries/hungary.json`):
- Change `hu-1989-electoral-act`: effective 1989-10-30. Status `verified`. It opens `hungary-period-1989-10-30`, which runs to 2012-01-01.
- Change `hu-1989-constitution-amendment`: status `partially_verified`.
  - Its effective date is null, with a note. The page shows no entry-into-force clause.
  - The period it opens, `hungary-period-1989-10-23`, starts on the promulgation date. That date is not asserted to be the effective date.
- `previous_constitutions`: `hu-constitution-1949-as-amended-1989`, in force until 2012-01-01. The 1949 Act itself was not read.
- Both 1989 changes carry `repealed_effective: 2012-01-01`.

Builder changes (`scripts/institutions/build-institutions.mjs`):
- `constitution_id` is now the constitution in force on polling day.
  - Hungary 2010 resolves to `hu-constitution-1949-as-amended-1989`.
  - Every other election is unchanged.
- `changes_in_force` drops changes repealed before polling day.
- A new `repealed_before` field lists the dropped changes.
- The validator checks the new fields.

Not changed: the 2010 rule record in the Hungary store still says the statute was not read. That record and the admission hashes are untouched. The institutions registry now records the statute.

## 3. Slovakia: source finding

- **volby.statistics.sk:** no automated collection, by the owner rule. The ŠÚ SR terms also prohibit robots, and their CC BY 4.0 grant names www.statistics.sk.
  - The owner's 2026-11-20 answer was "You download by hand". No files are in `local-evidence/slovakia/` yet.
- **State Commission minutes (www.minv.sk):** the file `NR20_ZapisnicaStK.pdf` that search finds for "2020" is the 2023 minutes, already admitted. Its file name is misleading, as `evidence.json` records.
  - Searches found no minutes for 2016, 2012 or 2010 on minv.sk. The commission archive is described as starting in 2023.
- **Collection of Laws (static.slov-lex.sk):** searches found no published results announcement for any National Council election, only the election calls and the electoral acts.

**Owner action needed for Slovakia:**
1. Save the national result files for 2020 and 2016 from volby.statistics.sk into `local-evidence/slovakia/<year>/`, then 2012 and 2010.
2. Decide the reuse basis for national figures from those files. Options:
   - Copyright Act § 5(a), as used for 2023. National totals are information, and the extract is an insubstantial part of the database (§ 138(3)).
   - Or the ŠÚ SR CC BY 4.0 grant, if you read it as covering the election subdomain.

Once the files are saved, the existing `build-nrsr-national.mjs` path takes each year:
- the full list of electoral lists, with votes and published shares;
- seats reconciled to 150;
- turnout as published.

The 2016 and 2020 elections fall under Act 180/2014. Its dated versions are on static.slov-lex.sk, which is allowed.

## 4. Czechia: source finding

- **volby.gov.cz:** registered as `evidence_only_pending_publisher`; automated collection is not allowed.
- **Owner exception of 2026-11-20:** covers only files whose national catalogue (NKOD) entry records no protected rights.
  - NKOD has entries from PS2017 onward only. None exist for PS2013, PS2010, PS2006 or PS2002, so the exception covers no file and nothing was retrieved.
- 1998 and 1996 have no open data on volby.gov.cz.

**Owner action needed for Czechia (choose one):**
1. Accept ČSÚ's general terms for reusing statistical data, which the volby.gov.cz pages link to, as the basis. csu.gov.cz would be registered for reading those terms by hand.
2. Or download the PS2013 and PS2010 CSV ZIPs yourself (`PS<year>_data_csv`, `_reg_`, `_cisel_`) into `local-evidence/czechia/<year>/`.

Either way, the existing `build-ps-national.mjs` path then takes:
- votes from the data files;
- seats from the register's mandate flag, without names;
- the 14 regions as they are.

The rule records for 2010 and 2013 will be taken from Act 247/1995 in the version in force on each polling day, not from the 2021 amendment.

## 5. Other inherited gaps (not worked on)

- **Austria, 4 of 7 elections without a dated period:** 2002, 2006 and 2008 come before the earliest recorded Austrian change. This needs the dated Nationalrat-Wahlordnung 1992 amendments from RIS.
- **Romania:** the 2024 polling-day source still needs the owner-staged Government decision. Earlier seat-allocation notes stay as recorded.
- **Hungary:** the 2006 to 1990 elections are not admitted. The same 1989 period would now cover 1990 to 2006.

## 6. Checks

- `tests/tooling/institutions-registry.test.mjs` (9 tests) passes. It now asserts:
  - the Hungary 2010 period, the constitution in force, the change lists, and the 1989–2012 period;
  - for every Hungarian election from 2014, the Fundamental Law and no 1989 act in force.
- The full CI mirror is run before any push.

## 7. Codex handoff — SLOVAKIA AND CZECHIA HISTORICAL ELECTION FRONTEND INTEGRATION

No new Slovak or Czech election exists yet, so there is nothing new to integrate for those countries. When they are admitted, the election IDs will follow `el-sk-nrsr-<date>` and `el-cz-ps-<date>`, and they will appear through the existing Politics directory without page changes.

What changed now, for Codex:
1. `src/lib/institutions/election_links.json` changes:
   - `el-hu-ogy-2010-04-11` now has:
     - `institutional_period_id: "hungary-period-1989-10-30"`;
     - `constitution_id: "hu-constitution-1949-as-amended-1989"`;
     - `changes_in_force: ["hu-1989-constitution-amendment", "hu-1989-electoral-act"]`.
   - Elections from 2014 carry `repealed_before` with both 1989 ids.
   - The Politics index line "Linked to a dated institutional period" now reads 5/5 for Hungary.
2. `InstitutionalCountry.previous_constitutions` is a new optional field. `ElectionInstitutionalLink.repealed_before` and `InstitutionalChange.repealed_effective` are also new and optional.
   - Showing them, for example "Repealed before polling day" next to "Changes in force" in `PoliticalBallotExplorer.tsx` and `InstitutionalHistory.tsx`, is optional UI work.
3. In `InstitutionalHistory.tsx`, the 2010→2014 comparison picks the constitutional change from `after.changes_in_force`. That still resolves to `hu-2012-fundamental-law`, because the repealed 1989 amendment is filtered out.
   - The 2010 side could now show `hu-1989-constitution-amendment`. Its effective date is null, with `effective_note`.
4. Two Hungarian changes, dated 1989, now open the institutional timeline. Check that the Hungary timeline renders them and their Chinese text.
