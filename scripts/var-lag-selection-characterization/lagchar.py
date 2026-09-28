"""v1.87 VAR lag-selection finite-sample characterization library (research only, synthetic data only).

Generic-K DGP generator with explicit coefficients (the v1.85 generator is the K=3 special case and
reference.py proves bit-identity), production-policy information criteria on the common sample,
population VAR algebra and the preregistered lag-2 signal-strength construction.
Never reads actual-country data or production readiness artifacts.
"""
from __future__ import annotations

import os
import sys
from math import floor, log, sqrt
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
from scipy.linalg import solve_discrete_lyapunov
from scipy.stats import chi2, ncx2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "var-residual-diagnostics"))
from common import COEFFICIENT_TEMPLATES, INNOVATION_COVARIANCE, scaled_coefficients  # noqa: E402  (frozen v1.85)
from simulate import fit_batch, month_effects  # noqa: E402  (frozen v1.85)

BASE_ENTROPY = [187, 20260928, 1]
INTERCEPT = np.array([0.05, -0.03, 0.02])
HIGH_CORRELATION_COVARIANCE = np.array([[1.0, 0.7, 0.6], [0.7, 1.0, 0.65], [0.6, 0.65, 1.0]])
SIGNAL_REFERENCE_T = 132
SIGNAL_LEVELS = (0.25, 0.5, 1.0, 2.0)
HORIZON = 12
ADEQUACY_POWER_THRESHOLD = 0.10


def generator(spawn_key: tuple[int, ...], entropy: list[int] = BASE_ENTROPY) -> np.random.Generator:
    return np.random.Generator(np.random.PCG64DXSM(np.random.SeedSequence(entropy, spawn_key=spawn_key)))


def deterministic_count(spec: str) -> int:
    return 1 if spec == "constant" else 12


def maximum_candidate_lag(sample_size: int, k: int) -> int:
    """Production policy: largest lag with (T-p)/(Kp+1) >= 4, capped at 12 (varEngine.maximumAllowedVarLag)."""
    return max(1, min(12, floor((sample_size - 4) / (4 * k + 1))))


# ---------------------------------------------------------------- population algebra
def companion(coefs: list[np.ndarray]) -> np.ndarray:
    k, p = coefs[0].shape[0], len(coefs)
    f = np.zeros((k * p, k * p))
    f[:k] = np.concatenate(coefs, axis=1)
    if p > 1:
        f[k:, :-k] = np.eye(k * (p - 1))
    return f


def spectral_radius(coefs: list[np.ndarray]) -> float:
    return float(np.max(np.abs(np.linalg.eigvals(companion(coefs)))))


def autocovariances(coefs: list[np.ndarray], sigma: np.ndarray, max_lag: int) -> list[np.ndarray]:
    """Gamma_h = E[y_t y_{t-h}'] for h=0..max_lag of the stationary VAR (column convention)."""
    k, p = sigma.shape[0], len(coefs)
    q = np.zeros((k * p, k * p))
    q[:k, :k] = sigma
    big = solve_discrete_lyapunov(companion(coefs), q)
    gammas = [big[:k, k * i: k * (i + 1)] for i in range(p)]
    while len(gammas) <= max_lag:
        h = len(gammas)
        gammas.append(sum(coefs[i] @ gammas[h - 1 - i] for i in range(p)))
    return gammas


def gamma(gammas: list[np.ndarray], h: int) -> np.ndarray:
    return gammas[h] if h >= 0 else gammas[-h].T


def pseudo_true_residual_autocovariances(coefs: list[np.ndarray], sigma: np.ndarray, approx_lag: int, max_lag: int) -> list[np.ndarray]:
    """Autocovariances of e_t = y_t - sum_{i<=approx_lag} B_i y_{t-i} for the population least-squares VAR(approx_lag)."""
    k = sigma.shape[0]
    g = autocovariances(coefs, sigma, max_lag + approx_lag + 1)
    big_gamma = np.block([[gamma(g, j - i) for j in range(approx_lag)] for i in range(approx_lag)])
    cross = np.concatenate([g[i + 1] for i in range(approx_lag)], axis=1)
    b = np.linalg.solve(big_gamma.T, cross.T).T  # [B_1 ... B_q]
    blocks = [np.eye(k)] + [-b[:, k * i: k * (i + 1)] for i in range(approx_lag)]  # e_t = sum_m D_m y_{t-m}
    out = []
    for h in range(max_lag + 1):
        c = np.zeros((k, k))
        for m, dm in enumerate(blocks):
            for n, dn in enumerate(blocks):
                c += dm @ gamma(g, h + n - m) @ dn.T
        out.append(c)
    return out


def lag2_information(coefs: list[np.ndarray], sigma: np.ndarray) -> float:
    """delta = log det Sigma(best VAR(1)) - log det Sigma_u: population one-step log-det loss from dropping lag 2."""
    residual = pseudo_true_residual_autocovariances(coefs, sigma, 1, 0)[0]
    return float(np.log(np.linalg.det(residual)) - np.log(np.linalg.det(sigma)))


def bic_penalty_per_extra_lag(sample_size: int, k: int) -> float:
    n = sample_size - maximum_candidate_lag(sample_size, k)
    return k * k * log(n) / n


def signal_ratio(delta: float, sample_size: int, k: int) -> float:
    """psi(T) = delta / (K^2 ln n / n): lag-2 population information relative to the BIC penalty for one extra lag."""
    return delta / bic_penalty_per_extra_lag(sample_size, k)


def underfit_detectability(coefs: list[np.ndarray], sigma: np.ndarray, sample_size: int, approx_lag: int = 1) -> dict:
    """Approximate asymptotic power of the nominal h=12 adjusted Portmanteau against the pseudo-true VAR(approx_lag) residual autocorrelation."""
    k = sigma.shape[0]
    c = pseudo_true_residual_autocovariances(coefs, sigma, approx_lag, HORIZON)
    c0_inv = np.linalg.inv(c[0])
    n = sample_size - approx_lag
    noncentrality = float(n * sum(np.trace(c[j].T @ c0_inv @ c[j] @ c0_inv) for j in range(1, HORIZON + 1)))
    df = k * k * (HORIZON - approx_lag)
    power = float(ncx2.sf(chi2.ppf(0.95, df), df, noncentrality))
    return {"noncentrality": noncentrality, "df": df, "approximate_power": power,
            "classification": "adequate_lower_order_approximation" if power <= ADEQUACY_POWER_THRESHOLD else "inadequate_lower_order_model"}


# ---------------------------------------------------------------- coefficient construction
def templates(k: int) -> tuple[np.ndarray, np.ndarray]:
    return COEFFICIENT_TEMPLATES[0][:k, :k], COEFFICIENT_TEMPLATES[1][:k, :k]


def scale_to_radius(fixed: list[np.ndarray], free_template: np.ndarray, target: float) -> float | None:
    """Smallest a >= 0 with spectral radius of [a*free_template, *fixed] equal to target; None if infeasible."""
    f = lambda a: spectral_radius([a * free_template] + fixed)
    if f(0.0) >= target:
        return None
    lower, upper = 0.0, 1.0
    while f(upper) < target:
        upper *= 2.0
        if upper > 1e3:
            return None
    for _ in range(200):
        mid = (lower + upper) / 2.0
        lower, upper = (mid, upper) if f(mid) < target else (lower, mid)
    return (lower + upper) / 2.0


def lag1_design(k: int, rho: float) -> list[np.ndarray]:
    if k == 3:
        return list(scaled_coefficients(1, rho))  # frozen v1.85 construction (bit-identical)
    t1, _ = templates(k)
    return [scale_to_radius([], t1, rho) * t1]


def v185_lag2_design(k: int, rho: float) -> list[np.ndarray]:
    """Frozen v1.85 construction: both templates scaled by one common factor to hit the spectral radius."""
    if k == 3:
        return list(scaled_coefficients(2, rho))
    t1, t2 = templates(k)
    f = lambda c: spectral_radius([c * t1, c * t2])
    lower, upper = 0.0, 1.0
    while f(upper) < rho:
        upper *= 2.0
    for _ in range(200):
        mid = (lower + upper) / 2.0
        lower, upper = (mid, upper) if f(mid) < rho else (lower, mid)
    c = (lower + upper) / 2.0
    return [c * t1, c * t2]


def signal_lag2_design(k: int, rho: float, sigma: np.ndarray, psi_target: float) -> dict:
    """Lag-2 design with the v1.85 lag-2 direction scaled by b and the lag-1 template scaled by a so that
    spectral radius = rho and psi(T_ref) = psi_target. Returns {'feasible': False, ...} if unattainable."""
    t1, t2 = templates(k)
    target_delta = psi_target * bic_penalty_per_extra_lag(SIGNAL_REFERENCE_T, k)

    def build(b):
        a = scale_to_radius([b * t2], t1, rho)
        return None if a is None else [a * t1, b * t2]

    b_low, b_high = 0.0, 1.0
    while build(b_high) is not None and lag2_information(build(b_high), sigma) < target_delta:
        b_high *= 2.0
        if b_high > 1e3:
            break
    # largest feasible b below b_high
    if build(b_high) is None:
        lo, hi = 0.0, b_high
        for _ in range(200):
            mid = (lo + hi) / 2.0
            lo, hi = (mid, hi) if build(mid) is not None else (lo, mid)
        b_high = lo
        if lag2_information(build(b_high), sigma) < target_delta:
            return {"feasible": False, "psi_target": psi_target, "psi_max_feasible": signal_ratio(lag2_information(build(b_high), sigma), SIGNAL_REFERENCE_T, k)}
    for _ in range(200):
        mid = (b_low + b_high) / 2.0
        b_low, b_high = (mid, b_high) if lag2_information(build(mid), sigma) < target_delta else (b_low, mid)
    coefs = build((b_low + b_high) / 2.0)
    return {"feasible": True, "psi_target": psi_target, "coefficients": coefs}


# ---------------------------------------------------------------- simulation
def simulate(coefs: list[np.ndarray], sigma: np.ndarray, sample_size: int, spec: str, innovation: str, count: int,
             rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """v1.85 generator generalised to K and explicit coefficients (burn-in 300, v1.85 intercept and month effects)."""
    k = sigma.shape[0]
    total = 300 + sample_size
    if innovation == "gaussian_iid":
        raw = rng.standard_normal((count, total, k))
    elif innovation == "multivariate_t5_scaled_to_covariance":
        raw = rng.standard_t(5, size=(count, total, k)) * sqrt(3.0 / 5.0)
    else:
        raise ValueError(innovation)
    innovations = raw @ np.linalg.cholesky(sigma).T
    values = np.zeros((count, total, k))
    deterministic = np.broadcast_to(INTERCEPT[:k], (total, k)).copy()
    if spec == "constant_plus_11_month_dummies":
        deterministic += month_effects(total)[:, :k]
    elif spec != "constant":
        raise ValueError(spec)
    for t in range(total):
        autoregressive = np.zeros((count, k))
        for lag, matrix in enumerate(coefs, start=1):
            if t >= lag:
                autoregressive += values[:, t - lag] @ matrix.T
        values[:, t] = deterministic[t] + autoregressive + innovations[:, t]
    months = np.arange(total, dtype=np.int64)[-sample_size:] % 12
    return values[:, -sample_size:], months


def information_criteria(data: np.ndarray, months: np.ndarray, spec: str) -> dict[str, np.ndarray]:
    """AIC/BIC/HQIC for lags 1..pmax on the production common sample; arrays of shape (batch, pmax)."""
    batch, total, k = data.shape
    pmax = maximum_candidate_lag(total, k)
    ld, n, params = [], None, []
    for lag in range(1, pmax + 1):
        offset = pmax - lag
        residuals, _, _ = fit_batch(data[:, offset:], months[offset:], lag, spec)
        n = residuals.shape[1]
        ld.append(np.linalg.slogdet(np.einsum("bni,bnj->bij", residuals, residuals) / n)[1])
        params.append(lag * k * k + k * deterministic_count(spec))
    ld, params = np.stack(ld, axis=1), np.array(params, dtype=float)
    return {"bic": ld + log(n) / n * params, "aic": ld + 2.0 / n * params, "hqic": ld + 2.0 * log(log(n)) / n * params, "n_common": n, "pmax": pmax}
