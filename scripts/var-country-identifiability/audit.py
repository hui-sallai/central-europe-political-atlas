#!/usr/bin/env python3
"""v1.88 Phase A, Python stage: independent recomputation, production-agreement checks and preregistered metrics.
Usage: audit.py <production_extract.json>   (writes src/data/macro/var_country_lag_identifiability_results.json)"""
import hashlib
import json
import sys
from math import log
from pathlib import Path

import numpy as np
from scipy.optimize import brentq
from scipy.stats import chi2, ncx2

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
sys.path.insert(0, str(ROOT / "scripts" / "var-residual-diagnostics"))
from common import pt_adjusted  # noqa: E402  (frozen v1.85, reference-validated)

TOL = 1e-8
K = 3


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def design_matrix(data, periods, lag, det):
    rows = len(data) - lag
    parts = [np.ones((rows, 1))]
    if det == "constant_month_dummies":
        month = np.array([int(p[5:7]) for p in periods[lag:]])
        parts.append(np.column_stack([(month == m).astype(float) for m in range(2, 13)]))  # January omitted, as production
    parts += [data[lag - i: len(data) - i] for i in range(1, lag + 1)]
    return np.column_stack(parts), data[lag:]


def ols(data, periods, lag, det):
    z, y = design_matrix(data, periods, lag, det)
    b = np.linalg.solve(z.T @ z, z.T @ y)
    resid = y - z @ b
    return z, y, b, resid


def logdet_mle(resid):
    return float(np.linalg.slogdet(resid.T @ resid / len(resid))[1])


def eli_interval(lr, df, n, level=0.90):
    alpha = (1 - level) / 2
    scale = df * log(n)
    lower = 0.0 if chi2.sf(lr, df) >= alpha else brentq(lambda lam: ncx2.sf(lr, df, lam) - alpha, 1e-9, 10 * lr + 100)
    upper = brentq(lambda lam: ncx2.cdf(lr, df, lam) - alpha, 1e-9, 10 * lr + 200) if chi2.cdf(lr, df) > alpha else 0.0
    return {"noncentrality_90": [lower, upper], "eli_90": [lower / scale, upper / scale]}


def band(value):
    return "weak" if value < 0.5 else ("intermediate" if value < 1.5 else "strong")


def main():
    extract = json.loads(Path(sys.argv[1]).read_text())
    design = json.loads((DATA / "var_country_lag_identifiability_design.json").read_text())
    require = lambda c, m: (_ for _ in ()).throw(SystemExit(f"audit agreement failure: {m}")) if not c else None
    require(extract["design_sha256"] == sha(DATA / "var_country_lag_identifiability_design.json") and extract["varengine_sha256"] == design["frozen_input_sha256"]["src/lib/varEngine.ts"], "extract provenance")
    v187 = json.loads((DATA / "var_lag_characterization_signal_strength_decomposition.json").read_text())["rows"]
    out_units, max_diff = [], 0.0
    for unit in extract["units"]:
        if unit["state"] != "ok":
            out_units.append({"unit_id": unit["unit_id"], "state": "audit_unavailable", "reason": unit.get("reason")})
            continue
        det, periods, y = unit["deterministic_terms"], unit["periods"], np.array(unit["data"], dtype=float)
        d = 1 if det == "constant" else 12
        T, pmax = len(y), unit["max_lag"]
        # --- agreement: BIC grid on the common sample
        grid, common = [], {}
        for lag in range(1, pmax + 1):
            z, yy, b, resid = ols(y[pmax - lag:], periods[pmax - lag:], lag, det)
            n = len(resid)
            bic = logdet_mle(resid) + log(n) / n * (lag * K * K + K * d)
            grid.append(bic)
            common[lag] = (resid, n)
        prod = [g["bic"] for g in unit["bic_grid"]]
        diff = max(abs(a - b) for a, b in zip(grid, prod)); max_diff = max(max_diff, diff)
        require(diff <= TOL and len(grid) == len(prod), f"{unit['unit_id']} BIC grid")
        require(max(abs(a - b) for a, b in zip(prod, unit["production_run_bic_grid"])) <= TOL, f"{unit['unit_id']} production run grid")
        selected = int(np.argmin(grid) + 1)
        require(selected == unit["selected_lag"] == unit["production_run_selected_lag"], f"{unit['unit_id']} selected lag")
        # --- agreement: full-sample fits
        fits = {}
        for key, rec in unit["fits"].items():
            lag = int(key)
            z, yy, b, resid = ols(y, periods, lag, det)
            dcoef = float(np.max(np.abs(b - np.array(rec["params"]))))
            dres = float(np.max(np.abs(resid - np.array(rec["resid"]))))
            pt = pt_adjusted(resid, lag, 12)
            dpt = abs(pt["statistic"] - rec["portmanteau_h12"]["statistic"])
            max_diff = max(max_diff, dcoef, dres, dpt)
            require(dcoef <= TOL and dres <= TOL and dpt <= TOL, f"{unit['unit_id']} fit p={lag}")
            fits[lag] = (z, b, resid, rec)
        # --- metrics
        r1, n = common[1]
        r2, _ = common[2]
        delta = logdet_mle(r1) - logdet_mle(r2)
        lr = n * delta
        penalty = K * K * log(n) / n
        eli_raw, eli_adj = delta / penalty, (lr - K * K) / (K * K * log(n))
        interval = eli_interval(lr, K * K, n)
        z2, b2, res2, rec2 = fits[2]
        rows = slice(d + K, d + 2 * K)
        a2 = b2[rows]  # lag-2 block (regressors x equations)
        sigma_df = np.array(rec2["sigma_u"])
        zz_inv = np.linalg.inv(z2.T @ z2)[rows, rows]
        wald = float(np.trace(np.linalg.solve(sigma_df, a2.T @ np.linalg.solve(zz_inv, a2))))
        ssr1, ssr2 = np.sum(r1 ** 2, axis=0), np.sum(r2 ** 2, axis=0)
        per_lag = {}
        for lag, (z, b, resid, rec) in sorted(fits.items()):
            s = np.array(rec["sigma_u"])
            sd = np.sqrt(np.diag(s))
            per_lag[str(lag)] = {"parameters_per_equation": K * lag + d, "observations_per_parameter": (T - lag) / (K * lag + d), "fit_observations": rec["nobs"],
                                 "sigma_u": s.tolist(), "correlation": (s / np.outer(sd, sd)).tolist(), "stability": rec["stability"], "portmanteau_h12": rec["portmanteau_h12"]}
        sel = per_lag[str(selected)]
        ratio_ok = (T - selected) / (K * selected + d) >= 4
        stable = sel["stability"]["stable"]
        p_value = sel["portmanteau_h12"]["p_value"]
        if not stable or not ratio_ok:
            category = "D"
        elif selected == 1:
            category = "A" if p_value >= 0.05 else "B"
        else:
            category = "C" if p_value >= 0.05 else "C_fail"
        det187 = "constant" if det == "constant" else "constant_plus_11_month_dummies"
        nearest = []
        for t in (132, 144):
            rows187 = [r for r in v187 if r["phase"] == "lag_selection_primary" and r["sample_size"] == t and r["deterministic_spec"] == det187]
            best = min(rows187, key=lambda r: abs(r["psi_at_T"] - eli_adj))
            nearest.append({"sample_size": t, "design": best["design"], "persistence": best["persistence"], "psi_at_T": best["psi_at_T"], "synthetic_bic_exact_recovery": best["bic_exact_recovery"]["rate"]})
        bands_overlapped = sorted({band(x) for x in (interval["eli_90"][0], interval["eli_90"][1])} | ({"intermediate"} if interval["eli_90"][0] < 0.5 and interval["eli_90"][1] >= 1.5 else set()))
        out_units.append({
            "unit_id": unit["unit_id"], "state": "ok", "country": unit["country"], "profile_id": unit["profile_id"], "deterministic_terms": det,
            "sample_structure": {"T_eff": T, "K": K, "pmax": pmax, "n_common": n, "start_period": periods[0], "end_period": periods[-1]},
            "bic_grid": [{"lag": g["lag"], "bic": g["bic"]} for g in unit["bic_grid"]], "selected_bic_lag": selected,
            "delta_bic_2_vs_1": grid[1] - grid[0],
            "log_likelihood_improvement_2_vs_1": {"lr": lr, "df": K * K, "descriptive_asymptotic_p_value": float(chi2.sf(lr, K * K)), "label": "descriptive, not a gate"},
            "incremental_parameter_count": K * K,
            "lag2_block": {"frobenius_norm": float(np.linalg.norm(a2)), "spectral_norm": float(np.linalg.norm(a2, 2)), "wald": wald, "wald_descriptive_p_value": float(chi2.sf(wald, K * K))},
            "lag2_partial_contribution": {"system_share": float(1 - np.exp(-delta)), "per_equation_partial_r2": (1 - ssr2 / ssr1).tolist()},
            "by_lag": per_lag,
            "empirical_lag_identifiability_index": {"eli_raw": eli_raw, "eli_bias_adjusted": eli_adj, **interval, "note": "empirical index, not true psi; eli_raw > 1 iff BIC prefers lag 2 over lag 1; no cutoff"},
            "v187_reference_mapping": {"most_similar_region": band(eli_adj), "regions_overlapped_by_90_interval": bands_overlapped, "nearest_v187_designs": nearest, "label": "descriptive synthetic context only; not a gate or probability"},
            "selected_model_adequacy_category": category, "selected_model_parameter_ratio_ok": ratio_ok,
            "adequacy_caveat": "asymptotic production Portmanteau; v1.85 showed it is not size-calibrated in these designs",
        })
    doc = {"schema_version": "var-country-lag-identifiability-results-v1.88", "phase": "A", "generated_at": "2026-09-28",
           "preregistration_sha256": sha(DATA / "var_country_lag_identifiability_preregistration.json"),
           "production_agreement": {"tolerance": TOL, "maximum_difference": max_diff, "passed": True},
           "units": out_units, "phase_B_run": False, "production_changed": False, "readiness_changed": False,
           "interpretation": "Descriptive lag-identifiability evidence; not production readiness, not a model-selection override, not a probability that any country's true lag is 1 or 2."}
    (DATA / "var_country_lag_identifiability_results.json").write_text(json.dumps(doc, indent=1) + "\n")
    print(json.dumps({"units": len(out_units), "max_production_difference": max_diff}))


if __name__ == "__main__":
    main()
