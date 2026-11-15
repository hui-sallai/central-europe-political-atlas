# Annual Data Explorer integration · v2.0

## Release baseline

Starting local HEAD was `1a843bdc4aa7562b00e75bd32188c2aa51a363ac`, a clean checkout one documentation commit ahead of main. Remote main, successful Pages #411 (run 43746589400) and the public deployment identity agreed on `4f8e876d7f56112df6432489c3de0dcb47124ecc`. The brief's #410 is its predecessor. Since #409 the project delivered the independent annual reference, offline generator, refresh registration, source reconciliation and coverage audit.

The downloaded #411 ZIP has SHA-256 `39fe15afc449d9ba4b56cb18c1a13f5be1aa3a06e24981998a61db6ae7c893ed`, equal to public deployment provenance. All 486 ZIP entries passed CRC. Its build identity matches the deployed commit. The deterministic release manifest describes the scientific release and declares its separate per-build provenance file. The local/pending placeholders are intentional. The generator first exports the data, then records the finished package hash in the public provenance file. The research ZIP omits the separately published annual descriptive reference by design. No release artifact was manually rewritten.

## Data contract and coverage

The independently downloaded reference and release manifest match the committed public files. The reference also matches the built site's copy. The reference's 882 numeric records represent one archived Eurostat retrieval per table on 2026-11-09. They do not reconstruct the data available to historical decision makers. Forty country–indicator metadata entries describe 39 populated series. Counts by indicator are 301 real GDP growth, 252 current account / GDP, 210 GDP per capita and 119 inward FDI. Serbia has no current-account row in this source.

Only records provide chart and CSV values. The independent disclosure preserves country, indicator, year, numerical value and unit, status, flags, definition, original dataset and link, retrieval date, table update and documented same-year revision. Country metadata provides break floors. The common-year header for FDI gives the endpoints and a count of three; intersecting its ten registered countries' actual rows yields 2015, 2016 and 2022. Main-series gaps remain intact.

After six successful runtime/coverage HTTP requests, the production data browser exposes 83 selectable definitions, including transformations and source-specific variants. The post-load adapter yields:

| Source family | Selections | Rows across selections | Numeric values |
|---|---:|---:|---:|
| Annual canonical + admitted history | 35 | 5,976 | 5,909 |
| Harmonized monthly | 4 | 5,489 | 5,480 |
| Monetary / financial | 19 | 34,572 | 34,154 |
| Serbia SORS | 25 | 2,916 | 2,912 |

These are presentation row counts. Shared financial observations can appear under multiple countries. Across source families 50 selections are annual, 32 monthly and one quarterly. The annual main series has 980 canonical positions and 4,996 descriptive backfills; all 67 pending values remain empty. The separately delivered coverage.json lists every country for every selectable definition, actual non-null periods, pending periods and original source labels.

## Changes and numerical acceptance

- Data Explorer now offers the separate reference on demand for its four registered annual indicators. Changing countries and periods filters the reference. Its independent charts, exact-value tables and CSV never enter the main exports, rankings or models.
- Frequency changes require an explicit metric. Previously switching annual GDP to quarterly selected Serbia's LFS unemployment automatically. Retained metrics outside search results are identified. Productivity and sovereign yields have explicit topic assignments.
- Per-country coverage uses actual numerical rows in the chosen range, with observed-period counts, internal annual gaps and pending years. An annual inventory contract is no longer displayed for a source-specific SORS selection. Source-loading and official availability messages are separate.
- Annual exports use original observation IDs, datasets and available update dates. Every one of the 5,976 annual positions was reconciled to its source ID, value, unit and URL.
- Poland 2025 inward FDI is pending in the main series. The separate reference returns 20,734.5 million EUR under `vintage:annual:poland:fdi_inflow:2025`; Serbia has no 2025 FDI value in that reference. For Austria 2024 current account, 1.5% of GDP in the admitted series and 2.8% in the reference are preserved with the source-recorded revision of 1.3 percentage points.
- The regression suite checks bilingual desktop/mobile navigation, two/five/ten-country selections, copied configurations, CSV and research ZIP downloads, numeric snapshot agreement, actual common years, failure to load coverage, regional exclusion and Serbia election history. A frequency test that previously required automatic substitution now requires an empty explicit choice, disabled export and preservation of all countries before and after metric selection.

## Research decisions

The proposed live annual refresh is a separate owner decision (DATA-2026-11-16-01). It would remove 403 admitted observations and revise 234. Claude Code should compare the 16 affected series against archived source selections, bridge years, tolerances and current canonical values before proposing any update. See docs/data-coverage/data_issue_register.json and docs/v20-single-vintage-audit-2026-11-16.md §G. In particular, retain the pending canonical Poland FDI observation and its separate revised reference ID above; availability in the reference does not authorise a canonical replacement. Registered unemployment, central-government finance, municipal values and other incompatible definitions have no new admission decision here.

## Release decision

The owner approved the five exact presentation hashes below on 2026-11-16. The previous three-file approval was for the Serbia election UI. All five paths below belong to the new presentation scope. The acquisition and publication rules, datasets and model-input hashes remain outside it.
e63afa95622459a94f3136400e7144e010e133b44f2de83f5a26284ca9785b59  src/components/AnnualReferenceDetails.tsx
604292b7c57bb2b03a7dbae095f7125ae27d8e2f4a74cc5fc4058d93ace66661  src/components/NationalComparisonWorkspace.tsx
314cc54d2d1477c1d61a4327e635bcc7899d4e2615864a88b96993bbb17d1084  src/lib/annualComparison.ts
0e9d24a24700c76c84182fd6d2ce15bc7dae6e9e5516e365869e545e4d1a9c62  src/lib/indicatorTaxonomy.ts
43bfd548f9c0336545209adcb60b4e5ed34e15e6323e8f4f771f04eb33ea676e  src/lib/nationalComparison.ts

### Candidate checks

| Check | Outcome |
|---|---|
| TypeScript, lint and full production build | PASS. One existing unused-variable lint warning in the Slovakia generator. |
| Release QA | PASS. 72 routes, 174 exports, 2,922 internal links and zero blocking failures. |
| Reference and historical matrix tooling; national comparison tests | PASS, 18 + 11. |
| Desktop and mobile browser acceptance | PASS, 96 integrated cases plus two targeted cases for the officially empty Slovakia automotive-export cell in 2015 and Germany's 2020–2021 source attribution. |
| Source rights and privacy checks | PASS. Open research restrictions remain registered. |
| Exact-hash source-closure checkpoint | Owner approval recorded for the five files above. |
| New commit, Pages deployment and post-release acceptance | Release authorised. The baseline deployment at candidate validation was #411. |
