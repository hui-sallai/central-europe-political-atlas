#!/usr/bin/env python3
"""v1.86 checkpointed selection-aware bootstrap Monte Carlo (synthetic only, resumable, no seed reuse)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from itertools import product
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import engine  # noqa: E402

PHASES = {
    "smoke": {"code": 1, "replications": 10, "innovation": "gaussian_iid", "procedures": engine.PROCEDURES, "cells": 2},
    "primary": {"code": 2, "replications": 5000, "innovation": "gaussian_iid", "procedures": engine.PROCEDURES},
    "secondary_t5": {"code": 3, "replications": 1000, "innovation": "multivariate_t5_scaled_to_covariance", "procedures": engine.PROCEDURES},
    "power": {"code": 4, "replications": 1000, "innovation": "gaussian_iid", "procedures": ("selection_aware",), "serial_pattern": "common", "serial_rho": 0.2},
}
CHUNK_SIZE = 50
PREREG = engine.ROOT / "src" / "data" / "macro" / "var_selection_bootstrap_preregistration.json"
PREREG_SHA256 = "c37a32d53f01e2444c990807780a0aa53781f3c88c706f65035ce0345c790b6f"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cells_for(phase: str) -> list[dict]:
    spec = PHASES[phase]
    cells = []
    for sample_size, true_lag, persistence, deterministic in product((120, 132, 144), (1, 2), (0.5, 0.8, 0.95), ("constant", "constant_plus_11_month_dummies")):
        cell = {"cell_id": f"{phase}_T{sample_size}_p{true_lag}_r{persistence:.2f}_det-{deterministic}", "sample_size": sample_size, "true_lag": true_lag,
                "persistence": persistence, "deterministic_spec": deterministic, "innovation": spec["innovation"]}
        if "serial_pattern" in spec:
            cell.update(serial_pattern=spec["serial_pattern"], serial_rho=spec["serial_rho"])
        cells.append(cell)
    return cells[: spec.get("cells", len(cells))]


def run_chunk(task: dict) -> dict:
    started = time.monotonic()
    cell, code = task["cell"], task["phase_code"]
    count = task["replication_end"] - task["replication_start"]
    data_key = (code, task["cell_index"], task["chunk_index"], 0)
    values, months = engine.simulate_dgp(cell, count, data_key)
    spec = cell["deterministic_spec"]
    selected = engine.select_bic_lags(values, months, spec)
    generators = {}
    for family_index, family in enumerate(engine.FAMILIES):
        for procedure_index, procedure in enumerate(engine.PROCEDURES):
            generators[(family, procedure)] = engine.generator(engine.BASE_ENTROPY, (code, task["cell_index"], task["chunk_index"], 1 + 2 * family_index + procedure_index))
    records = []
    for i in range(count):
        record = {"replication": task["replication_start"] + i, "selected_lag": int(selected[i]), "procedures": {}}
        for procedure in task["procedures"]:
            lag, fixed = (int(selected[i]), None) if procedure == "selection_aware" else (cell["true_lag"], cell["true_lag"])
            record["procedures"][procedure] = {family: engine.run_procedure(values[i], months, spec, lag, fixed, family, generators[(family, procedure)]) for family in engine.FAMILIES}
        records.append(record)
    return {"schema_version": "var-selection-bootstrap-checkpoint-v1.86", "phase": task["phase"], "phase_code": code, "cell_index": task["cell_index"], "cell": cell,
            "chunk_index": task["chunk_index"], "replication_start": task["replication_start"], "replication_end": task["replication_end"],
            "data_spawn_key": list(data_key), "bootstrap_replications": engine.BOOTSTRAP_REPLICATIONS, "engine_sha256": task["engine_sha256"],
            "driver_sha256": task["driver_sha256"], "records": records, "elapsed_seconds": time.monotonic() - started}


def checkpoint_path(root: Path, phase: str, cell_index: int, chunk_index: int) -> Path:
    return root / phase / f"cell-{cell_index:02d}" / f"chunk-{chunk_index:03d}.json"


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=tuple(PHASES), required=True)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--checkpoint-dir", type=Path, default=Path(os.environ.get("VAR_SELECTION_BOOTSTRAP_CHECKPOINT_DIR", "/private/tmp/var-selection-bootstrap-checkpoints")))
    args = parser.parse_args()
    if sha256(PREREG) != PREREG_SHA256:
        raise SystemExit("preregistration hash mismatch; refusing to simulate")
    spec = PHASES[args.phase]
    engine_sha, driver_sha = sha256(Path(engine.__file__)), sha256(Path(__file__))
    tasks, existing = [], 0
    for cell_index, cell in enumerate(cells_for(args.phase)):
        for chunk_index, start in enumerate(range(0, spec["replications"], CHUNK_SIZE)):
            path = checkpoint_path(args.checkpoint_dir, args.phase, cell_index, chunk_index)
            if path.exists():
                existing += 1
                continue
            tasks.append({"phase": args.phase, "phase_code": spec["code"], "cell_index": cell_index, "cell": cell, "chunk_index": chunk_index,
                          "replication_start": start, "replication_end": min(spec["replications"], start + CHUNK_SIZE), "procedures": spec["procedures"],
                          "engine_sha256": engine_sha, "driver_sha256": driver_sha, "path": str(path)})
    started, done = time.monotonic(), 0
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_chunk, task): task for task in tasks}
        for future in as_completed(futures):
            atomic_write(Path(futures[future]["path"]), future.result())
            done += 1
            if done % 20 == 0 or done == len(tasks):
                print(json.dumps({"phase": args.phase, "completed": done, "scheduled": len(tasks), "preexisting": existing, "elapsed_seconds": round(time.monotonic() - started, 1)}), flush=True)
    print(json.dumps({"status": "complete", "phase": args.phase, "new_chunks": done, "preexisting_chunks": existing}))


if __name__ == "__main__":
    main()
