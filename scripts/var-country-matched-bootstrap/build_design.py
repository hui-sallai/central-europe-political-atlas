#!/usr/bin/env python3
"""Build the frozen v1.89 simulation design (deterministic; no random numbers). Usage: build_design.py [--check]"""
import hashlib
import json
import sys
from itertools import product
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cmb  # noqa: E402

OUTPUT = cmb.ROOT / "src" / "data" / "macro" / "var_country_matched_bootstrap_simulation_design.json"
PHASES = {"null": {"code": 2, "replications": 2000, "chunk": 50}, "power": {"code": 3, "replications": 500, "chunk": 50}}


def build():
    cache, cells = {}, []
    index = {"null": 0, "power": 0}

    def base(design, rho, cov):
        key = (design, rho, cov)
        if key not in cache:
            sigma = cmb.COVARIANCES[cov]
            if design == "p1":
                cache[key] = {"feasible": True, "true_lag": 1, "coefficients": cmb.L.lag1_design(3, rho)}
            else:
                cache[key] = {**cmb.signal_design(rho, sigma, float(design[6:])), "true_lag": 2}
        return cache[key]

    def add(phase, design, rho, cov, det, alternative=None, strength=0.0):
        built = base(design, rho, cov)
        cell = {"phase": phase, "design": design, "true_lag": built["true_lag"], "persistence": rho, "covariance": cov, "deterministic_spec": det,
                "alternative": alternative, "strength": strength, "sample_size": cmb.SAMPLE_SIZE, "feasible": built["feasible"],
                "cell_id": f"{phase}_{design}_r{rho:.2f}_{cov}_{det}" + (f"_{alternative}{strength:.2f}" if alternative else "")}
        if not built["feasible"]:
            cell["psi_max_feasible"] = built["psi_max_feasible"]
        else:
            coefs = built["coefficients"]
            sigma = cmb.COVARIANCES[cov]
            cell.update(cell_index=index[phase], coefficients=[m.tolist() for m in coefs], spectral_radius=cmb.L.spectral_radius(coefs))
            index[phase] += 1
            if built["true_lag"] == 2:
                delta = cmb.L.lag2_information(coefs, sigma)
                cell["population"] = {"psi_at_137": cmb.L.signal_ratio(delta, cmb.SAMPLE_SIZE, 3), "lag2_information_delta": delta,
                                      "underfit_var1": cmb.L.underfit_detectability(coefs, sigma, cmb.SAMPLE_SIZE, 1)}
        cells.append(cell)

    designs_null = ["p1"] + [f"p2_psi{p:.2f}" for p in cmb.PSI_LEVELS]
    for det, rho, cov, design in product(cmb.DETERMINISTIC, cmb.PERSISTENCE, cmb.COVARIANCES, designs_null):
        add("null", design, rho, cov, det)
    designs_power = ["p1"] + [f"p2_psi{p:.2f}" for p in cmb.INTERMEDIATE_PSI]
    for det, rho, cov, design, (alternative, strengths) in product(cmb.DETERMINISTIC, cmb.PERSISTENCE, cmb.COVARIANCES, designs_power, cmb.ALTERNATIVES.items()):
        for strength in strengths:
            add("power", design, rho, cov, det, alternative, strength)
    return {
        "schema_version": "var-country-matched-bootstrap-simulation-design-v1.89",
        "registered_at": "2026-09-28",
        "envelope_source": "pooled v1.88 Phase A ranges only (no per-country tuning): selected-model max root modulus 0.929-0.963; innovation correlations -0.42..+0.19; lag-2 units' eli_bias_adjusted 0.80-1.23 with 90% intervals 0.41-1.89",
        "envelope": {"sample_size": 137, "k": 3, "candidate_lags": "1..10 (production policy at T=137)", "persistence": list(cmb.PERSISTENCE), "covariances": {k: v.tolist() for k, v in cmb.COVARIANCES.items()},
                     "psi_at_137": list(cmb.PSI_LEVELS), "intermediate_region_psi": list(cmb.INTERMEDIATE_PSI), "deterministic": list(cmb.DETERMINISTIC),
                     "signal_construction": "v1.87 construction with psi defined at T=137 (A1=a*T1, A2=b*T2, spectral radius = persistence)"},
        "alternatives": {"common_ar1": "u_t = s u_{t-1} + sqrt(1-s^2) e_t, s in {0.1,0.2,0.3}", "seasonal_ar12": "u_t = s u_{t-12} + sqrt(1-s^2) e_t, s in {0.1,0.2,0.3}",
                         "note": "residual serial dependence outside any finite VAR in the candidate set; every rejection is power"},
        "phases": PHASES,
        "bootstrap": {"engine": "frozen v1.86 engine.run_procedure", "family": "recursive_iid_residual", "B": 199, "bic_rerun_inside_every_bootstrap_sample": True},
        "cells": cells,
        "cell_counts": {ph: {"feasible": sum(c["phase"] == ph and c["feasible"] for c in cells), "infeasible": sum(c["phase"] == ph and not c["feasible"] for c in cells)} for ph in PHASES},
        "code_sha256": {p: hashlib.sha256((cmb.ROOT / p).read_bytes()).hexdigest() for p in ["scripts/var-country-matched-bootstrap/cmb.py", "scripts/var-country-matched-bootstrap/build_design.py"]},
    }


def main():
    text = json.dumps(build(), indent=1) + "\n"
    if "--check" in sys.argv:
        if OUTPUT.read_text() != text:
            raise SystemExit("design differs from deterministic rebuild")
        print(json.dumps({"status": "pass", "design_rebuild_identical": True}))
        return
    OUTPUT.write_text(text)
    print(json.dumps(json.loads(text)["cell_counts"]))


if __name__ == "__main__":
    main()
