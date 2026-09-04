#!/usr/bin/env python3
"""Offline shock-support and exhaustive leave-one-out diagnostics; frozen baseline."""
import argparse
from collections import defaultdict
import time
import numpy as np
from finite_sample_common import Inputs, DATE, write, fit_path, concentration, critical_value, path_change, month_add, provenance

parser = argparse.ArgumentParser()
parser.add_argument("--model-limit", type=int, default=0, help="Smoke test only; does not write formal outputs")
args = parser.parse_args()
inputs = Inputs()
events_by_month = defaultdict(list)
for event in inputs.events:
    events_by_month[event["date"][:7]].append(event)
aggregation_error = 0.0
for period in inputs.mp:
    events = events_by_month.get(period, [])
    aggregation_error = max(aggregation_error, abs(sum(e["MP_median"] for e in events)-inputs.mp[period]),
                            abs(sum(e["CBI_median"] for e in events)-inputs.cbi[period]))
if aggregation_error > 2e-7:
    raise SystemExit(f"Frozen event-to-month aggregation failed: {aggregation_error}")

monthly_records, event_records, support_records, summaries, covariance_audits, threshold_records = [], [], [], [], [], []
start = time.monotonic()

def summarize(rows, component):
    values = [r[component]["maximum_absolute_change"] for r in rows]
    worst = max(rows, key=lambda r: r[component]["maximum_absolute_change"])
    return {"median_change": float(np.median(values)), "percentile90_change": float(np.quantile(values, .9)),
            "maximum_change": float(max(values)), "most_influential": worst.get("event_id", worst.get("dropped_period")),
            "number_causing_sign_reversal": sum(r[component]["any_sign_reversal"] for r in rows),
            "number_causing_simultaneous_band_classification_change": sum(r[component]["simultaneous_band_classification_change"] for r in rows)}

for model_index, model in enumerate(inputs.models[:args.model_limit or None]):
    periods, x, y = inputs.design(model)
    baseline = fit_path(x, y)
    n, k = x.shape
    expected = np.array([[h["beta_mp_raw"], h["beta_cbi_raw"]] for h in model["horizons"]]).T
    if n != model["effective_n"] or not np.allclose(baseline["beta"], expected, atol=1e-8, rtol=1e-9):
        raise SystemExit(f"Independent baseline mismatch: {model['model_id']}")
    normalization = .25
    base_paths = expected * normalization
    # Baseline re-simulated with the identical NumPy seed scheme used in LOO, so
    # classification differences are not confounded by changing RNG algorithms.
    base_classifications, path_qa = [], []
    for c, component in enumerate(("mp", "cbi")):
        seed = 17200 + model_index * 2 + c
        critical, qa = critical_value(baseline["covariance"][c], seed)
        repeats = [critical_value(baseline["covariance"][c], seed + j * 1000)[0] for j in range(5)]
        assert critical == critical_value(baseline["covariance"][c], seed)[0]
        se = np.sqrt(np.diag(baseline["covariance"][c]))
        base_classifications.append(np.abs(expected[c]) > critical * se)
        prod_critical = model["simultaneous_inference"][f"{component}_critical_value_95"]
        path_qa.append({"component": component, **qa, "covariance": baseline["covariance"][c].tolist(),
                       "seed": seed, "draw_count": 5000, "same_seed_reproducible": True,
                       "independent_seed_critical_values": repeats, "empirical_seed_standard_deviation": float(np.std(repeats, ddof=1)),
                       "production_critical_value": prod_critical, "reference_critical_value": critical,
                       "production_difference": abs(prod_critical-critical), "not_narrower_than_pointwise": bool(prod_critical >= 1.959963984540054)})
    covariance_audits.append({"model_id": model["model_id"], "components": path_qa, "periods": periods,
                              "independent_design_x": x.tolist(), "independent_responses_y": y.tolist()})
    leverage = np.einsum("ij,ji->i", x, baseline["inverse_design"])
    rss = np.sum(baseline["residual"]**2, axis=0)
    mse = rss/(n-k)
    deleted_mse = (rss[None, :]-baseline["residual"]**2/(1-leverage[:, None]))/(n-k-1)
    inverse_gram_diagonal = np.sum(baseline["inverse_design"]**2, axis=1)
    standardized_residual = baseline["residual"]/np.sqrt(mse[None, :]*(1-leverage[:, None]))
    # Conventional externally variance-scaled DFBETAS, NOT v1.71's HC1-scaled
    # deletion effect; conventional heuristic thresholds must not be conflated.
    conventional_dfbetas = []
    for c in range(2):
        delta = baseline["inverse_design"][c, :, None]*baseline["residual"]/(1-leverage[:, None])
        conventional_dfbetas.append(delta/np.sqrt(deleted_mse*inverse_gram_diagonal[c]))
    threshold_records.append({"model_id": model["model_id"], "n": n, "k": k,
                              "dfbetas_small_sample_threshold": 2/np.sqrt(n), "dfbetas_large_effect_threshold": 1,
                              "leverage_2k_over_n": 2*k/n, "leverage_3k_over_n": 3*k/n,
                              "counts": {"leverage_above_2k_n": int(np.sum(leverage > 2*k/n)),
                                         "leverage_above_3k_n": int(np.sum(leverage > 3*k/n)),
                                         "residual_above_2_any_horizon": int(np.sum(np.max(np.abs(standardized_residual), axis=1)>2)),
                                         "residual_above_3_any_horizon": int(np.sum(np.max(np.abs(standardized_residual), axis=1)>3)),
                                         **{f"{label}_dfbetas_above_{threshold_name}": int(np.sum(np.max(np.abs(conventional_dfbetas[c]),axis=1)>threshold))
                                            for c,label in enumerate(("mp","cbi")) for threshold_name,threshold in (("2_sqrt_n",2/np.sqrt(n)),("1",1))}},
                              "automatic_deletion": False})

    def deletion_result(new_x, new_y):
        fit = fit_path(new_x, new_y)
        if fit["rank"] != k:
            raise ValueError(f"Singular leave-one-out design: {model['model_id']}")
        result = {"effective_n": fit["n"], "response_path": {"mp": (fit["beta"][0]*normalization).tolist(), "cbi": (fit["beta"][1]*normalization).tolist()}}
        for c, component in enumerate(("mp", "cbi")):
            critical, _ = critical_value(fit["covariance"][c], 17200 + model_index*2+c)
            classification = np.abs(fit["beta"][c]) > critical*np.sqrt(np.maximum(0,np.diag(fit["covariance"][c])))
            result[component] = {**path_change(base_paths[c], fit["beta"][c]*normalization),
                                 "simultaneous_critical_value_95": critical,
                                 "simultaneous_band_classification_change": bool(np.any(classification != base_classifications[c]))}
        return result

    month_rows = []
    for i, period in enumerate(periods):
        if x[i, 0] == 0 and x[i, 1] == 0:
            continue
        keep = np.arange(n) != i
        month_rows.append({"dropped_period": period, "mp_value": float(x[i, 0]), "cbi_value": float(x[i, 1]),
                           **deletion_result(x[keep], y[keep])})
    # Removing an observation does not remove its values from later lag blocks.
    # Event-contribution subtraction below intentionally DOES propagate to all
    # affected lag blocks; neither operation changes the frozen stored shocks.
    event_rows = []
    eligible_months = {month_add(period, -lag) for period in periods for lag in range(model["lp_lag_count"]+1)}
    for event in inputs.events:
        month = event["date"][:7]
        if month not in eligible_months:
            continue
        adjusted = x.copy()
        touched = []
        for i, period in enumerate(periods):
            if period == month:
                adjusted[i, :2] -= [event["MP_median"], event["CBI_median"]]
                touched.append([i, 0, 1])
            for lag in range(1, model["lp_lag_count"]+1):
                if month_add(period, -lag) == month:
                    mp_col = 2 + (lag-1)*3 + 1
                    adjusted[i, mp_col:mp_col+2] -= [event["MP_median"], event["CBI_median"]]
                    touched.append([i, mp_col, mp_col+1])
        event_rows.append({"event_id": event["event_id"], "date": event["date"], "month": month,
                           "frozen_mp_contribution": event["MP_median"], "frozen_cbi_contribution": event["CBI_median"],
                           "month_event_count": len(events_by_month[month]), "affects_sample_contemporaneously": month in periods,
                           "affected_design_cells": touched, "rotation_reestimated": False,
                           **deletion_result(adjusted, y)})
    sample_events = [e for period in periods for e in events_by_month.get(period, [])]
    support = {"model_id": model["model_id"], "status": "diagnostic_only", "usable_months": n,
               "mp": concentration(x[:, 0]), "cbi": concentration(x[:, 1]),
               "event_mp": concentration([e["MP_median"] for e in sample_events]),
               "event_cbi": concentration([e["CBI_median"] for e in sample_events]),
               "event_variation_denominator": "sum of squared event components; NOT sum of squared monthly aggregates (cross terms differ)",
               "months": [{"period": period, "event_count": len(events_by_month.get(period, [])),
                           "event_ids": [e["event_id"] for e in events_by_month.get(period, [])]} for period in periods]}
    support_records.append(support)
    month_summary = {c: summarize(month_rows, c) for c in ("mp", "cbi")}
    event_summary = {c: summarize(event_rows, c) for c in ("mp", "cbi")}
    monthly_records.append({"model_id": model["model_id"], "status": "diagnostic_only", "summary": month_summary, "deletions": month_rows})
    event_records.append({"model_id": model["model_id"], "status": "diagnostic_only", "summary": event_summary, "deletions": event_rows})
    summaries.append({"model_id": model["model_id"], "effective_n": n, "mp_support": support["mp"], "cbi_support": support["cbi"],
                      "leave_one_month": month_summary, "leave_one_event": event_summary,
                      "bias_audit_status": "partial_applicability_audit", "bias_correction_status": "registry_only",
                      "finite_sample_simulation_status": "pending", "baseline_replacement_allowed": False,
                      "sign_reversal_observed": any(month_summary[c]["number_causing_sign_reversal"] > 0 for c in ("mp", "cbi")),
                      "robustness_warning": None, "warning_rule": "numeric disclosure only; no validated extreme-instability cutoff or reliability rating"})
    print(f"support {model_index+1}/{len(inputs.models)} {model['model_id']}: {len(month_rows)} months, {len(event_rows)} events; elapsed={time.monotonic()-start:.1f}s", flush=True)

if not args.model_limit:
    common = {"generated_at": DATE, "input_sha256": provenance("build-shock-support.py"), "baseline_unchanged": True, "automatic_deletion": False,
              "band_classification": "any horizon exclusion-of-zero indicator changes using independently recomputed 95% plug-in Gaussian sup-t; common NumPy seeds; not a global significance test",
              "loo_draw_count": 5000, "baseline_classification_reference": "same independent NumPy implementation and seed as deletion fits, not the production JavaScript RNG"}
    write("lp_leave_one_shock_month_results.json", {"schema_version": "lp-leave-one-shock-month-v1.72", **common, "record_count": len(monthly_records), "records": monthly_records})
    write("lp_leave_one_event_results.json", {"schema_version": "lp-leave-one-event-v1.72", **common, "record_count": len(event_records), "records": event_records})
    write("lp_shock_support_status.json", {"schema_version": "lp-shock-support-status-v1.72", "generated_at": DATE,
          "classification_policy": "numeric_only_no_supported_categorical_cutoffs", "interpretation": "concentration-based support, NOT effective sample size for inference",
          "aggregation_maximum_error": aggregation_error, "aggregation_tolerance": 2e-7, "record_count": len(support_records), "records": support_records})
    write("lp_finite_sample_robustness_summary.json", {"schema_version": "lp-finite-sample-robustness-v1.72", "generated_at": DATE, "record_count": len(summaries), "records": summaries})
    write("lp_full_path_covariance_audit.json", {"schema_version": "lp-full-path-covariance-audit-v1.72", "generated_at": DATE,
          "status": "pending_cross_language_covariance_validation", "record_count": len(covariance_audits), "records": covariance_audits})
    write("lp_influence_threshold_registry.json", {"schema_version": "lp-influence-threshold-v1.72", "generated_at": DATE,
          "status": "diagnostic_only", "automatic_deletion": False,
          "definition": "conventional DFBETAS uses case-deleted MSE times full-design inverse Gram diagonal; legacy v1.71 HC1-scaled coefficient change is a different diagnostic",
          "threshold_semantics": {"dfbetas_2_sqrt_n": "sample-size-adjusted heuristic", "dfbetas_1": "large standardized coefficient-effect heuristic",
                                  "leverage_2k_n_3k_n": "heuristic multiples of average leverage, not hypothesis tests",
                                  "residual_2_3": "internally studentized residual magnitude heuristic, not simultaneous outlier tests"},
          "sources": ["https://library.virginia.edu/data/articles/detecting-influential-points-in-regression-with-dfbetas",
                      "https://sscc.wisc.edu/sscc/pubs/RegDiag-R/no-outlier-effects.html",
                      "https://www.statsmodels.org/dev/examples/notebooks/generated/linear_regression_diagnostics_plots.html"],
          "record_count": len(threshold_records), "records": threshold_records})
else:
    print("Smoke test only: no formal outputs written.")
