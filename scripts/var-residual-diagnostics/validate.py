#!/usr/bin/env python3
"""Independent closure checks for v1.85 Phase A."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime
from pathlib import Path

from scipy.stats import beta


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
FILES = {
    "preregistration": DATA / "var_residual_diagnostic_preregistration.json",
    "amendment": DATA / "var_residual_diagnostic_preregistration_amendment_001.json",
    "design": DATA / "var_residual_diagnostic_simulation_design.json",
    "seeds": DATA / "var_residual_diagnostic_seed_registry.json",
    "reference": DATA / "var_residual_diagnostic_reference_validation.json",
    "results": DATA / "var_residual_diagnostic_simulation_results.json",
    "summary": DATA / "var_residual_diagnostic_calibration_summary.json",
    "decision": DATA / "var_residual_diagnostic_method_decision.json",
}
TESTS = ("pt_adjusted", "bg_lm", "edgerton_shukur_f")
HORIZONS = (12, 18, 24)
PHASE_SPEC = {
    "primary": (72, 40, 10_000, 2),
    "secondary": (288, 8, 2_000, 3),
    "power": (432, 8, 2_000, 4),
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def independently_aggregate(checkpoint_root: Path, results: dict) -> dict:
    raw_primary = {test: [0] * 72 for test in TESTS}
    checkpoint_count = 0
    replication_count = 0
    seen_spawn_keys: set[tuple[int, ...]] = set()
    for phase, (cell_count, chunk_count, replications, purpose) in PHASE_SPEC.items():
        output_cells = results["phases"][phase]
        require(len(output_cells) == cell_count, f"{phase} output cell count mismatch")
        for cell_index in range(cell_count):
            independent = {
                test: {str(horizon): {"rejections": 0, "tested": 0, "not_tested": 0} for horizon in HORIZONS}
                for test in TESTS
            }
            selected_total = 0
            parameter_total = 0
            for chunk_index in range(chunk_count):
                path = checkpoint_root / phase / f"cell-{cell_index:04d}" / f"chunk-{chunk_index:04d}.json"
                require(path.exists(), f"missing checkpoint {phase}/{cell_index}/{chunk_index}")
                payload = load(path)
                start = chunk_index * 250
                end = min(replications, start + 250)
                expected_layer = 0 if payload["cell"]["layer"] == "A" else 1
                expected_spawn = (purpose, expected_layer, cell_index, chunk_index)
                actual_spawn = tuple(payload["spawn_key"])
                require(actual_spawn == expected_spawn, f"spawn key mismatch {actual_spawn} != {expected_spawn}")
                require(actual_spawn not in seen_spawn_keys, f"duplicate spawn key {actual_spawn}")
                seen_spawn_keys.add(actual_spawn)
                require(payload["phase"] == phase and payload["cell_index"] == cell_index, "checkpoint identity mismatch")
                require(payload["chunk_index"] == chunk_index, "checkpoint chunk mismatch")
                require(payload["replication_start"] == start and payload["replication_end"] == end, "checkpoint replication range mismatch")
                for test in TESTS:
                    for horizon in HORIZONS:
                        for field in ("rejections", "tested", "not_tested"):
                            independent[test][str(horizon)][field] += int(payload["counts"][test][str(horizon)][field])
                selected_total += sum(int(value) for value in payload["selected_lag_counts"].values())
                parameter_total += int(payload["parameter_gate_passed"])
                checkpoint_count += 1
                replication_count += end - start
            output = output_cells[cell_index]
            require(output["replications"] == replications, "output replication mismatch")
            require(selected_total == replications, "selected-lag total mismatch")
            require(sum(int(v) for v in output["selected_lag_counts"].values()) == replications, "output selected-lag total mismatch")
            require(output["parameter_gate_passed"] == parameter_total, "parameter gate total mismatch")
            for test in TESTS:
                for horizon in HORIZONS:
                    record = output["diagnostics"][test][str(horizon)]
                    source = independent[test][str(horizon)]
                    for field in ("rejections", "tested", "not_tested"):
                        require(record[field] == source[field], f"independent count mismatch {phase}/{cell_index}/{test}/{horizon}/{field}")
                    if source["tested"]:
                        rate = source["rejections"] / source["tested"]
                        mcse = math.sqrt(rate * (1 - rate) / source["tested"])
                        lower = 0.0 if source["rejections"] == 0 else float(beta.ppf(0.025, source["rejections"], source["tested"] - source["rejections"] + 1))
                        upper = 1.0 if source["rejections"] == source["tested"] else float(beta.ppf(0.975, source["rejections"] + 1, source["tested"] - source["rejections"]))
                        require(abs(record["empirical_rejection_rate"] - rate) < 1e-15, "rate mismatch")
                        require(abs(record["monte_carlo_standard_error"] - mcse) < 1e-15, "MCSE mismatch")
                        require(max(abs(record["clopper_pearson_95_interval"][0] - lower), abs(record["clopper_pearson_95_interval"][1] - upper)) < 1e-15, "interval mismatch")
                    if phase == "primary" and horizon == 12:
                        raw_primary[test][cell_index] = source["rejections"]
    require(checkpoint_count == 8_640, f"checkpoint count mismatch: {checkpoint_count}")
    require(replication_count == 2_160_000, f"replication count mismatch: {replication_count}")
    return {"checkpoint_count": checkpoint_count, "replication_count": replication_count, "raw_primary_rejections": raw_primary}


def independent_method_metrics(raw_primary: dict) -> dict:
    metrics = {}
    for test in TESTS:
        rates = [value / 10_000 for value in raw_primary[test]]
        inside = sum(0.035 <= rate <= 0.065 for rate in rates)
        maximum = max(rates)
        metrics[test] = {
            "maximum_rejection_rate": maximum,
            "worst_case_absolute_size_distortion": max(abs(rate - 0.05) for rate in rates),
            "cells_inside_strict_interval": inside,
            "fraction_inside_strict_interval": inside / 72,
            "system_level_eligible": maximum <= 0.075 and inside / 72 >= 0.90,
        }
    return metrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    documents = {name: load(path) for name, path in FILES.items()}
    preregistration = documents["preregistration"]
    amendment = documents["amendment"]
    design = documents["design"]
    seeds = documents["seeds"]
    reference = documents["reference"]
    results = documents["results"]
    summary = documents["summary"]
    decision = documents["decision"]

    require([item["test_id"] for item in preregistration["candidate_tests"]] == list(TESTS), "candidate list changed")
    require(preregistration["candidate_list_frozen"] is True and preregistration["fourth_test_prohibited"] is True, "candidate freeze failed")
    size_rule = preregistration["size_acceptance_rule"]
    require(size_rule["cell_size_acceptable_interval"] == [0.035, 0.065], "strict interval changed")
    require(size_rule["system_maximum_allowed_rejection_rate"] == 0.075, "maximum rate changed")
    require(size_rule["minimum_fraction_primary_cells_inside_strict_interval"] == 0.9, "minimum fraction changed")
    require(design["planned_total_confirmatory_replications"] == 2_160_000, "planned replication count changed")
    require(parse_time(preregistration["preregistered_at"]) < parse_time(results["generated_at"]), "results predate preregistration")
    require(amendment["change_type"] == "clerical_frozen_input_hash_correction_only", "amendment type changed")
    require(all(amendment[field] is False for field in ("research_design_changed", "candidate_tests_changed", "thresholds_changed", "seed_namespace_changed", "replication_counts_changed", "selection_rule_changed")), "amendment altered research design")
    require(results["preregistration_sha256"] == sha256(FILES["preregistration"]), "preregistration hash mismatch")
    require(results["simulation_design_sha256"] == sha256(FILES["design"]), "design hash mismatch")
    require(results["candidate_tests"] == list(TESTS), "result candidate list mismatch")
    require(results["diagnostic_horizons"] == list(HORIZONS), "diagnostic horizons changed")
    require(results["total_replications"] == 2_160_000, "result replication count mismatch")
    require(reference["status"] == "pass" and reference["case_count"] == 4, "reference validation failed")
    require(reference["maximum_numerical_discrepancy"] <= reference["registered_absolute_tolerance"], "reference tolerance failed")
    require(reference["fallback_tolerance_used"] is False, "fallback tolerance was used")
    require(all(reference["case_4_all_tests_reject_at_0_05"].values()), "reference alternative fixture failed")

    independent = independently_aggregate(args.checkpoint_dir, results)
    independent_metrics = independent_method_metrics(independent["raw_primary_rejections"])
    for test in TESTS:
        recorded = summary["primary_method_metrics"][test]
        for field in ("maximum_rejection_rate", "worst_case_absolute_size_distortion", "fraction_inside_strict_interval"):
            require(abs(recorded[field] - independent_metrics[test][field]) < 1e-15, f"independent metric mismatch {test}/{field}")
        require(recorded["cells_inside_strict_interval"] == independent_metrics[test]["cells_inside_strict_interval"], f"inside-count mismatch {test}")
        require(recorded["system_level_eligible"] == independent_metrics[test]["system_level_eligible"], f"eligibility mismatch {test}")

    require(not any(item["system_level_eligible"] for item in independent_metrics.values()), "unexpected eligible method")
    require(decision["disposition"] == "no_eligible_replacement", "decision does not follow preregistration")
    require(decision["selected_method_for_possible_phase_B_evaluation"] == "none", "method selected despite gate failure")
    require(decision["formal_release_version"] == "v1.84_unchanged", "formal release version changed")
    require(decision["owner_approval_required_before_phase_B"] is True, "Phase B owner gate missing")
    require(summary["power_used_for_selection"] is False and summary["sensitivity_h18_h24_used_for_selection"] is False, "prohibited selection input used")
    for field in ("production_method_changed", "actual_country_diagnostics_applied", "actual_country_readiness_changed", "dynamic_responses_activated", "country_calibrated_stress_run", "push_or_deploy_performed"):
        require(decision[field] is False, f"prohibition failed: {field}")
    require(results["actual_country_data_read"] is False, "actual-country data was read")

    for relative_path, registered_hash in preregistration["frozen_input_sha256"].items():
        require(sha256(ROOT / relative_path) == registered_hash, f"frozen file changed: {relative_path}")
    require(seeds["base_entropy"] == [185, 20260927, 1], "seed entropy changed")
    require(seeds["unused_prefixes"] == [[1], [5]], "unused seed prefix drift")
    require([item["prefix"] for item in seeds["used_spawn_key_ranges"]] == [[2], [3], [4]], "used seed range record mismatch")
    require(not any(str(Path.home()) in path.read_text(encoding="utf-8") for path in FILES.values()), "personal path found in generated research artifact")
    simulation_sources = [
        ROOT / "scripts" / "var-residual-diagnostics" / "simulate.py",
        ROOT / "scripts" / "var-residual-diagnostics" / "calibrate.py",
    ]
    prohibited_inputs = ("var_country_readiness.json", "var_baseline_v1_readiness.json", "var_baseline_v2_readiness.json", "var_exploratory_readiness.json", "var_lag_diagnostic_grid.json")
    require(not any(token in path.read_text(encoding="utf-8") for path in simulation_sources for token in prohibited_inputs), "simulation/calibration source imports prohibited actual-country inputs")

    print(json.dumps({
        "status": "pass",
        "checkpoint_count": independent["checkpoint_count"],
        "replication_count": independent["replication_count"],
        "reference_validation": "pass",
        "independent_method_metrics": independent_metrics,
        "decision": decision["disposition"],
        "frozen_input_count": len(preregistration["frozen_input_sha256"]),
        "actual_country_data_read": False,
        "production_method_changed": False,
    }, indent=2))


if __name__ == "__main__":
    main()
