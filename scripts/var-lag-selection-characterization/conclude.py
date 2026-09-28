#!/usr/bin/env python3
"""Write var_lag_characterization_research_conclusion.json; every statement is computed from the committed summaries."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
NAMES = ["preregistration", "simulation_design", "reference_validation", "lag_selection_results", "signal_strength_decomposition", "adequacy_decomposition", "mc_uncertainty_summary"]


def load(name):
    return json.loads((DATA / f"var_lag_characterization_{name}.json").read_text())


def main():
    results, signal = load("lag_selection_results"), load("signal_strength_decomposition")
    primary = [c for c in results["cells"] if c["phase"] == "lag_selection_primary"]
    p1 = [c["criteria"]["bic"] for c in primary if c["true_lag"] == 1]
    recovery_by_level = {}
    for row in (r for r in signal["rows"] if r["phase"] == "lag_selection_primary"):
        recovery_by_level.setdefault(row["design"], []).append(row["bic_exact_recovery"]["rate"])
    thresholds = []
    for T in sorted({r["sample_size"] for r in signal["rows"] if r["phase"] == "lag_selection_primary"}):
        for det in ("constant", "constant_plus_11_month_dummies"):
            for rho in (0.5, 0.8, 0.95):
                rows = sorted((r for r in signal["rows"] if r["phase"] == "lag_selection_primary" and r["sample_size"] == T and r["deterministic_spec"] == det and r["persistence"] == rho), key=lambda r: r["psi_at_T"])
                first = lambda level: next((round(r["psi_at_T"], 3) for r in rows if r["bic_exact_recovery"]["rate"] >= level), None)
                thresholds.append({"sample_size": T, "deterministic_spec": det, "persistence": rho, "smallest_design_psi_at_T_with_bic_recovery_ge_0_5": first(0.5), "smallest_design_psi_at_T_with_bic_recovery_ge_0_9": first(0.9),
                                   "designs": [{"design": r["design"], "psi_at_T": r["psi_at_T"], "bic_exact_recovery": r["bic_exact_recovery"]["rate"]} for r in rows]})
    under = [(r["psi_at_T"], r["bic_underselection"]["count"]) for r in signal["rows"] if r["phase"] == "lag_selection_primary"]
    total_under = sum(k for _, k in under)
    conclusion = {
        "schema_version": "var-lag-characterization-research-conclusion-v1.87",
        "study_id": "var_lag_selection_characterization_v187",
        "preregistration_sha256": hashlib.sha256((DATA / "var_lag_characterization_preregistration.json").read_bytes()).hexdigest(),
        "research_type": "descriptive characterization; no gate, no criterion selection, no production decision",
        "total_replications": results["total_replications"],
        "true_lag_1_bic_exact_recovery_range_primary": [min(b["exact_recovery"]["rate"] for b in p1), max(b["exact_recovery"]["rate"] for b in p1)],
        "true_lag_1_bic_overselection_max_primary": max(b["overselection"]["rate"] for b in p1),
        "true_lag_2_bic_exact_recovery_range_by_design_primary": {d: [min(v), max(v)] for d, v in sorted(recovery_by_level.items())},
        "recovery_thresholds_by_T_det_rho": thresholds,
        "share_of_primary_underselection_in_designs_with_psi_at_T_below_1": (sum(k for p, k in under if p < 1) / total_under) if total_under else None,
        "infeasible_combinations": len(results["infeasible_cells"]),
        "aic_hqic_role": "report-only benchmarks; no criterion is recommended or selected",
        "production_changed": False, "bic_policy_changed": False, "phase_B_run": False, "formal_irf_publication_available": False,
        "actual_country_data_read": False, "v1_85_v1_851_v1_86_modified": False,
        "provenance": {f"var_lag_characterization_{n}.json": hashlib.sha256((DATA / f"var_lag_characterization_{n}.json").read_bytes()).hexdigest() for n in NAMES},
    }
    (DATA / "var_lag_characterization_research_conclusion.json").write_text(json.dumps(conclusion, indent=2) + "\n")
    print(json.dumps({k: conclusion[k] for k in ("true_lag_1_bic_exact_recovery_range_primary", "true_lag_2_bic_exact_recovery_range_by_design_primary", "share_of_primary_underselection_in_designs_with_psi_at_T_below_1")}, indent=1))


if __name__ == "__main__":
    main()
