#!/usr/bin/env python3
"""v1.90 residual-dependence attribution (owner-authorized, run once). Reads the v1.88 production extract,
verifies production residuals and the Portmanteau statistic, and writes the preregistered result files.
Usage: attribution.py <production_extract.json>"""
import hashlib
import json
import sys
from collections import Counter
from math import atanh, sqrt
from pathlib import Path

import numpy as np
from scipy.stats import chi2, f as f_dist, norm

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
sys.path.insert(0, str(ROOT / "scripts" / "var-residual-diagnostics"))
from common import pt_adjusted  # noqa: E402  (frozen v1.85, reference-validated)

K, H, TOL = 3, 12, 1e-8
VARS = ["hicp_monthly_index", "industrial_production_index", "unemployment_rate_monthly"]
PERIODS = {"P1_pre_2020": ("0000-00", "2019-12"), "P2_pandemic_aftermath": ("2020-01", "2021-12"), "P3_post_2022": ("2022-01", "2026-06")}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def design_matrix(data, periods, lags, det):
    start = max(lags)
    rows = len(data) - start
    parts = [np.ones((rows, 1))]
    if det == "constant_month_dummies":
        month = np.array([int(p[5:7]) for p in periods[start:]])
        parts.append(np.column_stack([(month == m).astype(float) for m in range(2, 13)]))
    parts += [data[start - l: len(data) - l] for l in lags]
    return np.column_stack(parts), data[start:]


def fit(data, periods, lags, det):
    z, y = design_matrix(data, periods, lags, det)
    b = np.linalg.lstsq(z, y, rcond=None)[0]
    return y - z @ b, z.shape[1]


def acf(x, lags):
    x = x - x.mean()
    d = np.sum(x * x)
    return [float(np.sum(x[k:] * x[:-k]) / d) for k in range(1, lags + 1)]


def pacf(r):
    """Durbin-Levinson from autocorrelations r_1..r_m."""
    out, phi = [], []
    for k in range(1, len(r) + 1):
        if k == 1:
            new = [r[0]]
        else:
            num = r[k - 1] - sum(phi[j] * r[k - 2 - j] for j in range(k - 1))
            den = 1 - sum(phi[j] * r[j] for j in range(k - 1))
            pkk = num / den
            new = [phi[j] - pkk * phi[k - 2 - j] for j in range(k - 1)] + [pkk]
        phi = new
        out.append(float(phi[-1]))
    return out


def ljung_box(r, n, m):
    q = n * (n + 2) * sum(r[k - 1] ** 2 / (n - k) for k in range(1, m + 1))
    return {"m": m, "statistic": float(q), "p_value": float(chi2.sf(q, m))}


def arch_lm(x, q):
    s = x * x
    y = s[q:]
    z = np.column_stack([np.ones(len(y))] + [s[q - l: len(s) - l] for l in range(1, q + 1)])
    b = np.linalg.lstsq(z, y, rcond=None)[0]
    resid = y - z @ b
    r2 = 1 - np.sum(resid ** 2) / np.sum((y - y.mean()) ** 2)
    lm = len(y) * r2
    return {"q": q, "statistic": float(lm), "p_value": float(chi2.sf(lm, q))}


def portmanteau_parts(e, h=H):
    n = len(e)
    c0 = e.T @ e / n
    vals, vecs = np.linalg.eigh(c0)
    w = vecs @ np.diag(vals ** -0.5) @ vecs.T
    lag_rows, cells = [], []
    for k in range(1, h + 1):
        ck = e[k:].T @ e[:-k] / n
        rk = w @ ck @ w
        contrib = n * n * rk ** 2 / (n - k)
        lag_rows.append({"lag": k, "contribution": float(contrib.sum()), "own": float(np.trace(contrib)), "cross": float(contrib.sum() - np.trace(contrib))})
        for i in range(K):
            for j in range(K):
                cells.append({"lag": k, "i": VARS[i], "j": VARS[j], "contribution": float(contrib[i, j])})
    total = sum(r["contribution"] for r in lag_rows)
    cum = 0.0
    for r in lag_rows:
        cum += r["contribution"]
        r["share"] = r["contribution"] / total
        r["cumulative_share"] = cum / total
    shares = sorted((r["share"] for r in lag_rows), reverse=True)
    return {"statistic": total, "lags": lag_rows, "own_share": sum(r["own"] for r in lag_rows) / total, "cross_share": sum(r["cross"] for r in lag_rows) / total,
            "lags_1_3_share": sum(r["share"] for r in lag_rows[:3]), "lags_11_13_share": sum(r["share"] for r in lag_rows[10:13]),
            "lag_12_share": lag_rows[11]["share"] if h >= 12 else None, "top_3_lag_share": sum(shares[:3]), "herfindahl": sum(s * s for s in shares),
            "top_5_cells": sorted(cells, key=lambda c: -c["contribution"])[:5]}, w


def bh(pvals):
    order = sorted(range(len(pvals)), key=lambda i: pvals[i])
    q = [0.0] * len(pvals)
    running = 1.0
    for rank, i in reversed(list(enumerate(order, start=1))):
        running = min(running, pvals[i] * len(pvals) / rank)
        q[i] = running
    return q


def probe_summary(e, lag_for_df):
    parts, _ = portmanteau_parts(e)
    return {"residual_observations": len(e), "q_star_12": parts["statistic"], "lag_shares": [r["share"] for r in parts["lags"]], "own_share": parts["own_share"], "cross_share": parts["cross_share"],
            "lag_12_share": parts["lag_12_share"], "lags_11_13_share": parts["lags_11_13_share"],
            "ljung_box": {VARS[i]: {"m12": ljung_box(acf(e[:, i], 24), len(e), 12), "m24": ljung_box(acf(e[:, i], 24), len(e), 24)} for i in range(K)},
            "arch_lm_12": {VARS[i]: arch_lm(e[:, i], 12) for i in range(K)}}


def main():
    extract = json.loads(Path(sys.argv[1]).read_text())
    design = json.loads((DATA / "var_residual_attribution_design.json").read_text())
    if sha(DATA / "var_residual_attribution_preregistration.json") != "865a568f8e517b619eeee978f31edc6c0a637d493a169facc3b357714d25725f":
        raise SystemExit("preregistration hash mismatch")
    if extract["design_sha256"] != sha(DATA / "var_country_lag_identifiability_design.json"):
        raise SystemExit("extract provenance")
    units = {u["unit_id"]: u for u in design["units"]}
    out = {k: [] for k in ("acf", "cross", "attr", "seasonal", "variance", "period", "probe")}
    lb_family, arch_family, cross_family = [], [], []
    max_diff = 0.0
    labels_input = {}
    for unit in extract["units"]:
        u = units[unit["unit_id"]]
        p, det = u["production_selected_lag"], unit["deterministic_terms"]
        if unit["selected_lag"] != p:
            raise SystemExit(f"production lag mismatch {u['unit_id']}")
        data, periods = np.array(unit["data"], dtype=float), unit["periods"]
        rec = unit["fits"][str(p)]
        e = np.array(rec["resid"], dtype=float)
        mine, _ = fit(data, periods, list(range(1, p + 1)), det)
        dates = periods[p:]
        n = len(e)
        max_diff = max(max_diff, float(np.max(np.abs(mine - e))))
        parts, w = portmanteau_parts(e)
        max_diff = max(max_diff, abs(parts["statistic"] - rec["portmanteau_h12"]["statistic"]), abs(parts["statistic"] - pt_adjusted(e, p, 12)["statistic"]))
        if max_diff > TOL:
            raise SystemExit(f"production agreement failed {u['unit_id']}: {max_diff}")
        uid = u["unit_id"]
        # equation ACF / PACF / Ljung-Box
        eq = {}
        for i, name in enumerate(VARS):
            r = acf(e[:, i], 24)
            lbs = [ljung_box(r, n, m) for m in (6, 12, 24)]
            for lb in lbs:
                lb_family.append((uid, name, lb))
            eq[name] = {"acf": r, "pacf": pacf(r), "band_95": 1.96 / sqrt(n), "ljung_box": lbs}
        out["acf"].append({"unit_id": uid, "country": u["country"], "residual_observations": n, "equations": eq})
        # cross-lag correlations
        c0 = e.T @ e / n
        sd = np.sqrt(np.diag(c0))
        pairs = []
        for i in range(K):
            for j in range(K):
                if i == j:
                    continue
                for k in list(range(1, 13)) + [24]:
                    ck = e[k:].T @ e[:-k] / n
                    corr = float(ck[i, j] / (sd[i] * sd[j]))
                    pval = float(2 * norm.sf(abs(atanh(max(min(corr, 0.999999), -0.999999))) * sqrt(n - k - 3)))
                    item = {"i": VARS[i], "j_lagged": VARS[j], "k": k, "corr": corr, "fisher_z_p_value": pval}
                    pairs.append(item)
                    cross_family.append(item)
        out["cross"].append({"unit_id": uid, "country": u["country"], "definition": "corr(e_i,t, e_j,t-k)", "pairs": pairs})
        # Portmanteau attribution
        attr = {"unit_id": uid, "country": u["country"], "production_statistic": rec["portmanteau_h12"]["statistic"], "production_asymptotic_p_value": rec["portmanteau_h12"]["p_value"], **parts,
                "decomposition": "symmetric square root C_0^{-1/2}; ordering-invariant; exact sum"}
        out["attr"].append(attr)
        # seasonal
        month = np.array([int(d[5:7]) for d in dates])
        month_means, fstats = {}, {}
        for i, name in enumerate(VARS):
            x = e[:, i]
            groups = [x[month == m] for m in range(1, 13)]
            month_means[name] = [float(g.mean()) for g in groups]
            ss_between = sum(len(g) * (g.mean() - x.mean()) ** 2 for g in groups)
            ss_within = sum(np.sum((g - g.mean()) ** 2) for g in groups)
            fval = (ss_between / 11) / (ss_within / (n - 12)) if ss_within > 0 else None
            fstats[name] = {"F": None if fval is None else float(fval), "p_value": None if fval is None else float(f_dist.sf(fval, 11, n - 12))}
        out["seasonal"].append({"unit_id": uid, "country": u["country"], "deterministic_terms": det,
                                "seasonal_mean_effects": {"residual_month_means": month_means, "equal_month_means_F": fstats, "note": "zero by construction when month dummies are in the model"},
                                "seasonal_dynamic_dependence": {"own_acf": {VARS[i]: {"lag12": eq[VARS[i]]["acf"][11], "lag24": eq[VARS[i]]["acf"][23]} for i in range(K)},
                                                                "cross_corr": [x for x in pairs if x["k"] in (12, 24)], "lag_12_share_of_q": parts["lag_12_share"], "lags_11_13_share_of_q": parts["lags_11_13_share"]}})
        # variance stability
        var = {}
        for i, name in enumerate(VARS):
            x = e[:, i]
            rolling = [float(np.var(x[t - 24:t], ddof=1)) for t in range(24, n + 1)]
            arch = [arch_lm(x, 4), arch_lm(x, 12)]
            for a in arch:
                arch_family.append((uid, name, a))
            var[name] = {"rolling_24m_variance_min": min(rolling), "rolling_24m_variance_max": max(rolling), "max_min_ratio": max(rolling) / min(rolling),
                         "squared_residual_acf": acf(x * x, 12), "arch_lm": arch}
        period_cov = {}
        full_cov = e.T @ e / n
        for pname, (a, b) in PERIODS.items():
            mask = np.array([a <= d <= b for d in dates])
            ep = e[mask]
            cov = ep.T @ ep / len(ep)
            period_cov[pname] = {"observations": int(mask.sum()), "log_det_ratio_vs_full": float(np.linalg.slogdet(cov)[1] - np.linalg.slogdet(full_cov)[1]),
                                 "variance_ratio_vs_full": {VARS[i]: float(cov[i, i] / full_cov[i, i]) for i in range(K)}}
        out["variance"].append({"unit_id": uid, "country": u["country"], "equations": var, "covariance_by_period": period_cov, "note": "no GARCH structure is inferred"})
        # period concentration
        z = e / np.sqrt(np.diag(full_cov))
        mahal = np.einsum("ti,ij,tj->t", e, np.linalg.inv(full_cov), e)
        events = [{"date": dates[t], "equation": VARS[i], "z": float(z[t, i])} for t in range(n) for i in range(K) if abs(z[t, i]) > 3]
        per = {}
        mass_total = 0.0
        for pname, (a, b) in PERIODS.items():
            mask = np.array([a <= d <= b for d in dates])
            mass = 0.0
            for k in range(1, H + 1):
                sel = mask[k:]
                ck = e[k:][sel].T @ e[:-k][sel] / n
                rk = w @ ck @ w
                mass += float(n * n * np.sum(rk ** 2) / (n - k))
            mass_total += mass
            per[pname] = {"observation_share": float(mask.mean()), "squared_standardized_share": {VARS[i]: float(np.sum(z[mask, i] ** 2) / np.sum(z[:, i] ** 2)) for i in range(K)},
                          "mahalanobis_share": float(mahal[mask].sum() / mahal.sum()), "events_abs_z_gt_3": [ev for ev in events if a <= ev["date"] <= b], "lag_product_mass": mass}
        for pname in per:
            per[pname]["lag_product_mass_share_normalized"] = per[pname]["lag_product_mass"] / mass_total
            per[pname]["lag_product_mass_over_full_q"] = per[pname]["lag_product_mass"] / parts["statistic"]
        out["period"].append({"unit_id": uid, "country": u["country"], "periods": per, "events_total": len(events), "full_sample_q_star": parts["statistic"],
                              "note": "period shares of the lag-product mass are approximate because cross-period terms do not add; events are not causal explanations"})
        # probes (diagnostic only)
        probes = {}
        ea, _ = fit(data, periods, list(range(1, p + 2)), det)
        probes["A_plus_one_lag"] = {"lags": list(range(1, p + 2)), **probe_summary(ea, p + 1)}
        eb, _ = fit(data, periods, list(range(1, p + 1)) + [12], det)
        probes["B_seasonal_lag_term"] = {"lags": list(range(1, p + 1)) + [12], **probe_summary(eb, p)}
        cut = [i for i, d in enumerate(periods) if d <= "2019-12"]
        dsub, psub = data[: cut[-1] + 1], periods[: cut[-1] + 1]
        ec, ncols = fit(dsub, psub, list(range(1, p + 1)), det)
        probes["C_stable_subsample"] = {"lags": list(range(1, p + 1)), "sample": [psub[0], psub[-1]], "parameters_per_equation": ncols,
                                        "observations_per_parameter": len(ec) / ncols, "below_production_parameter_ratio_4": len(ec) / ncols < 4, **probe_summary(ec, p)}
        prod = probe_summary(e, p)
        for key, probe in probes.items():
            probe["change_vs_production"] = {"q_star_12_ratio": probe["q_star_12"] / prod["q_star_12"], "q_star_12_reduction": 1 - probe["q_star_12"] / prod["q_star_12"],
                                             "own_share_delta": probe["own_share"] - prod["own_share"], "lag_12_share_delta": probe["lag_12_share"] - prod["lag_12_share"],
                                             "ljung_box_12_statistic_delta": {v: probe["ljung_box"][v]["m12"]["statistic"] - prod["ljung_box"][v]["m12"]["statistic"] for v in VARS}}
        out["probe"].append({"unit_id": uid, "country": u["country"], "label": "diagnostic-only attribution probes; not baselines, not readiness, no IRFs", "production_reference": prod, "probes": probes})
        labels_input[uid] = {"parts": parts, "prod_p": rec["portmanteau_h12"]["p_value"], "var": var, "per": per, "events": events, "probes": probes}

    # multiplicity (Benjamini-Hochberg within families)
    for family in (lb_family, arch_family):
        for (uid, name, item), q in zip(family, bh([x[2]["p_value"] for x in family])):
            item["bh_q_value"] = q
    for item, q in zip(cross_family, bh([x["fisher_z_p_value"] for x in cross_family])):
        item["bh_q_value"] = q

    # preregistered labels and platform questions
    conclusions = []
    extension_map = {"short_lag_own_equation_dependence": "higher-order own-lag structure", "cross_equation_lag_dependence": "richer cross-lag structure",
                     "seasonal_dynamic_dependence": "seasonal lag terms"}
    q1, q2 = [], []
    for row in out["acf"]:
        uid = row["unit_id"]
        d = labels_input[uid]
        parts = d["parts"]
        lb12_q = [row["equations"][v]["ljung_box"][1]["bh_q_value"] for v in VARS]
        arch_ok = [v for v in VARS if d["var"][v]["arch_lm"][1]["bh_q_value"] < 0.05 and d["var"][v]["max_min_ratio"] >= 4]
        p2 = d["per"]["P2_pandemic_aftermath"]
        events_p2 = len(p2["events_abs_z_gt_3"])
        labels = []
        if d["prod_p"] >= 0.10 and min(lb12_q) >= 0.05:
            labels.append("little_residual_dependence")
        if parts["own_share"] >= 0.50 and parts["lags_1_3_share"] >= 0.40:
            labels.append("short_lag_own_equation_dependence")
        if parts["cross_share"] >= 0.50:
            labels.append("cross_equation_lag_dependence")
        if parts["lags_11_13_share"] >= 0.25:
            labels.append("seasonal_dynamic_dependence")
        if arch_ok:
            labels.append("variance_instability_dominated")
        if p2["mahalanobis_share"] >= 2 * p2["observation_share"] or (len(d["events"]) > 0 and events_p2 / len(d["events"]) >= 0.5):
            labels.append("break_outlier_concentrated")
        if not [l for l in labels if l != "break_outlier_concentrated"] and parts["top_3_lag_share"] < 0.40:
            labels.append("diffuse_unexplained_dependence")
        reductions = {k: d["probes"][k]["change_vs_production"]["q_star_12_reduction"] for k in ("A_plus_one_lag", "B_seasonal_lag_term")}
        big = [k for k, v in reductions.items() if v >= 0.30]
        if set(labels) & {"little_residual_dependence", "diffuse_unexplained_dependence"} and not big:
            q1.append(uid)
        if set(labels) & set(extension_map) and big:
            q2.append(uid)
        conclusions.append({"unit_id": uid, "country": row["country"], "labels": labels, "probe_q_star_reduction": reductions, "variance_instability_equations": arch_ok,
                            "p2_mahalanobis_share": p2["mahalanobis_share"], "p2_observation_share": p2["observation_share"], "events_total": len(d["events"]), "events_in_p2": events_p2})
    counts = Counter(l for c in conclusions if c["unit_id"] in q2 for l in c["labels"] if l in extension_map)
    common = {"generated_at": "2026-09-29", "preregistration_sha256": sha(DATA / "var_residual_attribution_preregistration.json"), "production_agreement_max_difference": max_diff,
              "production_change_authorized": False, "readiness_changed": False, "formal_irf_publication_available": False}
    files = {"var_residual_acf_results.json": ("var-residual-acf-results-v1.90", out["acf"]), "var_residual_cross_lag_results.json": ("var-residual-cross-lag-results-v1.90", out["cross"]),
             "var_portmanteau_attribution.json": ("var-portmanteau-attribution-v1.90", out["attr"]), "var_residual_seasonal_results.json": ("var-residual-seasonal-results-v1.90", out["seasonal"]),
             "var_residual_variance_stability.json": ("var-residual-variance-stability-v1.90", out["variance"]), "var_residual_period_concentration.json": ("var-residual-period-concentration-v1.90", out["period"]),
             "var_residual_specification_probe_results.json": ("var-residual-specification-probe-results-v1.90", out["probe"])}
    for name, (schema, units_out) in files.items():
        (DATA / name).write_text(json.dumps({"schema_version": schema, **common, "units": units_out}, indent=1) + "\n")
    conclusion = {"schema_version": "var-residual-attribution-research-conclusion-v1.90", **common, "unit_labels": conclusions,
                  "platform_questions": {
                      "Q1_test_calibration_issue": {"units_consistent_with_calibration_issue": q1, "calibration_evidence": "v1.85/v1.89: asymptotic h=12 Portmanteau over-rejects (~21%) with month dummies at the correct lag; bootstrap is conservative in the intermediate lag-2 region"},
                      "Q2_genuine_misspecification": {"units_with_evidence": q2, "rule": "misspecification-consistent label AND probe A or B reduces Q*_12 by >= 30%"},
                      "Q3_justified_future_extension": {"candidates": [extension_map[l] for l, _ in counts.most_common()] or ["none identified by the preregistered rule"], "authorized_in_v1_90": False}},
                  "result_files": {name: sha(DATA / name) for name in files}}
    (DATA / "var_residual_attribution_research_conclusion.json").write_text(json.dumps(conclusion, indent=2) + "\n")
    print(json.dumps({"max_production_difference": max_diff, "labels": {c["country"]: c["labels"] for c in conclusions}, "Q1": q1, "Q2": q2, "Q3": conclusion["platform_questions"]["Q3_justified_future_extension"]["candidates"]}, indent=1))


if __name__ == "__main__":
    main()
