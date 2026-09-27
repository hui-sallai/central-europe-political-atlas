# Changelog

## v1.851 VAR Layer-B Selection Decomposition & Interpretation Correction — 2026-09-28

- VAR residual-diagnostic research remains closed with no eligible replacement; Layer-B results are now explicitly decomposed as lag-selection/specification/diagnostic procedure behavior rather than pure conditional test size.
- Adds `var_residual_diagnostic_layerB_selection_decomposition.json`, derived deterministically by `scripts/var-residual-diagnostics/decompose_selection.py` from the frozen v1.85 simulation results (SHA256 `04cc4ad5…`): per-cell BIC correct/under/over-selection counts and h=12 PT/BG/ES rejection rates for all 36 Layer B primary cells. The replication-level joint distribution of selected lag and rejection was not retained, so no conditional rejection rates are reported.
- Adds research-conclusion amendment 001 (post-release interpretation clarification): Layer A = conditional diagnostic size; Layer B = selection-plus-specification-plus-diagnostic procedure rejection, whose pure size is not identified.
- Updates the capability registry and analysis registry to v1.851, the methodology outcome section, the workbench notice and the Phase A report; adds `pnpm var:residual-decompose` and `pnpm var:residual-decomposition-validate`.
- No new random draws, simulation reruns, country data, VAR re-estimation, threshold, method-decision, gate or readiness change.

## v1.85 VAR Residual Diagnostic Research Closure & Dynamic-Response Gate Boundary Hardening — 2026-09-27

- Closes the preregistered v1.85 finite-sample calibration of h=12 VAR residual autocorrelation diagnostics as a negative method result: across 72 primary cells (Layer A fixed true lag, Layer B platform BIC lag selection) the adjusted Portmanteau (37.5% of cells in [0.035, 0.065], max size 45.23%), BG LM (30.56%, 37.81%) and Edgerton–Shukur F (79.17%, 12.88%) all fail the joint platform gate; no replacement is eligible.
- Edgerton–Shukur is well calibrated at the fixed true lag (Layer A) but not under the full lag-selection plus diagnostic procedure (Layer B); it is not a validated replacement and is not a formal gate.
- Publishes the preregistration (with clerical amendment 001), reference manifest, attempts, cases and validation, seed registry, simulation design, calibration summary, immutable method decision and a new research conclusion; the full 2,160,000-replication cell-level results ship in the research package with their SHA256.
- Upgrades the VAR capability registry and analysis skill registry to v1.85, adds `pnpm var:residual-closure-validate`, and reconciles the Phase A owner report with the actual deployment of commit 961f869.
- No new simulation, no estimator, lag, threshold, readiness or country-diagnostic change; formal dynamic-response-ready count remains zero and no formal orthogonalized IRF is publishable.

## v1.84 VAR Readiness & Publication Boundary Convergence — 2026-09-27

- Converges the canonical reduced-form VAR readiness reference, analysis registry, workbench, methodology and research package without changing the estimator, lag selection, ADF calibration, stability, Portmanteau or IRF calculations.
- Publishes a machine-readable capability boundary: coefficient estimation and the conditional orthogonalized-response framework are available, while formal dynamic-response-ready country count is zero and formal IRF publication, uncertainty inference and structural identification remain unavailable.
- Marks the v1.31 input-layer readiness artifact as superseded rather than rewriting its historical decision, and keeps diagnostic higher-lag alternatives sensitivity-only.
- Preserves all v1.83 Panel, historical-closure, identified-shock, single-country LP, news and high-frequency observation outputs; no VAR coefficient or IRF was rerun.

## v1.83 Historical Extension Research Closure & Baseline Definition Disclosure — 2026-09-27

- Closes the current fixed-eight-country, four-outcome historical-extension program: HICP and long-term yield are definition-cleared, while IPI and unemployment prevent a common pre-2015 Design A window.
- Retains the formal 2015-01 to 2025-10 Panel baseline and publishes the Poland IPI LEU-to-KAU warning, Hungary unemployment back-revision semantics and Slovenia yield estimated-value flags in the interface and machine-readable metadata.
- Adds a refresh-safe high-frequency definition override registry, a final historical research conclusion artifact and a closure validator.
- Preserves all formal Panel coefficients, standard errors, intervals, shocks, lag policy and the frozen Panel result SHA-256. No historical Panel estimate or new simulation was run.

## v1.82 Panel Joint-Inference Research Closure & Method Boundary Hardening — 2026-09-26

- Closes the current fixed-eight-country whole-path inference research program after the R2 verdict `NOT CONFIRMED`; no Panel simultaneous band or global path test is activated.
- Records the pooled secondary best bootstrap coverage of 0.900 (90% interval 0.886–0.914) against nominal 0.95, and the frozen-Gaussian versus fitted-simulation critical-value ranges, with private research provenance represented by filenames and SHA-256 only.
- Keeps Panel LP estimation, pointwise inference, composition and time-FE diagnostics, and descriptive fitted-model comparison active. The fitted path remains optional, descriptive, and without confidence intervals or inferential p-values.
- Preserves the v1.8 formal Panel LP outputs and v1.81 robustness outputs. This release formalizes a negative research result and adds no inferential capability.
- Future reopening requires a new methodological rationale, preregistration, unused seed namespace, owner approval, and separate research files; possible directions are not backlog work.

## v1.81 Panel LP Composition & Publication Robustness — 2026-09-14

- Preserves the complete v1.8 formal results and estimator bytes, anchored to e18ecca; preserves the 86 v1.73 frozen artifacts and single-country LP outputs.
- Adds 32 fixed-calendar joint-shock leave-one-country-out models (1,600 horizon/shock records), centered unequal-group contrasts, time-cluster conditioning and shock-calendar audits. These are fixed-composition diagnostics, not country causal contributions or jackknife inference.
- Adds windowed influence summaries and baseline/time-FE concordance, with separate workbench diagnostics and explicit pointwise classification warnings. LOCO envelopes are diagnostic ranges, not confidence intervals.
- Repairs stale release stages at their generator, registers the eight Panel LP schema versions, adds the validation index and validates actual CI SHA/run provenance.
- Keeps IK, panel path inference, country-pair tests and state dependence unactivated. No new estimand, weighting or estimator family.

## v1.8 Aggregate-Shock Panel Local Projections & Euro / Non-Euro Transmission Heterogeneity — 2026-09-09

- Adds a fixed AT/DE/SK/SI versus CZ/HU/PL/RO joint JK MP/CBI panel, four common outcomes, country fixed effects and reference-exact lag augmentation with time-clustered asymptotic inference.
- Validates five numerical cases against unmodified pinned author R code; the MATLAB source is audited, not numerically executed. Author source is excluded from redistribution because the pinned repository has no root license.
- Separates group responses from direct pointwise group-difference inference and adds contrast-only country/time fixed-effects sensitivity.
- Keeps IK small-sample refinement, panel simultaneous bands, country-pair formal tests and state dependence unactivated. Preserves all v1.73 frozen single-country hashes and the read-only LP validation hotfix.
- Includes independent Python implementation, numerical fixtures, sample/diagnostic registries and publication checks in the versioned research package.

## v1.73 Analysis Registry & Workbench Convergence — 2026-09-07

- Canonical analysis registry supplies states, aliases, presentation and category routing.
- Method cards distinguish active, registered and blocked methods; macro methods have dedicated entry points.
- Preserves v1.72 econometric outputs and documented news coverage gaps.

## v1.72 Finite-Sample Bias & Shock-Support Robustness - 2026-09-04

- Preserved the frozen v1.71 44-model baseline and six-decimal coefficient/HC1 checksum.
- Audited the Fed accessible asset (25 HTML/GIF files, no replication code); bias correction remains registry-only with explicit applicability blockers.
- Added 386 joint-shock finite-sample designs, including 8 key designs with 10,000 repetitions each; exploratory designs are separately labeled.
- Added effective shock support, event aggregation traces, exhaustive nonzero-month and frozen-event deletion sensitivities, conventional DFBETAS thresholds and full-model covariance/seed diagnostics.
- No automatic observation deletion, reliability score, panel LP, state dependence or replacement baseline.

## v1.71 Local Projection Inference & Robustness Hardening - 2026-09-03

- Corrected lag-augmentation metadata while preserving the complete v1.7 coefficient and standard-error hash.
- Added 95% plug-in Gaussian sup-t bands based on cross-horizon joint HC1 covariance and the pinned Montiel Olea–Plagborg-Møller reference implementation.
- Added fixed-p2, fixed-p6 and predetermined-lagged-control sensitivity results on comparison-common samples.
- Added shock-support, concentration, leverage, standardized-residual, DFBETA, leave-largest-shock, conditioning and cross-country comparability diagnostics.
- Kept significance bands, formal cross-country difference tests, panel LP, pooled LP, state dependence, SVAR and BVAR unavailable.

## v1.7 Local Projections & ECB Spillover Transmission - 2026-09-01

- Activated single-country, single-outcome, joint MP/CBI lag-augmented Local Projections while freezing the v1.62 JK shock construction, shock IDs and 2025-10 monthly endpoint.
- Pre-registered outcome transformations, country/regime applicability, common-horizon samples, N≥96 gate, once-per-model AIC lag selection over p=1…6, p=2/p=6 sensitivities, and pointwise 90%/95% EHW-HC1 inference without HAC.
- Cross-validated a synthetic case plus Germany HICP/IPI, Poland HICP/FX and Hungary policy-rate checkpoints against an independent NumPy/SciPy/statsmodels implementation; added the active workbench and downloadable response tables.
- Published 44 ready country × outcome × regime combinations; kept Croatia's pre/post-2023 samples separate and unavailable, retained unavailable Serbian outcomes, and left panel LP, state dependence, SVAR and Bayesian VAR inactive.

## v1.62 Author-Reference Shock Replication & Identification Validation - 2026-09-01

- Pinned Marek Jarociński's author-maintained ECB shock update repository at `f7ffc821b0ade71dd38539e4044e25368dfb4dc1`, recorded source checksums and CC BY 4.0 / BSD-3-Clause terms, and retained AEA/ICPSR as original-paper provenance.
- Reproduced 312 event-level `pc1`, poor-man, and deterministic median-rotation observations plus 322 monthly observations exactly at the author's published eight-decimal precision in independent JavaScript and Python implementations.
- Activated two representative JK median identified shocks while keeping the restrictive poor-man decomposition diagnostic-only. Local Projections, SVAR and BVAR remain registry-only with no IRF or causal response estimator.

## v1.61 Information-Effect Separation & Monetary Shock Calibration - 2026-09-01

- Audited the published Jarociński–Karadi methodology, official AEA/ICPSR replication-project metadata, the euro-area OIS_3M/STOXX50 mapping, and the combined ECB monetary-event window.
- Added a 315-event EA-MPD input registry, deterministic poor-man sign diagnostic, regime/outlier diagnostics, method/specification registries, synthetic cases and explicit validation gates.
- Withheld event-level and monthly structural components because exact replication assets require an authenticated session, the reference sample is not aligned, and the published BVAR estimand is monthly rather than a standalone event decomposition.
- Kept `identified_shock_count = 0`, three external innovation proxies, zero causal-LP-ready records, and Local Projections/SVAR registry-only; no frozen estimator or formula changed.

## v1.6 ECB Monetary Policy Identification & LP Readiness - 2026-08-30

- Acquired and audited the official EA-MPD and EA-EMPD workbooks with source URLs, checksums, workbook schemas and reproducible acquisition manifests.
- Added 5,871 canonical monetary-policy event-window records, cross-dataset overlap evidence, monthly descriptive profiles and 49 deterministic validation checks.
- Registered three external innovation proxies while keeping `identified_shock_count = 0`; the information-effect separation requirement remains unresolved.
- Added country/outcome LP readiness records without activating an estimator. `causal_lp_ready_count = 0` and Local Projections remain `registry_only`.
- Added a concise public identification-status panel and a detailed methodology section while preserving the v1.44 reduced-form VAR implementation.
- Excluded the source workbooks from public exports pending workbook-specific redistribution confirmation; public records retain original source links and checksums.

## v1.51 Macro-Driver Temporal & Scope Integrity - 2026-08-30

- Enforced exact one-month and twelve-month calendar alignment; transformation warm-up is now separate from source missingness.
- Blocked policy-rate changes across Croatia's euro adoption and registered instrument/source-series transitions with explicit reasons.
- Added shared-series identities, dated applicability, pseudo-replication guards, official identified-shock source candidates and a gated v1.6 readiness checklist.
- Preserved zero identified shocks, zero causal-LP-ready records, and all frozen v1.44 VAR, panel, network, event-window and composite estimators.

## v1.5 Macro Drivers & Shock Identification Foundation - 2026-08-28

- Added a separate 2015-present monthly macro-driver layer from BIS, Eurostat and World Bank official sources, with policy-instrument regimes, long-term yields, bilateral/effective FX, domestic HICP Energy and external commodity-price drivers.
- Added driver dictionary, coverage, acquisition manifests, source checksums, shock-identification registry and Local Projections readiness registry. Observed movements and shock candidates are never promoted to identified shocks without a registered identification strategy.
- Extended Event Registry research links and descriptive Event Window outcomes to macro drivers, and added a lightweight Macro Driver workbench without changing the frozen v1.44 VAR baselines or diagnostics.
- Split release validation provenance into core research, advanced analysis and release summaries; research-data-v1.5.zip includes the complete macro-driver layer.

## v1.44 Finite-Sample Stationarity Calibration & Break Robustness - 2026-08-28

- Calibrated the exact production seasonal-dummy ADF with nine sample-size nodes (N=96–168), 50,000 Monte Carlo replications per node, a fixed RNG seed and linear interpolation provenance.
- Baseline v2 now gates on `adf_constant_seasonal_dummies_mc`; the v1.43 MacKinnon-c result remains available as a historical reference, and no empirical p-value is fabricated.
- Added MacKinnon-vs-calibrated decision comparison, HEGY readiness, descriptive ACF/PACF significance bands, and a strict split between historical candidate periods and statistically estimated breaks.
- Zivot–Andrews remains `registry_only`; all stationarity, stability, parameter-count, h=12/18/24 residual and orthogonalization gates remain unchanged.

## v1.43 Seasonality-Aware Stationarity & Structural-Break Diagnostics - 2026-08-27

- Method: aligned each registered VAR profile with a preregistered stationarity specification; baseline v1 retains constant-only ADF while baseline v2 uses ADF with a constant and 11 month-of-year dummies.
- Diagnostics: added source-adjustment-aware seasonality audit, descriptive ACF/PACF and lag-12 persistence warnings, seasonal-unit-root and structural-break registries, and historical candidate-regime markers without claiming estimated breaks.
- Validation: added Python OLS reference checks for seasonal-dummy ADF coefficients, standard errors, tau statistics and common-sample lag selection; retained every v1.42 residual, stability and horizon gate.
- Boundary: HEGY and Zivot-Andrews remain registry-only/unavailable; no SVAR, Local Projections estimator, Bayesian VAR, causal event study or bootstrap IRF intervals were activated.

## v1.42 Seasonal Controls & Dynamic Diagnostic Adequacy - 2026-08-27

- Method: added a second preregistered baseline with a constant and 11 month-of-year dummies while preserving the original constant-only baseline and documented exploratory fallback.
- Diagnostics: added a source seasonality audit, full legal-lag diagnostic grid, h=12 primary and h=18/24 sensitivity Portmanteau checks, horizon-specific 6/12/18/24 dynamic-response gates, and residual month-of-year summaries.
- Registry: migrated the active public skill ID to `reduced_form_var`; retained `var_svar` only as a deprecated deep-link alias and kept SVAR, Local Projections and Bayesian VAR inactive.
- Provenance: strengthened schema, package SHA-256, CI commit and workflow-run recording in the release manifest and downloadable research package.

## v1.41 VAR Specification & Diagnostic Reliability - 2026-08-22

- Major: separated the fixed formal baseline from the explicitly exploratory transformation fallback profile; readiness now distinguishes coefficient estimation from dynamic-response eligibility.
- Diagnostics: fixed adjusted Portmanteau sensitivity horizons at 12, 18 and 24 months, added lag preflight and comparability signatures, and withheld IRF for borderline ADF, instability, residual failure or failed orthogonalization.
- Reproducibility: pinned the Python reference environment and added fixture provenance for runtime versions, seeds, generator version and generation date.
- Boundary: only the constant deterministic specification is public. Residual LM, bootstrap intervals, SVAR, Local Projections and Bayesian VAR remain unavailable.

Public research releases are summarized here. Historical implementation QA remains in the data records and methodology appendix; this file records only major public changes, methodological changes and breaking changes.

## v1.4 Macro Dynamics & Reduced-Form VAR - 2026-08-22

- Major: activated a single-country monthly reduced-form VAR workbench with per-country readiness, documented transformations, common continuous samples and full raw-observation traces.
- Method: added ADF stationarity gates, common-sample AIC/BIC/HQIC lag selection, a parameter-count gate, companion-root stability, adjusted Portmanteau residual diagnostics and ordering-dependent orthogonalized reduced-form responses.
- Validation: coefficients, information criteria, roots, residual covariance, Portmanteau statistics, ADF results and IRF paths are cross-checked against offline statsmodels, NumPy and SciPy fixtures.
- Boundary: KPSS, bootstrap uncertainty intervals, SVAR, Local Projections and Bayesian VAR remain unavailable; Cholesky ordering is not presented as structural identification.
- Breaking: none. Composite indicators, panel estimators, trade-network formulas, event-window semantics and scenario definitions remain unchanged.

## v1.31 High-Frequency Integrity & Event Semantics - 2026-08-22

- Major: migrated HICP inputs to Eurostat `prc_hicp_minr` with ECOICOP-2 all-items continuity and an explicit migration manifest.
- Fix: event-window pre, event and post periods are disjoint; the event month is not counted as post-event data, and changes use indicator-appropriate units.
- Boundary: this release prepared but did not activate VAR; v1.4 is the first release that activates the reduced-form implementation.

## v1.3 High-Frequency Political Economy, Event Analysis & Product Language System - 2026-08-21

- Major: added the monthly high-frequency data layer (Eurostat HICP monthly index and annual rate as separate indicators, harmonised unemployment SA 15-74, industrial production SCA; 2015-01 onward; gaps stay missing, no interpolation).
- Major: activated descriptive Event Window Analysis (level 1) with verified-event and month-precision eligibility, pre/post window statistics, overlap warnings, exploratory short-window flagging and strict non-causal language; Formal Event Study remains registry_only.
- Fix (release blocker): network coverage gate now uses eligible partners only (eligible_coverage_ratio >= 0.95); raw coverage is QA-only and aggregate records can no longer help the gate pass. 12 of 220 groups now correctly fail and are unavailable for formal metrics.
- Major: added the network acquisition manifest (per-call endpoint, parameters, response count, content hash) and a central Chinese-first UI language registry with mapped internal statuses; primary navigation and workbench controls are now Chinese-first.
- Breaking: network metrics no longer publish partner_degree_ratio (partner_count retained); network schema versions move to v1.3.

## v1.25 Econometric Reliability, Cross-Country Comparability & Trade Network Activation - 2026-08-21

- Major: formal cross-country comparisons now require the same model version, formula, weight and input year; the comparison matrix reads one common year per column and never falls back to older data; non-eligible countries are listed explicitly with exclusion reasons instead of silently ranked.
- Major: activated the bilateral goods trade network (UN Comtrade, 2015–2025, ten reporters, complete partner-country edges) with a 0.95 coverage gate, aggregate-partner exclusion and deterministic descriptive metrics (partner HHI, top partner share, China share, Germany share, diversification, weighted volume, partner degree ratio).
- Method: panel cluster-robust inference now uses a Student-t reference with G−1 degrees of freedom, explicit small-cluster warnings (G<20) and a hard block below 8 clusters; HC1 remains asymptotic and separate; wild cluster bootstrap stays a reserved interface (unavailable, no fake implementation); panel results carry full provenance (platform/dataset/schema/engine versions).
- Method: offline Python (statsmodels/scipy) reference fixtures cross-check panel coefficients, standard errors, R², within R² and t-based p-values in CI; ordering invariance, singular-matrix and unbalanced-panel QA added.
- Fix: research package filename now derives from canonical release metadata (no more hardcoded version in the zip name).
- Breaking: none. Composite formulas, weights, scenario definitions, canonical observations and public routes are unchanged.

## v1.2 Advanced Analysis Data Foundation - 2026-08-21

- Major: added a traceable 2015–2025 annual panel, formal coverage gates and transparent OLS/fixed-effects estimation.
- Method: registered bilateral-network contracts and deterministic metrics while retaining data-building status until complete partner edges existed.
- Breaking: none.

## v1.1 Architecture & Interface Refactor - 2026-08-21

- Major: reorganized public pages around research workflows and moved technical records into progressive disclosure and a versioned research package.
- Breaking: none.

## v1.0 Research Atlas - 2026-08-20

- Major: froze the public research boundary, canonical release metadata, reproducible provenance and final release gates.
- Method: retained all v0.95 model formulas, weights, scenario shock ranges and transmission definitions; separated numerical validation, passed gates and expected-unavailable cases.
- Public delivery: moved the canonical public URL to `https://hy-central-europe-analysis.org/`, added legal/privacy notices and retained all route paths, stable IDs, formulas, weights and observations.

## v0.95 Research Release Candidate - 2026-08-19

- Major: consolidated public navigation, release status, citations, stable research URLs and trace views.
- Method: separated expected-unavailable validation gates from failed numerical tests and added release provenance exports.
- Breaking: none. Existing public routes and the GitHub Pages base path remain stable.

## v0.91 Validation

- Major: added deterministic validation, golden cases, boundary checks and CI blocking.
- Method: expected unavailable outputs are treated as valid gates, not numerical results.
- Breaking: none.

## v0.90 Transmission Scenarios

- Major: connected scenario shocks, adjusted inputs, model outputs and evidence traces.
- Method: scenario assumptions remain isolated from canonical observations.
- Breaking: none.

## v0.89 Regional Economy

- Major: harmonized regional economic observations, rankings and historical-change records.
- Method: regional comparisons require common level, definition, unit and year.
- Breaking: Serbia regional comparison remains pending; national data remain available.

## v0.80-v0.88 Evidence And Spatial Foundation

- Major: added China-exposure evidence dimensions, regional keys, boundaries, licenses and factual regional comparison.
- Method: public map display requires source, geometry, topology, key and quality gates.
- Breaking: no regional risk layer was introduced.

## v0.30-v0.76 Data, Events And Transparent Analysis

- Major: established canonical data, coded events, verified China-related projects, transparent models, scenarios and ten-country data parity.
- Method: all analytical outputs retain source, status, period, formula, weight and completeness traces.
- Breaking: no missing values were imputed and no forecast API was introduced.
