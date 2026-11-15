# Central Europe Political Atlas v2.0: audit of the annual single-vintage reference, coverage closure and comparability (2026-11-16)

Platform version v2.0 is unchanged. No data store, public export or model input changed in this iteration.

## A. Starting state

| Item | Value |
|---|---|
| Local HEAD at start | `88e6d6d44880c63a4b51bb095d0a852c8587896d` (branch `data/historical-coverage-2026-11-16`; one local docs-only commit not yet on `main`) |
| `origin/main` | `72794e72a8e0a3a2e2bfa5622bbd2513b7f81f48` |
| Uncommitted changes | none |
| Latest successful deployment | run `43741977904` at `72794e7` (build and deploy success). This is newer than the `8544b82` / `43726181001` baseline cited in the brief. |
| `deployment_provenance.json` | source_commit `72794e7…`, workflow_run_id `43741977904`, research package `research-data-v2.0.zip` sha256 `d42f37e5…6e53`, generated 2026-11-15T17:38:29Z |
| `release_manifest.json` | lists release, model, validation and boundary versions and the research package; no descriptive layer is listed |
| Research ZIP | 486 entries; contains `release/release_manifest.json` and the political, high-frequency and macro-driver manifests; no descriptive-history file |

## B. Structure and purpose of `annual_single_vintage_reference.json`

**Files:**
- Store: `src/data/historical/annual_single_vintage_reference.json`
- Public copy: `public/research-data/annual_single_vintage_reference.json` (byte-identical; sha256 `296f2a11…68b3`, the same hash as the live file)
- Generator: `scripts/historical-annual/build-single-vintage-reference.mjs`
- Data-refresh unit: `single-vintage-reference` (`scripts/data-refresh/units.mjs`)
- Run: `single-vintage-reference-20261116` (ledger entry 9; exact hashes in `docs/legal-security/data_refresh_amendments.json`)

**Schema:** `annual-single-vintage-reference-v1`.
- **Header fields:** `owner_decision`, `model_boundary`, `layer_policy`, `floor_rule`, `missing_value_policy`, `attribution`, `vintages[]` (table, `retrieved_at`, `dataset_updated_at`, `raw_file`, sha256, url), `indicators[]` (table, selection, unit, definition), `all_country_common_years`, `series[]` (per country × indicator: official span, `break_flags`, floor, first/last/count, overlap with admitted values, maximum difference) and `record_count`.
- **Each record:** `{id, country, country_slug, indicator, year, value, unit, value_status, source_flag, source, source_dataset, source_query_url, source_reliability, definition, vintage, dataset_updated_at, comparability_status, admitted_same_year, provenance{raw_file, raw_sha256, selection}, layer, spliced:false, descriptive_only:true}`.
- **Content type:** `records[]` are numeric observations. `series[]` and `vintages[]` are metadata only and must not be read as observations.

Answers to B-A to B-L:

| Question | Answer from the implementation |
|---|---|
| A. "Single vintage" | One archived retrieval per Eurostat table. All countries and years of an indicator come from that one retrieval. See §D. |
| B. Kind | A common extraction snapshot of the latest-revised series (concept 2), not real-time vintages. |
| C. Countries | AT, CZ, DE, HR, HU, PL, RO, RS, SI, SK. Serbia has no current account (tipsbp20 publishes none). |
| D. Indicators | `current_account_gdp`, `real_gdp_growth`, `gdp_per_capita_eur`, `fdi_inflow` |
| E. Years | Per series, from the Phase R floor to the last official year (§C). |
| F. Sources | Eurostat `tipsbp20`, `nama_10_gdp`, `nama_10_pc`, `bop_fdi6_flow` |
| G. Contents | 882 numeric observations, plus metadata. |
| H. Generation | Offline, from the archived Phase R full-history extracts, hash-checked against `annual_history_manifest.json` `recovery.tables`. |
| I. Deterministic | Yes. Two builds produce identical text equal to the committed file (test 2). |
| J. Canonical integration | No. It is a separate descriptive layer, never merged or spliced. `observations.json` and the annual history are unchanged. |
| K. Registration | It is registered in the data-refresh records with exact hashes and in the ledger. It is not in the research ZIP, `release_manifest.json` or `research_data_layers.json`, the same as every other descriptive layer (`annual_descriptive_history.json` is also absent). |
| L. Role | A descriptive research reference, published as JSON. No page, view or model reads it yet (test 10). Display is the Codex task in §P. |

## C. Countries, indicators, periods and record counts

| Indicator (table) | Countries | Records | Per-country spans |
|---|---:|---:|---|
| `real_gdp_growth` (`nama_10_gdp`, B1GQ, CLV_PCH_PRE) | 10 | 301 | DE 1992–2025; RS 1999–2025; others 1996–2025 |
| `current_account_gdp` (`tipsbp20`, PC_GDP, WRL_REST) | 9 | 252 | AT, CZ, DE, HU, SI 1995–2025; HR 2000–; RO 1999–; PL, SK 2004–2025 |
| `gdp_per_capita_eur` (`nama_10_pc`, B1GQ, CP_EUR_HAB) | 10 | 210 | AT, CZ, RO 1995–; DE 1991–; RS 1999–; HR, HU 2012–; SI 2008–; SK 2021–; PL 2022–2025 (break floors) |
| `fdi_inflow` (`bop_fdi6_flow`, LIAB, DI__D__F, MIO_EUR) | 10 | 119 | 2013–2025 (AT and RS to 2024; RO from 2015); empty official cells remain gaps |

The total is 39 series and 882 records. Keys are unique (`country_slug`, `indicator`, `year`), and ids are unique.

## D. What "single vintage" means in this project

The brief distinguishes three concepts. The artifact is **concept 2**: a historical series holding the latest revised observations available at one retrieval date, for one table.

- **The `vintage` field is a retrieval timestamp**, not a statistical release vintage:
  - `nama_10_gdp` 2026-11-09T20:50:49Z
  - `nama_10_pc` 20:50:50Z
  - `tipsbp20` 20:51:03Z
  - `bop_fdi6_flow` 20:51:04Z
- **`dataset_updated_at` is Eurostat's table update:** 2026-11-05 for `nama_10_gdp`, `nama_10_pc` and `bop_fdi6_flow`; 2026-10-28 for `tipsbp20`.
- **Mixing of releases:**
  - Within an indicator there is none: each indicator reads exactly one retrieval of one table (test 4).
  - Across indicators, releases differ by table. That is legitimate because no cross-indicator ratio is calculated, and it is disclosed per record and in `vintages[]`.
- **It is not concept 3** (point-in-time vintages). It does not show what was known at past publication dates. It must never be used as real-time evidence, for forecast evaluation or for backtesting. That limitation stays, and no forecasting or backtesting gate was touched.
- The documentation recommends labelling it "as retrieved on 2026-11-09", not "single vintage" alone. A `vintage_definition` header field is proposed for the next rebuild (issue DATA-2026-11-16-08).

## E. Source-vintage audit

| Table | Publisher | Retrieved | Dataset updated (archive) | Live update (probe 2026-11-15/16) | Reference period | Unit | Revision status |
|---|---|---|---|---|---|---|---|
| `tipsbp20` | Eurostat | 2026-11-09 | 2026-10-28 | 2026-10-28 | 1995–2025 | % of GDP | unchanged since archive |
| `nama_10_gdp` | Eurostat | 2026-11-09 | 2026-11-05 | 2026-11-11 | 1975–2025 axis | % change, chain-linked volumes | updated since archive |
| `nama_10_pc` | Eurostat | 2026-11-09 | 2026-11-05 | 2026-11-11 | 1975–2025 axis | EUR per inhabitant | updated since archive |
| `bop_fdi6_flow` | Eurostat | 2026-11-09 | 2026-11-05 | 2026-11-11 | 2013–2025 | million EUR | updated since archive |

**Values are still current.** A re-download on 2026-11-15, staged only, rebuilt the layer with **0 of 882 values changed** (only `retrieved_at` and `dataset_updated_at` differ). The newer releases did not revise these four selections.

**Extraction method:**
- Eurostat dissemination API, JSON-stat, using the exact request URLs stored in `vintages[].url` and on every record.
- The archived raw files hash to the recorded sha256.
- Licence: Commission reuse policy, cleared with conditions. Attribution: "Source: Eurostat".

## F. Numeric and structural reconciliation

The independent re-derivation is `python3 -I scripts/data-coverage/audit-single-vintage-reference.py`. It has its own JSON-stat reader and floor rule, written in a different language from the builder. Report: `docs/data-coverage/single_vintage_reference_reconciliation_2026-11-16.json`. **Result: pass, 0 defects.**

| Check (brief §5) | Result |
|---|---|
| 1 Valid JSON; 2 schema | pass (schema version, record_count, field types, id format) |
| 3 Unique keys; 4 no duplicates | pass |
| 5 Country identifiers (pairs registered in `observations.json`); 6 indicator identifiers | pass |
| 7 Frequency (annual integer years); 11 period labels | pass |
| 8 Units equal the annual history's units | pass |
| 9 Values: exact float equality with each archived official cell, all 882 | pass |
| 10 Source references (dataset, URL, raw file, sha256); 16 calculated vs published (all direct cells, no formula) | pass |
| 12 No fabricated observations: every record has an official cell at or above the floor, and every such cell has a record | pass (0 omitted, 0 extra) |
| 13 No null-to-zero: the 4 zeros are official zeros | pass (SI CA 2001, CZ GDP growth 2013 and 2023, DE 2024 `p`) |
| 14 No aggregation or averaging; 15 national geo codes only | pass |
| 17 Exact agreement where expected: the 431 overlaps with Phase R records from the same extract all have difference 0 | pass |

The remaining 142 overlaps (of 573) differ from an admitted value:
- **Cause:** each is a vintage revision. The admitted record cites a query on the **same table and selection**, from an earlier retrieval (canonical `observations.json` updated 2026-07-17 / 2026-08-12, or the Phase G history from September).
- **Tolerance:** 103 are within the registered tolerance (relative 0.02, absolute 0.3). 39 exceed it: current account AT/HR/HU/RO/SI/SK, FDI ×7, GDP per capita EUR PL 2022–2025 (2022 census break) and CZ, DE one year each, real GDP growth DE/SI/AT/HR/RO/SK.
- **Detail:** each is listed in `vintage_revisions[]` with record id, expected (admitted) value, actual value, both sources, difference, root cause, severity and proposed action.
- **Action:** none in this layer. These values are not defects and are not overwritten. They converge only through a canonical refresh with model-impact review.

## G. Historical coverage and missing data

**Matrix:** `docs/data-coverage/historical_coverage_matrix_2026-11-16.{json,csv}`.
- 1,733 contracts, every gap classified A–G, 0 unclassified.
- New in this iteration: `summary.by_country` and `summary.by_indicator`.
- The official-source gap register is the A/B items of `historical_gap_backlog.json`.
- The comparability restriction register is `indicator_comparability_contract.json`.

**By country** (main national series: annual, monthly, SORS, Ministry of Finance):

| Country | Expected | Recorded | Coverage | Admissible coverage* | A | C | D | G |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Austria | 4,555 | 3,888 | 85.4% | 98.8% | 48 | 4 | 615 | 0 |
| Croatia | 4,183 | 3,382 | 80.9% | 98.6% | 47 | 48 | 585 | 121 |
| Czechia | 4,694 | 4,129 | 88.0% | 98.7% | 53 | 1 | 414 | 97 |
| Germany | 4,765 | 3,947 | 82.8% | 97.9% | 85 | 0 | 701 | 32 |
| Hungary | 4,944 | 3,990 | 80.7% | 98.7% | 52 | 0 | 607 | 295 |
| Poland | 4,980 | 3,580 | 71.9% | 99.3% | 27 | 0 | 1,017 | 356 |
| Romania | 4,690 | 3,642 | 77.7% | 98.9% | 41 | 2 | 710 | 295 |
| Serbia | 6,593 | 5,603 | 85.0% | 99.7% | 17 | 0 | 290 | 683 |
| Slovakia | 4,248 | 3,283 | 77.3% | 98.7% | 43 | 3 | 799 | 120 |
| Slovenia | 4,215 | 3,426 | 81.3% | 98.0% | 69 | 0 | 624 | 96 |

\* Admissible coverage = recorded ÷ (expected − C − D − G), i.e. coverage of the periods that are admissible under the current definitions. The remaining shortfall is category A.

**Indicators below full admissible coverage in the main series:**

| Indicator | Main series, admissible coverage | Category A periods | Note |
|---|---:|---:|---|
| Current account | 45.2% | 138 | All 138 published in the reference layer |
| FDI | 48.7% | 61 | All 61 published in the reference layer |
| GDP per capita EUR | 73.5% | 56 | All 56 published in the reference layer |
| Real GDP growth | 82.1% | 54 | All 54 published in the reference layer |
| Electricity prices | 94% | 10 each | Canonical 2025 years |
| Energy HICP | 95.9% | 10 | Canonical 2025 years |

All other annual indicators are at 100% admissible coverage.

**Monthly:** the gaps are D floors from official flags and the v1.83 audit (HICP energy, unemployment, industrial production), G (euro existence, policy-rate regimes), and 146 refresh-path months (A).

**Next feasible batch, attempted and blocked with evidence.** The live annual plan `annual-refresh-20261116` (stage only, nothing applied) found:
- **New observations:** 0.
- **Revisions:** 234, of which 27 beyond tolerance.
- **Removals: 403**, in 16 series: manufacturing share AT/HR/HU/PL/RO/SK, real GDP growth AT/HR/RO/SK, and imports, trade balance and trade openness AT/HR. The newer vintage fails the splice check against the frozen canonical years.

Applying it would shrink published coverage, so it is held for an owner decision (issue DATA-2026-11-16-01). The other open batches:
- the high-frequency re-plan waits for Eurostat's full October HICP release (2026-10 still flagged `e`; scheduled 2026-11-19);
- the macro-driver unit is blocked;
- category B needs host registration.

## H. New observations

None. The batch from the previous iteration (882 observations) was verified instead of re-imported.

## I. Coverage before and after

Unchanged in this iteration: 43,076 of 49,770 national periods recorded; gaps A 485, C 65, D 6,462, G 2,397.

The 301 vintage-held periods and 8 canonical-null FDI values remain published in the reference layer (summary `single_vintage_reference.held_A_periods_published_in_reference` = 301).

## J. Comparability findings

The rules are preserved and enforced by tests:
- **Inflation:** HICP only; Serbian CPI is never HICP (`d` on every Serbian HICP year).
- **Unemployment:** the LFS rate (`une_rt_a` / `une_rt_m`) only; registered unemployment is never used.
- **Real growth:** chain-linked volumes only.
- **Fiscal:** general government (S13, EDP), separate from the Serbian GFS-1986 / central-level series.
- **National vs regional:** national only in this layer (geo codes checked).
- **Official vs platform-derived:** the reference layer contains only directly published cells; derived ratios elsewhere carry `calculated`.

Common periods are true intersections of actual years. Internal gaps are flagged, not bridged: FDI common years are 2015, 2021, 2022, with `contiguous: false` (test 7).

The reference layer supports side-by-side descriptive comparison within one retrieval. It does not authorise ranking, model estimation or inference, and it is never differenced against canonical years. The difference field documents revisions only.

## K. Model regression and publication gates

- Model inputs and frozen research outputs are byte-identical to the pre-iteration baseline `8544b82` (test 10: `git diff` over `observations.json`, high-frequency snapshots, macro drivers, panel, network, LP, panel-LP, macro and models, and identified shocks).
- Nothing in `src/app`, `src/components`, `src/lib`, `scripts/acquisition` or `scripts/validation` reads the layer.
- Full `pnpm build` on `e3f4089`: pass. It runs every VAR, LP, panel-LP and preregistration validator; research validation 145 (0 failed, 0 blocking); advanced-analysis validation 0 failures (97,519 local-projection checks); release QA 72 routes, 174 exports, 2,922 internal links.
- No research programme was reactivated; publication gates are unchanged.

## L. Research package and checksums

| Item | SHA-256 |
|---|---|
| Live package (downloaded and hashed 2026-11-16) | `d42f37e54021b289a17678931ec1c0dc94ad60e55f352fc648393a73a6d68e53`, equal to `deployment_provenance.json` and the release-validation checksum |
| Store and public copy | `296f2a1189e586601f31a93944c8c0d96f51ca562311a68e9ad8ce8b019568b3` (also the live file) |

By policy the reference is not in the ZIP, and no manifest field changed meaning. This iteration changes no public file, so the package contents are unchanged apart from build metadata.

## M. Commits

`e3f4089…` (audit, tooling fix, tests, registers) and this report commit. Deployment needs the owner's "推送上线".

## N. Deployment evidence

Pending approval. Current production: `72794e7`, run `43741977904`.

## O. Remaining unresolved gaps

| Gap | Status |
|---|---|
| Annual-history de-admission risk (403 observations) | owner decision |
| 301 vintage-held periods in the spliced series | held by decision; published separately |
| 146 refresh-path months | HF re-plan 2026-11-19; macro drivers blocked |
| 30 canonical 2025 years | frozen |
| Category B | UN Comtrade before 2015; national statistical offices, IMF and OECD not checked; Serbian years before the Ministry of Finance bulletin |
| D/G floors | not fillable without a definition change |

Detail: `historical_gap_backlog.json` (474 items) and `data_issue_register.json`.

## P. Codex integration specification

**1. Artifact:** `/research-data/annual_single_vintage_reference.json`.
- Observations are in `records[]` only.
- `series[]`, `vintages[]`, `indicators[]` and `all_country_common_years` are metadata. Never plot them or export them as observations.

**2. Coverage:** the four indicators × the countries in §C. Show it only for those indicators; Serbia has no current account record (a gap, not zero).

**3. Labels:**
- Use "Eurostat data as retrieved on 2026-11-09 (table update 2026-11-05; tipsbp20 2026-10-28)" / "欧盟统计局数据，2026-11-09 获取（表更新 2026-11-05；tipsbp20 为 2026-10-28）".
- Do **not** use "real-time" or "historical vintage", and do not use the word "vintage" alone. This supersedes the label suggested in `docs/v20-historical-coverage-2026-11-16.md` §P.

**4. Separate series:** display it as its own series. Never join it to the canonical or annual-history line, never compute changes across layers, and never fill missing main-series years from it.

**5. Revisions:** where `admitted_same_year` is present, show both values and the difference as "revised since the admitted figure".
- Warning text: "Later Eurostat revision of the same table; not a definition change."

**6. Missing data and flags:**
- A year that is absent is missing. Never draw a zero or a straight line across it.
- Show `source_flag` `p` (provisional) and `b` (break).
- Show a break marker at `series[].definition_compatible_floor` when `break_flags` is non-empty.

**7. Comparison windows:** use `all_country_common_years[indicator]`. If `contiguous` is false, say "common years are not continuous" and list them.
- Do not offer rankings, differences, model estimation or inference.

**8. Export:** a CSV from this layer carries `id, country_slug, indicator, year, value, unit, value_status, source_flag, source_dataset, source_query_url, vintage (as retrieved_at), dataset_updated_at, admitted_same_year.value, admitted_same_year.difference_reference_minus_admitted`, plus the footer "Source: Eurostat; descriptive reference, not a model input".

**9. Tests and governance:**
- When the integration lands, replace the "nothing reads the layer" assertions with integration tests: `tests/tooling/historical-coverage-matrix.test.mjs` last test and `tests/tooling/single-vintage-reference-audit.test.mjs` test 10.
- Edited frozen UI files need a UI governance amendment.

**10. Inherited frontend backlog (Codex verification required, not marked complete):**
- indicator search and categories;
- arbitrary 2–10 country comparisons;
- vote share vs seat share;
- map-first homepage;
- simplified research UI;
- Serbia election deep-link verification;
- production browser regression checks.

## Q. Recommended next iteration

1. **Owner decision on DATA-2026-11-16-01.** Choose whether a later Eurostat vintage may de-admit published history, or whether admission is fixed per archived vintage. Until then, annual refreshes stay unapplied.
2. **High-frequency re-plan** after Eurostat's full October 2026 HICP release, with the Serbian HICP inventory regeneration.
3. **Deliberate canonical refresh in a release:** 2025 energy and electricity years and the vintage-held canonical years, with a model-impact review. After this, the main series and the reference layer converge, and the splice check passes again.
4. **Category B host decisions:** national statistical offices' back-series and Serbian pre-bulletin years, kept as separate national-definition series.

## R. Persistent issue register

`docs/data-coverage/data_issue_register.json`, 10 entries:

| Id | Issue | Status |
|---|---|---|
| DATA-2026-11-16-01 | Refresh would de-admit history | owner decision |
| DATA-…-02 | Reference metadata date | documented, no value change |
| DATA-…-03 | Live-mode unit failure | fixed in `e3f4089` |
| DATA-…-04 | Vintage hold | by decision |
| DATA-…-05 | Refresh-path months | scheduled |
| DATA-…-06 | Canonical 2025 | needs release |
| DATA-…-07 | Unchecked source families | needs hosts |
| DATA-…-08 | Vintage semantics | documented |
| UI-INHERITED-01 | Codex backlog | — |
| INHERITED-02 | minimatch alert | waiting upstream |

### Test labels

| Test | Result |
|---|---|
| `single-vintage-reference-audit.test.mjs` 1–10 (schema, determinism, Python reconciliation, vintage consistency, registries, missing values, comparability, matrix, export/manifest, model gates) | PASS ×10 |
| `historical-coverage-matrix.test.mjs` (8) | PASS ×8 |
| Tooling suite | 467 PASS, 0 FAIL, 1 SKIP |
| `validate.mjs --checkpoint` | PASS |
| Live annual refresh plan `annual-refresh-20261116` | BLOCKED (stop conditions above; not applied by design) |
| Full UI suite | not re-run: no UI file and no public data changed in this iteration. Last run 728 PASS / 2 SKIP. |

The tooling SKIP is the dated 2026-11-10 closure snapshot test, which only reproduces while its recorded inputs are unchanged.
