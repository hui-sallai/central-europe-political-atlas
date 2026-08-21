// Shared release-derived naming for the versioned research package. The filename is
// derived from the canonical release metadata (src/data/release.json) so the package
// version can never drift from the platform version again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const releaseConfig = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "release.json"), "utf8"));

export function releaseVersionToken() {
  const match = /^v[\d.]+/.exec(releaseConfig.version);
  if (!match) throw new Error(`Cannot derive version token from release version: ${releaseConfig.version}`);
  return match[0];
}

export function researchPackageFilename() {
  return `research-data-${releaseVersionToken()}.zip`;
}

export function researchPackageLabel() {
  return `research package ${releaseVersionToken()}`;
}
