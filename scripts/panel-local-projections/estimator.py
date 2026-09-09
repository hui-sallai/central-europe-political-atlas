"""Independent aggregate-shock LP: FWL least squares and time-score sandwich.

Reference: Almuzara and Sancibrian, NY Fed SR1090 (August 2026).
No external author source is distributed. Small-sample IK is not implemented.
Inputs use an explicit, consecutive integer monthly calendar, not row offsets.
"""
import math
import numpy as np
from scipy.stats import norm


class PanelGateError(ValueError):
    pass


def absorb(values, effects):
    result = np.array(values, dtype=float, copy=True)
    if not effects:
        return result
    for _ in range(10000):
        previous = result.copy()
        for labels in effects:
            for label in np.unique(labels):
                mask = labels == label
                result[mask] -= result[mask].mean(axis=0)
        if np.max(np.abs(result - previous)) < 1e-10:
            return result
    raise PanelGateError("fixed_effect_absorption_not_converged")


def estimate(y, shocks, characteristics, units, times, horizon, controls=None,
             fixed_effects=(), cumulative=True, p_max=None, small_sample=False):
    if small_sample:
        raise PanelGateError("unsupported_reference_configuration: joint-shock IK not validated")
    y = np.asarray(y, float).reshape(-1)
    shocks = np.asarray(shocks, float).reshape(len(y), -1)
    characteristics = np.asarray(characteristics, float).reshape(len(y), -1)
    units, times = np.asarray(units), np.asarray(times)
    keys = list(zip(units.tolist(), times.tolist()))
    if len(set(keys)) != len(keys):
        raise PanelGateError("duplicate_unit_time")
    if not np.all(times == np.floor(times)):
        raise PanelGateError("integer_month_calendar_required")
    index = {key: row for row, key in enumerate(keys)}
    t_eff = len(np.unique(times))
    if horizon >= t_eff:
        raise PanelGateError("insufficient_time_dimension")
    p_max = math.ceil(np.cbrt(t_eff - horizon)) if p_max is None else p_max
    interactions = (shocks[:, :, None] * characteristics[:, None, :]).reshape(len(y), -1)
    k = interactions.shape[1]
    controls = np.empty((len(y), 0)) if controls is None else np.asarray(controls, float)

    def shifted(values, offset):
        out = np.full(values.shape, np.nan, dtype=float)
        for row, (unit, time) in enumerate(keys):
            source = index.get((unit, time + offset))
            if source is not None:
                out[row] = values[source]
        return out

    results = []
    for h in range(horizon + 1):
        target = sum((shifted(y, lead) for lead in range(h + 1)), np.zeros_like(y)) if cumulative else shifted(y, h)
        p = min(h, p_max)
        lag_source = np.column_stack((y, interactions))
        lag_columns = [shifted(lag_source[:, col], -lag) for col in range(k + 1) for lag in range(1, p + 1)]
        design = np.column_stack([interactions, *lag_columns, controls])
        usable = np.isfinite(target) & np.isfinite(design).all(axis=1)
        if not usable.any():
            raise PanelGateError("empty_horizon_sample")
        effects = [np.asarray(effect)[usable] for effect in fixed_effects]
        residualized = absorb(np.column_stack((target[usable], design[usable])), effects)
        response, regressors = residualized[:, 0], residualized[:, 1:]
        rank = np.linalg.matrix_rank(regressors)
        condition = float(np.linalg.cond(regressors))
        if rank != regressors.shape[1] or condition > 1e5:
            raise PanelGateError(f"rank_or_condition_gate:h={h}:rank={rank}:columns={regressors.shape[1]}:condition={condition}")
        beta = np.linalg.lstsq(regressors, response, rcond=None)[0]
        residual = response - regressors @ beta
        time_set, cluster = np.unique(times[usable], return_inverse=True)
        scores = np.zeros((len(time_set), regressors.shape[1]))
        np.add.at(scores, cluster, regressors * residual[:, None])
        # Full-rank, well-conditioned designs only. No HC1/N*T multiplier.
        bread = np.linalg.pinv(regressors.T @ regressors, rcond=np.finfo(float).eps ** (2 / 3))
        covariance = bread @ (scores.T @ scores) @ bread
        covariance = (covariance + covariance.T) / 2
        se = np.sqrt(np.maximum(0, np.diag(covariance)[:k]))
        if not np.isfinite(se).all() or np.any(se <= 0):
            raise PanelGateError("nonfinite_or_zero_standard_error")
        row = {"horizon": h, "estimate": beta[:k].tolist(), "se": se.tolist(),
               "covariance": covariance[:k, :k].tolist(), "df": "Inf",
               "p_value": (2 * norm.sf(np.abs(beta[:k] / se))).tolist(),
               "effective_time_clusters": len(time_set), "panel_rows": int(usable.sum()),
               "country_count": len(np.unique(units[usable])), "p_h": p, "p_max": p_max,
               "T_eff": t_eff, "rank": int(rank), "columns": regressors.shape[1],
               "condition_number": condition, "sample_start_index": int(time_set[0]),
               "sample_end_index": int(time_set[-1]),
               "sample_indices": np.flatnonzero(usable).tolist()}
        for confidence in (90, 95, 99):
            radius = norm.ppf(.5 + confidence / 200) * se
            row[f"ci{confidence}"] = np.column_stack((beta[:k] - radius, beta[:k] + radius)).tolist()
        results.append(row)
    return results
