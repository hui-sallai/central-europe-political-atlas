"""Build unpublished path candidates; activation requires separate gates."""
import numpy as np
from path_core import emit,freeze,datasets,fit,psd,sup_t,read

def main():
    emit("panel_lp_v181_invariance_manifest",starting_commit="db92648fc23522517bf75448b99ec0446fe50604",sha256=freeze())
    covariance, bands, tests, equations, common = [],[],[],[],[]
    baseline=read("src/data/panel-local-projections/panel_lp_results.json")
    maximum_se_error=0.
    for spec,y,x,units,months,controls in datasets():
        rows,paths=fit(y,x,units,months,24,controls)
        model=next(r for r in baseline["records"] if r["outcome_id"]==spec["id"])
        for path in paths:
            shock,kind=path["key"].split(":")
            old=[r for r in model["records"] if r["shock"]==shock]
            err=float(np.max(np.abs(np.sqrt(np.diag(path["covariance"]))-[r[f"{kind}_se"] for r in old])))
            maximum_se_error=max(maximum_se_error,err)
            np.testing.assert_allclose(path["estimate"],[r[f"{kind}_estimate"] for r in old],atol=1e-8,rtol=1e-8)
            assert err<1e-8,"pointwise diagonal identity failed"
            _,condition=psd(path["covariance"])
            key={"outcome":spec["id"],"shock":shock,"path_type":kind}
            covariance.append({**key,"matrix":path["covariance"].tolist(),"conditioning":condition,"maximum_diagonal_se_error":err,"calendar":path["calendar"],"selected_time_influence":path["influence"].tolist()})
            inference=sup_t(path["covariance"],path["estimate"])
            seeds=[sup_t(path["covariance"],path["estimate"],seed=182001+i)["critical_value"] for i in range(5)]
            bands.append({**key,**inference,"estimate":path["estimate"].tolist(),"seed_sensitivity":{"seeds":list(range(182001,182006)),"critical_values":seeds,"mean":float(np.mean(seeds)),"sd":float(np.std(seeds,ddof=1)),"range":[min(seeds),max(seeds)]}})
            tests.append({**key,**{k:inference[k] for k in ("observed_max_t","global_p_value","windows","draw_count","seed","p_value_rule")}})
        equations.append({"outcome":spec["id"],"horizons":[{**{k:r[k] for k in ("horizon","calendar","rank","columns","condition_number","p_h","p_max")},"bread":r["bread"].tolist(),"time_scores":{m:s.tolist() for m,s in r["scores"].items()},"selectors":{k:c.tolist() for k,c in r["selectors"].items()}} for r in rows]})
        fixed=set.intersection(*(set(r["calendar"]) for r in rows))
        _,sensitivity=fit(y,x,units,months,24,controls,common_months=fixed)
        for original,new in zip(paths,sensitivity):
            common.append({"outcome":spec["id"],"path_type":new["key"],"state":"sensitivity_only","calendar":sorted(fixed),"baseline":original["estimate"].tolist(),"common_sample_estimate":new["estimate"].tolist(),"maximum_absolute_change":float(np.max(abs(original["estimate"]-new["estimate"])))})
        print(f"Path covariance candidate: {spec['id']}",flush=True)
    emit("panel_lp_path_covariance",state="candidate_not_activated",method="calendar-key joined time-cluster stacked scores",records=covariance)
    emit("panel_lp_path_score_audit",state="candidate_not_activated",records=equations)
    emit("panel_lp_simultaneous_inference",state="candidate_not_activated",scope="one outcome, one shock, one path type across h=0..24; no joint coverage across 24 paths",records=bands)
    emit("panel_lp_global_path_tests",state="candidate_not_activated",primary="difference full 0..24 max-t; window tests secondary, not multiplicity-adjusted across windows",records=tests)
    emit("panel_lp_common_sample_sensitivity",state="sensitivity_only",records=common)
    emit("panel_lp_path_covariance_validation",status="pending_independent_reference",maximum_diagonal_se_error=maximum_se_error,records=len(covariance),baseline_unchanged=True)
    freeze()

if __name__=="__main__":main()
