"""Independent, research-only VAR residual-diagnostic implementation.

This module must not import or read actual-country readiness artifacts.  It is
used only for preregistered synthetic fixtures and simulations.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import floor, sqrt

import numpy as np
from scipy.stats import chi2, f


K = 3
BASE_ENTROPY = [185, 20260927, 1]
INNOVATION_COVARIANCE = np.array(
    [[1.0, 0.3, 0.2], [0.3, 1.0, 0.25], [0.2, 0.25, 1.0]], dtype=np.float64
)
COEFFICIENT_TEMPLATES = [
    np.array([[0.6, 0.1, 0.05], [0.05, 0.5, 0.08], [0.02, 0.06, 0.4]], dtype=np.float64),
    np.array([[-0.1, 0.03, 0.0], [0.02, -0.08, 0.02], [0.0, 0.02, -0.06]], dtype=np.float64),
    np.array([[0.05, 0.0, 0.01], [0.0, 0.04, 0.0], [0.01, 0.0, 0.03]], dtype=np.float64),
]


@dataclass(frozen=True)
class VarFit:
    residuals: np.ndarray
    regressors: np.ndarray
    coefficients: np.ndarray
    selected_lag: int


def seed_sequence(spawn_key: tuple[int, ...]) -> np.random.SeedSequence:
    return np.random.SeedSequence(BASE_ENTROPY, spawn_key=spawn_key)


def companion_matrix(coefs: list[np.ndarray]) -> np.ndarray:
    p = len(coefs)
    companion = np.zeros((K * p, K * p), dtype=np.float64)
    companion[:K, : K * p] = np.concatenate(coefs, axis=1)
    if p > 1:
        companion[K:, :-K] = np.eye(K * (p - 1), dtype=np.float64)
    return companion


def spectral_radius(coefs: list[np.ndarray]) -> float:
    return float(np.max(np.abs(np.linalg.eigvals(companion_matrix(coefs)))))


def scaled_coefficients(p: int, target_radius: float) -> list[np.ndarray]:
    if p not in (1, 2, 3):
        raise ValueError(f"unsupported p={p}")
    templates = COEFFICIENT_TEMPLATES[:p]
    lower, upper = 0.0, 1.0
    while spectral_radius([upper * matrix for matrix in templates]) < target_radius:
        upper *= 2.0
        if upper > 64:
            raise RuntimeError("failed to bracket spectral-radius target")
    for _ in range(100):
        midpoint = (lower + upper) / 2.0
        radius = spectral_radius([midpoint * matrix for matrix in templates])
        if radius < target_radius:
            lower = midpoint
        else:
            upper = midpoint
    coefs = [((lower + upper) / 2.0) * matrix for matrix in templates]
    if abs(spectral_radius(coefs) - target_radius) > 1e-10:
        raise RuntimeError("spectral-radius construction missed preregistered tolerance")
    return coefs


def month_dummy_row(month_index: int) -> np.ndarray:
    row = np.zeros(11, dtype=np.float64)
    if month_index % 12 < 11:
        row[month_index % 12] = 1.0
    return row


def month_effect(month_index: int) -> np.ndarray:
    month = month_index % 12
    if month == 11:
        return np.zeros(K, dtype=np.float64)
    angle = 2.0 * np.pi * month / 12.0
    return np.array(
        [0.15 * np.sin(angle), 0.12 * np.cos(angle), 0.10 * np.sin(angle + np.pi / 4.0)],
        dtype=np.float64,
    )


def simulate_var(
    *,
    sample_size: int,
    true_lag: int,
    persistence: float,
    deterministic_spec: str,
    innovation_distribution: str,
    spawn_key: tuple[int, ...],
    serial_pattern: str | None = None,
    serial_rho: float = 0.0,
    burn_in: int = 300,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.Generator(np.random.PCG64DXSM(seed_sequence(spawn_key)))
    coefs = scaled_coefficients(true_lag, persistence)
    total = burn_in + sample_size
    chol = np.linalg.cholesky(INNOVATION_COVARIANCE)
    if innovation_distribution == "gaussian_iid":
        raw = rng.standard_normal((total, K))
    elif innovation_distribution == "multivariate_t5_scaled_to_covariance":
        raw = rng.standard_t(5, size=(total, K)) * sqrt((5.0 - 2.0) / 5.0)
    else:
        raise ValueError(f"unknown innovation distribution {innovation_distribution}")
    epsilon = raw @ chol.T
    innovations = np.zeros_like(epsilon)
    if serial_pattern is None:
        innovations[:] = epsilon
    elif serial_pattern == "common":
        innovation_scale = sqrt(1.0 - serial_rho**2)
        for t in range(total):
            innovations[t] = serial_rho * (innovations[t - 1] if t else 0.0) + innovation_scale * epsilon[t]
    elif serial_pattern == "single_equation_dominant":
        innovations[:] = epsilon
        innovation_scale = sqrt(1.0 - serial_rho**2)
        for t in range(total):
            previous = innovations[t - 1, 0] if t else 0.0
            innovations[t, 0] = serial_rho * previous + innovation_scale * epsilon[t, 0]
    elif serial_pattern == "common_ma1_fixture":
        innovations[:] = epsilon
        innovations[1:] += serial_rho * epsilon[:-1]
    else:
        raise ValueError(f"unknown serial pattern {serial_pattern}")

    values = np.zeros((total, K), dtype=np.float64)
    intercept = np.array([0.05, -0.03, 0.02], dtype=np.float64)
    for t in range(total):
        deterministic = intercept.copy()
        if deterministic_spec == "constant_plus_11_month_dummies":
            deterministic += month_effect(t)
        elif deterministic_spec != "constant":
            raise ValueError(f"unknown deterministic spec {deterministic_spec}")
        autoregressive = np.zeros(K, dtype=np.float64)
        for lag, matrix in enumerate(coefs, start=1):
            if t >= lag:
                autoregressive += matrix @ values[t - lag]
        values[t] = deterministic + autoregressive + innovations[t]
    months = np.arange(total, dtype=np.int64) % 12
    return values[-sample_size:], months[-sample_size:]


def design_matrix(data: np.ndarray, months: np.ndarray, lag: int, deterministic_spec: str) -> tuple[np.ndarray, np.ndarray]:
    rows = len(data) - lag
    parts = [np.ones((rows, 1), dtype=np.float64)]
    if deterministic_spec == "constant_plus_11_month_dummies":
        parts.append(np.vstack([month_dummy_row(int(month)) for month in months[lag:]]))
    elif deterministic_spec != "constant":
        raise ValueError(f"unknown deterministic spec {deterministic_spec}")
    parts.extend(data[lag - offset : len(data) - offset] for offset in range(1, lag + 1))
    return np.column_stack(parts), data[lag:]


def fit_var(data: np.ndarray, months: np.ndarray, lag: int, deterministic_spec: str) -> VarFit:
    regressors, responses = design_matrix(data, months, lag, deterministic_spec)
    coefficients, _, _, _ = np.linalg.lstsq(regressors, responses, rcond=None)
    residuals = responses - regressors @ coefficients
    return VarFit(residuals=residuals, regressors=regressors, coefficients=coefficients, selected_lag=lag)


def pt_adjusted(residuals: np.ndarray, var_lag: int, horizon: int) -> dict:
    observations, dimension = residuals.shape
    df = dimension * dimension * (horizon - var_lag)
    if horizon <= var_lag or df <= 0:
        return diagnostic_output("pt_adjusted", horizon, np.nan, "chi_square", df, None, np.nan, "not_tested")
    c0 = residuals.T @ residuals / observations
    c0_inv = np.linalg.inv(c0)
    statistic = 0.0
    for lag in range(1, horizon + 1):
        covariance = residuals[lag:].T @ residuals[:-lag] / observations
        statistic += np.trace(covariance.T @ c0_inv @ covariance @ c0_inv) / (observations - lag)
    statistic *= observations**2
    p_value = float(chi2.sf(statistic, df))
    return diagnostic_output("pt_adjusted", horizon, statistic, "chi_square", df, None, p_value, "ok")


def residual_lag_matrix(residuals: np.ndarray, horizon: int) -> np.ndarray:
    observations, dimension = residuals.shape
    lagged = np.zeros((observations, dimension * horizon), dtype=np.float64)
    for lag in range(1, horizon + 1):
        lagged[lag:, (lag - 1) * dimension : lag * dimension] = residuals[:-lag]
    return lagged


def bg_and_es(fit: VarFit, horizon: int) -> tuple[dict, dict]:
    residuals, original = fit.residuals, fit.regressors
    observations, dimension = residuals.shape
    lagged_residuals = residual_lag_matrix(residuals, horizon)
    unrestricted = np.column_stack([original, lagged_residuals])
    if unrestricted.shape[1] >= observations:
        unavailable_bg = diagnostic_output("bg_lm", horizon, np.nan, "chi_square", horizon * dimension**2, None, np.nan, "not_tested")
        unavailable_es = diagnostic_output("edgerton_shukur_f", horizon, np.nan, "F", horizon * dimension**2, None, np.nan, "not_tested")
        return unavailable_bg, unavailable_es
    restricted_beta, _, _, _ = np.linalg.lstsq(original, residuals, rcond=None)
    unrestricted_beta, _, _, _ = np.linalg.lstsq(unrestricted, residuals, rcond=None)
    restricted_residuals = residuals - original @ restricted_beta
    unrestricted_residuals = residuals - unrestricted @ unrestricted_beta
    sigma_restricted = restricted_residuals.T @ restricted_residuals / observations
    sigma_unrestricted = unrestricted_residuals.T @ unrestricted_residuals / observations
    lm_statistic = observations * (dimension - np.trace(np.linalg.solve(sigma_restricted, sigma_unrestricted)))
    lm_df = horizon * dimension**2
    bg = diagnostic_output("bg_lm", horizon, lm_statistic, "chi_square", lm_df, None, float(chi2.sf(lm_statistic, lm_df)), "ok")

    determinant_ratio = np.linalg.det(sigma_unrestricted) / np.linalg.det(sigma_restricted)
    r_squared = 1.0 - determinant_ratio
    m = dimension * horizon
    q = 0.5 * dimension * m - 1.0
    regressor_count = original.shape[1]
    adjusted_n = observations - regressor_count - m - 0.5 * (dimension - m + 1.0)
    r_factor = sqrt((dimension**2 * m**2 - 4.0) / (dimension**2 + m**2 - 5.0))
    df2 = floor(adjusted_n * r_factor - q)
    base = max(1.0 - r_squared, np.finfo(np.float64).tiny)
    f_statistic = ((1.0 - base ** (1.0 / r_factor)) / (base ** (1.0 / r_factor))) * ((adjusted_n * r_factor - q) / (dimension * m))
    es_status = "ok" if df2 > 0 and np.isfinite(f_statistic) else "not_tested"
    es_p = float(f.sf(f_statistic, lm_df, df2)) if es_status == "ok" else np.nan
    es = diagnostic_output("edgerton_shukur_f", horizon, f_statistic, "F", lm_df, df2, es_p, es_status)
    return bg, es


def diagnostic_output(test_id: str, horizon: int, statistic: float, distribution: str, df1: int | float | None, df2: int | None, p_value: float, status: str) -> dict:
    return {
        "test_id": test_id,
        "lag_horizon": horizon,
        "statistic": float(statistic),
        "distribution": distribution,
        "df1": None if df1 is None else int(df1),
        "df2": None if df2 is None else int(df2),
        "p_value": float(p_value),
        "status": status,
        "reference_alignment": None,
    }


def all_diagnostics(fit: VarFit, horizon: int) -> dict[str, dict]:
    pt = pt_adjusted(fit.residuals, fit.selected_lag, horizon)
    bg, es = bg_and_es(fit, horizon)
    return {entry["test_id"]: entry for entry in (pt, bg, es)}
