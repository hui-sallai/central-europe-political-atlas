#!/usr/bin/env python3
"""Independent NumPy/SciPy/statsmodels reference for the v1.71 LP engine."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import scipy
import statsmodels.api as sm
from scipy.stats import norm


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data"
LP = DATA / "local-projections"
HORIZONS = (0, 1, 6, 12, 18, 24)
PATH_CHECKPOINTS = (0, 1, 6, 12, 24)
PATH_DRAWS = 100_000


def read(path: Path):
    return json.loads(path.read_text())


def add_month(period: str, amount: int) -> str:
    year, month = map(int, period.split("-"))
    absolute = year * 12 + month - 1 + amount
    return f"{absolute // 12:04d}-{absolute % 12 + 1:02d}"


hf = read(DATA / "high-frequency" / "high_frequency_observations.json")["records"]
macro = read(DATA / "macro-drivers" / "macro_driver_observations.json")["records"]
mp = read(DATA / "identified-shocks" / "ecb_pure_monetary_policy_shock_monthly.json")["records"]
cbi = read(DATA / "identified-shocks" / "ecb_central_bank_information_shock_monthly.json")["records"]
shock = {row["period"]: (float(row["value"]), float(cbi[i]["value"])) for i, row in enumerate(mp)}
models = {row["model_id"]: row for row in read(LP / "lp_model_registry.json")["records"]}
production = {row["model_id"]: row for row in read(LP / "lp_results.json")["records"]}

specs = {
    "hicp_price_level": ("high_frequency", "hicp_monthly_index", True, "log"),
    "industrial_production": ("high_frequency", "industrial_production_index", False, "log"),
    "bilateral_fx": ("macro_driver", "bilateral_fx_local_per_eur", False, "log"),
    "domestic_policy_rate": ("macro_driver", "policy_rate", False, "difference"),
}

golden = [
    ("germany", "hicp_price_level"),
    ("germany", "industrial_production"),
    ("poland", "hicp_price_level"),
    ("poland", "bilateral_fx"),
    ("hungary", "domestic_policy_rate"),
]


def source_series(country: str, outcome: str) -> dict[str, float]:
    source, field, _, _ = specs[outcome]
    if source == "high_frequency":
        rows = [r for r in hf if r["country"] == country and r["indicator"] == field]
    else:
        rows = [r for r in macro if r["country"] == country and r["driver_id"] == field and r["transformation"] == "level"]
    return {r["period"]: float(r["value"]) for r in rows if r["value"] is not None}


def transformed(kind: str, future: float, base: float) -> float:
    return 100.0 * math.log(future / base) if kind == "log" else future - base


def sup_t_reference(covariance: np.ndarray, seed: int) -> float:
    standard_errors = np.sqrt(np.maximum(0.0, np.diag(covariance)))
    correlation = covariance / np.maximum(np.finfo(float).eps, np.outer(standard_errors, standard_errors))
    correlation = (correlation + correlation.T) / 2.0
    eigenvalues, eigenvectors = np.linalg.eigh(correlation)
    root = eigenvectors @ np.diag(np.sqrt(np.maximum(0.0, eigenvalues)))
    rng = np.random.default_rng(seed)
    maxima = np.max(np.abs(rng.standard_normal((PATH_DRAWS, len(covariance))) @ root.T), axis=1)
    return float(np.quantile(maxima, 0.95, method="inverted_cdf"))


def reference_case(country: str, outcome: str) -> dict:
    model_id = f"lp:{country}:{outcome}:full:jk_joint:h24"
    model = models[model_id]
    prod = production[model_id]
    p = model["selected_base_lag_order"]
    max_h = model["maximum_horizon"]
    _, _, month_dummies, kind = specs[outcome]
    series = source_series(country, outcome)
    periods = []
    period = min(series)
    while period <= max(series):
        periods.append(period)
        period = add_month(period, 1)
    rows = [{"period": period, "outcome": series.get(period), "mp": shock.get(period, (None, None))[0], "cbi": shock.get(period, (None, None))[1]} for period in periods]

    common = []
    for i in range(p, len(rows) - max_h):
        if not ("2015-01" <= rows[i]["period"] <= "2025-10"):
            continue
        required = [rows[i - 1]["outcome"], rows[i]["mp"], rows[i]["cbi"]]
        for lag in range(1, p + 1):
            required.extend((rows[i - lag]["outcome"], rows[i - lag]["mp"], rows[i - lag]["cbi"]))
        required.extend(rows[i + h]["outcome"] for h in range(max_h + 1))
        if all(value is not None and math.isfinite(value) for value in required):
            common.append(i)

    fits = []
    for h in range(max_h + 1):
        y, x = [], []
        for i in common:
            y.append(transformed(kind, rows[i + h]["outcome"], rows[i - 1]["outcome"]))
            controls = [rows[i]["mp"], rows[i]["cbi"]]
            for lag in range(1, p + 1):
                controls.extend((rows[i - lag]["outcome"], rows[i - lag]["mp"], rows[i - lag]["cbi"]))
            if month_dummies:
                month = int(rows[i]["period"][5:7])
                controls.extend(float(month == m) for m in range(2, 13))
            controls.append(1.0)
            x.append(controls)
        fit = sm.OLS(np.asarray(y), np.asarray(x)).fit(cov_type="HC1")
        fits.append(fit)

    output = []
    for h in HORIZONS:
        if h > max_h:
            continue
        fit = fits[h]
        prod_h = next(row for row in prod["horizons"] if row["horizon"] == h)
        output.append({
            "horizon": h,
            "beta_mp_raw": float(fit.params[0]),
            "beta_cbi_raw": float(fit.params[1]),
            "standard_error_mp": float(fit.bse[0]),
            "standard_error_cbi": float(fit.bse[1]),
            "mp_response_25bp": float(fit.params[0] * 0.25),
            "cbi_response_normalized_025": float(fit.params[1] * 0.25),
            "ci90_mp": [float((fit.params[0] - norm.ppf(0.95) * fit.bse[0]) * 0.25), float((fit.params[0] + norm.ppf(0.95) * fit.bse[0]) * 0.25)],
            "ci95_mp": [float((fit.params[0] - norm.ppf(0.975) * fit.bse[0]) * 0.25), float((fit.params[0] + norm.ppf(0.975) * fit.bse[0]) * 0.25)],
            "ci90_cbi": [float((fit.params[1] - norm.ppf(0.95) * fit.bse[1]) * 0.25), float((fit.params[1] + norm.ppf(0.95) * fit.bse[1]) * 0.25)],
            "ci95_cbi": [float((fit.params[1] - norm.ppf(0.975) * fit.bse[1]) * 0.25), float((fit.params[1] + norm.ppf(0.975) * fit.bse[1]) * 0.25)],
            "production": {key: prod_h[key] for key in ("beta_mp_raw", "beta_cbi_raw", "standard_error_mp", "standard_error_cbi", "mp_response_25bp")},
        })

    x_array = np.asarray(x)
    xtx_inverse = np.linalg.inv(x_array.T @ x_array)
    hc1 = len(common) / (len(common) - x_array.shape[1])
    path_reference = {}
    for coefficient, label, seed in ((0, "mp", 1710), (1, "cbi", 1711)):
        covariance = np.empty((max_h + 1, max_h + 1))
        for h, fit_h in enumerate(fits):
            for j, fit_j in enumerate(fits):
                weighted_x = x_array * (fit_h.resid * fit_j.resid)[:, None]
                sandwich = xtx_inverse @ (x_array.T @ weighted_x) @ xtx_inverse * hc1
                covariance[h, j] = sandwich[coefficient, coefficient]
        path_reference[label] = {
            "critical_value_95": sup_t_reference(covariance, seed),
            "draw_count": PATH_DRAWS,
            "seed": seed,
            "standard_errors": {str(h): float(math.sqrt(max(0.0, covariance[h, h]))) for h in PATH_CHECKPOINTS},
            "covariance_checkpoints": [
                {"horizon_a": h, "horizon_b": j, "value": float(covariance[h, j])}
                for h, j in ((0, 1), (0, 6), (1, 12), (6, 24), (12, 24))
            ],
            "production_critical_value_95": float(prod["simultaneous_inference"][f"{label}_critical_value_95"]),
        }
    return {
        "case_id": f"{country}_{outcome}", "model_id": model_id, "country": country, "outcome": outcome,
        "selected_base_lag_order": p, "lp_lag_count": p, "augmentation_relative_to_nonaugmented_lp": 1, "maximum_horizon": max_h, "effective_n": len(common),
        "sample_start": rows[common[0]]["period"], "sample_end": rows[common[-1]]["period"], "horizons": output,
        "path_reference": path_reference,
    }


def synthetic_reference() -> dict:
    rng = np.random.default_rng(1701)
    n, p, maximum_horizon = 240, 2, 12
    mp_values, cbi_values = rng.normal(size=n), rng.normal(size=n)
    outcome_values = np.zeros(n)
    noise = rng.normal(scale=0.35, size=n)
    for t in range(1, n):
        outcome_values[t] = 0.55 * outcome_values[t - 1] + 0.8 * mp_values[t] - 0.35 * cbi_values[t] + noise[t]
    calendar = []
    period = "2000-01"
    for i in range(n):
        calendar.append({"period": period, "outcome": float(outcome_values[i]), "mp": float(mp_values[i]), "cbi": float(cbi_values[i])})
        period = add_month(period, 1)
    common = list(range(p, n - maximum_horizon))
    checkpoints = []
    for h in (0, 1, 6, 12):
        y_values, x_values = [], []
        for i in common:
            y_values.append(outcome_values[i + h] - outcome_values[i - 1])
            controls = [mp_values[i], cbi_values[i]]
            for lag in range(1, p + 1):
                controls.extend((outcome_values[i - lag], mp_values[i - lag], cbi_values[i - lag]))
            controls.append(1.0)
            x_values.append(controls)
        fit = sm.OLS(np.asarray(y_values), np.asarray(x_values)).fit(cov_type="HC1")
        checkpoints.append({"horizon": h, "beta_mp_raw": float(fit.params[0]), "beta_cbi_raw": float(fit.params[1]), "standard_error_mp": float(fit.bse[0]), "standard_error_cbi": float(fit.bse[1]), "effective_n": len(common)})
    return {
        "seed": 1701, "dgp": "y[t] = 0.55*y[t-1] + 0.8*MP[t] - 0.35*CBI[t] + noise[t]",
        "known_effects": {"mp_impact": 0.8, "cbi_impact": -0.35, "persistence": 0.55, "noise_standard_deviation": 0.35},
        "lag_order": p, "maximum_horizon": maximum_horizon, "transform": "level_difference_from_t_minus_1",
        "calendar": calendar, "checkpoints": checkpoints,
        "expected_signs": {"h0_mp": "positive", "h0_cbi": "negative"},
    }

payload = {
    "schema_version": "lp-cross-language-reference-v1.71",
    "generated_at": "2026-09-03",
    "reference_runtime": {"numpy": np.__version__, "scipy": scipy.__version__, "statsmodels": sm.__version__},
    "estimator": "statsmodels OLS with cov_type=HC1; joint cross-horizon HC1 covariance; Gaussian plug-in sup-t; joint MP/CBI; no HAC",
    "tolerance": 1e-8,
    "simulation_tolerance": 0.12,
    "synthetic": synthetic_reference(),
    "cases": [reference_case(country, outcome) for country, outcome in golden],
}
(LP / "lp_reference_cases.json").write_text(json.dumps(payload, indent=2) + "\n")
print(f"LP Python reference: {len(payload['cases'])} real cases; {sum(len(case['horizons']) for case in payload['cases'])} checkpoints; dynamic synthetic n={len(payload['synthetic']['calendar'])}.")
