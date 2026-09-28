#!/usr/bin/env python3
"""v1.851 selection-decomposition and interpretation validator. Standard library only; reads frozen files."""
import ast
import hashlib
import importlib.util
import io
import tokenize
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
SCRIPT = ROOT / "scripts/var-residual-diagnostics/decompose_selection.py"
FROZEN = {
    "src/data/macro/var_residual_diagnostic_simulation_results.json": "04cc4ad5f8395f894a4c9c164fc8374841b6eb20c97dc4a8c4d7098dc6912a7e",
    "src/data/macro/var_residual_diagnostic_method_decision.json": "729c69430e6431e88f477ae24cc73bb3025e2b70fd30d118c671dbf63f40fe5c",
    "src/data/macro/var_residual_diagnostic_calibration_summary.json": "ca917656b7c0109cf0e286573effaae03dd4f8143a042524c8f24ee350073cca",
    "src/data/macro/var_residual_diagnostic_preregistration.json": "f9ddab6a8ff77026b83caeca1024bf8b0379a470792fb5410e3d99607818bb0b",
    "src/data/macro/var_residual_diagnostic_reference_validation.json": "684e49a070c932385fba823e95358e812129c840a72afc000a776634f7853026",
    "src/lib/varEngine.ts": "0e944a52eba0a295ca7e44b5e9a801579f94a5ada03fef5a7ed9d938de8bf2ac",
    "src/data/macro/var_country_readiness.json": "4b8173f8202c72359758b0bf4b05ef08a6c089f2ab47f79b7be359468c97e6b1",
    "src/data/macro/var_baseline_v1_readiness.json": "f210b02ec3042c5cf95f975bccbd94f7fead0f403314d59a1e760a2046c5912e",
    "src/data/macro/var_baseline_v2_readiness.json": "b7fd4bec330ebd4db588ed63bce4de988773556b8cdc572c27f640239a2a1675",
    "src/data/macro/var_exploratory_readiness.json": "9774fa8bc87f5d84cc867e4e60bb7b1ca1a1aa432d3d81979d275caca6c3ac08",
    "src/data/macro/var_lag_diagnostic_grid.json": "2d1753188a9b5b7c8bb6f322eb53fd4241205f2d8789904498024e3a6ecd19d9",
    "src/data/panel-local-projections/panel_lp_results.json": "10e7b4f8761523e7b136b9707ac87da1d753a5914e0d11a3f8b980571ab53bdc",
}
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"decomposition validation failed: {message}")


def sha(relative):
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()


def load(name):
    return json.loads((DATA / name).read_text())


for relative, expected in FROZEN.items():
    require(sha(relative) == expected, f"frozen artifact changed: {relative}")

# The derivation script may use only deterministic standard-library modules and must not touch country data.
tree = ast.parse(SCRIPT.read_text())
imported = {alias.name.split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names}
imported |= {node.module.split(".")[0] for node in ast.walk(tree) if isinstance(node, ast.ImportFrom) and node.module}
require(imported <= {"hashlib", "json", "sys", "pathlib"}, f"unexpected imports in derivation script: {sorted(imported)}")
code_names = " ".join(tok.string.lower() for tok in tokenize.generate_tokens(io.StringIO(SCRIPT.read_text()).readline) if tok.type == tokenize.NAME)
for token in ("random", "numpy", "default_rng", "seedsequence", "statsmodels", "scipy"):
    require(token not in code_names.split(), f"derivation script code uses {token}")
path_literals = [node.value for node in ast.walk(tree) if isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value.endswith((".json", ".csv"))]
require(set(path_literals) <= {"var_residual_diagnostic_simulation_results.json", "var_residual_diagnostic_layerB_selection_decomposition.json", "src/data/macro/var_residual_diagnostic_simulation_results.json"}, f"derivation script file access: {path_literals}")

spec = importlib.util.spec_from_file_location("decompose_selection", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
derived = module.derive()
committed = load("var_residual_diagnostic_layerB_selection_decomposition.json")
require(module.serialize(derived) == (DATA / "var_residual_diagnostic_layerB_selection_decomposition.json").read_text(), "committed artifact differs from deterministic re-derivation")
require(committed["source"]["source_sha256"] == FROZEN["src/data/macro/var_residual_diagnostic_simulation_results.json"], "source SHA256")
require(committed["classification"] == "derived_from_frozen_v1_85_simulation" and committed["not_new_research_draws"] is True, "classification")
require(committed["new_random_draws"] == 0 and committed["simulation_reruns"] == 0 and committed["var_reestimations"] == 0 and committed["actual_country_data_read"] is False, "no new draws / reruns / country data")
require(committed["derivation_script"] == "scripts/var-residual-diagnostics/decompose_selection.py" and committed["generated_at"], "derivation provenance")

results = json.loads((DATA / "var_residual_diagnostic_simulation_results.json").read_text())
primary = results["phases"]["primary"]
require(len(primary) == 72, "72 primary cells")
require(sum(c["design"]["layer"] == "A" for c in primary) == 36 and sum(c["design"]["layer"] == "B" for c in primary) == 36, "36 Layer A + 36 Layer B")
require(committed["layer_B_cell_count"] == 36 and len(committed["layer_B_cells"]) == 36, "36 decomposed Layer B cells")
for row in committed["layer_B_cells"]:
    require(row["correct_selection_count"] + row["underselection_count"] + row["overselection_count"] == row["replications"], f"{row['cell_id']} selection partition")

by_lag = committed["layer_B_by_true_lag"]
require(all(r["correct_selection_rate"] >= 0.99 for r in committed["layer_B_cells"] if r["true_lag"] == 1), "true-p1 Layer B selection mostly correct")
require(all(r["underselection_rate"] >= 0.99 for r in committed["layer_B_cells"] if r["true_lag"] == 2), "true-p2 Layer B underselection overwhelming")
require(by_lag["1"]["pooled_correct_selection_rate"] > 0.999 and by_lag["2"]["pooled_underselection_rate"] > 0.99, "pooled selection summary")

worst = committed["worst_layer_B_es_cell"]
require(worst["cell_id"] == "primary_LB_T144_p2_r0.95_det-constant_plus_11_month_dummies_innov-gaussian_iid", "worst Layer-B ES cell id")
require(worst["selected_lag_counts"] == {"1": 9942, "2": 58} and worst["underselection_rate"] == 0.9942 and worst["es_h12_rejection_rate"] == 0.1288, "worst-cell selection and ES rejection")
layer_a_es = committed["layer_A_summary"]["edgerton_shukur_f"]
require(layer_a_es["cells_inside_0_035_to_0_065"] == 36 and layer_a_es["maximum_rejection_rate"] == 0.0599, "Layer A ES summary")

# No fabricated conditional rejection rates.
require(committed["replication_level_joint_crosstab_available"] is False and committed["conditional_rejection_rates_reconstructable"] is False, "joint cross-tab unavailable")
require("joint distribution was not retained" in committed["joint_distribution_note"], "joint-distribution disclosure")
flat = json.dumps(committed).lower()
for forbidden in ("p(reject", "rejection_given", "conditional_rejection_rate\"", "rejects_due_to", "attributable_share"):
    require(forbidden not in flat, f"fabricated conditional quantity: {forbidden}")
require(committed["metric_semantics"]["layer_B_pure_size_identified"] is False, "Layer B pure size not identified")

amendment = load("var_residual_diagnostic_research_conclusion_amendment_001.json")
require(amendment["classification"] == "post_release_interpretation_clarification", "amendment classification")
for flag in ("research_decision_changed", "simulation_changed", "threshold_changed", "selected_method_changed", "production_changed"):
    require(amendment[flag] is False, f"amendment {flag}")
require(amendment["decision_still_valid"]["disposition"] == "no_eligible_replacement" and amendment["decision_still_valid"]["phase_B_authorized"] is False, "decision still valid")
require(amendment["selection_decomposition_sha256"] == sha("src/data/macro/var_residual_diagnostic_layerB_selection_decomposition.json"), "amendment decomposition hash")
for name, expected in amendment["unchanged_artifact_sha256"].items():
    require(sha(f"src/data/macro/{name}") == expected, f"amended-over artifact changed: {name}")
require(amendment["future_candidate"]["state"] == "not_started" and amendment["future_candidate"]["new_preregistration_required"] is True, "future v1.86 candidate not started")

decision = load("var_residual_diagnostic_method_decision.json")
require(decision["disposition"] == "no_eligible_replacement" and decision["selected_method_for_possible_phase_B_evaluation"] == "none", "method decision unchanged")
capability = load("var_capability_status.json")
require(capability["schema_version"] == "var-capability-status-v1.87", "capability schema")
require(capability["residual_diagnostic_replacement"] == "none_eligible" and capability["current_production_diagnostic"] == "adjusted_portmanteau", "production diagnostic unchanged")
require(capability["current_production_diagnostic_calibration"] == "failed_preregistered_joint_platform_gate", "joint platform gate status retained")
require(capability["formal_dynamic_response_ready_country_count"] == 0 and capability["formal_irf_publication_available"] is False and capability["phase_B_real_country_comparison"] == "not_authorized", "publication boundary")
require(capability["layer_A_metric_semantics"] == "conditional_diagnostic_size" and capability["layer_B_metric_semantics"] == "selection_plus_specification_plus_diagnostic_procedure_rejection", "metric semantics")
require(capability["layer_B_pure_size_identified"] is False and capability["lag_underselection_detected"] is True, "Layer B identification flags")
require(capability["selection_decomposition_reference"] == "var_residual_diagnostic_layerB_selection_decomposition.json", "decomposition reference")
cap_text = json.dumps(capability).lower()
for forbidden in ("bic_invalid", "bic_should_be_replaced", "es_active", "activate_es"):
    require(forbidden not in cap_text, f"capability overstates: {forbidden}")

print(json.dumps({
    "status": "pass", "checks": checks, "source_sha256": committed["source"]["source_sha256"],
    "new_random_draws": 0, "simulation_reruns": 0, "var_reestimations": 0, "actual_country_data_read": False,
    "layer_A_cells": 36, "layer_B_cells": 36,
    "true_p1_correct_selection": {k: v["pooled_correct_selection_rate"] for k, v in by_lag["1"]["by_deterministic_spec"].items()},
    "true_p2_underselection": {k: v["pooled_underselection_rate"] for k, v in by_lag["2"]["by_deterministic_spec"].items()},
    "worst_layer_B_es_cell": worst["cell_id"], "joint_crosstab_available": False, "method_decision_changed": False,
}, indent=2))
