// PreToolUse hook: any tool call that may mutate research data needs explicit owner confirmation.
//   - Edit / Write / MultiEdit / NotebookEdit on src/data/** or public/research-data/**;
//   - Bash commands classified by lib/research-data-guard.mjs (shell mutation syntax, git tree operations, and programs
//     that write research data — package scripts expanded, script sources scanned, known writers registry).
// On a finding it returns permissionDecision "ask" with the reasons; otherwise it stays silent (normal permission flow).
// For Bash it also records the state of the protected trees so detect-research-data-changes.mjs (PostToolUse) can report
// any mutation the static classifier did not anticipate.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyCommand, createContext, isProtectedRelative, protectedTreeState, toRelative } from "./lib/research-data-guard.mjs";

const EXEMPTIONS = [
  [/^src\/data\/release\.json$/, "（仅限发布流程 release skill）"],
  [/^src\/data\/events\/news_.*\.json$/, "（仅限每周新闻流程 weekly-news-update skill）"],
  [/^src\/data\/data-refresh\//, "（仅限官方数据刷新流程 official-data-refresh skill）"],
];

export function stateFile(payload) {
  const key = `${payload.session_id ?? "session"}-${payload.tool_use_id ?? "last"}`.replace(/[^\w.-]/g, "_");
  return path.join(os.tmpdir(), "atlas-research-guard", `${key}.json`);
}

function ask(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason } }));
}

let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd();
  const input = payload.tool_input ?? {};

  if (payload.tool_name === "Bash") {
    const command = String(input.command ?? "");
    const state = protectedTreeState(root);
    if (state) {
      try {
        fs.mkdirSync(path.dirname(stateFile(payload)), { recursive: true });
        fs.writeFileSync(stateFile(payload), JSON.stringify(state));
      } catch { /* detector falls back to reporting nothing */ }
    }
    let reasons = [];
    try { reasons = classifyCommand(command, createContext(root, payload.cwd ?? root)); } catch (error) { reasons = [`guard could not analyse the command (${error.message})`]; }
    if (!reasons.length) process.exit(0);
    ask(`此命令可能修改研究数据（src/data/ 或 public/research-data/）：\n- ${reasons.slice(0, 8).join("\n- ")}\n研究数据、冻结结果和研究结论不得改动；仅获批流程（官方数据刷新、每周新闻、发布）可在确认后运行（见 CLAUDE.md）。 / This command may modify protected research data — confirm it belongs to an approved workflow.`);
    return;
  }

  const target = input.file_path ?? input.notebook_path ?? "";
  if (!target) process.exit(0);
  const relative = toRelative(root, target);
  if (!isProtectedRelative(relative)) process.exit(0);
  const exempt = EXEMPTIONS.find(([re]) => re.test(relative))?.[1] ?? "";
  ask(`即将修改研究数据：${relative}${exempt}。研究数据、冻结结果和研究结论不得改动（见 CLAUDE.md）。确认这是获批的例外后再继续。 / About to edit research data (${relative}); frozen research data must not change — confirm this is an approved exception.`);
});
