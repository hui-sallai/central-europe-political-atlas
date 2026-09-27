#!/usr/bin/env python3
"""Validate frozen cross-language reference fixtures and production invariance."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from common import pt_adjusted


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
EXPECTED = {
    "src/lib/varEngine.ts": "0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac",
    "src/data/macro/var_country_readiness.json": "4b8173f8202c72359758b0bf4b05ef08a6c089f2ab47f79b7be359468c97e6b1",
    "src/data/macro/var_baseline_v1_readiness.json": "f210b02ec3042c5cf95f975bccbd94f7fead0f403314d59a1e760a2046c5912e",
    "src/data/macro/var_baseline_v2_readiness.json": "b7fd4bec330ebd4db588ed63bce4de988773556b8cdc572c27f640239a2a1675",
    "src/data/macro/var_exploratory_readiness.json": "9774fa8bc87f5d84cc867e4e60bb7b1ca1a1aa432d3d81979d275caca6c3ac08",
    "src/data/macro/var_lag_diagnostic_grid.json": "2d1753188a9b5b7c8bb6f322eb53fd4241205f2d8789904498024e3a6ecd19d9",
    "src/data/panel-local-projections/panel_lp_results.json": "10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    preregistration = json.loads((DATA / "var_residual_diagnostic_preregistration.json").read_text())
    manifest = json.loads((DATA / "var_residual_diagnostic_reference_manifest.json").read_text())
    cases = json.loads((DATA / "var_residual_diagnostic_reference_cases.json").read_text())
    validation = json.loads((DATA / "var_residual_diagnostic_reference_validation.json").read_text())
    attempts = json.loads((DATA / "var_residual_diagnostic_reference_attempts.json").read_text())
    seed_registry = json.loads((DATA / "var_residual_diagnostic_seed_registry.json").read_text())

    check(preregistration["candidate_list_frozen"], "candidate list is not frozen")
    check([entry["test_id"] for entry in preregistration["candidate_tests"]] == ["pt_adjusted", "bg_lm", "edgerton_shukur_f"], "candidate tests changed")
    check(manifest["preregistration_sha256"] == sha256(DATA / "var_residual_diagnostic_preregistration.json"), "preregistration hash drift")
    check(manifest["vars_source_package"]["version"] == "1.6-1", "R vars version drift")
    check(manifest["vars_source_package"]["sha256"] == "9b3df03232fbedd30a89af10b20b540fce20ddd36602853857d47242d66f14c5", "R vars checksum drift")
    check(validation["status"] == "pass", "reference validation did not pass")
    check(validation["maximum_numerical_discrepancy"] <= 1e-8, "reference discrepancy exceeds preregistered tolerance")
    check(all(validation["case_4_all_tests_reject_at_0_05"].values()), "clear misspecification fixture not detected")
    check(attempts["attempts"][0]["status"] == "failed_fixture_detection_requirement_preserved", "failed fixture attempt was not preserved")
    check(len(seed_registry["used_spawn_keys"]) == 4, "reference seed usage registry incomplete")

    maximum_platform_formula_discrepancy = 0.0
    for case in cases["cases"]:
        result = pt_adjusted(
            __import__("numpy").asarray(case["fitted_residuals"], dtype=float),
            case["design"]["true_lag"],
            case["design"]["lag_horizon"],
        )
        reference = case["R_vars_1_6_1"]["pt_adjusted"]
        maximum_platform_formula_discrepancy = max(
            maximum_platform_formula_discrepancy,
            abs(result["statistic"] - reference["statistic"]),
            abs(result["p_value"] - reference["p_value"]),
            abs(result["df1"] - reference["df1"]),
        )
    check(maximum_platform_formula_discrepancy <= 1e-8, "current PT formula fixture alignment failed")

    for relative, expected in EXPECTED.items():
        check(sha256(ROOT / relative) == expected, f"frozen file changed: {relative}")

    source = (ROOT / "src/lib/varEngine.ts").read_text()
    check("q *= total * total" in source and "const df = k * k * (h - varLags)" in source, "production PT definition changed")
    print(json.dumps({
        "status": "pass",
        "reference_cases": len(cases["cases"]),
        "maximum_cross_language_discrepancy": validation["maximum_numerical_discrepancy"],
        "maximum_production_formula_fixture_discrepancy": maximum_platform_formula_discrepancy,
        "failed_fixture_attempts_preserved": len(attempts["attempts"]),
        "actual_country_diagnostic_application": False,
        "production_engine_changed": False,
    }, indent=2))


if __name__ == "__main__":
    main()
