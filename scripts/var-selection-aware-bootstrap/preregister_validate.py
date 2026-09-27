#!/usr/bin/env python3
"""v1.86 preregistration integrity validator (standard library only)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
PREREG_SHA256 = "c37a32d53f01e2444c990807780a0aa53781f3c88c706f65035ce0345c790b6f"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"preregistration validation failed: {message}")


sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
prereg_path = DATA / "var_selection_bootstrap_preregistration.json"
require(sha(prereg_path) == PREREG_SHA256, "preregistration file changed after freezing")
prereg = json.loads(prereg_path.read_text())
design = json.loads((DATA / "var_selection_bootstrap_simulation_design.json").read_text())
seeds = json.loads((DATA / "var_selection_bootstrap_seed_registry.json").read_text())
simulate_source = (ROOT / "scripts/var-selection-aware-bootstrap/simulate.py").read_text()
require(f'PREREG_SHA256 = "{PREREG_SHA256}"' in simulate_source, "simulation driver does not pin the preregistration hash")
require(prereg["lag_selection_rerun_inside_each_bootstrap_replication"] is True and prereg["lag_selection_policy_changed"] is False, "selection rerun / BIC policy")
require(prereg["target_estimand"]["estimand_id"] == "selected_model_adequacy", "estimand")
require([f["family_id"] for f in prereg["bootstrap_families"]] == ["recursive_iid_residual", "recursive_wild_rademacher"] and prereg["bootstrap_family_count_frozen"] == 2, "bootstrap families")
require(prereg["bootstrap_replications_B"] == 199 and [c["test_id"] for c in prereg["candidate_diagnostics"]] == ["pt_adjusted_h12"], "B and statistic")
rule = prereg["acceptance_rule"]
require(rule["thresholds_frozen"] is True and "0.075" in rule["gate_A_fixed_true_lag"] and "[0.035, 0.065]" in rule["gate_A_fixed_true_lag"] and ">= 2500" in rule["gate_C_adequacy_conditional"] and "<= 0.01" in rule["gate_failure_rate"], "acceptance thresholds")
require(prereg["cells"]["primary"]["replications_per_cell"] == 5000 and prereg["total_monte_carlo_replications"]["total"] == 252000, "replication counts")
require(prereg["production_boundary"] == {"production_changed": False, "bic_policy_changed": False, "readiness_thresholds_changed": False, "formal_irf_publication": False, "svar_bvar_activated": False}, "production boundary")
require(prereg["known_information_disclosure"]["actual_country_results_used_for_design"] is False, "no country outcomes used")
for relative, expected in prereg["frozen_input_sha256"].items():
    require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
require(design["preregistration_sha256"] == PREREG_SHA256 and design["v1_85_design_modified"] is False, "design reference")
for relative, expected in design["code_sha256"].items():
    require(sha(ROOT / relative) == expected, f"registered code changed: {relative}")
require(seeds["base_entropy"] == [186, 20260928, 1] and seeds["base_entropy"] != seeds["distinct_from"]["v1_85_base_entropy"], "seed namespace")
print(json.dumps({"status": "pass", "checks": checks, "preregistration_sha256": PREREG_SHA256}))
