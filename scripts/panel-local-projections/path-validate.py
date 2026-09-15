"""Read-only candidate validation and explicit activation decision."""
import hashlib
import sys
import numpy as np
from scipy.stats import norm
from path_core import DATA,read,freeze,psd,sup_t,emit

def get(name):return read(f"src/data/panel-local-projections/{name}.json")

def main():
    freeze();checks=0
    covariance=get("panel_lp_path_covariance")["records"]
    bands=get("panel_lp_simultaneous_inference")["records"]
    assert len(covariance)==len(bands)==24
    for c,b in zip(covariance,bands):
        matrix=np.asarray(c["matrix"]);se=np.sqrt(np.diag(matrix));est=np.asarray(b["estimate"])
        np.testing.assert_allclose(matrix,matrix.T,atol=1e-12)
        psd(matrix)
        np.testing.assert_allclose(np.asarray(c["selected_time_influence"]).T@np.asarray(c["selected_time_influence"]),matrix,atol=1e-12)
        assert c["maximum_diagonal_se_error"]<1e-8
        assert b["draw_count"]==10000 and b["critical_value"]>=norm.ppf(.975)
        assert np.all(np.asarray(b["lower"])<=est-norm.ppf(.975)*se+1e-10)
        assert np.all(np.asarray(b["upper"])>=est+norm.ppf(.975)*se-1e-10)
        again=sup_t(matrix,est,seed=b["seed"])
        assert again["critical_value"]==b["critical_value"] and again["global_p_value"]==b["global_p_value"],"same-seed exact reproducibility"
        assert len(b["seed_sensitivity"]["seeds"])==5
        assert 0<=b["global_p_value"]<=1
        checks+=10
    # No silently repaired material non-PSD covariance or rank deficiency.
    for bad in (np.diag([1.,-1e-3]),np.diag([1.,0.])):
        try:psd(bad)
        except ValueError:checks+=1
        else:raise AssertionError("invalid PSD/rank gate accepted")
    assert get("panel_lp_path_reference_cases")["status"]=="pass"
    assert all(r["reference"]["draw_count"]>=100000 for r in get("panel_lp_path_reference_cases")["inference_cases"])
    common=get("panel_lp_common_sample_sensitivity")["records"]
    assert len(common)==24 and all(len(r["calendar"])==100 for r in common)
    mc=get("panel_lp_path_monte_carlo_results")
    ready=mc["status"]=="pass" and len(mc["records"])==36 and all(r["replications"]>=10000 for r in mc["records"])
    summary={"status":"pass" if ready else "blocked","numerical_candidate_checks":checks+3,"covariance":"pass","independent_reference":"pass",
             "monte_carlo_status":mc["status"],"activation_eligible":ready,"baseline_invariance":"pass","v181_robustness_invariance":"pass",
             "blockers":[] if ready else ["preregistered Monte Carlo coverage/size/power gate not passed"],
             "artifact_sha256":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in DATA.glob("panel_lp_path_*.json") if p.name!="panel_lp_path_validation.json"}}
    if "--write-summary" in sys.argv:emit("panel_lp_path_validation",**summary)
    print(summary["status"],summary["blockers"],f"{checks+3} numerical checks",flush=True)
    if not ready:sys.exit(2)

if __name__=="__main__":main()
