#!/usr/bin/env python3
"""Generate finite-sample critical values for the production seasonal-dummy ADF.

The browser never runs this simulation.  It reads the committed, validated JSON
fixture produced here.  The regression, lag-search sample and tau definition
mirror ``adfSeasonalDummyTest`` in ``src/lib/stationarityTests.ts``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import subprocess
import sys
from datetime import date
from pathlib import Path

import numpy as np
import scipy
from scipy.stats import gaussian_kde
import statsmodels


GENERATOR_VERSION = "seasonal-adf-mc-generator-v1.44"
DEFAULT_SAMPLE_SIZES = [96, 108, 120, 126, 132, 138, 144, 156, 168]
DEFAULT_REPLICATIONS = 50_000
DEFAULT_SEED = 144_043
REFERENCE_MONTH = "January"
# Destination-month deterministic increments.  The annual sum is exactly zero,
# so the null remains a zero-frequency unit root with a fixed seasonal pattern.
SEASONAL_INCREMENT = np.array(
    [-0.45, -0.20, 0.05, 0.25, 0.40, 0.30, 0.10, -0.05, -0.15, -0.20, -0.10, 0.05],
    dtype=np.float64,
)


def production_maxlag(n: int) -> int:
    proposed = int(np.ceil(12.0 * (n / 100.0) ** 0.25))
    return min(proposed, (n - 12) // 2 - 2)


def month_dummies(destination_indices: np.ndarray) -> np.ndarray:
    """Return February..December dummies for zero-based series indices."""
    months = destination_indices % 12
    return (months[:, None] == np.arange(1, 12)[None, :]).astype(np.float64)


def simulate_paths(rng: np.random.Generator, replications: int, n: int, phi: float | None) -> np.ndarray:
    errors = rng.standard_normal((replications, n - 1))
    destination_months = np.arange(1, n) % 12
    if phi is None:
        differences = errors + SEASONAL_INCREMENT[destination_months][None, :]
        values = np.zeros((replications, n), dtype=np.float64)
        values[:, 1:] = np.cumsum(differences, axis=1)
        return values

    seasonal_level = np.array([0.15, -0.10, -0.25, -0.05, 0.20, 0.35, 0.25, 0.10, -0.05, -0.20, -0.25, -0.15])
    innovations = np.zeros((replications, n), dtype=np.float64)
    for t in range(1, n):
        innovations[:, t] = phi * innovations[:, t - 1] + errors[:, t - 1]
    return innovations + seasonal_level[np.arange(n) % 12][None, :]


def solve_ols_from_gram(gram: np.ndarray, rhs: np.ndarray, yty: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    beta = np.linalg.solve(gram, rhs[..., None])[..., 0]
    sse = yty - np.einsum("bi,bi->b", beta, rhs)
    return beta, np.maximum(sse, np.finfo(np.float64).tiny)


def seasonal_adf_tau_batch(values: np.ndarray, autolag: str = "aic") -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return tau, selected lag and final nobs using the exact production design."""
    batch, n = values.shape
    maxlag = production_maxlag(n)
    if maxlag < 0:
        raise ValueError("sample too short for seasonal-dummy ADF")
    differences = np.diff(values, axis=1)

    # Autolag candidates share the maxlag-trimmed sample, exactly as production.
    t_common = np.arange(maxlag, n - 1)
    response = differences[:, t_common]
    deterministic = np.column_stack((np.ones(t_common.size), month_dummies(t_common + 1)))
    level = values[:, t_common]
    diff_lags = np.stack([differences[:, t_common - lag] for lag in range(1, maxlag + 1)], axis=2)
    full = np.concatenate(
        (
            np.broadcast_to(deterministic[None, :, :], (batch, t_common.size, 12)),
            level[:, :, None],
            diff_lags,
        ),
        axis=2,
    )
    gram_full = np.einsum("bni,bnj->bij", full, full)
    rhs_full = np.einsum("bni,bn->bi", full, response)
    yty = np.einsum("bn,bn->b", response, response)
    best_ic = np.full(batch, np.inf)
    best_lag = np.full(batch, maxlag, dtype=np.int16)
    for lag in range(maxlag + 1):
        columns = 13 + lag
        _, sse = solve_ols_from_gram(gram_full[:, :columns, :columns], rhs_full[:, :columns], yty)
        penalty = 2.0 * columns if autolag == "aic" else np.log(t_common.size) * columns
        ic = t_common.size * np.log(sse / t_common.size) + t_common.size * (1.0 + np.log(2.0 * np.pi)) + penalty
        improved = ic < best_ic
        best_ic[improved] = ic[improved]
        best_lag[improved] = lag

    tau = np.full(batch, np.nan)
    final_nobs = np.zeros(batch, dtype=np.int16)
    for lag in np.unique(best_lag):
        selected = np.flatnonzero(best_lag == lag)
        t_final = np.arange(int(lag), n - 1)
        response_final = differences[selected][:, t_final]
        deterministic_final = np.column_stack((np.ones(t_final.size), month_dummies(t_final + 1)))
        columns = [values[selected][:, t_final, None]]
        if lag:
            columns.append(np.stack([differences[selected][:, t_final - j] for j in range(1, int(lag) + 1)], axis=2))
        columns.append(np.broadcast_to(deterministic_final[None, :, :], (selected.size, t_final.size, 12)))
        design = np.concatenate(columns, axis=2)
        gram = np.einsum("bni,bnj->bij", design, design)
        rhs = np.einsum("bni,bn->bi", design, response_final)
        yty_final = np.einsum("bn,bn->b", response_final, response_final)
        beta, sse = solve_ols_from_gram(gram, rhs, yty_final)
        inverse_gram = np.linalg.inv(gram)
        dof = t_final.size - design.shape[2]
        standard_error = np.sqrt((sse / dof) * inverse_gram[:, 0, 0])
        tau[selected] = beta[:, 0] / standard_error
        final_nobs[selected] = t_final.size
    return tau, best_lag, final_nobs


def simulate_tau(n: int, replications: int, seed: int, batch_size: int, phi: float | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(np.random.SeedSequence([seed, n, 0 if phi is None else int(phi * 10_000)]))
    tau_parts: list[np.ndarray] = []
    lag_parts: list[np.ndarray] = []
    nobs_parts: list[np.ndarray] = []
    for start in range(0, replications, batch_size):
        size = min(batch_size, replications - start)
        values = simulate_paths(rng, size, n, phi)
        tau, lag, nobs = seasonal_adf_tau_batch(values)
        tau_parts.append(tau)
        lag_parts.append(lag)
        nobs_parts.append(nobs)
    return np.concatenate(tau_parts), np.concatenate(lag_parts), np.concatenate(nobs_parts)


def critical_value_standard_error(tau: np.ndarray, quantile: float, critical_value: float) -> float:
    density = float(gaussian_kde(tau)([critical_value])[0])
    return float(np.sqrt(quantile * (1.0 - quantile) / tau.size) / density)


def calibration_record(n: int, replications: int, seed: int, batch_size: int) -> dict:
    tau, selected_lag, final_nobs = simulate_tau(n, replications, seed, batch_size)
    if not np.isfinite(tau).all():
        raise RuntimeError(f"non-finite tau values for N={n}")
    quantiles = np.quantile(tau, [0.01, 0.05, 0.10], method="linear")
    lag_values, lag_counts = np.unique(selected_lag, return_counts=True)
    probability_se = {label: float(np.sqrt(q * (1.0 - q) / replications)) for label, q in (("1pct", 0.01), ("5pct", 0.05), ("10pct", 0.10))}
    critical_se = {
        label: critical_value_standard_error(tau, q, float(value))
        for label, q, value in zip(("1pct", "5pct", "10pct"), (0.01, 0.05, 0.10), quantiles, strict=True)
    }
    return {
        "sample_size": n,
        "sample_size_basis": "input_series_length_before_adf_lag_loss",
        "autolag": "aic",
        "maxlag_rule": "min(ceil(12*(N/100)^0.25), floor((N-12)/2)-2)",
        "max_lag": production_maxlag(n),
        "deterministic_terms": "constant_plus_11_month_dummies",
        "reference_month": REFERENCE_MONTH,
        "replications": replications,
        "seed": seed,
        "critical_1pct": float(quantiles[0]),
        "critical_5pct": float(quantiles[1]),
        "critical_10pct": float(quantiles[2]),
        "simulation_standard_error": {
            "tail_probability": probability_se,
            "critical_value_kde_delta_method": critical_se,
        },
        "selected_lag_frequency": {str(int(lag)): int(count) for lag, count in zip(lag_values, lag_counts, strict=True)},
        "effective_nobs_min": int(final_nobs.min()),
        "effective_nobs_max": int(final_nobs.max()),
        "tau_distribution_sha256": hashlib.sha256(tau.astype("<f8").tobytes()).hexdigest(),
    }


def source_commit(root: Path) -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unavailable"


def run_validation(records: list[dict], seed: int, batch_size: int) -> dict:
    # Same-seed reproducibility checks exact generated tau values on a compact fixture.
    first, _, _ = simulate_tau(120, 2_000, seed + 1, batch_size)
    second, _, _ = simulate_tau(120, 2_000, seed + 1, batch_size)
    same_seed = np.array_equal(first, second)

    # Independent seeds should agree within their combined Monte Carlo uncertainty.
    different_a, _, _ = simulate_tau(120, 5_000, seed + 2, batch_size)
    different_b, _, _ = simulate_tau(120, 5_000, seed + 3, batch_size)
    cv_a = float(np.quantile(different_a, 0.05))
    cv_b = float(np.quantile(different_b, 0.05))
    se_a = critical_value_standard_error(different_a, 0.05, cv_a)
    se_b = critical_value_standard_error(different_b, 0.05, cv_b)
    tolerance = 4.0 * np.sqrt(se_a**2 + se_b**2)

    record_132 = next(record for record in records if record["sample_size"] == 132)
    holdout_null, _, _ = simulate_tau(132, 10_000, seed + 10, batch_size)
    null_rejection = float(np.mean(holdout_null < record_132["critical_5pct"]))
    stationary, _, _ = simulate_tau(132, 5_000, seed + 20, batch_size, phi=0.85)
    power_rejection = float(np.mean(stationary < record_132["critical_5pct"]))
    return {
        "same_seed_reproducible": same_seed,
        "same_seed_fixture_replications": 2_000,
        "different_seed_5pct_critical_values": [cv_a, cv_b],
        "different_seed_absolute_difference": abs(cv_a - cv_b),
        "different_seed_mc_tolerance": tolerance,
        "different_seed_within_mc_tolerance": abs(cv_a - cv_b) <= tolerance,
        "null_size_test": {
            "sample_size": 132,
            "replications": 10_000,
            "rejection_rate_5pct": null_rejection,
            "acceptance_interval": [0.04, 0.06],
            "passed": 0.04 <= null_rejection <= 0.06,
        },
        "stationary_ar_power_sanity": {
            "sample_size": 132,
            "phi": 0.85,
            "replications": 5_000,
            "rejection_rate_5pct": power_rejection,
            "passed": power_rejection > null_rejection + 0.25,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--replications", type=int, default=DEFAULT_REPLICATIONS)
    parser.add_argument("--sample-sizes", type=int, nargs="+", default=DEFAULT_SAMPLE_SIZES)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--skip-validation", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("src/data/macro/seasonal_adf_critical_values.json"))
    args = parser.parse_args()
    if args.replications < 1:
        raise SystemExit("replications must be positive")
    root = Path(__file__).resolve().parents[2]
    records = [calibration_record(n, args.replications, args.seed, args.batch_size) for n in args.sample_sizes]
    validation = None if args.skip_validation else run_validation(records, args.seed, args.batch_size)
    payload = {
        "schema_version": "seasonal-adf-critical-values-v1.44",
        "specification_id": "adf_constant_seasonal_dummies_mc",
        "state": "active_after_validation" if validation and all(
            [validation["same_seed_reproducible"], validation["different_seed_within_mc_tolerance"], validation["null_size_test"]["passed"], validation["stationary_ar_power_sanity"]["passed"]]
        ) else "generated_pending_validation",
        "calibration_target": "input_series_length_before_adf_lag_loss",
        "sample_size_grid": args.sample_sizes,
        "interpolation_policy": "linear_between_bracketing_sample_sizes; nearest_endpoint_outside_grid",
        "empirical_p_value_available": False,
        "dgp": {
            "null": "zero_frequency_unit_root_with_fixed_deterministic_monthly_increment",
            "equation": "y_t = y_(t-1) + seasonal_increment_month(t) + epsilon_t",
            "epsilon": "iid_standard_normal",
            "seasonal_increment_by_jan_to_dec": SEASONAL_INCREMENT.tolist(),
            "annual_seasonal_increment_sum": float(SEASONAL_INCREMENT.sum()),
        },
        "regression_design": {
            "terms": ["lagged_level", "selected_lags_of_first_difference", "constant", "11_month_dummies"],
            "reference_month": REFERENCE_MONTH,
            "autolag": "aic",
            "autolag_sample": "common_sample_trimmed_at_maxlag",
            "final_refit": "selected_lag_sample",
            "tau": "lagged_level_coefficient_divided_by_its_ols_standard_error",
            "maxlag_rule": "min(ceil(12*(N/100)^0.25), floor((N-12)/2)-2)",
        },
        "provenance": {
            "generator_version": GENERATOR_VERSION,
            "generation_date": date.today().isoformat(),
            "source_commit": source_commit(root),
            "python_version": platform.python_version(),
            "numpy_version": np.__version__,
            "scipy_version": scipy.__version__,
            "statsmodels_version": statsmodels.__version__,
            "platform": platform.platform(),
            "seed": args.seed,
            "replications_per_sample_size": args.replications,
            "batch_size": args.batch_size,
        },
        "validation": validation,
        "records": records,
    }
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output}")
    for record in records:
        print(f"N={record['sample_size']} cv5={record['critical_5pct']:.6f} reps={record['replications']}")
    if validation:
        print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
