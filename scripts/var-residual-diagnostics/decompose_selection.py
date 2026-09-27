#!/usr/bin/env python3
"""v1.851 Layer-B lag-selection decomposition, derived from the frozen v1.85 simulation results.

Reads one frozen JSON file and writes one derived JSON file. It draws no random numbers, fits no VAR,
reruns no simulation and reads no country data. Output is byte-deterministic for a given source file.
Usage: decompose_selection.py [--check]   (--check compares the derivation with the committed artifact)
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
SOURCE = DATA / "var_residual_diagnostic_simulation_results.json"
OUTPUT = DATA / "var_residual_diagnostic_layerB_selection_decomposition.json"
SOURCE_SHA256 = "04cc4ad5f8395f894a4c9c164fc8374841b6eb20c97dc4a8c4d7098dc6912a7e"
GENERATED_AT = "2026-09-28"
TESTS = ("pt_adjusted", "bg_lm", "edgerton_shukur_f")
HORIZON = "12"
STRICT = (0.035, 0.065)
JOINT_DISTRIBUTION_NOTE = (
    "Cell-level selected-lag frequencies and overall rejection rates are observed, but their replication-level "
    "joint distribution was not retained; conditional rejection rates cannot be reconstructed from the frozen "
    "aggregate artifact."
)


def require(condition, message):
    if not condition:
        raise SystemExit(f"decomposition failed: {message}")


def rate(numerator, denominator):
    return numerator / denominator if denominator else None


def rejection(cell, test):
    block = cell["diagnostics"][test][HORIZON]
    require(block["rejections"] + 0 <= block["tested"], f"{cell['cell_id']} {test} counts")
    return {"rejections": block["rejections"], "tested": block["tested"], "rate": block["empirical_rejection_rate"]}


def selection_row(cell):
    design = cell["design"]
    true_lag = design["true_lag"]
    counts = {int(k): v for k, v in cell["selected_lag_counts"].items()}
    total = sum(counts.values())
    require(total == cell["replications"], f"{cell['cell_id']} selected-lag counts do not sum to replications")
    correct = counts.get(true_lag, 0)
    under = sum(v for k, v in counts.items() if k < true_lag)
    over = sum(v for k, v in counts.items() if k > true_lag)
    return {
        "cell_id": cell["cell_id"],
        "sample_size": design["sample_size"],
        "true_lag": true_lag,
        "persistence": design["persistence"],
        "deterministic_spec": design["deterministic_spec"],
        "replications": cell["replications"],
        "selected_lag_counts": {str(k): counts[k] for k in sorted(counts)},
        "correct_selection_count": correct,
        "underselection_count": under,
        "overselection_count": over,
        "correct_selection_rate": correct / total,
        "underselection_rate": under / total,
        "overselection_rate": over / total,
        "parameter_gate_passed": cell["parameter_gate_passed"],
        "h12_rejection": {test: rejection(cell, test) for test in TESTS},
        "pt_h12_rejection_rate": cell["diagnostics"]["pt_adjusted"][HORIZON]["empirical_rejection_rate"],
        "bg_h12_rejection_rate": cell["diagnostics"]["bg_lm"][HORIZON]["empirical_rejection_rate"],
        "es_h12_rejection_rate": cell["diagnostics"]["edgerton_shukur_f"][HORIZON]["empirical_rejection_rate"],
    }


def pooled(rows):
    reps = sum(r["replications"] for r in rows)
    out = {
        "cell_count": len(rows),
        "replications": reps,
        "pooled_correct_selection_rate": rate(sum(r["correct_selection_count"] for r in rows), reps),
        "pooled_underselection_rate": rate(sum(r["underselection_count"] for r in rows), reps),
        "pooled_overselection_rate": rate(sum(r["overselection_count"] for r in rows), reps),
        "cell_correct_selection_rate_range": [min(r["correct_selection_rate"] for r in rows), max(r["correct_selection_rate"] for r in rows)],
        "cell_underselection_rate_range": [min(r["underselection_rate"] for r in rows), max(r["underselection_rate"] for r in rows)],
        "cell_overselection_rate_range": [min(r["overselection_rate"] for r in rows), max(r["overselection_rate"] for r in rows)],
        "h12_rejection_rate_range": {},
        "h12_cells_inside_0_035_to_0_065": {},
    }
    for test in TESTS:
        values = [r["h12_rejection"][test]["rate"] for r in rows]
        out["h12_rejection_rate_range"][test] = [min(values), max(values)]
        out["h12_cells_inside_0_035_to_0_065"][test] = sum(STRICT[0] <= x <= STRICT[1] for x in values)
    return out


def grouped(rows, key):
    values = sorted({r[key] for r in rows})
    return {str(v): pooled([r for r in rows if r[key] == v]) for v in values}


def layer_a_summary(cells):
    out = {}
    for test in TESTS:
        rates = [c["diagnostics"][test][HORIZON]["empirical_rejection_rate"] for c in cells]
        inside = sum(STRICT[0] <= x <= STRICT[1] for x in rates)
        out[test] = {
            "cell_count": len(cells),
            "cells_inside_0_035_to_0_065": inside,
            "minimum_rejection_rate": min(rates),
            "maximum_rejection_rate": max(rates),
            "all_cells_at_or_below_0_075": all(x <= 0.075 for x in rates),
            "layer_A_gate_components_met": inside / len(cells) >= 0.9 and all(x <= 0.075 for x in rates),
        }
    return out


def derive():
    raw = SOURCE.read_bytes()
    source_sha = hashlib.sha256(raw).hexdigest()
    require(source_sha == SOURCE_SHA256, f"source SHA256 mismatch: {source_sha}")
    results = json.loads(raw)
    primary = results["phases"]["primary"]
    require(len(primary) == 72, "expected 72 primary cells")
    layer_a = [c for c in primary if c["design"]["layer"] == "A"]
    layer_b = [c for c in primary if c["design"]["layer"] == "B"]
    require(len(layer_a) == 36 and len(layer_b) == 36, "expected 36 Layer A and 36 Layer B cells")
    require(all(set(c["selected_lag_counts"]) == {str(c["design"]["true_lag"])} for c in layer_a), "Layer A must estimate at the true lag")
    rows = [selection_row(c) for c in layer_b]

    by_true_lag = {}
    for lag in sorted({r["true_lag"] for r in rows}):
        subset = [r for r in rows if r["true_lag"] == lag]
        by_true_lag[str(lag)] = {
            **pooled(subset),
            "by_deterministic_spec": grouped(subset, "deterministic_spec"),
            "by_sample_size": grouped(subset, "sample_size"),
            "by_persistence": grouped(subset, "persistence"),
        }

    worst_es = max(rows, key=lambda r: (r["es_h12_rejection_rate"], r["cell_id"]))
    return {
        "schema_version": "var-residual-diagnostic-layerB-selection-decomposition-v1.851",
        "classification": "derived_from_frozen_v1_85_simulation",
        "not_new_research_draws": True,
        "generated_at": GENERATED_AT,
        "source": {
            "path": "src/data/macro/var_residual_diagnostic_simulation_results.json",
            "source_sha256": source_sha,
            "schema_version": results["schema_version"],
        },
        "derivation_script": "scripts/var-residual-diagnostics/decompose_selection.py",
        "derivation_command": "pnpm var:residual-decompose",
        "new_random_draws": 0,
        "simulation_reruns": 0,
        "var_reestimations": 0,
        "actual_country_data_read": False,
        "diagnostic_horizon": int(HORIZON),
        "selection_categories": {
            "correct": "selected lag == true lag",
            "underselection": "selected lag < true lag",
            "overselection": "selected lag > true lag",
        },
        "replication_level_joint_crosstab_available": False,
        "conditional_rejection_rates_reconstructable": False,
        "joint_distribution_note": JOINT_DISTRIBUTION_NOTE,
        "metric_semantics": {
            "layer_A": "conditional_diagnostic_size",
            "layer_B": "selection_plus_specification_plus_diagnostic_procedure_rejection",
            "layer_B_pure_size_identified": False,
            "reason": "Layer A estimates the true lag, so under the null DGP each rejection is a Type-I error of the diagnostic. Layer B first selects the lag by BIC; when the selected lag is below the true lag the fitted VAR is underfitted and residual whiteness need not hold, so Layer B rejections are not all Type-I errors.",
        },
        "layer_A_summary": layer_a_summary(layer_a),
        "layer_B_cell_count": len(rows),
        "layer_B_cells": rows,
        "layer_B_by_true_lag": by_true_lag,
        "worst_layer_B_es_cell": {
            "cell_id": worst_es["cell_id"],
            "selected_lag_counts": worst_es["selected_lag_counts"],
            "underselection_rate": worst_es["underselection_rate"],
            "es_h12_rejection_rate": worst_es["es_h12_rejection_rate"],
            "interpretation": "该 cell 的高 rejection frequency 与几乎完全的 lag underselection 同时出现。No share of ES rejections can be attributed to underselection because the replication-level joint distribution was not retained.",
        },
        "decision_boundary": {
            "v1_85_method_decision_changed": False,
            "disposition": "no_eligible_replacement",
            "phase_B_authorized": False,
            "es_activated": False,
            "note": "The preregistered selection rule requires the joint Layer A + Layer B procedure gate. This decomposition clarifies interpretation only and cannot change eligibility.",
        },
    }


def serialize(payload):
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def main():
    text = serialize(derive())
    if "--check" in sys.argv:
        require(OUTPUT.exists(), "committed decomposition artifact is missing")
        require(OUTPUT.read_text() == text, "committed decomposition artifact differs from deterministic derivation")
        print(json.dumps({"status": "pass", "deterministic_rederivation_identical": True}))
        return
    OUTPUT.write_text(text)
    print(f"written {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
