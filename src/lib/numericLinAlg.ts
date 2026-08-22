// Numeric linear algebra and special functions for the macro-dynamics engines.
// Deterministic, dependency-free implementations validated offline against
// numpy/scipy/statsmodels reference cases (scripts/validation/generate-var-reference.py).

export type Matrix = number[][];

export function zeros(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

export function identity(n: number): Matrix {
  const out = zeros(n, n);
  for (let i = 0; i < n; i += 1) out[i][i] = 1;
  return out;
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const inner = b.length;
  const cols = b[0].length;
  const out = zeros(rows, cols);
  for (let i = 0; i < rows; i += 1) {
    for (let k = 0; k < inner; k += 1) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < cols; j += 1) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

export function transpose(a: Matrix): Matrix {
  const rows = a.length;
  const cols = a[0].length;
  const out = zeros(cols, rows);
  for (let i = 0; i < rows; i += 1) for (let j = 0; j < cols; j += 1) out[j][i] = a[i][j];
  return out;
}

export function trace(a: Matrix): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i][i];
  return sum;
}

/** Solve A x = B with partial-pivot Gaussian elimination. Throws on singularity. */
export function solve(aIn: Matrix, bIn: Matrix): Matrix {
  const n = aIn.length;
  const m = bIn[0].length;
  const a = aIn.map((row) => [...row]);
  const b = bIn.map((row) => [...row]);
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let pivotAbs = Math.abs(a[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const candidate = Math.abs(a[row][col]);
      if (candidate > pivotAbs) { pivotAbs = candidate; pivotRow = row; }
    }
    if (pivotAbs < 1e-14) throw new Error("singular matrix");
    if (pivotRow !== col) {
      [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }
    const pivot = a[col][col];
    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row][col] / pivot;
      if (factor === 0) continue;
      for (let k = col; k < n; k += 1) a[row][k] -= factor * a[col][k];
      for (let k = 0; k < m; k += 1) b[row][k] -= factor * b[col][k];
    }
  }
  const x = zeros(n, m);
  for (let col = n - 1; col >= 0; col -= 1) {
    for (let k = 0; k < m; k += 1) {
      let sum = b[col][k];
      for (let j = col + 1; j < n; j += 1) sum -= a[col][j] * x[j][k];
      x[col][k] = sum / a[col][col];
    }
  }
  return x;
}

export function inverse(a: Matrix): Matrix {
  return solve(a, identity(a.length));
}

/** Lower-triangular Cholesky factor L with A = L Lᵀ. Throws if not positive definite. */
export function cholesky(a: Matrix): Matrix {
  const n = a.length;
  const l = zeros(n, n);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = a[i][j];
      for (let k = 0; k < j; k += 1) sum -= l[i][k] * l[j][k];
      if (i === j) {
        if (sum <= 0) throw new Error("matrix is not positive definite");
        l[i][j] = Math.sqrt(sum);
      } else {
        l[i][j] = sum / l[j][j];
      }
    }
  }
  return l;
}

/** log(det(A)) for symmetric positive-definite A via its Cholesky factor. */
export function logDetSpd(a: Matrix): number {
  const l = cholesky(a);
  let sum = 0;
  for (let i = 0; i < l.length; i += 1) sum += Math.log(l[i][i]);
  return 2 * sum;
}

/**
 * Eigenvalues of a real square matrix: faithful transliteration of the classic
 * EISPACK / Numerical-Recipes trio balanc (radix-2 balancing) → elmhes
 * (elimination-form Hessenberg reduction) → hqr (Francis implicit double-shift
 * QR). The workspace is padded so indices 1..n match the canonical 1-based
 * listings exactly. Validated against numpy.linalg.eigvals offline.
 */
export function eigenvalues(aIn: Matrix): { re: number[]; im: number[] } {
  const n = aIn.length;
  if (n === 1) return { re: [aIn[0][0]], im: [0] };
  const a: Matrix = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) a[i][j] = aIn[i - 1][j - 1];
  const wr = new Array<number>(n + 1).fill(0);
  const wi = new Array<number>(n + 1).fill(0);

  // ---- balanc ----
  const RADIX = 2;
  const sqrdx = RADIX * RADIX;
  let last = 0;
  let balanceGuard = 0;
  while (last === 0 && balanceGuard < 500) {
    balanceGuard += 1;
    last = 1;
    for (let i = 1; i <= n; i += 1) {
      let r = 0;
      let c = 0;
      for (let j = 1; j <= n; j += 1) {
        if (j !== i) {
          c += Math.abs(a[j][i]);
          r += Math.abs(a[i][j]);
        }
      }
      if (c !== 0 && r !== 0) {
        let g = r / RADIX;
        let f = 1;
        const s = c + r;
        while (c < g) { f *= RADIX; c *= sqrdx; }
        g = r * RADIX;
        while (c > g) { f /= RADIX; c /= sqrdx; }
        if ((c + r) / f < 0.95 * s) {
          last = 0;
          g = 1 / f;
          for (let j = 1; j <= n; j += 1) a[i][j] *= g;
          for (let j = 1; j <= n; j += 1) a[j][i] *= f;
        }
      }
    }
  }

  // ---- elmhes ----
  for (let m = 2; m < n; m += 1) {
    let x = 0;
    let i = m;
    for (let j = m; j <= n; j += 1) {
      if (Math.abs(a[j][m - 1]) > Math.abs(x)) {
        x = a[j][m - 1];
        i = j;
      }
    }
    if (i !== m) {
      for (let j = m - 1; j <= n; j += 1) [a[i][j], a[m][j]] = [a[m][j], a[i][j]];
      for (let j = 1; j <= n; j += 1) [a[j][i], a[j][m]] = [a[j][m], a[j][i]];
    }
    if (x !== 0) {
      for (let ii = m + 1; ii <= n; ii += 1) {
        let y = a[ii][m - 1];
        if (y !== 0) {
          y /= x;
          a[ii][m - 1] = y;
          for (let j = m; j <= n; j += 1) a[ii][j] -= y * a[m][j];
          for (let j = 1; j <= n; j += 1) a[j][m] += y * a[j][ii];
        }
      }
    }
  }

  // ---- hqr ----
  let anorm = Math.abs(a[1][1]);
  for (let i = 2; i <= n; i += 1) {
    for (let j = i - 1; j <= n; j += 1) anorm += Math.abs(a[i][j]);
  }
  let nn = n;
  let t = 0;
  let sweepGuard = 0;
  const maxSweeps = 120 * n;
  while (nn >= 1) {
    let its = 0;
    let l = 1;
    do {
      sweepGuard += 1;
      if (sweepGuard > maxSweeps) throw new Error("eigenvalue iteration did not converge");
      for (l = nn; l >= 2; l -= 1) {
        let s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]);
        if (s === 0) s = anorm;
        if (Math.abs(a[l][l - 1]) + s === s) {
          a[l][l - 1] = 0;
          break;
        }
      }
      if (l < 2) l = 1;
      let x = a[nn][nn];
      if (l === nn) {
        wr[nn] = x + t;
        wi[nn] = 0;
        nn -= 1;
        continue;
      }
      const y0 = a[nn - 1][nn - 1];
      let w = a[nn][nn - 1] * a[nn - 1][nn];
      if (l === nn - 1) {
        const p = 0.5 * (y0 - x);
        const q = p * p + w;
        let z = Math.sqrt(Math.abs(q));
        x += t;
        if (q >= 0) {
          z = p + (p >= 0 ? z : -z);
          wr[nn - 1] = x + z;
          wr[nn] = wr[nn - 1];
          if (z !== 0) wr[nn] = x - w / z;
          wi[nn - 1] = 0;
          wi[nn] = 0;
        } else {
          wr[nn - 1] = x + p;
          wr[nn] = x + p;
          wi[nn] = z;
          wi[nn - 1] = -z;
        }
        nn -= 2;
        continue;
      }
      // No deflation yet: form the shift pair (x, y, w) and sweep.
      let y = y0;
      its += 1;
      if (its === 10 || its === 20 || its === 30) {
        // Exceptional shift to break rare cycling.
        t += x;
        for (let i = 1; i <= nn; i += 1) a[i][i] -= x;
        const s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]);
        y = 0.75 * s;
        x = 0.75 * s;
        w = -0.4375 * s * s;
      }
      let m = nn - 2;
      let p0 = 0;
      let q0 = 0;
      let r0 = 0;
      for (; m >= l; m -= 1) {
        const z = a[m][m];
        const r = x - z;
        const s = y - z;
        let p = (r * s - w) / a[m + 1][m] + a[m][m + 1];
        let q = a[m + 1][m + 1] - z - r - s;
        let rr = a[m + 2][m + 1];
        const sAbs = Math.abs(p) + Math.abs(q) + Math.abs(rr);
        p /= sAbs;
        q /= sAbs;
        rr /= sAbs;
        p0 = p;
        q0 = q;
        r0 = rr;
        if (m === l) break;
        const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(rr));
        const v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
        if (u + v === v) break;
      }
      if (m < l) m = l;
      for (let i = m + 2; i <= nn; i += 1) {
        a[i][i - 2] = 0;
        if (i !== m + 2) a[i][i - 3] = 0;
      }
      for (let k = m; k <= nn - 1; k += 1) {
        let p = p0;
        let q = q0;
        let r = r0;
        if (k !== m) {
          p = a[k][k - 1];
          q = a[k + 1][k - 1];
          r = k !== nn - 1 ? a[k + 2][k - 1] : 0;
          const xAbs = Math.abs(p) + Math.abs(q) + Math.abs(r);
          if (xAbs !== 0) {
            p /= xAbs;
            q /= xAbs;
            r /= xAbs;
            x = xAbs;
          }
        }
        const s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r);
        if (s !== 0) {
          if (k === m) {
            if (l !== m) a[k][k - 1] = -a[k][k - 1];
          } else {
            a[k][k - 1] = -s * x;
          }
          p += s;
          const xN = p / s;
          const yN = q / s;
          const zN = r / s;
          const qN = q / p;
          const rN = r / p;
          for (let j = k; j <= nn; j += 1) {
            let pj = a[k][j] + qN * a[k + 1][j];
            if (k !== nn - 1) {
              pj += rN * a[k + 2][j];
              a[k + 2][j] -= pj * zN;
            }
            a[k + 1][j] -= pj * yN;
            a[k][j] -= pj * xN;
          }
          const mmin = nn < k + 3 ? nn : k + 3;
          for (let i = l; i <= mmin; i += 1) {
            let pi = xN * a[i][k] + yN * a[i][k + 1];
            if (k !== nn - 1) {
              pi += zN * a[i][k + 2];
              a[i][k + 2] -= pi * rN;
            }
            a[i][k + 1] -= pi * qN;
            a[i][k] -= pi;
          }
        }
      }
    } while (l < nn - 1);
  }
  return { re: wr.slice(1), im: wi.slice(1) };
}

// ---- Special functions ----

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const shifted = z - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i += 1) x += LANCZOS[i] / (shifted + i);
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularized lower incomplete gamma P(a, x): series + continued fraction. */
export function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return Number.NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n < 1000; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  const q = h * Math.exp(-x + a * Math.log(x) - logGamma(a));
  return 1 - q;
}

export function chiSquareCdf(x: number, degreesOfFreedom: number): number {
  return regularizedGammaP(degreesOfFreedom / 2, x / 2);
}

/** Standard normal CDF via the gamma relation Φ(x) = 0.5 (1 + sign(x) P(1/2, x²/2)). */
export function normalCdf(x: number): number {
  if (x === 0) return 0.5;
  const p = regularizedGammaP(0.5, (x * x) / 2);
  return x > 0 ? 0.5 * (1 + p) : 0.5 * (1 - p);
}
