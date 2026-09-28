#!/usr/bin/env python3
"""v1.87 summaries from completed checkpoints (never simulates). Usage: summarize.py --checkpoint-dir DIR"""
import argparse
import hashlib
import json
from collections import Counter
from math import sqrt
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "956f4114416cd88a221adc991b079df127c8b9dea6e88f1027d050f458dc3a7a"
Z = 1.959963984540054
QUANTILES = (0.05, 0.25, 0.5, 0.75, 0.95)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def proportion(k: int, n: int) -> dict:
    if n == 0:
        return {"count": k, "n": 0, "rate": None, "mcse": None, "wilson_95": None}
    p = k / n
    centre = (p + Z * Z / (2 * n)) / (1 + Z * Z / n)
    half = Z * sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / (1 + Z * Z / n)
    return {"count": k, "n": n, "rate": p, "mcse": sqrt(p * (1 - p) / n), "wilson_95": [max(0.0, centre - half), min(1.0, centre + half)]}


def quantiles(values) -> dict:
    arr = np.asarray(values, dtype=float)
    return {"n": int(arr.size), "mean": float(arr.mean()), **{f"q{int(q * 100):02d}": float(np.quantile(arr, q)) for q in QUANTILES}}


def load_cell(root: Path, cell: dict, spec: dict) -> dict:
    merged = {"bic": [], "aic": [], "hqic": [], "d12": [], "gap": [], "bootstrap": []}
    for chunk_index, start in enumerate(range(0, spec["replications"], spec["chunk"])):
        path = root / cell["phase"] / f"cell-{cell['cell_index']:03d}" / f"chunk-{chunk_index:03d}.json"
        if not path.exists():
            raise SystemExit(f"missing checkpoint {cell['phase']}/{cell['cell_index']}/{chunk_index}")
        payload = json.loads(path.read_text())
        if payload["cell_id"] != cell["cell_id"] or payload["start"] != start or payload["data_spawn_key"] != [spec["code"], cell["cell_index"], chunk_index, 0]:
            raise SystemExit(f"checkpoint identity mismatch {path}")
        for name in ("bic", "aic", "hqic"):
            merged[name].extend(payload["selected"][name])
        merged["d12"].extend(payload["bic_lag1_minus_lag2"])
        merged["gap"].extend(payload["bic_true_minus_min"])
        merged["bootstrap"].extend(payload.get("bootstrap", []))
        merged["pmax"], merged["n_common"] = payload["pmax"], payload["n_common"]
    if len(merged["bic"]) != spec["replications"]:
        raise SystemExit(f"replication count mismatch {cell['cell_id']}")
    return merged


def category(selected: int, cell: dict) -> str:
    true_lag = cell["true_lag"]
    if selected == true_lag:
        return "correct_recovery"
    if selected > true_lag:
        return "overselection"
    power = cell["population"]["underfit_var1"]["approximate_power"]  # only true_lag = 2 can underselect (to lag 1)
    return "underselection_adequate_approximation" if power <= 0.10 else "underselection_inadequate_model"


def summarize_cell(cell: dict, m: dict) -> dict:
    n = len(m["bic"])
    k, dcount, T = cell["k"], 1 if cell["deterministic_spec"] == "constant" else 12, cell["sample_size"]
    out = {key: cell[key] for key in ("cell_id", "phase", "variant", "k", "covariance", "innovation", "sample_size", "persistence", "deterministic_spec", "design", "true_lag")}
    if "population" in cell:
        out["population"] = {"psi_at_T": cell["population"]["psi_at_T"], "psi_at_reference_T": cell["population"]["psi_at_reference_T"], "lag2_information_delta": cell["population"]["lag2_information_delta"], "underfit_var1": cell["population"]["underfit_var1"]}
    out["replications"] = n
    out["max_candidate_lag"], out["common_sample_observations"] = m["pmax"], m["n_common"]
    out["criteria"] = {}
    for name in ("bic", "aic", "hqic"):
        sel = m[name]
        counts = Counter(sel)
        out["criteria"][name] = {
            "role": "production" if name == "bic" else "report_only_benchmark",
            "selected_lag_counts": {str(l): counts[l] for l in sorted(counts)},
            "P_select_1": proportion(counts.get(1, 0), n), "P_select_2": proportion(counts.get(2, 0), n),
            "exact_recovery": proportion(counts.get(cell["true_lag"], 0), n),
            "underselection": proportion(sum(v for l, v in counts.items() if l < cell["true_lag"]), n),
            "overselection": proportion(sum(v for l, v in counts.items() if l > cell["true_lag"]), n),
        }
    bic_counts = Counter(m["bic"])
    out["bic_lag1_minus_lag2"] = quantiles(m["d12"])
    out["bic_true_minus_min"] = quantiles(m["gap"])
    out["by_selected_lag"] = {str(l): {"count": bic_counts[l], "effective_sample": T - l, "parameters_per_equation": k * l + dcount, "total_parameters": k * (k * l + dcount),
                                       "observations_per_parameter": (T - l) / (k * l + dcount)} for l in sorted(bic_counts)}
    cats = Counter(category(l, cell) for l in m["bic"])
    out["adequacy_categories"] = {c: proportion(cats.get(c, 0), n) for c in ("correct_recovery", "overselection", "underselection_adequate_approximation", "underselection_inadequate_model")}
    if m["bootstrap"]:
        rows = list(zip(m["bic"], m["bootstrap"]))
        diag = {}
        for c in ("correct_recovery", "overselection", "underselection_adequate_approximation", "underselection_inadequate_model"):
            members = [b for l, b in rows if category(l, cell) == c]
            ok = [b for b in members if b["state"] == "ok"]
            diag[c] = {"replications": len(members), "failures": len(members) - len(ok), "rejection": proportion(sum(b["reject"] for b in ok), len(ok))}
        ok_all = [b for _, b in rows if b["state"] == "ok"]
        diag["all_selection_aware_procedure"] = {"replications": len(rows), "failures": len(rows) - len(ok_all), "rejection": proportion(sum(b["reject"] for b in ok_all), len(ok_all)),
                                                 "label": "selection-aware procedure rejection rate (not diagnostic test size)"}
        out["bootstrap_diagnostic_by_category"] = diag
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    args = parser.parse_args()
    if sha(DATA / "var_lag_characterization_preregistration.json") != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch")
    design = json.loads((DATA / "var_lag_characterization_simulation_design.json").read_text())
    cells = [summarize_cell(c, load_cell(args.checkpoint_dir, c, design["phases"][c["phase"]])) for c in design["cells"] if c["feasible"]]
    infeasible = [{k: c[k] for k in ("cell_id", "phase", "variant", "sample_size", "persistence", "deterministic_spec", "design", "psi_max_feasible", "infeasible_reason")} for c in design["cells"] if not c["feasible"]]
    common = {"generated_at": "2026-09-28", "preregistration_sha256": PREREG_SHA256, "actual_country_data_read": False, "production_changed": False}
    total = sum(c["replications"] for c in cells)

    results = {"schema_version": "var-lag-characterization-lag-selection-results-v1.87", **common, "total_replications": total,
               "criteria_roles": {"bic": "production", "aic": "report_only_benchmark", "hqic": "report_only_benchmark"}, "cells": cells, "infeasible_cells": infeasible}

    signal_rows = []
    for c in cells:
        if c["true_lag"] != 2:
            continue
        b = c["criteria"]["bic"]
        signal_rows.append({"phase": c["phase"], "variant": c["variant"], "sample_size": c["sample_size"], "persistence": c["persistence"], "deterministic_spec": c["deterministic_spec"],
                            "design": c["design"], "psi_at_T": c["population"]["psi_at_T"], "psi_at_reference_T": c["population"]["psi_at_reference_T"],
                            "bic_exact_recovery": b["exact_recovery"], "bic_underselection": b["underselection"], "bic_overselection": b["overselection"],
                            "underfit_var1_approximate_power": c["population"]["underfit_var1"]["approximate_power"],
                            "aic_exact_recovery_report_only": c["criteria"]["aic"]["exact_recovery"]["rate"], "hqic_exact_recovery_report_only": c["criteria"]["hqic"]["exact_recovery"]["rate"]})
    signal = {"schema_version": "var-lag-characterization-signal-strength-decomposition-v1.87", **common,
              "note": "True VAR(2) cells only; the signal-strength dimension is never aggregated away. Infeasible (psi, rho) combinations are listed in the results file.",
              "rows": signal_rows}

    adequacy = {"schema_version": "var-lag-characterization-adequacy-decomposition-v1.87", **common,
                "chain": "true_process -> lag_signal_strength -> selected_lag -> model_adequacy -> diagnostic_result",
                "category_definitions": design["adequacy_definition"],
                "distinction": {"failure_to_recover_true_lag": "any underselection or overselection (exact_recovery complement)",
                                "adequate_lower_order_approximation": "underselection_adequate_approximation",
                                "inadequate_lower_order_model": "underselection_inadequate_model"},
                "cells": [{"cell_id": c["cell_id"], "phase": c["phase"], "variant": c["variant"], "design": c["design"], "true_lag": c["true_lag"], "sample_size": c["sample_size"], "persistence": c["persistence"],
                           "deterministic_spec": c["deterministic_spec"], "psi_at_T": c.get("population", {}).get("psi_at_T"),
                           "adequacy_categories": c["adequacy_categories"], "bootstrap_diagnostic_by_category": c.get("bootstrap_diagnostic_by_category")} for c in cells]}

    per_phase = {}
    for c in cells:
        mc = [v["mcse"] for v in (c["criteria"]["bic"]["exact_recovery"], c["criteria"]["bic"]["underselection"], c["criteria"]["bic"]["overselection"]) if v["mcse"] is not None]
        ph = per_phase.setdefault(c["phase"], {"cells": 0, "replications_per_cell": c["replications"], "max_mcse_bic_rates": 0.0, "max_wilson_width_bic_exact": 0.0, "max_mcse_bootstrap_rejection": 0.0})
        ph["cells"] += 1
        ph["max_mcse_bic_rates"] = max(ph["max_mcse_bic_rates"], max(mc))
        w = c["criteria"]["bic"]["exact_recovery"]["wilson_95"]
        ph["max_wilson_width_bic_exact"] = max(ph["max_wilson_width_bic_exact"], w[1] - w[0])
        for v in (c.get("bootstrap_diagnostic_by_category") or {}).values():
            if v["rejection"]["mcse"] is not None and v["rejection"]["n"] >= 100:
                ph["max_mcse_bootstrap_rejection"] = max(ph["max_mcse_bootstrap_rejection"], v["rejection"]["mcse"])
    uncertainty = {"schema_version": "var-lag-characterization-mc-uncertainty-v1.87", **common, "method": "binomial standard error sqrt(p(1-p)/n) and Wilson 95% interval per proportion",
                   "phases": per_phase, "note": "bootstrap rejection standard errors are reported only for categories with at least 100 non-failed replications; smaller categories keep their Wilson intervals in the adequacy decomposition"}

    for name, doc in (("lag_selection_results", results), ("signal_strength_decomposition", signal), ("adequacy_decomposition", adequacy), ("mc_uncertainty_summary", uncertainty)):
        (DATA / f"var_lag_characterization_{name}.json").write_text(json.dumps(doc, indent=1 if name != "mc_uncertainty_summary" else 2) + "\n")
    print(json.dumps({"status": "complete", "cells": len(cells), "infeasible_cells": len(infeasible), "total_replications": total}))


if __name__ == "__main__":
    main()
