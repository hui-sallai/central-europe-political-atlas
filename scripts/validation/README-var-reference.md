# Official VAR reference environment

The TypeScript reduced-form VAR engine is validated against an isolated Python reference environment. This reference is a numerical cross-check, not the production runtime.

## Reproduce

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r scripts/validation/requirements-var-reference.txt
.venv\Scripts\python scripts/validation/generate-var-reference.py
pnpm.cmd analysis:validate
```

Pinned packages are listed in `requirements-var-reference.txt`. The generated `var_reference_cases.json` records:

- Python, NumPy, SciPy and statsmodels versions;
- deterministic simulation and random-walk seeds;
- an independent statsmodels OLS construction for ADF with a constant and 11 monthly dummies, including coefficient, standard error, tau statistic and common-sample lag selection;
- fixture generation date;
- generator version.

Regeneration changes must be reviewed together with the generator, pinned requirements and TypeScript validation tolerances. A generated fixture alone is not evidence of correctness.

The seasonal-dummy ADF OLS fixture deliberately does not call `statsmodels.adfuller` as though it supported exogenous seasonal dummies. The v1.44 decision rule is generated separately by `generate-seasonal-adf-calibration.py`: nine sample-size nodes, 50,000 Monte Carlo replications per node, fixed seed, exact production AIC/sample/tau design and no pseudo empirical p-value. HEGY seasonal-unit-root testing remains unavailable and Zivot-Andrews remains registry-only.
