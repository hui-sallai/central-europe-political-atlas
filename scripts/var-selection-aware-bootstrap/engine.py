"""v1.86 selection-aware bootstrap engine (research only, synthetic data only).

Reuses the frozen, reference-validated v1.85 batch functions for BIC lag selection,
VAR estimation and the adjusted Portmanteau statistic without modification. The DGP
generator is the v1.85 generator with an explicit entropy argument; reference.py
proves it reproduces v1.85 output exactly under the v1.85 entropy.

This module never reads actual-country data or production readiness artifacts.
"""

from __future__ import annotations

import os
import sys
from math import sqrt
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
from scipy.stats import chi2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "var-residual-diagnostics"))

from common import INNOVATION_COVARIANCE, scaled_coefficients  # noqa: E402  (frozen v1.85)
from simulate import fit_batch, month_effects, pt_batch, select_bic_lags  # noqa: E402  (frozen v1.85)

K = 3
HORIZON = 12
ALPHA = 0.05
BOOTSTRAP_REPLICATIONS = 199
BASE_ENTROPY = [186, 20260928, 1]
FAMILIES = ("recursive_iid_residual", "recursive_wild_rademacher")
PROCEDURES = ("selection_aware", "fixed_true_lag")


def generator(entropy: list[int], spawn_key: tuple[int, ...]) -> np.random.Generator:
    return np.random.Generator(np.random.PCG64DXSM(np.random.SeedSequence(entropy, spawn_key=spawn_key)))


def simulate_dgp(cell: dict, replication_count: int, spawn_key: tuple[int, ...], entropy: list[int] = BASE_ENTROPY) -> tuple[np.ndarray, np.ndarray]:
    """v1.85 simulate_batch with an explicit entropy (Gaussian iid or scaled t5; optional serial innovations)."""
    rng = generator(entropy, spawn_key)
    sample_size = cell["sample_size"]
    total = 300 + sample_size
    coefs = scaled_coefficients(cell["true_lag"], cell["persistence"])
    if cell["innovation"] == "gaussian_iid":
        raw = rng.standard_normal((replication_count, total, K))
    elif cell["innovation"] == "multivariate_t5_scaled_to_covariance":
        raw = rng.standard_t(5, size=(replication_count, total, K)) * sqrt(3.0 / 5.0)
    else:
        raise ValueError(cell["innovation"])
    epsilon = raw @ np.linalg.cholesky(INNOVATION_COVARIANCE).T
    innovations = epsilon.copy()
    pattern, rho = cell.get("serial_pattern"), cell.get("serial_rho", 0.0)
    if pattern == "common":
        scale = sqrt(1.0 - rho**2)
        innovations[:, 0] = scale * epsilon[:, 0]
        for t in range(1, total):
            innovations[:, t] = rho * innovations[:, t - 1] + scale * epsilon[:, t]
    elif pattern is not None:
        raise ValueError(pattern)
    values = np.zeros((replication_count, total, K), dtype=np.float64)
    deterministic = np.broadcast_to(np.array([0.05, -0.03, 0.02]), (total, K)).copy()
    if cell["deterministic_spec"] == "constant_plus_11_month_dummies":
        deterministic += month_effects(total)
    for t in range(total):
        autoregressive = np.zeros((replication_count, K), dtype=np.float64)
        for lag, matrix in enumerate(coefs, start=1):
            if t >= lag:
                autoregressive += values[:, t - lag] @ matrix.T
        values[:, t] = deterministic[t] + autoregressive + innovations[:, t]
    months = np.arange(total, dtype=np.int64)[-sample_size:] % 12
    return values[:, -sample_size:], months


def deterministic_columns(deterministic_spec: str) -> int:
    return 1 if deterministic_spec == "constant" else 12


def pt_tau(residuals: np.ndarray, lag: int) -> np.ndarray:
    """Asymptotic chi-square p-value of the adjusted Portmanteau at h=12; the bootstrap statistic (smaller = more extreme)."""
    return pt_batch(residuals, lag, HORIZON)[1]


def max_root_modulus(coefficients: np.ndarray, lag: int, deterministic_spec: str) -> float:
    nd = deterministic_columns(deterministic_spec)
    blocks = [coefficients[nd + K * (i - 1): nd + K * i].T for i in range(1, lag + 1)]
    companion = np.zeros((K * lag, K * lag))
    companion[:K] = np.concatenate(blocks, axis=1)
    if lag > 1:
        companion[K:, :-K] = np.eye(K * (lag - 1))
    return float(np.max(np.abs(np.linalg.eigvals(companion))))


def bootstrap_samples(values: np.ndarray, months: np.ndarray, lag: int, deterministic_spec: str, coefficients: np.ndarray,
                      residuals: np.ndarray, family: str, rng: np.random.Generator, draws: int = BOOTSTRAP_REPLICATIONS,
                      indices: np.ndarray | None = None, signs: np.ndarray | None = None) -> np.ndarray:
    """Recursive-design bootstrap from the fitted VAR(lag), conditional on the first `lag` observations.

    `indices` / `signs` may be supplied by reference tests to replay a known draw.
    """
    sample_size = len(values)
    nd = deterministic_columns(deterministic_spec)
    rows = sample_size - lag
    deterministic_rows = np.ones((rows, 1))
    if deterministic_spec == "constant_plus_11_month_dummies":
        dummies = np.zeros((rows, 11))
        for r, month in enumerate(months[lag:]):
            if month < 11:
                dummies[r, month] = 1.0
        deterministic_rows = np.concatenate([deterministic_rows, dummies], axis=1)
    deterministic_part = deterministic_rows @ coefficients[:nd]
    autoregressive = coefficients[nd:]
    if family == "recursive_iid_residual":
        centered = residuals - residuals.mean(axis=0)
        if indices is None:
            indices = rng.integers(0, rows, size=(draws, rows))
        shocks = centered[indices]
    elif family == "recursive_wild_rademacher":
        if signs is None:
            signs = rng.integers(0, 2, size=(draws, rows, 1)) * 2.0 - 1.0
        shocks = residuals[None] * signs
    else:
        raise ValueError(family)
    draws = shocks.shape[0]
    samples = np.empty((draws, sample_size, K))
    samples[:, :lag] = values[:lag]
    for t in range(lag, sample_size):
        lagged = np.concatenate([samples[:, t - i] for i in range(1, lag + 1)], axis=1)
        samples[:, t] = deterministic_part[t - lag] + lagged @ autoregressive + shocks[:, t - lag]
    return samples


def bootstrap_taus(samples: np.ndarray, months: np.ndarray, deterministic_spec: str, fixed_lag: int | None) -> tuple[np.ndarray, np.ndarray]:
    """Rerun BIC selection inside every bootstrap sample (fixed_lag=None) or hold the lag fixed; return (tau*, lag*)."""
    selected = select_bic_lags(samples, months, deterministic_spec) if fixed_lag is None else np.full(len(samples), fixed_lag)
    taus = np.empty(len(samples))
    for lag in np.unique(selected):
        members = np.flatnonzero(selected == lag)
        residuals, _, _ = fit_batch(samples[members], months, int(lag), deterministic_spec)
        taus[members] = pt_tau(residuals, int(lag))
    return taus, selected


def bootstrap_p_value(tau: float, bootstrap_taus_: np.ndarray) -> float:
    return (1.0 + float(np.sum(bootstrap_taus_ <= tau))) / (len(bootstrap_taus_) + 1.0)


def run_procedure(values: np.ndarray, months: np.ndarray, deterministic_spec: str, lag: int, fixed_lag: int | None,
                  family: str, rng: np.random.Generator) -> dict:
    residuals, _, coefficients = fit_batch(values[None], months, lag, deterministic_spec)
    residuals, coefficients = residuals[0], coefficients[0]
    tau = float(pt_tau(residuals[None], lag)[0])
    modulus = max_root_modulus(coefficients, lag, deterministic_spec)
    if not np.isfinite(tau) or not modulus < 1.0:
        return {"state": "failed_unstable_or_nonfinite_original_fit", "tau": None, "p_boot": None, "reject": None, "boot_lag_counts": {}, "max_root_modulus": modulus}
    samples = bootstrap_samples(values, months, lag, deterministic_spec, coefficients, residuals, family, rng)
    taus, selected = bootstrap_taus(samples, months, deterministic_spec, fixed_lag)
    if not np.all(np.isfinite(taus)):
        return {"state": "failed_nonfinite_bootstrap_statistic", "tau": tau, "p_boot": None, "reject": None, "boot_lag_counts": {}, "max_root_modulus": modulus}
    p_boot = bootstrap_p_value(tau, taus)
    lags, counts = np.unique(selected, return_counts=True)
    return {"state": "ok", "tau": tau, "p_boot": p_boot, "reject": bool(p_boot <= ALPHA),
            "boot_lag_counts": {str(int(l)): int(c) for l, c in zip(lags, counts)}, "max_root_modulus": modulus}
