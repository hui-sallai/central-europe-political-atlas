#!/usr/bin/env python3
"""v1.86 aggregation, preregistered gate evaluation, A-D decomposition and method decision.

Reads completed checkpoints only (never simulates). Usage: calibrate.py --checkpoint-dir DIR [--out-dir DIR]
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from scipy.stats import beta

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = ROOT / "src" / "data" / "macro"
import importlib.util
import sys

# The v1.86 driver shares its file name with the frozen v1.85 simulate.py (imported by engine.py),
# so it is loaded under a distinct module name.
_spec = importlib.util.spec_from_file_location("v186_simulate", HERE / "simulate.py")
_driver = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_driver)
CHUNK_SIZE, PHASES, PREREG_SHA256, cells_for = _driver.CHUNK_SIZE, _driver.PHASES, _driver.PREREG_SHA256, _driver.cells_for

FAMILIES = ("recursive_iid_residual", "recursive_wild_rademacher")
STRICT = (0.035, 0.065)
MAXIMUM = 0.075
SUPPORT_MINIMUM = 2500
SUPPORT_CELLS_MINIMUM = 12
FAILURE_MAXIMUM = 0.01
ALPHA = 0.05


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clopper_pearson(k: int, n: int) -> list[float] | None:
    if n == 0:
        return None
    lower = 0.0 if k == 0 else float(beta.ppf(0.025, k, n - k + 1))
    upper = 1.0 if k == n else float(beta.ppf(0.975, k + 1, n - k))
    return [lower, upper]


def rate_block(rejections: int, tested: int) -> dict:
    rate = rejections / tested if tested else None
    return {"rejections": rejections, "tested": tested, "rate": rate,
            "monte_carlo_standard_error": (rate * (1 - rate) / tested) ** 0.5 if tested else None,
            "clopper_pearson_95": clopper_pearson(rejections, tested)}


def category(selected: int, true_lag: int) -> str:
    return "correct" if selected == true_lag else ("under" if selected < true_lag else "over")


def load_cell(checkpoints: Path, phase: str, cell_index: int, cell: dict, expected_sha: dict) -> list[dict]:
    spec = PHASES[phase]
    records = []
    for chunk_index, start in enumerate(range(0, spec["replications"], CHUNK_SIZE)):
        path = checkpoints / phase / f"cell-{cell_index:02d}" / f"chunk-{chunk_index:03d}.json"
        if not path.exists():
            raise SystemExit(f"missing checkpoint {path.relative_to(checkpoints)}")
        payload = json.loads(path.read_text())
        if payload["cell"] != cell or payload["chunk_index"] != chunk_index or payload["replication_start"] != start:
            raise SystemExit(f"checkpoint identity mismatch {path.name}")
        if payload["data_spawn_key"] != [spec["code"], cell_index, chunk_index, 0]:
            raise SystemExit(f"spawn key mismatch {path.name}")
        if payload["engine_sha256"] != expected_sha["engine"] or payload["driver_sha256"] != expected_sha["driver"]:
            raise SystemExit(f"code hash mismatch {path.name}")
        records.extend(payload["records"])
    if [r["replication"] for r in records] != list(range(spec["replications"])):
        raise SystemExit(f"replication sequence mismatch {phase} cell {cell_index}")
    return records


def aggregate_cell(cell: dict, records: list[dict], procedures: tuple[str, ...]) -> dict:
    true_lag = cell["true_lag"]
    selection = Counter(r["selected_lag"] for r in records)
    categories = Counter(category(r["selected_lag"], true_lag) for r in records)
    out = {"cell_id": cell["cell_id"], "design": cell, "replications": len(records),
           "selected_lag_counts": {str(k): selection[k] for k in sorted(selection)},
           "selection_category_counts": {c: categories.get(c, 0) for c in ("correct", "under", "over")}, "procedures": {}}
    for procedure in procedures:
        out["procedures"][procedure] = {}
        for family in FAMILIES:
            results = [(r["selected_lag"], r["procedures"][procedure][family]) for r in records]
            ok = [(lag, res) for lag, res in results if res["state"] == "ok"]
            failures = Counter(res["state"] for _, res in results if res["state"] != "ok")
            boot_lags = Counter()
            boot_by_original: dict[str, Counter] = {}
            for lag, res in ok:
                for bl, c in res["boot_lag_counts"].items():
                    boot_lags[bl] += c
                    boot_by_original.setdefault(str(lag), Counter())[bl] += c
            by_category = {c: rate_block(sum(res["reject"] for lag, res in ok if category(lag, true_lag) == c), sum(1 for lag, _ in ok if category(lag, true_lag) == c)) for c in ("correct", "under", "over")}
            adequate = [res for lag, res in ok if lag >= true_lag]
            by_lag = {str(l): rate_block(sum(res["reject"] for lag, res in ok if lag == l), sum(1 for lag, _ in ok if lag == l)) for l in sorted({lag for lag, _ in ok})}
            out["procedures"][procedure][family] = {
                "overall": rate_block(sum(res["reject"] for _, res in ok), len(ok)),
                "failure_count": sum(failures.values()), "failure_rate": sum(failures.values()) / len(results), "failure_states": dict(failures),
                "by_selection_category": by_category,
                "adequate_selected_model": rate_block(sum(res["reject"] for res in adequate), len(adequate)),
                "by_selected_lag": by_lag,
                "bootstrap_selected_lag_counts": {k: boot_lags[k] for k in sorted(boot_lags, key=int)},
                "bootstrap_selected_lag_counts_by_original_lag": {o: {k: v[k] for k in sorted(v, key=int)} for o, v in sorted(boot_by_original.items())},
            }
    return out


def gate_metrics(rates: list[float]) -> dict:
    inside = sum(STRICT[0] <= x <= STRICT[1] for x in rates)
    return {"cell_count": len(rates), "cells_inside_strict_interval": inside, "fraction_inside_strict_interval": inside / len(rates) if rates else None,
            "minimum_rate": min(rates) if rates else None, "maximum_rate": max(rates) if rates else None,
            "worst_case_absolute_distortion": max(abs(x - ALPHA) for x in rates) if rates else None,
            "every_cell_at_or_below_0_075": all(x <= MAXIMUM for x in rates), "at_least_90_percent_inside": bool(rates) and inside / len(rates) >= 0.9}


def evaluate_family(primary: list[dict], family: str) -> dict:
    a_rates = [c["procedures"]["fixed_true_lag"][family]["overall"]["rate"] for c in primary]
    gate_a = gate_metrics(a_rates)
    gate_a["passed"] = gate_a["every_cell_at_or_below_0_075"] and gate_a["at_least_90_percent_inside"] and len(a_rates) == 36
    support = [c for c in primary if c["procedures"]["selection_aware"][family]["adequate_selected_model"]["tested"] >= SUPPORT_MINIMUM]
    c_rates = [c["procedures"]["selection_aware"][family]["adequate_selected_model"]["rate"] for c in support]
    gate_c = gate_metrics(c_rates)
    gate_c["support_cells"] = [c["cell_id"] for c in support]
    gate_c["support_cell_count"] = len(support)
    gate_c["passed"] = len(support) >= SUPPORT_CELLS_MINIMUM and gate_c["every_cell_at_or_below_0_075"] and gate_c["at_least_90_percent_inside"]
    worst_failure = max(max(c["procedures"][p][family]["failure_rate"] for p in ("selection_aware", "fixed_true_lag")) for c in primary)
    gate_f = {"maximum_failure_rate": worst_failure, "passed": worst_failure <= FAILURE_MAXIMUM}
    union = a_rates + c_rates
    d_rates = [c["procedures"]["selection_aware"][family]["overall"]["rate"] for c in primary]
    return {"family_id": family, "gate_A_fixed_true_lag": gate_a, "gate_C_adequacy_conditional": gate_c, "gate_failure_rate": gate_f,
            "eligible": gate_a["passed"] and gate_c["passed"] and gate_f["passed"],
            "worst_case_absolute_distortion_gate_union": max(abs(x - ALPHA) for x in union),
            "full_procedure_D_report_only": {**gate_metrics(d_rates), "label": "selection-aware procedure rejection rate (not diagnostic test size)"}}


def decide(families: dict) -> dict:
    eligible = [f for f in FAMILIES if families[f]["eligible"]]
    if not eligible:
        selected, disposition = "none", "no_eligible_selection_aware_bootstrap"
    else:
        if len(eligible) == 1:
            selected = eligible[0]
        else:
            a, b = (families[f]["worst_case_absolute_distortion_gate_union"] for f in FAMILIES)
            selected = "recursive_iid_residual" if abs(a - b) < 0.005 else min(FAMILIES, key=lambda f: families[f]["worst_case_absolute_distortion_gate_union"])
        disposition = "synthetic_gate_passed_phase_B_requires_owner_approval"
    return {"disposition": disposition, "selected_family": selected, "eligible_families": eligible}


def decomposition(primary: list[dict]) -> list[dict]:
    rows = []
    for c in primary:
        n = c["replications"]
        row = {"cell_id": c["cell_id"], "true_lag": c["design"]["true_lag"], "sample_size": c["design"]["sample_size"], "persistence": c["design"]["persistence"],
               "deterministic_spec": c["design"]["deterministic_spec"],
               "B_selection": {"counts": c["selection_category_counts"], "rates": {k: v / n for k, v in c["selection_category_counts"].items()}, "selected_lag_counts": c["selected_lag_counts"]},
               "families": {}}
        for family in FAMILIES:
            sa, fl = c["procedures"]["selection_aware"][family], c["procedures"]["fixed_true_lag"][family]
            row["families"][family] = {
                "A_fixed_true_lag_rejection": fl["overall"],
                "A_selection_aware_given_correct_lag": sa["by_selection_category"]["correct"],
                "B_bootstrap_selected_lag_counts": sa["bootstrap_selected_lag_counts"],
                "C_selection_aware_by_category": sa["by_selection_category"],
                "C_selection_aware_by_selected_lag": sa["by_selected_lag"],
                "C_adequate_selected_model": sa["adequate_selected_model"],
                "D_selection_aware_procedure_rejection": sa["overall"],
            }
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=DATA)
    args = parser.parse_args()
    prereg = DATA / "var_selection_bootstrap_preregistration.json"
    if sha(prereg) != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch")
    design = json.loads((DATA / "var_selection_bootstrap_simulation_design.json").read_text())
    expected = {"engine": design["code_sha256"]["scripts/var-selection-aware-bootstrap/engine.py"], "driver": design["code_sha256"]["scripts/var-selection-aware-bootstrap/simulate.py"]}
    phases = {}
    for phase in ("primary", "secondary_t5", "power"):
        cells = cells_for(phase)
        phases[phase] = [aggregate_cell(cell, load_cell(args.checkpoint_dir, phase, i, cell, expected), PHASES[phase]["procedures"]) for i, cell in enumerate(cells)]
    total = sum(c["replications"] for cells in phases.values() for c in cells)
    common = {"generated_at": "2026-09-28", "preregistration_sha256": PREREG_SHA256, "actual_country_data_read": False}
    results = {"schema_version": "var-selection-bootstrap-simulation-results-v1.86", **common, "total_monte_carlo_replications": total,
               "bootstrap_replications": 199, "phases": phases}
    families = {f: evaluate_family(phases["primary"], f) for f in FAMILIES}
    decision = decide(families)
    summary = {"schema_version": "var-selection-bootstrap-calibration-summary-v1.86", **common, "estimand": "selected_model_adequacy", "nominal_alpha": ALPHA,
               "strict_interval": list(STRICT), "maximum_allowed_rate": MAXIMUM, "support_minimum": SUPPORT_MINIMUM, "families": families,
               "secondary_and_power_used_for_selection": False}
    decomposition_doc = {"schema_version": "var-selection-bootstrap-selection-decomposition-v1.86", **common,
                         "labels": {"A": "conditional-on-correct-lag behaviour", "B": "lag-selection error and bootstrap lag distribution", "C": "rejection conditional on selected lag (replication-level)", "D": "selection-aware procedure rejection rate (not diagnostic test size)"},
                         "replication_level_joint_crosstab_available": True, "primary_cells": decomposition(phases["primary"])}
    decision_doc = {"schema_version": "var-selection-bootstrap-method-decision-v1.86", **common, **decision,
                    "family_eligibility": {f: families[f]["eligible"] for f in FAMILIES},
                    "phase_B_run": False, "phase_B_requires_owner_approval": True, "production_method_changed": False,
                    "actual_country_diagnostics_applied": False, "actual_country_readiness_changed": False, "formal_irf_publication_available": False}
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, doc in (("simulation_results", results), ("calibration_summary", summary), ("selection_decomposition", decomposition_doc), ("method_decision", decision_doc)):
        (args.out_dir / f"var_selection_bootstrap_{name}.json").write_text(json.dumps(doc, indent=1 if name == "simulation_results" else 2) + "\n")
    print(json.dumps({"status": "complete", "total_monte_carlo_replications": total, **decision}, indent=2))


if __name__ == "__main__":
    main()
