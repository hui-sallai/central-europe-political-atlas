"""Fixed-composition diagnostics; reads but never writes formal v1.8 results.

The full-calendar gate rejects extensions rather than conflating sample and
composition changes. All inference remains conditional on the fixed countries.
"""
import hashlib
import json
import subprocess
import sys
import numpy as np
from build import ROOT, DATA, COUNTRIES, read
from estimator import estimate, PanelGateError
from reference import save

ANCHOR = "e18ecca5675d8604f7b6b1ecbfe1093ae724607e"
RESULT = "src/data/panel-local-projections/panel_lp_results.json"


def canonical(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def formal(value):
    return {**value, "records": [{**m, "records": [{k: v for k, v in r.items() if k != "time_fe_sensitivity"} for r in m["records"]]} for m in value["records"]]}


def emit(name, **value):
    payload = {"schema_version": name.replace("_", "-") + "-v1.81", **value}
    if "--check" in sys.argv:
        def equal(a, b):
            if isinstance(a, dict):
                assert a.keys() == b.keys(), name
                for k in a: equal(a[k], b[k])
            elif isinstance(a, list):
                assert len(a) == len(b), name
                for x, y in zip(a, b): equal(x, y)
            elif isinstance(a, float):
                assert np.isclose(a, b, atol=1e-8, rtol=1e-7), (name, a, b)
            else:
                assert a == b, (name, a, b)
        equal(payload, json.loads((DATA/f"{name}.json").read_text()))
    else:
        save(DATA / f"{name}.json", payload)


def contains_zero(ci):
    return ci[0] <= 0 <= ci[1]


def diagnostic_path(y, x, characteristics, units, times, controls, effects, p_max):
    """Isolate a failed horizon without changing the frozen estimator.

    On the rare failure path, explicitly construct the same cumulative target
    and lag controls, then fit a horizon-zero noncumulative regression. Thus a
    bad horizon cannot erase otherwise valid horizons or reduce p_max.
    """
    try:
        return estimate(y,x,characteristics,units,times,24,controls,effects,p_max=p_max)
    except PanelGateError:
        keys = list(zip(units.tolist(),times.tolist()))
        index = {key:i for i,key in enumerate(keys)}
        def shift(values, offset):
            return np.array([values[index[(u,t+offset)]] if (u,t+offset) in index else np.nan for u,t in keys])
        interactions = (x[:,:,None]*characteristics[:,None,:]).reshape(len(y),-1)
        source = np.column_stack((y,interactions))
        output = []
        for h in range(25):
            target = sum((shift(y,lead) for lead in range(h+1)),np.zeros_like(y))
            p = min(h,p_max)
            lags = [shift(source[:,column],-lag) for column in range(source.shape[1]) for lag in range(1,p+1)]
            extra = np.column_stack([*lags, *([] if controls is None else list(controls.T))]) if lags or controls is not None else None
            try:
                fit = estimate(target,x,characteristics,units,times,0,extra,effects,cumulative=False,p_max=0)[0]
                output.append({**fit,"horizon":h,"p_h":p,"p_max":p_max})
            except PanelGateError as error:
                output.append({"invalid_reason":str(error),"horizon":h,"p_h":p,"p_max":p_max})
        return output


def summarize(rows):
    valid = [r for r in rows if r["status"] == "valid"]
    if not valid:
        return {"valid_count": 0, "invalid_count": len(rows)}
    top = max(valid, key=lambda r: r["absolute_change"])
    relative = [r["relative_change"] for r in valid if r["relative_change"] is not None]
    return {"valid_count": len(valid), "invalid_count": len(rows)-len(valid),
            "maximum_absolute_change": top["absolute_change"], "median_absolute_change": float(np.median([r["absolute_change"] for r in valid])),
            "p90_absolute_change": float(np.percentile([r["absolute_change"] for r in valid], 90)),
            "most_influential_country": top["dropped_country"], "horizon_of_maximum_change": top["horizon"],
            "sign_agreement_rate": sum(r["sign_same"] for r in valid)/len(valid),
            "zero_classification_agreement_rate": sum(r["zero_classification_same"] for r in valid)/len(valid),
            "maximum_relative_change": max(relative) if relative else None}


def main():
    anchor_bytes = subprocess.check_output(["git", "show", f"{ANCHOR}:{RESULT}"], cwd=ROOT)
    baseline = read(RESULT)
    assert (ROOT/RESULT).read_bytes() == anchor_bytes, "baseline_changed_since_v1.8"
    emit("panel_lp_baseline_invariance_manifest", starting_commit=ANCHOR, file=RESULT,
         canonicalization="UTF-8 JSON sorted keys, compact separators, no NaN; exclude only time_fe_sensitivity from each horizon record",
         formal_baseline_sha256=canonical(formal(json.loads(anchor_bytes))), full_file_sha256=hashlib.sha256(anchor_bytes).hexdigest(),
         estimator_sha256=hashlib.sha256(subprocess.check_output(["git", "show", f"{ANCHOR}:scripts/panel-local-projections/estimator.py"], cwd=ROOT)).hexdigest())
    specs = read("src/data/local-projections/lp_outcome_specification_registry.json")["records"][:4]
    hf = read("src/data/high-frequency/high_frequency_observations.json")["records"]
    macro = read("src/data/macro-drivers/macro_driver_observations.json")["records"]
    shocks = [{r["period"]: r["value"] for r in read(f"src/data/identified-shocks/{name}.json")["records"]} for name in
              ("ecb_pure_monetary_policy_shock_monthly", "ecb_central_bank_information_shock_monthly")]
    periods = sorted(p for p in shocks[0] if "2015-01" <= p <= "2025-10")
    monthly = np.array([[s[p] for s in shocks] for p in periods], float)
    rows, contrasts, concordance = [], [], []
    for dropped, (code, _) in enumerate(COUNTRIES):
        keep = [i for i in range(8) if i != dropped]
        ne = sum(i < 4 for i in keep)
        nn = 7-ne
        contrasts.append({"dropped_country": code, "euro_count": ne, "non_euro_count": nn,
                          "euro_characteristic": nn/7, "non_euro_characteristic": -ne/7,
                          "weighted_mean": (ne*nn/7-nn*ne/7)/7, "difference_scale": nn/7+ne/7})
    for spec, model in zip(specs, baseline["records"]):
        assert spec["id"] == model["outcome_id"]
        source = hf if spec["source"] == "high_frequency" else macro
        lookup = {(r["country"], r["period"]): r["value"] for r in source
                  if r.get("indicator", r.get("driver_id")) == spec["field"] and
                  (spec["source"] == "high_frequency" or r.get("transformation") == "level")}
        levels = np.array([[lookup.get((country, p), np.nan) for _, country in COUNTRIES] for p in periods], float)
        levels = 100*np.log(levels) if spec["unit"] == "cumulative_percent" else levels
        delta = np.vstack((np.full((1, 8), np.nan), np.diff(levels, axis=0)))
        full_rows = {(r["shock"], r["horizon"]): r for r in model["records"]}
        full_diagnostics = next(r for r in read("src/data/panel-local-projections/panel_lp_model_registry.json")["records"] if r["outcome_id"] == spec["id"])
        for dropped, (code, _) in enumerate(COUNTRIES):
            keep = [i for i in range(8) if i != dropped]
            units = np.tile(keep, len(periods)); times = np.repeat(np.arange(len(periods)), 7)
            x = np.repeat(monthly, 7, axis=0); y = delta[:, keep].reshape(-1)
            ne = sum(i < 4 for i in keep); nn = 7-ne
            contrast = np.where(units < 4, nn/7, -ne/7)
            direct = np.column_stack((units < 4, units >= 4)).astype(float)
            centered = np.column_stack((np.ones(len(units)), contrast))
            months = np.repeat([int(p[5:]) for p in periods], 7)
            controls = np.column_stack([months == m for m in range(2,13)]).astype(float) if spec["monthDummies"] else None
            # Preserve H and p_max even when recovering an individual failed horizon.
            paths = []
            for characteristics, control, effects in ((direct, controls, [units]), (centered, controls, [units]), (contrast[:,None], None, [units,times])):
                paths.append(diagnostic_path(y,x,characteristics,units,times,control,effects,full_diagnostics["p_max"]))
            for h in range(25):
                diagnostic = full_diagnostics["diagnostics"][h]
                expected_times = list(range(diagnostic["sample_start_index"], diagnostic["sample_end_index"]+1))
                # v1.8 samples are consecutive and balanced; refuse a future gap.
                assert len(expected_times) == diagnostic["effective_time_clusters"]
                for j, shock in enumerate(("MP", "CBI")):
                    full = full_rows[(shock,h)]
                    row = {"outcome": spec["id"], "shock": shock, "horizon": h, "dropped_country": code,
                           "country_count": 7, "euro_count": ne, "non_euro_count": nn,
                           "full_panel_difference": full["difference_estimate"], "full_panel_p_value": full["difference_p_value"], "full_panel_ci95": full["difference_ci95"]}
                    if any("invalid_reason" in p[h] for p in paths):
                        rows.append({**row, "status": "invalid", "invalid_reason": [p[h] for p in paths if "invalid_reason" in p[h]],
                                     "LOCO_difference":None,"LOCO_p_value":None,"LOCO_ci95":None,"absolute_change":None,"relative_change":None,
                                     "sign_same":None,"zero_classification_same":None,"effective_time_clusters":None})
                        continue
                    a,b,t = [p[h] for p in paths]
                    calendars = [np.unique(times[p["sample_indices"]]).tolist() for p in (a,b,t)]
                    assert all(c == expected_times for c in calendars), "fixed_full_panel_calendar_gate"
                    assert all(p["panel_rows"] == 7*len(expected_times) for p in (a,b,t)), "balanced_loco_gate"
                    diff = b["estimate"][2*j+1]*.25
                    error = abs((a["estimate"][2*j]-a["estimate"][2*j+1])*.25-diff)
                    assert error < 1e-7, "direct_vs_centered_difference_identity"
                    ci = (np.array(b["ci95"][2*j+1])*.25).tolist()
                    change = abs(diff-full["difference_estimate"])
                    # Ratios are suppressed when baseline is less than 10% of its
                    # own SE (or numerical tolerance); absolute changes are primary.
                    threshold = max(1e-10, .1*full["difference_se"])
                    support = {name: {"nonzero_months": int(np.count_nonzero(monthly[expected_times,k])),
                                      "zero_months": int(np.count_nonzero(monthly[expected_times,k] == 0))} for k,name in enumerate(("MP","CBI"))}
                    rows.append({**row, "status": "valid", "LOCO_difference": diff, "LOCO_p_value": b["p_value"][2*j+1], "LOCO_ci95": ci,
                                 "absolute_change": change, "relative_change": change/abs(full["difference_estimate"]) if abs(full["difference_estimate"]) >= threshold else None,
                                 "relative_change_threshold": threshold, "sign_same": bool(np.sign(diff) == np.sign(full["difference_estimate"])),
                                 "zero_classification_same": contains_zero(ci) == contains_zero(full["difference_ci95"]),
                                 "effective_time_clusters": len(expected_times), "calendar": [periods[k] for k in expected_times],
                                 "shock_support": support, "shock_calendar_sha256": canonical([[periods[k], *monthly[k].tolist()] for k in expected_times]),
                                 "direct_vs_contrast_absolute_error": error,
                                 "conditioning": {name: {key: p[key] for key in ("rank","columns","condition_number","effective_time_clusters","p_max","p_h")} for name,p in zip(("direct","centered","time_fe"),(a,b,t))},
                                 "time_fe_sensitivity": {"estimate": t["estimate"][j]*.25, "ci95": (np.array(t["ci95"][j])*.25).tolist()}})
            print(f"Composition diagnostic: {spec['id']} drop {code}", flush=True)
        for shock in ("MP","CBI"):
            path = []
            for r in model["records"]:
                if r["shock"] != shock: continue
                t = r["time_fe_sensitivity"]
                path.append({"horizon": r["horizon"], "baseline_difference": r["difference_estimate"], "time_fe_difference": t["estimate"],
                             "baseline_ci95": r["difference_ci95"], "time_fe_ci95": t["ci95"], "absolute_change": abs(r["difference_estimate"]-t["estimate"]),
                             "sign_same": bool(np.sign(r["difference_estimate"]) == np.sign(t["estimate"])),
                             "baseline_ci95_contains_zero": contains_zero(r["difference_ci95"]), "time_fe_ci95_contains_zero": contains_zero(t["ci95"]),
                             "classification_same": contains_zero(r["difference_ci95"]) == contains_zero(t["ci95"])})
            top = max(path, key=lambda r:r["absolute_change"])
            concordance.append({"outcome": spec["id"], "shock": shock, "records": path,
                                "path_correlation": float(np.corrcoef([r["baseline_difference"] for r in path], [r["time_fe_difference"] for r in path])[0,1]),
                                "sign_agreement_rate": sum(r["sign_same"] for r in path)/25,
                                "zero_classification_agreement_rate": sum(r["classification_same"] for r in path)/25,
                                "maximum_absolute_difference": top["absolute_change"], "horizon_of_maximum_difference": top["horizon"]})
    summaries, influences = [], []
    for spec in specs:
        for shock in ("MP","CBI"):
            selected = [r for r in rows if r["outcome"] == spec["id"] and r["shock"] == shock]
            summaries.append({"outcome": spec["id"], "shock": shock, **summarize(selected),
                              "windows": [{"horizon_start":lo,"horizon_end":hi,**summarize([r for r in selected if lo <= r["horizon"] <= hi])} for lo,hi in ((0,6),(7,12),(13,24))]})
            for i,(code,_) in enumerate(COUNTRIES):
                country = [r for r in selected if r["dropped_country"] == code and r["status"] == "valid"]
                if not country: continue
                top = max(country,key=lambda r:r["absolute_change"])
                influences.append({"country":code,"group":"euro" if i<4 else "non_euro","outcome":spec["id"],"shock":shock,
                                   "maximum_difference_shift":top["absolute_change"],"horizon_of_max_shift":top["horizon"],
                                   "average_absolute_shift":float(np.mean([r["absolute_change"] for r in country])),
                                   "sign_reversal_count":sum(not r["sign_same"] for r in country),
                                   "pointwise_classification_change_count":sum(not r["zero_classification_same"] for r in country)})
    emit("panel_lp_leave_one_country_out", state="diagnostic_only", formal_baseline_replaced=False,
         interpretation="fixed group composition influence; not a country causal contribution or random-country superpopulation inference",
         envelope="diagnostic range, not a confidence interval", jackknife_standard_error=False,
         relative_change_rule="abs(change)/abs(baseline) only if abs(baseline)>=max(1e-10,0.1*baseline_SE); otherwise null",
         centered_contrast_validation=contrasts, joint_model_count=32, shock_path_count=64, records=rows)
    emit("panel_lp_composition_robustness_summary", state="diagnostic_only", records=summaries)
    emit("panel_lp_country_influence", state="diagnostic_only", interpretation="fixed group composition sensitivity, not causal contribution", records=influences)
    emit("panel_lp_time_fe_sensitivity_summary", state="secondary_sensitivity_only", specification_selection=False, records=concordance)
    ui = []
    for path in concordance:
        ui.append({"outcome": path["outcome"], "shock": path["shock"], "records": [
            {"horizon": r["horizon"], "baseline": r["baseline_difference"],
             "minimum": min(v["LOCO_difference"] for v in rows if v["status"] == "valid" and (v["outcome"],v["shock"],v["horizon"]) == (path["outcome"],path["shock"],r["horizon"])),
             "maximum": max(v["LOCO_difference"] for v in rows if v["status"] == "valid" and (v["outcome"],v["shock"],v["horizon"]) == (path["outcome"],path["shock"],r["horizon"]))} for r in path["records"]]})
    emit("panel_lp_composition_ui_data", envelope="diagnostic range, not confidence interval", records=ui)
    emit("panel_lp_path_inference_registry", state="registry_only", required_work=["joint cross-horizon time-clustered covariance", "simulation validation", "reference / independent implementation"])
    assert (ROOT/RESULT).read_bytes() == anchor_bytes


if __name__ == "__main__":
    main()
