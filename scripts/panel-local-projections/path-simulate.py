"""Full-estimator Monte Carlo, not Gaussian draws mislabelled DGP replications.

Re-estimate every horizon, country FE, lagged outcomes and both shock/group
interactions in every replication. Batching changes only linear algebra layout.
"""
import argparse
import time
import numpy as np
from path_core import emit,freeze,fit

T=130
BATCH=10
RHO=.4


def generate(rng,B,alternative):
    burn=100
    shocks=rng.normal(size=(B,T+burn,2))
    shocks[:,:,1]=.2*shocks[:,:,0]+np.sqrt(.96)*shocks[:,:,1]
    euro=np.arange(8)<4
    gamma=np.array([[1+(0.2 if alternative else 0) if e else 1-(0.2 if alternative else 0),
                     .4-(.15 if alternative else 0) if e else .4+(.15 if alternative else 0)] for e in euro])
    innovation=.35*rng.normal(size=(B,T+burn,1))+.45*np.repeat(rng.normal(size=(B,T+burn,2)),4,axis=2)+.6*rng.normal(size=(B,T+burn,8))
    y=np.zeros((B,T+burn,8))
    for t in range(1,T+burn):y[:,t]=RHO*y[:,t-1]+shocks[:,t]@gamma.T+innovation[:,t]
    y=y[:,burn:]+np.arange(8)[None,None,:]*.1
    return y,shocks[:,burn:],gamma


def batch_fit(y,shocks):
    B=len(y); groups=np.column_stack((np.arange(8)<4,np.arange(8)>=4)).astype(float)
    interaction=(shocks[:,:,None,:,None]*groups[None,None,:,None,:]).reshape(B,T,8,4)
    source=np.concatenate((y[:,:,:,None],interaction),axis=3)
    cumulative=np.concatenate((np.zeros((B,1,8)),np.cumsum(y,axis=1)),axis=1)
    coefficients=np.empty((B,25,6));influence=np.zeros((B,T,25,6))
    for h in range(25):
        p=min(h,5);start=1+p;stop=T-h;count=stop-start
        target=cumulative[:,start+h+1:stop+h+1]-cumulative[:,start:stop]
        columns=[interaction[:,start:stop]]+[source[:,start-lag:stop-lag,:,c,None] for c in range(5) for lag in range(1,p+1)]
        X=np.concatenate(columns,axis=3)
        X=X-X.mean(axis=1,keepdims=True);target=target-target.mean(axis=1,keepdims=True)
        flat=X.reshape(B,count*8,-1);response=target.reshape(B,count*8)
        gram=flat.transpose(0,2,1)@flat
        beta=np.linalg.solve(gram,(flat.transpose(0,2,1)@response[:,:,None]))[:,:,0]
        residual=response-(flat@beta[:,:,None])[:,:,0]
        score=(flat*residual[:,:,None]).reshape(B,count,8,-1).sum(axis=2)
        C=np.zeros((flat.shape[2],6))
        C[0,:3]=[.25,0,.25];C[1,:3]=[0,.25,-.25]
        C[2,3:]=[.25,0,.25];C[3,3:]=[0,.25,-.25]
        inverse_selected=np.linalg.solve(gram,np.broadcast_to(C,(B,*C.shape)))
        coefficients[:,h]=beta@C
        influence[:,start:stop,h]=score@inverse_selected
    return coefficients,influence


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--reps",type=int,default=10000);args=parser.parse_args()
    assert args.reps>=1
    registry={"state":"preregistered_before_results","replications_per_design":10000,"horizons":[6,12,24],"sample_months":T,"countries":8,
              "dgp":"stationary AR(1) outcome increments rho=.4; 100 burn-in; correlated common joint shocks; fixed country intercepts; common, group and individual Gaussian innovations",
              "null_group_coefficients":{"MP":[1,1],"CBI":[.4,.4]},"alternative_group_coefficients":{"MP":[1.2,.8],"CBI":[.25,.55]},
              "seeds":{"null":1821001,"alternative":1821002,"inner_gaussian":1821003},"batch_size":BATCH,"inner_gaussian_draws":10000,
              "fit":"full re-estimation of country-FE t-LAHR current interactions and outcome/interaction lags; p_max=5 for H=6,12,24 at T=130",
              "coverage_tolerance":[.935,.965],"size_tolerance":[.035,.065],"power_requirement":"difference-path alternative rejection exceeds null rejection by at least .05",
              "no_post_result_tolerance_change":True,"activation_requires_all_key_designs":True}
    emit("panel_lp_path_monte_carlo_registry",**registry)
    freeze();start_time=time.monotonic();records=[]
    for alternative in (False,True):
        rng=np.random.default_rng(1821002 if alternative else 1821001);sim_rng=np.random.default_rng(1821003)
        counters={(H,k):{"pointwise":np.zeros(H+1),"covered":0,"reject":0} for H in (6,12,24) for k in range(6)}
        for offset in range(0,args.reps,BATCH):
            B=min(BATCH,args.reps-offset);y,x,gamma=generate(rng,B,alternative)
            beta,influence=batch_fit(y,x)
            if offset==0:
                # Explicitly cross-check the batched estimator against production.
                yy=y[0].copy();yy[0]=np.nan
                months=np.repeat([f"{2000+t//12:04d}-{t%12+1:02d}" for t in range(T)],8)
                _,ind=fit(yy.reshape(-1),np.repeat(x[0],8,axis=0),np.tile(np.arange(8),T),months,24,p_max=5)
                for k,p in enumerate(ind):
                    np.testing.assert_allclose(beta[0,:,k],p["estimate"],atol=1e-8)
                    np.testing.assert_allclose(influence[0,:,:,k].T@influence[0,:,:,k],p["covariance"],atol=1e-8)
            multiplier=(1-RHO**np.arange(1,26))/(1-RHO)
            truth=multiplier[:,None]*np.array([gamma[0,0],gamma[4,0],gamma[0,0]-gamma[4,0],gamma[0,1],gamma[4,1],gamma[0,1]-gamma[4,1]])[None,:]*.25
            for k in range(6):
                scores=influence[:,:,:,k];cov=scores.transpose(0,2,1)@scores
                full_se=np.sqrt(np.diagonal(cov,axis1=1,axis2=2));correlation=cov/full_se[:,:,None]/full_se[:,None,:]
                eig,V=np.linalg.eigh(correlation)
                if np.any(eig<=0):raise ValueError("MC covariance rank/PSD failure: no clipping")
                root=V*np.sqrt(eig)[:,None,:]
                gaussian=sim_rng.standard_normal((B,10000,25))@root.transpose(0,2,1)
                # Marginal subvectors of the same Gaussian draw have exactly
                # the required H=6/H=12 covariance, avoiding redundant draws.
                maxima=np.maximum.accumulate(abs(gaussian),axis=2)
                for H in (6,12,24):
                    se=full_se[:,:H+1];maximum=maxima[:,:,H]
                    critical=np.quantile(maximum,.95,axis=1,method="higher")
                    student=abs((beta[:,:H+1,k]-truth[:H+1,k])/se)
                    observed=np.max(abs(beta[:,:H+1,k]/se),axis=1)
                    counters[(H,k)]["pointwise"]+=np.sum(student<=1.959963984540054,axis=0)
                    counters[(H,k)]["covered"]+=int(np.sum(np.max(student,axis=1)<=critical))
                    pvalues=(1+np.sum(maximum>=observed[:,None],axis=1))/10001
                    counters[(H,k)]["reject"]+=int(np.sum(pvalues<.05))
            if offset%500==0:print(f"Monte Carlo {'alternative' if alternative else 'null'} {offset+B}/{args.reps}; elapsed {time.monotonic()-start_time:.1f}s",flush=True)
        for (H,k),v in counters.items():
            coverage=v["covered"]/args.reps;size=v["reject"]/args.reps
            records.append({"design":"alternative" if alternative else "null","horizon":H,"shock":"MP" if k<3 else "CBI","path_type":["euro","non_euro","difference"][k%3],
                            "replications":args.reps,"pointwise_coverage_by_horizon":(v["pointwise"]/args.reps).tolist(),"simultaneous_coverage":coverage,
                            "global_rejection_rate":size,"global_metric":"size" if not alternative and k%3==2 else "power",
                            "coverage_pass":.935<=coverage<=.965,"size_pass":.035<=size<=.065 if not alternative and k%3==2 else None})
        emit("panel_lp_path_monte_carlo_results",status="incomplete",records=records,elapsed_seconds=time.monotonic()-start_time)
    passed=args.reps>=10000 and all(r["coverage_pass"] and r["size_pass"] is not False for r in records)
    for H in (6,12,24):
        for shock in ("MP","CBI"):
            pair=[r for r in records if r["horizon"]==H and r["shock"]==shock and r["path_type"]=="difference"]
            passed &= pair[1]["global_rejection_rate"]>=pair[0]["global_rejection_rate"]+.05
    emit("panel_lp_path_monte_carlo_results",status="pass" if passed else "fail" if args.reps>=10000 else "pilot_not_activation_evidence",records=records,elapsed_seconds=time.monotonic()-start_time)
    print(f"Monte Carlo gate: {'PASS' if passed else 'NOT PASSED'}",flush=True)
    freeze()
    if args.reps>=10000 and not passed:raise SystemExit(2)

if __name__=="__main__":main()
