# Central Europe Political Atlas

Central Europe Political Atlas is a public political-economy research platform for ten Central and Eastern European countries. It combines traceable national and regional observations, coded events, China-related project evidence, transparent model cards and conditional scenario analysis.

Public site: https://hy-central-europe-analysis.org/

Current release: **v1.8 Aggregate-Shock Panel Local Projections & Euro / Non-Euro Transmission Heterogeneity**

v1.72 preserves the 44 v1.71 baseline models and adds finite-sample Monte Carlo diagnostics, concentration-based shock support, exhaustive eligible shock-month/event deletion audits, and independent full-path covariance checks. Bias correction remains `registry_only`: the official Fed ZIP contains accessible paper assets, not executable replication code. Simulations describe stylized fixed-p designs, not estimated coverage or bias of the real models.

Offline diagnostic regeneration: `pnpm lp:finite-sample` and `pnpm lp:shock-support`, followed by `pnpm lp:loo-validate` and `pnpm export:research-data`. Release validation checks frozen-input hashes and does not silently rerun the Monte Carlo grid. Month deletion removes a regression row; event deletion removes its frozen joint shock contribution from current and lagged regressors without re-estimating the rotation.

## Research scope

- 10 country profiles and a shared canonical observation schema.
- Factual regional comparison maps for 9 countries; Serbia remains available at national level while regional comparison is pending.
- 4 transparent, rule-based models with input traces, published weights, completeness and confidence; formal cross-country comparisons require the same model version, formula, weight and input year.
- An annual 2015–2025 econometric panel with cluster-robust Student-t (G−1) inference, small-cluster gates and offline Python reference validation.
- An activated bilateral goods trade network (UN Comtrade, complete partner edges, 0.95 coverage gate) with deterministic descriptive concentration metrics.
- A per-country monthly reduced-form VAR workbench with constant-only and seasonal-control formal baselines, profile-mapped stationarity gates, descriptive persistence and structural-break readiness diagnostics, strict `estimable` versus `dynamic_response_ready` states, h=12/18/24 residual sensitivity diagnostics, and ordering-dependent orthogonalized point responses. SVAR, seasonal-unit-root tests, structural-break estimators, residual LM and uncertainty intervals remain unavailable.
- A separate monthly macro-driver layer for policy rates, long-term government yields, bilateral and effective exchange rates, HICP Energy, Brent and European natural gas, with source checksums, timing conventions and machine-readable identification status.
- An audited ECB high-frequency monetary-policy layer built from EA-MPD and EA-EMPD. The frozen v1.62 Jarociński–Karadi construction continues to reproduce PC1, poor-man, deterministic median-rotation and monthly series at published precision.
- v1.71 preserves all 44 single-country joint MP/CBI baselines, corrects the lag metadata, adds validated 95% plug-in sup-t path bands, and publishes fixed-lag, predetermined-control, shock-support, influence, conditioning and comparability diagnostics. Single-country significance bands, country-pair formal difference tests, state dependence, SVAR and Bayesian VAR remain unavailable. v1.8 separately adds fixed-eight-country aggregate-shock Panel LP group-difference inference.
- 4 conditional scenarios with baseline, shock assumption, adjusted input and result traces.
- Coded political-economy events and verified China-related project records.
- Deterministic validation, golden cases and a release QA gate.

The platform does not publish election forecasts, probability forecasts, investment advice or objective risk truths. Causal dynamic-response language is limited to the preregistered identified-shock Local Projection profile; missing, pending and sample records are never promoted to official data.

## Public routes

- `/map/` - factual regional map workbench
- `/countries/` - country entry and coverage summary
- `/data/` - observations, projects, dictionaries and QA
- `/news/` - Political Economy Event Library
- `/models/` - transparent model results and model cards
- `/scenarios/` - conditional scenario analysis
- `/methodology/` - methods, limitations, validation and citation
- `/legal/` - independence, copyright, data licensing and correction requests
- `/privacy/` - data minimisation, hosting logs and contact-email handling

The production build is served from the custom-domain root. `NEXT_PUBLIC_BASE_PATH` remains available only for local or fallback project-path testing and must not be set in the custom-domain deployment workflow.

The site intentionally contains no client-side API credentials, advertising trackers or first-party analytics. Secrets belong in local or repository environment settings and must never be committed.

## Local verification

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd run lint
pnpm.cmd run typecheck
pnpm.cmd run research:validate
pnpm.cmd run ecb:validate
pnpm.cmd run lp:build
pnpm.cmd run lp:reference
pnpm.cmd run lp:validate
pnpm.cmd run build
```

`pnpm.cmd run build` exports the public research data, runs deterministic research validation, builds the static site and validates routes, internal links, metadata and required exports.

## Research exports

Machine-readable files are published under `/research-data/`. See [the research-data schema guide](public/research-data/README.md) for stable IDs, status enums, formula versions, citation rules and analytical boundaries.

## Citation

Central Europe Political Atlas, version v1.8 Aggregate-Shock Panel Local Projections & Euro / Non-Euro Transmission Heterogeneity, accessed YYYY-MM-DD. https://hy-central-europe-analysis.org/

## Official VAR reference environment

The JavaScript estimator is checked against a pinned Python reference stack. Create an isolated environment and regenerate the fixture with:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r scripts/validation/requirements-var-reference.txt
.venv\Scripts\python scripts/validation/generate-var-reference.py
pnpm.cmd analysis:validate
```

The generated fixture records Python, NumPy, SciPy and statsmodels versions, deterministic seeds, generation date and generator version. This environment is for reference validation only; the public site runs the TypeScript engine.

The project currently does not claim a DOI. Cite original source URLs when using individual observations, events or project records.

Legal, copyright, privacy, correction and takedown contact: sallaizhang@outlook.com
