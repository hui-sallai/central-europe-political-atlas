#!/usr/bin/env python3
"""v1.90 independent validation (standard library only): exact attribution sums, label rules re-derived from the
published result files, BH q-values recomputed, provenance and production boundary."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
checks = 0


def require(c, m):
    global checks
    checks += 1
    if not c:
        raise SystemExit(f"v1.90 validation failed: {m}")


sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda n: json.loads((DATA / n).read_text())
conclusion = load("var_residual_attribution_research_conclusion.json")
for name, expected in conclusion["result_files"].items():
    require(sha(DATA / name) == expected, f"result file changed: {name}")
attr, acf, var, per, probes = (load(n)["units"] for n in ("var_portmanteau_attribution.json", "var_residual_acf_results.json", "var_residual_variance_stability.json", "var_residual_period_concentration.json", "var_residual_specification_probe_results.json"))
require(len(attr) == 5 and conclusion["production_agreement_max_difference"] <= 1e-8, "units / production agreement")


def bh(p):
    order = sorted(range(len(p)), key=lambda i: p[i]); q = [0.0] * len(p); run = 1.0
    for rank, i in reversed(list(enumerate(order, 1))):
        run = min(run, p[i] * len(p) / rank); q[i] = run
    return q


lb = [(u["unit_id"], v, x) for u in acf for v, e in u["equations"].items() for x in e["ljung_box"]]
for (_, _, x), q in zip(lb, bh([x["p_value"] for _, _, x in lb])):
    require(abs(x["bh_q_value"] - q) < 1e-12, "Ljung-Box BH")
arch = [x for u in var for e in u["equations"].values() for x in e["arch_lm"]]
for x, q in zip(arch, bh([x["p_value"] for x in arch])):
    require(abs(x["bh_q_value"] - q) < 1e-12, "ARCH BH")
labels = {c["unit_id"]: c for c in conclusion["unit_labels"]}
for a, c, v, p, pr in zip(attr, acf, var, per, probes):
    total = sum(r["contribution"] for r in a["lags"])
    require(abs(total - a["statistic"]) < 1e-9 and abs(a["statistic"] - a["production_statistic"]) < 1e-8, f"exact attribution {a['unit_id']}")
    require(abs(sum(r["own"] + r["cross"] for r in a["lags"]) - total) < 1e-9, "own/cross split")
    lb12q = min(e["ljung_box"][1]["bh_q_value"] for e in c["equations"].values())
    p2 = p["periods"]["P2_pandemic_aftermath"]
    events_p2 = len(p2["events_abs_z_gt_3"])
    expect = []
    if a["production_asymptotic_p_value"] >= 0.10 and lb12q >= 0.05: expect.append("little_residual_dependence")
    if a["own_share"] >= 0.5 and a["lags_1_3_share"] >= 0.4: expect.append("short_lag_own_equation_dependence")
    if a["cross_share"] >= 0.5: expect.append("cross_equation_lag_dependence")
    if a["lags_11_13_share"] >= 0.25: expect.append("seasonal_dynamic_dependence")
    if any(e["arch_lm"][1]["bh_q_value"] < 0.05 and e["max_min_ratio"] >= 4 for e in v["equations"].values()): expect.append("variance_instability_dominated")
    if p2["mahalanobis_share"] >= 2 * p2["observation_share"] or (p["events_total"] > 0 and events_p2 / p["events_total"] >= 0.5): expect.append("break_outlier_concentrated")
    if not [l for l in expect if l != "break_outlier_concentrated"] and a["top_3_lag_share"] < 0.4: expect.append("diffuse_unexplained_dependence")
    require(labels[a["unit_id"]]["labels"] == expect, f"labels {a['unit_id']}")
    for probe in pr["probes"].values():
        require(abs(probe["change_vs_production"]["q_star_12_reduction"] - (1 - probe["q_star_12"] / pr["production_reference"]["q_star_12"])) < 1e-12, "probe reduction")
require(conclusion["production_change_authorized"] is False and conclusion["readiness_changed"] is False and conclusion["formal_irf_publication_available"] is False, "boundary")
require(conclusion["platform_questions"]["Q3_justified_future_extension"]["authorized_in_v1_90"] is False, "no extension authorized")
print(json.dumps({"status": "pass", "checks": checks}))
