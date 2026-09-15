"""Isolated C1 oracle study. Never writes canonical repository artifacts."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['VECLIB_MAXIMUM_THREADS']='1'
import sys, importlib.util, json, hashlib, time
from pathlib import Path
import numpy as np
BASE=Path(__file__).resolve().parent
REPO=BASE.parents[1]
SCRIPTS=REPO/'scripts/panel-local-projections'
sys.path.insert(0,str(SCRIPTS))
spec=importlib.util.spec_from_file_location('simulation',SCRIPTS/'path-simulate.py')
sim=importlib.util.module_from_spec(spec); spec.loader.exec_module(sim)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):
    (BASE/name).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')
def sample(seed,alternative):
    rng=np.random.default_rng(seed); centered=[]; observed=[]
    for offset in range(0,10000,10):
        y,x,gamma=sim.generate(rng,10,alternative)
        beta,inf=sim.batch_fit(y,x)
        se=np.sqrt(np.sum(inf**2,axis=1))
        assert np.isfinite(beta).all() and np.isfinite(se).all() and (se>0).all()
        if offset==0:
            yy=y[0].copy(); yy[0]=np.nan
            months=np.repeat([f'{2000+t//12:04d}-{t%12+1:02d}' for t in range(130)],8)
            _,reference=sim.fit(yy.reshape(-1),np.repeat(x[0],8,axis=0),np.tile(np.arange(8),130),months,24,p_max=5)
            for k,p in enumerate(reference):
                np.testing.assert_allclose(beta[0,:,k],p['estimate'],atol=1e-8,rtol=1e-8)
                np.testing.assert_allclose(se[0,:,k]**2,np.diag(p['covariance']),atol=1e-8,rtol=1e-8)
        truth=((1-.4**np.arange(1,26))/.6)[:,None]*np.array([gamma[0,0],gamma[4,0],gamma[0,0]-gamma[4,0],gamma[0,1],gamma[4,1],gamma[0,1]-gamma[4,1]])[None,:]*.25
        centered.append(np.maximum.accumulate(abs((beta-truth)/se),axis=1)[:,[6,12,24],:])
        observed.append(np.maximum.accumulate(abs(beta/se),axis=1)[:,[6,12,24],:])
        if offset%1000==0: print(f'seed {seed}: {offset+10}/10000',flush=True)
    return np.concatenate(centered),np.concatenate(observed)
def main():
    target=BASE/'calibration-results.json'
    if target.exists() or (BASE/'calibration-locked-critical-values.json').exists():
        raise SystemExit('Refusing to overwrite completed or locked study evidence')
    start=time.monotonic(); frozen=sim.freeze()
    provenance={str(p):sha(p) for p in [BASE/'calibration-preregistration.md',Path(__file__),SCRIPTS/'path-simulate.py',SCRIPTS/'path_core.py']}
    save('calibration-execution-manifest.json',{'status':'started','hashes':provenance,'frozen':frozen,'numpy':np.__version__,'reps_per_design_per_stage':10000})
    critical=[]
    for alt,seed in [(False,1822001),(True,1822002)]:
        z,_=sample(seed,alt);critical.append(np.quantile(z,.95,axis=0,method='higher'))
    c=np.maximum(1.959963984540054,np.maximum(*critical))
    save('calibration-locked-critical-values.json',{'status':'locked_before_holdout','critical':c.tolist(),'training_by_design':[v.tolist() for v in critical],'axes':{'horizons':[6,12,24],'paths':['MP_euro','MP_non_euro','MP_difference','CBI_euro','CBI_non_euro','CBI_difference']}})
    locked=sha(BASE/'calibration-locked-critical-values.json');rows=[]
    for alt,seed in [(False,1823001),(True,1823002)]:
        z,t=sample(seed,alt)
        for j,h in enumerate([6,12,24]):
            for k in range(6):
                coverage=float(np.mean(z[:,j,k]<=c[j,k]));rejection=float(np.mean(t[:,j,k]>c[j,k]))
                size=not alt and k%3==2
                rows.append(dict(design='alternative' if alt else 'null',horizon=h,shock='MP' if k<3 else 'CBI',path=['euro','non_euro','difference'][k%3],critical=float(c[j,k]),coverage=coverage,coverage_mcse=float(np.sqrt(coverage*(1-coverage)/10000)),rejection=rejection,rejection_mcse=float(np.sqrt(rejection*(1-rejection)/10000)),metric='size' if size else 'power',coverage_pass=.935<=coverage<=.965,size_pass=.035<=rejection<=.065 if size else None))
    power=[]
    for h in [6,12,24]:
        for shock in ['MP','CBI']:
            pair=[r for r in rows if r['horizon']==h and r['shock']==shock and r['path']=='difference']
            power.append({'horizon':h,'shock':shock,'pass':pair[1]['rejection']>=pair[0]['rejection']+.05})
    assert sim.freeze()==frozen
    assert all(sha(Path(p))==v for p,v in provenance.items())
    assert sha(BASE/'calibration-locked-critical-values.json')==locked
    passed=all(r['coverage_pass'] and r['size_pass'] is not False for r in rows) and all(p['pass'] for p in power)
    save('calibration-results.json',{'status':'pass_within_registered_dgp_only' if passed else 'fail','formal_activation':False,'independent_panels':40000,'critical_hash':locked,'provenance':provenance,'rows':rows,'power_checks':power,'frozen_unchanged':True,'elapsed_seconds':time.monotonic()-start})
    print('C1 complete: '+('PASS within DGP only' if passed else 'FAIL'),flush=True)
if __name__=='__main__':main()
