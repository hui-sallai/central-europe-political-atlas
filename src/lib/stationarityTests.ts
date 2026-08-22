import type { AdfTestResult, KpssStatus, StationarityStatus } from "@/types/MacroDynamics";
import { inverse, matMul, normalCdf, transpose, zeros, type Matrix } from "@/lib/numericLinAlg";

export const STATIONARITY_ENGINE_VERSION = "stationarity-engine-v1.4";

// MacKinnon (1994) response-surface tables for the ADF tau statistic with a
// constant (regression "c", N=1), ported exactly from statsmodels adfvalues.py.
const TAU_MAX_C = 2.74;
const TAU_MIN_C = -18.83;
const TAU_STAR_C = -1.61;
const TAU_C_SMALLP = [2.1659, 1.4412, 3.8269e-2];
const TAU_C_LARGEP = [1.7339, 9.3202e-1, -1.2745e-1, -1.0368e-2];

// MacKinnon (2010) critical-value response surface, regression "c", N=1.
const TAU_C_2010 = [
  [-3.43035, -6.5393, -16.786, -79.433], // 1%
  [-2.86154, -2.8903, -4.234, -40.040], // 5%
  [-2.56677, -1.5384, -2.809, 0], // 10%
];

function mackinnonPValue(stat: number): number {
  if (stat > TAU_MAX_C) return 1;
  if (stat < TAU_MIN_C) return 0;
  const coef = stat <= TAU_STAR_C ? TAU_C_SMALLP : TAU_C_LARGEP;
  let arg = 0;
  for (let k = 0; k < coef.length; k += 1) arg += coef[k] * Math.pow(stat, k);
  return normalCdf(arg);
}

function mackinnonCritical(nobs: number): { "1%": number; "5%": number; "10%": number } {
  const inv = 1 / nobs;
  const evaluate = (row: number[]) => row[0] + row[1] * inv + row[2] * inv * inv + row[3] * inv * inv * inv;
  return { "1%": evaluate(TAU_C_2010[0]), "5%": evaluate(TAU_C_2010[1]), "10%": evaluate(TAU_C_2010[2]) };
}

interface OlsFit {
  coefficients: number[];
  tValues: number[];
  sse: number;
  nobs: number;
  k: number;
}

/** OLS via normal equations; t-values from σ²(X'X)⁻¹ with σ² = sse/(n−k). */
function ols(y: number[], x: Matrix): OlsFit {
  const nobs = y.length;
  const k = x[0].length;
  const xt = transpose(x);
  const xtx = matMul(xt, x);
  const xty = matMul(xt, y.map((value) => [value]));
  const xtxInv = inverse(xtx);
  const beta = matMul(xtxInv, xty);
  const coefficients = beta.map((row) => row[0]);
  let sse = 0;
  for (let i = 0; i < nobs; i += 1) {
    let fitted = 0;
    for (let j = 0; j < k; j += 1) fitted += x[i][j] * coefficients[j];
    const residual = y[i] - fitted;
    sse += residual * residual;
  }
  const sigma2 = sse / (nobs - k);
  const tValues = coefficients.map((value, j) => value / Math.sqrt(sigma2 * xtxInv[j][j]));
  return { coefficients, tValues, sse, nobs, k };
}

/** statsmodels OLS information criterion on a common sample (constants retained for fidelity). */
function olsAic(fit: OlsFit): number {
  return fit.nobs * Math.log(fit.sse / fit.nobs) + fit.nobs * (1 + Math.log(2 * Math.PI)) + 2 * fit.k;
}

function olsBic(fit: OlsFit): number {
  return fit.nobs * Math.log(fit.sse / fit.nobs) + fit.nobs * (1 + Math.log(2 * Math.PI)) + Math.log(fit.nobs) * fit.k;
}

export interface AdfOptions {
  maxlag?: number;
  autolag?: "aic" | "bic" | null;
}

/**
 * Augmented Dickey-Fuller test with a constant (regression "c"), faithful port
 * of statsmodels.tsa.stattools.adfuller: Δx_t = c + φ·x_{t−1} + Σ γ_i Δx_{t−i}.
 * Autolag searches 0..maxlag on a common sample (AIC default). The input must
 * be a contiguous non-null series — gaps are the caller's responsibility.
 */
export function adfTest(values: number[], options: AdfOptions = {}): AdfTestResult {
  const x = values;
  const n = x.length;
  const autolag = options.autolag === undefined ? "aic" : options.autolag;
  let maxlag = options.maxlag ?? Math.ceil(12 * Math.pow(n / 100, 0.25));
  maxlag = Math.min(maxlag, Math.floor(n / 2) - 2);
  if (maxlag < 0) throw new Error("sample size is too short for ADF with a constant");

  const xdiff: number[] = [];
  for (let i = 0; i < n - 1; i += 1) xdiff.push(x[i + 1] - x[i]);

  const notTested = (lag: number): AdfTestResult => ({
    test: "adf",
    regression: "c",
    series_length: n,
    used_lag: lag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs: Math.max(0, n - 1 - lag),
    statistic: Number.NaN,
    p_value: Number.NaN,
    critical_values: mackinnonCritical(Math.max(2, n - 1 - lag)),
    status: "not_tested",
  });

  // Common-sample design at maxlag: row r ↔ xdiff index t = maxlag + r.
  const buildRow = (t: number, lagCount: number, constFirst: boolean): number[] => {
    const level = x[t];
    const lags: number[] = [];
    for (let j = 1; j <= lagCount; j += 1) lags.push(xdiff[t - j]);
    return constFirst ? [1, level, ...lags] : [level, ...lags, 1];
  };

  let bestlag = maxlag;
  if (autolag !== null) {
    const nobsFull = n - 1 - maxlag;
    let bestIc = Number.POSITIVE_INFINITY;
    for (let lagCount = 0; lagCount <= maxlag; lagCount += 1) {
      const y: number[] = [];
      const xMat: Matrix = zeros(nobsFull, lagCount + 2);
      for (let r = 0; r < nobsFull; r += 1) {
        const t = maxlag + r;
        y.push(xdiff[t]);
        xMat[r] = buildRow(t, lagCount, true);
      }
      let fit: OlsFit;
      try {
        fit = ols(y, xMat);
      } catch {
        continue; // singular candidate design: not selectable
      }
      const ic = autolag === "aic" ? olsAic(fit) : olsBic(fit);
      if (ic < bestIc) {
        bestIc = ic;
        bestlag = lagCount;
      }
    }
    if (!Number.isFinite(bestIc)) return notTested(maxlag);
  }

  const nobs = n - 1 - bestlag;
  const yFinal: number[] = [];
  const xFinal: Matrix = zeros(nobs, bestlag + 2);
  for (let r = 0; r < nobs; r += 1) {
    const t = bestlag + r;
    yFinal.push(xdiff[t]);
    xFinal[r] = buildRow(t, bestlag, false); // [level, Δlags..., const]
  }
  let finalFit: OlsFit;
  try {
    finalFit = ols(yFinal, xFinal);
  } catch {
    return notTested(bestlag);
  }
  const statistic = finalFit.tValues[0]; // t-value of the lagged-level coefficient
  if (!Number.isFinite(statistic)) return notTested(bestlag);
  const pValue = mackinnonPValue(statistic);
  const criticalValues = mackinnonCritical(nobs);
  let status: StationarityStatus = "borderline";
  if (statistic < criticalValues["5%"]) status = "stationary";
  else if (statistic > criticalValues["10%"]) status = "non_stationary";

  return {
    test: "adf",
    regression: "c",
    series_length: n,
    used_lag: bestlag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs,
    statistic,
    p_value: pValue,
    critical_values: criticalValues,
    status,
  };
}

/** KPSS is deliberately not implemented in v1.4; the status is honest. */
export function kpssStatus(): KpssStatus {
  return {
    test: "kpss",
    status: "not_available",
    note: "KPSS 尚未实现：不伪装可用。当前平稳性判断以 ADF 为主，borderline 结果须谨慎解释。",
  };
}
