#!/usr/bin/env python3
"""v1.86 independent validation: re-aggregates every checkpoint with explicit loops (separately written from
calibrate.py), re-derives the preregistered gate and decision, and checks provenance and frozen inputs.
Standard library only. Usage: validate.py --checkpoint-dir DIR
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "c37a32d53f01e2444c990807780a0aa53781f3c88c706f65035ce0345c790b6f"
PLAN = {"primary": (2, 5000, ("selection_aware", "fixed_true_lag")), "secondary_t5": (3, 1000, ("selection_aware", "fixed_true_lag")), "power": (4, 1000, ("selection_aware",))}
FAMILIES = ("recursive_iid_residual", "recursive_wild_rademacher")
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.86 validation failed: {message}")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(name):
    return json.loads((DATA / f"var_selection_bootstrap_{name}.json").read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    args = parser.parse_args()
    prereg_path = DATA / "var_selection_bootstrap_preregistration.json"
    require(sha(prereg_path) == PREREG_SHA256, "preregistration hash")
    prereg = json.loads(prereg_path.read_text())
    for relative, expected in prereg["frozen_input_sha256"].items():
        require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
    design = load("simulation_design")
    for relative, expected in design["code_sha256"].items():
        require(sha(ROOT / relative) == expected, f"registered code changed: {relative}")
    results, summary, decision = load("simulation_results"), load("calibration_summary"), load("method_decision")
    decomposition = load("selection_decomposition")

    seen_keys, total, chunk_count = set(), 0, 0
    independent = {}
    for phase, (code, reps, procedures) in PLAN.items():
        published_cells = results["phases"][phase]
        require(len(published_cells) == 36, f"{phase} cell count")
        independent[phase] = []
        for cell_index, published in enumerate(published_cells):
            counts = {"n": 0, "lags": {}}
            tallies = {}
            for chunk_index in range(reps // 50):
                path = args.checkpoint_dir / phase / f"cell-{cell_index:02d}" / f"chunk-{chunk_index:03d}.json"
                require(path.exists(), f"missing {phase}/{cell_index}/{chunk_index}")
                payload = json.loads(path.read_text())
                key = tuple(payload["data_spawn_key"])
                require(key == (code, cell_index, chunk_index, 0) and key not in seen_keys, f"spawn key {key}")
                seen_keys.add(key)
                require(payload["cell"] == published["design"], f"cell identity {phase}/{cell_index}")
                require(payload["engine_sha256"] == design["code_sha256"]["scripts/var-selection-aware-bootstrap/engine.py"], "engine hash in checkpoint")
                require(payload["bootstrap_replications"] == 199, "B")
                chunk_count += 1
                expected_rep = chunk_index * 50
                for record in payload["records"]:
                    require(record["replication"] == expected_rep, "replication order")
                    expected_rep += 1
                    counts["n"] += 1
                    lag = record["selected_lag"]
                    counts["lags"][str(lag)] = counts["lags"].get(str(lag), 0) + 1
                    true_lag = payload["cell"]["true_lag"]
                    for procedure in procedures:
                        for family in FAMILIES:
                            result = record["procedures"][procedure][family]
                            t = tallies.setdefault((procedure, family), {"ok": 0, "rej": 0, "fail": 0, "adq_ok": 0, "adq_rej": 0})
                            if result["state"] != "ok":
                                t["fail"] += 1
                                continue
                            require(sum(result["boot_lag_counts"].values()) == 199, "bootstrap draw count")
                            require((result["p_boot"] <= 0.05) == result["reject"], "decision rule")
                            t["ok"] += 1
                            t["rej"] += 1 if result["reject"] else 0
                            if lag >= true_lag:
                                t["adq_ok"] += 1
                                t["adq_rej"] += 1 if result["reject"] else 0
            require(counts["n"] == reps and published["replications"] == reps, f"replications {phase}/{cell_index}")
            require(counts["lags"] == published["selected_lag_counts"], f"selected-lag counts {phase}/{cell_index}")
            for (procedure, family), t in tallies.items():
                block = published["procedures"][procedure][family]
                require(block["overall"]["tested"] == t["ok"] and block["overall"]["rejections"] == t["rej"] and block["failure_count"] == t["fail"], f"tallies {phase}/{cell_index}/{procedure}/{family}")
                require(block["adequate_selected_model"]["tested"] == t["adq_ok"] and block["adequate_selected_model"]["rejections"] == t["adq_rej"], f"adequacy tallies {phase}/{cell_index}/{family}")
            independent[phase].append(tallies)
            total += counts["n"]
    require(total == 252000 and results["total_monte_carlo_replications"] == 252000, "total replications")
    require(chunk_count == 5040, "checkpoint count")

    # Independent gate re-derivation on primary cells.
    eligible = []
    for family in FAMILIES:
        a = [cell[("fixed_true_lag", family)]["rej"] / cell[("fixed_true_lag", family)]["ok"] for cell in independent["primary"]]
        a_pass = all(x <= 0.075 for x in a) and sum(0.035 <= x <= 0.065 for x in a) >= 0.9 * 36
        support = [cell[("selection_aware", family)] for cell in independent["primary"] if cell[("selection_aware", family)]["adq_ok"] >= 2500]
        c = [s["adq_rej"] / s["adq_ok"] for s in support]
        c_pass = len(c) >= 12 and all(x <= 0.075 for x in c) and sum(0.035 <= x <= 0.065 for x in c) >= 0.9 * len(c)
        fail = max(max(cell[(p, family)]["fail"] for p in ("selection_aware", "fixed_true_lag")) for cell in independent["primary"]) / 5000
        passed = a_pass and c_pass and fail <= 0.01
        published = summary["families"][family]
        require(published["gate_A_fixed_true_lag"]["passed"] == a_pass and published["gate_C_adequacy_conditional"]["passed"] == c_pass and published["gate_failure_rate"]["passed"] == (fail <= 0.01), f"gate components {family}")
        require(published["eligible"] == passed and decision["family_eligibility"][family] == passed, f"eligibility {family}")
        require(published["gate_C_adequacy_conditional"]["support_cell_count"] == len(support), f"support cells {family}")
        if passed:
            eligible.append(family)
    require(decision["eligible_families"] == eligible, "eligible list")
    require(decision["disposition"] == ("no_eligible_selection_aware_bootstrap" if not eligible else "synthetic_gate_passed_phase_B_requires_owner_approval"), "disposition")
    require(decision["phase_B_run"] is False and decision["production_method_changed"] is False and decision["actual_country_diagnostics_applied"] is False and decision["formal_irf_publication_available"] is False, "decision boundaries")
    require(decomposition["replication_level_joint_crosstab_available"] is True and len(decomposition["primary_cells"]) == 36, "decomposition coverage")
    require("not diagnostic test size" in decomposition["labels"]["D"], "D label")
    require(summary["secondary_and_power_used_for_selection"] is False, "report-only phases")
    print(json.dumps({"status": "pass", "checks": checks, "checkpoints": chunk_count, "monte_carlo_replications": total, "disposition": decision["disposition"], "eligible_families": eligible}, indent=2))


if __name__ == "__main__":
    main()
