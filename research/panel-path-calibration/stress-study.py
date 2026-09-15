"""C2 locked-C1 transport tests; research outputs only."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('c1',Path(__file__).with_name('calibration-study.py'))
c1=importlib.util.module_from_spec(spec);spec.loader.exec_module(c1)
np=c1.np;sim=c1.sim;BASE=c1.BASE
DESIGNS=[('rho_zero',130,0.,'normal'),('rho_high',130,.8,'normal'),('short_sample',80,.4,'normal'),('heavy_tail',130,.4,'t5'),('heteroskedastic',130,.4,'hetero')]
def generate(rng,T,rho,kind,alt):
    B=10;n=T+100
    x=rng.normal(size=(B,n,2));x[:,:,1]=.2*x[:,:,0]+np.sqrt(.96)*x[:,:,1]
    gamma=np.array([[1+(.2 if alt else 0) if i<4 else 1-(.2 if alt else 0),.4-(.15 if alt else 0) if i<4 else .4+(.15 if alt else 0)] for i in range(8)])
    def innovation(shape):return rng.standard_t(5,size=shape)*np.sqrt(3/5) if kind=='t5' else rng.normal(size=shape)
    e=.35*innovation((B,n,1))+.45*np.repeat(innovation((B,n,2)),4,axis=2)+.6*innovation((B,n,8))
    if kind=='hetero':e*=np.sqrt((1+.5*x[:,:,:1]**2)/1.5)
    y=np.zeros((B,n,8))
    for t in range(1,n):y[:,t]=rho*y[:,t-1]+x[:,t]@gamma.T+e[:,t]
    return y[:,100:]+np.arange(8)[None,None,:]*.1,x[:,100:],gamma
def main():
    if (BASE/'stress-results.json').exists():raise SystemExit('Refusing overwrite')
    files=[BASE/'stress-preregistration.md',Path(__file__),BASE/'calibration-study.py',c1.SCRIPTS/'path-simulate.py',c1.SCRIPTS/'path_core.py',BASE/'calibration-locked-critical-values.json']
    hashes={str(p):c1.sha(p) for p in files};frozen=sim.freeze();start=c1.time.monotonic()
    assert hashes[str(files[-1])]=='f490abdf471818ea088b047b7060f163d826c51039424e0866445d48503931c0'
    c=np.array(c1.json.loads(files[-1].read_text())['critical'])
    c1.save('stress-execution-manifest.json',{'hashes':hashes,'frozen':frozen,'designs':DESIGNS,'panels':100000})
    rows=[];power=[]
    for d,(name,T,rho,kind) in enumerate(DESIGNS):
        sim.T=T
        for alt in (False,True):
            seed=1824001+100*d+int(alt);rng=np.random.default_rng(seed);covered=np.zeros((3,6));rejected=np.zeros((3,6))
            for offset in range(0,10000,10):
                y,x,gamma=generate(rng,T,rho,kind,alt);beta,inf=sim.batch_fit(y,x);se=np.sqrt(np.sum(inf**2,axis=1))
                assert np.isfinite(beta).all() and np.isfinite(se).all() and (se>0).all()
                if offset==0:
                    yy=y[0].copy();yy[0]=np.nan
                    months=np.repeat([f'{2000+t//12:04d}-{t%12+1:02d}' for t in range(T)],8)
                    _,ref=sim.fit(yy.reshape(-1),np.repeat(x[0],8,axis=0),np.tile(np.arange(8),T),months,24,p_max=5)
                    for k,p in enumerate(ref):
                        np.testing.assert_allclose(beta[0,:,k],p['estimate'],rtol=1e-8,atol=1e-8)
                        np.testing.assert_allclose(se[0,:,k]**2,np.diag(p['covariance']),rtol=1e-8,atol=1e-8)
                truth=((1-rho**np.arange(1,26))/(1-rho))[:,None]*np.array([gamma[0,0],gamma[4,0],gamma[0,0]-gamma[4,0],gamma[0,1],gamma[4,1],gamma[0,1]-gamma[4,1]])[None,:]*.25
                M=np.maximum.accumulate(abs((beta-truth)/se),axis=1)[:,[6,12,24]]
                observed=np.maximum.accumulate(abs(beta/se),axis=1)[:,[6,12,24]]
                covered+=(M<=c).sum(axis=0);rejected+=(observed>c).sum(axis=0)
                if offset%2000==0:print(f'{name} alt={alt}: {offset+10}/10000',flush=True)
            for j,h in enumerate([6,12,24]):
                for k in range(6):
                    cov=float(covered[j,k]/10000);rej=float(rejected[j,k]/10000);is_size=not alt and k%3==2
                    rows.append(dict(design=name,alternative=alt,seed=seed,horizon=h,shock='MP' if k<3 else 'CBI',path=['euro','non_euro','difference'][k%3],coverage=cov,rejection=rej,coverage_mcse=float(np.sqrt(cov*(1-cov)/10000)),rejection_mcse=float(np.sqrt(rej*(1-rej)/10000)),coverage_pass=.935<=cov<=.965,size_pass=.035<=rej<=.065 if is_size else None))
        for h in [6,12,24]:
            for shock in ['MP','CBI']:
                p=[r for r in rows if r['design']==name and r['horizon']==h and r['shock']==shock and r['path']=='difference']
                power.append(dict(design=name,horizon=h,shock=shock,passed=p[1]['rejection']>=p[0]['rejection']+.05))
        c1.save('stress-checkpoint.json',{'status':'incomplete','rows':rows})
    assert sim.freeze()==frozen and all(c1.sha(Path(p))==v for p,v in hashes.items())
    passed=all(r['coverage_pass'] and r['size_pass'] is not False for r in rows) and all(r['passed'] for r in power)
    c1.save('stress-results.json',{'status':'pass_research_only' if passed else 'fail','formal_activation':False,'rows':rows,'power':power,'panels':100000,'hashes':hashes,'frozen_unchanged':True,'elapsed_seconds':c1.time.monotonic()-start})
    print('C2 '+('PASS research only' if passed else 'FAIL'),flush=True)
if __name__=='__main__':main()
