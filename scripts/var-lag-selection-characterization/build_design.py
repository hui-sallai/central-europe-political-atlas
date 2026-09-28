#!/usr/bin/env python3
"""Build the frozen v1.87 simulation design (deterministic; no random numbers). Usage: build_design.py [--check]"""
import hashlib
import json
import sys
from itertools import product
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lagchar as L  # noqa: E402

OUTPUT = L.ROOT / "src" / "data" / "macro" / "var_lag_characterization_simulation_design.json"
DESIGNS = ["p1", "p2_v185", "p2_psi0.25", "p2_psi0.50", "p2_psi1.00", "p2_psi2.00"]
VARIANTS = {
    "primary": {"k": 3, "covariance": "v185", "innovation": "gaussian_iid"},
    "k2": {"k": 2, "covariance": "v185", "innovation": "gaussian_iid"},
    "high_correlation": {"k": 3, "covariance": "high_correlation", "innovation": "gaussian_iid"},
    "t5": {"k": 3, "covariance": "v185", "innovation": "multivariate_t5_scaled_to_covariance"},
}
PHASES = {
    "lag_selection_primary": {"code": 2, "variants": ["primary"], "sample_sizes": [96, 120, 132, 144, 180, 240], "replications": 10000, "chunk": 500},
    "lag_selection_secondary": {"code": 3, "variants": ["k2", "high_correlation", "t5"], "sample_sizes": [120, 132, 144], "replications": 5000, "chunk": 500},
    "bootstrap_adequacy": {"code": 4, "variants": ["primary"], "sample_sizes": [120, 132, 144], "replications": 2000, "chunk": 50},
}


def covariance(name: str, k: int) -> np.ndarray:
    base = L.INNOVATION_COVARIANCE if name == "v185" else L.HIGH_CORRELATION_COVARIANCE
    return base[:k, :k]


def design_coefficients(design: str, k: int, rho: float, sigma: np.ndarray) -> dict:
    if design == "p1":
        return {"feasible": True, "true_lag": 1, "coefficients": L.lag1_design(k, rho)}
    if design == "p2_v185":
        return {"feasible": True, "true_lag": 2, "coefficients": L.v185_lag2_design(k, rho)}
    built = L.signal_lag2_design(k, rho, sigma, float(design.split("psi")[1]))
    return {**built, "true_lag": 2}


def build() -> dict:
    cells, index = [], {}
    for phase, spec in PHASES.items():
        cell_index = 0
        for variant, sample_size, rho, deterministic, design in product(spec["variants"], spec["sample_sizes"], (0.5, 0.8, 0.95), ("constant", "constant_plus_11_month_dummies"), DESIGNS):
            v = VARIANTS[variant]
            sigma = covariance(v["covariance"], v["k"])
            key = (variant, rho, design)
            if key not in index:
                index[key] = design_coefficients(design, v["k"], rho, sigma)
            built = index[key]
            cell = {"phase": phase, "variant": variant, "k": v["k"], "covariance": v["covariance"], "innovation": v["innovation"], "sample_size": sample_size,
                    "persistence": rho, "deterministic_spec": deterministic, "design": design, "true_lag": built["true_lag"], "feasible": built["feasible"],
                    "cell_id": f"{phase}_{variant}_T{sample_size}_r{rho:.2f}_{deterministic}_{design}"}
            if not built["feasible"]:
                cell.update(infeasible_reason="lag-2 signal target unattainable at this persistence while keeping the v1.85 lag-2 direction and spectral radius", psi_max_feasible=built["psi_max_feasible"])
            else:
                coefs = built["coefficients"]
                cell["cell_index"] = cell_index
                cell_index += 1
                cell["coefficients"] = [m.tolist() for m in coefs]
                cell["spectral_radius"] = L.spectral_radius(coefs)
                cell["max_candidate_lag"] = L.maximum_candidate_lag(sample_size, v["k"])
                cell["common_sample_observations"] = sample_size - cell["max_candidate_lag"]
                if built["true_lag"] == 2:
                    delta = L.lag2_information(coefs, sigma)
                    cell["population"] = {"lag2_information_delta": delta, "psi_at_T": L.signal_ratio(delta, sample_size, v["k"]),
                                          "psi_at_reference_T": L.signal_ratio(delta, L.SIGNAL_REFERENCE_T, v["k"]),
                                          "underfit_var1": L.underfit_detectability(coefs, sigma, sample_size, 1)}
            cells.append(cell)
    return {
        "schema_version": "var-lag-characterization-simulation-design-v1.87",
        "registered_at": "2026-09-28",
        "baseline": "v1.85/v1.86 DGP family: v1.85 coefficient templates, innovation covariance, intercept, month effects, burn-in 300; the frozen v1.85 VAR(1) and VAR(2) constructions are included unchanged as designs p1 and p2_v185.",
        "v1_85_v1_86_designs_modified": False,
        "signal_strength_definition": {
            "psi": "psi(T) = delta / (K^2 ln n / n), n = T - pmax(T); delta = log det Sigma(population least-squares VAR(1)) - log det Sigma_u",
            "interpretation": "population lag-2 information relative to the BIC penalty for one extra lag; asymptotically BIC prefers lag 2 when psi > 1",
            "reference_T": L.SIGNAL_REFERENCE_T,
            "levels": {"weak": [0.25, 0.5], "moderate": [1.0], "strong": [2.0], "frozen_v185_template": "psi 0.06-0.18"},
            "construction": "A1 = a*T1 (v1.85 lag-1 template), A2 = b*T2 (v1.85 lag-2 template direction); b solves psi(T_ref) = target and a solves spectral radius = rho by bisection; infeasible targets are recorded, never substituted",
        },
        "adequacy_definition": {
            "measure": "approximate asymptotic power at 5% of the nominal h=12 adjusted Portmanteau against the population residual autocorrelation of the pseudo-true (population least-squares) VAR(1), noncentrality n * sum_j tr(C_j' C_0^-1 C_j C_0^-1)",
            "adequate_lower_order_approximation": "power <= 0.10",
            "inadequate_lower_order_model": "power > 0.10",
            "note": "design-level property of (DGP, T); correct and over-selected models are correctly specified",
        },
        "variants": VARIANTS,
        "phases": PHASES,
        "designs": DESIGNS,
        "cells": cells,
        "cell_counts": {phase: {"feasible": sum(c["phase"] == phase and c["feasible"] for c in cells), "infeasible": sum(c["phase"] == phase and not c["feasible"] for c in cells)} for phase in PHASES},
        "code_sha256": {p: hashlib.sha256((L.ROOT / p).read_bytes()).hexdigest() for p in ["scripts/var-lag-selection-characterization/lagchar.py", "scripts/var-lag-selection-characterization/build_design.py"]},
    }


def main():
    text = json.dumps(build(), indent=1) + "\n"
    if "--check" in sys.argv:
        if OUTPUT.read_text() != text:
            raise SystemExit("design differs from deterministic rebuild")
        print(json.dumps({"status": "pass", "design_rebuild_identical": True}))
        return
    OUTPUT.write_text(text)
    d = json.loads(text)
    print(json.dumps(d["cell_counts"]))


if __name__ == "__main__":
    main()
