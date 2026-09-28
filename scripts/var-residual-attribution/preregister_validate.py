#!/usr/bin/env python3
"""v1.90 preregistration integrity validator (standard library only). Result files are rejected unless an owner
authorization record tied to this preregistration exists."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
from frozen_inputs import frozen_input_sha  # noqa: E402  (live-data refresh uses the archived research snapshot)

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
PREREG_SHA256 = "865a568f8e517b619eeee978f31edc6c0a637d493a169facc3b357714d25725f"
RESULT_FILES = ["var_residual_acf_results.json", "var_residual_cross_lag_results.json", "var_portmanteau_attribution.json", "var_residual_seasonal_results.json",
                "var_residual_variance_stability.json", "var_residual_period_concentration.json", "var_residual_specification_probe_results.json",
                "var_residual_attribution_research_conclusion.json"]
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.90 preregistration validation failed: {message}")


sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
path = DATA / "var_residual_attribution_preregistration.json"
require(sha(path) == PREREG_SHA256, "preregistration changed after freezing")
prereg = json.loads(path.read_text())
require(sha(DATA / prereg["design_reference"]["file"]) == prereg["design_reference"]["sha256"], "design changed")
for relative, expected in prereg["frozen_input_sha256"].items():
    require(frozen_input_sha(ROOT, relative, expected) == expected, f"frozen input changed: {relative}")
design = json.loads((DATA / "var_residual_attribution_design.json").read_text())
v188 = json.loads((DATA / "var_country_lag_identifiability_design.json").read_text())
v188r = {u["unit_id"]: u["selected_bic_lag"] for u in json.loads((DATA / "var_country_lag_identifiability_results.json").read_text())["units"]}
require([u["unit_id"] for u in design["units"]] == [u["unit_id"] for u in v188["units"]] and len(design["units"]) == 5, "units must equal the five v1.88 formal units")
require(all(u["production_selected_lag"] == v188r[u["unit_id"]] for u in design["units"]), "production lags must equal v1.88 production selections")
require(set(prereg["sensitivity_probes"]) == {"label", "A_plus_one_lag", "B_seasonal_lag_term", "C_stable_subsample", "reported_per_probe", "no_other_probes"}, "exactly three probes")
require(prereg["production_boundary"]["production_change_authorized"] is False and prereg["production_boundary"]["readiness_changed"] is False and prereg["production_boundary"]["formal_irf_publication_available"] is False, "production boundary")
require(prereg["multiplicity_reporting"]["no_gates"] is True, "no gates")
authorization = DATA / "var_residual_attribution_authorization.json"
authorized = authorization.exists() and json.loads(authorization.read_text()).get("preregistration_sha256") == PREREG_SHA256
present = [name for name in RESULT_FILES if (DATA / name).exists()]
require(authorized or present == [], f"result files present without authorization: {present}")
print(json.dumps({"status": "pass", "checks": checks, "preregistration_sha256": PREREG_SHA256, "analysis_authorized": authorized, "result_files_present": present}))
