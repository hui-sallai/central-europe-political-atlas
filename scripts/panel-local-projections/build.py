"""Offline fixed-eight-country panel build; never rewrites single-country outputs."""
import hashlib
from datetime import date
import json
from pathlib import Path
import numpy as np
from estimator import estimate, PanelGateError
from reference import compare, save

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/panel-local-projections"
COUNTRIES = [("AT", "austria"), ("DE", "germany"), ("SK", "slovakia"), ("SI", "slovenia"),
             ("CZ", "czechia"), ("HU", "hungary"), ("PL", "poland"), ("RO", "romania")]


def read(path):
    return json.loads((ROOT/path).read_text())


def emit(name, **contents):
    save(DATA/f"{name}.json", {"schema_version": f"{name.replace('_', '-')}-v1.8", "generated_at": date.today().isoformat(), **contents})


def main():
    reference = read("src/data/panel-local-projections/panel_lp_reference_cases.json")
    compare(reference, reference["author_reference"])
    country_records = [{"code": code, "country": country, "group": "euro" if i < 4 else "non_euro",
                        "euro_dummy": int(i < 4), "non_euro_dummy": int(i >= 4),
                        "contrast": .5 if i < 4 else -.5} for i, (code, country) in enumerate(COUNTRIES)]
    emit("panel_lp_country_registry", fixed_composition=True, records=country_records,
         excluded=[{"code": "HR", "reason": "2023-01 euro adoption monetary regime break"},
                   {"code": "RS", "reason": "insufficient common monthly outcome coverage"}])
    emit("panel_lp_method_registry", state="registry_only", activation_gate="reference + production + UI + full regression + release validation",
         method="aggregate-shock time-clustered lag-augmented heteroskedasticity-robust (t-LAHR)",
         implementation="independent Python NumPy/SciPy offline estimator", small_sample=False, df="Inf",
         covariance="inverse(Xresid'Xresid) sum_t(score_t score_t') inverse(Xresid'Xresid)",
         score="sum_i Xresid_it * residual_it", clustering="time", hc1_correction=False,
         country_fe=True, baseline_time_fe=False, shock_normalization=.25,
         joint_shocks=["ecb_pure_monetary_policy_shock_jk_median_v1", "ecb_central_bank_information_shock_jk_median_v1"],
         lag_policy="p_max=ceil((T_eff-H)^(1/3)); p_h=min(h,p_max); lag y and every shock-characteristic interaction",
         interval_levels=[90,95,99], panel_simultaneous_bands="registry_only", country_specific_formal_tests="registry_only",
         interpretation="fixed four-country euro group and fixed four-country non-euro group, not entire regions; panel rows are not independent shock observations")
    emit("panel_lp_small_sample_method_registry", method="Imbens-Kolesar", state="registry_only",
         applicability="blocked_for_validated_joint_shock_extension", author_recommendation="finite-sample refinement",
         issue="n_s=ncol(s)*ncol(X)=4; small_sample TRUE accesses s[,i_s] although s has only 2 columns",
         required_extension="derive shock-specific heterogeneity instrument and projection for each interaction; no modulo substitution",
         required_validation=["mathematical derivation", "independent R/Python/Matlab joint-shock numerical validation"],
         negative_reference_test=reference["author_reference"]["small_sample_negative"])
    specifications = read("src/data/local-projections/lp_outcome_specification_registry.json")["records"][:4]
    hf = read("src/data/high-frequency/high_frequency_observations.json")["records"]
    macro = read("src/data/macro-drivers/macro_driver_observations.json")["records"]
    mp = {r["period"]: r["value"] for r in read("src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json")["records"]}
    cbi = {r["period"]: r["value"] for r in read("src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json")["records"]}
    periods = sorted(p for p in mp if "2015-01" <= p <= "2025-10")
    # Fixed calendar, including no-event zero months. No forward-filling missing shocks.
    assert all(p in cbi for p in periods)
    monthly_x = np.array([[mp[p], cbi[p]] for p in periods], float)
    x = np.repeat(monthly_x, 8, axis=0)
    units = np.tile(np.arange(8), len(periods))
    times = np.repeat(np.arange(len(periods)), 8)
    contrast = np.where(units < 4, .5, -.5)
    direct = np.column_stack((units < 4, units >= 4)).astype(float)
    average_contrast = np.column_stack((np.ones(len(units)), contrast))
    models, results, readiness, samples, identities, parameterizations = [], [], [], [], [], []
    for spec in specifications:
        source = hf if spec["source"] == "high_frequency" else macro
        values = {(r["country"], r["period"]): r["value"] for r in source
                  if r.get("indicator", r.get("driver_id")) == spec["field"]
                  and (spec["source"] == "high_frequency" or r.get("transformation") == "level")}
        level = np.array([[values.get((country, period)) for _, country in COUNTRIES] for period in periods], float)
        log_outcome = spec["unit"] == "cumulative_percent"
        if log_outcome and np.any(level[np.isfinite(level)] <= 0):
            raise PanelGateError("nonpositive_log_outcome")
        transformed = 100*np.log(level) if log_outcome else level
        delta = np.vstack((np.full((1, 8), np.nan), np.diff(transformed, axis=0)))
        y = delta.reshape(-1)
        # Do not mask an incomplete country into a seven-country or silently imputed panel.
        missing_countries = [country for i, (_, country) in enumerate(COUNTRIES) if np.isfinite(level[:, i]).sum() < 97]
        checks, maximum_error = 0, 0.
        for h in range(25):
            for t in range(1, len(periods)-h):
                target = transformed[t+h] - transformed[t-1]
                cumulative = np.sum(delta[t:t+h+1], axis=0)
                valid = np.isfinite(target) & np.isfinite(cumulative)
                checks += int(valid.sum())
                if valid.any():
                    maximum_error = max(maximum_error, float(np.max(np.abs(target[valid]-cumulative[valid]))))
        identities.append({"outcome_id": spec["id"], "country_date_horizon_checks": checks,
                           "maximum_absolute_error": maximum_error, "status": "pass" if checks and maximum_error < 1e-10 else "fail",
                           "registered_definition": spec["response"]})
        controls = None
        if spec["monthDummies"]:
            months = np.repeat(np.array([int(p[5:]) for p in periods]), 8)
            controls = np.column_stack([months == m for m in range(2,13)]).astype(float)
        attempts, chosen, paths = [], None, None
        if not missing_countries:
            for horizon in (24,18,12,6):
                try:
                    a = estimate(y, x, direct, units, times, horizon, controls, [units])
                    balanced = all(h["panel_rows"] == 8*h["effective_time_clusters"] and h["country_count"] == 8 for h in a)
                    clusters = min(h["effective_time_clusters"] for h in a)
                    attempts.append({"horizon": horizon, "minimum_time_clusters": clusters, "balanced": balanced,
                                     "status": "pass" if balanced and clusters >= 96 else "fail"})
                    if not balanced:
                        break
                    if clusters < 96:
                        continue
                    b = estimate(y, x, average_contrast, units, times, horizon, controls, [units])
                    # Month-of-year controls are absorbed by full time FE; omit these redundant columns.
                    sensitivity = estimate(y, x, contrast[:, None], units, times, horizon, None, [units, times])
                    chosen, paths = horizon, (a,b,sensitivity)
                    break
                except PanelGateError as error:
                    attempts.append({"horizon": horizon, "status": "blocked", "reason": str(error)})
                    break
        available = paths is not None and identities[-1]["status"] == "pass"
        row = {"outcome_id": spec["id"], "state": "validated_candidate" if available else "unavailable",
               "publication_ready": False, "requested_horizon": 24, "eligible_horizon": chosen,
               "attempts": attempts, "missing_countries": missing_countries,
               "blockers": ["release_gates_pending"] if available else ["fixed_eight_country_sample_or_numerical_gate_failed"]}
        readiness.append(row)
        if not available:
            continue
        a,b,sensitivity = paths
        outcome_rows, identity_error = [], 0.
        for ah,bh,sh in zip(a,b,sensitivity):
            assert ah["sample_indices"] == bh["sample_indices"] == sh["sample_indices"]
            for shock_index, shock_id in enumerate(("MP", "CBI")):
                e, ne = np.array(ah["estimate"])[shock_index*2:shock_index*2+2]
                avg, diff = np.array(bh["estimate"])[shock_index*2:shock_index*2+2]
                error = max(abs(e-avg-.5*diff), abs(ne-avg+.5*diff), abs(e-ne-diff))
                identity_error = max(identity_error, float(error))
                assert error < 1e-7, "parameterization_identity_failed"
                record = {"horizon": ah["horizon"], "shock": shock_id,
                          **{key: ah[key] for key in ("effective_time_clusters", "panel_rows", "country_count", "p_h")},
                          "sample_start": periods[ah["sample_start_index"]], "sample_end": periods[ah["sample_end_index"]]}
                for prefix,path,index in (("euro",ah,2*shock_index), ("non_euro",ah,2*shock_index+1), ("difference",bh,2*shock_index+1)):
                    record[f"{prefix}_estimate"] = path["estimate"][index]*.25
                    record[f"{prefix}_se"] = path["se"][index]*.25
                    record[f"{prefix}_p_value"] = path["p_value"][index]
                    for confidence in (90,95,99):
                        record[f"{prefix}_ci{confidence}"] = (np.array(path[f"ci{confidence}"][index])*.25).tolist()
                record["time_fe_sensitivity"] = {"interpretation": "difference_only_secondary_robustness", "estimate": sh["estimate"][shock_index]*.25,
                                                 "se": sh["se"][shock_index]*.25, "ci95": (np.array(sh["ci95"][shock_index])*.25).tolist()}
                outcome_rows.append(record)
        parameterizations.append({"outcome_id": spec["id"], "status": "pass", "maximum_absolute_error": identity_error,
                                  "tests": 2*(chosen+1)*3, "sample_identity": True})
        diagnostics = []
        for h in a:
            ix = np.unique(times[h["sample_indices"]])
            shocks = monthly_x[ix]
            support = {}
            for j, name in enumerate(("MP", "CBI")):
                squares = shocks[:,j]**2
                support[name] = {"nonzero_months": int(np.count_nonzero(shocks[:,j])), "zero_months": int(np.count_nonzero(shocks[:,j] == 0)),
                                 "largest_squared_shock_share": float(squares.max()/squares.sum()),
                                 "top_three_squared_shock_share": float(np.sort(squares)[-3:].sum()/squares.sum()),
                                 "support_unit": "month_not_country_row"}
            diagnostics.append({key: value for key,value in h.items() if key not in ("estimate","se","covariance","p_value","ci90","ci95","ci99","sample_indices")}
                               | {"sample_start": periods[h["sample_start_index"]], "sample_end": periods[h["sample_end_index"]],
                                  "balanced_panel": True, "group_sizes": {"euro":4,"non_euro":4},
                                  "shock_correlation": float(np.corrcoef(shocks.T)[0,1]), "shock_support": support})
        models.append({"model_id": f"panel-lp:{spec['id']}:joint:h{chosen}", "outcome_id": spec["id"], "eligible_horizon": chosen,
                       "T_eff": len(periods), "p_max": a[0]["p_max"], "diagnostics": diagnostics})
        samples.append({"outcome_id": spec["id"], "calendar_start": periods[0], "calendar_end": periods[-1],
                        "policy": "author_exact_horizon_specific_available_cumulative_and_lags", "requested_horizon":24,
                        "eligible_horizon":chosen,"fallback_attempts":attempts,"horizons":diagnostics})
        results.append({"outcome_id": spec["id"], "response_unit": spec["unit"], "eligible_horizon":chosen,"records":outcome_rows})
    emit("panel_lp_outcome_registry", records=specifications, excluded_outcomes=["bilateral_fx","domestic_policy_rate"])
    emit("panel_outcome_identity_validation", records=identities, status="pass" if all(r["status"] == "pass" for r in identities) else "fail")
    emit("panel_lp_parameterization_validation", records=parameterizations, status="pass" if parameterizations else "unavailable")
    emit("panel_lp_sample_registry", records=samples, minimum_time_clusters=96, no_event_shock_value=0, meeting_month_selection=False)
    emit("panel_lp_model_registry", records=models)
    emit("panel_lp_results", records=results, publication_state="registry_only", normalization=.25, inference="normal_pointwise_time_clustered", small_sample=False)
    emit("panel_lp_readiness_registry", records=readiness, state="registry_only")
    emit("lp_cross_country_comparability", frozen_single_country_reference="local-projections/lp_cross_country_comparability.json",
         reason_for_additive_extension="Original file is protected by v1.73 raw-byte frozen hashes.",
         formal_difference_test=False, formal_group_difference_available=False,
         group_difference_candidates=[r["outcome_id"] for r in readiness if r["state"] == "validated_candidate"])
    inputs = ["src/data/high-frequency/high_frequency_observations.json", "src/data/macro-drivers/macro_driver_observations.json",
              "src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json", "src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json"]
    emit("panel_lp_validation_summary", state="registry_only", reference="pass", production="pending_independent_validation",
         candidate_outcomes=len(results), unavailable_outcomes=[r["outcome_id"] for r in readiness if r["state"] == "unavailable"],
         input_sha256={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in inputs})
    print(json.dumps({"candidate_outcomes":len(results),"readiness":readiness}))


if __name__ == "__main__":
    main()
