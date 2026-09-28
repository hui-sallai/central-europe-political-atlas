#!/usr/bin/env python3
"""Write var_country_matched_bootstrap_research_conclusion.json from the committed summaries (no simulation)."""
import hashlib
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "src" / "data" / "macro"
NAMES = ["preregistration", "simulation_design", "seed_registry", "reference_validation", "null_results", "power_results", "calibration_summary"]
summary = json.loads((DATA / "var_country_matched_bootstrap_calibration_summary.json").read_text())
c = summary["classification"]
doc = {"schema_version": "var-country-matched-bootstrap-research-conclusion-v1.89", "study_id": "var_country_matched_bootstrap_v189",
       "preregistration_sha256": hashlib.sha256((DATA / "var_country_matched_bootstrap_preregistration.json").read_bytes()).hexdigest(),
       "size_status": c["size_status"], "power_status": c["power_status"], "outcome": c["outcome"], "disposition": c["disposition"],
       "production_change_authorized": False, "production_changed": False, "readiness_changed": False, "formal_irf_publication_available": False,
       "phase_B_rerun": False, "actual_country_data_read": False, "prior_releases_modified": False,
       "monte_carlo_replications": 312000, "bootstrap_draws": 62088000,
       "provenance": {f"var_country_matched_bootstrap_{n}.json": hashlib.sha256((DATA / f"var_country_matched_bootstrap_{n}.json").read_bytes()).hexdigest() for n in NAMES}}
(DATA / "var_country_matched_bootstrap_research_conclusion.json").write_text(json.dumps(doc, indent=2) + "\n")
print(json.dumps({k: doc[k] for k in ("outcome", "disposition", "production_change_authorized")}))
