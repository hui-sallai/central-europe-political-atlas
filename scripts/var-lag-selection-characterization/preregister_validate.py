#!/usr/bin/env python3
"""v1.87 preregistration integrity validator (standard library only)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
PREREG_SHA256 = "956f4114416cd88a221adc991b079df127c8b9dea6e88f1027d050f458dc3a7a"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.87 preregistration validation failed: {message}")


sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
path = DATA / "var_lag_characterization_preregistration.json"
require(sha(path) == PREREG_SHA256, "preregistration changed after freezing")
prereg = json.loads(path.read_text())
require(f'PREREG_SHA256 = "{PREREG_SHA256}"' in (ROOT / "scripts/var-lag-selection-characterization/run_simulation.py").read_text(), "driver does not pin the preregistration")
for relative, expected in prereg["frozen_input_sha256"].items():
    require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
require(prereg["lag_selection_policy_changed"] is False and prereg["production_boundary"]["production_changed"] is False, "production boundary")
require("no criterion-selection gate" in prereg["report_only_benchmarks"]["role"] and prereg["decision_rule"].startswith("none"), "no gate / no criterion selection")
require(prereg["random_seed_namespace"]["base_entropy"] == [187, 20260928, 1], "seed namespace")
require(prereg["total_replications"]["total"] == 3360000, "replication counts")
design = json.loads((DATA / "var_lag_characterization_simulation_design.json").read_text())
require(design["cell_counts"] == {"lag_selection_primary": {"feasible": 180, "infeasible": 36}, "lag_selection_secondary": {"feasible": 276, "infeasible": 48}, "bootstrap_adequacy": {"feasible": 90, "infeasible": 18}}, "design cell counts")
print(json.dumps({"status": "pass", "checks": checks, "preregistration_sha256": PREREG_SHA256}))
