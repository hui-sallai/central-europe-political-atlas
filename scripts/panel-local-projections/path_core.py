"""Additive path audit. No writes to v1.8/v1.81 result artifacts."""
import hashlib
import json
import math
import subprocess
import numpy as np
from build import ROOT, DATA, COUNTRIES, read
from estimator import absorb, PanelGateError
from reference import save

ANCHOR = "db92648fc23522517bf75448b99ec0446fe50604"
PSD_ABS = 1e-12
PSD_REL = 1e-10
SE_TOL = 1e-8


def emit(name, **payload):
    save(DATA/f"{name}.json", {"schema_version":name.replace("_","-")+"-v1.82", **payload})


def freeze():
    names = ["panel_lp_results", "panel_lp_leave_one_country_out", "panel_lp_composition_robustness_summary", "panel_lp_country_influence", "panel_lp_time_fe_sensitivity_summary", "panel_lp_composition_ui_data"]
    hashes = {}
    for name in names:
        file = f"src/data/panel-local-projections/{name}.json"
        source = subprocess.check_output(["git","show",f"{ANCHOR}:{file}"],cwd=ROOT)
        assert source == (ROOT/file).read_bytes(), f"frozen artifact changed: {name}"
        hashes[file] = hashlib.sha256(source).hexdigest()
    return hashes


def datasets():
    hf = read("src/data/high-frequency/high_frequency_observations.json")["records"]
    macro = read("src/data/macro-drivers/macro_driver_observations.json")["records"]
    shocks = [{r["period"]:r["value"] for r in read(f"src/data/identified-shocks/{file}.json")["records"]} for file in ("ecb_pure_monetary_policy_shock_monthly","ecb_central_bank_information_shock_monthly")]
    periods = sorted(p for p in shocks[0] if "2015-01" <= p <= "2025-10")
    x = np.repeat(np.array([[s[p] for s in shocks] for p in periods]),8,axis=0)
    units = np.tile(np.arange(8),len(periods)); months = np.repeat(periods,8)
    for spec in read("src/data/local-projections/lp_outcome_specification_registry.json")["records"][:4]:
        values = {(r["country"],r["period"]):r["value"] for r in (hf if spec["source"] == "high_frequency" else macro)
                  if r.get("indicator",r.get("driver_id")) == spec["field"] and (spec["source"] == "high_frequency" or r.get("transformation") == "level")}
        level = np.array([[values.get((country,p),np.nan) for _,country in COUNTRIES] for p in periods],float)
        if spec["unit"] == "cumulative_percent": level = 100*np.log(level)
        y = np.vstack((np.full((1,8),np.nan),np.diff(level,axis=0))).reshape(-1)
        controls = np.column_stack([np.array([int(p[5:]) for p in months]) == m for m in range(2,13)]).astype(float) if spec["monthDummies"] else None
        yield spec,y,x,units,months,controls


def month_number(p):
    return int(p[:4])*12+int(p[5:])-1


def fit(y,x,units,months,H,controls=None,p_max=None,common_months=None):
    """Actual year-month joins for all shifts and cross-equation scores."""
    y=np.asarray(y,float); x=np.asarray(x,float); units=np.asarray(units); months=np.asarray(months)
    calendar=sorted(set(months)); times=np.array([month_number(p) for p in months])
    keys=list(zip(units.tolist(),times.tolist())); lookup={k:i for i,k in enumerate(keys)}
    if len(lookup)!=len(y): raise PanelGateError("duplicate unit-month")
    def shift(v,offset):
        return np.array([v[lookup[(u,t+offset)]] if (u,t+offset) in lookup else np.nan for u,t in keys])
    direct=np.column_stack((units<4,units>=4)).astype(float)
    interaction=(x[:,:,None]*direct[:,None,:]).reshape(len(y),4)
    lag_source=np.column_stack((y,interaction))
    p_max=math.ceil(np.cbrt(len(calendar)-H)) if p_max is None else p_max
    rows=[]
    for h in range(H+1):
        p=min(h,p_max)
        target=sum((shift(y,lead) for lead in range(h+1)),np.zeros_like(y))
        lags=[shift(lag_source[:,c],-lag) for c in range(5) for lag in range(1,p+1)]
        design=np.column_stack([interaction,*lags,*([] if controls is None else list(controls.T))])
        usable=np.isfinite(target)&np.isfinite(design).all(axis=1)
        if common_months is not None: usable &= np.isin(months,list(common_months))
        values=absorb(np.column_stack((target[usable],design[usable])),[units[usable]])
        response,X=values[:,0],values[:,1:]
        rank=int(np.linalg.matrix_rank(X)); condition=float(np.linalg.cond(X))
        if rank!=X.shape[1] or condition>1e5: raise PanelGateError("path regression conditioning")
        beta=np.linalg.lstsq(X,response,rcond=None)[0]; residual=response-X@beta
        bread=np.linalg.pinv(X.T@X,rcond=np.finfo(float).eps**(2/3))
        # A missing equation-month has no observations and hence a zero score.
        # This is exactly the corresponding block of a stacked score vector.
        score_by_month={str(m):np.sum(X[months[usable]==m]*residual[months[usable]==m,None],axis=0) for m in sorted(set(months[usable]))}
        selectors={}
        for j,shock in enumerate(("MP","CBI")):
            for kind in ("euro","non_euro","difference"):
                c=np.zeros(X.shape[1]);c[2*j]=int(kind in ("euro","difference"));c[2*j+1]=1 if kind=="non_euro" else -int(kind=="difference")
                selectors[f"{shock}:{kind}"]=c*.25
        rows.append({"horizon":h,"bread":bread,"scores":score_by_month,"selectors":selectors,"beta":beta,
                     "calendar":sorted(score_by_month),"rank":rank,"columns":X.shape[1],"condition_number":condition,"p_h":p,"p_max":p_max})
    paths=[]
    for key in rows[0]["selectors"]:
        influence=np.zeros((len(calendar),H+1)); estimates=[]
        for h,r in enumerate(rows):
            c=r["selectors"][key]; estimates.append(float(c@r["beta"]))
            for t,m in enumerate(calendar):
                if m in r["scores"]: influence[t,h]=c@r["bread"]@r["scores"][m]
        covariance=influence.T@influence
        paths.append({"key":key,"estimate":np.array(estimates),"covariance":covariance,"influence":influence,"calendar":calendar})
    return rows,paths


def psd(matrix):
    matrix=np.asarray(matrix,float)
    if not np.isfinite(matrix).all(): raise PanelGateError("nonfinite covariance")
    eig,V=np.linalg.eigh((matrix+matrix.T)/2)
    tolerance=PSD_ABS+PSD_REL*max(abs(eig))
    if min(eig)<-tolerance: raise PanelGateError("materially negative covariance eigenvalue")
    rank=int(np.count_nonzero(eig>tolerance))
    if rank<len(eig): raise PanelGateError("material rank deficiency; no Gaussian activation")
    clipped=np.maximum(eig,0)
    info={"raw_minimum_eigenvalue":float(min(eig)),"maximum_eigenvalue":float(max(eig)),"negative_eigenvalue_count":int(np.sum(eig<0)),
          "negative_eigenvalue_magnitude":float(-eig[eig<0].sum()),"clipped_count":int(np.sum(eig<0)),"clipping_magnitude":float((clipped-eig).sum()),
          "rank":rank,"condition_number":float(max(eig)/min(eig)),"absolute_tolerance":PSD_ABS,"relative_tolerance":PSD_REL}
    return V@np.diag(np.sqrt(clipped)),info


def sup_t(covariance,estimate,draws=10000,seed=182001):
    se=np.sqrt(np.diag(covariance)); R=covariance/np.outer(se,se)
    root,diagnostics=psd(R)
    z=np.random.default_rng(seed).standard_normal((draws,len(se)))@root.T
    maxima=np.max(np.abs(z),axis=1); critical=float(np.quantile(maxima,.95,method="higher"))
    if critical<1.959963984540054: raise PanelGateError("sup-t narrower than pointwise")
    observed=float(np.max(np.abs(estimate/se)))
    return {"critical_value":critical,"draw_count":draws,"seed":seed,"engine":"NumPy PCG64 standard_normal + symmetric eigendecomposition; higher empirical quantile",
            "correlation_psd":diagnostics,"lower":(estimate-critical*se).tolist(),"upper":(estimate+critical*se).tolist(),
            "observed_max_t":observed,"global_p_value":float((1+np.sum(maxima>=observed))/(draws+1)),"p_value_rule":"(1 + exceedances)/(draws + 1)",
            "windows":[{"start":lo,"end":hi,"secondary":True,"multiplicity_adjusted_across_windows":False,
                        "p_value":float((1+np.sum(np.max(np.abs(z[:,lo:hi+1]),axis=1)>=np.max(np.abs(estimate[lo:hi+1]/se[lo:hi+1]))))/(draws+1))}
                       for lo,hi in ((0,6),(7,12),(13,24)) if hi<len(se)]}
