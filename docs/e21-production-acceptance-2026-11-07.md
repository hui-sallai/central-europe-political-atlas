# E2.1 production acceptance — 2026-11-07

## Actual release

Remote main, local HEAD and live deployment provenance agree on `52173b89115697c20d4ffd0c9aed263b006bbe6d`.
Pages #358 / run 42270097629 succeeded; #357 / bafdc71 is no longer the latest deployment.
Production was checked independently of Git HEAD through the deployment manifest and real browser flows.

## Browser and export evidence

Both English event URLs with `section=case` were tested using existing Playwright infrastructure on desktop-1440 and mobile-390.
The correct event opens and receives focus; the entire displayed implementation chronology matches the registered claims, notes, dates, documentary status and monetary scope.

- Czechia: 20 implementation records, including all four E2.1 additions.
- Hungary: 16 implementation records, including all four E2.1 additions.
- Each entry exports both case records. The Czech entry includes its eligible monthly window; the Hungarian entry includes no monthly window. No equivalent monthly coverage is implied.
- Actual CSV and JSON downloads from both entries preserve all 36 implementation records, source URLs, dates, identifiers, PDF hash strings, quantities, currencies and scopes. Unavailable evidence retains null URLs and empty amounts/quantities.
- Repeated downloads and independent SHA-256 calculation over `JSON.stringify(evidence)` agree, including across the two viewports.
- PDF hash preservation was compared against the existing evidence register; the remote original PDFs were not newly downloaded or independently rehashed during this acceptance.

| Entry | Evidence SHA-256 | JSON file SHA-256 | CSV file SHA-256 |
|---|---|---|---|
| Czechia | 6d96f417767001434df2f3645203df1ee20f1482d4418ce8cc323b784dcf3f57 | 93042a16ab0811ffee0eff9d1fe25923dd8b4f5e04ac8e2cb17cdd4c3445dc3a | 5d90d54e6374ca6412bcaf7013aeb0a1cc36e97cf9c36cb4c4410d87a6fd1767 |
| Hungary | de202d67e499b5268fe005644b263938397ab9d8bd6760255f8f2ce0062b489d | 1cc644c654fe996fcdd157e54a740c57e0bc7e5858a62d025ca1361e43c500c1 | 8fc595c02871202bb505f84dcfcc60f467d43abffeeadead0d1e3b53406490d5 |

## What the cases establish

**CATL:** the 2025 environmental permit amendment documents 40.7 GWh/year cell capacity and 18.9 GWh/year module/pack assembly capacity. These are permitted capacities, not actual production or realised FDI. Its finality is not established by the document. The government-office publication documents first-phase occupancy approval on 25 August 2026, second-phase refusal on 19 August, and workplace restrictions in three production areas. The restrictions' date and subsequent lifting remain unknown. The November 2025 industrial-safety position is dated evidence, not a claim that it remains unchanged today. Later industrial-safety authorisation, the operative court judgment/finality, actual investment flows, independently measured production and employment remain unresolved.

**Czech REPowerEU:** the seventh payment request has a positive preliminary assessment, not a final payment decision or disbursement. The preliminary assessment supports Target 299 (29 projects; 2,133.9 MW additional distribution-grid connection capacity), Milestone 311 (Electricity Data Centre functionality) and Target 346 (61 designated acceleration areas). Connection capacity is not electricity generated; designation is not completed generation infrastructure. Whole-plan payments are not attributed in full to the REPowerEU chapter. Further payment decisions, actual recipient-level disbursements, project-level operating data, generation/connection-time measurements and appropriate attribution evidence would be needed to assess outcomes.

Documentary status, stage, company statements and actual payments remain separate. Neither case has an independently established overall economic effect; national descriptive indicators cannot isolate the projects. No political forecast or causal effect is generated.

## Validation and disposition

One consolidated relevant suite: **16 tooling tests + 4 real-production browser tests passed**. Tests cover documentary admissibility, chronology, preliminary-vs-final status, units and monetary scope, unavailability, model reuse, export references and both viewport flows.

No substantive production defect was found; no application, research data or model code changed. Added only `playwright.e21-acceptance.config.ts`, `tests/ui/e21-production-acceptance.spec.ts` and this acceptance record. No commit, push or deployment was performed in this acceptance task.

Disposition: E2.1 implementation-history integration is production-ready on #358, subject to the explicitly documented research limitations above. This is scoped acceptance, not a complete platform security or research audit.
