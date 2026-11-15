# Serbia election navigation and turnout acceptance · v2.0

## Production baseline and reproduction

The clean starting checkout, remote main and live deployment manifest agreed on `dfc624968151a5145a23f95a9292a6db9fdc3eec`. [GitHub Pages #408](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/43720672096) succeeded. Run ID 43720672096. The earlier #407 baseline had been superseded.

Live Chromium opened both political indexes and Serbia pages. Both indexes listed 2020, 2022, 2023 and 2026. Both selectors restored the December 2023 deep link. Both history tables showed 21, 19, 18 and 18 lists respectively and 250 seats in each year. The reported locale coverage discrepancy did not reproduce. Its origin in external snapshots cannot be determined.

Two defects reproduced in production. Changing the election replaced the current history entry. Back after 2023 → 2022 → 2026 did not restore 2022. All four history rows showed a dash under published turnout because the table read only the officially published percentage. The report gives counts and the existing chart already computes a percentage using its documented basis.

## Candidate

- `src/components/PoliticalExplorerAlpha.tsx` creates history entries for election changes and restores defaults when returning to an unparameterised URL. The Serbian history table uses the existing turnout calculation and labels it as computed. Details distinguish attendance, persons who voted and ballots cast. Chart language tags follow the election registry. Selected-election CSV and JSON filter the existing published result rows by election ID, retain nulls and source provenance, and use a filename identifying the election. The all-election CSV and manifest remain accessible.
- `src/lib/politicalStores.ts` and `src/lib/politicalExplorer.ts` pass through the optional recorded attendance count.
- `tests/ui/politics-serbia.spec.ts` covers both locales and viewports, the index and detail views, direct entry, reload, 2023 → 2022 → 2026, Back, Forward, language switching, copying the URL to a fresh browser context, active charts, tables, source links and actual file downloads.

| RIK field | 2022 | 2023 |
|---|---:|---:|
| Registered | 6,502,307 | 6,500,666 |
| Recorded attendance | 3,810,559 | 3,820,746 |
| Voters who voted | 3,806,050 | 3,815,007 |
| Computed percentage of registered voters who voted | 58.53% | 58.69% |
| Published turnout percentage | Unavailable | Unavailable |

The source records distinguish attendance and voters who voted. In 2020 the number of persons who voted also differs from the number of ballots cast. The calculation retains its registered numerator and denominator. No new identity links or official observations were created.

## Validation

- PASS — production CSV and JSON for results and turnout, source registry and manifest matched the local public exports byte for byte. Results CSV SHA-256 `365505842fdd8cf7ee7a00081f2cdd6d5ac03aa8973fd3a32f726128f3c73a7b`, results JSON `62f8db92a65de808d470e9be046dfdb82aaa030d233f6c35f2224bdc5193e0a7`.
- PASS — full candidate build, TypeScript, bilingual UI, SEO and release checks. 72 routes, 174 exports, 2,922 internal links and 145 research checks with zero blocking failures. One existing research check recorded partial coverage.
- PASS — seven political tests, political export validation, political audit, person-safety, legal-security and secret scan (2,010 files).
- PASS — 150 desktop/mobile browser cases in the final integrated run, including all nine requested navigation scenarios and both export formats for all four Serbian elections in both language workflows. The CSV checks cover membership and row count; JSON checks compare every result field.
## Remaining evidence and next step

The previous research record leaves list-level minority status, independent review of the law in force in 2022/2023 and NBS current-account coverage beyond the bulletin open. Legal-security also continues to list the ECB EMPD source-rights issue. None requires changing the RIK counts for this fix. The earlier development log separately records a minimatch advisory; its current status was not reassessed in this iteration.

The owner approved the three exact hashes below and authorised deployment and live verification on 2026-11-16. The production identity is recorded by the existing deployment manifest and Pages run.

### Exact candidate files for approval

- `src/components/PoliticalExplorerAlpha.tsx` — `fbc856802785b7785840b0e5b2e8727d0816a69fc72d729d673d87cdbdb34948`
- `src/lib/politicalExplorer.ts` — `133db1fdfdd1ef0ca4eeb18135fe68ee99016b6c37f3178330b48f2fca8b2aa5`
- `src/lib/politicalStores.ts` — `518ef3d7881ec2743d954bdf049529ad2f9e5d8ba0b2ed632775a9f2b0bfc4ef`
