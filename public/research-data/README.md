# Central Europe Political Atlas research data

This directory contains the public research exports used by the static site.

Current release: **v1.61 Information-Effect Separation & Monetary Shock Calibration**. The canonical release definition is exported through `platform_metadata.json`; deployment provenance is recorded in `release_manifest.json`.

## Core schemas

- `countries`: stable country identifiers and country metadata.
- `indicators`: national indicator definitions, units, frequency and model eligibility.
- `observations`: country, indicator, period, value, unit, status and source trace.
- `sources`: source identifiers, URLs, reliability and usage rules.
- `events`: canonical event records are exported under `src/data/events`; the public event-related layers retain event links.
- `china_projects`: verified project records and related indicators/events.
- `model_cards` and `model_outputs`: formulas, weights, limitations and observation traces.
- `scenario_definitions` and `scenario_results`: shock assumptions, adjusted inputs and baseline/scenario results.
- `validation_registry` and `golden_test_cases`: executable validation evidence.
- `network_ui_pack`, `network_metrics` and `network_coverage`: activated bilateral goods trade network (UN Comtrade 2015–2025), descriptive concentration metrics and per-group coverage gates.
- `var_country_readiness`: public baseline and exploratory readiness summary; `estimable` is distinct from `dynamic_response_ready`.
- `macro-dynamics/var_specification_profiles.json`: fixed baseline and documented exploratory profile definitions, including profile-mapped stationarity specifications.
- `macro-dynamics/var_baseline_v1_readiness.json`, `var_baseline_v2_readiness.json` and `var_exploratory_readiness.json`: profile-specific readiness records and complete exploratory attempt logs.
- The versioned research package contains `seasonal_adf_critical_values.json`, `seasonal_adf_decision_comparison.json`, `stationarity_specification_registry.json`, `seasonal_stationarity_results.json`, `hegy_readiness_registry.json`, `structural_break_registry.json`, `persistence_diagnostics.json`, `var_lag_diagnostic_grid.json`, `var_country_readiness.json` and `var_model_registry.json`, plus the offline reference and calibration generators.
- `macro_driver_observations`, `macro_driver_dictionary` and `macro_driver_coverage`: the separate monthly driver layer for policy rates, yields, FX, HICP Energy and external commodity prices.
- `monetary_policy_event_observations.json`: audited EA-MPD and EA-EMPD event-window observations. The platform redistributes structured derived records and provenance, not the source workbooks.
- `ecb_policy_factor_registry.json`, `monetary_policy_information_effect_registry.json` and `ecb_event_dataset_overlap_registry.json`: factor availability, information-effect restrictions and cross-dataset overlap evidence.
- `ecb_monetary_policy_monthly_series.json`: descriptive monthly profiles derived from event-window observations; these profiles are not identified shocks.
- `monetary_policy_identification_method_registry`, `jk_replication_acquisition_manifest`, `information_effect_input_registry`, `information_effect_window_registry`, `jk_event_sample_registry`, `identification_specification_registry`, `jk_event_level_shocks`, the two withheld monthly separated-shock files, `information_effect_separation_validation` and `identification_regime_diagnostics`: the v1.61 JK method audit, diagnostic sample and formal blockers.
- `shock_identification_registry`, `driver_applicability_registry` and `lp_readiness_registry`: machine-readable identification, shared-scope and causal-readiness gates. v1.61 contains three external innovation proxies, zero identified shocks and no active Local Projections estimator.

## Stable IDs

Use `country_id`, `indicator_id`, `observation_id`, `source_id`, `project_id`, `event_id`, `model_id` and `scenario_id` as relation keys. Display names may change; IDs are the stable research interface.

## Status enums

Data status: `official`, `verified`, `calculated`, `derived`, `pending`, `sample`, `placeholder`.

Missing-data reason: `unavailable`, `pending_publication`, `not_applicable`, `insufficient_evidence`, `review_required`.

Source reliability: A (official/primary), B (authoritative secondary or official organizational records), C (supplementary), D (excluded/unverified/sample).

Validation semantics: `numeric_passed` means a numerical or deterministic check passed; `passed_gate` means a release or availability gate behaved as defined; `expected_unavailable` means unavailable was the expected and observed result; `partial` is a disclosed non-blocking limitation; `failed` and `not_tested` retain their literal meanings.

## Formula versions

Model cards and outputs retain `model_version`, `formula_version` and `weight_version`. Scenario results retain baseline records, requested and applied shock values, formula and weight versions, and calculation timestamps.

Frozen v1.0 model IDs: `household_economic_pressure`, `fiscal_pressure`, `external_vulnerability`, `industrial_dependency`.

Frozen v1.0 scenario IDs: `inflation_resurgence`, `eu_funds_delay`, `energy_price_shock`, `germany_demand_slowdown`.

## Release metadata

- `platform_metadata.json`: platform version, scope, status enums, citation and limitations.
- `release_manifest.json`: release provenance, data/model/scenario/validation versions and source commit at deployment.

## Citation

Use the platform version, access date, stable record ID and original source URL. A platform-level citation is provided in `platform_metadata.json`. The project does not claim a DOI.

## Boundaries

Exports support factual comparison and reproducibility. They are not election forecasts, probability forecasts, investment advice, causal estimates or objective risk truths. Pending/sample records must not be promoted to official data.

Reduced-form VAR outputs are conditional time-series descriptions. Formal baseline v1 uses constant-only ADF; formal baseline v2 uses the finite-sample calibrated seasonal-dummy ADF while preserving the v1.43 MacKinnon-c result as historical reference. Deterministic seasonality is not a seasonal-unit-root test, and historical candidate periods are never merged with statistically estimated breaks. HEGY, Zivot-Andrews, residual LM, VAR uncertainty intervals and SVAR are not active. Ordinary observed macro-driver movements remain noncausal. v1.7 separately activates single-country joint MP/CBI lag-augmented Local Projections using only the frozen author-reference JK identified shocks, common-horizon N>=96 gates, and independent Python reference validation.
