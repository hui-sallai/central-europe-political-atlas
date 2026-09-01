/* lp-engine-v1.7
 * Lag-augmented single-country LP with joint MP/CBI regressors.
 * Method translation follows jm4474/Lag-augmented_LocalProjections at
 * 02e8e65396f2c06d2c87879bbc5c2162863b907f (MIT), especially lp.m/linreg.m.
 */

export const LP_ENGINE_VERSION = "lp-engine-v1.7";
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

export function olsHc1(y, x) {
  const xt = transpose(x); const inv = inverse(multiply(xt, x));
  const beta = multiply(multiply(inv, xt), y.map((v) => [v])).map((r) => r[0]);
  const residuals = y.map((v, i) => v - x[i].reduce((s, z, j) => s + z * beta[j], 0));
  const meat = Array.from({ length: x[0].length }, (_, i) => Array.from({ length: x[0].length }, (_, j) => x.reduce((s, row, t) => s + residuals[t] ** 2 * row[i] * row[j], 0)));
  const n = y.length; const k = x[0].length;
  const covariance = multiply(multiply(inv, meat), inv).map((row) => row.map((v) => v * n / (n - k)));
  return { beta, covariance, residuals, n, k, residualDf: n - k, rss: residuals.reduce((s, v) => s + v * v, 0) };
}

function baseControls(rows, index, p, monthDummies) {
  const out = [rows[index].mp, rows[index].cbi];
  for (let lag = 1; lag <= p; lag += 1) out.push(rows[index - lag].outcome, rows[index - lag].mp, rows[index - lag].cbi);
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

export function estimateJointLocalProjection(rows, { horizon, lagOrder, monthDummies = false, normalization = 0.25 }) {
  const indices = rows.commonIndices;
  const y = indices.map((i) => rows.values[i].responses[horizon]);
  const x = indices.map((i) => baseControls(rows.values, i, lagOrder, monthDummies));
  const fit = olsHc1(y, x);
  const seMp = Math.sqrt(Math.max(0, fit.covariance[0][0])); const seCbi = Math.sqrt(Math.max(0, fit.covariance[1][1]));
  const result = { beta_mp_raw: fit.beta[0], beta_cbi_raw: fit.beta[1], standard_error_mp: seMp, standard_error_cbi: seCbi };
  return {
    horizon, ...result, mp_response_25bp: fit.beta[0] * normalization, cbi_response_25bp: fit.beta[1] * normalization, cbi_response_normalized_025: fit.beta[1] * normalization,
    ci90_mp: [(fit.beta[0] - Z90 * seMp) * normalization, (fit.beta[0] + Z90 * seMp) * normalization],
    ci95_mp: [(fit.beta[0] - Z95 * seMp) * normalization, (fit.beta[0] + Z95 * seMp) * normalization],
    ci90_cbi: [(fit.beta[1] - Z90 * seCbi) * normalization, (fit.beta[1] + Z90 * seCbi) * normalization],
    ci95_cbi: [(fit.beta[1] - Z95 * seCbi) * normalization, (fit.beta[1] + Z95 * seCbi) * normalization],
    effective_n: fit.n, sample_start: rows.values[indices[0]].period, sample_end: rows.values[indices.at(-1)].period, parameter_count: fit.k, residual_df: fit.residualDf, lag_order: lagOrder, lag_augmented_order: lagOrder + 1,
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
