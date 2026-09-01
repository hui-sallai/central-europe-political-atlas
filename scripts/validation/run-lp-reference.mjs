import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const venv = path.join(root, ".venv", "bin", "python");
const python = fs.existsSync(venv) ? venv : "python3";
const result = spawnSync(python, [path.join(root, "scripts/validation/generate-lp-reference.py")], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
