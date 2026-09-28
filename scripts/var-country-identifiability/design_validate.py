#!/usr/bin/env python3
"""v1.88 design validator: eligibility equals the frozen formal estimable lists, sample structure follows the
production policy, and no diagnostic/lag outcome field is used. Standard library only; reads no result values."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/macro"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.88 design validation failed: {message}")


design = json.loads((DATA / "var_country_lag_identifiability_design.json").read_text())
expected_units = []
for index, name in enumerate(("var_baseline_v1_readiness", "var_baseline_v2_readiness")):
    frozen = json.loads((DATA / f"{name}.json").read_text())
    for record in frozen["records"]:
        if record["estimable"]:  # structural eligibility only; outcome fields are never accessed here
            expected_units.append((frozen["profile"]["profile_id"], record["country"], record["start_period"], record["end_period"], record["effective_observations"], index))
    require(sorted(frozen["estimable_countries"]) == sorted(r[1] for r in expected_units if r[5] == index), f"{name} estimable list")
units = design["units"]
require([(u["profile_id"], u["country"], u["start_period"], u["end_period"], u["effective_observations"], u["profile_index"]) for u in units] == expected_units, "eligible units differ from frozen formal estimable lists")
require([u["unit_index"] for u in units] == list(range(len(units))) and len(units) == 5, "unit indexing")
for u in units:
    pmax = max(1, min(12, (u["effective_observations"] - 4) // (4 * u["k"] + 1)))
    require(u["max_candidate_lag"] == pmax and u["common_sample_observations"] == u["effective_observations"] - pmax, f"production candidate lag set {u['unit_id']}")
    require(u["effective_observations"] >= 60 and u["k"] == 3, f"sample size {u['unit_id']}")
    require([v["transformation"] for v in u["variables"]] == ["log_difference", "log_difference", "level"], f"transformations {u['unit_id']}")
require(not any(k in json.dumps(design["readiness_fields_read_for_design"]) for k in ("selected_lag", "residual_status", "readiness_state", "blocking_reasons")), "outcome fields must not be used")
require(design["sample"]["end_cutoff"].startswith("2026-06"), "sample cutoff")
require("exploratory fallback profile is not a formal baseline and is excluded" in design["eligibility_rule"], "exploratory exclusion")
print(json.dumps({"status": "pass", "checks": checks, "units": [u["unit_id"] for u in units]}))
