"""Resolve research-frozen inputs to archived snapshots (Python twin of scripts/lib/frozen-inputs.mjs)."""
import hashlib
import json
from pathlib import Path


def _manifest(root: Path) -> dict:
    return json.loads((root / "src/data/high-frequency/snapshots/snapshot_manifest.json").read_text())


def frozen_input_path(root: Path, relative: str, expected_sha: str | None = None) -> Path:
    for entry in _manifest(root)["snapshots"]:
        if entry["live_path"] == relative and (expected_sha is None or entry["sha256"] == expected_sha):
            return root / entry["snapshot_path"]
    return root / relative


def frozen_input_sha(root: Path, relative: str, expected_sha: str | None = None) -> str:
    return hashlib.sha256(frozen_input_path(root, relative, expected_sha).read_bytes()).hexdigest()
