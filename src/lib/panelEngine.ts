import { PLATFORM_VERSION } from "@/lib/releaseMetadata";
import type { PanelAnalysisOutput, PanelCoefficient, PanelRuntimeObservation, PanelSpecification } from "@/types/PanelAnalysis";

type Matrix = number[][];

function transpose(matrix: Matrix): Matrix {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiply(left: Matrix, right: Matrix): Matrix {
  return left.map((row) => right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
}

function inverse(matrix: Matrix): Matrix {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, ...Array.from({ length: size }, (_, column) => index === column ? 1 : 0)]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-10) throw new Error("设计矩阵奇异；请减少高度相关变量或固定效应。 ");
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(size));
}

function vector(matrix: Matrix) {
  return matrix.map((row) => row[0]);
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function covarianceRobust(x: Matrix, residuals: number[], xtxInverse: Matrix) {
  const meat = Array.from({ length: x[0].length }, () => Array(x[0].length).fill(0));
  x.forEach((row, index) => row.forEach((left, i) => row.forEach((right, j) => { meat[i][j] += residuals[index] ** 2 * left * right; })));
  const scale = x.length / (x.length - x[0].length);
  return multiply(multiply(xtxInverse, meat), xtxInverse).map((row) => row.map((value) => value * scale));
}

function covarianceClustered(x: Matrix, residuals: number[], xtxInverse: Matrix, clusters: string[]) {
  const groups = [...new Set(clusters)];
  if (groups.length < 8) throw new Error("按国家聚类标准误至少需要 8 个国家。 ");
  const meat = Array.from({ length: x[0].length }, () => Array(x[0].length).fill(0));
  for (const group of groups) {
    const score = Array(x[0].length).fill(0);
    x.forEach((row, index) => { if (clusters[index] === group) row.forEach((value, column) => { score[column] += value * residuals[index]; }); });
    score.forEach((left, i) => score.forEach((right, j) => { meat[i][j] += left * right; }));
  }
  const scale = (groups.length / (groups.length - 1)) * ((x.length - 1) / (x.length - x[0].length));
  return multiply(multiply(xtxInverse, meat), xtxInverse).map((row) => row.map((value) => value * scale));
}

function fit(x: Matrix, y: number[], clusters: string[], standardErrors: PanelSpecification["standard_errors"]) {
  const xt = transpose(x);
  const xtxInverse = inverse(multiply(xt, x));
  const beta = vector(multiply(multiply(xtxInverse, xt), y.map((value) => [value])));
  const fitted = x.map((row) => row.reduce((sum, value, index) => sum + value * beta[index], 0));
  const residuals = y.map((value, index) => value - fitted[index]);
  const covariance = standardErrors === "cluster_country"
    ? covarianceClustered(x, residuals, xtxInverse, clusters)
    : covarianceRobust(x, residuals, xtxInverse);
  return { beta, fitted, residuals, covariance };
}

function correlation(left: number[], right: number[]) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0) * right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

export function runPanelEconometrics(observations: PanelRuntimeObservation[], specification: PanelSpecification): PanelAnalysisOutput {
  if (!specification.explanatory_variables.length) throw new Error("至少选择一个解释变量。 ");
  if (specification.explanatory_variables.includes(specification.outcome)) throw new Error("结果变量不能同时作为解释变量。 ");
  const eligible = observations.filter((item) => specification.countries.includes(item.country)
    && item.year >= specification.start_year && item.year <= specification.end_year
    && item.value !== null && item.comparability_status === "comparable"
    && ["official", "verified"].includes(item.data_status));
  const lookup = new Map(eligible.map((item) => [`${item.country}:${item.year}:${item.indicator}`, item]));
  const rows = [] as Array<{ country: string; year: number; y: number; predictors: number[]; trace: string[] }>;
  for (const country of specification.countries) for (let year = specification.start_year; year <= specification.end_year; year += 1) {
    const outcome = lookup.get(`${country}:${year}:${specification.outcome}`);
    const predictors = specification.explanatory_variables.map((indicator) => lookup.get(`${country}:${year}:${indicator}`));
    if (outcome?.value === null || outcome?.value === undefined || predictors.some((item) => item?.value === null || item?.value === undefined)) continue;
    rows.push({ country, year, y: outcome.value, predictors: predictors.map((item) => item!.value!), trace: [outcome.observation_id, ...predictors.map((item) => item!.observation_id)] });
  }
  const countries = [...new Set(rows.map((row) => row.country))].sort();
  const years = [...new Set(rows.map((row) => row.year))].sort();
  if (rows.length <= specification.explanatory_variables.length + countries.length + years.length) throw new Error("完整样本不足以估计所选规格。 ");
  if (countries.length < 8 || years.length < 8) throw new Error("面板准入要求至少 8 个国家和 8 个年份。 ");
  const countryDummies = specification.fixed_effects === "none" ? [] : countries.slice(1);
  const yearDummies = specification.fixed_effects === "country_year" ? years.slice(1) : [];
  const x = rows.map((row) => [1, ...row.predictors, ...countryDummies.map((country) => row.country === country ? 1 : 0), ...yearDummies.map((year) => row.year === year ? 1 : 0)]);
  const y = rows.map((row) => row.y);
  const estimated = fit(x, y, rows.map((row) => row.country), specification.standard_errors);
  const mean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const totalSumSquares = y.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const residualSumSquares = estimated.residuals.reduce((sum, value) => sum + value ** 2, 0);
  let withinR2 = 1 - residualSumSquares / totalSumSquares;
  if (specification.fixed_effects !== "none") {
    const reducedX = rows.map((row) => [1, ...countryDummies.map((country) => row.country === country ? 1 : 0), ...yearDummies.map((year) => row.year === year ? 1 : 0)]);
    const reduced = fit(reducedX, y, rows.map((row) => row.country), "robust");
    const withinTotal = reduced.residuals.reduce((sum, value) => sum + value ** 2, 0);
    withinR2 = withinTotal ? 1 - residualSumSquares / withinTotal : 0;
  }
  const coefficients: PanelCoefficient[] = specification.explanatory_variables.map((variable, index) => {
    const position = index + 1;
    const coefficient = estimated.beta[position];
    const standardError = Math.sqrt(Math.max(0, estimated.covariance[position][position]));
    const tStat = standardError ? coefficient / standardError : 0;
    return { variable, coefficient, standard_error: standardError, t_stat: tStat, p_value: 2 * (1 - normalCdf(Math.abs(tStat))), ci_95_low: coefficient - 1.96 * standardError, ci_95_high: coefficient + 1.96 * standardError };
  });
  let multicollinearityWarning: string | null = null;
  for (let i = 0; i < specification.explanatory_variables.length; i += 1) for (let j = i + 1; j < specification.explanatory_variables.length; j += 1) {
    if (Math.abs(correlation(rows.map((row) => row.predictors[i]), rows.map((row) => row.predictors[j]))) >= 0.9) multicollinearityWarning = "至少一对解释变量的绝对相关系数达到 0.90；系数可能不稳定。";
  }
  const expectedRows = specification.countries.length * (specification.end_year - specification.start_year + 1);
  return {
    model: specification.fixed_effects === "none" ? "pooled_ols" : specification.fixed_effects === "country" ? "country_fixed_effects" : "country_and_year_fixed_effects",
    specification,
    coefficients,
    diagnostics: { observations: rows.length, countries: countries.length, years: years.length, r_squared: 1 - residualSumSquares / totalSumSquares, within_r_squared: withinR2, missing_rows: expectedRows - rows.length, standard_error_method: specification.standard_errors, multicollinearity_warning: multicollinearityWarning, sample_coverage: rows.length / expectedRows, year_coverage: `${years[0]}–${years.at(-1)}` },
    data_trace: [...new Set(rows.flatMap((row) => row.trace))],
    calculation_date: new Date().toISOString().slice(0, 10),
    platform_version: PLATFORM_VERSION,
    interpretation_boundary: "面板系数描述在所选样本和规格下的条件关联，不等于因果效应；固定效应本身不构成因果识别。",
  };
}
