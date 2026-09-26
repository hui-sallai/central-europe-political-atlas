# Baseline definition integrity and final historical-extension review

Research audit, 2026-09-27. Starting main and latest deployed SHA: `9b163c03de75a9a9d0f9e53f8d0b9d4bbd8775d0`. Formal release remains **v1.82**. Research simulations, Panel LP estimates, LOCO/time-FE reruns and bootstrap runs: **zero**. Frozen `panel_lp_results.json` SHA-256 remains `10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc`.

## Phase A — formal 2015–2025 baseline

| Cell | Finding | Current-baseline decision | Formal action |
|---|---|---|---|
| Poland IPI | Eurostat documents LEU through 2020, KAU from 2021 and possible *insignificant* breaks in some aggregates. Statistics Poland explains that LEU and KAU allocate production differently. No official matched B-D/SCA LEU–KAU pair or pre-2021 KAU bridge was verified; numerical smoothness was not used as proof. | **Non-blocking methodological warning**, not strict unit-invariance clearance. `high_frequency_coverage` now records `known_methodological_transition_nonblocking`; `analysis_eligible` is retained with this explicit limitation. | Metadata warning only; no splice, sample deletion or re-estimation. |
| Hungary unemployment | Eurostat's monthly-method annex places state-space estimation from 2023 and revisions of 2011–2022. Thus all 2015–2022 months in the current revised baseline lie within the documented back-revised span; 2023+ follows the current construction. | Current **latest-revised** baseline cleared; no claim about first-publication vintages or 2009–2010. | Record the back-revised transition in coverage metadata; no result change. |
| Slovenia yield | Current Eurostat `irt_lt_mcby_m` values from 2025 carry `e` estimated flags. These are quality flags, not `b` definition breaks. | Non-blocking quality warning; retain flags in audit and do not equate current revised with frozen vintage. | Metadata warning only. |

Overall Phase A: **non-blocking warning**, not a release-blocking finding. The exact Poland B-D impact is unknown, so this does not claim that the 2021 unit transition is zero. Frozen LOCO diagnostics for omitting Poland from IPI are MP maximum shift 1.304878 (0 sign reversals, 3 pointwise classification changes) and CBI 2.244315 (2 reversals, 3 changes). These describe composition sensitivity only; they cannot diagnose the 2021 unit change.

Official sources: [Poland IPI metadata](https://ec.europa.eu/eurostat/cache/metadata/EN/sts_ind_prod_esms_pl.htm), [Statistics Poland KAU method report](https://stat.gov.pl/files/gfx/portalinformacyjny/en/defaultaktualnosci/3317/31/1/1/short-term_statistics_by_european_concept_of_the_kind_of_activity_unit.pdf), [Eurostat monthly-unemployment methods](https://ec.europa.eu/eurostat/cache/metadata/Annexes/une_rt_m_esms_an_Sources_and_methods_for_MUR.pdf), and the exact-series Eurostat API archived by checksum in the source manifest. `baseline_definition_integrity_audit.json` records source checksums, dates and the unperformed LEU–KAU overlap metrics as `null`, not invented estimates.

## Phase B — final pre-2015 extension decision

`current_baseline_compatible` and `earliest_pre2015_compatible` are now separate fields in each country-outcome audit. Earlier Round 3 adverse records remain intact; `historical_definition_resolution_round4.json` records the final superseding decisions.

| Outcome | Final country decisions | All-eight pre-2015 floor |
|---|---|---|
| HICP | All eight cleared, unchanged | **1996-12** |
| IPI | AT 2000-01, DE 1991-01, SK 2008-01, SI 2000-01, CZ 2000-01, HU 2000-01; **PL blocked** (no pre-2021 KAU B-D/SCA bridge), **RO blocked** (no exact official historical floor) | **blocked / null** |
| Unemployment | CZ 1993-01, AT 2004-01, DE/SI 2009-01; **HU 2011-01** (Eurostat 2011–2022 revised span), **RO 2009-01** (Eurostat IESS correction note); **SK blocked** (2011-09 `d` unexplained), **PL blocked** (2009-12 `d` unexplained) | **blocked / null** |
| Maastricht yield | All eight cleared; SI 2003-11 and RO 2006-01 after documented primary-market periods | **2006-01** |

Romania's unemployment clearance preserves the discrepancy that Eurostat's correction document names a 2009-01 IESS boundary while the exact API series lacks a corresponding `b`; the earlier 2003-12 `d` remains outside the cleared span. Hungary 2009–2010 is not cleared merely because 2011+ is. A single `d` in Slovakia or Poland does not justify guessing the next month as a clean floor.

The fixed euro-regime floor is **2009-01**. Because IPI and unemployment lack eight-country compatible floors, four-outcome **Design A is blocked**, with start `null`. Therefore definition-cleared calendar gain, h=24 cluster gain, MP/CBI nonzero-month gain and shock-concentration changes versus the 2015 baseline are **not computable**. Earlier mathematical-only preflights remain labelled hypothetical; they are not promoted to an estimable sample. The audit is completed and the current fixed-eight-country four-outcome extension program is closed and blocked.

Owner choices for a future task: **A** retain the current four-outcome 2015 baseline; **B** separately approve and preregister a reduced-outcome historical study; **C** seek a new official harmonised source or bridge. This round does not perform B or C, drop an outcome, alter thresholds, or change the formal model. Commit, push and deployment require separate owner approval after local validation.
