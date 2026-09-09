"""Independent explicit-dummy regression and metamorphic tests for panel inference."""
import json
import argparse
import hashlib
from pathlib import Path
import numpy as np
from scipy.stats import norm
from estimator import estimate, PanelGateError
from reference import synthetic, compare

ROOT = Path(__file__).resolve().parents[2]


def real_data_check(results, data):
    """Reconstruct all real targets and direct-design QR covariance independently."""
    read = lambda p: json.loads((ROOT/p).read_text())
    source_hashes = read("src/data/panel-local-projections/panel_lp_validation_summary.json")["input_sha256"]
    for name,digest in source_hashes.items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == digest
    hf = read("src/data/high-frequency/high_frequency_observations.json")["records"]
    macro = read("src/data/macro-drivers/macro_driver_observations.json")["records"]
    mp = {r["period"]:r["value"] for r in read("src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json")["records"]}
    cbi = {r["period"]:r["value"] for r in read("src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json")["records"]}
    periods = sorted(p for p in mp if "2015-01" <= p <= "2025-10")
    countries = ["austria","germany","slovakia","slovenia","czechia","hungary","poland","romania"]
    units = np.tile(np.arange(8),len(periods))
    times = np.repeat(np.arange(len(periods)),8)
    interaction = np.column_stack([np.repeat([shock[p] for p in periods],8)*(units < 4 if group == 0 else units >= 4)
                                   for shock in (mp,cbi) for group in (0,1)])
    count = 0
    for spec in read("src/data/local-projections/lp_outcome_specification_registry.json")["records"][:4]:
        model = next((m for m in results["records"] if m["outcome_id"] == spec["id"]),None)
        if model is None:
            continue
        source = hf if spec["source"] == "high_frequency" else macro
        lookup = {(r["period"],r["country"]):r["value"] for r in source if r.get("indicator",r.get("driver_id")) == spec["field"]
                  and (spec["source"] == "high_frequency" or r.get("transformation") == "level")}
        levels = np.array([[lookup.get((p,c)) for c in countries] for p in periods],float)
        transformed = 100*np.log(levels) if spec["unit"] == "cumulative_percent" else levels
        dy = np.vstack((np.full((1,8),np.nan),np.diff(transformed,axis=0))).reshape(-1)
        lagbase = np.column_stack((dy,interaction))
        pmax = int(np.ceil(np.cbrt(len(periods)-model["eligible_horizon"])))
        for h in range(model["eligible_horizon"]+1):
            p = min(h,pmax)
            positions = np.flatnonzero((times > p)&(times+h < len(periods)))
            target = (transformed[times[positions]+h,units[positions]]-transformed[times[positions]-1,units[positions]])
            season = [np.array([int(periods[t][5:]) == month for t in times[positions]],float) for month in range(2,13)] if spec["monthDummies"] else []
            design = np.column_stack((interaction[positions],*[lagbase[positions-8*lag,col] for col in range(5) for lag in range(1,p+1)],
                                      *season,*[(units[positions] == i).astype(float) for i in range(8)]))
            finite = np.isfinite(target)&np.isfinite(design).all(axis=1)
            target,design,positions = target[finite],design[finite],positions[finite]
            q,r = np.linalg.qr(design,mode="reduced")
            beta = np.linalg.solve(r,q.T@target)
            influence = np.linalg.solve(r,q.T).T*(target-design@beta)[:,None]
            scores = np.stack([influence[times[positions] == t].sum(axis=0) for t in np.unique(times[positions])])
            covariance = scores.T@scores
            for j,shock in enumerate(("MP","CBI")):
                output = next(r for r in model["records"] if r["horizon"] == h and r["shock"] == shock)
                assert output["panel_rows"] == len(positions) and output["p_h"] == p
                for prefix,weights in (("euro",[1,0]),("non_euro",[0,1]),("difference",[1,-1])):
                    v = np.zeros(design.shape[1]); v[2*j:2*j+2] = weights
                    np.testing.assert_allclose(output[f"{prefix}_estimate"],.25*v@beta,atol=1e-7,rtol=1e-7)
                    np.testing.assert_allclose(output[f"{prefix}_se"],.25*np.sqrt(v@covariance@v),atol=1e-7,rtol=1e-7)
                    count += 2
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-summary", action="store_true")
    args = parser.parse_args()
    data = ROOT / "src/data/panel-local-projections"
    fixture = json.loads((data/"panel_lp_reference_cases.json").read_text())
    compare(fixture, fixture["author_reference"])
    inputs = synthetic()["cases"][2]["inputs"]
    base = estimate(**inputs, horizon=6)
    units, times = np.array(inputs["units"]), np.array(inputs["times"])
    y, x, s = np.array(inputs["y"]), np.array(inputs["shocks"]), np.array(inputs["characteristics"])
    interactions = (x[:,:,None]*s[:,None,:]).reshape(len(y),4)
    checks = 0
    # Independent explicit dummy design, QR influence functions, and direct
    # cluster outer-product accumulation: no production absorb or Gram inverse.
    for h in range(7):
        p = min(h, int(np.ceil(np.cbrt(len(np.unique(times))-6))))
        positions = np.flatnonzero((times >= p) & (times <= times.max()-h))
        target = np.array([sum(y[row+8*r] for r in range(h+1)) for row in positions])
        lagged = np.column_stack((y,interactions))
        design = np.column_stack((interactions[positions],
                                  *[lagged[positions-8*lag,col] for col in range(5) for lag in range(1,p+1)],
                                  *[(units[positions] == i).astype(float) for i in range(8)]))
        q,r = np.linalg.qr(design, mode="reduced")
        beta = np.linalg.solve(r, q.T@target)
        influence = np.linalg.solve(r, q.T).T*(target-design@beta)[:,None]
        covariance = np.zeros((design.shape[1],design.shape[1]))
        for time in np.unique(times[positions]):
            score = influence[times[positions] == time].sum(axis=0)
            covariance += np.outer(score,score)
        np.testing.assert_allclose(beta[:4],base[h]["estimate"],atol=1e-8,rtol=1e-7)
        np.testing.assert_allclose(covariance[:4,:4],base[h]["covariance"],atol=1e-8,rtol=1e-7)
        assert base[h]["sample_indices"] == positions.tolist()
        checks += 3
    # Duplicating each country's observations as new units must NOT produce
    # more shock information or reduce time-clustered uncertainty.
    duplicate = {key: np.concatenate([np.array(value),np.array(value)]).tolist()
                 for key,value in inputs.items() if key != "fixed_effects"}
    duplicate["units"] = np.concatenate((units,units+8)).tolist()
    duplicate["fixed_effects"] = [duplicate["units"]]
    repeated = estimate(**duplicate,horizon=6)
    for original,replica in zip(base,repeated):
        np.testing.assert_allclose(original["estimate"],replica["estimate"],atol=1e-9)
        np.testing.assert_allclose(original["se"],replica["se"],atol=1e-9)
        assert original["effective_time_clusters"] == replica["effective_time_clusters"]
        checks += 3
    # Reordering rows cannot alter exact calendar lags or clustering.
    order = np.random.default_rng(18).permutation(len(y))
    shuffled = {key:np.array(value)[order].tolist() for key,value in inputs.items() if key != "fixed_effects"}
    shuffled["fixed_effects"] = [units[order].tolist()]
    for original,reordered in zip(base,estimate(**shuffled,horizon=6)):
        np.testing.assert_allclose(original["estimate"],reordered["estimate"],atol=1e-9)
        np.testing.assert_allclose(original["se"],reordered["se"],atol=1e-9)
        checks += 2
    # A missing calendar month must not be bridged by positional shifts.
    keep = times != 40
    gap = {key:np.array(value)[keep].tolist() for key,value in inputs.items() if key != "fixed_effects"}
    gap["fixed_effects"] = [units[keep].tolist()]
    for h,result in enumerate(estimate(**gap,horizon=6)):
        retained_times = np.array(gap["times"])[result["sample_indices"]]
        p = min(h,result["p_max"])
        assert not any(40-h <= t <= 40+p for t in retained_times)
        checks += 1
    for invalid in ("small_sample", "rank"):
        try:
            bad = dict(inputs)
            if invalid == "rank":
                bad["characteristics"] = np.ones((len(y),2)).tolist()
            estimate(**bad,horizon=6,small_sample=invalid == "small_sample")
        except PanelGateError:
            checks += 1
        else:
            raise AssertionError(f"{invalid} gate did not block")
    for path in ("panel_outcome_identity_validation.json","panel_lp_parameterization_validation.json"):
        assert json.loads((data/path).read_text())["status"] == "pass"
        checks += 1
    registry = json.loads((data/"panel_lp_country_registry.json").read_text())
    assert [r["code"] for r in registry["records"]] == ["AT","DE","SK","SI","CZ","HU","PL","RO"]
    assert [r["contrast"] for r in registry["records"]] == [.5]*4+[-.5]*4
    checks += 2
    results = json.loads((data/"panel_lp_results.json").read_text())
    real_checks = real_data_check(results,data)
    checks += real_checks
    for outcome in results["records"]:
        for record in outcome["records"]:
            assert record["panel_rows"] == 8*record["effective_time_clusters"]
            assert record["effective_time_clusters"] >= 96 and record["country_count"] == 8
            assert abs(record["euro_estimate"]-record["non_euro_estimate"]-record["difference_estimate"]) < 1e-7
            for prefix in ("euro","non_euro","difference"):
                beta,se = record[f"{prefix}_estimate"],record[f"{prefix}_se"]
                for confidence in (90,95,99):
                    radius = norm.ppf(.5+confidence/200)*se
                    np.testing.assert_allclose(record[f"{prefix}_ci{confidence}"],[beta-radius,beta+radius],atol=1e-10)
            checks += 12
    summary = {"status":"pass","checks":checks,"reference_cases":len(fixture["cases"]),
               "explicit_dummy_qr_covariance":"pass","pseudo_replication_invariance":"pass",
               "calendar_gap_and_row_order":"pass", "production":"pass",
               "real_data_qr_checks":real_checks,
               "publication_state":results["publication_state"],
               "pending_gates":["release workflow verification"],
               "validated_files_sha256":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in data.glob("*.json") if p.name != "panel_lp_validation_summary.json"}}
    if args.write_summary:
        existing = json.loads((data/"panel_lp_validation_summary.json").read_text())
        (data/"panel_lp_validation_summary.json").write_text(json.dumps(existing | summary,indent=2,allow_nan=False)+"\n")
    print(json.dumps({key:value for key,value in summary.items() if key != "validated_files_sha256"}))


if __name__ == "__main__":
    main()
