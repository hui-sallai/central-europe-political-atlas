#!/usr/bin/env python3
"""v1.89 independent validation (standard library only): recounts every checkpoint with explicit loops, re-derives the
preregistered classification, and checks seeds, provenance and frozen inputs. Usage: validate.py --checkpoint-dir DIR"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "ac42c4e568f39e582d8720967bb45a1bf88af93ba70f5e52f54c9fef23a5863a"
checks = 0


def require(condition, message):
    global checks
    checks += 1
    if not condition:
        raise SystemExit(f"v1.89 validation failed: {message}")


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint-dir", type=Path, required=True)
    args = ap.parse_args()
    require(sha(DATA / "var_country_matched_bootstrap_preregistration.json") == PREREG_SHA256, "preregistration hash")
    prereg = json.loads((DATA / "var_country_matched_bootstrap_preregistration.json").read_text())
    for rel, exp in prereg["frozen_input_sha256"].items():
        require(sha(ROOT / rel) == exp, f"frozen input changed: {rel}")
    design = json.loads((DATA / "var_country_matched_bootstrap_simulation_design.json").read_text())
    published = {c["cell_id"]: c for name in ("null_results", "power_results") for c in json.loads((DATA / f"var_country_matched_bootstrap_{name}.json").read_text())["cells"]}
    summary = json.loads((DATA / "var_country_matched_bootstrap_calibration_summary.json").read_text())
    code_sha = {p: sha(ROOT / p) for p in ["scripts/var-country-matched-bootstrap/cmb.py", "scripts/var-country-matched-bootstrap/run_simulation.py"]}
    keys, total, chunks, adequate_rates, inter, power = set(), 0, 0, [], [], {}
    for cell in design["cells"]:
        spec = design["phases"][cell["phase"]]
        t = {"n": 0, "fail": 0, "ok": 0, "rej": 0, "adq_ok": 0, "adq_rej": 0, "cor_ok": 0, "cor_rej": 0, "asy_rej": 0, "exact": 0}
        for ci in range(spec["replications"] // spec["chunk"]):
            path = args.checkpoint_dir / cell["phase"] / f"cell-{cell['cell_index']:03d}" / f"chunk-{ci:03d}.json"
            require(path.exists(), f"missing {path.name} {cell['cell_id']}")
            payload = json.loads(path.read_text())
            key = tuple(payload["data_spawn_key"])
            require(key == (spec["code"], cell["cell_index"], ci, 0) and key not in keys, f"spawn key {key}")
            keys.add(key)
            require(payload["code_sha256"] == code_sha, "code hash in checkpoint")
            chunks += 1
            for r in payload["records"]:
                t["n"] += 1
                t["exact"] += r["selected_lag"] == cell["true_lag"]
                b = r["bootstrap"]
                if b["state"] != "ok":
                    t["fail"] += 1
                    continue
                require(sum(b["boot_lag_counts"].values()) == 199 and (b["p_boot"] <= 0.05) == b["reject"] and (r["asymptotic_p"] <= 0.05) == r["asymptotic_reject"], "record consistency")
                t["ok"] += 1; t["rej"] += b["reject"]; t["asy_rej"] += r["asymptotic_reject"]
                if r["selected_lag"] >= cell["true_lag"]:
                    t["adq_ok"] += 1; t["adq_rej"] += b["reject"]
                if r["selected_lag"] == cell["true_lag"]:
                    t["cor_ok"] += 1; t["cor_rej"] += b["reject"]
        total += t["n"]
        p = published[cell["cell_id"]]
        require(p["replications"] == t["n"] and p["computational_failures"] == t["fail"] and p["bic_exact_recovery"]["count"] == t["exact"], f"counts {cell['cell_id']}")
        require(p["all"]["bootstrap"]["count"] == t["rej"] and p["all"]["bootstrap"]["n"] == t["ok"] and p["all"]["asymptotic"]["count"] == t["asy_rej"], f"rejections {cell['cell_id']}")
        require(p["adequate_selected_model"]["bootstrap"]["count"] == t["adq_rej"] and p["adequate_selected_model"]["bootstrap"]["n"] == t["adq_ok"], f"adequacy {cell['cell_id']}")
        require(p["correct_recovery"]["bootstrap"]["count"] == t["cor_rej"] and p["correct_recovery"]["bootstrap"]["n"] == t["cor_ok"], f"correct {cell['cell_id']}")
        if cell["phase"] == "null" and t["adq_ok"] >= 500:
            rate = t["adq_rej"] / t["adq_ok"]
            adequate_rates.append(rate)
            if cell["design"] in ("p2_psi0.75", "p2_psi1.00", "p2_psi1.25"):
                n = t["adq_ok"]; z = 1.959963984540054
                centre = (rate + z * z / (2 * n)) / (1 + z * z / n); half = z * ((rate * (1 - rate) / n + z * z / (4 * n * n)) ** 0.5) / (1 + z * z / n)
                inter.append(rate < 0.035 and centre + half < 0.05)
        if cell["phase"] == "power":
            power.setdefault((cell["alternative"], cell["strength"]), []).append(t["rej"] / t["ok"])
    require(total == 312000 and chunks == 84 * 40 + 288 * 10, "totals")
    nominal = all(r <= 0.075 for r in adequate_rates) and sum(0.035 <= r <= 0.065 for r in adequate_rates) >= 0.9 * len(adequate_rates)
    conservative = (not nominal) and all(r <= 0.075 for r in adequate_rates) and bool(inter) and sum(inter) >= 0.25 * len(inter)
    size_status = "approximately_nominal" if nominal else ("materially_conservative" if conservative else "poorly_calibrated")
    med = lambda v: sorted(v)[len(v) // 2] if len(v) % 2 else (sorted(v)[len(v) // 2 - 1] + sorted(v)[len(v) // 2]) / 2
    useful = all(med(power[(a, 0.3)]) >= 0.80 and med(power[(a, 0.2)]) >= 0.50 for a in ("common_ar1", "seasonal_ar12"))
    outcome = {"approximately_nominal": "A" if useful else "E", "materially_conservative": "B" if useful else "C", "poorly_calibrated": "D"}[size_status]
    c = summary["classification"]
    require(c["size_status"] == size_status and c["power_status"] == ("useful" if useful else "weak") and c["outcome"] == outcome and c["production_change_authorized"] is False, "classification")
    print(json.dumps({"status": "pass", "checks": checks, "checkpoints": chunks, "replications": total, "outcome": outcome}, indent=1))


if __name__ == "__main__":
    main()
