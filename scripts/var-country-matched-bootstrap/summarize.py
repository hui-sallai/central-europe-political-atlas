#!/usr/bin/env python3
"""v1.89 summaries and preregistered classification from completed checkpoints (never simulates).
Usage: summarize.py --checkpoint-dir DIR"""
import argparse
import hashlib
import json
from collections import Counter
from math import sqrt
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "ac42c4e568f39e582d8720967bb45a1bf88af93ba70f5e52f54c9fef23a5863a"
Z = 1.959963984540054
INTERMEDIATE = ("p2_psi0.75", "p2_psi1.00", "p2_psi1.25")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prop(k, n):
    if n == 0:
        return {"count": k, "n": 0, "rate": None, "mcse": None, "wilson_95": None}
    p = k / n
    c = (p + Z * Z / (2 * n)) / (1 + Z * Z / n)
    h = Z * sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / (1 + Z * Z / n)
    return {"count": k, "n": n, "rate": p, "mcse": sqrt(p * (1 - p) / n), "wilson_95": [max(0.0, c - h), min(1.0, c + h)]}


def load(root, cell, spec):
    records = []
    for chunk_index, start in enumerate(range(0, spec["replications"], spec["chunk"])):
        path = root / cell["phase"] / f"cell-{cell['cell_index']:03d}" / f"chunk-{chunk_index:03d}.json"
        if not path.exists():
            raise SystemExit(f"missing checkpoint {path}")
        payload = json.loads(path.read_text())
        if payload["cell_id"] != cell["cell_id"] or payload["start"] != start or payload["data_spawn_key"] != [spec["code"], cell["cell_index"], chunk_index, 0]:
            raise SystemExit(f"checkpoint identity mismatch {path}")
        records.extend(payload["records"])
    if len(records) != spec["replications"]:
        raise SystemExit(f"replication count {cell['cell_id']}")
    return records


def summarize_cell(cell, records):
    true_lag = cell["true_lag"]
    ok = [r for r in records if r["bootstrap"]["state"] == "ok"]
    lag_counts = Counter(r["selected_lag"] for r in records)
    boot_lags = Counter()
    for r in ok:
        for k, v in r["bootstrap"]["boot_lag_counts"].items():
            boot_lags[k] += v

    def rates(subset):
        return {"bootstrap": prop(sum(r["bootstrap"]["reject"] for r in subset), len(subset)), "asymptotic": prop(sum(r["asymptotic_reject"] for r in subset), len(subset))}

    out = {k: cell[k] for k in ("cell_id", "phase", "design", "true_lag", "persistence", "covariance", "deterministic_spec", "alternative", "strength")}
    if "population" in cell:
        out["psi_at_137"] = cell["population"]["psi_at_137"]
    out.update({"replications": len(records), "computational_failures": len(records) - len(ok), "failure_rate": (len(records) - len(ok)) / len(records),
                "bic_selected_lag_counts": {str(k): lag_counts[k] for k in sorted(lag_counts)},
                "bic_exact_recovery": prop(lag_counts.get(true_lag, 0), len(records)),
                "bootstrap_selected_lag_counts": {k: boot_lags[k] for k in sorted(boot_lags, key=int)},
                "all": rates(ok),
                "adequate_selected_model": rates([r for r in ok if r["selected_lag"] >= true_lag]),
                "correct_recovery": rates([r for r in ok if r["selected_lag"] == true_lag]),
                "underselection": rates([r for r in ok if r["selected_lag"] < true_lag]),
                "overselection": rates([r for r in ok if r["selected_lag"] > true_lag])})
    return out


def classify(null_cells, power_cells):
    evaluable = [c for c in null_cells if c["adequate_selected_model"]["bootstrap"]["n"] >= 500]
    rates = [c["adequate_selected_model"]["bootstrap"]["rate"] for c in evaluable]
    inside = sum(0.035 <= r <= 0.065 for r in rates)
    nominal = all(r <= 0.075 for r in rates) and inside / len(rates) >= 0.9
    inter = [c for c in evaluable if c["design"] in INTERMEDIATE]
    conservative_cells = [c for c in inter if c["adequate_selected_model"]["bootstrap"]["rate"] < 0.035 and c["adequate_selected_model"]["bootstrap"]["wilson_95"][1] < 0.05]
    if nominal:
        size_status = "approximately_nominal"
    elif all(r <= 0.075 for r in rates) and inter and len(conservative_cells) / len(inter) >= 0.25:
        size_status = "materially_conservative"
    else:
        size_status = "poorly_calibrated"
    medians = {}
    for alt in ("common_ar1", "seasonal_ar12"):
        for s in (0.1, 0.2, 0.3):
            vals = [c["all"]["bootstrap"]["rate"] for c in power_cells if c["alternative"] == alt and c["strength"] == s]
            medians[f"{alt}@{s}"] = median(vals)
    useful = all(medians[f"{a}@0.3"] >= 0.80 and medians[f"{a}@0.2"] >= 0.50 for a in ("common_ar1", "seasonal_ar12"))
    power_status = "useful" if useful else "weak"
    outcome = {"approximately_nominal": "A" if useful else "E", "materially_conservative": "B" if useful else "C", "poorly_calibrated": "D"}[size_status]
    return {
        "evaluable_null_cells": len(evaluable), "non_evaluable_null_cells": [c["cell_id"] for c in null_cells if c not in evaluable],
        "primary_size_inside_interval": inside, "primary_size_fraction_inside": inside / len(rates), "primary_size_range": [min(rates), max(rates)],
        "primary_size_max_abs_distortion": max(abs(r - 0.05) for r in rates),
        "intermediate_evaluable_cells": len(inter), "intermediate_materially_conservative_cells": [c["cell_id"] for c in conservative_cells],
        "size_status": size_status, "power_median_bootstrap_rejection": medians, "power_status": power_status, "outcome": outcome,
        "disposition": "country_matched_calibration_supports_future_production_decision_research" if outcome in ("A", "B") else "country_matched_calibration_does_not_support_production_adoption",
        "production_change_authorized": False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    args = parser.parse_args()
    if sha(DATA / "var_country_matched_bootstrap_preregistration.json") != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch")
    design = json.loads((DATA / "var_country_matched_bootstrap_simulation_design.json").read_text())
    summaries = {"null": [], "power": []}
    for cell in design["cells"]:
        if cell["feasible"]:
            summaries[cell["phase"]].append(summarize_cell(cell, load(args.checkpoint_dir, cell, design["phases"][cell["phase"]])))
    common = {"generated_at": "2026-09-28", "preregistration_sha256": PREREG_SHA256, "actual_country_data_read": False, "production_changed": False}
    classification = classify(summaries["null"], summaries["power"])
    null_doc = {"schema_version": "var-country-matched-bootstrap-null-results-v1.89", **common, "labels": {"adequate_selected_model": "primary size estimand", "correct_recovery": "conservatism focus", "all": "selection-aware procedure rejection rate (not size)"}, "cells": summaries["null"]}
    power_doc = {"schema_version": "var-country-matched-bootstrap-power-results-v1.89", **common, "cells": summaries["power"]}

    def region_table(cells, key):
        rows = []
        for design_id in sorted({c["design"] for c in cells}):
            sub = [c for c in cells if c["design"] == design_id]
            vals = [c[key]["bootstrap"]["rate"] for c in sub if c[key]["bootstrap"]["n"] >= 200]
            avals = [c[key]["asymptotic"]["rate"] for c in sub if c[key]["asymptotic"]["n"] >= 200]
            rows.append({"design": design_id, "cells": len(sub), "cells_with_n_ge_200": len(vals), "bootstrap_range": [min(vals), max(vals)] if vals else None,
                         "asymptotic_range": [min(avals), max(avals)] if avals else None,
                         "bic_exact_recovery_range": [min(c["bic_exact_recovery"]["rate"] for c in sub), max(c["bic_exact_recovery"]["rate"] for c in sub)]})
        return rows

    summary = {"schema_version": "var-country-matched-bootstrap-calibration-summary-v1.89", **common, "classification": classification,
               "null_by_design_primary_size": region_table(summaries["null"], "adequate_selected_model"),
               "null_by_design_correct_recovery": region_table(summaries["null"], "correct_recovery"),
               "null_by_design_procedure_rate": region_table(summaries["null"], "all"),
               "power_by_alternative": [{"alternative": a, "strength": s, "bootstrap_rejection_range": [min(v), max(v)], "bootstrap_median": median(v), "asymptotic_median": median(av)}
                                        for a in ("common_ar1", "seasonal_ar12") for s in (0.1, 0.2, 0.3)
                                        for v, av in [([c["all"]["bootstrap"]["rate"] for c in summaries["power"] if c["alternative"] == a and c["strength"] == s],
                                                       [c["all"]["asymptotic"]["rate"] for c in summaries["power"] if c["alternative"] == a and c["strength"] == s])]],
               "computational_failures": {"null": sum(c["computational_failures"] for c in summaries["null"]), "power": sum(c["computational_failures"] for c in summaries["power"])},
               "max_mcse_primary_size": max(c["adequate_selected_model"]["bootstrap"]["mcse"] for c in summaries["null"] if c["adequate_selected_model"]["bootstrap"]["mcse"] is not None)}
    for name, doc in (("null_results", null_doc), ("power_results", power_doc), ("calibration_summary", summary)):
        (DATA / f"var_country_matched_bootstrap_{name}.json").write_text(json.dumps(doc, indent=1 if name != "calibration_summary" else 2) + "\n")
    print(json.dumps({k: classification[k] for k in ("size_status", "power_status", "outcome", "disposition")}, indent=1))


if __name__ == "__main__":
    main()
