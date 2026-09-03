/* lp-engine-v1.71
 * Lag-augmented single-country LP with joint MP/CBI regressors.
 * Method translation follows jm4474/Lag-augmented_LocalProjections at
 * 02e8e65396f2c06d2c87879bbc5c2162863b907f (MIT), especially lp.m/linreg.m.
 */

export const LP_ENGINE_VERSION = "lp-engine-v1.71";
const Z90 = 1.6448536269514722;
const Z95 = 1.959963984540054;

function transpose(a) { return a[0].map((_, j) => a.map((row) => row[j])); }
function multiply(a, b) { const bt = transpose(b); return a.map((row) => bt.map((col) => row.reduce((s, v, i) => s + v * col[i], 0))); }
function inverse(a) {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => Number(i === j))]);
  for (let c = 0; c < n; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    if (Math.abs(m[pivot][c]) < 1e-12) throw new Error("singular_design_matrix");
    [m[c], m[pivot]] = [m[pivot], m[c]];
    const scale = m[c][c]; m[c] = m[c].map((v) => v / scale);
    for (let r = 0; r < n; r += 1) if (r !== c) { const f = m[r][c]; m[r] = m[r].map((v, j) => v - f * m[c][j]); }
  }
  return m.map((row) => row.slice(n));
}

function identity(n) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Number(i === j))); }

function symmetricEigen(matrix, tolerance = 1e-12, maximumIterations = 100000) {
  const a = matrix.map((row) => [...row]);
  const vectors = identity(a.length);
  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    let p = 0; let q = 1; let largest = 0;
    for (let i = 0; i < a.length; i += 1) for (let j = i + 1; j < a.length; j += 1) {
      if (Math.abs(a[i][j]) > largest) { largest = Math.abs(a[i][j]); p = i; q = j; }
    }
    if (largest < tolerance) break;
    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(angle); const s = Math.sin(angle);
    for (let k = 0; k < a.length; k += 1) {
      if (k === p || k === q) continue;
      const akp = a[k][p]; const akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }
    const app = a[p][p]; const aqq = a[q][q]; const apq = a[p][q];
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = a[q][p] = 0;
    for (let k = 0; k < vectors.length; k += 1) {
      const vkp = vectors[k][p]; const vkq = vectors[k][q];
      vectors[k][p] = c * vkp - s * vkq;
      vectors[k][q] = s * vkp + c * vkq;
    }
  }
  return { values: a.map((row, i) => row[i]), vectors };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function normalGenerator(seed) {
  const uniform = mulberry32(seed); let spare = null;
  return () => {
    if (spare !== null) { const value = spare; spare = null; return value; }
    let u = 0; let v = 0; while (u === 0) u = uniform(); while (v === 0) v = uniform();
    const radius = Math.sqrt(-2 * Math.log(u)); const angle = 2 * Math.PI * v;
    spare = radius * Math.sin(angle); return radius * Math.cos(angle);
  };
}

function quantile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(probability * sorted.length) - 1))];
}

export function olsHc1(y, x) {
  const xt = transpose(x); const inv = inverse(multiply(xt, x));
  const beta = multiply(multiply(inv, xt), y.map((v) => [v])).map((r) => r[0]);
  const residuals = y.map((v, i) => v - x[i].reduce((s, z, j) => s + z * beta[j], 0));
  const meat = Array.from({ length: x[0].length }, (_, i) => Array.from({ length: x[0].length }, (_, j) => x.reduce((s, row, t) => s + residuals[t] ** 2 * row[i] * row[j], 0)));
  const n = y.length; const k = x[0].length;
  const covariance = multiply(multiply(inv, meat), inv).map((row) => row.map((v) => v * n / (n - k)));
  const leverage = x.map((row) => row.reduce((sum, value, i) => sum + value * inv[i].reduce((inner, weight, j) => inner + weight * row[j], 0), 0));
  const mse = residuals.reduce((sum, value) => sum + value * value, 0) / (n - k);
  const standardizedResiduals = residuals.map((value, i) => value / Math.sqrt(Math.max(Number.EPSILON, mse * (1 - leverage[i]))));
  const dfbetas = x.map((row, observation) => {
    const delta = inv.map((weights) => weights.reduce((sum, weight, j) => sum + weight * row[j], 0) * residuals[observation] / Math.max(Number.EPSILON, 1 - leverage[observation]));
    return delta.map((value, coefficient) => value / Math.sqrt(Math.max(Number.EPSILON, covariance[coefficient][coefficient])));
  });
  return { beta, covariance, residuals, n, k, residualDf: n - k, rss: residuals.reduce((s, v) => s + v * v, 0), xtxInverse: inv, leverage, standardizedResiduals, dfbetas };
}

export function baseControls(rows, index, p, monthDummies, additionalLaggedControls = []) {
  const out = [rows[index].mp, rows[index].cbi];
  for (let lag = 1; lag <= p; lag += 1) out.push(rows[index - lag].outcome, rows[index - lag].mp, rows[index - lag].cbi);
  for (const control of additionalLaggedControls) for (let lag = 1; lag <= control.lagCount; lag += 1) out.push(rows[index - lag][control.field]);
  if (monthDummies) { const month = Number(rows[index].period.slice(5, 7)); for (let m = 2; m <= 12; m += 1) out.push(Number(month === m)); }
  out.push(1);
  return out;
}

export function selectLagAic(rows, { maxLag = 6, monthDummies = false } = {}) {
  const start = maxLag; const usable = [];
  for (let i = start; i < rows.length; i += 1) if ([rows[i].outcome, ...Array.from({ length: maxLag }, (_, lag) => rows[i - lag - 1].outcome)].every(Number.isFinite)) usable.push(i);
  const candidates = [];
  for (let p = 1; p <= maxLag; p += 1) {
    const y = usable.map((i) => rows[i].outcome);
    const x = usable.map((i) => { const values = []; for (let lag = 1; lag <= p; lag += 1) values.push(rows[i - lag].outcome, rows[i - lag].mp, rows[i - lag].cbi); if (monthDummies) { const month = Number(rows[i].period.slice(5, 7)); for (let m = 2; m <= 12; m += 1) values.push(Number(month === m)); } values.push(1); return values; });
    const fit = olsHc1(y, x); const aic = fit.n * Math.log(fit.rss / fit.n) + 2 * fit.k;
    candidates.push({ lag_order: p, aic, common_sample_n: fit.n, parameter_count: fit.k });
  }
  return { selectedLag: candidates.toSorted((a, b) => a.aic - b.aic)[0].lag_order, candidates, commonSampleStartIndex: start };
}

export function estimateJointLocalProjection(rows, { horizon, lagOrder, monthDummies = false, normalization = 0.25, additionalLaggedControls = [] }) {
  const indices = rows.commonIndices;
  const y = indices.map((i) => rows.values[i].responses[horizon]);
  const x = indices.map((i) => baseControls(rows.values, i, lagOrder, monthDummies, additionalLaggedControls));
  const fit = olsHc1(y, x);
  const seMp = Math.sqrt(Math.max(0, fit.covariance[0][0])); const seCbi = Math.sqrt(Math.max(0, fit.covariance[1][1]));
  const result = { beta_mp_raw: fit.beta[0], beta_cbi_raw: fit.beta[1], standard_error_mp: seMp, standard_error_cbi: seCbi };
  return {
    horizon, ...result, mp_response_25bp: fit.beta[0] * normalization, cbi_response_25bp: fit.beta[1] * normalization, cbi_response_normalized_025: fit.beta[1] * normalization,
    ci90_mp: [(fit.beta[0] - Z90 * seMp) * normalization, (fit.beta[0] + Z90 * seMp) * normalization],
    ci95_mp: [(fit.beta[0] - Z95 * seMp) * normalization, (fit.beta[0] + Z95 * seMp) * normalization],
    ci90_cbi: [(fit.beta[1] - Z90 * seCbi) * normalization, (fit.beta[1] + Z90 * seCbi) * normalization],
    ci95_cbi: [(fit.beta[1] - Z95 * seCbi) * normalization, (fit.beta[1] + Z95 * seCbi) * normalization],
    effective_n: fit.n, sample_start: rows.values[indices[0]].period, sample_end: rows.values[indices.at(-1)].period, parameter_count: fit.k, residual_df: fit.residualDf,
    selected_base_lag_order: lagOrder, lp_lag_count: lagOrder, augmentation_relative_to_nonaugmented_lp: 1,
  };
}

export function estimateLocalProjectionPath(rows, { maximumHorizon, lagOrder, monthDummies = false, normalization = 0.25, additionalLaggedControls = [], drawCount = 5000, seed = 1710 }) {
  const indices = rows.commonIndices;
  const x = indices.map((i) => baseControls(rows.values, i, lagOrder, monthDummies, additionalLaggedControls));
  const fits = Array.from({ length: maximumHorizon + 1 }, (_, horizon) => {
    const y = indices.map((i) => rows.values[i].responses[horizon]);
    return olsHc1(y, x);
  });
  const n = x.length; const k = x[0].length; const hc1 = n / (n - k); const inv = fits[0].xtxInverse;
  function coefficientCovariance(coefficient) {
    return fits.map((fitH) => fits.map((fitJ) => {
      const meat = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => x.reduce((sum, row, t) => sum + fitH.residuals[t] * fitJ.residuals[t] * row[a] * row[b], 0)));
      return multiply(multiply(inv, meat), inv)[coefficient][coefficient] * hc1;
    }));
  }
  function simultaneous(coefficient, componentSeed) {
    const covariance = coefficientCovariance(coefficient);
    const standardErrors = covariance.map((row, i) => Math.sqrt(Math.max(0, row[i])));
    const correlation = covariance.map((row, i) => row.map((value, j) => value / Math.max(Number.EPSILON, standardErrors[i] * standardErrors[j])));
    const eig = symmetricEigen(correlation);
    const normal = normalGenerator(componentSeed); const maxima = [];
    for (let draw = 0; draw < drawCount; draw += 1) {
      const independent = eig.values.map(() => normal());
      const correlated = eig.vectors.map((row) => row.reduce((sum, value, index) => sum + value * Math.sqrt(Math.max(0, eig.values[index])) * independent[index], 0));
      maxima.push(Math.max(...correlated.map(Math.abs)));
    }
    return { covariance, standardErrors, criticalValue95: quantile(maxima, 0.95), drawCount, seed: componentSeed, minimumCorrelationEigenvalue: Math.min(...eig.values) };
  }
  const mpJoint = simultaneous(0, seed); const cbiJoint = simultaneous(1, seed + 1);
  const horizons = fits.map((fit, horizon) => {
    const base = estimateJointLocalProjection(rows, { horizon, lagOrder, monthDummies, normalization, additionalLaggedControls });
    return {
      ...base,
      simultaneous_ci95_mp: [(fit.beta[0] - mpJoint.criticalValue95 * mpJoint.standardErrors[horizon]) * normalization, (fit.beta[0] + mpJoint.criticalValue95 * mpJoint.standardErrors[horizon]) * normalization],
      simultaneous_ci95_cbi: [(fit.beta[1] - cbiJoint.criticalValue95 * cbiJoint.standardErrors[horizon]) * normalization, (fit.beta[1] + cbiJoint.criticalValue95 * cbiJoint.standardErrors[horizon]) * normalization],
    };
  });
  const gram = multiply(transpose(x), x); const scale = gram.map((row, i) => Math.sqrt(Math.max(Number.EPSILON, row[i])));
  const scaledGram = gram.map((row, i) => row.map((value, j) => value / (scale[i] * scale[j])));
  const gramEigen = symmetricEigen(scaledGram).values;
  const minimumEigenvalue = Math.min(...gramEigen); const maximumEigenvalue = Math.max(...gramEigen);
  return {
    horizons, fits, joint: { mp: mpJoint, cbi: cbiJoint },
    design: { condition_number: Math.sqrt(maximumEigenvalue / Math.max(Number.EPSILON, minimumEigenvalue)), minimum_scaled_gram_eigenvalue: minimumEigenvalue, parameter_count: k, residual_df: n - k, numerically_singular: minimumEigenvalue < 1e-12 },
  };
}

export function buildCommonHorizonRows(calendarRows, { horizon, lagOrder, transform }) {
  const values = calendarRows.map((row) => ({ ...row, responses: {} })); const indices = [];
  for (let i = lagOrder; i + horizon < values.length; i += 1) {
    if (!Number.isFinite(values[i - 1].outcome) || !Number.isFinite(values[i].mp) || !Number.isFinite(values[i].cbi)) continue;
    let complete = true;
    for (let lag = 1; lag <= lagOrder; lag += 1) if (![values[i - lag].outcome, values[i - lag].mp, values[i - lag].cbi].every(Number.isFinite)) complete = false;
    for (let h = 0; h <= horizon; h += 1) if (!Number.isFinite(values[i + h].outcome)) complete = false;
    if (!complete) continue;
    for (let h = 0; h <= horizon; h += 1) values[i].responses[h] = transform(values[i + h].outcome, values[i - 1].outcome);
    indices.push(i);
  }
  return { values, commonIndices: indices };
}
