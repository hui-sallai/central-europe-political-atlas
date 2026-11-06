# E2 — implementation evidence for the E1 cases (2026-11-06)

## Task 0 — production provenance smoke test

Production at `36f2ddc` (GitHub Pages #356, as named in the deployment manifest) was checked on both E1 pages, on desktop-1440 and mobile-390, using `playwright.production-acceptance.config.ts --grep "production E1"`. All 4 tests passed.
The downloaded Czech evidence digest is `c441befa58af…`, the corrected digest recorded in the D4/E1 acceptance note. Each annual observation's source in the source index now matches the canonical observation's own URL. For example, Czech energy import dependency for 2021 points to the `sinceTimePeriod=2021` query and 2024 to the `2024` query; the same holds for the Hungarian 2021 and latest-year rows of all three indicators. No regression was found, so the full D4/E1 suite was not repeated.

## What E2 adds

The data lives in `src/lib/eventImplementationEvidence.ts` (method `atlas-implementation-evidence-v1`). It is joined into the existing E1 records, which bumps the E1 method to `atlas-event-mechanism-research-v2`. The results appear in E1 section 10 and its JSON/CSV export.

Each record states one claim from one document, with:
- the stage: announcement, approval, implementation or realised outcome;
- the documentary status: verified, announced, disputed or unavailable;
- the scope: event-specific, whole plan, or zone infrastructure;
- the institution, the document reference and URL, the publication date and the event date with its precision;
- the retrieval date, plus a SHA-256 for PDFs;
- amounts with currency, kind and precision, and quantities with their units.

Status rules:
- **Verified** requires an official document.
- **Announced** is used for a company statement, which is never verified.
- **Unavailable** marks a claim that was looked for but not found; it carries no document, amount or quantity.

The stage status describes the evidence. It is not a performance score.

## Primary documents read (retrieved 2026-11-06)

| Case | Document | SHA-256 (PDF) |
|---|---|---|
| CZ | Commission Daily News MEX/23/3628, IP/23/4642, MEX/23/6801, MEX/25/2230, MEX/26/669, MEX/26/1731 (read in the browser pane) | — |
| CZ | Council document ST 13383/23 ADD 1 REV 1 (annex: REPowerEU chapter = components 7.1–7.7; milestone 304 in 7.1) | `9dd8362d…` |
| CZ | C(2024) 9258, C(2024) 9246, C(2025) 6441, C(2025) 8030, C(2025) 8031, C(2026) 1717, C(2026) 5650 | `81e59e37…`, `b891dce7…`, `e25e081c…`, `50760867…`, `b1415003…`, `71acd4ee…`, `fd234262…` |
| HU | Magyar Közlöny 2022/137: Government Decree 323/2022 (VIII. 18.) and Resolution 1415/2022 (VIII. 18.) | `f6a6c312…` |
| HU | Hajdú-Bihar County Government Office decision HB/17-IKV/01008-46/2023 (cites permit HB/17-IKV/00002-220/2023) | `d344278f…` |
| HU | CATL announcement (2022, catl.com) and CATL release of 22 September 2026 (Kyodo PR Wire distribution) | — |

Raw files are kept only in session scratch space and are not committed. The press-corner pages were read by hand in the visible browser pane; no data endpoint was used.

## Findings

**Czechia, REPowerEU:**
- **Announcement:** verified. The Commission recorded the 30 June 2023 submission.
- **Approval:** verified. The Commission assessment of 26 September 2023 (€681 m REPowerEU grants plus €55 m from the Brexit Adjustment Reserve) and the plan update of 17 October 2023.
- **Implementation:** verified.
  - €147.09 m REPowerEU pre-financing paid on 21 December 2023.
  - The REPowerEU grid-connection milestone 304 was found unmet on 18 December 2024, with €97 629 788 suspended. It was found met on 21 November 2025, and the suspension was lifted.
  - Whole-plan payments were made on 26 September 2025, 20 March 2026 and 11 August 2026; these are plan-wide and the REPowerEU share is not separated.
- **Realised outcome:** unavailable.

**Hungary, CATL:**
- **Announcement:** a company statement only.
- **Approval:** verified.
  - The 2022 gazette decree and resolution cover the Debrecen site and the zone's grid works (HUF 87 718 849 000 budgeted). They do not name the investor.
  - The county environmental permit was issued to Contemporary Amperex Technology Hungary Kft. for 40 GWh a year, against 100 GWh announced.
  - Press-reported litigation is recorded as disputed.
- **Implementation and realised outcome:** company statements only (occupancy permit, 537 000 modules, cell trial production from 22 September 2026). Capital actually invested, public support, employment and series production are unavailable.

**Links to observations:**
- **Czech energy import dependency:** a national total with no published year after the reform milestone (latest 2024; anchor 2025); context only.
- **Hungarian FDI:** not separable.
- **Hungarian manufacturing share:** the classification is compatible (TEÁOR'08 2720 falls within NACE C), but there is no output value; context only.
- **Hungarian automotive export share (NACE C29):** not comparable, because the permit classifies the activity in C27.

No effect is estimated.

## Validation

- **New test file:** `tests/tooling/event-implementation-evidence.test.mjs`. It checks each rule against deliberately broken records, plus chronology, documentary status, source identity, monetary units, observation links and vintages, and export reproducibility.
- **Updated tests:** E1 and case-study tests (Hungary now documents approval; 16 comparison dimensions). A new browser test covers the E2 stages, the chronology and the CSV export.
- **Frozen inputs:** event registries and the window engine are only read.
