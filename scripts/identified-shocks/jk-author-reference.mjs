/*
 * BSD-3-Clause methodology translation of Marek Jarocinski's MATLAB files
 * mypc.m, signrestr_median.m and d2m2q.m from:
 * https://github.com/marekjarocinski/jkshocks_update_ecb
 * pinned at f7ffc821b0ade71dd38539e4044e25368dfb4dc1.
 * Original authors: Marek Jarocinski and Peter Karadi. See NOTICE.md.
 */

export const AUTHOR_COMMIT = "f7ffc821b0ade71dd38539e4044e25368dfb4dc1";
export const JOINT_EVENT_EXCLUSIONS = ["2001-09-13", "2001-09-17", "2008-10-08"];
export const OIS_FIELDS = ["OIS_1M", "OIS_3M", "OIS_6M", "OIS_1Y"];

export function round8(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(8));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function sampleStd(values) {
  const finite = values.filter(Number.isFinite);
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  return Math.sqrt(finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (finite.length - 1));
}

function symmetricEigenJacobi(matrix) {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const vectors = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => Number(i === j)));
  for (let iteration = 0; iteration < 200; iteration += 1) {
    let p = 0;
    let q = 1;
    let largest = Math.abs(a[p][q]);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        if (Math.abs(a[i][j]) > largest) {
          largest = Math.abs(a[i][j]);
          p = i;
          q = j;
        }
      }
    }
    if (largest < 1e-15) break;
    const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const app = c * c * a[p][p] - 2 * s * c * a[p][q] + s * s * a[q][q];
    const aqq = s * s * a[p][p] + 2 * s * c * a[p][q] + c * c * a[q][q];
    for (let k = 0; k < n; k += 1) {
      if (k === p || k === q) continue;
      const akp = a[k][p];
      const akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }
    a[p][p] = app;
    a[q][q] = aqq;
    a[p][q] = a[q][p] = 0;
    for (let k = 0; k < n; k += 1) {
      const vkp = vectors[k][p];
      const vkq = vectors[k][q];
      vectors[k][p] = c * vkp - s * vkq;
      vectors[k][q] = s * vkp + c * vkq;
    }
  }
  return Array.from({ length: n }, (_, index) => ({
    value: a[index][index],
    vector: vectors.map((row) => row[index]),
  })).sort((left, right) => right.value - left.value);
}

export function authorPc1(rows) {
  const allMissing = rows.map((row) => OIS_FIELDS.every((field) => !Number.isFinite(row[field])));
  const filled = rows.map((row) => OIS_FIELDS.map((field) => Number.isFinite(row[field]) ? row[field] : 0));
  const standardDeviations = OIS_FIELDS.map((_, column) => sampleStd(filled.map((row) => row[column])));
  const standardized = filled.map((row) => row.map((value, column) => value / standardDeviations[column]));
  const crossProduct = Array.from({ length: OIS_FIELDS.length }, (_, i) => Array.from({ length: OIS_FIELDS.length }, (__, j) =>
    standardized.reduce((sum, row) => sum + row[i] * row[j], 0)));
  let loading = symmetricEigenJacobi(crossProduct)[0].vector;
  const largestIndex = loading.reduce((best, value, index) => Math.abs(value) > Math.abs(loading[best]) ? index : best, 0);
  if (loading[largestIndex] < 0) loading = loading.map((value) => -value);
  const score = standardized.map((row, index) => allMissing[index] ? null : row.reduce((sum, value, column) => sum + value * loading[column], 0));
  const scale = sampleStd(rows.map((row) => row.OIS_1Y)) / sampleStd(score) / 100;
  return {
    values: score.map((value) => Number.isFinite(value) ? value * scale : null),
    loading,
    inputStandardDeviations: standardDeviations,
    allMissingRows: allMissing.filter(Boolean).length,
    centering: false,
    signConvention: `largest absolute loading (${OIS_FIELDS[largestIndex]}) is positive`,
  };
}

export function poorMan(pc1, stock) {
  if (!Number.isFinite(pc1) || !Number.isFinite(stock)) return [null, null];
  return pc1 * stock < 0 ? [pc1, 0] : [0, pc1];
}

export function medianRotation(rows, weight = 0.5) {
  const included = rows.map((row, index) => ({ ...row, index })).filter((row) => Number.isFinite(row.pc1) && Number.isFinite(row.STOXX50));
  const first = included.map((row) => row.pc1);
  const second = included.map((row) => row.STOXX50);
  const r11 = Math.hypot(...first);
  const q1 = first.map((value) => value / r11);
  const r12 = q1.reduce((sum, value, index) => sum + value * second[index], 0);
  const residual = second.map((value, index) => value - q1[index] * r12);
  const r22 = Math.hypot(...residual);
  const q2 = residual.map((value) => value / r22);
  const angle = r12 > 0
    ? (1 - weight) * Math.atan(r12 / r22) + weight * Math.PI / 2
    : weight * Math.atan(-r22 / r12);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const d1 = r11 * cosine;
  const d2 = r11 * sine;
  const output = rows.map(() => [null, null]);
  included.forEach((row, index) => {
    output[row.index] = [
      (q1[index] * cosine - q2[index] * sine) * d1,
      (q1[index] * sine + q2[index] * cosine) * d2,
    ];
  });
  return { values: output, angle, weight, R: [[r11, r12], [0, r22]], missingRows: rows.length - included.length };
}

function nextMonth(year, month) {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

export function aggregateMonthly(rows) {
  const [startYear, startMonth] = rows[0].date.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = rows.at(-1).date.slice(0, 7).split("-").map(Number);
  const grouped = new Map();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const current = grouped.get(key) ?? { pc1_hf: 0, STOXX50_hf: 0, MP_pm: 0, CBI_pm: 0, MP_median: 0, CBI_median: 0 };
    for (const field of Object.keys(current)) {
      const source = field === "pc1_hf" ? "pc1" : field === "STOXX50_hf" ? "STOXX50" : field;
      current[field] += row[source];
    }
    grouped.set(key, current);
  }
  const result = [];
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); [year, month] = nextMonth(year, month)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const values = grouped.get(key) ?? { pc1_hf: 0, STOXX50_hf: 0, MP_pm: 0, CBI_pm: 0, MP_median: 0, CBI_median: 0 };
    result.push({ year, month, ...Object.fromEntries(Object.entries(values).map(([field, value]) => [field, round8(value)])) });
  }
  return result;
}
