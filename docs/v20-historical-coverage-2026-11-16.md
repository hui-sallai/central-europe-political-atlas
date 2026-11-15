# Central Europe Political Atlas v2.0: historical economic data coverage, source integrity and comparability (2026-11-16)

Platform version v2.0 is unchanged: `package.json` 2.0.0, `src/data/release.json` untouched, no release invoked. No model was re-estimated, and no canonical or frozen store changed.

## A. Starting point and production baseline

**Starting HEAD:** `8544b82902c388cc2474d71b3766ffa1d7b7ccbd`, matching `origin/main`. Nothing newer was overwritten.

**Production provenance:** source commit `8544b82` (`/research-data/deployment_provenance.json`).

**Workflow run `43726181001` ("Deploy GitHub Pages"):** verified independently with `gh run view`. Status completed, conclusion success, build and deploy jobs both successful, head `8544b82`.

**Research package:** `research-data-v2.0.zip` was downloaded from production (169,434,897 bytes) and hashed locally.
- SHA-256: `4b0cadf3c9e0686475a0525ffb9c800013df76e99d29b9152d1083d9acd28fbb`.
- This equals the declared value. It is an independent checksum, not a comparison of metadata fields.

**Serbia election UI:** not touched. The verification tasks reserved for Codex were left to Codex.

## B. Where the full matrix is

| File | Content |
|---|---|
| `docs/data-coverage/historical_coverage_matrix_2026-11-16.json` / `.csv` | One row per country × indicator × frequency (× region) contract. Columns follow the brief (`country_id` … `blocking_reason`), plus gap counts A–G, layers, break flags and the gap spans with reasons. |
| `docs/data-coverage/historical_gap_backlog.json` | Persistent backlog, one item per contract × category × reason × span. Items are never deleted. |
| `docs/data-coverage/indicator_comparability_contract.json` | Definitions, units, breaks and restrictions per indicator, and the frontend contract. |
| `docs/data-coverage/source_verification_2026-11-16.json` (+ `source_probe_2026-11-16.json`) | Source verification register and the archived live probe. |

Each file is reproducible with its generator:
- `node scripts/data-coverage/historical-coverage-matrix.mjs [--check]`
- `node scripts/data-coverage/source-verification.mjs [--check]`

**Registries discovered, not assumed:**
- Countries: AT, CZ, DE, HR, HU, PL, RO, RS, SI, SK.
- Indicators: 26 national annual and 11 national monthly, plus the Serbian SORS and Ministry of Finance series, regional indicators, the UN Comtrade trade-partner metrics and the frozen World Bank panel.
- These came from the Phase R recovery inventory, which enumerates every store, plus the Ministry of Finance store and the network and panel frames.

**How gaps are measured:**
- **Benchmark:** the archived full official extract of the same table and selection, not the stored years.
- **Expected periods:** run from the earlier of the first official and first admitted period to the later of the last official and last admitted period.
- **Unclassified gaps:** 0.

## C. Country × indicator coverage summary

The matrix has 1,733 contracts:

| Store | Contracts |
|---|---:|
| Regional | 1,015 |
| National annual | 260 |
| UN Comtrade trade-partner metrics | 140 |
| World Bank panel | 130 |
| National monthly | 106 |
| Single-vintage reference layer (new) | 39 |
| SORS | 32 |
| Serbian Ministry of Finance | 11 |

**National totals:** 49,770 expected periods, of which 43,076 are recorded.

**Gap periods by category:**

| Category | Periods | What it covers |
|---|---:|---|
| A. Officially available, not imported | 485 | |
| B. Source not independently checked | not counted | 140 Comtrade contracts plus unchecked earlier Serbian years |
| C. Genuine official unavailability | 65 | |
| D. Methodological or definitional incompatibility | 6,462 | |
| E. Licensing restriction | 0 | Comtrade is counted under B, with E as its blocking reason |
| F. Failed or incomplete extraction | 0 | |
| G. Country or institutional change | 2,397 | |

Regional is kept separate: 16,985 expected, 16,840 recorded; 129 C, 16 D.

**Core annual indicators: admitted span in the main series** (canonical `observations.json` plus annual history). The bracket shows the primary gap category; "full" means every period that can be admitted under the current definitions is admitted.

| | AT | CZ | DE | HR | HU | PL | RO | RS | SI | SK |
|---|---|---|---|---|---|---|---|---|---|---|
| HICP inflation | 1996– full | 1997– [D] | 1996– full | 1999– full | 2002– [D] | 2000– [D] | 1997– [D] | none [D: HICP 'd' every year] | 1996– full | 1997– [D] |
| Real GDP growth | 1996– full | 1996– full | 2021– [A, held] | 1996– full | 1996– full | 1996– full | 1996– full | 1999– [G] | 2021– [A, held] | 1996– full |
| Unemployment (LFS) | 2009– full | 2011– [D] | 2020– [D] | 2009– full | 2018– [D] | 2019– [D] | 2009– full | 2010– full | 2009– full | 2011– [D] |
| Fiscal balance (EDP) | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | none [C]; national-definition series 2005– | 1995– full | 1995– full |
| Gross debt (EDP) | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | 1995– full | none [C]; national-definition series 2001– | 1995– full | 1995– full |
| Current account (BPM6) | 2021– [A, held] | 1995– full | 1995– full | 2021– [A, held] | 2021– [A, held] | 2004– full | 2021– [A, held] | none [C]; national-definition series 2007– | 2021– [A, held] | 2021– [A, held] |

All spans end in 2025.

## D. Officially available but missing observations (category A, 485 periods)

| Cause | Periods | Status |
|---|---:|---|
| Vintage splice hold: the canonical 2021–2025 years are an older vintage of the same table (current account ×6, FDI ×7, GDP per capita EUR CZ/DE, real GDP growth DE/SI) | 301 | **Now published unspliced in the single-vintage reference layer** (§E). The hold on the spliced series stays in force (owner decision 2026-11-11). |
| Months after the frozen 2015+ stores (HICP, industrial production, unemployment, yields, BIS rates and FX, 2026-08 to 2026-10) | 146 | High-frequency refresh: October HICP is still a flash estimate (flag `e`, Eurostat update 2026-11-04); re-plan scheduled 2026-11-19. Macro-driver unit is blocked by owner decision. |
| 2025 after the last canonical year (energy HICP, household and industrial electricity prices) | 30 | `observations.json` is a frozen formal-model input; needs a deliberate canonical refresh. |
| FDI 2025 inside the canonical window, where the canonical record is null (CZ, DE, HR, HU, PL, RO, SI, SK) | 8 | Also published in the reference layer. |

## E. Data imported in this iteration

**Run `single-vintage-reference-20261116`**, owner decision 2026-11-16 ("Single-vintage layer").

**New store:** `src/data/historical/annual_single_vintage_reference.json`, with a byte-identical public copy at `public/research-data/annual_single_vintage_reference.json`.

**Content:**
- **Indicators:** current account % GDP, real GDP growth, GDP per capita EUR and FDI inflows, for every country the table covers.
- **Size:** 39 series and 882 observations.
- **Source:** one archived retrieval per table, read offline and checked against the SHA-256 the annual manifest recorded.
- **Floors:** the Phase R rule, max(first official year, territorial floor, last `b` flag, year after last `d`).
- **Flags:** kept (18 `p`, 6 `b`).
- **Null semantics:** missing years are absent; nothing is interpolated or set to zero.

**Not spliced:** years that also exist in `observations.json` or the annual history carry both values, in separate layers, with the difference (`admitted_same_year`).
- Phase R records from the same extract match exactly (difference 0).
- Canonical years show the vintage revision, up to 1.3 pp for the current account and up to €997 for German GDP per capita.

**Not a model input:** no page, view or model reads the layer yet. A test enforces this until Codex integrates it.

**Newly available years that were absent from the main series:** 309.
- 301 vintage-held years, all of them now published.
- 8 FDI 2025 values that the frozen canonical store holds as null.
- By indicator: current account 138, FDI 61, GDP per capita EUR 56, real GDP growth 54.

**Comparable all-country years in one vintage:**

| Indicator | Main series | Reference layer |
|---|---|---|
| Real GDP growth (10 countries) | 2021–2025 | **1999–2025** |
| Current account (9 countries; Eurostat has no Serbian data) | 2021–2025 | **2004–2025** |
| GDP per capita EUR | 2021–2025 | 2022–2025 (Polish 2022 break floor) |
| FDI inflows | 2022 | 3 non-contiguous years (official empty cells) |

**Governance:**
- new data-refresh unit `single-vintage-reference` (offline only);
- ledger entry 9 (plan sha256 `3151cdea…`);
- run registered at exact hashes in `data-refresh-amendments.mjs` and `data_refresh_amendments.json`;
- `NEW_PATH_SCOPE` lists exactly the two new files;
- checkpoint passes.

## F. Observation counts before and after

| | Before (8544b82) | After |
|---|---:|---:|
| National descriptive and canonical periods recorded (matrix) | 42,194 | 43,076 (+882 in the reference layer) |
| Reference-layer years for the four indicators already present in the main series | — | 573 (with both values and the vintage difference) |
| Country × indicator × year cells with no admitted value before, now published | 0 | 309 |
| Annual history, observations.json, monthly, regional, SORS, Ministry of Finance stores | unchanged | unchanged (byte-identical) |

## G. Sources and official dataset IDs

**Reference layer:**

| Table | Selection | Retrieved | Dataset updated |
|---|---|---|---|
| `tipsbp20` | PC_GDP, partner WRL_REST | 2026-11-09 | 2026-10-28 |
| `nama_10_gdp` | B1GQ, CLV_PCH_PRE | 2026-11-09 | 2026-11-05 |
| `nama_10_pc` | B1GQ, CP_EUR_HAB | 2026-11-09 | 2026-11-05 |
| `bop_fdi6_flow` | LIAB, DI__D__F, WRL_REST, MIO_EUR | 2026-11-09 | 2026-11-05 |

All four are Eurostat tables. The register covers all 34 indicator × table mappings. For each mapping it records the publisher, ID, endpoint, definition, unit, frequency, territory, per-country official and admitted span, archive hash, revision status, licence and citation ("Source: Eurostat" / BIS).

**Revision status (live probe, one metadata request per table):**
- **Updated since the archive** (2026-11-11 to 13): `nama_10_gdp`, `nama_10_pc`, `nama_10_a10`, `nama_10_lp_ulc`, `demo_pjan`, `bop_fdi6_flow`. The reference layer therefore states its vintage (2026-11-05 releases). The newer vintage needs an annual-history refresh run.
- **Unchanged:** `gov_10dd_edpt1`, `gov_10a_main`, `une_rt_a`, `tipsbp20`, `prc_hicp_aind`, `ext_tec09`, `nrg_ind_id`, `nrg_pc_204`, `nrg_pc_205`.
- **Archive date not recorded:** monthly mappings.
- **Not probed:** BIS (`stats.bis.org` is `allowed_review_due`).

**Not checked (B), recorded as such:**
- national statistical offices of the EU countries (no host registered);
- EU central banks beyond Eurostat and BIS;
- OECD (host registered, licence review due, not used);
- IMF (no host registered);
- World Bank (frozen panel only).

## H. Comparability decisions

These are recorded in `indicator_comparability_contract.json` and the verification register.
- **Real GDP growth:** chain-linked volumes only, never nominal growth.
- **Inflation:**
  - HICP only.
  - Serbian CPI is never published or compared as HICP: Eurostat flags every Serbian year `d`, and the five 2021–2025 years are D by the 2026-11-11 decision.
  - HICP years before the last `d` flag (CZ, SK, RO 1996; HU 1996–2001; PL 1997–1999) are D.
- **Unemployment:**
  - LFS (ILO) rate, `une_rt_a`, 15–74, break-corrected from 2009.
  - Registered unemployment is never used.
  - Break floors (DE 2020, PL 2019, HU 2018, CZ/SK 2011) are D.
- **Fiscal:**
  - General government (S13) EDP net lending and gross debt only.
  - The Serbian Ministry of Finance figures are GFS-1986 consolidated balance and central-level debt under Serbian law. They stay a separate series (`cross_country_comparable=false`).
  - Serbian EDP cells are C: Eurostat publishes none.
- **Debt:** Maastricht gross debt, consolidated, at nominal value.
- **Current account:** BPM6. The Serbian NBS figures from the bulletin stay separate from `tipsbp20`.
- **Territorial and institutional changes (G, not D):**
  - German unification (from 1991);
  - Serbian totals excluding AP Kosovo and Metohija (from 1999);
  - no euro before 1999-01;
  - policy-rate regime and instrument floors;
  - the Croatian policy rate discontinued at euro adoption.
- **Vintages:** a newer vintage is never spliced into older canonical years. The single-vintage layer is the separate, consistent alternative for cross-country comparison.

## I. Unresolved gaps and reasons (all in the backlog)

The backlog has 474 items: 278 open (127 A, 151 B) and 196 documented as not fillable (C, D, G).
- **A:**
  - 146 refresh-path months (HF re-plan after the full October HICP release; the macro-driver unit is blocked);
  - 30 canonical 2025 years (frozen formal input);
  - the 301 held periods remain held in the spliced series, but are now published in the reference layer.
- **B:**
  - UN Comtrade before 2015 (not pursued, 2026-11-11);
  - Serbian national years before the Ministry of Finance bulletin's first printed year;
  - national statistical offices, OECD and IMF not checked.
- **D (6,462 periods):** official break and definition flags, plus the v1.83 monthly definition audit (HICP energy floors 2017/2018, monthly unemployment, Polish/Romanian industrial production). Not fillable without a definition change.
- **G (2,397 national periods):** institutional and territorial changes, as in §H.
- **C (65):** official cells that are empty.
- **Regional:** a separate workstream. 129 empty official regional cells are C and 16 multi-code rates are D. No regional data was added or inferred, and the Serbian NSTJ structures are unchanged.

Full historical coverage is **not** claimed.

## J. Data validation results

| Check | Result |
|---|---|
| `historical-coverage-matrix.mjs --check`, `source-verification.mjs --check`, `build-single-vintage-reference.mjs --check` | pass |
| New tooling tests (`historical-coverage-matrix.test.mjs`, 8): A–G classification, 0 unclassified, backlog ids unique, contract coverage, reference layer reproducible / floored / unspliced / unread by models, Phase R equality, `observations.json` and annual-history hashes unchanged | 8/8 |
| Tooling suite | 458 tests, 0 failures |
| `validate.mjs --checkpoint` | pass (848 frozen files; Germany 38 unchanged) |
| Data-refresh plan stage validators (data-coverage, var readiness, baseline definition, historical extension, monthly, annual, regional, Serbia audit, reference check) | all pass; formal model impact none; no unregistered side effect |
| Public-secret scan; privacy grep of new files (local paths, personal email) | pass; none found |
| Full `pnpm build` (all model and preregistration validators, research export, research package, release QA: 72 routes, 174 exports, 2,922 internal links; research validation 145 with 0 blocking; advanced-analysis validation 0 failures) | pass |
| Full UI suite (Playwright, desktop-1440 and mobile-390, incl. the provenance panel with 6 runs) | 728 passed, 2 skipped, 0 failed |

Integrity checks:
- **Unique keys:** reference ids are unique; every series has one table, one selection and one unit.
- **Chronology:** years are ordered.
- **Null semantics:** missing years are absent, and no value is zero-filled.
- **Traceability:** each record carries its raw file, raw SHA-256 and selection.

## K. Model regression

No model input changed: `observations.json`, the high-frequency snapshot, macro drivers, the panel and the network are byte-identical. The new layer is excluded from all models by design and by test.

Every model validator passed in the full build with unchanged results:
- VAR closure, bootstrap, lag, country, attribution and publication-boundary preregistrations;
- LP and panel-LP closures;
- event-window, high-frequency and identified-shock validation (97,519 local-projection checks, 0 failures).

Event-window models and the political-economic context panel still read only the canonical and Phase G layers.

## L. Research package

- **Production package verified:** SHA-256 `4b0cadf3…8fbb` (§A).
- **Local rebuild:** `research-data-v2.0.zip` built with 486 entries.
  - The ZIP does not carry the descriptive layers (unchanged policy). The reference layer is published as JSON.
  - The local hash `ca8ab830…ed8d` differs from production only because the build embeds source-commit metadata.
- **After deployment:** the production package was downloaded again and hashed locally: `d42f37e54021b289a17678931ec1c0dc94ad60e55f352fc648393a73a6d68e53`, equal to the value in `deployment_provenance.json` and the release-validation checksum.

## M. Commits

- `d9332a74d4aa14fa4057bad9e38453b69e7eb621`: data, scripts, governance and tests.
- `72794e72a8e0a3a2e2bfa5622bbd2513b7f81f48`: this report. **LIVE** (owner approval "推送上线"; pushed `8544b82..72794e7` to `main`).

## N. GitHub Actions

Run `43741977904` ("Deploy GitHub Pages"): build success, deploy success.

Live checks:
- `deployment_provenance.json` shows source commit `72794e7` and run `43741977904`.
- `/research-data/annual_single_vintage_reference.json` hashes to `296f2a11…68b3`, byte-identical to the committed store.
- Production acceptance tests pass (6/6).
- Open alerts: 1 Dependabot (minimatch, inherited), 0 code scanning, 0 secret scanning.

## O. Outstanding inherited issues

- Dependabot alert 1 (minimatch): waiting for the upstream typescript-estree release.
- High-frequency October HICP re-plan scheduled 2026-11-19.
- Macro-driver unit blocked (needs a deliberate release).
- Canonical 2025 years frozen.
- Serbian national-minority status per list not printed by RIK.
- NBS current account beyond the bulletin not read.
- Six Eurostat tables updated after the 2026-11-09 archive.

## P. Codex frontend integration instructions

The new layer is a new public file, `/research-data/annual_single_vintage_reference.json` (schema `annual-single-vintage-reference-v1`).

**1. Data Explorer (annual tab).** Offer the layer as a separately labelled series. Do not merge it into the existing annual line.
- Labels: "Single Eurostat vintage (retrieved 2026-11-09)" / "单一欧盟统计局版本（2026-11-09 获取）".
- Show it only for `current_account_gdp`, `real_gdp_growth`, `gdp_per_capita_eur` and `fdi_inflow`.
- Each record is `{country_slug, indicator, year, value, unit, value_status, source_flag, vintage, dataset_updated_at, admitted_same_year}`.

**2. Never splice.** Never join reference years and canonical years into one line or one change computation.
- Where `admitted_same_year` is present, show both values and the difference: "vintage revision: reference − admitted = x".
- Use the header's `all_country_common_years` for cross-country comparison windows.

**3. Availability and missing years.**
- **Main series:** `historical_recovery_inventory.json` → `series[].admitted` and `series[].missing.periods[]` (`from`, `to`, `category`, `reason`). Map categories to A–G with `categorise()` in `scripts/data-coverage/historical-coverage-matrix.mjs`:
  - 1 → A; 8 → A, except the EUR-conversion hold → D;
  - 3 → G; 4 → C, except a discontinued series → G;
  - 6 → D, except territorial causes or documented regime floors → G;
  - 7 → E; 2 → F.
- **Reference layer:** `series[]` → `first`, `last`, `count`, `definition_compatible_floor`, `break_flags`.

**4. Breaks and flags.**
- Show a break marker at `definition_compatible_floor` when `break_flags` is non-empty, and never draw or compute across it.
- Show `p` (provisional), `e` (estimated), `b` (break) and `d` (definition differs) as published.

**5. Comparability.** Read `indicator_comparability_contract.json`, either copied by Codex or served from `docs/`, or use the inventory's `comparability` block.
- When `definition_check` says levels differ (bilateral FX), disable cross-country comparison.
- Serbian national-definition series (SORS CPI, Ministry of Finance fiscal and debt) keep their own labels and are never placed on an HICP or EDP axis.

**6. Tests to update with the integration.**
- `tests/tooling/historical-coverage-matrix.test.mjs` asserts that no file in `src/app`, `src/components` or `src/lib` reads the layer. Replace that assertion with the integration's own test.
- Any newly edited frozen UI file needs a UI governance amendment.

**7. Untouched.** No existing page or contract changed: the annual runtime, the Data Explorer and the country pages are unaffected.

## Q. Recommended next data batch

1. **High-frequency re-plan after Eurostat's full October 2026 HICP release** (task scheduled 2026-11-19): 2026-10 HICP for AT, DE, HR, SK, plus 2026-08/09 months, with flags checked. It is bundled with the Serbian HICP inventory regeneration (category 1 → 6).
2. **Annual-history refresh with the 2026-11-11/13 Eurostat releases:** `nama_10_gdp`, `nama_10_pc`, `nama_10_a10`, `nama_10_lp_ulc`, `demo_pjan`, `bop_fdi6_flow`. Re-download, diff and review the revisions, then rebuild the single-vintage layer in the same run (the `annual` mode now includes both units).
3. **A deliberate canonical refresh in a release:** 2025 energy and electricity years, and the vintage-held canonical years, with a model-impact review. This would let the reference layer and the main series converge.
4. **Category B source checks needing owner approval of hosts:** national statistical offices' back-series before the Eurostat start years, and Serbian national years before the Ministry of Finance bulletin. They must be kept as separate national-definition series.
