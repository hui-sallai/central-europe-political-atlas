# Generates offline reference cases for the v1.41 reduced-form VAR engine.
# Uses statsmodels (VAR, adfuller), numpy (eigvals) and scipy (cdf tables).
# Fixture innovations use a fixed NumPy seed, so regeneration is deterministic.
# Output: src/data/analysis/var_reference_cases.json
import json
import math
import os
import platform
from datetime import date

import numpy as np
import scipy
from scipy import stats as scipy_stats
import statsmodels
from statsmodels.tsa.api import VAR
from statsmodels.tsa.stattools import adfuller

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "src", "data", "analysis", "var_reference_cases.json")


def simulate_var(coefs, intercept, T, seed=42, burn=100):
    """Deterministic VAR(p) simulation; row-vector convention y_t = c + sum y_{t-i} A_i + u_t.
    Innovations come from a seeded MT19937 stream (stable across numpy versions),
    which keeps the fixture reproducible while avoiding degenerate signal spaces."""
    p, K, _ = coefs.shape
    rng = np.random.RandomState(seed)
    innovations = rng.normal(size=(T + burn, K)) * np.array([0.4, 0.32, 0.44])[:K]
    y = np.zeros((T + burn, K))
    for t in range(p, T + burn):
        value = np.array(intercept, dtype=float) + innovations[t]
        for i in range(p):
            value = value + y[t - 1 - i] @ coefs[i]
        y[t] = value
    return y[burn:]


def companion_moduli(coefs):
    p, K, _ = coefs.shape
    comp = np.zeros((K * p, K * p))
    for lag in range(p):
        comp[:K, lag * K:(lag + 1) * K] = coefs[lag]
    for block in range(p - 1):
        comp[(block + 1) * K:(block + 2) * K, block * K:(block + 1) * K] = np.eye(K)
    return sorted(np.abs(np.linalg.eigvals(comp)).tolist())


def manual_ic_table(data, maxlags):
    """statsmodels select_order convention: common sample T-maxlags for every candidate p>=1."""
    T, K = data.shape
    table = []
    for p in range(1, maxlags + 1):
        subset = data[maxlags - p:]
        res = VAR(subset).fit(p)
        sigma_mle = res.resid.T @ res.resid / res.nobs
        sign, ld = np.linalg.slogdet(sigma_mle)
        assert sign > 0
        free = p * K * K + K
        nobs = res.nobs
        table.append({
            "lag": p,
            "aic": ld + 2.0 / nobs * free,
            "bic": ld + math.log(nobs) / nobs * free,
            "hqic": ld + 2.0 * math.log(math.log(nobs)) / nobs * free,
            "nobs": int(nobs),
            "free_parameters": int(free),
        })
    return table


def portmanteau(resid, var_lags, h):
    T, K = resid.shape
    c0 = resid.T @ resid / T
    c0inv = np.linalg.inv(c0)
    q = 0.0
    for j in range(1, h + 1):
        cj = resid[j:].T @ resid[:-j] / T
        q += np.trace(cj.T @ c0inv @ cj @ c0inv) / (T - j)
    q *= T * T
    df = K * K * (h - var_lags)
    p_value = 1 - float(scipy_stats.chi2.cdf(q, df))
    return {"lags": h, "statistic": q, "degrees_of_freedom": df, "p_value": p_value}


def reference_for_case(name, data, maxlags, irf_horizons):
    T, K = data.shape
    ic_table = manual_ic_table(data, maxlags)
    selected = {criterion: int(min(ic_table, key=lambda row: row[criterion])["lag"]) for criterion in ("aic", "bic", "hqic")}
    p_sel = selected["bic"]
    res = VAR(data).fit(p_sel)
    params = np.asarray(res.params)  # (1 + K*p, K), const first
    intercepts = params[0].tolist()
    coef_mats = []
    for lag in range(p_sel):
        block = params[1 + lag * K: 1 + (lag + 1) * K, :]
        coef_mats.append(block.tolist())
    sigma_u = np.asarray(res.sigma_u).tolist()
    coefs_np = np.array(coef_mats)
    # statsmodels params convention: params rows are regressors, columns equations;
    # A_i[r][c] = params block row r col c (same as our engine). Companion uses A_i as stored.
    moduli = companion_moduli(coefs_np)
    irf = res.irf(max(irf_horizons))
    orth = np.asarray(irf.orth_irfs)  # [s, response, shock]
    irf_paths = []
    for shock in range(K):
        for response in range(K):
            irf_paths.append({
                "shock_index": shock,
                "response_index": response,
                "horizon": irf_horizons,
                "response": [float(orth[h, response, shock]) for h in irf_horizons],
            })
    port = portmanteau(np.asarray(res.resid), p_sel, 24)
    port_sensitivity = [portmanteau(np.asarray(res.resid), p_sel, horizon) for horizon in (12, 18, 24)]
    adf_results = []
    for col in range(K):
        stat, pvalue, usedlag, nobs, crit, icbest = adfuller(data[:, col], regression="c", autolag="AIC")
        adf_results.append({
            "column": col,
            "statistic": float(stat),
            "p_value": float(pvalue),
            "used_lag": int(usedlag),
            "nobs": int(nobs),
            "critical_values": {key: float(value) for key, value in crit.items()},
        })
    return {
        "name": name,
        "data": data.tolist(),
        "maxlags": maxlags,
        "ic_table": ic_table,
        "selected_lags": selected,
        "estimation": {
            "lag": int(p_sel),
            "intercepts": intercepts,
            "coefficient_matrices": coef_mats,
            "residual_covariance": sigma_u,
            "nobs": int(res.nobs),
        },
        "companion_root_moduli": moduli,
        "irf": {"horizons": irf_horizons, "paths": irf_paths},
        "portmanteau": port,
        "portmanteau_sensitivity": port_sensitivity,
        "adf": adf_results,
    }


def main():
    cases = {}

    # Case 1: stable VAR(2), K=3, T=180 — the main coefficient/IC/IRF/roots reference.
    A1 = np.array([[0.5, 0.1, 0.0], [0.2, 0.4, 0.1], [0.0, 0.1, 0.3]])
    A2 = np.array([[0.24, 0.0, 0.12], [0.0, 0.3, 0.0], [0.12, 0.0, 0.24]])
    coefs_stable = np.stack([A1, A2])
    data_stable = simulate_var(coefs_stable, [0.3, -0.2, 0.1], 180)
    assert max(companion_moduli(coefs_stable)) < 0.95, "stable fixture must be comfortably stable"
    cases["stable_var2_k3"] = reference_for_case("stable_var2_k3", data_stable, 8, [6, 12, 18, 24])

    # Case 2: unstable VAR(1), K=2 (root 1.02 > 1).
    coefs_unstable = np.array([[[1.02, 0.1], [0.0, 0.5]]])
    data_unstable = simulate_var(coefs_unstable, [0.1, 0.2], 160)
    res_unstable = VAR(data_unstable).fit(1)
    est_moduli = companion_moduli(np.asarray(res_unstable.params[1:]).reshape(1, 2, 2))
    cases["unstable_var1_k2"] = {
        "name": "unstable_var1_k2",
        "data": data_unstable.tolist(),
        "estimation": {"lag": 1, "coefficient_matrices": np.asarray(res_unstable.params[1:]).reshape(1, 2, 2).tolist()},
        "companion_root_moduli": est_moduli,
        "max_modulus_above_one": bool(max(est_moduli) > 1),
    }

    # Case 3: known-lag fixture — true VAR(2), BIC should select 2 with T=240.
    data_known_lag = simulate_var(coefs_stable, [0.3, -0.2, 0.1], 240)
    ic_known = manual_ic_table(data_known_lag, 8)
    cases["known_lag_var2"] = {
        "name": "known_lag_var2",
        "data": data_known_lag.tolist(),
        "ic_table": ic_known,
        "expected_bic_lag": 2,
        "bic_selected": int(min(ic_known, key=lambda row: row["bic"])["lag"]),
    }

    # Random-walk fixture for the unit-root level gate (deterministic, seeded).
    rng = np.random.RandomState(7)
    rw = 100 + np.cumsum(rng.normal(scale=0.55, size=180))
    stat, pvalue, usedlag, nobs, crit, _icbest = adfuller(rw, regression="c", autolag="AIC")
    cases["random_walk_fixture"] = {
        "data": rw.tolist(),
        "adf": {"statistic": float(stat), "p_value": float(pvalue), "used_lag": int(usedlag), "nobs": int(nobs),
                "critical_values": {key: float(value) for key, value in crit.items()}},
        "expected_status": "non_stationary",
    }

    # Eigenvalue unit references (direct numpy comparison for the QR port).
    eig_matrix = [[0.5, 0.2, 0.1, 0.0], [0.1, 0.4, 0.05, 0.08], [1, 0, 0, 0], [0, 1, 0, 0]]
    eig = np.linalg.eigvals(np.array(eig_matrix, dtype=float))
    cases["eigenvalue_reference"] = {
        "matrix": eig_matrix,
        "eigenvalues": sorted(((float(z.real), float(z.imag)) for z in eig), key=lambda pair: (pair[0], pair[1])),
    }

    # Special-function references.
    cases["special_functions"] = {
        "normal_cdf": {str(x): float(scipy_stats.norm.cdf(x)) for x in (-3.5, -1.61, -0.5, 0.0, 1.0, 1.96, 2.74)},
        "chi2_cdf": {f"{x},{df}": float(scipy_stats.chi2.cdf(x, df)) for x, df in [(5.991, 2), (9.488, 4), (18.307, 10), (3.0, 1), (42.0, 27)]},
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump({
            "schema_version": "var-reference-cases-v1.41",
            "provenance": {
                "python_version": platform.python_version(),
                "numpy_version": np.__version__,
                "scipy_version": scipy.__version__,
                "statsmodels_version": statsmodels.__version__,
                "seeds": {"var_simulation": 42, "random_walk": 7},
                "generation_date": date.today().isoformat(),
                "generator_version": "var-reference-generator-v1.41",
            },
            "cases": cases,
        }, handle)
    print(f"stable case: selected BIC lag = {cases['stable_var2_k3']['selected_lags']['bic']}; "
          f"max root modulus = {cases['stable_var2_k3']['companion_root_moduli'][-1]:.4f}")
    print(f"known-lag case: BIC selected = {cases['known_lag_var2']['bic_selected']} (expected 2)")
    print(f"unstable case: max estimated modulus = {max(est_moduli):.4f} (>1 expected)")
    print(f"written: {OUT}")


if __name__ == "__main__":
    main()
