#!/usr/bin/env python3
"""Pre-registered offline simulation audit, not a real-data bias correction."""
import argparse
import hashlib
import itertools
import json
import platform
import time
import numpy as np
from finite_sample_common import Inputs, DATE, write, fit_path, critical_value, NORMAL_95, provenance

parser = argparse.ArgumentParser()
parser.add_argument("--smoke", action="store_true")
args = parser.parse_args()
inputs = Inputs()
periods = sorted({period for model in inputs.models for period in inputs.mp if model["sample_start"] <= period <= model["sample_end"]})
pairs = np.array([[inputs.mp[t], inputs.cbi[t]] for t in periods])
# RMS scaling leaves no-event pairs exactly zero and preserves correlation.
pairs = pairs / np.sqrt(np.mean(pairs**2, axis=0))
rho_shocks = float(np.corrcoef(pairs.T)[0, 1])
chol = np.linalg.cholesky(np.array([[1, rho_shocks], [rho_shocks, 1]]))
seed = 172004
designs = []
for n, p, h, persistence, support in itertools.product((96, 108, 114), (1, 2, 4, 6), (6, 12, 18, 24), (.2, .6, .9, .99), ("dense_iid", "empirical_sparse_iid")):
    key = p == 4 and h == 24 and persistence == .9
    designs.append({"n": n, "p": p, "h": h, "persistence": persistence, "shock_design": support,
                    "month_dummies": False, "tier": "key" if key else "exploratory", "replications": 10000 if key else 200,
                    "sup_t_draws_per_replication": 5000 if key else 256})
for support in ("dense_iid", "empirical_sparse_iid"):
    designs.append({"n": 108, "p": 4, "h": 24, "persistence": .9, "shock_design": support,
                    "month_dummies": True, "tier": "key", "replications": 10000, "sup_t_draws_per_replication": 5000})
for i, design in enumerate(designs):
    design["design_id"] = f"N{design['n']}_p{design['p']}_H{design['h']}_rho{design['persistence']}_{design['shock_design']}_seasonal{int(design['month_dummies'])}"
    design["seed"] = seed + i * 100003
registry = {"schema_version": "lp-finite-sample-simulation-registry-v1.72", "generated_at": DATE,
            "purpose": "diagnostic_only_not_real_data_coefficient_recalibration", "base_seed": seed, "input_sha256": provenance("build-finite-sample.py"),
            "dgp": "y[t]=rho*y[t-1]+0.8*MP[t]-0.35*CBI[t]+normal(0,0.35^2); burn-in 1000",
            "response_transform": "y[t+h]-y[t-1]", "true_response": "[0.8,-0.35]*rho^h per unit standardized shock",
            "lag_construction": "joint MP/CBI contemporaneous; p complete outcome/MP/CBI lag blocks; intercept; optional 11 monthly dummies",
            "sample_policy": "exactly N common rows for every horizon, presample p and future H excluded from N",
            "empirical_calibration": {"period_start": periods[0], "period_end": periods[-1], "month_count": len(periods),
                                      "joint_correlation": rho_shocks, "normalization": "component-wise RMS without demeaning; zero months stay zero",
                                      "sparse_design": "iid resampling paired frozen monthly shocks, preserving empirical marginal concentration approximately, not observed timing"},
            "inference": "HC1 90/95 pointwise normal; 95 Gaussian plug-in sup-t with stated design-specific draws",
            "seed_variation_policy": "new simulated sample and new independent sup-t seed each repetition",
            "not_covered": ["real-data causal bias identification", "log-level cumulative outcome nonlinear DGP", "all external control profiles", "bias-corrected inference", "estimated AIC selection randomness (p is fixed in each registered design)"],
            "environment": {"python": platform.python_version(), "numpy": np.__version__, "platform": platform.platform()},
            "designs": designs}
registry["configuration_sha256"] = hashlib.sha256(json.dumps(designs, sort_keys=True).encode()).hexdigest()
if not args.smoke:
    write("lp_finite_sample_simulation_registry.json", registry)

def run_design(design):
    n, p, horizon, rho = (design[key] for key in ("n", "p", "h", "persistence"))
    reps = 10 if args.smoke else design["replications"]
    draws = 128 if args.smoke else design["sup_t_draws_per_replication"]
    rng = np.random.default_rng(design["seed"])
    true = np.array([.8, -.35])[:, None] * rho**np.arange(horizon+1)
    estimates, squared_errors = np.zeros_like(true), np.zeros_like(true)
    covered90, covered95, width90, width95 = (np.zeros_like(true) for _ in range(4))
    paths_covered = np.zeros(2)
    successes = failures = 0
    ix = p + np.arange(n)
    for replication in range(reps):
        length = 1000 + p + n + horizon
        shocks = (rng.standard_normal((length, 2)) @ chol.T if design["shock_design"] == "dense_iid"
                  else pairs[rng.integers(len(pairs), size=length)])
        noise = rng.normal(scale=.35, size=length)
        outcome = np.zeros(length)
        for t in range(1, length):
            outcome[t] = rho*outcome[t-1]+.8*shocks[t, 0]-.35*shocks[t, 1]+noise[t]
        outcome, shocks = outcome[1000:], shocks[1000:]
        xcols = [shocks[ix, 0], shocks[ix, 1]]
        for lag in range(1, p+1):
            xcols.extend([outcome[ix-lag], shocks[ix-lag, 0], shocks[ix-lag, 1]])
        if design["month_dummies"]:
            xcols.extend((ix % 12 == month).astype(float) for month in range(1, 12))
        xcols.append(np.ones(n))
        x = np.column_stack(xcols)
        y = outcome[ix[:, None]+np.arange(horizon+1)] - outcome[ix-1, None]
        try:
            fit = fit_path(x, y)
            if fit["rank"] < x.shape[1]:
                raise ValueError("singular design")
            se = np.sqrt(np.maximum(0, np.diagonal(fit["covariance"], axis1=1, axis2=2)))
            if not np.all(np.isfinite(se)) or np.any(se <= 0):
                raise ValueError("invalid covariance")
            criticals = np.array([critical_value(fit["covariance"][c], design["seed"]+replication*2+c, draws)[0] for c in range(2)])
            error = fit["beta"]-true
            estimates += fit["beta"]
            squared_errors += error**2
            covered90 += np.abs(error) <= 1.6448536269514722*se
            covered95 += np.abs(error) <= NORMAL_95*se
            width90 += 2*1.6448536269514722*se
            width95 += 2*NORMAL_95*se
            paths_covered += np.all(np.abs(error) <= criticals[:, None]*se, axis=1)
            successes += 1
        except (np.linalg.LinAlgError, ValueError):
            failures += 1
    if successes == 0:
        raise RuntimeError("No successful simulations")
    components = {}
    for c, component in enumerate(("mp", "cbi")):
        coverage = paths_covered[c]/successes
        components[component] = {"bias_by_horizon": (estimates[c]/successes-true[c]).tolist(),
                                "rmse_by_horizon": np.sqrt(squared_errors[c]/successes).tolist(),
                                "pointwise_coverage90": (covered90[c]/successes).tolist(),
                                "pointwise_coverage95": (covered95[c]/successes).tolist(),
                                "average_interval_width90": (width90[c]/successes).tolist(),
                                "average_interval_width95": (width95[c]/successes).tolist(),
                                "sup_t_path_coverage95": float(coverage),
                                "path_coverage_monte_carlo_standard_error": float(np.sqrt(coverage*(1-coverage)/successes))}
    return {**design, "completed_replications": reps, "successful_replications": successes, "failure_count": failures,
            "failure_singular_rate": failures/reps, "coverage_denominator": "successful_replications; failures separately disclosed", "components": components}

results = []
start = time.monotonic()
for i, design in enumerate(designs[:1] if args.smoke else designs):
    results.append(run_design(design))
    print(f"MC {i+1}/{len(designs)} {design['design_id']} reps={results[-1]['completed_replications']} elapsed={time.monotonic()-start:.1f}s", flush=True)
if not args.smoke:
    write("lp_finite_sample_simulation_results.json", {"schema_version": "lp-finite-sample-simulation-results-v1.72", "generated_at": DATE,
          "status": "completed_pending_validation", "configuration_sha256": registry["configuration_sha256"],
          "design_count": len(results), "key_design_count": sum(d["tier"] == "key" for d in results),
          "total_replications": sum(d["completed_replications"] for d in results), "records": results})
else:
    print("Smoke test only: no formal outputs written.")
