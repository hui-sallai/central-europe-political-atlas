# Changelog

Public research releases are summarized here. Historical implementation QA remains in the data records and methodology appendix; this file records only major public changes, methodological changes and breaking changes.

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
