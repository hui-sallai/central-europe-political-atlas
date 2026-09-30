// PostToolUse hook (Bash): compares the protected research-data trees with the state recorded by guard-research-data.mjs
// before the command ran. Any file under src/data/** or public/research-data/** that appeared, changed or disappeared is
// reported to Claude (decision "block" → the reason is fed back) and to the owner (systemMessage), so no mutation — even
// one the static classifier could not foresee — happens silently. It cannot undo a change; review it with `git diff`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { diffStates, protectedTreeState } from "./lib/research-data-guard.mjs";

let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  if (payload.tool_name !== "Bash") process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd();
  const key = `${payload.session_id ?? "session"}-${payload.tool_use_id ?? "last"}`.replace(/[^\w.-]/g, "_");
  const file = path.join(os.tmpdir(), "atlas-research-guard", `${key}.json`);
  let before;
  try { before = JSON.parse(fs.readFileSync(file, "utf8")); } catch { process.exit(0); }
  try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
  const after = protectedTreeState(root);
  if (!after) process.exit(0);
  const changed = diffStates(before, after);
  if (!changed.length) process.exit(0);
  const list = changed.slice(0, 12).map((f) => `  ${f}`).join("\n") + (changed.length > 12 ? `\n  … ${changed.length - 12} more` : "");
  const message = `研究数据已被 Bash 命令修改（${changed.length} 个文件）：\n${list}\n如果这不是获批流程（官方数据刷新 / 每周新闻 / 发布）的一部分，请用 git diff 检查并恢复。 / A Bash command changed ${changed.length} protected research-data file(s); review with git diff and restore unless this was an approved workflow.`;
  process.stdout.write(JSON.stringify({ decision: "block", reason: message, systemMessage: message }));
});
