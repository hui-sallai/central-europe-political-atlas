// Resolve research-frozen inputs to their archived snapshots, so a live-data refresh does not break
// provenance checks for published research. See src/data/high-frequency/snapshots/snapshot_manifest.json.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function loadSnapshotManifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/snapshots/snapshot_manifest.json"), "utf8"));
}

/** Path to read for a frozen input: the archived snapshot when one is registered with that hash, else the file itself. */
export function frozenInputPath(root, relative, expectedSha) {
  const entry = loadSnapshotManifest(root).snapshots.find((s) => s.live_path === relative && (expectedSha === undefined || s.sha256 === expectedSha));
  return entry ? entry.snapshot_path : relative;
}

export function frozenInputSha(root, relative, expectedSha) {
  return createHash("sha256").update(fs.readFileSync(path.join(root, frozenInputPath(root, relative, expectedSha)))).digest("hex");
}

/** Live data files that are allowed to change because every frozen use of them is covered by a registered snapshot. */
export function refreshableLivePaths(root) {
  const manifest = loadSnapshotManifest(root);
  return manifest.snapshots.filter((s) => createHash("sha256").update(fs.readFileSync(path.join(root, s.snapshot_path))).digest("hex") === s.sha256).map((s) => s.live_path);
}
