// PostToolUse hook: lint the .ts/.tsx file that was just edited. On lint errors the output goes to stderr with exit code 2,
// which Claude Code feeds back so the problem is fixed immediately. Silent for other files.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const target = payload.tool_input?.file_path ?? "";
  if (!/\.(ts|tsx)$/.test(target)) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd();
  const file = path.resolve(root, target);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || relative.includes("node_modules") || !fs.existsSync(file)) process.exit(0);
  const eslint = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
  if (!fs.existsSync(eslint)) process.exit(0);
  const result = spawnSync(process.execPath, [eslint, "--no-warn-ignored", relative], { cwd: root, encoding: "utf8" });
  if (result.status === 0) process.exit(0);
  process.stderr.write(`ESLint reported problems in ${relative}:\n${result.stdout || result.stderr}`);
  process.exit(2);
});
