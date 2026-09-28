#!/usr/bin/env python3
"""v1.87 checkpointed lag-selection characterization Monte Carlo (synthetic only; resumable; no seed reuse)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lagchar as L  # noqa: E402

DESIGN = L.ROOT / "src" / "data" / "macro" / "var_lag_characterization_simulation_design.json"
PREREG = L.ROOT / "src" / "data" / "macro" / "var_lag_characterization_preregistration.json"
PREREG_SHA256 = "956f4114416cd88a221adc991b079df127c8b9dea6e88f1027d050f458dc3a7a"
V186_FAMILY = "recursive_iid_residual"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def covariance(cell: dict) -> np.ndarray:
    base = L.INNOVATION_COVARIANCE if cell["covariance"] == "v185" else L.HIGH_CORRELATION_COVARIANCE
    return base[: cell["k"], : cell["k"]]


def run_chunk(task: dict) -> dict:
    started = time.monotonic()
    cell, code = task["cell"], task["phase_code"]
    count = task["end"] - task["start"]
    coefs = [np.array(m) for m in cell["coefficients"]]
    values, months = L.simulate(coefs, covariance(cell), cell["sample_size"], cell["deterministic_spec"], cell["innovation"], count,
                                L.generator((code, cell["cell_index"], task["chunk_index"], 0)))
    ic = L.information_criteria(values, months, cell["deterministic_spec"])
    selected = {name: (np.argmin(ic[name], axis=1) + 1).tolist() for name in ("bic", "aic", "hqic")}
    bic = ic["bic"]
    payload = {"schema_version": "var-lag-characterization-checkpoint-v1.87", "phase": task["phase"], "phase_code": code, "cell_id": cell["cell_id"],
               "cell_index": cell["cell_index"], "chunk_index": task["chunk_index"], "start": task["start"], "end": task["end"],
               "data_spawn_key": [code, cell["cell_index"], task["chunk_index"], 0], "code_sha256": task["code_sha256"],
               "pmax": ic["pmax"], "n_common": ic["n_common"], "selected": selected,
               "bic_lag1_minus_lag2": np.round(bic[:, 0] - bic[:, 1], 9).tolist(),
               "bic_true_minus_min": np.round(bic[:, cell["true_lag"] - 1] - bic.min(axis=1), 9).tolist()}
    if task["phase"] == "bootstrap_adequacy":
        sys.path.insert(0, str(L.ROOT / "scripts" / "var-selection-aware-bootstrap"))
        import engine  # noqa: E402  (frozen v1.86)
        rng = L.generator((code, cell["cell_index"], task["chunk_index"], 1))
        payload["bootstrap"] = [engine.run_procedure(values[i], months, cell["deterministic_spec"], selected["bic"][i], None, V186_FAMILY, rng) for i in range(count)]
        payload["bootstrap_family"] = V186_FAMILY
    payload["elapsed_seconds"] = time.monotonic() - started
    return payload


def checkpoint_path(root: Path, phase: str, cell_index: int, chunk_index: int) -> Path:
    return root / phase / f"cell-{cell_index:03d}" / f"chunk-{chunk_index:03d}.json"


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False) + "\n")
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True, choices=("lag_selection_primary", "lag_selection_secondary", "bootstrap_adequacy", "smoke"))
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--checkpoint-dir", type=Path, default=Path(os.environ.get("VAR_LAG_CHARACTERIZATION_CHECKPOINT_DIR", "/private/tmp/var-lag-characterization-checkpoints")))
    args = parser.parse_args()
    if args.phase != "smoke" and sha256(PREREG) != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch; refusing to simulate")
    design = json.loads(DESIGN.read_text())
    code_sha = {p: sha256(L.ROOT / p) for p in ["scripts/var-lag-selection-characterization/lagchar.py", "scripts/var-lag-selection-characterization/run_simulation.py"]}
    if args.phase == "smoke":
        # Engineering smoke test (phase code 1): two lag-selection cells and one bootstrap cell, 10 replications each.
        picks = [c for c in design["cells"] if c["feasible"] and c["sample_size"] == 120 and c["persistence"] == 0.8 and c["deterministic_spec"] == "constant" and c["design"] in ("p1", "p2_psi1.00")]
        plan = [("lag_selection_primary", picks[0]), ("lag_selection_primary", picks[1]), ("bootstrap_adequacy", [c for c in picks if c["phase"] == "bootstrap_adequacy"][0])]
        tasks = [{"phase": ph, "phase_code": 1, "cell": {**cell, "cell_index": i}, "chunk_index": 0, "start": 0, "end": 10, "code_sha256": code_sha,
                  "path": str(checkpoint_path(args.checkpoint_dir, "smoke", i, 0))} for i, (ph, cell) in enumerate(plan)]
    else:
        spec = design["phases"][args.phase]
        tasks = []
        for cell in design["cells"]:
            if cell["phase"] != args.phase or not cell["feasible"]:
                continue
            for chunk_index, start in enumerate(range(0, spec["replications"], spec["chunk"])):
                path = checkpoint_path(args.checkpoint_dir, args.phase, cell["cell_index"], chunk_index)
                if path.exists():
                    continue
                tasks.append({"phase": args.phase, "phase_code": spec["code"], "cell": cell, "chunk_index": chunk_index, "start": start,
                              "end": min(spec["replications"], start + spec["chunk"]), "code_sha256": code_sha, "path": str(path)})
    started, done = time.monotonic(), 0
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_chunk, task): task for task in tasks}
        for future in as_completed(futures):
            atomic_write(Path(futures[future]["path"]), future.result())
            done += 1
            if done % 25 == 0 or done == len(tasks):
                print(json.dumps({"phase": args.phase, "completed": done, "scheduled": len(tasks), "elapsed_seconds": round(time.monotonic() - started, 1)}), flush=True)
    print(json.dumps({"status": "complete", "phase": args.phase, "new_chunks": done}))


if __name__ == "__main__":
    main()
