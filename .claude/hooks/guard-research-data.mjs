// PreToolUse hook: editing research data or the published research-data export needs explicit confirmation.
// Reads the hook payload from stdin; for paths under src/data/ or public/research-data/ it returns
// permissionDecision "ask" with the reason, otherwise it stays silent (normal permission flow).
import path from "node:path";

let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const input = payload.tool_input ?? {};
  const target = input.file_path ?? input.notebook_path ?? "";
  if (!target) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload.cwd ?? process.cwd();
  const relative = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
  if (!/^(src\/data\/|public\/research-data\/)/.test(relative)) process.exit(0);
  const exempt = /^src\/data\/release\.json$/.test(relative) ? "（仅限发布流程 release skill）"
    : /^src\/data\/events\/news_.*\.json$/.test(relative) ? "（仅限每周新闻流程 weekly-news-update skill）" : "";
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `即将修改研究数据：${relative}${exempt}。研究数据、冻结结果和研究结论不得改动（见 CLAUDE.md）。确认这是获批的例外后再继续。 / About to edit research data (${relative}); frozen research data must not change — confirm this is an approved exception.`,
    },
  }));
});
