import numpy as np
from path_core import datasets,fit,emit,read,freeze,sup_t
from path_reference_impl import reference,reference_sup_t

def compare(case,y,x,units,months,H,controls=None):
    rows,production=fit(y,x,units,months,H,controls)
    independent=reference(y,x,units,months,H,controls)
    error=max(float(np.max(abs(p["covariance"]-independent[p["key"]]["covariance"]))) for p in production)
    assert error<1e-8,(case,error)
    rng=np.random.default_rng(182);order=rng.permutation(len(y))
    _,permuted=fit(y[order],x[order],units[order],months[order],H,None if controls is None else controls[order])
    for a,b in zip(production,permuted):np.testing.assert_allclose(a["covariance"],b["covariance"],atol=1e-9)
    return {"case":case,"status":"pass","maximum_covariance_difference":error,"row_country_calendar_order_invariance":"pass","different_horizon_samples":len({tuple(r["calendar"]) for r in rows})>1},production,independent

def main():
    freeze();records=[];inferences=[]
    rng=np.random.default_rng(182100);T=90
    months=np.repeat([f"{2000+t//12:04d}-{t%12+1:02d}" for t in range(T)],8);units=np.tile(np.arange(8),T)
    x=np.repeat(rng.normal(size=(T,2)),8,axis=0);y=rng.normal(size=T*8)+units*.1+x[:,0]*(units<4)
    row,_,_=compare("synthetic_balanced_two_shock_country_fe",y,x,units,months,4);records.append(row)
    y[-8:]=np.nan;y[20*8:21*8]=np.nan
    row,_,_=compare("H4_different_lead_availability_and_calendar_gap",y,x,units,months,4);records.append(row)
    for spec,y,x,units,months,controls in datasets():
        row,production,independent=compare("real_"+spec["id"],y,x,units,months,24,controls);records.append(row)
        for p in production:
            r=independent[p["key"]];ref=reference_sup_t(r["covariance"],r["estimate"]);candidate=sup_t(p["covariance"],p["estimate"])
            critical_error=abs(ref["critical_value"]-candidate["critical_value"])
            p_error=abs(ref["global_p_value"]-candidate["global_p_value"])
            assert critical_error<=.10 and p_error<=.025,(spec["id"],p["key"],critical_error,p_error)
            # Width errors normalized by each horizon SE equal critical errors.
            width_error=float(np.max(abs(np.array(ref["upper"])-candidate["upper"])/np.sqrt(np.diag(p["covariance"]))))
            assert width_error<=.10
            inferences.append({"outcome":spec["id"],"path":p["key"],"status":"pass","critical_value_error":critical_error,"global_p_value_error":p_error,"upper_error_in_se_units":width_error,"reference":ref})
        print(f"Independent QR path reference: {spec['id']}",flush=True)
    known=.5*np.ones((25,25))+.5*np.eye(25)
    a=sup_t(known,np.zeros(25));b=reference_sup_t(known,np.zeros(25))
    assert abs(a["critical_value"]-b["critical_value"])<.10
    records.append({"case":"known_equicorrelation_sup_t","status":"pass","production_critical":a["critical_value"],"reference_critical":b["critical_value"]})
    emit("panel_lp_path_reference_cases",status="pass",reference_implementation="path_reference_impl.py: independent explicit-dummy QR, dictionary-intersection scores, Cholesky MT19937 Gaussian simulation",critical_tolerance=.10,p_value_tolerance=.025,cases=records,inference_cases=inferences)
    validation=read("src/data/panel-local-projections/panel_lp_path_covariance_validation.json")
    validation.pop("schema_version",None)
    emit("panel_lp_path_covariance_validation",**{**validation,"status":"pass","independent_reference":"pass","permutation_invariance":"pass","maximum_independent_covariance_error":max(r.get("maximum_covariance_difference",0) for r in records)})
    freeze()

if __name__=="__main__":main()
