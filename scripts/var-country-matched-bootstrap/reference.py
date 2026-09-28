#!/usr/bin/env python3
"""v1.89 reference fixtures (phase code 0 seeds only). Usage: reference.py [--check]"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cmb  # noqa: E402
from common import BASE_ENTROPY as V185_ENTROPY, scaled_coefficients  # noqa: E402
from simulate import simulate_batch as v185_simulate_batch  # noqa: E402

OUTPUT = cmb.ROOT / "src" / "data" / "macro" / "var_country_matched_bootstrap_reference_validation.json"


def slow_seasonal(coefs, sigma, spec, count, rng, strength):
    """Independent per-series loop for the seasonal AR(12) alternative."""
    total = 437
    eps = rng.standard_normal((count, total, 3)) @ np.linalg.cholesky(sigma).T
    out = np.zeros((count, 137, 3))
    for r in range(count):
        u = np.zeros((total, 3)); y = np.zeros((total, 3))
        for t in range(total):
            u[t] = (strength * u[t - 12] if t >= 12 else 0.0) + np.sqrt(1 - strength ** 2) * eps[r, t]
            det = cmb.L.INTERCEPT + (cmb.L.month_effects(total)[t] if spec != "constant" else 0.0)
            y[t] = det + sum(coefs[i] @ y[t - 1 - i] for i in range(len(coefs)) if t - 1 - i >= 0) + u[t]
        out[r] = y[-137:]
    return out


def run():
    rec = {"schema_version": "var-country-matched-bootstrap-reference-validation-v1.89", "checks": {}, "actual_country_data_read": False}
    # 1. iid path identical to frozen v1.87 generator; common AR(1) path identical to frozen v1.85 'common' pattern
    coefs = list(scaled_coefficients(2, 0.95))
    a, _ = cmb.simulate(coefs, cmb.L.INNOVATION_COVARIANCE, "constant", 3, cmb.L.generator((0, 1, 0), cmb.BASE_ENTROPY))
    b, _ = cmb.L.simulate(coefs, cmb.L.INNOVATION_COVARIANCE, 137, "constant", "gaussian_iid", 3, cmb.L.generator((0, 1, 0), cmb.BASE_ENTROPY))
    rec["checks"]["iid_matches_v1_87"] = {"max_abs_difference": float(np.max(np.abs(a - b))), "pass": bool(np.array_equal(a, b))}
    cell = {"sample_size": 137, "true_lag": 2, "persistence": 0.95, "deterministic_spec": "constant_plus_11_month_dummies", "innovation": "gaussian_iid", "serial_pattern": "common", "serial_rho": 0.2}
    old, _ = v185_simulate_batch(cell, 3, (0, 97, 0))
    new, _ = cmb.simulate(coefs, cmb.L.INNOVATION_COVARIANCE, "constant_plus_11_month_dummies", 3, cmb.L.generator((0, 97, 0), V185_ENTROPY), "common_ar1", 0.2)
    rec["checks"]["common_ar1_matches_v1_85"] = {"max_abs_difference": float(np.max(np.abs(old - new))), "pass": float(np.max(np.abs(old - new))) < 1e-12}
    # 2. seasonal AR(12) against an independent loop
    fast, _ = cmb.simulate(coefs, cmb.COVARIANCES["envelope_mixed_sign"], "constant_plus_11_month_dummies", 2, cmb.L.generator((0, 2, 0), cmb.BASE_ENTROPY), "seasonal_ar12", 0.3)
    slow = slow_seasonal(coefs, cmb.COVARIANCES["envelope_mixed_sign"], "constant_plus_11_month_dummies", 2, cmb.L.generator((0, 2, 0), cmb.BASE_ENTROPY), 0.3)
    rec["checks"]["seasonal_ar12_independent"] = {"max_abs_difference": float(np.max(np.abs(fast - slow))), "pass": float(np.max(np.abs(fast - slow))) < 1e-9}
    # 3. design targets
    design = json.loads((cmb.ROOT / "src/data/macro/var_country_matched_bootstrap_simulation_design.json").read_text())
    psi_err = max(abs(c["population"]["psi_at_137"] - float(c["design"][6:])) for c in design["cells"] if c["feasible"] and c["true_lag"] == 2)
    rad_err = max(abs(c["spectral_radius"] - c["persistence"]) for c in design["cells"] if c["feasible"])
    rec["checks"]["design_targets"] = {"max_psi_error": psi_err, "max_radius_error": rad_err, "pass": psi_err < 1e-6 and rad_err < 1e-8}
    # 4. replicate() determinism and consistency with the frozen engine
    v, m = cmb.simulate(coefs, cmb.L.INNOVATION_COVARIANCE, "constant", 1, cmb.L.generator((0, 3, 0), cmb.BASE_ENTROPY))
    r1 = cmb.replicate(v[0], m, "constant", cmb.L.generator((0, 3, 1), cmb.BASE_ENTROPY))
    r2 = cmb.replicate(v[0], m, "constant", cmb.L.generator((0, 3, 1), cmb.BASE_ENTROPY))
    direct = cmb.engine.run_procedure(v[0], m, "constant", r1["selected_lag"], None, "recursive_iid_residual", cmb.L.generator((0, 3, 1), cmb.BASE_ENTROPY))
    rec["checks"]["replicate_determinism_and_engine_identity"] = {"pass": r1 == r2 and r1["bootstrap"] == direct and abs(r1["asymptotic_p"] - direct["tau"]) < 1e-15}
    rec["status"] = "pass" if all(c["pass"] for c in rec["checks"].values()) else "fail"
    return rec


def main():
    text = json.dumps(run(), indent=1) + "\n"
    if "--check" in sys.argv:
        if OUTPUT.read_text() != text:
            raise SystemExit("reference re-run differs")
        print(json.dumps({"status": json.loads(text)["status"], "reproduced": True}))
        return
    OUTPUT.write_text(text)
    d = json.loads(text)
    print(json.dumps({"status": d["status"], **{k: v["pass"] for k, v in d["checks"].items()}}))
    if d["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
