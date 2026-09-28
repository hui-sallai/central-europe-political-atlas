#!/usr/bin/env python3
"""v1.88 Phase B: preregistered country selection-aware bootstrap (var_phase_b_bootstrap_protocol.json).
Composes the frozen v1.86 engine functions exactly as engine.run_procedure does, with B=1999.
Usage: phase_b.py <production_extract.json>  (writes src/data/macro/var_phase_b_bootstrap_results.json)"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from scipy.stats import beta

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
sys.path.insert(0, str(ROOT / "scripts" / "var-selection-aware-bootstrap"))
import engine  # noqa: E402  (frozen v1.86)

FAMILY = "recursive_iid_residual"
SPEC = {"constant": "constant", "constant_month_dummies": "constant_plus_11_month_dummies"}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def procedure(values, months, spec, lag, rng, draws):
    """Identical composition to engine.run_procedure(fixed_lag=None) with an explicit number of draws."""
    residuals, _, coefficients = engine.fit_batch(values[None], months, lag, spec)
    residuals, coefficients = residuals[0], coefficients[0]
    tau = float(engine.pt_tau(residuals[None], lag)[0])
    modulus = engine.max_root_modulus(coefficients, lag, spec)
    if not np.isfinite(tau) or not modulus < 1.0:
        return {"state": "bootstrap_unavailable", "tau": None, "max_root_modulus": modulus}, residuals
    samples = engine.bootstrap_samples(values, months, lag, spec, coefficients, residuals, FAMILY, rng, draws=draws)
    taus, selected = engine.bootstrap_taus(samples, months, spec, None)
    if not np.all(np.isfinite(taus)):
        return {"state": "bootstrap_failed", "tau": tau, "max_root_modulus": modulus}, residuals
    exceed = int(np.sum(taus <= tau))
    lags, counts = np.unique(selected, return_counts=True)
    return {"state": "ok", "tau": tau, "exceedances": exceed, "p_boot": engine.bootstrap_p_value(tau, taus),
            "boot_lag_counts": {str(int(l)): int(c) for l, c in zip(lags, counts)}, "max_root_modulus": modulus}, residuals


def equivalence_check(values, months, spec, lag):
    """With B=199 the composition must reproduce engine.run_procedure exactly (throwaway key outside the protocol namespace)."""
    key = (99, 99)
    ours, _ = procedure(values, months, spec, lag, engine.generator([188, 20260928, 1], key), 199)
    frozen = engine.run_procedure(values, months, spec, lag, None, FAMILY, engine.generator([188, 20260928, 1], key))
    return ours["p_boot"] == frozen["p_boot"] and ours["boot_lag_counts"] == frozen["boot_lag_counts"] and ours["tau"] == frozen["tau"]


def main():
    protocol = json.loads((DATA / "var_phase_b_bootstrap_protocol.json").read_text())
    design = json.loads((DATA / "var_country_lag_identifiability_design.json").read_text())
    phase_a = json.loads((DATA / "var_country_lag_identifiability_results.json").read_text())
    extract = json.loads(Path(sys.argv[1]).read_text())
    if protocol["inherited_procedure"]["engine_sha256"] != sha(ROOT / "scripts/var-selection-aware-bootstrap/engine.py"):
        raise SystemExit("frozen engine changed")
    if extract["design_sha256"] != sha(DATA / "var_country_lag_identifiability_design.json"):
        raise SystemExit("extract provenance")
    B = protocol["bootstrap_replications_B"]
    entropy = protocol["rng"]["base_entropy"]
    asymptotic = {u["unit_id"]: u["by_lag"][str(u["selected_bic_lag"])]["portmanteau_h12"]["p_value"] for u in phase_a["units"]}
    units_design = {u["unit_id"]: u for u in design["units"]}
    rows, equivalence = [], []
    for unit in extract["units"]:
        d = units_design[unit["unit_id"]]
        spec = SPEC[unit["deterministic_terms"]]
        values = np.array(unit["data"], dtype=float)
        months = np.array([(int(p[5:7]) + 10) % 12 for p in unit["periods"]], dtype=np.int64)  # January -> 11 (omitted), as production
        lag = unit["selected_lag"]
        # residual equality with production before bootstrapping
        engine_resid, _, _ = engine.fit_batch(values[None], months, lag, spec)
        diff = float(np.max(np.abs(engine_resid[0] - np.array(unit["fits"][str(lag)]["resid"]))))
        if diff > 1e-8:
            rows.append({"unit_id": unit["unit_id"], "state": "bootstrap_unavailable", "reason": f"residual mismatch with production {diff}"})
            continue
        equivalence.append(equivalence_check(values, months, spec, lag))
        result, _ = procedure(values, months, spec, lag, engine.generator(entropy, (d["profile_index"], d["unit_index"])), B)
        row = {"unit_id": unit["unit_id"], "country": unit["country"], "profile_id": unit["profile_id"], "selected_lag": lag,
               "spawn_key": [d["profile_index"], d["unit_index"]], "residual_difference_vs_production": diff, **result,
               "asymptotic_portmanteau_p_value_for_comparison": asymptotic[unit["unit_id"]]}
        if result["state"] == "ok":
            k = result["exceedances"]
            p = result["p_boot"]
            lower = 0.0 if k == 0 else float(beta.ppf(0.005, k, B - k + 1))
            upper = 1.0 if k == B else float(beta.ppf(0.995, k + 1, B - k))
            row.update(bootstrap_p_value=p, mc_standard_error=float(np.sqrt(p * (1 - p) / B)), clopper_pearson_99=[lower, upper],
                       decision_at_0_05="reject" if p <= 0.05 else "not_reject", monte_carlo_borderline=bool(lower <= 0.05 <= upper))
        rows.append(row)
    doc = {"schema_version": "var-phase-b-bootstrap-results-v1.88", "generated_at": "2026-09-28",
           "protocol_sha256": sha(DATA / "var_phase_b_bootstrap_protocol.json"), "preregistration_sha256": sha(DATA / "var_country_lag_identifiability_preregistration.json"),
           "bootstrap_replications_B": B, "family": FAMILY, "engine_composition_equivalent_to_run_procedure_at_B199": all(equivalence) and len(equivalence) == len([r for r in rows if r.get("state") == "ok"]),
           "units": rows, "labels": ["research evidence, not production readiness", "not a replacement of the production diagnostic"],
           "production_changed": False, "readiness_changed": False, "formal_irf_publication_available": False}
    (DATA / "var_phase_b_bootstrap_results.json").write_text(json.dumps(doc, indent=1) + "\n")
    print(json.dumps({"units": len(rows), "equivalence": doc["engine_composition_equivalent_to_run_procedure_at_B199"]}))


if __name__ == "__main__":
    main()
