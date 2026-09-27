#!/usr/bin/env python3
"""Checkpointed preregistered synthetic calibration for VAR residual tests."""

from __future__ import annotations

import argparse
import json
import os
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from itertools import product
from math import floor, sqrt
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
from scipy.stats import chi2, f

from common import BASE_ENTROPY, COEFFICIENT_TEMPLATES, INNOVATION_COVARIANCE, companion_matrix, scaled_coefficients


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
DESIGN_PATH = DATA / "var_residual_diagnostic_simulation_design.json"
PREREG_PATH = DATA / "var_residual_diagnostic_preregistration.json"
CHUNK_SIZE = 250
HORIZONS = (12, 18, 24)
TESTS = ("pt_adjusted", "bg_lm", "edgerton_shukur_f")
PURPOSE_INDEX = {"primary": 2, "secondary": 3, "power": 4}


def deterministic_count(specification: str) -> int:
    return 1 if specification == "constant" else 12


def month_effects(total: int) -> np.ndarray:
    result = np.zeros((total, 3), dtype=np.float64)
    for t in range(total):
        month = t % 12
        if month == 11:
            continue
        angle = 2.0 * np.pi * month / 12.0
        result[t] = [0.15 * np.sin(angle), 0.12 * np.cos(angle), 0.10 * np.sin(angle + np.pi / 4.0)]
    return result


def simulate_batch(cell: dict, replication_count: int, spawn_key: tuple[int, ...]) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.Generator(np.random.PCG64DXSM(np.random.SeedSequence(BASE_ENTROPY, spawn_key=spawn_key)))
    sample_size = cell["sample_size"]
    burn_in = 300
    total = burn_in + sample_size
    coefs = scaled_coefficients(cell["true_lag"], cell["persistence"])
    if cell["innovation"] == "gaussian_iid":
        raw = rng.standard_normal((replication_count, total, 3))
    elif cell["innovation"] == "multivariate_t5_scaled_to_covariance":
        raw = rng.standard_t(5, size=(replication_count, total, 3)) * sqrt(3.0 / 5.0)
    else:
        raise ValueError(cell["innovation"])
    epsilon = raw @ np.linalg.cholesky(INNOVATION_COVARIANCE).T
    innovations = epsilon.copy()
    pattern = cell.get("serial_pattern")
    rho = cell.get("serial_rho", 0.0)
    if pattern == "common":
        scale = sqrt(1.0 - rho**2)
        innovations[:, 0] = scale * epsilon[:, 0]
        for t in range(1, total):
            innovations[:, t] = rho * innovations[:, t - 1] + scale * epsilon[:, t]
    elif pattern == "single_equation_dominant":
        scale = sqrt(1.0 - rho**2)
        innovations[:, 0, 0] = scale * epsilon[:, 0, 0]
        for t in range(1, total):
            innovations[:, t, 0] = rho * innovations[:, t - 1, 0] + scale * epsilon[:, t, 0]
    elif pattern is not None:
        raise ValueError(pattern)

    values = np.zeros((replication_count, total, 3), dtype=np.float64)
    intercept = np.array([0.05, -0.03, 0.02], dtype=np.float64)
    deterministic = np.broadcast_to(intercept, (total, 3)).copy()
    if cell["deterministic_spec"] == "constant_plus_11_month_dummies":
        deterministic += month_effects(total)
    for t in range(total):
        autoregressive = np.zeros((replication_count, 3), dtype=np.float64)
        for lag, matrix in enumerate(coefs, start=1):
            if t >= lag:
                autoregressive += values[:, t - lag] @ matrix.T
        values[:, t] = deterministic[t] + autoregressive + innovations[:, t]
    months = np.arange(total, dtype=np.int64)[-sample_size:] % 12
    return values[:, -sample_size:], months


def build_design(data: np.ndarray, months: np.ndarray, lag: int, deterministic_specification: str) -> tuple[np.ndarray, np.ndarray]:
    batch, total, dimension = data.shape
    observations = total - lag
    blocks = [np.ones((batch, observations, 1), dtype=np.float64)]
    if deterministic_specification == "constant_plus_11_month_dummies":
        dummies = np.zeros((observations, 11), dtype=np.float64)
        for row, month in enumerate(months[lag:]):
            if month < 11:
                dummies[row, month] = 1.0
        blocks.append(np.broadcast_to(dummies, (batch, observations, 11)))
    for offset in range(1, lag + 1):
        blocks.append(data[:, lag - offset : total - offset])
    return np.concatenate(blocks, axis=2), data[:, lag:]


def solve_batch(matrix: np.ndarray, target: np.ndarray) -> np.ndarray:
    try:
        return np.linalg.solve(matrix, target)
    except np.linalg.LinAlgError:
        return np.stack([np.linalg.lstsq(m, t, rcond=None)[0] for m, t in zip(matrix, target, strict=True)])


def fit_batch(data: np.ndarray, months: np.ndarray, lag: int, deterministic_specification: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    regressors, responses = build_design(data, months, lag, deterministic_specification)
    cross = np.einsum("bni,bnj->bij", regressors, regressors)
    right = np.einsum("bni,bnk->bik", regressors, responses)
    coefficients = solve_batch(cross, right)
    residuals = responses - np.matmul(regressors, coefficients)
    return residuals, regressors, coefficients


def select_bic_lags(data: np.ndarray, months: np.ndarray, deterministic_specification: str) -> np.ndarray:
    batch, total, dimension = data.shape
    maximum_lag = max(1, min(12, floor((total - 4) / (4 * dimension + 1))))
    values = []
    for lag in range(1, maximum_lag + 1):
        offset = maximum_lag - lag
        residuals, _, _ = fit_batch(data[:, offset:], months[offset:], lag, deterministic_specification)
        observations = residuals.shape[1]
        covariance = np.einsum("bni,bnj->bij", residuals, residuals) / observations
        _, logdet = np.linalg.slogdet(covariance)
        free_parameters = lag * dimension * dimension + dimension * deterministic_count(deterministic_specification)
        values.append(logdet + (np.log(observations) / observations) * free_parameters)
    return np.argmin(np.stack(values, axis=1), axis=1) + 1


def pt_batch(residuals: np.ndarray, var_lag: int, horizon: int) -> tuple[np.ndarray, np.ndarray]:
    batch, observations, dimension = residuals.shape
    c0 = np.einsum("bni,bnj->bij", residuals, residuals) / observations
    c0_inv = np.linalg.inv(c0)
    statistic = np.zeros(batch, dtype=np.float64)
    for lag in range(1, horizon + 1):
        covariance = np.einsum("bni,bnj->bij", residuals[:, lag:], residuals[:, :-lag]) / observations
        product = np.matmul(np.matmul(np.transpose(covariance, (0, 2, 1)), c0_inv), np.matmul(covariance, c0_inv))
        statistic += np.trace(product, axis1=1, axis2=2) / (observations - lag)
    statistic *= observations**2
    df = dimension**2 * (horizon - var_lag)
    return statistic, chi2.sf(statistic, df)


def bg_es_batch(residuals: np.ndarray, regressors: np.ndarray, horizon: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, int]:
    batch, observations, dimension = residuals.shape
    lagged = np.zeros((batch, observations, dimension * horizon), dtype=np.float64)
    for lag in range(1, horizon + 1):
        lagged[:, lag:, (lag - 1) * dimension : lag * dimension] = residuals[:, :-lag]
    unrestricted = np.concatenate([regressors, lagged], axis=2)
    if unrestricted.shape[2] >= observations:
        nan = np.full(batch, np.nan)
        return nan, nan, nan, nan, -1
    cross = np.einsum("bni,bnj->bij", unrestricted, unrestricted)
    right = np.einsum("bni,bnk->bik", unrestricted, residuals)
    coefficients = solve_batch(cross, right)
    unrestricted_residuals = residuals - np.matmul(unrestricted, coefficients)
    sigma_restricted = np.einsum("bni,bnj->bij", residuals, residuals) / observations
    sigma_unrestricted = np.einsum("bni,bnj->bij", unrestricted_residuals, unrestricted_residuals) / observations
    ratio_matrix = solve_batch(sigma_restricted, sigma_unrestricted)
    lm_statistic = observations * (dimension - np.trace(ratio_matrix, axis1=1, axis2=2))
    lm_df = horizon * dimension**2
    lm_p = chi2.sf(lm_statistic, lm_df)

    restricted_det = np.linalg.det(sigma_restricted)
    unrestricted_det = np.linalg.det(sigma_unrestricted)
    r_squared = 1.0 - unrestricted_det / restricted_det
    m = dimension * horizon
    q = 0.5 * dimension * m - 1.0
    regressor_count = regressors.shape[2]
    adjusted_n = observations - regressor_count - m - 0.5 * (dimension - m + 1.0)
    r_factor = sqrt((dimension**2 * m**2 - 4.0) / (dimension**2 + m**2 - 5.0))
    df2 = floor(adjusted_n * r_factor - q)
    base = np.maximum(1.0 - r_squared, np.finfo(np.float64).tiny)
    f_statistic = ((1.0 - base ** (1.0 / r_factor)) / (base ** (1.0 / r_factor))) * ((adjusted_n * r_factor - q) / (dimension * m))
    f_p = f.sf(f_statistic, lm_df, df2) if df2 > 0 else np.full(batch, np.nan)
    return lm_statistic, lm_p, f_statistic, f_p, df2


def diagnostics_for_group(residuals: np.ndarray, regressors: np.ndarray, lag: int) -> dict:
    counts = {test: {str(horizon): {"rejections": 0, "tested": 0, "not_tested": 0} for horizon in HORIZONS} for test in TESTS}
    for horizon in HORIZONS:
        pt_stat, pt_p = pt_batch(residuals, lag, horizon)
        lm_stat, lm_p, es_stat, es_p, es_df2 = bg_es_batch(residuals, regressors, horizon)
        for test_id, statistics, p_values, available in (
            ("pt_adjusted", pt_stat, pt_p, horizon > lag),
            ("bg_lm", lm_stat, lm_p, np.isfinite(lm_p)),
            ("edgerton_shukur_f", es_stat, es_p, np.isfinite(es_p) if es_df2 > 0 else False),
        ):
            available_array = np.broadcast_to(available, p_values.shape) if np.isscalar(available) else available
            tested = int(np.sum(available_array))
            counts[test_id][str(horizon)] = {
                "rejections": int(np.sum((p_values < 0.05) & available_array)),
                "tested": tested,
                "not_tested": int(len(p_values) - tested),
            }
    return counts


def merge_counts(target: dict, source: dict) -> None:
    for test in TESTS:
        for horizon in HORIZONS:
            key = str(horizon)
            for field in ("rejections", "tested", "not_tested"):
                target[test][key][field] += source[test][key][field]


def run_chunk(task: dict) -> dict:
    start = time.monotonic()
    cell = task["cell"]
    replication_count = task["replication_end"] - task["replication_start"]
    values, months = simulate_batch(cell, replication_count, tuple(task["spawn_key"]))
    selected_lags = np.full(replication_count, cell["true_lag"], dtype=np.int64)
    if cell["layer"] == "B":
        selected_lags = select_bic_lags(values, months, cell["deterministic_spec"])
    counts = {test: {str(horizon): {"rejections": 0, "tested": 0, "not_tested": 0} for horizon in HORIZONS} for test in TESTS}
    lag_counts: dict[str, int] = {}
    parameter_gate_passed = 0
    for lag in sorted(np.unique(selected_lags)):
        indices = np.flatnonzero(selected_lags == lag)
        residuals, regressors, _ = fit_batch(values[indices], months, int(lag), cell["deterministic_spec"])
        merge_counts(counts, diagnostics_for_group(residuals, regressors, int(lag)))
        lag_counts[str(int(lag))] = len(indices)
        ratio = residuals.shape[1] / (3 * int(lag) + deterministic_count(cell["deterministic_spec"]))
        if ratio >= 4:
            parameter_gate_passed += len(indices)
    return {
        "schema_version": "var-residual-diagnostic-checkpoint-v1.85",
        "phase": task["phase"],
        "cell_index": task["cell_index"],
        "cell_id": cell["cell_id"],
        "cell": cell,
        "chunk_index": task["chunk_index"],
        "replication_start": task["replication_start"],
        "replication_end": task["replication_end"],
        "spawn_key": task["spawn_key"],
        "counts": counts,
        "selected_lag_counts": lag_counts,
        "parameter_gate_passed": parameter_gate_passed,
        "elapsed_seconds": time.monotonic() - start,
    }


def primary_cells() -> list[dict]:
    cells = []
    for layer, sample_size, true_lag, persistence, deterministic in product(("A", "B"), (120, 132, 144), (1, 2), (0.5, 0.8, 0.95), ("constant", "constant_plus_11_month_dummies")):
        cells.append(make_cell("primary", layer, sample_size, true_lag, persistence, deterministic, "gaussian_iid"))
    return cells


def secondary_cells() -> list[dict]:
    cells = []
    primary_keys = {(c["layer"], c["sample_size"], c["true_lag"], c["persistence"], c["deterministic_spec"], c["innovation"]) for c in primary_cells()}
    for layer, sample_size, true_lag, persistence, deterministic, innovation in product(("A", "B"), (96, 108, 120, 132, 144), (1, 2, 3), (0.5, 0.8, 0.95), ("constant", "constant_plus_11_month_dummies"), ("gaussian_iid", "multivariate_t5_scaled_to_covariance")):
        key = (layer, sample_size, true_lag, persistence, deterministic, innovation)
        if key not in primary_keys:
            cells.append(make_cell("secondary", layer, sample_size, true_lag, persistence, deterministic, innovation))
    return cells


def power_cells() -> list[dict]:
    cells = []
    for layer, sample_size, true_lag, persistence, deterministic, strength, pattern in product(("A", "B"), (120, 132, 144), (1, 2), (0.5, 0.8, 0.95), ("constant", "constant_plus_11_month_dummies"), (0.1, 0.2, 0.35), ("common", "single_equation_dominant")):
        cell = make_cell("power", layer, sample_size, true_lag, persistence, deterministic, "gaussian_iid")
        cell["serial_rho"] = strength
        cell["serial_pattern"] = pattern
        cell["cell_id"] += f"_serial-{pattern}-rho{strength:.2f}"
        cells.append(cell)
    return cells


def make_cell(phase: str, layer: str, sample_size: int, true_lag: int, persistence: float, deterministic: str, innovation: str) -> dict:
    return {
        "cell_id": f"{phase}_L{layer}_T{sample_size}_p{true_lag}_r{persistence:.2f}_det-{deterministic}_innov-{innovation}",
        "layer": layer,
        "sample_size": sample_size,
        "true_lag": true_lag,
        "persistence": persistence,
        "deterministic_spec": deterministic,
        "innovation": innovation,
    }


def checkpoint_path(checkpoint_root: Path, phase: str, cell_index: int, chunk_index: int) -> Path:
    return checkpoint_root / phase / f"cell-{cell_index:04d}" / f"chunk-{chunk_index:04d}.json"


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=("primary", "secondary", "power"), required=True)
    parser.add_argument("--workers", type=int, default=max(1, min(8, os.cpu_count() or 1)))
    parser.add_argument("--checkpoint-dir", type=Path, default=Path(os.environ.get("VAR_RESIDUAL_CHECKPOINT_DIR", "/private/tmp/var-residual-diagnostic-checkpoints")))
    parser.add_argument("--max-new-chunks", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    design = json.loads(DESIGN_PATH.read_text())
    preregistration = json.loads(PREREG_PATH.read_text())
    if preregistration["candidate_list_frozen"] is not True:
        raise RuntimeError("candidate list is not frozen")
    cells = {"primary": primary_cells, "secondary": secondary_cells, "power": power_cells}[args.phase]()
    expected_cells = {"primary": 72, "secondary": 288, "power": 432}[args.phase]
    if len(cells) != expected_cells:
        raise RuntimeError(f"cell count drift: {len(cells)} != {expected_cells}")
    replications = {"primary": 10000, "secondary": 2000, "power": 2000}[args.phase]
    purpose = PURPOSE_INDEX[args.phase]
    tasks = []
    skipped = 0
    for cell_index, cell in enumerate(cells):
        for chunk_index, start in enumerate(range(0, replications, CHUNK_SIZE)):
            path = checkpoint_path(args.checkpoint_dir, args.phase, cell_index, chunk_index)
            if path.exists():
                skipped += 1
                continue
            tasks.append({
                "phase": args.phase,
                "cell_index": cell_index,
                "cell": cell,
                "chunk_index": chunk_index,
                "replication_start": start,
                "replication_end": min(replications, start + CHUNK_SIZE),
                "spawn_key": [purpose, 0 if cell["layer"] == "A" else 1, cell_index, chunk_index],
                "checkpoint_path": str(path),
            })
    if args.max_new_chunks is not None:
        tasks = tasks[: args.max_new_chunks]
    started = time.monotonic()
    completed = 0
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_chunk, task): task for task in tasks}
        for future in as_completed(futures):
            task = futures[future]
            result = future.result()
            atomic_write(Path(task["checkpoint_path"]), result)
            completed += 1
            if completed % 10 == 0 or completed == len(tasks):
                elapsed = time.monotonic() - started
                print(json.dumps({"phase": args.phase, "completed_new_chunks": completed, "scheduled_new_chunks": len(tasks), "preexisting_chunks": skipped, "elapsed_seconds": round(elapsed, 2)}, separators=(",", ":")), flush=True)
    print(json.dumps({"status": "complete" if args.max_new_chunks is None else "partial_by_request", "phase": args.phase, "new_chunks": completed, "preexisting_chunks": skipped, "checkpoint_dir": str(args.checkpoint_dir)}, indent=2))


if __name__ == "__main__":
    main()

