#!/usr/bin/env python3
"""Write var_selection_bootstrap_research_conclusion.json from the committed v1.86 artifacts (no simulation)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
NAMES = ["preregistration", "simulation_design", "seed_registry", "reference_validation", "simulation_results", "calibration_summary", "selection_decomposition", "method_decision"]


def load(name):
    return json.loads((DATA / f"var_selection_bootstrap_{name}.json").read_text())


def main():
    prereg, summary, decision, results = load("preregistration"), load("calibration_summary"), load("method_decision"), load("simulation_results")
    reference = load("reference_validation")
    families = {}
    for family, metrics in summary["families"].items():
        families[family] = {
            "eligible": metrics["eligible"],
            "gate_A_fixed_true_lag": {k: metrics["gate_A_fixed_true_lag"][k] for k in ("passed", "cells_inside_strict_interval", "cell_count", "minimum_rate", "maximum_rate", "worst_case_absolute_distortion")},
            "gate_C_adequacy_conditional": {k: metrics["gate_C_adequacy_conditional"][k] for k in ("passed", "support_cell_count", "cells_inside_strict_interval", "minimum_rate", "maximum_rate", "worst_case_absolute_distortion")},
            "gate_failure_rate": metrics["gate_failure_rate"],
            "full_procedure_D_report_only": {k: metrics["full_procedure_D_report_only"][k] for k in ("label", "cells_inside_strict_interval", "minimum_rate", "maximum_rate")},
        }
    conclusion = {
        "schema_version": "var-selection-bootstrap-research-conclusion-v1.86",
        "study_id": prereg["study_id"],
        "preregistration_sha256": hashlib.sha256((DATA / "var_selection_bootstrap_preregistration.json").read_bytes()).hexdigest(),
        "starting_commit": prereg["starting_commit"],
        "estimand": prereg["target_estimand"]["estimand_id"],
        "reference_validation_status": reference["status"],
        "reference_maximum_numerical_discrepancy": reference["maximum_numerical_discrepancy"],
        "monte_carlo_replications": results["total_monte_carlo_replications"],
        "bootstrap_replications": results["bootstrap_replications"],
        "families": families,
        "disposition": decision["disposition"],
        "selected_family": decision["selected_family"],
        "phase_B_run": False,
        "phase_B_authorized": False,
        "phase_B_requires_owner_approval": decision["disposition"] == "synthetic_gate_passed_phase_B_requires_owner_approval",
        "production_method_changed": False,
        "bic_policy_changed": False,
        "actual_country_data_read": False,
        "formal_irf_publication_available": False,
        "new_random_draws_after_decision": 0,
        "v1_85_and_v1_851_modified": False,
        "d_label": "selection-aware procedure rejection rate; not diagnostic test size",
        "provenance": {f"var_selection_bootstrap_{n}.json": hashlib.sha256((DATA / f"var_selection_bootstrap_{n}.json").read_bytes()).hexdigest() for n in NAMES},
    }
    (DATA / "var_selection_bootstrap_research_conclusion.json").write_text(json.dumps(conclusion, indent=2) + "\n")
    print(json.dumps({"disposition": conclusion["disposition"], "selected_family": conclusion["selected_family"]}))


if __name__ == "__main__":
    main()
