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
- fixture generation date;
- generator version.

Regeneration changes must be reviewed together with the generator, pinned requirements and TypeScript validation tolerances. A generated fixture alone is not evidence of correctness.
