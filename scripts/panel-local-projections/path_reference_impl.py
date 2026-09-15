"""Independent explicit-dummy QR reference; no production imports.

Construct observations one country/month at a time; align equation scores by
dictionary intersection, not the production zero-padded influence matrix.
"""
import math
import numpy as np
from scipy.linalg import solve_triangular


def reference(y,x,units,months,H,controls=None,p_max=None):
    periods=sorted(set(months)); countries=sorted(set(units)); K=len(countries)
    lookup={(int(u),str(m)):i for i,(u,m) in enumerate(zip(units,months))}
    def offset(m,n):
        total=int(m[:4])*12+int(m[5:])-1+n
        return f"{total//12:04d}-{total%12+1:02d}"
    def interaction(i):
        euro=float(units[i]<4)
        return [x[i,0]*euro,x[i,0]*(1-euro),x[i,1]*euro,x[i,1]*(1-euro)]
    p_max=math.ceil((len(periods)-H)**(1/3)) if p_max is None else p_max
    fits=[]
    for h in range(H+1):
        p=min(h,p_max); X=[]; Y=[]; dates=[]
        for month in periods:
            for unit in countries:
                now=lookup.get((int(unit),month))
                leads=[lookup.get((int(unit),offset(month,l))) for l in range(h+1)]
                lags=[lookup.get((int(unit),offset(month,-l))) for l in range(1,p+1)]
                if now is None or any(i is None for i in leads+lags):continue
                target=sum(y[i] for i in leads)
                regressors=interaction(now)
                regressors += [y[i] for i in lags]
                for c in range(4): regressors += [interaction(i)[c] for i in lags]
                if controls is not None:regressors+=list(controls[now])
                if not np.isfinite(target) or not np.isfinite(regressors).all():continue
                X.append([float(unit==c) for c in countries]+regressors);Y.append(target);dates.append(month)
        X=np.asarray(X);Y=np.asarray(Y)
        Q,R=np.linalg.qr(X,mode="reduced")
        beta=solve_triangular(R,Q.T@Y)
        residual=Y-X@beta
        invR=solve_triangular(R,np.eye(R.shape[0])); inverse=invR@invR.T
        score={}
        for date,row,error in zip(dates,X,residual):score[date]=score.get(date,np.zeros(X.shape[1]))+row*error
        # Store independently normalized score contribution for each selector.
        influences={};estimates={}
        for j,shock in enumerate(("MP","CBI")):
            for kind in ("euro","non_euro","difference"):
                selector=np.zeros(X.shape[1]);selector[K+2*j]=.25*int(kind in ("euro","difference"));selector[K+2*j+1]=.25*(1 if kind=="non_euro" else -int(kind=="difference"))
                key=f"{shock}:{kind}";estimates[key]=float(selector@beta)
                influences[key]={m:float(selector@inverse@s) for m,s in score.items()}
        fits.append((estimates,influences))
    output={}
    for key in fits[0][0]:
        matrix=np.zeros((H+1,H+1))
        for h in range(H+1):
            for g in range(H+1):
                a,b=fits[h][1][key],fits[g][1][key]
                matrix[h,g]=sum(a[m]*b[m] for m in sorted(set(a)&set(b)))
        output[key]={"estimate":np.array([f[0][key] for f in fits]),"covariance":matrix}
    return output


def reference_sup_t(covariance,estimates,seed=982001,draws=100000):
    sd=np.sqrt(np.diag(covariance)); correlation=covariance/sd[:,None]/sd[None,:]
    # Cholesky and MT19937 deliberately differ from production eigh and PCG64.
    L=np.linalg.cholesky(correlation)
    z=np.random.RandomState(seed).normal(size=(draws,len(sd)))@L.T
    maximum=np.max(abs(z),axis=1); ordered=np.sort(maximum)
    critical=float(ordered[math.ceil(.95*(draws-1))])
    observed=max(abs(estimates/sd))
    return {"critical_value":critical,"global_p_value":float((1+np.count_nonzero(maximum>=observed))/(draws+1)),
            "lower":(estimates-critical*sd).tolist(),"upper":(estimates+critical*sd).tolist(),"draw_count":draws,"seed":seed,"engine":"independent MT19937 + Cholesky + order statistic"}
