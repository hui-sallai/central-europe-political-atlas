# v1.85 VAR Residual Diagnostic Calibration — Phase A Owner Report

Phase A is complete. This is a research-only result. It does not change the formal v1.84 release, the production VAR path, country readiness, or dynamic-response availability.

> **Deployment status superseded.** Items 2–3 and 55–57 below record the status at the time this report was written. Afterwards, commit `961f869` entered `main` and was deployed. See [Deployment reconciliation](#deployment-reconciliation) at the end of this report. The original wording is kept unchanged as a historical record.

1. **Starting commit:** `1b13fc1c8eaa804ef3b5ea5173c8ef01081afb3b`.
2. *(Superseded — see Deployment reconciliation.)* **Formal version:** v1.84 remains unchanged; v1.85 is a research-program label only.
3. *(Superseded deployment status — see Deployment reconciliation.)* **Current deployed SHA:** `1b13fc1c8eaa804ef3b5ea5173c8ef01081afb3b`, verified from the live release manifest and GitHub `main` after Phase A.
4. **Research preregistration file:** `src/data/macro/var_residual_diagnostic_preregistration.json`; clerical hash correction preserved in `var_residual_diagnostic_preregistration_amendment_001.json`.
5. **Preregistration hash:** `f9ddab6a8ff77026b83caeca1024bf8b0379a470792fb5410e3d99607818bb0b`.
6. **Candidate tests frozen:** adjusted Portmanteau, multivariate BG LM, and Edgerton–Shukur F only; no fourth test was added.
7. **Current PT formula/reference:** `Q_h* = T^2 sum[j=1..h] trace(C_j' C_0^-1 C_j C_0^-1)/(T-j)`, compared with statsmodels 0.14.6 and R `vars` 1.6-1, following Lütkepohl (2005, sec. 4.4.3).
8. **BG formula/reference:** `LM_h = T(K - trace(Sigma_R^-1 Sigma_e))`, chi-square with `hK^2` degrees of freedom; Breusch (1978), Godfrey (1978), Lütkepohl, and R `vars` 1.6-1.
9. **ES formula/reference:** the registered determinant-ratio Edgerton–Shukur small-sample F transform, with `df1=hK^2` and registered finite-sample `df2`; Edgerton and Shukur (1999) and R `vars` 1.6-1.
10. **Python reference environment:** Python 3.13.15, NumPy 2.5.2, SciPy 1.18.1, statsmodels 0.14.6.
11. **R reference environment:** R 4.6.1 on `aarch64-apple-darwin23`; MASS 7.3.65, lmtest 0.9-40, sandwich 3.1-3, urca 1.3-4, strucchange 1.6-0.
12. **`vars` package version:** 1.6-1; source archive SHA-256 `9b3df03232fbedd30a89af10b20b540fce20ddd36602853857d47242d66f14c5`.
13. **Reference Case 1 alignment:** passed for the adjusted PT statistic against statsmodels and R; independent PT statistic `106.52425502850085`, R difference below registered tolerance.
14. **Reference Case 2 alignment:** passed for PT, BG, and ES; statistics `82.9033693148098`, `105.70469672455849`, and `0.9036350982328122` respectively.
15. **Reference Case 3 alignment:** passed with 11 month dummies for PT, BG, and ES; statistics `103.44903767179086`, `124.01382978998875`, and `0.9841742528426785`.
16. **Reference Case 4 alignment:** passed under clear residual misspecification; all three tests reject at 5%. The earlier same-seed insufficient fixture is retained as failed reference-design evidence and was not used for selection.
17. **Maximum numerical discrepancy:** `8.256506589532364e-12`, below the registered `1e-8` tolerance; fallback tolerance was not used.
18. **Seed namespace:** `var_residual_diagnostic_v185`, base entropy `[185, 20260927, 1]`, NumPy `SeedSequence` plus `PCG64DXSM` with deterministic per-cell and per-chunk spawn keys.
19. **Duplicate-seed audit:** passed; repository token search and prior known namespaces found no duplicate. Prefixes 2, 3, and 4 are now recorded as completely used; screening prefix 1 and independent-validation prefix 5 remain unused.
20. **Primary sample-size grid:** `T = {120,132,144}`.
21. **Lag grid:** primary true `p = {1,2}`; secondary stress also includes `p=3`.
22. **Persistence grid:** spectral-radius targets `{0.50,0.80,0.95}`.
23. **Deterministic-spec grid:** constant; constant plus 11 month dummies.
24. **Innovation grid:** primary Gaussian iid; secondary null stress adds covariance-matched multivariate `t(5)`.
25. **Primary replication count:** 10,000 per cell, 72 cells, 720,000 total.
26. **Total simulations:** 2,160,000 across 8,640 atomic checkpoints: 720,000 primary, 576,000 secondary null stress, and 864,000 serial-alternative power.
27. **PT adjusted null-size summary:** primary h=12 rejection rates `0.0406–0.4523`; 27/72 cells lie in `[0.035,0.065]`.
28. **BG null-size summary:** primary h=12 rejection rates `0.0306–0.3781`; 22/72 cells lie in `[0.035,0.065]`.
29. **ES null-size summary:** primary h=12 rejection rates `0.0353–0.1288`; 57/72 cells lie in `[0.035,0.065]`. ES passes all 36 fixed-true-lag Layer A cells, but fails the joint Layer A+B system gate because Layer B reaches `0.1288` and only 21/36 Layer B cells are inside the strict interval.
30. **PT worst-case size:** `0.4523`, absolute distortion `0.4023`, in Layer B at `T=120`, true `p=2`, persistence `0.95`, and month dummies.
31. **BG worst-case size:** `0.3781`, absolute distortion `0.3281`, in the same Layer B design.
32. **ES worst-case size:** `0.1288`, absolute distortion `0.0788`, in Layer B at `T=144`, true `p=2`, persistence `0.95`, and month dummies.
33. **PT percentage within 0.035–0.065:** 37.50%.
34. **BG percentage within 0.035–0.065:** 30.56%.
35. **ES percentage within 0.035–0.065:** 79.17%.
36. **PT system-level eligibility:** failed; maximum exceeds 0.075 and fewer than 90% of cells are inside the strict interval.
37. **BG system-level eligibility:** failed on both registered conditions.
38. **ES system-level eligibility:** failed on both registered conditions, despite passing all fixed-lag Layer A cells.
39. **Power summary:** report-only h=12 cell ranges/medians/means are PT `0.0310–0.8565 / 0.23075 / 0.26462`, BG `0.0315–0.6975 / 0.22275 / 0.22258`, and ES `0.0340–0.4680 / 0.07225 / 0.10341`. Power did not enter method selection. Per-cell estimates, MCSEs, and exact 95% Clopper–Pearson intervals are retained in the simulation-results artifact.
40. **Selected diagnostic under the preregistered rule:** none; disposition is `no_eligible_replacement`.
41. **Whether current PT is retained:** operationally unchanged as the existing production diagnostic, but not endorsed as size-calibrated. No replacement is authorized and formal dynamic responses remain unavailable.
42. **Whether an alternative replacement is eligible:** no. ES is the closest candidate but does not pass the registered system gate.
43. **Stress-design results:** report-only h=12 null-stress ranges/medians/means are PT `0.0320–0.4955 / 0.1735 / 0.17428`, BG `0.0260–0.7115 / 0.15975 / 0.20861`, and ES `0.0305–0.1350 / 0.0545 / 0.05706`. These stress cells did not enter selection.
44. **Country-calibrated stress:** not run.
45. **Actual-country new test applied:** false.
46. **Actual-country readiness changed:** false.
47. **VAR engine production path changed:** false; `src/lib/varEngine.ts` remains hash-identical.
48. **VAR readiness hashes:** engine `0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac`; country readiness `4b8173f8202c72359758b0bf4b05ef08a6c089f2ab47f79b7be359468c97e6b1`; v1 `f210b02ec3042c5cf95f975bccbd94f7fead0f403314d59a1e760a2046c5912e`; v2 `b7fd4bec330ebd4db588ed63bce4de988773556b8cdc572c27f640239a2a1675`; exploratory `9774fa8bc87f5d84cc867e4e60bb7b1ca1a1aa432d3d81979d275caca6c3ac08`; lag grid `2d1753188a9b5b7c8bb6f322eb53fd4241205f2d8789904498024e3a6ecd19d9`.
49. **Panel frozen SHA:** `10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc`, unchanged.
50. **Historical closure status:** passed; historical research remains closed, Design A blocked, no panel estimation or formal-sample change.
51. **Validation results:** independent v1.85 validator passed 8,640 checkpoints and 2,160,000 replications; reference validation passed; VAR readiness 39/39; analysis registry 202 checks; Panel closure passed; LP 663 tests; research validation has zero failed/blocking cases; advanced analysis has zero failures; security, lint, typecheck, static build, and release QA all passed. The first sandboxed build attempt failed only because the sandbox prohibited Turbopack from binding a local port; the same build passed outside that restriction.
52. **Unresolved methodological issues:** all three candidates fail the preregistered joint platform gate. The large Layer B distortions show that diagnostic calibration cannot be separated from lag-selection/finite-sample interaction. ES is well calibrated when the true lag is fixed in this design, but that conditional result cannot be promoted to a platform replacement.
53. **Owner decision required:** accept Phase A closure and preserve the no-real-data-application boundary. Any Phase B or new research design requires explicit owner approval and a new preregistration where applicable.
54. **Recommended Phase B decision:** do not authorize Phase B real-country comparison, because no alternative is eligible. Keep formal IRFs unavailable and treat a new lag-selection/diagnostic joint-calibration design as a separate future program rather than extending this stopped Phase A.
55. *(Superseded deployment status — see Deployment reconciliation.)* **Commit status:** research artifacts are committed locally on `research/v185-var-residual-diagnostics`; they are not merged into `main`.
56. *(Superseded deployment status — see Deployment reconciliation.)* **Push status:** not pushed. GitHub `main` remains at the v1.84 SHA.
57. *(Superseded deployment status — see Deployment reconciliation.)* **Deploy status:** not deployed. The live release manifest remains v1.84 at the v1.84 SHA.

## Research artifacts

- Full cell-level results: `src/data/macro/var_residual_diagnostic_simulation_results.json`
- Calibration summary: `src/data/macro/var_residual_diagnostic_calibration_summary.json`
- Frozen method decision: `src/data/macro/var_residual_diagnostic_method_decision.json`
- Reference validation: `src/data/macro/var_residual_diagnostic_reference_validation.json`
- Seed registry: `src/data/macro/var_residual_diagnostic_seed_registry.json`

The formal dynamic-response-ready country count remains zero. No threshold, seed, candidate list, or selection rule was changed after results were observed.

## Deployment reconciliation

This section was added in the v1.85 closure release. It corrects the deployment facts in items 2–3 and 55–57 without deleting them.

- **What was prepared:** Phase A was prepared as research-only work under the owner push/deploy boundary. It was committed on `research/v185-var-residual-diagnostics` as a separate owner decision point.
- **What actually happened:** commit `961f86972e55358e4f72bec1dddf29e781c79dd3` ("Complete v1.85 VAR residual calibration research") then entered `main`. GitHub Pages workflow run `36315057237` deployed it successfully. The live release manifest reported `source_commit` `961f869…` and `workflow_run_id` `36315057237`, while the formal release metadata still read v1.84 "VAR Readiness & Publication Boundary Convergence".
- **Effect of that deployment:** the research artifacts in `src/data/macro/` and the scripts became public in the repository. No production path changed: `src/lib/varEngine.ts`, country readiness, the lag policy, the capability registry and the site UI were all identical to v1.84. The formal dynamic-response-ready count stayed at zero, and no formal IRF was published.
- **Superseded statements:** item 3 (deployed SHA `1b13fc1c…`), item 55 ("not merged into `main`"), item 56 ("not pushed; GitHub `main` remains at the v1.84 SHA") and item 57 ("not deployed") were accurate when written, but became outdated once `961f869` was deployed. Item 2 ("v1.85 is a research-program label only") is superseded by the formal v1.85 closure release.
- **Formal closure:** v1.85 "VAR Residual Diagnostic Research Closure & Dynamic-Response Gate Boundary Hardening" publishes the research conclusion (`var_residual_diagnostic_research_conclusion.json`). The method decision, thresholds, simulation results and production engine are unchanged, and no new research was run.

## Layer-B interpretation clarification (v1.851)

This section was added on 2026-09-28 in v1.851. It clarifies how the Layer-B figures above should be read. The report above is kept unchanged. The research decision is unchanged: no eligible replacement, Phase B not authorized, ES not activated, no readiness change, and formal IRF publication unavailable.

- **Layer A** estimates the VAR at the known true lag. Under the null DGP and correct specification, its rejection frequency is the finite-sample size of the diagnostic (conditional diagnostic size).
- **Layer B** first selects the lag with the platform BIC rule and then runs the diagnostic. When the selected lag is below the true lag, the fitted VAR is underfitted and residual whiteness need not hold. Layer-B rejection frequencies are therefore selection-plus-specification-plus-diagnostic *procedure* rejection rates. They are not pure test size, and describing them as "diagnostic size distortion" (for example item 52's "large Layer B distortions") overstates what they identify. The preferred description is "joint procedure gate failure".
- **Selection decomposition.** All figures below come from `var_residual_diagnostic_layerB_selection_decomposition.json`, which is derived deterministically from the frozen simulation results with no new draws.
  - True lag 1: BIC selects the true lag in 100.00% of replications with a constant only, and in 99.99% with month dummies.
  - True lag 2: BIC underselects in 99.81% of replications (constant only) and in 99.70% (month dummies).
- **Worst Layer-B ES cell** (`primary_LB_T144_p2_r0.95_det-constant_plus_11_month_dummies_innov-gaussian_iid`): BIC chose lag 1 in 9942 replications and lag 2 in 58; the ES rejection rate was 0.1288. The high rejection frequency coincides with near-complete underselection. The replication-level joint distribution was not retained, so no share of rejections can be attributed to underselection.
- **ES:** conditional fixed-lag calibration is strong (36/36 Layer-A cells inside 0.035–0.065, max 0.0599). The full BIC-selection procedure did not satisfy the preregistered activation gate. Because the preregistered rule requires Layer A and Layer B together, ES remains ineligible.
- **PT and BG:** both failed the preregistered platform-level gate and also performed poorly in fixed-lag Layer A relative to ES. This is not a finding that either statistic is invalid, and no claim is made about BIC.
- **Future work:** "VAR Lag-Selection × Residual-Diagnostic Joint Procedure Research" (v1.86) is registered as not started. It requires owner approval and a new preregistration. See `var_residual_diagnostic_research_conclusion_amendment_001.json`.
