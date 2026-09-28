"""v1.89 country-matched selection-aware bootstrap calibration library (research only, synthetic data only).

DGP: v1.85/v1.87 family (explicit coefficients, v1.85 intercept and month effects, burn-in 300) with optional
serial innovation dependence for the preregistered power alternatives. The bootstrap is the frozen v1.86
engine.run_procedure (recursive iid residual, BIC rerun in every bootstrap sample, B=199) used unmodified.
Never reads actual-country data.
"""
from __future__ import annotations

import os
import sys
from math import log, sqrt
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "var-lag-selection-characterization"))
sys.path.insert(0, str(ROOT / "scripts" / "var-selection-aware-bootstrap"))
import lagchar as L  # noqa: E402  (frozen v1.87)
import engine  # noqa: E402  (frozen v1.86)

BASE_ENTROPY = [189, 20260928, 1]
SAMPLE_SIZE = 137
K = 3
COVARIANCES = {
    "v185_positive": L.INNOVATION_COVARIANCE,
    "envelope_mixed_sign": np.array([[1.0, -0.4, 0.2], [-0.4, 1.0, -0.2], [0.2, -0.2, 1.0]]),
}
PERSISTENCE = (0.92, 0.95, 0.97)
PSI_LEVELS = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
INTERMEDIATE_PSI = (0.75, 1.0, 1.25)
DETERMINISTIC = ("constant", "constant_plus_11_month_dummies")
ALTERNATIVES = {"common_ar1": (0.1, 0.2, 0.3), "seasonal_ar12": (0.1, 0.2, 0.3)}


def generator(spawn_key: tuple[int, ...]) -> np.random.Generator:
    return L.generator(spawn_key, BASE_ENTROPY)


def signal_design(rho: float, sigma: np.ndarray, psi_target: float) -> dict:
    """v1.87 construction (A1=a*T1, A2=b*T2) with psi defined at T=137 instead of the v1.87 reference T=132."""
    t1, t2 = L.templates(K)
    target = psi_target * L.bic_penalty_per_extra_lag(SAMPLE_SIZE, K)

    def build(b):
        a = L.scale_to_radius([b * t2], t1, rho)
        return None if a is None else [a * t1, b * t2]

    lo, hi = 0.0, 1.0
    while build(hi) is not None and L.lag2_information(build(hi), sigma) < target:
        hi *= 2.0
        if hi > 1e3:
            break
    if build(hi) is None:
        f_lo, f_hi = 0.0, hi
        for _ in range(200):
            mid = (f_lo + f_hi) / 2.0
            f_lo, f_hi = (mid, f_hi) if build(mid) is not None else (f_lo, mid)
        hi = f_lo
        if L.lag2_information(build(hi), sigma) < target:
            return {"feasible": False, "psi_max_feasible": L.signal_ratio(L.lag2_information(build(hi), sigma), SAMPLE_SIZE, K)}
    for _ in range(200):
        mid = (lo + hi) / 2.0
        lo, hi = (mid, hi) if L.lag2_information(build(mid), sigma) < target else (lo, mid)
    return {"feasible": True, "coefficients": build((lo + hi) / 2.0)}


def simulate(coefs, sigma, spec, count, rng, alternative=None, strength=0.0):
    """Gaussian innovations; alternative 'common_ar1': u_t = s u_{t-1} + sqrt(1-s^2) e_t (v1.85 'common' pattern);
    'seasonal_ar12': u_t = s u_{t-12} + sqrt(1-s^2) e_t. None reproduces lagchar.simulate exactly."""
    if alternative is None:
        return L.simulate(coefs, sigma, SAMPLE_SIZE, spec, "gaussian_iid", count, rng)
    total = 300 + SAMPLE_SIZE
    epsilon = rng.standard_normal((count, total, K)) @ np.linalg.cholesky(sigma).T
    lag = {"common_ar1": 1, "seasonal_ar12": 12}[alternative]
    scale = sqrt(1.0 - strength ** 2)
    innovations = scale * epsilon
    for t in range(lag, total):
        innovations[:, t] = strength * innovations[:, t - lag] + scale * epsilon[:, t]
    values = np.zeros((count, total, K))
    deterministic = np.broadcast_to(L.INTERCEPT, (total, K)).copy()
    if spec == "constant_plus_11_month_dummies":
        deterministic += L.month_effects(total)
    for t in range(total):
        autoregressive = np.zeros((count, K))
        for i, matrix in enumerate(coefs, start=1):
            if t >= i:
                autoregressive += values[:, t - i] @ matrix.T
        values[:, t] = deterministic[t] + autoregressive + innovations[:, t]
    return values[:, -SAMPLE_SIZE:], np.arange(total, dtype=np.int64)[-SAMPLE_SIZE:] % 12


def replicate(values, months, spec, rng) -> dict:
    """Production BIC selection, asymptotic h=12 adjusted Portmanteau at the selected lag, and the frozen v1.86 bootstrap."""
    selected = int(engine.select_bic_lags(values[None], months, spec)[0])
    residuals, _, _ = engine.fit_batch(values[None], months, selected, spec)
    asymptotic_p = float(engine.pt_tau(residuals, selected)[0])
    boot = engine.run_procedure(values, months, spec, selected, None, "recursive_iid_residual", rng)
    return {"selected_lag": selected, "asymptotic_p": asymptotic_p, "asymptotic_reject": bool(asymptotic_p <= 0.05), "bootstrap": boot}
