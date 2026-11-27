# Independent acceptance test proposal

An independent reviewer should be able to repeat each check from a clean checkout of `9cb6530` without trusting this
dossier.

## A. Bytes

1. `pnpm build:site`, then download the exports listed in `captured_snapshots.json` (same URLs, desktop viewport) and
   compare the `data.csv` and `sources.csv` digests. Whole-ZIP digests differ by export time and are not compared.
2. Run `buildSorsSnapshotExample(key)` from `tests/fixtures/research-package-sors.mjs` for `cpi_index_2006`,
   `lfs_unemployment_quarterly`, `cpi_annual_index` and `retail_trade_volume_sa`. The first two must reproduce the
   admitted pins; the last two must give the proposed `data`, `sources` and `archive` digests.

## B. Values and provenance

3. For each SORS candidate, read `src/data/serbia/raw/<dataset>.extract.json`, check its `response_sha256` field
   against the proposal, and compare every `god-mes` → `vrednost` pair with the runtime points (expect 228/228,
   321/321).
4. For Hungary HICP 2020, decode `src/data/historical/raw/monthly/eurostat_prc_hicp_minr_RCH_A_TOTAL.json` (SHA-256
   `4a2dbd26…`) as JSON-stat and compare geo=HU, 2020-01..12 with the export (12/12).
5. Optionally repeat the present-day API query recorded in `provenance_records.json`; agreement shows present-day
   correspondence only.

## C. Rights and metadata

6. Read the Eurostat copyright notice, Decision 2011/833/EU and the SORS terms; confirm the facts recorded in
   `official_evidence.json`. Page digests will differ if the pages changed; judge the text, not the digest.
7. Read the three SDMX dataflows and confirm DOI, issue date, creation and update timestamps in
   `dataset_metadata.json`.
8. Confirm no candidate relies on BIS terms, GISCO clauses or national co-source rights.

## D. Governance

9. `pnpm political-source-closure:validate --checkpoint`, `pnpm research-export:check`,
   `node scripts/legal-security/validate.mjs --source-only`, `pnpm political-person-safety:validate` and
   `pnpm tooling:test` pass with this dossier present.
10. `git diff 9cb6530 --stat` lists only `docs/research-rights/r1c3/` files.

## E. After implementation (Codex phase)

11. The new pins admit exactly the proposed bytes. Any one-byte change, a figure-carrying archive or a different
   period yields `reference_only`. The rejected candidates stay `reference_only`.
