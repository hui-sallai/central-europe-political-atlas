#!/usr/bin/env python3
"""v1.86 reference fixtures for the selection-aware bootstrap engine (phase code 0 seeds only).

Checks, all on synthetic fixtures:
 1. the v1.86 DGP generator reproduces the frozen v1.85 generator exactly under the v1.85 entropy;
 2. identity replay: resampling indices 0..n-1 (iid) or all-positive signs (wild) reproduces the original sample;
 3. an independent slow implementation (per-sample loops, independent BIC, reference-validated v1.85 common.pt_adjusted)
    reproduces the fast engine's bootstrap lags and statistics for replayed draws;
 4. BIC selection agrees with statsmodels VAR.select_order for constant-only fixtures;
 5. bootstrap p-value arithmetic and same-seed determinism.
Usage: reference.py [--check]  (--check re-runs and requires identical output to the committed validation file)
"""
from __future__ import annotations

import json
import sys
from math import floor, log
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import engine  # noqa: E402
from common import BASE_ENTROPY as V185_ENTROPY, fit_var, pt_adjusted  # noqa: E402  (frozen v1.85)
from simulate import simulate_batch as v185_simulate_batch, select_bic_lags  # noqa: E402  (frozen v1.85)

OUTPUT = engine.ROOT / "src" / "data" / "macro" / "var_selection_bootstrap_reference_validation.json"
TOLERANCE = 1e-8
FIXTURES = [
    {"cell_id": "ref_T120_p1_r0.80_constant", "sample_size": 120, "true_lag": 1, "persistence": 0.8, "deterministic_spec": "constant", "innovation": "gaussian_iid"},
    {"cell_id": "ref_T132_p2_r0.95_months", "sample_size": 132, "true_lag": 2, "persistence": 0.95, "deterministic_spec": "constant_plus_11_month_dummies", "innovation": "gaussian_iid"},
    {"cell_id": "ref_T144_p2_r0.50_constant", "sample_size": 144, "true_lag": 2, "persistence": 0.5, "deterministic_spec": "constant", "innovation": "gaussian_iid"},
    {"cell_id": "ref_T120_p1_r0.95_months_t5", "sample_size": 120, "true_lag": 1, "persistence": 0.95, "deterministic_spec": "constant_plus_11_month_dummies", "innovation": "multivariate_t5_scaled_to_covariance"},
]


def independent_bic(sample: np.ndarray, months: np.ndarray, deterministic_spec: str) -> int:
    """Independent loop implementation of the production BIC policy (common sample, statsmodels convention)."""
    total = len(sample)
    maximum = max(1, min(12, floor((total - 4) / (4 * 3 + 1))))
    best, best_value = None, np.inf
    for lag in range(1, maximum + 1):
        subset, subset_months = sample[maximum - lag:], months[maximum - lag:]
        fit = fit_var(subset, subset_months, lag, deterministic_spec)
        n = fit.residuals.shape[0]
        sigma = fit.residuals.T @ fit.residuals / n
        value = np.log(np.linalg.det(sigma)) + log(n) / n * (lag * 9 + 3 * engine.deterministic_columns(deterministic_spec))
        if value < best_value - 1e-12:
            best, best_value = lag, value
    return best


def independent_bootstrap(values, months, deterministic_spec, lag, family, indices=None, signs=None, coefficients=None, residuals=None, fixed_lag=None):
    """Column-vector recursion with per-sample loops, independent of engine.bootstrap_samples."""
    fit = fit_var(values, months, lag, deterministic_spec)
    nd = engine.deterministic_columns(deterministic_spec)
    coefficients = fit.coefficients if coefficients is None else coefficients
    residuals = fit.residuals if residuals is None else residuals
    A = [coefficients[nd + 3 * (i - 1): nd + 3 * i].T for i in range(1, lag + 1)]
    out = []
    draws = len(indices) if indices is not None else len(signs)
    for b in range(draws):
        y = np.array(values[:lag], dtype=float).tolist()
        for t in range(lag, len(values)):
            d = fit.regressors[t - lag, :nd] @ coefficients[:nd]
            ar = sum(A[i - 1] @ np.array(y[t - i]) for i in range(1, lag + 1))
            if family == "recursive_iid_residual":
                shock = residuals[indices[b][t - lag]] - residuals.mean(axis=0)
            else:
                shock = residuals[t - lag] * signs[b][t - lag][0]
            y.append((d + ar + shock).tolist())
        out.append(np.array(y))
    results = []
    for sample in out:
        chosen = independent_bic(sample, months, deterministic_spec) if fixed_lag is None else fixed_lag
        refit = fit_var(sample, months, chosen, deterministic_spec)
        results.append((chosen, pt_adjusted(refit.residuals, chosen, 12)["p_value"]))
    return results


def run() -> dict:
    record = {"schema_version": "var-selection-bootstrap-reference-validation-v1.86", "tolerance": TOLERANCE, "checks": {}, "actual_country_data_read": False}
    discrepancy = 0.0

    # 1. DGP equivalence with the frozen v1.85 generator (v1.85 entropy; no v1.85 spawn key is consumed for results).
    dgp = []
    for index, fixture in enumerate(FIXTURES + [{**FIXTURES[0], "cell_id": "ref_serial_common", "serial_pattern": "common", "serial_rho": 0.2}]):
        key = (0, 99, index)
        new_values, new_months = engine.simulate_dgp(fixture, 3, key, entropy=V185_ENTROPY)
        old_values, old_months = v185_simulate_batch(fixture, 3, key)
        diff = float(np.max(np.abs(new_values - old_values)))
        dgp.append({"cell_id": fixture["cell_id"], "max_abs_difference": diff, "months_identical": bool(np.array_equal(new_months, old_months))})
        discrepancy = max(discrepancy, diff)
    record["checks"]["dgp_matches_v1_85_generator"] = {"cases": dgp, "pass": all(c["max_abs_difference"] == 0.0 and c["months_identical"] for c in dgp)}

    identity, independent, statsmodels_cases, determinism = [], [], [], []
    for index, fixture in enumerate(FIXTURES):
        values, months = engine.simulate_dgp(fixture, 1, (0, index, 0, 0))
        values = values[0]
        lag = int(select_bic_lags(values[None], months, fixture["deterministic_spec"])[0])
        residuals, _, coefficients = engine.fit_batch(values[None], months, lag, fixture["deterministic_spec"])
        residuals, coefficients = residuals[0], coefficients[0]
        n = len(values) - lag

        # 2. identity replay
        same_iid = engine.bootstrap_samples(values, months, lag, fixture["deterministic_spec"], coefficients, residuals, "recursive_iid_residual", None, indices=np.arange(n)[None])
        same_wild = engine.bootstrap_samples(values, months, lag, fixture["deterministic_spec"], coefficients, residuals, "recursive_wild_rademacher", None, signs=np.ones((1, n, 1)))
        diff = max(float(np.max(np.abs(same_iid[0] - values))), float(np.max(np.abs(same_wild[0] - values))))
        identity.append({"cell_id": fixture["cell_id"], "selected_lag": lag, "max_abs_difference": diff})
        discrepancy = max(discrepancy, diff)

        # 3. independent slow implementation on replayed draws
        rng = engine.generator(engine.BASE_ENTROPY, (0, index, 1, 0))
        indices = rng.integers(0, n, size=(12, n))
        signs = rng.integers(0, 2, size=(12, n, 1)) * 2.0 - 1.0
        for family, kwargs in (("recursive_iid_residual", {"indices": indices}), ("recursive_wild_rademacher", {"signs": signs})):
            fast = engine.bootstrap_samples(values, months, lag, fixture["deterministic_spec"], coefficients, residuals, family, None, **kwargs)
            fast_tau, fast_lag = engine.bootstrap_taus(fast, months, fixture["deterministic_spec"], None)
            slow = independent_bootstrap(values, months, fixture["deterministic_spec"], lag, family, **kwargs)
            lag_match = all(int(a) == b for a, (b, _) in zip(fast_lag, slow))
            tau_diff = float(max(abs(a - c) for a, (_, c) in zip(fast_tau, slow)))
            independent.append({"cell_id": fixture["cell_id"], "family": family, "draws": 12, "bootstrap_lags_identical": lag_match, "max_abs_tau_difference": tau_diff, "bootstrap_lags": [int(x) for x in fast_lag]})
            discrepancy = max(discrepancy, tau_diff)

        # 4. statsmodels select_order agreement (constant-only fixtures)
        if fixture["deterministic_spec"] == "constant":
            from statsmodels.tsa.api import VAR
            maximum = max(1, min(12, floor((len(values) - 4) / 13)))
            selected = int(VAR(values).select_order(maxlags=maximum, trend="c").selected_orders["bic"])
            statsmodels_cases.append({"cell_id": fixture["cell_id"], "platform_bic_lag": lag, "statsmodels_bic_lag": selected, "independent_bic_lag": independent_bic(values, months, "constant")})

        # 5. determinism
        a = engine.run_procedure(values, months, fixture["deterministic_spec"], lag, None, "recursive_iid_residual", engine.generator(engine.BASE_ENTROPY, (0, index, 2, 0)))
        b = engine.run_procedure(values, months, fixture["deterministic_spec"], lag, None, "recursive_iid_residual", engine.generator(engine.BASE_ENTROPY, (0, index, 2, 0)))
        determinism.append({"cell_id": fixture["cell_id"], "identical": a == b})

    # 3b. higher-lag paths: bootstrap from known strong lag-2 / lag-3 coefficients so bootstrap samples select lags > 1,
    #     and the fixed-lag route of the fixed_true_lag procedure.
    higher = []
    for index, (fixture, lag, blocks) in enumerate(((FIXTURES[1], 2, (0.3, 0.4)), (FIXTURES[2], 3, (0.2, 0.15, 0.45)))):
        values, months = engine.simulate_dgp(fixture, 1, (0, 10 + index, 0, 0))
        values = values[0]
        spec = fixture["deterministic_spec"]
        nd = engine.deterministic_columns(spec)
        coefficients = np.vstack([np.full((nd, 3), 0.01)] + [scale * np.eye(3) for scale in blocks])
        rng = engine.generator(engine.BASE_ENTROPY, (0, 10 + index, 1, 0))
        n = len(values) - lag
        residuals = rng.standard_normal((n, 3))
        indices = rng.integers(0, n, size=(12, n))
        signs = rng.integers(0, 2, size=(12, n, 1)) * 2.0 - 1.0
        for family, kwargs in (("recursive_iid_residual", {"indices": indices}), ("recursive_wild_rademacher", {"signs": signs})):
            fast = engine.bootstrap_samples(values, months, lag, spec, coefficients, residuals, family, None, **kwargs)
            for fixed in (None, lag):
                fast_tau, fast_lag = engine.bootstrap_taus(fast, months, spec, fixed)
                slow = independent_bootstrap(values, months, spec, lag, family, coefficients=coefficients, residuals=residuals, fixed_lag=fixed, **kwargs)
                tau_diff = float(max(abs(a - c) for a, (_, c) in zip(fast_tau, slow)))
                higher.append({"generating_lag": lag, "family": family, "lag_rule": "bic_rerun" if fixed is None else "fixed", "bootstrap_lags": [int(x) for x in fast_lag], "bootstrap_lags_identical": all(int(a) == b for a, (b, _) in zip(fast_lag, slow)), "max_abs_tau_difference": tau_diff})
                discrepancy = max(discrepancy, tau_diff)
    record["checks"]["higher_lag_paths"] = {"cases": higher, "pass": all(c["bootstrap_lags_identical"] and c["max_abs_tau_difference"] <= TOLERANCE for c in higher) and any(max(c["bootstrap_lags"]) >= 2 for c in higher if c["lag_rule"] == "bic_rerun")}
    record["checks"]["identity_replay"] = {"cases": identity, "pass": all(c["max_abs_difference"] <= TOLERANCE for c in identity)}
    record["checks"]["independent_slow_implementation"] = {"cases": independent, "pass": all(c["bootstrap_lags_identical"] and c["max_abs_tau_difference"] <= TOLERANCE for c in independent)}
    record["checks"]["statsmodels_bic_agreement"] = {"cases": statsmodels_cases, "pass": all(c["platform_bic_lag"] == c["statsmodels_bic_lag"] == c["independent_bic_lag"] for c in statsmodels_cases) and len(statsmodels_cases) >= 2}
    p_cases = [(0.5, np.linspace(0.0, 1.0, 199), (1 + 100) / 200), (0.0, np.full(199, 0.3), 1 / 200), (0.3, np.full(199, 0.3), 1.0)]
    record["checks"]["p_value_arithmetic"] = {"pass": all(abs(engine.bootstrap_p_value(t, arr) - expected) < 1e-15 for t, arr, expected in p_cases)}
    record["checks"]["same_seed_determinism"] = {"cases": determinism, "pass": all(c["identical"] for c in determinism)}
    record["maximum_numerical_discrepancy"] = discrepancy
    record["status"] = "pass" if all(check["pass"] for check in record["checks"].values()) else "fail"
    return record


def main() -> None:
    text = json.dumps(run(), indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text() != text:
            raise SystemExit("reference re-run differs from committed reference validation")
        print(json.dumps({"status": json.loads(text)["status"], "reproduced": True}))
        return
    OUTPUT.write_text(text)
    payload = json.loads(text)
    print(json.dumps({"status": payload["status"], "maximum_numerical_discrepancy": payload["maximum_numerical_discrepancy"], **{k: v["pass"] for k, v in payload["checks"].items()}}, indent=2))
    if payload["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
