# Historical Monthly Extension — feasibility audit (research-only)

Status: **partial; not ready for owner approval of a new estimation plan**. Starting commit `996450ef79c8db22abed491691b36d0e7ed3fc36` (formal v1.82). The v1.82 whole-path joint-inference program remains `closed_current_research_program`, with no activated path, public joint band, or global path test. This audit ran **zero** research simulations and **zero** new Panel LP estimates. It does not revisit R2.

The existing acquisition script explicitly sets `PLATFORM_START = "2015-01"`. Five official Eurostat JSON-stat API queries without that cutoff, retrieved on 2026-09-26, show that 2015 is **not** the raw source minimum. Raw responses, exact URLs, UTC acquisition timestamps, HTTP statuses, dataset update timestamps, dimensions, row counts and SHA-256 checksums are in `src/data/historical-extension-audit/`. Eurostat supplies latest-revised history, not a real-time vintage.

## Earliest non-null monthly observations (not yet definition-cleared)

| Outcome | AT | DE | SK | SI | CZ | HU | PL | RO | Earliest all-eight mathematical month |
|---|---|---|---|---|---|---|---|---|---|
| HICP price index | 1996-01 | 1996-01 | 1996-12 | 1996-01 | 1996-01 | 1996-01 | 1996-01 | 1996-01 | **1996-12** |
| Industrial production index | 1996-01 | 1991-01 | 2000-01 | 1998-01 | 2000-01 | 2000-01 | 2000-01 | 2000-01 | **2000-01** |
| Unemployment rate | 1995-01 | 1991-01 | 1998-01 | 1996-01 | 1993-01 | 1996-01 | 1997-01 | 1997-01 | **1998-01** |
| Long-term government yield | 1985-01 | 1980-01 | 2001-01 | 2002-03 | 2000-04 | 2001-01 | 2001-01 | 2005-04 | **2005-04** |

All four outcomes are **mathematically** complete from 2005-04. This is not a valid current-estimand start: Romania's Maastricht-yield observations through 2005-12 use primary-market yields, whereas the registered concept calls for secondary-market approximately ten-year government bonds. Slovenia's yield series also used primary-market yields through 2003-10. These known periods are marked `definition_incompatible` in the matrix, not silently accepted. [Eurostat yield metadata](https://ec.europa.eu/eurostat/cache/metadata/en/irt_lt_mcby_esms.htm).

No country has an independently established *pre-2015* earliest definition-compatible month yet; the corresponding fields remain `null` instead of inventing a date. Every pre-2015 unflagged API value is `pending_review`. The existing unflagged 2015+ window is the frozen baseline, not a newly certified historical extension. Latest API quality flags, including `b` breaks, `d` definition differences, `e` estimates and `p` provisional values, are retained. Slovenia's yield is marked estimated in 2025, so even the latest-vintage matrix should not be treated as identical to the frozen production vintage.

## Method and definition checks still open

- **HICP:** `prc_hicp_minr`, `coicop18=TOTAL`, `unit=I15`, NSA; compared with archived `prc_hicp_midx`, `coicop=CP00`, `unit=I15`. All-eight old/new overlaps cover the older 1996–2025 table; maximal country-level absolute difference is 0.05 index points (0 for five countries). This overlap is useful numerical evidence, **not** proof that the ECOICOP-2 back-series has identical all-items definitions in every historical month. No legacy series was spliced. [Eurostat HICP metadata](https://ec.europa.eu/eurostat/cache/metadata/en/prc_hicp_esms.htm).
- **IPI:** `sts_inpr_m`, `PRD`, NACE Rev.2 `B-D`, `SCA`, `I21`. The modern API contains historical back-series, but country-specific NACE conversion, industry-scope, adjustment and reference-base histories still need review before assigning a compatible start. A base-year scale change alone is not treated as a break; an unverified NACE/scope change is. [Eurostat STS information](https://ec.europa.eu/eurostat/en/web/euro-indicators/information-data/industry-trade-services).
- **Unemployment:** `une_rt_m`, age `TOTAL` (15–74), sex `T`, `PC_ACT`, `SA`. Eurostat's monthly methodology mixes country-specific LFS and temporal-disaggregation inputs and records major breaks until corrected. The latest API flags breaks for AT 2004-01; DE, SK, SI, HU and PL in 2009; and other definition flags. IESS 2021 break-correction and historical revisions remain a country-level review item. No real-time/backtest claim is made. [Eurostat monthly unemployment metadata](https://ec.europa.eu/eurostat/cache/metadata/en/une_rt_m_esms.htm).
- **Yield:** `irt_lt_mcby_m`, `MCBY`, monthly `% p.a.`. Romania through 2005-12 and Slovenia through 2003-10 have known primary-market measurement differences; bond-basket and country-source transition history still needs review. No other maturity, policy rate, money-market rate or interpolated substitute was introduced. [Eurostat yield metadata](https://ec.europa.eu/eurostat/cache/metadata/en/irt_lt_mcby_esms.htm).

## Frozen-shock information support, not inference

These counts use the original JK MP and CBI monthly series and the frozen comparison endpoint 2025-10. Every number before 2015 is a **mathematical-availability preflight** only: it does not establish definition compatibility, balanced estimation eligibility, or coverage. Support units are months, never country-month rows. Potential h=24 clusters use the existing `p_max = ceil((T_eff - 24)^(1/3))`, `p_h = min(h,p_max)` calendar/lag policy; no coefficient is estimated.

| Candidate start | Calendar months | Potential h=24 clusters | MP nonzero h=24 | CBI nonzero h=24 | MP largest / top-3 squared share | CBI largest / top-3 squared share |
|---|---:|---:|---:|---:|---:|---:|
| 2005-04, mathematical only | 247 | 215 | 179 | 179 | .146 / .339 | .113 / .268 |
| 2009-01, earliest fixed-group regime date | 202 | 171 | 136 | 136 | .189 / .391 | .141 / .335 |
| 2010-01 | 190 | 159 | 124 | 124 | .194 / .401 | .147 / .348 |
| 2012-01 | 166 | 135 | 100 | 100 | .237 / .486 | .224 / .346 |
| 2015-01 frozen baseline | 130 | **100** | **67** | **67** | .306 / .602 | .295 / .443 |

The frozen h=0 baseline is **129** time clusters and **86** nonzero MP / **86** nonzero CBI months. For the *unapproved* 2009-01 mathematical scenario, changes versus 2015 are +72 calendar months, +71 potential h=24 clusters and +69 nonzero h=24 months for each shock. Largest-event concentration would fall by .117 for MP and .154 for CBI; top-three concentration by .210 and .109. Those are **not** statistical-validity results and cannot reverse the R2 failure.

Slovenia joined the euro on 2007-01-01; Slovakia joined on 2009-01-01. Earlier observations cannot retroactively enter the fixed Euro-group direct-ECB-policy estimand. For the four non-euro countries, ECB shocks remain external spillovers. Thus 2009-01 is only the earliest *monetary-regime-permitted* Design A date, **not** a definition-cleared start. [ECB Slovenia](https://www.ecb.europa.eu/press/pr/date/2007/html/pr070102.en.html); [ECB Slovakia](https://www.ecb.europa.eu/euro/changeover/slovakia/html/index.en.html).

Design A (unchanged fixed-group estimand) is a candidate only, with no approved start. Design B (time-varying membership) and Design C (country-specific historical LP) are registered future ideas, not estimated. State-dependent LP remains not started. Crisis/zero-rate/COVID/inflation periods are context markers, never ex-post exclusions. No imputation or backcast was performed by this audit; official historical back-series are preserved as the source publishes them.

## Gate and next action

`historical-extension:validate` passes the source/checksum, raw-to-matrix, country/series identity, monthly-axis, shock-calendar, regime-date, no-imputation, no-estimation and frozen-file gates. Panel closure, Panel numerical validation and robustness hash/semantic validation also pass using the checkout's available Python environment. `panel_lp_results.json` remains SHA-256 `10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc`. Canonical `high_frequency_observations.json`, all v1.82 Panel outputs, public exports and identified shocks are unchanged.

Readiness is **partial**, not `ready_for_owner_review`. The next authorized research step is source-specific country metadata review and resolution of pre-2015 flags/breaks, especially unemployment methodology and IPI backcasting, followed by a re-run of this audit. Only after a definition-compatible Design A window is demonstrated should the owner decide whether to preregister a *new* historical Panel LP study. No merge, push or deploy is authorized by this audit; formal v1.82 remains in place.
