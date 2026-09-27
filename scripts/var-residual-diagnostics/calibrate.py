#!/usr/bin/env python3
"""Aggregate the preregistered VAR residual-diagnostic simulation."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.stats import beta

from simulate import HORIZONS, TESTS, power_cells, primary_cells, secondary_cells


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREGISTRATION = DATA / "var_residual_diagnostic_preregistration.json"
DESIGN = DATA / "var_residual_diagnostic_simulation_design.json"
SEED_REGISTRY = DATA / "var_residual_diagnostic_seed_registry.json"
RESULTS = DATA / "var_residual_diagnostic_simulation_results.json"
SUMMARY = DATA / "var_residual_diagnostic_calibration_summary.json"
DECISION = DATA / "var_residual_diagnostic_method_decision.json"

PHASES = {
    "primary": {"cells": primary_cells, "replications": 10_000, "chunks": 40, "purpose": 2},
    "secondary": {"cells": secondary_cells, "replications": 2_000, "chunks": 8, "purpose": 3},
    "power": {"cells": power_cells, "replications": 2_000, "chunks": 8, "purpose": 4},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def interval(rejections: int, tested: int) -> list[float]:
    lower = 0.0 if rejections == 0 else float(beta.ppf(0.025, rejections, tested - rejections + 1))
    upper = 1.0 if rejections == tested else float(beta.ppf(0.975, rejections + 1, tested - rejections))
    return [lower, upper]


def empty_counts() -> dict:
    return {
        test: {
            str(horizon): {"rejections": 0, "tested": 0, "not_tested": 0}
            for horizon in HORIZONS
        }
        for test in TESTS
    }


def checkpoint_path(root: Path, phase: str, cell_index: int, chunk_index: int) -> Path:
    return root / phase / f"cell-{cell_index:04d}" / f"chunk-{chunk_index:04d}.json"


def aggregate_phase(checkpoint_root: Path, phase: str) -> list[dict]:
    specification = PHASES[phase]
    cells = specification["cells"]()
    output = []
    for cell_index, registered_cell in enumerate(cells):
        counts = empty_counts()
        selected_lag_counts: dict[str, int] = {}
        parameter_gate_passed = 0
        for chunk_index in range(specification["chunks"]):
            path = checkpoint_path(checkpoint_root, phase, cell_index, chunk_index)
            if not path.exists():
                raise RuntimeError(f"missing checkpoint: {phase}/{cell_index}/{chunk_index}")
            checkpoint = json.loads(path.read_text(encoding="utf-8"))
            expected_start = chunk_index * 250
            expected_end = min(specification["replications"], expected_start + 250)
            expected_layer = 0 if registered_cell["layer"] == "A" else 1
            expected_spawn_key = [specification["purpose"], expected_layer, cell_index, chunk_index]
            checks = {
                "schema": checkpoint.get("schema_version") == "var-residual-diagnostic-checkpoint-v1.85",
                "phase": checkpoint.get("phase") == phase,
                "cell_index": checkpoint.get("cell_index") == cell_index,
                "cell": checkpoint.get("cell") == registered_cell,
                "chunk_index": checkpoint.get("chunk_index") == chunk_index,
                "replication_start": checkpoint.get("replication_start") == expected_start,
                "replication_end": checkpoint.get("replication_end") == expected_end,
                "spawn_key": checkpoint.get("spawn_key") == expected_spawn_key,
            }
            if not all(checks.values()):
                raise RuntimeError(f"checkpoint provenance mismatch {phase}/{cell_index}/{chunk_index}: {checks}")
            for test in TESTS:
                for horizon in HORIZONS:
                    key = str(horizon)
                    for field in ("rejections", "tested", "not_tested"):
                        counts[test][key][field] += int(checkpoint["counts"][test][key][field])
            for lag, count in checkpoint["selected_lag_counts"].items():
                selected_lag_counts[lag] = selected_lag_counts.get(lag, 0) + int(count)
            parameter_gate_passed += int(checkpoint["parameter_gate_passed"])

        diagnostics = {}
        for test in TESTS:
            diagnostics[test] = {}
            for horizon in HORIZONS:
                key = str(horizon)
                record = counts[test][key]
                tested = record["tested"]
                if tested <= 0:
                    rate = mcse = None
                    confidence_interval = None
                else:
                    rate = record["rejections"] / tested
                    mcse = float(np.sqrt(rate * (1.0 - rate) / tested))
                    confidence_interval = interval(record["rejections"], tested)
                diagnostics[test][key] = {
                    **record,
                    "empirical_rejection_rate": rate,
                    "monte_carlo_standard_error": mcse,
                    "clopper_pearson_95_interval": confidence_interval,
                }
        if sum(selected_lag_counts.values()) != specification["replications"]:
            raise RuntimeError(f"selected-lag count mismatch: {registered_cell['cell_id']}")
        output.append({
            "cell_index": cell_index,
            "cell_id": registered_cell["cell_id"],
            "design": registered_cell,
            "replications": specification["replications"],
            "selected_lag_counts": dict(sorted(selected_lag_counts.items(), key=lambda item: int(item[0]))),
            "parameter_gate_passed": parameter_gate_passed,
            "diagnostics": diagnostics,
        })
    return output


def method_metrics(primary: list[dict], test: str) -> dict:
    rates = [cell["diagnostics"][test]["12"]["empirical_rejection_rate"] for cell in primary]
    if any(rate is None for rate in rates):
        raise RuntimeError(f"untested primary h12 cell for {test}")
    inside = [0.035 <= rate <= 0.065 for rate in rates]
    maximum = max(rates)
    minimum = min(rates)
    worst_distortion = max(abs(rate - 0.05) for rate in rates)
    worst_index = max(range(len(rates)), key=lambda index: abs(rates[index] - 0.05))
    maximum_index = max(range(len(rates)), key=rates.__getitem__)
    eligible = maximum <= 0.075 and sum(inside) / len(inside) >= 0.90
    return {
        "test_id": test,
        "primary_cell_count": len(rates),
        "minimum_rejection_rate": minimum,
        "maximum_rejection_rate": maximum,
        "maximum_rate_cell_id": primary[maximum_index]["cell_id"],
        "worst_case_absolute_size_distortion": worst_distortion,
        "worst_case_cell_id": primary[worst_index]["cell_id"],
        "cells_inside_strict_interval": sum(inside),
        "fraction_inside_strict_interval": sum(inside) / len(inside),
        "every_primary_cell_at_or_below_0_075": maximum <= 0.075,
        "at_least_90_percent_inside_0_035_to_0_065": sum(inside) / len(inside) >= 0.90,
        "system_level_eligible": eligible,
    }


def choose_method(metrics: dict[str, dict]) -> tuple[str, str, list[str]]:
    pt = metrics["pt_adjusted"]
    if pt["system_level_eligible"]:
        return "retain_pt_adjusted", "pt_adjusted", [
            "Current adjusted Portmanteau passed the preregistered system-level size gate.",
            "The preregistered rule retains it regardless of alternatives' power or real-data implications.",
        ]
    alternatives = [test for test in ("bg_lm", "edgerton_shukur_f") if metrics[test]["system_level_eligible"]]
    if not alternatives:
        return "no_eligible_replacement", "none", [
            "Current adjusted Portmanteau failed the system-level size gate.",
            "Neither preregistered replacement candidate passed the identical gate.",
        ]
    if len(alternatives) == 1:
        selected = alternatives[0]
        return "replace_current_test", selected, [
            "Current adjusted Portmanteau failed the system-level size gate.",
            f"{selected} was the only replacement candidate to pass the identical gate.",
        ]
    bg = metrics["bg_lm"]["worst_case_absolute_size_distortion"]
    es = metrics["edgerton_shukur_f"]["worst_case_absolute_size_distortion"]
    if abs(bg - es) < 0.005:
        selected = "edgerton_shukur_f"
        explanation = "Both alternatives passed and their worst-case distortion difference was below 0.005; the preregistered ES tie-breaker applied."
    else:
        selected = "bg_lm" if bg < es else "edgerton_shukur_f"
        explanation = "Both alternatives passed; the candidate with smaller worst-case absolute size distortion was selected."
    return "replace_current_test", selected, [
        "Current adjusted Portmanteau failed the system-level size gate.", explanation
    ]


def summarize_report_only(cells: list[dict], phase: str) -> dict:
    summary = {}
    for test in TESTS:
        summary[test] = {}
        for horizon in HORIZONS:
            rates = [cell["diagnostics"][test][str(horizon)]["empirical_rejection_rate"] for cell in cells]
            valid = [rate for rate in rates if rate is not None]
            summary[test][str(horizon)] = {
                "cell_count": len(cells),
                "tested_cell_count": len(valid),
                "minimum_rate": min(valid) if valid else None,
                "median_rate": float(np.median(valid)) if valid else None,
                "maximum_rate": max(valid) if valid else None,
                "mean_rate": float(np.mean(valid)) if valid else None,
                "selection_role": "report_only",
            }
    return {"phase": phase, "diagnostics": summary}


def update_seed_registry() -> None:
    registry = json.loads(SEED_REGISTRY.read_text(encoding="utf-8"))
    status = {
        "primary_confirmatory": "used_complete_72_cells_40_chunks_each_10000_replications_each",
        "secondary_null_stress": "used_complete_288_cells_8_chunks_each_2000_replications_each",
        "power": "used_complete_432_cells_8_chunks_each_2000_replications_each",
    }
    for reservation in registry["reservations"]:
        if reservation["purpose"] in status:
            reservation["status"] = status[reservation["purpose"]]
    registry["used_spawn_key_ranges"] = [
        {"prefix": [2], "purpose": "primary_confirmatory", "cell_indices": [0, 71], "chunk_indices": [0, 39], "replication_indices_per_cell": [0, 9999], "status": "used_complete"},
        {"prefix": [3], "purpose": "secondary_null_stress", "cell_indices": [0, 287], "chunk_indices": [0, 7], "replication_indices_per_cell": [0, 1999], "status": "used_complete"},
        {"prefix": [4], "purpose": "power", "cell_indices": [0, 431], "chunk_indices": [0, 7], "replication_indices_per_cell": [0, 1999], "status": "used_complete"},
    ]
    registry["unused_prefixes"] = [[1], [5]]
    atomic_json(SEED_REGISTRY, registry)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    preregistration_hash = sha256(PREREGISTRATION)
    design_hash = sha256(DESIGN)
    phases = {phase: aggregate_phase(args.checkpoint_dir, phase) for phase in PHASES}
    metrics = {test: method_metrics(phases["primary"], test) for test in TESTS}
    disposition, selected, rationale = choose_method(metrics)

    results = {
        "schema_version": "var-residual-diagnostic-simulation-results-v1.85",
        "generated_at": generated_at,
        "starting_commit": "1b13fc1c8eaa804ef3b5ea5173c8ef01081afb3b",
        "preregistration_sha256": preregistration_hash,
        "simulation_design_sha256": design_hash,
        "candidate_tests": list(TESTS),
        "diagnostic_horizons": list(HORIZONS),
        "phase_counts": {
            phase: {"cells": len(cells), "replications": sum(cell["replications"] for cell in cells)}
            for phase, cells in phases.items()
        },
        "total_replications": sum(sum(cell["replications"] for cell in cells) for cells in phases.values()),
        "phases": phases,
        "actual_country_data_read": False,
        "selection_used_only_primary_h12_size": True,
    }
    summary = {
        "schema_version": "var-residual-diagnostic-calibration-summary-v1.85",
        "generated_at": generated_at,
        "preregistration_sha256": preregistration_hash,
        "primary_horizon": 12,
        "nominal_alpha": 0.05,
        "strict_interval": [0.035, 0.065],
        "maximum_allowed_rate": 0.075,
        "minimum_fraction_inside_strict_interval": 0.90,
        "primary_method_metrics": metrics,
        "primary_layer_breakdown": {
            layer: {
                test: method_metrics([cell for cell in phases["primary"] if cell["design"]["layer"] == layer], test)
                for test in TESTS
            }
            for layer in ("A", "B")
        },
        "secondary_null_stress": summarize_report_only(phases["secondary"], "secondary"),
        "serial_alternative_power": summarize_report_only(phases["power"], "power"),
        "power_used_for_selection": False,
        "sensitivity_h18_h24_used_for_selection": False,
    }
    decision = {
        "schema_version": "var-residual-diagnostic-method-decision-v1.85",
        "generated_at": generated_at,
        "phase": "A_synthetic_calibration_complete",
        "formal_release_version": "v1.84_unchanged",
        "disposition": disposition,
        "selected_method_for_possible_phase_B_evaluation": selected,
        "selection_rationale": rationale,
        "primary_method_metrics": metrics,
        "production_method_changed": False,
        "actual_country_diagnostics_applied": False,
        "actual_country_readiness_changed": False,
        "dynamic_responses_activated": False,
        "country_calibrated_stress_run": False,
        "owner_approval_required_before_phase_B": True,
        "push_or_deploy_performed": False,
        "research_stop_rule_applied": True,
    }
    atomic_json(RESULTS, results)
    atomic_json(SUMMARY, summary)
    atomic_json(DECISION, decision)
    update_seed_registry()
    print(json.dumps({
        "status": "complete",
        "total_replications": results["total_replications"],
        "disposition": disposition,
        "selected_method_for_possible_phase_B_evaluation": selected,
        "primary_method_metrics": metrics,
    }, indent=2))


if __name__ == "__main__":
    main()
