# D4 + E1 acceptance — 2026-11-06

## Release identity

Remote main and inspected checkout: b0149249e6ee0570be1e5d02a713917fca1162e3.
GitHub Pages #355 / workflow 42202672201 succeeded. The live deployment manifest independently names that SHA and run.
This proves release identity, not browser correctness. No commit or deployment was made during this acceptance.

## Real production browser flows

Both desktop-1440 and mobile-390 tested:

- `/en/models/?tab=run&skill=event_window_analysis&country=czechia&event=cz-2023-10-16-repowereu-plan&section=case`
- `/en/models/?tab=run&skill=event_window_analysis&country=hungary&event=hu-2022-08-12-catl-debrecen&section=case`
- `/en/politics/poland/?research_study=d4`

Country/event selection, focused E1 dossier, Czech full 12/12 monthly window, Hungarian monthly blocker, hypotheses vs documented records, D4 opening, calculations and sensitivity sections passed. No browser page errors were observed.
CSV and JSON were actually downloaded from all three flows in both viewports, not inferred from source code.
Repeated JSON evidence digests matched. Both E1 records are always exported; only the selected Czech entry contributes a monthly window. The Hungary entry contributes no monthly window for either record. The UI explicitly states selected-case scope.

## Actual substantive defect and local correction

E1 annual source IDs for earlier observations pointed to the latest year's query (e.g. Czech 2021 energy dependence pointed to 2024). The source institution was correct, but the observation-year provenance was not.

Corrected only the E1 presentation/export adapter: preserve each canonical observation's original URL, publisher/dataset and update date; resolve source IDs to those individual URLs rather than the latest annual summary URL. CSV source rows inherit the correction. Values, methods, cases, source records, windows, model engines and D4 calculations remain unchanged. Added exact-hash governance registration and regression assertions.

## Downloaded production evidence SHA-256 (before correction)

These are SHA-256 over `JSON.stringify(export.evidence)`, not checksums of the pretty-printed JSON file.

| Export entry | Evidence SHA-256 | CSV file SHA-256 |
|---|---|---|
| Czech E1 | e4d54afe5f3d743110e572daec66dc36fde208ab00960b99163ce43bff81dac1 | f820415b28c91bdc45df654efab1ecccf4d9d44164e4f775c46e4a5e71687770 |
| Hungary E1 | fd547a4a9d19e1f3e4db84f16a8846e8486c24028fa15f66c5f6686feb3a6966 | 306e9745455d95d23fe31de1ca73cbde75e93f99e040561655a6632c67affc1e |
| Poland D4 | 9726ff0011832f6ff6d032448f192c5f186e82147d97d060d0c8b899157f3213 | d78b1ff49b4ac245b83eb3d58c813a3fa88f9d5f0f964d68174b123cc614b40b |

After correction, local E1 evidence digests are Czech `c441befa58affef802a7222abf0df025881b29ae5b5ab82bd3c2cdc2bdebc27b` and Hungary `4b5df40f3e6e69ff26d055790007239c459b12002a907e45ab427db1188a0a0a`. D4 remains byte-equivalent at the evidence-digest level.

Source index references resolve to stored URLs at Eurostat, the European Commission/RRF portals, Czech statistical authority, Hungarian election authority, and CATL. CATL is explicitly a company primary statement, not an official public record. This checks source identity and reference resolution, not universal remote HTTP availability or new reuse permission.

## Validation and limitations

Final consolidated suite: 39 relevant tooling tests + 6 browser tests against the corrected local build passed. The earlier real-production browser run also passed 6 flow/download tests; manual inspection of those downloads found the provenance defect, now covered by stricter assertions.
Static build, TypeScript, targeted ESLint, UI language, UI regression, exact-hash source checkpoint and secret scan passed. No canonical/public research data changed. No unrelated simulations ran.

CATL announcements are not realized FDI; REPowerEU monthly co-movement is not a causal effect. Missing implementation evidence, monthly CATL linkage and historical data vintages remain missing. D4 valid-identity and comparability restrictions and existing pressure-model engines remain in place.

Production disposition: #355 is deployed and functional, but final provenance acceptance remains conditional until the local correction is separately authorised for deployment and rechecked on production. Do not present the corrected local digests as already published.
