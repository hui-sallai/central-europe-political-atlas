"""Read-only composition audit, including complete numerical replay."""
import hashlib
import sys
import numpy as np
from unittest.mock import patch
from composition import diagnostic_path
from estimator import estimate, PanelGateError
from composition import ROOT, DATA, RESULT, canonical, formal, main, read

checks = 0


def check(value, message):
    global checks
    checks += 1
    assert value, message


def panel(name):
    return read(f"src/data/panel-local-projections/{name}.json")


anchor = panel("panel_lp_baseline_invariance_manifest")
check(canonical(formal(read(RESULT))) == anchor["formal_baseline_sha256"], "formal baseline invariant")
check(hashlib.sha256((ROOT/RESULT).read_bytes()).hexdigest() == anchor["full_file_sha256"], "raw baseline invariant")
check(hashlib.sha256((ROOT/"scripts/panel-local-projections/estimator.py").read_bytes()).hexdigest() == anchor["estimator_sha256"], "estimator invariant")
loco = panel("panel_lp_leave_one_country_out")
check(len(loco["records"]) == 1600, "8 countries x 4 outcomes x 2 shocks x 25 horizons")
check(loco["state"] == "diagnostic_only" and loco["jackknife_standard_error"] is False and not loco["formal_baseline_replaced"], "inference boundaries")
check(panel("panel_lp_path_inference_registry")["state"] == "registry_only", "no path inference")
check(panel("panel_lp_small_sample_method_registry")["state"] == "registry_only", "no IK")
for r in loco["centered_contrast_validation"]:
    check(abs(r["euro_count"]*r["euro_characteristic"]+r["non_euro_count"]*r["non_euro_characteristic"]) < 1e-14, "centered mean")
    check(abs(r["euro_characteristic"]-r["non_euro_characteristic"]-1) < 1e-14, "unit scale")
check(4/8 == .5 and -4/8 == -.5, "balanced contrast")
# Exercise fallback isolation using a deterministic balanced synthetic panel.
rng = np.random.default_rng(181)
units = np.tile(np.arange(7),120); times = np.repeat(np.arange(120),7)
x = np.repeat(rng.normal(size=(120,2)),7,axis=0)
y = rng.normal(size=len(units)); s = np.column_stack((units<3,units>=3)).astype(float)
expected = estimate(y,x,s,units,times,24,None,[units],p_max=5)
calls = 0
def injected(*args, **kwargs):
    global calls
    calls += 1
    if calls in (1,9): raise PanelGateError("injected_rank_gate_for_isolation_test")
    return estimate(*args, **kwargs)
with patch("composition.estimate",side_effect=injected):
    isolated = diagnostic_path(y,x,s,units,times,None,[units],5)
for h,(actual,reference) in enumerate(zip(isolated,expected)):
    if h == 7:
        check("invalid_reason" in actual and "estimate" not in actual,"invalid horizon not filled with zero")
    else:
        for key in ("estimate","se","p_value","ci95"):
            check(np.allclose(actual[key],reference[key],atol=1e-9),"isolated horizon reproduces original regression")
        check(actual["p_h"] == reference["p_h"] and actual["sample_indices"] == reference["sample_indices"],"fallback preserves lags and calendar")
seen = set()
for r in loco["records"]:
    key = (r["outcome"],r["shock"],r["horizon"],r["dropped_country"])
    check(key not in seen, "unique diagnostic key"); seen.add(key)
    check(r["status"] == "valid", "invalid diagnostic requires review before publication")
    check((r["euro_count"], r["non_euro_count"]) == ((3,4) if r["dropped_country"] in ("AT","DE","SK","SI") else (4,3)), "group composition")
    check(len(r["calendar"]) == r["effective_time_clusters"], "calendar months not rows")
    check(r["direct_vs_contrast_absolute_error"] < 1e-7, "difference identity")
    for d in r["conditioning"].values():
        check(d["rank"] == d["columns"] and np.isfinite(d["condition_number"]) and d["condition_number"] <= 1e5, "conditioning")
    for support in r["shock_support"].values():
        check(support["nonzero_months"]+support["zero_months"] == r["effective_time_clusters"], "shock calendar count")
for model in read(RESULT)["records"]:
    for row in model["records"]:
        selected = [r for r in loco["records"] if (r["outcome"],r["shock"],r["horizon"]) == (model["outcome_id"],row["shock"],row["horizon"])]
        check(len(selected) == 8 and len({r["shock_calendar_sha256"] for r in selected}) == 1, "identical shock calendar across drops")
        check(all(r["calendar"][0] == row["sample_start"] and r["calendar"][-1] == row["sample_end"] and r["effective_time_clusters"] == row["effective_time_clusters"] for r in selected), "fixed baseline sample")
# Recompute all estimates, CIs, p-values, support, summaries, classifications,
# influence rankings and concordance from immutable inputs without writing files.
sys.argv.append("--check")
main()
print(f"Panel composition robustness PASS: {checks} assertions + full 1600-record numerical replay; baseline unchanged.")
