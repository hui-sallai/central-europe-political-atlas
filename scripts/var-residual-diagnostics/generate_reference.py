#!/usr/bin/env python3
"""Generate frozen cross-language residual-diagnostic reference fixtures."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import platform
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import scipy
import statsmodels
from statsmodels.tsa.api import VAR

from common import all_diagnostics, fit_var, pt_adjusted, simulate_var


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
INPUTS = DATA / "var_residual_diagnostic_reference_inputs.csv"
CASES = DATA / "var_residual_diagnostic_reference_cases.json"
MANIFEST = DATA / "var_residual_diagnostic_reference_manifest.json"
VALIDATION = DATA / "var_residual_diagnostic_reference_validation.json"
PREREGISTRATION = DATA / "var_residual_diagnostic_preregistration.json"
SEED_REGISTRY = DATA / "var_residual_diagnostic_seed_registry.json"
R_SCRIPT = Path(__file__).with_name("generate_reference.R")
VARS_SOURCE_SHA256 = "9b3df03232fbedd30a89af10b20b540fce20ddd36602853857d47242d66f14c5"


CASE_DEFINITIONS = [
    {"case_id": "case_1", "sample_size": 120, "true_lag": 1, "persistence": 0.5, "deterministic_spec": "constant", "serial_pattern": None, "serial_rho": 0.0, "lag_horizon": 12},
    {"case_id": "case_2", "sample_size": 132, "true_lag": 2, "persistence": 0.8, "deterministic_spec": "constant", "serial_pattern": None, "serial_rho": 0.0, "lag_horizon": 12},
    {"case_id": "case_3", "sample_size": 132, "true_lag": 2, "persistence": 0.8, "deterministic_spec": "constant_plus_11_month_dummies", "serial_pattern": None, "serial_rho": 0.0, "lag_horizon": 12},
    {"case_id": "case_4", "sample_size": 132, "true_lag": 2, "persistence": 0.8, "deterministic_spec": "constant", "serial_pattern": "common_ma1_fixture", "serial_rho": 0.8, "lag_horizon": 12},
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_inputs() -> list[dict]:
    rows: list[dict] = []
    generated: list[dict] = []
    for case_index, definition in enumerate(CASE_DEFINITIONS, start=1):
        values, months = simulate_var(
            sample_size=definition["sample_size"],
            true_lag=definition["true_lag"],
            persistence=definition["persistence"],
            deterministic_spec=definition["deterministic_spec"],
            innovation_distribution="gaussian_iid",
            spawn_key=(0, case_index),
            serial_pattern=definition["serial_pattern"],
            serial_rho=definition["serial_rho"],
        )
        for row_index, (value, month) in enumerate(zip(values, months, strict=True)):
            rows.append({"case_id": definition["case_id"], "row_index": row_index, "month_index": int(month), "y1": value[0], "y2": value[1], "y3": value[2]})
        generated.append({**definition, "values": values, "months": months})
    with INPUTS.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["case_id", "row_index", "month_index", "y1", "y2", "y3"], lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    return generated


def statsmodels_pt(values: np.ndarray, months: np.ndarray, definition: dict) -> dict:
    exog = None
    if definition["deterministic_spec"] == "constant_plus_11_month_dummies":
        exog = np.vstack([np.eye(12, dtype=np.float64)[int(month), :11] for month in months])
    fitted = VAR(values, exog=exog).fit(definition["true_lag"], trend="c")
    test = fitted.test_whiteness(nlags=definition["lag_horizon"], adjusted=True)
    return {"statistic": float(test.test_statistic), "df1": int(test.df), "p_value": float(test.pvalue)}


def run_r_reference(generated: list[dict], temporary: Path) -> tuple[dict, dict]:
    metadata_path = temporary / "metadata.csv"
    output_path = temporary / "r_reference.csv"
    environment_path = temporary / "r_environment.csv"
    with metadata_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["case_id", "true_lag", "deterministic_spec", "lag_horizon"], lineterminator="\n")
        writer.writeheader()
        for definition in generated:
            writer.writerow({key: definition[key] for key in writer.fieldnames})
    subprocess.run(["Rscript", str(R_SCRIPT), str(INPUTS), str(metadata_path), str(output_path), str(environment_path)], check=True)
    results: dict[str, dict] = {}
    with output_path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            results.setdefault(row["case_id"], {})[row["test_id"]] = {
                "statistic": float(row["statistic"]),
                "distribution": row["distribution"],
                "df1": int(float(row["df1"])),
                "df2": int(float(row["df2"])) if row["df2"] else None,
                "p_value": float(row["p_value"]),
            }
    environment: dict[str, str] = {}
    with environment_path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            environment[row["key"]] = row["value"]
    return results, environment


def finite_difference(left: float | int | None, right: float | int | None) -> float:
    if left is None and right is None:
        return 0.0
    if left is None or right is None:
        return float("inf")
    return abs(float(left) - float(right))


def main() -> None:
    if not PREREGISTRATION.exists() or not SEED_REGISTRY.exists():
        raise RuntimeError("preregistration and seed registry must exist before reference generation")
    generated = write_inputs()
    with tempfile.TemporaryDirectory(prefix="var-residual-reference-") as directory:
        r_results, r_environment = run_r_reference(generated, Path(directory))

    cases: list[dict] = []
    discrepancies: list[float] = []
    case4_rejections: dict[str, bool] = {}
    for definition in generated:
        fit = fit_var(definition["values"], definition["months"], definition["true_lag"], definition["deterministic_spec"])
        independent = all_diagnostics(fit, definition["lag_horizon"])
        statsmodels_reference = statsmodels_pt(definition["values"], definition["months"], definition)
        r_reference = r_results[definition["case_id"]]
        for test_id, output in independent.items():
            reference = r_reference[test_id]
            for field in ("statistic", "df1", "df2", "p_value"):
                discrepancies.append(finite_difference(output[field], reference[field]))
            output["reference_alignment"] = "R_vars_1.6-1"
        pt_independent = independent["pt_adjusted"]
        for field in ("statistic", "df1", "p_value"):
            discrepancies.append(finite_difference(pt_independent[field], statsmodels_reference[field]))
        if definition["case_id"] == "case_4":
            case4_rejections = {test_id: output["p_value"] < 0.05 for test_id, output in independent.items()}
        cases.append({
            "case_id": definition["case_id"],
            "design": {key: definition[key] for key in ("sample_size", "true_lag", "persistence", "deterministic_spec", "serial_pattern", "serial_rho", "lag_horizon")},
            "spawn_key": [0, int(definition["case_id"].split("_")[1])],
            "input_sha256": sha256(INPUTS),
            "fitted_residuals": fit.residuals.tolist(),
            "independent_python": independent,
            "statsmodels_pt_adjusted": statsmodels_reference,
            "R_vars_1_6_1": r_reference,
        })

    maximum_discrepancy = max(discrepancies)
    tolerance = 1e-8
    validation = {
        "schema_version": "var-residual-diagnostic-reference-validation-v1.85",
        "status": "pass" if maximum_discrepancy <= tolerance and all(case4_rejections.values()) else "fail",
        "case_count": len(cases),
        "maximum_numerical_discrepancy": maximum_discrepancy,
        "registered_absolute_tolerance": tolerance,
        "fallback_tolerance_used": False,
        "case_4_all_tests_reject_at_0_05": case4_rejections,
        "actual_country_data_read": False,
        "production_engine_changed": False,
    }
    manifest = {
        "schema_version": "var-residual-diagnostic-reference-manifest-v1.85",
        "generated_after_preregistration": True,
        "starting_commit": "1b13fc1c8eaa804ef3b5ea5173c8ef01081afb3b",
        "preregistration_sha256": sha256(PREREGISTRATION),
        "seed_registry_sha256": sha256(SEED_REGISTRY),
        "reference_inputs_sha256": sha256(INPUTS),
        "python": {
            "version": platform.python_version(),
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "statsmodels": statsmodels.__version__,
        },
        "R": r_environment,
        "vars_source_package": {
            "version": "1.6-1",
            "sha256": VARS_SOURCE_SHA256,
            "repository": "CRAN",
            "source_vendored": False,
        },
        "reference_roles": {
            "statsmodels": "independent adjusted Portmanteau reference",
            "R_vars": "independent PT.adjusted, BG, and ES reference",
            "python_research_implementation": "independent implementation to be used by synthetic simulations",
        },
        "environment_notes": [
            "Initial source installation of strucchange failed because the local R toolchain lacked gfortran runtime libraries.",
            "The same preregistered package versions were installed from CRAN macOS binaries before fixture generation.",
            "The first Case 4 implementation fixture used common AR(1) innovations with rho=0.65 and did not produce rejection by any test; that failed fixture is preserved in var_residual_diagnostic_reference_attempts.json and is not simulation or selection evidence.",
        ],
    }
    for path, payload in ((CASES, {"schema_version": "var-residual-diagnostic-reference-cases-v1.85", "cases": cases}), (MANIFEST, manifest), (VALIDATION, validation)):
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(validation, indent=2))
    if validation["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
