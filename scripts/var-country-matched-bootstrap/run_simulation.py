#!/usr/bin/env python3
"""v1.89 checkpointed country-matched calibration Monte Carlo (synthetic only; resumable; no seed reuse)."""
import argparse
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cmb  # noqa: E402

DATA = cmb.ROOT / "src" / "data" / "macro"
PREREG_SHA256 = "ac42c4e568f39e582d8720967bb45a1bf88af93ba70f5e52f54c9fef23a5863a"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_chunk(task):
    started = time.monotonic()
    cell, code = task["cell"], task["phase_code"]
    count = task["end"] - task["start"]
    coefs = [np.array(m) for m in cell["coefficients"]]
    values, months = cmb.simulate(coefs, cmb.COVARIANCES[cell["covariance"]], cell["deterministic_spec"], count,
                                  cmb.generator((code, cell["cell_index"], task["chunk_index"], 0)), cell["alternative"], cell["strength"])
    rng = cmb.generator((code, cell["cell_index"], task["chunk_index"], 1))
    records = [cmb.replicate(values[i], months, cell["deterministic_spec"], rng) for i in range(count)]
    return {"schema_version": "var-country-matched-bootstrap-checkpoint-v1.89", "phase": task["phase"], "cell_id": cell["cell_id"], "cell_index": cell["cell_index"],
            "chunk_index": task["chunk_index"], "start": task["start"], "end": task["end"], "data_spawn_key": [code, cell["cell_index"], task["chunk_index"], 0],
            "code_sha256": task["code_sha256"], "records": records, "elapsed_seconds": time.monotonic() - started}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True, choices=("null", "power", "smoke"))
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--checkpoint-dir", type=Path, default=Path(os.environ.get("VAR_COUNTRY_MATCHED_CHECKPOINT_DIR", "/private/tmp/var-country-matched-checkpoints")))
    args = parser.parse_args()
    if args.phase != "smoke" and sha256(DATA / "var_country_matched_bootstrap_preregistration.json") != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch; refusing to simulate")
    design = json.loads((DATA / "var_country_matched_bootstrap_simulation_design.json").read_text())
    code_sha = {p: sha256(cmb.ROOT / p) for p in ["scripts/var-country-matched-bootstrap/cmb.py", "scripts/var-country-matched-bootstrap/run_simulation.py"]}
    if args.phase == "smoke":
        picks = [c for c in design["cells"] if c["feasible"] and c["persistence"] == 0.95 and c["covariance"] == "v185_positive" and c["deterministic_spec"] == "constant_plus_11_month_dummies"
                 and ((c["phase"] == "null" and c["design"] == "p2_psi1.00") or (c["phase"] == "power" and c["design"] == "p1" and c["alternative"] == "seasonal_ar12" and c["strength"] == 0.3))]
        tasks = [{"phase": "smoke", "phase_code": 1, "cell": {**c, "cell_index": i}, "chunk_index": 0, "start": 0, "end": 8, "code_sha256": code_sha,
                  "path": str(args.checkpoint_dir / "smoke" / f"cell-{i:03d}" / "chunk-000.json")} for i, c in enumerate(picks)]
    else:
        spec = design["phases"][args.phase]
        tasks = []
        for cell in design["cells"]:
            if cell["phase"] != args.phase or not cell["feasible"]:
                continue
            for chunk_index, start in enumerate(range(0, spec["replications"], spec["chunk"])):
                path = args.checkpoint_dir / args.phase / f"cell-{cell['cell_index']:03d}" / f"chunk-{chunk_index:03d}.json"
                if not path.exists():
                    tasks.append({"phase": args.phase, "phase_code": spec["code"], "cell": cell, "chunk_index": chunk_index, "start": start,
                                  "end": min(spec["replications"], start + spec["chunk"]), "code_sha256": code_sha, "path": str(path)})
    started, done = time.monotonic(), 0
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_chunk, t): t for t in tasks}
        for future in as_completed(futures):
            path = Path(futures[future]["path"])
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(future.result(), separators=(",", ":"), allow_nan=False) + "\n")
            os.replace(tmp, path)
            done += 1
            if done % 25 == 0 or done == len(tasks):
                print(json.dumps({"phase": args.phase, "completed": done, "scheduled": len(tasks), "elapsed_seconds": round(time.monotonic() - started, 1)}), flush=True)
    print(json.dumps({"status": "complete", "phase": args.phase, "new_chunks": done}))


if __name__ == "__main__":
    main()
