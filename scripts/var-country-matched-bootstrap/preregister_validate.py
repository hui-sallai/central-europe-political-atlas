#!/usr/bin/env python3
"""v1.89 preregistration integrity validator (standard library only)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
PREREG_SHA256 = "ac42c4e568f39e582d8720967bb45a1bf88af93ba70f5e52f54c9fef23a5863a"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.89 preregistration validation failed: {message}")


sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
path = DATA / "var_country_matched_bootstrap_preregistration.json"
require(sha(path) == PREREG_SHA256, "preregistration changed after freezing")
prereg = json.loads(path.read_text())
require(f'PREREG_SHA256 = "{PREREG_SHA256}"' in (ROOT / "scripts/var-country-matched-bootstrap/run_simulation.py").read_text(), "driver does not pin the preregistration")
for key in ("design_reference", "seed_registry_reference"):
    require(sha(DATA / prereg[key]["file"]) == prereg[key]["sha256"], f"{prereg[key]['file']} changed")
for relative, expected in prereg["frozen_input_sha256"].items():
    require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
require(prereg["bootstrap"]["family"] == "recursive_iid_residual" and prereg["bootstrap"]["B"] == 199 and prereg["bootstrap"]["bic_rerun_inside_every_bootstrap_sample"] is True, "bootstrap")
require(prereg["acceptable_size_interval"] == {"interval": [0.035, 0.065], "maximum": 0.075, "fraction_inside_required": 0.9, "rationale": "identical interval philosophy to v1.85/v1.86"}, "size interval")
require(prereg["classification_rules"]["production_change_authorized"] is False and prereg["production_boundary"]["production_change_authorized"] is False, "production change never authorized")
require(prereg["replications"] == {"null_per_cell": 2000, "power_per_cell": 500, "total_monte_carlo": 312000, "total_bootstrap_draws": 62088000}, "replications")
print(json.dumps({"status": "pass", "checks": checks, "preregistration_sha256": PREREG_SHA256}))
