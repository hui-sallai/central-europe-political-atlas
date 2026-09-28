#!/usr/bin/env python3
"""v1.87 reference fixtures (phase code 0 seeds only). Usage: reference.py [--check]"""
import json
import sys
from math import log
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lagchar as L  # noqa: E402
from common import BASE_ENTROPY as V185_ENTROPY, fit_var, scaled_coefficients  # noqa: E402  (frozen v1.85)
from simulate import select_bic_lags, simulate_batch as v185_simulate_batch  # noqa: E402  (frozen v1.85)

OUTPUT = L.ROOT / "src" / "data" / "macro" / "var_lag_characterization_reference_validation.json"
DESIGN = L.ROOT / "src" / "data" / "macro" / "var_lag_characterization_simulation_design.json"


def independent_ic(sample, months, spec):
    total, k = sample.shape
    pmax = L.maximum_candidate_lag(total, k)
    out = {"bic": [], "aic": [], "hqic": []}
    for lag in range(1, pmax + 1):
        fit = fit_var(sample[pmax - lag:], months[pmax - lag:], lag, spec)
        n = fit.residuals.shape[0]
        ld = float(np.log(np.linalg.det(fit.residuals.T @ fit.residuals / n)))
        fp = lag * k * k + k * L.deterministic_count(spec)
        out["bic"].append(ld + log(n) / n * fp)
        out["aic"].append(ld + 2 / n * fp)
        out["hqic"].append(ld + 2 * log(log(n)) / n * fp)
    return out


def run():
    rec = {"schema_version": "var-lag-characterization-reference-validation-v1.87", "checks": {}, "actual_country_data_read": False}
    worst = 0.0
    # 1. generator identity with frozen v1.85 (v1.85 entropy, keys (0, 98, i) never used by v1.85)
    gen = []
    for i, (p, rho, spec, T) in enumerate([(1, 0.8, "constant", 120), (2, 0.95, "constant_plus_11_month_dummies", 144), (2, 0.5, "constant", 96)]):
        cell = {"sample_size": T, "true_lag": p, "persistence": rho, "deterministic_spec": spec, "innovation": "gaussian_iid"}
        old, old_m = v185_simulate_batch(cell, 4, (0, 98, i))
        new, new_m = L.simulate(list(scaled_coefficients(p, rho)), L.INNOVATION_COVARIANCE, T, spec, "gaussian_iid", 4, L.generator((0, 98, i), V185_ENTROPY))
        gen.append({"case": i, "max_abs_difference": float(np.max(np.abs(old - new))), "months_identical": bool(np.array_equal(old_m, new_m))})
    rec["checks"]["generator_matches_v1_85"] = {"cases": gen, "pass": all(c["max_abs_difference"] == 0.0 and c["months_identical"] for c in gen)}

    # 2-4. information criteria
    design = json.loads(DESIGN.read_text())
    picks = [c for c in design["cells"] if c["feasible"] and c["phase"] in ("lag_selection_primary", "lag_selection_secondary") and c["persistence"] == 0.95 and c["design"] in ("p2_psi1.00", "p1") and c["sample_size"] in (96, 132, 240)]
    ic_cases, sm_cases = [], []
    for j, cell in enumerate(picks):
        sigma = (L.INNOVATION_COVARIANCE if cell["covariance"] == "v185" else L.HIGH_CORRELATION_COVARIANCE)[: cell["k"], : cell["k"]]
        data, months = L.simulate([np.array(m) for m in cell["coefficients"]], sigma, cell["sample_size"], cell["deterministic_spec"], cell["innovation"], 3, L.generator((0, 1, j, 0)))
        ic = L.information_criteria(data, months, cell["deterministic_spec"])
        frozen = select_bic_lags(data, months, cell["deterministic_spec"])
        for r in range(3):
            ind = independent_ic(data[r], months, cell["deterministic_spec"])
            diff = max(float(np.max(np.abs(np.array(ind[name]) - ic[name][r]))) for name in ("bic", "aic", "hqic"))
            worst = max(worst, diff)
            ic_cases.append({"cell_id": cell["cell_id"], "replication": r, "max_ic_difference": diff,
                             "bic_matches_frozen_v1_85_selector": int(np.argmin(ic["bic"][r]) + 1) == int(frozen[r]), "selected_bic": int(np.argmin(ic["bic"][r]) + 1)})
            if cell["deterministic_spec"] == "constant":
                from statsmodels.tsa.api import VAR
                orders = VAR(data[r]).select_order(maxlags=ic["pmax"], trend="c").selected_orders
                sm_cases.append({"cell_id": cell["cell_id"], "replication": r, "agree": all(orders[name] == int(np.argmin(ic[name][r]) + 1) for name in ("bic", "aic", "hqic")),
                                 "statsmodels": {name: int(orders[name]) for name in ("bic", "aic", "hqic")}})
    rec["checks"]["information_criteria_independent"] = {"cases": ic_cases, "pass": all(c["max_ic_difference"] <= 1e-10 and c["bic_matches_frozen_v1_85_selector"] for c in ic_cases)}
    rec["checks"]["statsmodels_select_order"] = {"cases": sm_cases, "pass": len(sm_cases) >= 6 and all(c["agree"] for c in sm_cases)}

    # 5. population algebra and signal construction for every feasible design cell
    from statsmodels.tsa.vector_ar.var_model import VARProcess
    pop = {"max_acf_difference_vs_statsmodels": 0.0, "max_psi_target_error": 0.0, "max_radius_error": 0.0, "max_correct_spec_residual_autocovariance": 0.0}
    for cell in design["cells"]:
        if not cell["feasible"]:
            continue
        sigma = (L.INNOVATION_COVARIANCE if cell["covariance"] == "v185" else L.HIGH_CORRELATION_COVARIANCE)[: cell["k"], : cell["k"]]
        coefs = [np.array(m) for m in cell["coefficients"]]
        pop["max_radius_error"] = max(pop["max_radius_error"], abs(L.spectral_radius(coefs) - cell["persistence"]))
        if cell["design"].startswith("p2_psi"):
            pop["max_psi_target_error"] = max(pop["max_psi_target_error"], abs(cell["population"]["psi_at_reference_T"] - float(cell["design"].split("psi")[1])))
        if cell["sample_size"] == 132:
            g = L.autocovariances(coefs, sigma, 4)
            sm = VARProcess(np.array(coefs), np.zeros(cell["k"]), sigma).acf(4)
            pop["max_acf_difference_vs_statsmodels"] = max(pop["max_acf_difference_vs_statsmodels"], max(float(np.max(np.abs(g[h] - sm[h]))) for h in range(5)))
            c = L.pseudo_true_residual_autocovariances(coefs, sigma, cell["true_lag"], 3)
            pop["max_correct_spec_residual_autocovariance"] = max(pop["max_correct_spec_residual_autocovariance"], float(max(np.max(np.abs(c[h])) for h in (1, 2, 3))), float(np.max(np.abs(c[0] - sigma))))
    rec["checks"]["population_and_signal_construction"] = {**pop, "pass": pop["max_acf_difference_vs_statsmodels"] < 1e-9 and pop["max_psi_target_error"] < 1e-6 and pop["max_radius_error"] < 1e-8 and pop["max_correct_spec_residual_autocovariance"] < 1e-9}
    rec["maximum_information_criterion_discrepancy"] = worst
    rec["status"] = "pass" if all(v["pass"] for v in rec["checks"].values()) else "fail"
    return rec


def main():
    text = json.dumps(run(), indent=1) + "\n"
    if "--check" in sys.argv:
        if OUTPUT.read_text() != text:
            raise SystemExit("reference re-run differs from committed reference validation")
        print(json.dumps({"status": json.loads(text)["status"], "reproduced": True}))
        return
    OUTPUT.write_text(text)
    d = json.loads(text)
    print(json.dumps({"status": d["status"], **{k: v["pass"] for k, v in d["checks"].items()}, "max_ic_diff": d["maximum_information_criterion_discrepancy"]}, indent=1))
    if d["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
