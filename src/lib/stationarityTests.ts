import type {
  AdfTestResult,
  KpssStatus,
  PersistenceDiagnostics,
  StationaritySpecificationId,
  StationarityStatus,
} from "@/types/MacroDynamics";
import { inverse, matMul, normalCdf, transpose, zeros, type Matrix } from "@/lib/numericLinAlg";
import seasonalAdfCalibration from "@/data/macro/seasonal_adf_critical_values.json";

export const STATIONARITY_ENGINE_VERSION = "stationarity-engine-v1.44";

export const STATIONARITY_SPECIFICATION_REGISTRY = [
  {
    specification_id: "adf_constant" as const,
    state: "active",
    deterministic_terms: "constant",
    seasonal_dummies: 0,
    reference_month: null,
    critical_value_policy: "MacKinnon 2010 regression=c, N=1 finite-sample response surface",
    p_value_policy: "MacKinnon 1994 regression=c response surface",
  },
  {
    specification_id: "adf_constant_seasonal_dummies" as const,
    state: "historical_reference",
    deterministic_terms: "constant_month_dummies",
    seasonal_dummies: 11,
    reference_month: "January",
    critical_value_policy: "zero-frequency ADF with fixed monthly deterministic terms; MacKinnon regression=c critical values are retained as the documented reference policy and independently checked against Python OLS fixtures",
    p_value_policy: "unavailable_for_custom_deterministic_specification",
  },
  {
    specification_id: "adf_constant_seasonal_dummies_mc" as const,
    state: "active",
    deterministic_terms: "constant_month_dummies",
    seasonal_dummies: 11,
    reference_month: "January",
    critical_value_policy: "precomputed Monte Carlo finite-sample critical values for the exact production seasonal-dummy ADF design; linear interpolation by input series length",
    p_value_policy: "unavailable_without_full_empirical_null_cdf",
  },
  {
    specification_id: "adf_constant_trend" as const,
    state: "registry_only",
    deterministic_terms: "constant_trend",
    seasonal_dummies: 0,
    reference_month: null,
    critical_value_policy: "not_activated",
    p_value_policy: "not_activated",
  },
] as const;

export const SEASONAL_UNIT_ROOT_REGISTRY = [{
  test_id: "hegy",
  state: "not_available",
  note: "HEGY is not activated because formula, critical values and cross-language validation are not yet complete. Deterministic month controls do not test seasonal unit roots.",
}] as const;

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
  standardErrors: number[];
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
  const standardErrors = coefficients.map((_, j) => Math.sqrt(sigma2 * xtxInv[j][j]));
  const tValues = coefficients.map((value, j) => value / standardErrors[j]);
  return { coefficients, standardErrors, tValues, sse, nobs, k };
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

function classifyAdf(statistic: number, criticalValues: { "1%": number; "5%": number; "10%": number }): StationarityStatus {
  if (statistic < criticalValues["5%"]) return "stationary";
  if (statistic > criticalValues["10%"]) return "non_stationary";
  return "borderline";
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
    deterministic_terms: "constant",
    seasonal_dummies: 0,
    reference_month: null,
    series_length: n,
    used_lag: lag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs: Math.max(0, n - 1 - lag),
    statistic: Number.NaN,
    p_value: Number.NaN,
    critical_values: mackinnonCritical(Math.max(2, n - 1 - lag)),
    critical_value_policy: "MacKinnon 2010 regression=c, N=1 finite-sample response surface",
    p_value_policy: "MacKinnon 1994 regression=c response surface",
    lagged_level_coefficient: null,
    lagged_level_standard_error: null,
    calibration: null,
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
  const status = classifyAdf(statistic, criticalValues);

  return {
    test: "adf",
    regression: "c",
    deterministic_terms: "constant",
    seasonal_dummies: 0,
    reference_month: null,
    series_length: n,
    used_lag: bestlag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs,
    statistic,
    p_value: pValue,
    critical_values: criticalValues,
    critical_value_policy: "MacKinnon 2010 regression=c, N=1 finite-sample response surface",
    p_value_policy: "MacKinnon 1994 regression=c response surface",
    lagged_level_coefficient: finalFit.coefficients[0],
    lagged_level_standard_error: finalFit.standardErrors[0],
    calibration: null,
    status,
  };
}

function periodMonth(period: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error(`invalid monthly period: ${period}`);
  return Number(period.slice(5, 7));
}

/**
 * Zero-frequency ADF with a constant and 11 fixed month-of-year dummies.
 * January is the reference month. Autolag candidates use one common effective
 * sample. Because statsmodels adfuller has no exogenous-deterministic argument,
 * the regression is constructed explicitly and validated against Python OLS.
 * A custom MacKinnon p-value is not reported; the registered critical-value
 * policy is used only for the zero-frequency tau decision.
 */
export function adfSeasonalDummyTest(values: number[], periods: string[], options: AdfOptions = {}): AdfTestResult {
  if (values.length !== periods.length) throw new Error("seasonal ADF values and periods must have equal length");
  periods.forEach(periodMonth);
  const x = values;
  const n = x.length;
  const autolag = options.autolag === undefined ? "aic" : options.autolag;
  let maxlag = options.maxlag ?? Math.ceil(12 * Math.pow(n / 100, 0.25));
  maxlag = Math.min(maxlag, Math.floor((n - 12) / 2) - 2);
  if (maxlag < 0) throw new Error("sample size is too short for ADF with monthly seasonal dummies");

  const xdiff = Array.from({ length: n - 1 }, (_, index) => x[index + 1] - x[index]);
  const monthDummies = (period: string) => {
    const month = periodMonth(period);
    return Array.from({ length: 11 }, (_, index) => month === index + 2 ? 1 : 0);
  };
  const buildRow = (t: number, lagCount: number, levelFirst: boolean) => {
    const level = x[t];
    const lags = Array.from({ length: lagCount }, (_, index) => xdiff[t - index - 1]);
    const deterministic = [1, ...monthDummies(periods[t + 1])];
    return levelFirst ? [level, ...lags, ...deterministic] : [...deterministic, level, ...lags];
  };
  const notTested = (lag: number): AdfTestResult => ({
    test: "adf",
    regression: "c+seasonal_dummies",
    deterministic_terms: "constant_month_dummies",
    seasonal_dummies: 11,
    reference_month: "January",
    series_length: n,
    used_lag: lag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs: Math.max(0, n - 1 - lag),
    statistic: Number.NaN,
    p_value: null,
    critical_values: mackinnonCritical(Math.max(2, n - 1 - lag)),
    critical_value_policy: "zero-frequency ADF with fixed monthly deterministic terms; MacKinnon regression=c critical values retained as the documented reference policy",
    p_value_policy: "unavailable_for_custom_deterministic_specification",
    lagged_level_coefficient: null,
    lagged_level_standard_error: null,
    calibration: null,
    status: "not_tested",
  });

  let bestlag = maxlag;
  if (autolag !== null) {
    const nobsFull = n - 1 - maxlag;
    let bestIc = Number.POSITIVE_INFINITY;
    for (let lagCount = 0; lagCount <= maxlag; lagCount += 1) {
      const y: number[] = [];
      const xMat: Matrix = zeros(nobsFull, 13 + lagCount);
      for (let row = 0; row < nobsFull; row += 1) {
        const t = maxlag + row;
        y.push(xdiff[t]);
        xMat[row] = buildRow(t, lagCount, false);
      }
      try {
        const fit = ols(y, xMat);
        const ic = autolag === "aic" ? olsAic(fit) : olsBic(fit);
        if (ic < bestIc) {
          bestIc = ic;
          bestlag = lagCount;
        }
      } catch {
        // Singular candidate designs are not selectable.
      }
    }
    if (!Number.isFinite(bestIc)) return notTested(maxlag);
  }

  const nobs = n - 1 - bestlag;
  const yFinal: number[] = [];
  const xFinal: Matrix = zeros(nobs, 13 + bestlag);
  for (let row = 0; row < nobs; row += 1) {
    const t = bestlag + row;
    yFinal.push(xdiff[t]);
    xFinal[row] = buildRow(t, bestlag, true);
  }
  let fit: OlsFit;
  try {
    fit = ols(yFinal, xFinal);
  } catch {
    return notTested(bestlag);
  }
  const statistic = fit.tValues[0];
  if (!Number.isFinite(statistic)) return notTested(bestlag);
  const criticalValues = mackinnonCritical(nobs);
  return {
    test: "adf",
    regression: "c+seasonal_dummies",
    deterministic_terms: "constant_month_dummies",
    seasonal_dummies: 11,
    reference_month: "January",
    series_length: n,
    used_lag: bestlag,
    max_lag: maxlag,
    autolag_criterion: autolag,
    nobs,
    statistic,
    p_value: null,
    critical_values: criticalValues,
    critical_value_policy: "zero-frequency ADF with fixed monthly deterministic terms; MacKinnon regression=c critical values retained as the documented reference policy",
    p_value_policy: "unavailable_for_custom_deterministic_specification",
    lagged_level_coefficient: fit.coefficients[0],
    lagged_level_standard_error: fit.standardErrors[0],
    calibration: null,
    status: classifyAdf(statistic, criticalValues),
  };
}

type CalibrationRecord = (typeof seasonalAdfCalibration.records)[number];

function interpolateSeasonalCriticalValues(seriesLength: number) {
  const records = [...seasonalAdfCalibration.records].sort((a, b) => a.sample_size - b.sample_size);
  let lower: CalibrationRecord = records[0];
  let upper: CalibrationRecord = records[records.length - 1];
  const exact = records.find((record) => record.sample_size === seriesLength);
  if (exact) lower = upper = exact;
  else if (seriesLength <= lower.sample_size) upper = lower;
  else if (seriesLength >= upper.sample_size) lower = upper;
  else {
    for (let index = 1; index < records.length; index += 1) {
      if (records[index].sample_size >= seriesLength) {
        lower = records[index - 1];
        upper = records[index];
        break;
      }
    }
  }
  const weight = lower.sample_size === upper.sample_size ? 0 : (seriesLength - lower.sample_size) / (upper.sample_size - lower.sample_size);
  const value = (key: "critical_1pct" | "critical_5pct" | "critical_10pct") => lower[key] + weight * (upper[key] - lower[key]);
  return {
    criticalValues: { "1%": value("critical_1pct"), "5%": value("critical_5pct"), "10%": value("critical_10pct") },
    lower,
    upper,
    weight,
  };
}

/**
 * Production seasonal-dummy ADF with validated, finite-sample Monte Carlo
 * critical values. The tau regression remains identical to the v1.43 reference
 * implementation; only the registered decision rule changes. No empirical
 * p-value is published because the complete null CDF is not retained.
 */
export function adfSeasonalDummyMonteCarloTest(values: number[], periods: string[], options: AdfOptions = {}): AdfTestResult {
  if (seasonalAdfCalibration.state !== "active_after_validation") throw new Error("seasonal ADF calibration is not validated for active use");
  const historical = adfSeasonalDummyTest(values, periods, options);
  const { criticalValues, lower, upper, weight } = interpolateSeasonalCriticalValues(values.length);
  return {
    ...historical,
    p_value: null,
    critical_values: criticalValues,
    critical_value_policy: "Monte Carlo finite-sample calibration for constant + 11 month dummies, common-sample AIC autolag and production tau; linear interpolation by input series length",
    p_value_policy: "unavailable_without_full_empirical_null_cdf",
    calibration: {
      specification_id: "adf_constant_seasonal_dummies_mc",
      sample_size_basis: "input_series_length_before_adf_lag_loss",
      requested_sample_size: values.length,
      calibration_n_lower: lower.sample_size,
      calibration_n_upper: upper.sample_size,
      interpolation_weight: weight,
      interpolation_policy: seasonalAdfCalibration.interpolation_policy,
      replications_lower: lower.replications,
      replications_upper: upper.replications,
      generator_version: seasonalAdfCalibration.provenance.generator_version,
      source_commit: seasonalAdfCalibration.provenance.source_commit,
    },
    status: Number.isFinite(historical.statistic) ? classifyAdf(historical.statistic, criticalValues) : "not_tested",
  };
}

export function persistenceDiagnostics(values: number[], maxLag = 24): PersistenceDiagnostics {
  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const applied = Math.max(0, Math.min(maxLag, n - 2));
  const acfValues = Array.from({ length: applied + 1 }, (_, lag) => {
    if (lag === 0) return 1;
    let covariance = 0;
    for (let index = lag; index < n; index += 1) covariance += (values[index] - mean) * (values[index - lag] - mean);
    return variance > 0 ? covariance / variance : Number.NaN;
  });
  const pacfValues = [1];
  let previous: number[] = [];
  for (let order = 1; order <= applied; order += 1) {
    let numerator = acfValues[order];
    let denominator = 1;
    for (let j = 1; j < order; j += 1) {
      numerator -= previous[j - 1] * acfValues[order - j];
      denominator -= previous[j - 1] * acfValues[j];
    }
    const reflection = Math.abs(denominator) > 1e-12 ? numerator / denominator : Number.NaN;
    const current = Array.from({ length: order }, (_, index) => index === order - 1
      ? reflection
      : previous[index] - reflection * previous[order - index - 2]);
    pacfValues.push(reflection);
    previous = current;
  }
  const lag12 = applied >= 12 && Number.isFinite(acfValues[12]) ? acfValues[12] : null;
  const band = 1.96 / Math.sqrt(n);
  return {
    nobs: n,
    max_lag: applied,
    acf: acfValues.map((value, lag) => ({ lag, value })),
    pacf: pacfValues.map((value, lag) => ({ lag, value })),
    seasonal_lag_12_autocorrelation: lag12,
    seasonal_persistence_warning: lag12 !== null && Math.abs(lag12) >= 0.3,
    approximate_significance_band_95: { lower: -band, upper: band, formula: "plus_minus_1.96_over_sqrt_n" },
    interpretation_boundary: "ACF/PACF are descriptive. A large lag-12 autocorrelation is a seasonal-persistence warning, not confirmation of a seasonal unit root.",
  };
}

export function stationaritySpecification(id: StationaritySpecificationId) {
  return STATIONARITY_SPECIFICATION_REGISTRY.find((item) => item.specification_id === id) ?? null;
}

/** KPSS is deliberately not implemented in v1.4; the status is honest. */
export function kpssStatus(): KpssStatus {
  return {
    test: "kpss",
    status: "not_available",
    note: "KPSS 尚未实现：不伪装可用。当前平稳性判断以 ADF 为主，borderline 结果须谨慎解释。",
  };
}
