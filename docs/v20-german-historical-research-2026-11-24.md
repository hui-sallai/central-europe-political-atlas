# German historical elections in the Political Explorer

The integration starts from `5cb9d4091b44f516eb458d5cc97efb1f9f0d4334`, published in [Pages run 467](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/45219003733). It uses the canonical records and the [German admission report](v20-germany-slovenia-early-2026-11-23.md). All ten Bundestag elections remain available in the existing election selector and turnout history.

## Research views

- [The 1990 reunification election](https://hy-central-europe-analysis.org/en/politics/germany/?election=el-de-bt-1990-12-02) shows the western and eastern areas' separate 5% thresholds and denominators of 37,426,103 and 9,029,669 valid second votes. The three initial examples can be expanded to all 24 second-vote contestants. PDS and B90/Gr. qualified in the east. The separate western GRÜNE list won no seats. The disclosure links the treaty, the September court decision and the October amendment to their admitted legal source. Adoption, promulgation and unverified commencement are labelled separately.
- [The 1994 election](https://hy-central-europe-analysis.org/en/politics/germany/?election=el-de-bt-1994-10-16) shows how four constituency mandates qualified PDS under the three-mandate clause. Its 4.4% national second-vote share and 30 final seats use the original result.
- [The 1998–2002 comparison](https://hy-central-europe-analysis.org/en/politics/germany/?election=el-de-bt-1998-09-27&compare=el-de-bt-2002-09-22) links the Thirteenth Act to the reduction from 328 to 299 constituencies and 656 to 598 statutory seats. Final sizes were 669 and 603. Both elections used Hare/Niemeyer. The 2002 record supplies the chamber/base difference of five but lacks a separately recorded overhang count and structured election-specific threshold.

| Election | Statutory seats | Overhang already included | Final seats | Constituency + Land-list mandates |
|---|---:|---:|---:|---:|
| 1990 | 656 | 6 (CDU) | 662 | 328 + 334 |
| 1994 | 656 | 16 (CDU 12, SPD 4) | 672 | 328 + 344 |
| 1998 | 656 | 13 (SPD) | 669 | 328 + 341 |

The existing parliament graphic carries the reconciliation. Expand the historical details for the seat-winning contestants and the Land/contestant entries printed by the source. These displays reuse official and reproduced values with their distinct scopes.

## Implementation and reproducibility

The changes cover the political store and national view types, official-series comparison, Political Explorer, ParliamentSeats, selected-result downloads, and two new display components for the historical allocation and the 1998–2002 comparison. The UI amendment registers the exact presentation file hashes. The en and zh routes share the same data and interactions.

The selected early ballot's JSON and CSV preserve its contestant IDs, original votes, denominator, published share, seat scope, source references and nulls. The complete ten-election archive retains 384 result rows. Collection in the existing Notebook records the selected election, ballot, denominator and seat scope. The seven-election official identity series begins in 2002. Early contestants enter neither that series nor the frozen D4 sample of seventeen elections. The stores contain national contestant aggregates and, for 1990, the two electoral areas' second votes. They do not provide constituency-by-constituency results.

Regression coverage is in `tests/tooling/political-germany-early.test.mjs`, `tests/tooling/political-series-comparison.test.mjs`, `tests/ui/german-historical-research.spec.ts` and `tests/ui/german-chamber-comparison.spec.ts`. The release workflow runs the repository gates, including frozen data checks and the full browser suite. The deployed commit and run are recorded in the [deployment manifest](https://hy-central-europe-analysis.org/research-data/deployment_provenance.json).

## Next evidence handoff for Claude Code

Slovenia's 1992 and 1996 elections remain outside the admitted archive. The next source step is owner-controlled staging of the [1996 official gazette](https://www.uradni-list.si/_pdf/1996/Ur/u1996065.pdf) in `local-evidence/slovenia/1996/` and identification and staging of the exact 1992 National Assembly results gazette in `local-evidence/slovenia/1992/`. Verify document identity, publication details and pages, the 88 general seats by list, the two national-community seats and their separate ballot scope. Reconcile the returns against the partial commission records and retain conflicting printed shares and missing fields explicitly. Admission requires the established evidence and rights checks. The present German change contains no Slovenian data acquisition or admission.
