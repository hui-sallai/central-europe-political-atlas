#!/usr/bin/env python3
"""v1.88 preregistration integrity validator (standard library only). Fails if any country result file exists."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
PREREG_SHA256 = "b0ecb06288210546cdebff23e05281703ab04b2df3eb873ca63f296ae5715f8f"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.88 preregistration validation failed: {message}")


sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
path = DATA / "var_country_lag_identifiability_preregistration.json"
require(sha(path) == PREREG_SHA256, "preregistration changed after freezing")
prereg = json.loads(path.read_text())
for key in ("design_reference", "metric_definition_reference", "phase_b_protocol_reference"):
    ref = prereg[key]
    require(sha(DATA / ref["file"]) == ref["sha256"], f"{ref['file']} changed")
for relative, expected in prereg["frozen_input_sha256"].items():
    require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
require(prereg["production_boundary"] == {"production_changed": False, "bic_policy_changed": False, "readiness_changed": False, "formal_irf_publication": False, "svar_bvar_activated": False, "phase_A_run": False, "phase_B_run": False}, "production boundary / phases not run")
require(prereg["country_result_files_created"] is False, "result flag")
authorization = DATA / "var_country_lag_identifiability_phase_a_authorization.json"
phase_a_ok = authorization.exists() and json.loads(authorization.read_text()).get("preregistration_sha256") == PREREG_SHA256
allowed = {"var_country_lag_identifiability_phase_a_authorization.json"} | ({"var_country_lag_identifiability_results.json"} if phase_a_ok else set())
results = [p.name for p in DATA.glob("var_country_lag_identifiability_*") if not p.name.endswith(("_preregistration.json", "_design.json", "_metric_definition.json")) and p.name not in allowed]
phase_b_record = DATA / "var_phase_b_authorization.json"
phase_b_ok = phase_a_ok and phase_b_record.exists() and json.loads(phase_b_record.read_text()).get("protocol_sha256") == sha(DATA / "var_phase_b_bootstrap_protocol.json")
allowed_b = {"var_phase_b_bootstrap_protocol.json", "var_phase_b_authorization.json"} | ({"var_phase_b_bootstrap_results.json"} if phase_b_ok else set())
results += [p.name for p in DATA.glob("var_phase_b_*") if p.name not in allowed_b]
require(results == [], f"country result files present without authorization: {results}")
if phase_a_ok:
    require(json.loads(authorization.read_text())["phase_B_authorized"] is False, "Phase B must not be authorized by the Phase A record")
protocol = json.loads((DATA / "var_phase_b_bootstrap_protocol.json").read_text())
require(protocol["status"] == "preregistered_not_authorized" and protocol["bootstrap_replications_B"] == 1999 and protocol["rng"]["base_entropy"] == [188, 20260928, 1], "Phase B protocol")
require(protocol["inherited_procedure"]["engine_sha256"] == sha(ROOT / "scripts/var-selection-aware-bootstrap/engine.py"), "inherited engine hash")
metrics = json.loads((DATA / "var_country_lag_identifiability_metric_definition.json").read_text())
eli = next(m for m in metrics["metrics"] if m["id"] == "empirical_lag_identifiability_index")
require("not the true psi" in eli["not"] and "no psi = 1 production cutoff" in eli["restrictions"], "ELI naming and restrictions")
require(not any(m["id"] == "bic_grid" and "AIC" not in m.get("note", "") for m in metrics["metrics"]), "AIC/HQIC excluded")
print(f'{{"status": "pass", "checks": {checks}, "preregistration_sha256": "{PREREG_SHA256}"}}'.replace("{checks}", str(checks)))
