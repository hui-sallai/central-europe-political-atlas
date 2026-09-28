#!/usr/bin/env python3
"""v1.87 independent validation (standard library only): recounts every checkpoint with explicit loops, separately
from summarize.py, and checks provenance, seeds, frozen inputs and the published summaries. Usage: validate.py --checkpoint-dir DIR"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "956f4114416cd88a221adc991b079df127c8b9dea6e88f1027d050f458dc3a7a"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.87 validation failed: {message}")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(name):
    return json.loads((DATA / f"var_lag_characterization_{name}.json").read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    args = parser.parse_args()
    require(sha(DATA / "var_lag_characterization_preregistration.json") == PREREG_SHA256, "preregistration hash")
    prereg = load("preregistration")
    for relative, expected in prereg["frozen_input_sha256"].items():
        require(sha(ROOT / relative) == expected, f"frozen input changed: {relative}")
    design, results, adequacy = load("simulation_design"), load("lag_selection_results"), load("adequacy_decomposition")
    code = {p: sha(ROOT / p) for p in ["scripts/var-lag-selection-characterization/lagchar.py", "scripts/var-lag-selection-characterization/run_simulation.py"]}
    published = {c["cell_id"]: c for c in results["cells"]}
    published_adequacy = {c["cell_id"]: c for c in adequacy["cells"]}
    keys, total, chunks = set(), 0, 0
    feasible = [c for c in design["cells"] if c["feasible"]]
    require(len(feasible) == 546 and len(results["cells"]) == 546 and len(results["infeasible_cells"]) == 102, "cell coverage")
    for cell in feasible:
        spec = design["phases"][cell["phase"]]
        counts, cats, boot = {}, {}, {}
        n = 0
        for chunk_index in range(spec["replications"] // spec["chunk"]):
            path = args.checkpoint_dir / cell["phase"] / f"cell-{cell['cell_index']:03d}" / f"chunk-{chunk_index:03d}.json"
            require(path.exists(), f"missing {path.name} for {cell['cell_id']}")
            payload = json.loads(path.read_text())
            key = tuple(payload["data_spawn_key"])
            require(key == (spec["code"], cell["cell_index"], chunk_index, 0) and key not in keys, f"spawn key {key}")
            keys.add(key)
            require(payload["code_sha256"] == code, f"code hash in checkpoint {cell['cell_id']}")
            chunks += 1
            for i, selected in enumerate(payload["selected"]["bic"]):
                n += 1
                counts[selected] = counts.get(selected, 0) + 1
                if selected == cell["true_lag"]:
                    cat = "correct_recovery"
                elif selected > cell["true_lag"]:
                    cat = "overselection"
                else:
                    cat = "underselection_adequate_approximation" if cell["population"]["underfit_var1"]["approximate_power"] <= 0.10 else "underselection_inadequate_model"
                cats[cat] = cats.get(cat, 0) + 1
                if cell["phase"] == "bootstrap_adequacy":
                    b = payload["bootstrap"][i]
                    t = boot.setdefault(cat, [0, 0, 0])
                    if b["state"] != "ok":
                        t[2] += 1
                    else:
                        require(sum(b["boot_lag_counts"].values()) == 199 and (b["p_boot"] <= 0.05) == b["reject"], "bootstrap record")
                        t[0] += 1
                        t[1] += 1 if b["reject"] else 0
        require(n == spec["replications"], f"replications {cell['cell_id']}")
        total += n
        pub = published[cell["cell_id"]]
        require({int(k): v for k, v in pub["criteria"]["bic"]["selected_lag_counts"].items()} == counts, f"BIC counts {cell['cell_id']}")
        require(pub["criteria"]["bic"]["exact_recovery"]["count"] == counts.get(cell["true_lag"], 0), f"exact recovery {cell['cell_id']}")
        pa = published_adequacy[cell["cell_id"]]["adequacy_categories"]
        require(all(pa[c]["count"] == cats.get(c, 0) for c in pa), f"adequacy categories {cell['cell_id']}")
        if boot:
            pb = published_adequacy[cell["cell_id"]]["bootstrap_diagnostic_by_category"]
            for c, (ok, rej, fail) in boot.items():
                require(pb[c]["rejection"]["n"] == ok and pb[c]["rejection"]["count"] == rej and pb[c]["failures"] == fail, f"bootstrap tallies {cell['cell_id']}/{c}")
    require(total == 3360000 and results["total_replications"] == 3360000, "total replications")
    require(chunks == 3600 + 276 * 10 + 90 * 40, "checkpoint count")
    for doc in (results, adequacy, load("signal_strength_decomposition"), load("mc_uncertainty_summary")):
        require(doc["actual_country_data_read"] is False and doc["production_changed"] is False, "boundary flags")
    require(results["criteria_roles"] == {"bic": "production", "aic": "report_only_benchmark", "hqic": "report_only_benchmark"}, "criterion roles")
    print(json.dumps({"status": "pass", "checks": checks, "checkpoints": chunks, "replications": total}, indent=2))


if __name__ == "__main__":
    main()
