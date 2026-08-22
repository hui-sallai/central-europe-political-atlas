import type { HighFrequencyPoint } from "@/lib/eventWindowEngine";
import type {
  AdfTestResult,
  InformationCriterion,
  IrfPath,
  LagCandidateResult,
  TransformationId,
  VarModelResult,
} from "@/types/MacroDynamics";
import { applyTransformation, transformationSpec } from "@/lib/timeSeriesTransforms";
import { adfTest } from "@/lib/stationarityTests";
import {
  chiSquareCdf,
  cholesky,
  eigenvalues,
  identity,
  inverse,
  logDetSpd,
  matMul,
  solve,
  trace,
  transpose,
  zeros,
  type Matrix,
} from "@/lib/numericLinAlg";

export const VAR_ENGINE_VERSION = "var-engine-v1.4";
export const VAR_DATASET_VERSION = "high-frequency-v1.31";

export interface VarSpecification {
  country: string;
  variables: Array<{ indicator: string; transformation: TransformationId }>;
  start_period: string;
  end_period: string;
  ic_criterion: InformationCriterion;
  max_lag: number;
  deterministic_terms: "constant" | "constant_trend";
}

export type VarRunFailure = {
  status: "blocked";
  reason_code: "insufficient_observations" | "missing_data" | "non_stationary" | "unstable" | "diagnostics_failed" | "unsupported_specification" | "singular";
  reasons: string[];
  stationarity?: Array<{ indicator: string; transformation: TransformationId; adf: AdfTestResult }>;
};

export type VarRunOutcome = { status: "ok"; result: VarModelResult } | VarRunFailure;

interface VarEstimate {
  params: Matrix; // (k_trend + K*p) × K
  resid: Matrix; // T × K
  sigma_u: Matrix; // unbiased, df-adjusted
  sigma_u_mle: Matrix;
  nobs: number;
  coefficientMatrices: Matrix[]; // per lag, row = lagged variable, column = equation
  intercepts: number[];
}

/** Exported for offline reference validation (scripts/validation). */
export function estimateVarModel(data: Matrix, lags: number): VarEstimate {
  return estimateVar(data, lags);
}

/** Exported for offline reference validation (scripts/validation). */
export function selectVarLagOrder(data: Matrix, maxLags: number): LagCandidateResult[] {
  return selectLagOrder(data, maxLags);
}

function monthToIndex(period: string): number {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + (month - 1);
}

function indexToMonth(index: number): string {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * Estimates a VAR(p) by joint least squares (equation-by-equation OLS with the
 * same regressors, matching statsmodels _estimate_var). Row-vector convention:
 * y_t = const + Σ_i y_{t−i} A_i, so A_i[r][c] is the effect of variable r
 * lagged i periods on equation c.
 */
function estimateVar(data: Matrix, lags: number): VarEstimate {
  const total = data.length;
  const k = data[0].length;
  const nobs = total - lags;
  const kTrend = 1;
  const width = kTrend + k * lags;
  const z: Matrix = zeros(nobs, width);
  const ySample: Matrix = zeros(nobs, k);
  for (let t = 0; t < nobs; t += 1) {
    const row = t + lags;
    z[t][0] = 1;
    for (let lag = 1; lag <= lags; lag += 1) {
      for (let variable = 0; variable < k; variable += 1) {
        z[t][kTrend + (lag - 1) * k + variable] = data[row - lag][variable];
      }
    }
    for (let variable = 0; variable < k; variable += 1) ySample[t][variable] = data[row][variable];
  }
  const zt = transpose(z);
  const ztz = matMul(zt, z);
  const zty = matMul(zt, ySample);
  const params = solve(ztz, zty);
  const resid: Matrix = zeros(nobs, k);
  for (let t = 0; t < nobs; t += 1) {
    for (let variable = 0; variable < k; variable += 1) {
      let fitted = 0;
      for (let j = 0; j < width; j += 1) fitted += z[t][j] * params[j][variable];
      resid[t][variable] = ySample[t][variable] - fitted;
    }
  }
  const sse = matMul(transpose(resid), resid);
  const dfResid = nobs - (k * lags + kTrend);
  if (dfResid <= 0) throw new Error("degrees of freedom exhausted");
  const sigma_u: Matrix = sse.map((row) => row.map((value) => value / dfResid));
  const sigma_u_mle: Matrix = sse.map((row) => row.map((value) => value / nobs));
  const coefficientMatrices: Matrix[] = [];
  for (let lag = 1; lag <= lags; lag += 1) {
    const block: Matrix = zeros(k, k);
    for (let r = 0; r < k; r += 1) {
      for (let c = 0; c < k; c += 1) block[r][c] = params[kTrend + (lag - 1) * k + r][c];
    }
    coefficientMatrices.push(block);
  }
  const intercepts = params[0].slice();
  return { params, resid, sigma_u, sigma_u_mle, nobs, coefficientMatrices, intercepts };
}

/** Information criteria per candidate lag on a common effective sample (statsmodels select_order convention). */
function selectLagOrder(data: Matrix, maxLags: number): LagCandidateResult[] {
  const k = data[0].length;
  const candidates: LagCandidateResult[] = [];
  for (let p = 1; p <= maxLags; p += 1) {
    const offset = maxLags - p;
    const subset = data.slice(offset);
    const estimate = estimateVar(subset, p);
    const nobs = estimate.nobs; // = total - maxLags for every candidate
    const freeParameters = p * k * k + k * 1;
    const ld = logDetSpd(estimate.sigma_u_mle);
    candidates.push({
      lag: p,
      aic: ld + (2 / nobs) * freeParameters,
      bic: ld + (Math.log(nobs) / nobs) * freeParameters,
      hqic: ld + ((2 * Math.log(Math.log(nobs))) / nobs) * freeParameters,
      nobs,
      free_parameters: freeParameters,
    });
  }
  return candidates;
}

/** Companion-matrix eigenvalue stability check; stable ⇔ all roots strictly inside the unit circle. */
export function varStability(coefficientMatrices: Matrix[]): { stable: boolean; max_root_modulus: number; roots_moduli: number[] } {
  const p = coefficientMatrices.length;
  const k = coefficientMatrices[0].length;
  const size = k * p;
  const companion: Matrix = zeros(size, size);
  for (let lag = 0; lag < p; lag += 1) {
    for (let r = 0; r < k; r += 1) {
      for (let c = 0; c < k; c += 1) companion[r][lag * k + c] = coefficientMatrices[lag][r][c];
    }
  }
  for (let block = 0; block < p - 1; block += 1) {
    for (let i = 0; i < k; i += 1) companion[(block + 1) * k + i][block * k + i] = 1;
  }
  const { re, im } = eigenvalues(companion);
  const moduli = re.map((real, index) => Math.hypot(real, im[index]));
  const maxModulus = Math.max(...moduli);
  return { stable: maxModulus < 1, max_root_modulus: maxModulus, roots_moduli: moduli.map((value) => Number(value.toFixed(8))) };
}

/** Lütkepohl adjusted multivariate Portmanteau residual-autocorrelation test. */
export function portmanteauTest(resid: Matrix, varLags: number, h: number): { lags: number; statistic: number; degrees_of_freedom: number; p_value: number; status: "passed" | "failed" | "not_tested" } {
  const total = resid.length;
  const k = resid[0].length;
  const df = k * k * (h - varLags);
  if (df <= 0 || h <= varLags) {
    return { lags: h, statistic: Number.NaN, degrees_of_freedom: df, p_value: Number.NaN, status: "not_tested" };
  }
  const autoCov = (j: number): Matrix => {
    const c = zeros(k, k);
    for (let t = j; t < total; t += 1) {
      for (let r = 0; r < k; r += 1) {
        for (let cIdx = 0; cIdx < k; cIdx += 1) c[r][cIdx] += resid[t][r] * resid[t - j][cIdx];
      }
    }
    return c.map((row) => row.map((value) => value / total));
  };
  const c0 = autoCov(0);
  const c0Inv = inverse(c0);
  let q = 0;
  for (let j = 1; j <= h; j += 1) {
    const cj = autoCov(j);
    const term = matMul(matMul(transpose(cj), c0Inv), matMul(cj, c0Inv));
    q += trace(term) / (total - j);
  }
  q *= total * total;
  const pValue = 1 - chiSquareCdf(q, df);
  const status = Number.isFinite(q) && Number.isFinite(pValue) ? (pValue < 0.05 ? "failed" : "passed") : "not_tested";
  return { lags: h, statistic: q, degrees_of_freedom: df, p_value: pValue, status };
}

/** Orthogonalized reduced-form IRF via Cholesky: Ψ_s = Φ_s P with the MA
 * recursion Φ_s = Σ_i A_iᵀ Φ_{s−i} (column form y_t = c + Σ A_iᵀ y_{t−i}),
 * matching the statsmodels orth_ma_rep convention exactly. */
export function orthogonalizedIrf(coefficientMatrices: Matrix[], sigmaU: Matrix, horizon: number): Matrix[] {
  const p = coefficientMatrices.length;
  const k = coefficientMatrices[0].length;
  const chol = cholesky(sigmaU);
  const transposed = coefficientMatrices.map((matrix) => transpose(matrix));
  const phis: Matrix[] = [identity(k)];
  for (let s = 1; s <= horizon; s += 1) {
    let phi = zeros(k, k);
    for (let i = 1; i <= Math.min(s, p); i += 1) {
      const term = matMul(transposed[i - 1], phis[s - i]);
      phi = phi.map((row, rIdx) => row.map((value, cIdx) => value + term[rIdx][cIdx]));
    }
    phis.push(phi);
  }
  return phis.map((phi) => matMul(phi, chol));
}

const IRF_ORDERING_NOTE = "正交化简化式 IRF（Cholesky）：结果依赖变量排序，当前排序见「变量顺序」。简化式创新不等于已识别的经济冲击，本输出不是结构脉冲响应。";
const IRF_UNCERTAINTY_NOTE = "不确定性区间不可用：第一版不提供 bootstrap 置信区间，仅显示点响应路径。";

/**
 * Runs the full reduced-form VAR pipeline: transformation → contiguity and
 * sample gates → stationarity (ADF per transformed series) → lag selection
 * (common-sample ICs) → estimation → stability → residual diagnostics → IRF.
 * Every gate failure returns a structured blocked outcome instead of results.
 */
export function runReducedFormVar(
  specification: VarSpecification,
  seriesByIndicator: Map<string, HighFrequencyPoint[]>,
): VarRunOutcome {
  if (monthToIndex(specification.start_period) > monthToIndex(specification.end_period)) {
    return { status: "blocked", reason_code: "unsupported_specification", reasons: ["开始月份不能晚于结束月份。"] };
  }
  if (specification.deterministic_terms !== "constant") {
    return { status: "blocked", reason_code: "unsupported_specification", reasons: ["v1.4 只支持常数项确定性规格；线性趋势暂不可用。"] };
  }
  const k = specification.variables.length;
  if (k < 2 || k > 4) {
    return { status: "blocked", reason_code: "unsupported_specification", reasons: [`变量数量 ${k} 超出第一版支持范围（2–4 个变量）。`] };
  }
  // Registry enforcement: a registered indicator may only use its allowed
  // transformations (e.g. raw HICP / IPI index levels never enter a VAR).
  for (const variable of specification.variables) {
    const spec = transformationSpec(variable.indicator);
    if (spec && !spec.allowed_transformations.includes(variable.transformation)) {
      return { status: "blocked", reason_code: "unsupported_specification", reasons: [`${variable.indicator} 不允许使用 ${variable.transformation} 变换进入 VAR（允许：${spec.allowed_transformations.join(" / ")}）。`] };
    }
  }

  // 1. Transform with trace; build contiguous common axis.
  for (const variable of specification.variables) {
    const raw = (seriesByIndicator.get(variable.indicator) ?? []).filter((point) => point.country === specification.country);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const point of raw) {
      if (seen.has(point.period)) duplicates.add(point.period);
      seen.add(point.period);
    }
    if (duplicates.size) {
      return { status: "blocked", reason_code: "missing_data", reasons: [`${variable.indicator} 存在重复月份：${[...duplicates].sort().join("、")}。必须先完成去重核验，不能静默覆盖。`] };
    }
  }
  const transformed = specification.variables.map((variable) => {
    const raw = (seriesByIndicator.get(variable.indicator) ?? []).filter((point) => point.country === specification.country);
    return { ...variable, points: applyTransformation(raw, variable.transformation) };
  });
  const valueMaps = transformed.map((entry) => new Map(entry.points.map((point) => [point.period, point.value])));
  const present = (period: string) => valueMaps.every((map) => {
    const value = map.get(period);
    return value !== undefined && value !== null;
  });
  const axisStart = monthToIndex(specification.start_period);
  const axisEnd = monthToIndex(specification.end_period);
  const fullAxis: string[] = [];
  for (let index = axisStart; index <= axisEnd; index += 1) fullAxis.push(indexToMonth(index));
  const usable = fullAxis.filter(present);
  if (!usable.length) {
    return { status: "blocked", reason_code: "missing_data", reasons: ["所选变量组合在该国家没有共同可用的变换后序列。"] };
  }
  // Contiguity: the effective sample must be one unbroken monthly segment.
  const firstUsable = monthToIndex(usable[0]);
  const lastUsable = monthToIndex(usable[usable.length - 1]);
  const interiorGaps: string[] = [];
  for (let index = firstUsable; index <= lastUsable; index += 1) {
    const period = indexToMonth(index);
    if (!present(period)) interiorGaps.push(period);
  }
  if (interiorGaps.length) {
    return { status: "blocked", reason_code: "missing_data", reasons: [`有效样本内部存在缺失月份，不能把非相邻月份当作相邻月份估计：${interiorGaps.join("、")}`] };
  }
  const effectivePeriods = usable;
  const effective = effectivePeriods.length;

  if (effective < 60) {
    return { status: "blocked", reason_code: "insufficient_observations", reasons: [`有效月度观测 ${effective} 个，低于最低要求 60 个。`] };
  }

  // 2. Stationarity gate: every transformed series must pass ADF.
  const stationarity = transformed.map((entry, index) => {
    const series = effectivePeriods.map((period) => valueMaps[index].get(period) as number);
    return { indicator: entry.indicator, transformation: entry.transformation, adf: adfTest(series, { autolag: "aic" }) };
  });
  const stationarityFailures = stationarity.filter((entry) => entry.adf.status === "non_stationary" || entry.adf.status === "not_tested");
  if (stationarityFailures.length) {
    return {
      status: "blocked",
      reason_code: "non_stationary",
      reasons: stationarityFailures.map((entry) => entry.adf.status === "not_tested"
        ? `${entry.indicator}（${entry.transformation}）ADF 无法完成，未建立平稳性证据；当前规格不能进入正式 VAR。`
        : `${entry.indicator}（${entry.transformation}）ADF 不能拒绝单位根（stat=${entry.adf.statistic.toFixed(3)}，5% 临界值 ${entry.adf.critical_values["5%"].toFixed(3)}）；请更换 transformation。`),
      stationarity,
    };
  }

  // 3. Build estimation matrix.
  const data: Matrix = effectivePeriods.map((period) => valueMaps.map((map) => map.get(period) as number));

  try {
  return runEstimationPipeline(specification, data, effectivePeriods, fullAxis, transformed, valueMaps, stationarity, k);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("singular") || message.includes("positive definite")) {
      return { status: "blocked", reason_code: "singular", reasons: [`设计矩阵奇异或残差协方差非正定：变量可能完全共线（${message}）。`], stationarity };
    }
    throw error;
  }
}

/** Estimation pipeline after data admission (lag selection → estimate → gates → diagnostics → IRF). */
function runEstimationPipeline(
  specification: VarSpecification,
  data: Matrix,
  effectivePeriods: string[],
  fullAxis: string[],
  transformed: Array<{ indicator: string; transformation: TransformationId; points: ReturnType<typeof applyTransformation> }>,
  valueMaps: Array<Map<string, number | null>>,
  stationarity: Array<{ indicator: string; transformation: TransformationId; adf: AdfTestResult }>,
  k: number,
): VarRunOutcome {
  const effective = effectivePeriods.length;

  // 4. Lag selection with sample-capped max lag.
  const maxEstimable = Math.floor((effective - k - 1) / (1 + k));
  const defaultMaxLag = Math.round(12 * Math.pow(effective / 100, 0.25));
  const maxLag = Math.max(1, Math.min(specification.max_lag, maxEstimable, defaultMaxLag, 12));
  const candidates = selectLagOrder(data, maxLag);
  const criterion = specification.ic_criterion;
  const selected = candidates.reduce((best, candidate) => (candidate[criterion] < best[criterion] ? candidate : best), candidates[0]);

  // 5. Parameter-count gate on the selected specification.
  const finalEstimate = estimateVar(data, selected.lag);
  const paramsPerEquation = k * selected.lag + 1;
  const ratio = finalEstimate.nobs / paramsPerEquation;
  if (ratio < 4) {
    return { status: "blocked", reason_code: "insufficient_observations", reasons: [`参数数量门未通过：有效观测 ${finalEstimate.nobs}，每方程参数 ${paramsPerEquation}，比率 ${ratio.toFixed(1)} < 4（接近饱和的 VAR 不允许运行）。`] };
  }

  // 6. Stability.
  const stability = varStability(finalEstimate.coefficientMatrices);

  // 7. Residual diagnostics.
  const h = Math.max(selected.lag + 3, Math.min(24, Math.floor(finalEstimate.nobs / 3)));
  const portmanteau = portmanteauTest(finalEstimate.resid, selected.lag, h);

  // 8. IRF only when stable; residual failure gates the dynamic response.
  let irf: VarModelResult["irf"] = null;
  let irfBlockedReason: string | null = null;
  if (!stability.stable) {
    irfBlockedReason = `模型不稳定：伴随矩阵最大根模 ${stability.max_root_modulus.toFixed(4)} ≥ 1，当前规格不能用于动态响应分析。`;
  } else if (portmanteau.status === "failed") {
    irfBlockedReason = `残差自相关诊断未通过（Portmanteau p=${portmanteau.p_value.toFixed(4)}），动态响应输出被门控。`;
  } else {
    const horizons = [6, 12, 18, 24];
    const maxHorizon = Math.max(...horizons);
    const psi = orthogonalizedIrf(finalEstimate.coefficientMatrices, finalEstimate.sigma_u, maxHorizon);
    const paths: IrfPath[] = [];
    const fullHorizon = Array.from({ length: maxHorizon + 1 }, (_, index) => index);
    for (let shock = 0; shock < k; shock += 1) {
      for (let response = 0; response < k; response += 1) {
        paths.push({
          shock_variable: specification.variables[shock].indicator,
          response_variable: specification.variables[response].indicator,
          horizon: fullHorizon,
          response: fullHorizon.map((horizon) => Number(psi[horizon][response][shock].toFixed(6))),
        });
      }
    }
    irf = {
      method: "orthogonalized_reduced_form_cholesky",
      ordering: specification.variables.map((variable) => variable.indicator),
      ordering_dependency_note: IRF_ORDERING_NOTE,
      uncertainty_status: "unavailable",
      uncertainty_note: IRF_UNCERTAINTY_NOTE,
      horizons,
      paths,
    };
  }

  const traceIds = new Set<string>();
  for (const entry of transformed) {
    for (const point of entry.points) {
      if (effectivePeriods.includes(point.period)) {
        for (const id of point.source_observation_ids) traceIds.add(id);
      }
    }
  }

  const result: VarModelResult = {
    engine_version: VAR_ENGINE_VERSION,
    dataset_version: VAR_DATASET_VERSION,
    country: specification.country,
    variables: specification.variables,
    variable_order: specification.variables.map((variable) => variable.indicator),
    sample: {
      start_period: effectivePeriods[0],
      end_period: effectivePeriods[effectivePeriods.length - 1],
      effective_observations: effective,
      dropped_periods: fullAxis.filter((period) => !effectivePeriods.includes(period)),
    },
    deterministic_terms: "constant",
    stationarity,
    lag_selection: {
      criterion,
      max_lag: maxLag,
      candidates,
      selected_lag: selected.lag,
      selected_ic_value: selected[criterion],
    },
    selected_lag: selected.lag,
    coefficient_matrices: finalEstimate.coefficientMatrices,
    intercepts: finalEstimate.intercepts,
    trend_coefficients: null,
    residual_covariance: finalEstimate.sigma_u,
    diagnostics: {
      stability: { stable: stability.stable, max_root_modulus: Number(stability.max_root_modulus.toFixed(8)), roots_moduli: stability.roots_moduli },
      residual_autocorrelation: { test: "portmanteau_adjusted", ...portmanteau, statistic: Number(portmanteau.statistic.toFixed(6)), p_value: Number(portmanteau.p_value.toFixed(6)) },
    },
    parameter_gate: { effective_observations: finalEstimate.nobs, parameters_per_equation: paramsPerEquation, ratio: Number(ratio.toFixed(2)), passed: ratio >= 4 },
    irf,
    irf_blocked_reason: irfBlockedReason,
    input_series: transformed.map((entry) => ({
      indicator: entry.indicator,
      transformation: entry.transformation,
      points: entry.points.filter((point) => effectivePeriods.includes(point.period)),
    })),
    data_trace: [...traceIds].sort(),
  };
  return { status: "ok", result };
}
