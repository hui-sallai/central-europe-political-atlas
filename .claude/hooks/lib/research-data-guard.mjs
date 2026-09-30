// Shared classifier for the research-data write guard (see CLAUDE.md, "Research-data write protection").
// Protected trees: src/data/** and public/research-data/**. The classifier is deliberately conservative: anything that can
// plausibly mutate a protected tree returns reasons (the hook then asks the owner); read-only commands return none.
//
// Layers:
//   1. direct file tools (Edit/Write/MultiEdit/NotebookEdit) on a protected path;
//   2. shell mutation syntax on a protected path: redirection, tee, cp/mv/rm/…, sed -i / perl -i, find -delete,
//      tar/unzip/curl/wget output, git commands that rewrite tracked research files;
//   3. programs: package.json scripts are expanded recursively; node/python/shell scripts and inline -e/-c code are
//      scanned statically (plus their local imports) for a write primitive combined with a protected-path reference;
//      `.claude/hooks/research-data-writers.json` lists the known canonical writers as a backstop.
// The PostToolUse detector (detect-research-data-changes.mjs) compares the protected trees before and after every Bash
// call, so a mutation that this static classifier cannot see is still reported immediately.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const PROTECTED_ROOTS = ["src/data", "public/research-data"];
const PROTECTED_RE = /(?:^|[\s'"`=:(,<>|&;])(?:\.\/)?(?:src\/data|public\/research-data)(?=$|[\s/'"`),;|&<>*])/;
// Protected-path references inside program source: literal paths, path.join("src", "data"), Path / "src" / "data".
const SOURCE_PROTECTED_RE = [
  /src\/data(?:\/|["'`])/,
  /public\/research-data/,
  /["'`]src["'`]\s*,\s*["'`]data["'`]/,
  /["'`]src["'`]\s*\)?\s*\/\s*["'`]data["'`]/,
  /["'`]public["'`]\s*,\s*["'`]research-data["'`]/,
  /["'`]public["'`]\s*\)?\s*\/\s*["'`]research-data["'`]/,
  /["'`]research-data["'`]/,
];
const SOURCE_WRITE_RE = [
  /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|copyFile|cpSync|renameSync|rename|rmSync|rmdirSync|unlinkSync|unlink|createWriteStream|truncateSync|symlinkSync|linkSync)\s*\(/,
  /\.(?:write_text|write_bytes)\s*\(/,
  /\bopen\s*\([^)]*["'](?:w|a|x|wb|ab|xb|w\+|a\+|r\+)["']/,
  /\bjson\.dump\s*\(/,
  /\bshutil\.(?:copy|copy2|copyfile|copytree|move|rmtree)\s*\(/,
  /\bos\.(?:remove|unlink|rename|replace|rmdir|makedirs)\s*\(/,
  /\.to_(?:csv|json|parquet)\s*\(/,
];
// Python pathlib mutators (only applied to .py sources; ".replace(" is a string method in JavaScript).
const PY_PATH_WRITE_RE = /\.(?:unlink|rename|replace|rmdir|touch|mkdir)\s*\(/;
// Expressions that read data rather than name a path: a variable assigned from them holds data, not a write target.
const READ_EXPR_RE = /\b(?:readFileSync|readFile|read|readJson|loadJson|JSON\.parse|json\.load|json\.loads|read_text|read_bytes|load_json|pd\.read_\w+|existsSync|statSync)\s*\(/;
const MUTATING_COMMANDS = new Set(["cp", "mv", "rm", "rmdir", "ln", "install", "touch", "truncate", "mkdir", "rsync", "ditto", "chmod", "chown", "unlink", "shred", "dd", "tar", "unzip", "curl", "wget", "patch", "split"]);
const GIT_TREE_OPS = new Set(["checkout", "restore", "reset", "clean", "stash", "apply", "am", "rm", "mv", "merge", "pull", "rebase", "cherry-pick", "revert", "switch"]);
const INTERPRETERS = /^(?:node|nodejs|bun|deno|tsx|ts-node|python|python3(?:\.\d+)?|pypy3?|bash|sh|zsh|ruby|perl)$/;

export function toRelative(root, target) {
  if (!target) return "";
  return path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
}

export function isProtectedRelative(relative) {
  return PROTECTED_ROOTS.some((p) => relative === p || relative.startsWith(`${p}/`));
}

// Replace absolute references to the project root with relative ones so "/…/repo/src/data" is caught like "src/data".
function normaliseRoot(text, root) {
  const variants = new Set([root, fs.existsSync(root) ? fs.realpathSync(root) : root]);
  let out = text;
  for (const v of variants) if (v && v !== "/") out = out.split(`${v}/`).join("./").split(v).join(".");
  return out;
}

// Minimal shell tokenizer: splits into command segments on ; && || | & newlines and $( ` boundaries, honours quotes.
export function splitSegments(command) {
  const segments = [];
  let current = [];
  let token = "";
  let quote = null;
  let hasToken = false;
  const pushToken = () => { if (hasToken) current.push(token); token = ""; hasToken = false; };
  const pushSegment = () => { pushToken(); if (current.length) segments.push(current); current = []; };
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < command.length) { token += command[i + 1]; i += 1; }
      else token += c;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; hasToken = true; continue; }
    if (c === "\\" && i + 1 < command.length) { token += command[i + 1]; hasToken = true; i += 1; continue; }
    if (c === "\n" || c === ";" || c === "`" || c === "(" || c === ")" || c === "{" || c === "}") { pushSegment(); continue; }
    if (c === "$" && command[i + 1] === "(") { pushSegment(); i += 1; continue; }
    if (c === "&" || c === "|") {
      if (c === "&" && command[i - 1] === ">") { token += c; hasToken = true; continue; }
      if (c === "&" && command[i + 1] === ">") { pushToken(); token = "&"; hasToken = true; continue; }
      if (c === "|" && command[i - 1] === ">") { token += c; hasToken = true; continue; }
      pushSegment();
      if (command[i + 1] === c) i += 1;
      continue;
    }
    if (c === ">" || c === "<") {
      // Redirection operators become their own tokens: ">", ">>", "2>", "&>", "<".
      if (/^\d$/.test(token) || token === "&") { token += c; hasToken = true; }
      else { pushToken(); token = c; hasToken = true; }
      while (command[i + 1] === ">" || (command[i + 1] === "&" && c === ">") || (command[i + 1] === "|" && c === ">")) { token += command[i + 1]; i += 1; }
      pushToken();
      continue;
    }
    if (/\s/.test(c)) { pushToken(); continue; }
    token += c;
    hasToken = true;
  }
  pushSegment();
  return segments;
}

const isOption = (t) => t.startsWith("-") && t !== "-";

function protectedArg(arg, ctx) {
  if (!arg) return false;
  if (PROTECTED_RE.test(` ${arg}`)) return true;
  if (/^(?:\/|~)/.test(arg)) return false;
  // Relative path while the shell's working directory is inside a protected tree.
  return ctx.cwdProtected && !isOption(arg);
}

// Data-flow approximation: identifiers assigned from a protected-path expression are "tainted" (iterated to a fixpoint);
// helper functions whose body contains a write primitive count as write primitives themselves. A program is a writer when
// a write call's line references a protected literal or a tainted identifier.
const ASSIGN_RE = /^\s*(?:export\s+)?(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=(?!=)\s*(.+)$/;
const FUNC_RE = /^\s*(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|def\s+([A-Za-z_]\w*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/;
const MAIN_GUARD_RE = /import\.meta\.url\s*===|process\.argv\[1\]\s*===|if\s+__name__\s*==\s*["']__main__["']/;

export function sourceWriteFindings(source, { importedOnly = false, python = false } = {}) {
  let lines = source.split("\n");
  if (importedOnly) {
    const guard = lines.findIndex((l) => MAIN_GUARD_RE.test(l));
    if (guard >= 0) lines = lines.slice(0, guard);
  }
  const protectedLiteral = (text) => SOURCE_PROTECTED_RE.some((re) => re.test(text));
  const tainted = new Set();
  for (let pass = 0; pass < 6; pass += 1) {
    const before = tainted.size;
    for (const line of lines.flatMap((l) => l.split(/;\s*(?=(?:export\s+)?(?:const|let|var)\s)/))) {
      const m = ASSIGN_RE.exec(line);
      if (!m) continue;
      const expr = m[2];
      if (READ_EXPR_RE.test(expr)) continue;
      if (protectedLiteral(expr) || [...tainted].some((id) => new RegExp(`(?<![\\w$.])${id.replace(/\$/g, "\\$")}(?![\\w$])`).test(expr))) tainted.add(m[1]);
    }
    if (tainted.size === before) break;
  }
  const primitives = python ? [...SOURCE_WRITE_RE, PY_PATH_WRITE_RE] : SOURCE_WRITE_RE;
  const writers = [...primitives];
  const depthOf = (text) => [...text].reduce((d, c) => d + ("([{".includes(c) ? 1 : ")]}".includes(c) ? -1 : 0), 0);
  // A statement: the line plus continuation lines while brackets stay open (max 6 lines).
  const statement = (i) => {
    let text = lines[i];
    for (let j = i + 1; j < Math.min(lines.length, i + 6) && depthOf(text) > 0; j += 1) text += `\n${lines[j]}`;
    return text;
  };
  // A function body: block until braces balance (JS) or indentation returns (Python); one-line arrows are the line itself.
  const bodyOf = (i) => {
    const line = lines[i];
    if (/^\s*(?:async\s+)?def\s/.test(line)) {
      const indent = line.match(/^\s*/)[0].length;
      const out = [line];
      for (let j = i + 1; j < Math.min(lines.length, i + 80); j += 1) {
        if (lines[j].trim() && lines[j].match(/^\s*/)[0].length <= indent) break;
        out.push(lines[j]);
      }
      return out.join("\n");
    }
    if (!/\{\s*$/.test(line)) return line;
    let text = line;
    for (let j = i + 1; j < Math.min(lines.length, i + 80) && depthOf(text) > 0; j += 1) text += `\n${lines[j]}`;
    return text;
  };
  const refersToTarget = (text) => protectedLiteral(text) || [...tainted].some((id) => new RegExp(`(?<![\\w$.])${id.replace(/\$/g, "\\$")}(?![\\w$])`).test(text));
  // Helpers: a function whose body writes to a protected target makes every call a finding; a generic writing helper
  // (e.g. atomic_write(path, payload)) is a finding when called with a protected target.
  const protectedHelpers = [];
  lines.forEach((line, i) => {
    const f = FUNC_RE.exec(line);
    const name = f && (f[1] ?? f[2] ?? f[3]);
    if (!name) return;
    const body = bodyOf(i);
    if (!primitives.some((re) => re.test(body))) return;
    const call = new RegExp(`(?<![\\w$.])${name}\\s*\\(`);
    const bodyLines = body.split("\n");
    const writesProtected = bodyLines.some((l) => primitives.some((re) => re.test(l)) && refersToTarget(l));
    (writesProtected ? protectedHelpers : writers).push(call);
  });
  const findings = [];
  lines.forEach((line, i) => {
    if (FUNC_RE.test(line) || /^\s*(?:\/\/|#)/.test(line)) return;
    if (protectedHelpers.some((re) => re.test(line))) { findings.push(i + 1); return; }
    if (!writers.some((re) => re.test(line))) return;
    if (refersToTarget(statement(i))) findings.push(i + 1);
  });
  return findings;
}

function scriptSourceReasons(file, ctx, depth = 0, seen = new Set()) {
  const reasons = [];
  let absolute;
  try { absolute = fs.realpathSync(path.resolve(ctx.cwd, file)); } catch { return reasons; }
  if (seen.has(absolute)) return reasons;
  seen.add(absolute);
  let source;
  try {
    if (fs.statSync(absolute).size > 2_000_000) return reasons;
    source = fs.readFileSync(absolute, "utf8");
  } catch { return reasons; }
  const relative = toRelative(ctx.root, absolute);
  const lines = sourceWriteFindings(source, { importedOnly: depth > 0 && !ctx.spawned, python: absolute.endsWith(".py") });
  if (lines.length) reasons.push(`${depth ? "imported module" : "script"} ${relative} writes to a protected research-data path (line ${lines.slice(0, 3).join(", ")})`);
  const known = depth > 0 ? knownWriterReasons(relative, [], ctx).reasons : [];
  reasons.push(...known);
  if (depth < 2) {
    const dir = path.dirname(absolute);
    const imports = [...source.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
    const pyImports = [...source.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)].map((m) => (m[1] ?? m[2]).split(".")[0]);
    for (const spec of imports) {
      const candidate = path.resolve(dir, spec);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) reasons.push(...scriptSourceReasons(candidate, ctx, depth + 1, seen));
    }
    // Dispatchers that spawn other scripts (child_process / subprocess): scan the referenced scripts as programs.
    if (/(?<![.\w])(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(|\bsubprocess\.(?:run|call|check_call|check_output|Popen)\s*\(/.test(source)) {
      // Script literals on spawn statements; when the spawned path is computed, fall back to every script literal.
      const literalRe = /["'`]((?:\.{1,2}\/|scripts\/)?[\w./-]+\.(?:py|mjs|cjs|js|sh))["'`]/g;
      const spawnLines = source.split("\n").filter((l) => /(?<![.\w])(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(|\bsubprocess\./.test(l));
      const onSpawn = spawnLines.flatMap((l) => [...l.matchAll(literalRe)]);
      const spawnsInterpreter = spawnLines.some((l) => /python|node|process\.execPath|\bsh\b|bash|\[\s*sys\.executable/.test(l) || !/["'`]git["'`]/.test(l));
      const literals = onSpawn.length ? onSpawn : spawnsInterpreter ? [...source.matchAll(literalRe)] : [];
      for (const m of literals) {
        for (const base of [dir, ctx.root]) {
          const candidate = path.resolve(base, m[1]);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) { reasons.push(...scriptSourceReasons(candidate, { ...ctx, spawned: true }, depth + 1, seen).map((r) => r.replace("imported module", "spawned script"))); break; }
        }
      }
    }
    if (absolute.endsWith(".py")) {
      for (const mod of new Set(pyImports)) {
        const candidate = path.join(dir, `${mod}.py`);
        if (fs.existsSync(candidate)) reasons.push(...scriptSourceReasons(candidate, ctx, depth + 1, seen));
      }
    }
  }
  return reasons;
}

function inlineCodeReasons(code, label) {
  // Inline code is short: any write primitive plus any protected reference is enough.
  const writes = SOURCE_WRITE_RE.some((re) => re.test(code));
  const refs = SOURCE_PROTECTED_RE.some((re) => re.test(code)) || PROTECTED_RE.test(` ${code}`);
  return writes && refs ? [`inline ${label} code writes files and references a protected research-data path`] : [];
}

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function knownWriterReasons(scriptRel, args, ctx) {
  const registry = ctx.writers ?? loadJson(path.join(ctx.root, ".claude/hooks/research-data-writers.json"));
  ctx.writers = registry;
  const entry = registry?.writers?.find((w) => w.script === scriptRel);
  if (!entry) return { reasons: [], readOnly: false };
  const exempt = entry.read_only_flags?.some((flag) => args.includes(flag)) && !entry.unless_flags?.some((flag) => args.includes(flag));
  if (exempt) return { reasons: [], readOnly: true };
  return { reasons: [`registered research-data writer ${scriptRel}: ${entry.writes.join(", ")}`], readOnly: false };
}

function readOnlyByRegistry(scriptRel, args, ctx) {
  const registry = ctx.writers ?? loadJson(path.join(ctx.root, ".claude/hooks/research-data-writers.json"));
  ctx.writers = registry;
  const entry = registry?.read_only?.find((w) => w.script === scriptRel);
  return Boolean(entry && (!entry.requires_flags || entry.requires_flags.every((flag) => args.includes(flag))));
}

function programReasons(scriptPath, args, ctx) {
  const scriptRel = toRelative(ctx.root, path.resolve(ctx.cwd, scriptPath));
  const known = knownWriterReasons(scriptRel, args, ctx);
  if (known.readOnly || readOnlyByRegistry(scriptRel, args, ctx)) return [];
  const scanned = scriptSourceReasons(scriptPath, ctx);
  return [...known.reasons, ...scanned];
}

function gitReasons(args, ctx) {
  const sub = args.find((a) => !isOption(a));
  if (!sub || !GIT_TREE_OPS.has(sub)) return [];
  const rest = args.slice(args.indexOf(sub) + 1);
  const dashIndex = rest.indexOf("--");
  const pathspecs = dashIndex >= 0 ? rest.slice(dashIndex + 1) : [];
  if (pathspecs.length) return pathspecs.some((p) => protectedArg(p, ctx) || p === "." || p === ":/") ? [`git ${sub} on a protected research-data path`] : [];
  if (["rm", "mv"].includes(sub)) return rest.some((p) => protectedArg(p, ctx)) ? [`git ${sub} on a protected research-data path`] : [];
  if (["checkout", "restore"].includes(sub) && rest.some((p) => protectedArg(p, ctx))) return [`git ${sub} on a protected research-data path`];
  // Tree-wide operations: ask when they would touch protected files (dirty protected files, or a target ref that differs).
  const dirty = git(ctx, ["status", "--porcelain", "--", ...PROTECTED_ROOTS]);
  if (["stash", "clean", "restore", "reset"].includes(sub) && dirty === null) return [`git ${sub} may rewrite research data (could not inspect status)`];
  if (["stash", "clean", "restore"].includes(sub) || (sub === "reset" && rest.includes("--hard")) || (sub === "checkout" && rest.some((a) => a === "." || a === "-f"))) {
    if (dirty && dirty.trim()) return [`git ${sub} would discard or move uncommitted research-data changes`];
  }
  const ref = rest.find((a) => !isOption(a));
  if (["checkout", "switch", "merge", "rebase", "cherry-pick", "revert", "reset"].includes(sub) && ref) {
    const range = ["cherry-pick", "revert"].includes(sub) ? [`${ref}^`, ref] : ["HEAD", ref];
    const changed = git(ctx, ["diff", "--name-only", ...range, "--", ...PROTECTED_ROOTS]);
    if (changed === null) return [`git ${sub} ${ref} may change research data (ref not resolvable locally)`];
    if (changed.trim()) return [`git ${sub} ${ref} changes research data files (${changed.trim().split("\n").length})`];
    return [];
  }
  if (["pull", "am"].includes(sub)) return [`git ${sub} may bring in research-data changes`];
  if (sub === "apply") {
    const patchFile = rest.find((a) => !isOption(a));
    const patch = patchFile ? (() => { try { return fs.readFileSync(path.resolve(ctx.cwd, patchFile), "utf8"); } catch { return null; } })() : null;
    if (patch === null || PROTECTED_RE.test(patch)) return [`git apply may modify research data`];
  }
  return [];
}

function git(ctx, args) {
  const result = spawnSync("git", args, { cwd: ctx.root, encoding: "utf8", timeout: 5000 });
  return result.status === 0 ? result.stdout : null;
}

function expandPackageScript(name, extra, ctx, depth) {
  const pkg = ctx.pkg ?? loadJson(path.join(ctx.root, "package.json"));
  ctx.pkg = pkg;
  const body = pkg?.scripts?.[name];
  if (!body || depth > 6) return [];
  return classifyCommand(`${body} ${extra.join(" ")}`, ctx, depth + 1).map((r) => `pnpm ${name} → ${r}`);
}

function segmentReasons(tokens, ctx, depth) {
  const reasons = [];
  let words = [...tokens];
  // Redirections anywhere in the segment.
  for (let i = 0; i < words.length; i += 1) {
    const t = words[i];
    if (/^(?:\d?>>?|&>>?|>\|)$/.test(t) || /^\d?>>?[^&>]/.test(t)) {
      const target = /^(?:\d?>>?|&>>?|>\|)$/.test(t) ? words[i + 1] : t.replace(/^\d?>>?/, "");
      if (target && !target.startsWith("&") && protectedArg(target, ctx)) reasons.push(`shell redirection into ${target}`);
    }
  }
  words = words.filter((t, i) => !/^(?:\d?[<>]>?|&>>?|>\||<)$/.test(t) && !/^(?:\d?[<>]>?|&>>?|>\||<)$/.test(words[i - 1] ?? ""));
  while (words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]) || ["sudo", "env", "command", "exec", "time", "nice", "nohup", "xargs", "timeout"].includes(words[0]))) {
    if (words[0] === "timeout" && words[1] && /^\d/.test(words[1])) words.shift();
    words.shift();
    while (words.length && isOption(words[0])) words.shift();
  }
  if (!words.length) return reasons;
  const [cmd0, ...args] = words;
  const cmd = path.basename(cmd0);

  if (cmd === "cd" || cmd === "pushd") {
    const target = args[0] ?? "";
    const next = target ? path.resolve(ctx.cwd, target) : ctx.root;
    ctx.cwd = next;
    ctx.cwdProtected = isProtectedRelative(toRelative(ctx.root, next));
    return reasons;
  }
  if (cmd === "tee") {
    for (const a of args.filter((x) => !isOption(x))) if (protectedArg(a, ctx)) reasons.push(`tee into ${a}`);
    return reasons;
  }
  if (cmd === "sed" || cmd === "perl" || cmd === "ruby") {
    const inPlace = args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place"));
    if (inPlace && args.some((a) => protectedArg(a, ctx))) reasons.push(`${cmd} -i on a protected research-data file`);
    if (cmd === "perl" || cmd === "ruby") {
      const code = args[args.findIndex((a) => /^-[a-zA-Z]*e$/.test(a)) + 1];
      if (code && args.some((a) => /^-[a-zA-Z]*e$/.test(a))) reasons.push(...inlineCodeReasons(code, cmd));
    }
    return reasons;
  }
  if (cmd === "find") {
    const mutates = args.some((a) => ["-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint"].includes(a));
    if (mutates && args.some((a) => protectedArg(a, ctx))) {
      const execIndex = args.findIndex((a) => ["-exec", "-execdir", "-ok", "-okdir"].includes(a));
      const execCmd = execIndex >= 0 ? path.basename(args[execIndex + 1] ?? "") : "";
      const readOnlyExec = execCmd && ["cat", "head", "tail", "wc", "grep", "shasum", "sha256sum", "md5", "ls", "stat", "file", "jq", "echo", "printf", "du"].includes(execCmd);
      if (!readOnlyExec || args.includes("-delete")) reasons.push("find with -delete/-exec on a protected research-data path");
    }
    return reasons;
  }
  if (cmd === "git") return gitReasons(args, ctx);
  if (MUTATING_COMMANDS.has(cmd)) {
    const operands = args.filter((a) => !isOption(a));
    let targets;
    if (["cp", "rsync", "ditto", "install", "ln", "scp"].includes(cmd)) {
      const tIndex = args.findIndex((a) => a === "-t" || a === "--target-directory");
      targets = tIndex >= 0 ? [args[tIndex + 1]] : operands.slice(-1);
    } else if (cmd === "dd") targets = args.filter((a) => a.startsWith("of=")).map((a) => a.slice(3));
    else if (cmd === "tar") {
      const extracting = args.some((a) => /^-?[a-zA-Z]*x/.test(a) || a === "--extract");
      const cIndex = args.findIndex((a) => a === "-C" || a === "--directory");
      const creating = args.findIndex((a) => /^-?[a-zA-Z]*c[a-zA-Z]*f$/.test(a));
      targets = extracting ? [cIndex >= 0 ? args[cIndex + 1] : "."] : creating >= 0 ? [args[creating + 1]] : [];
      if (extracting && cIndex < 0 && !ctx.cwdProtected) targets = [];
    } else if (cmd === "unzip") {
      const dIndex = args.indexOf("-d");
      targets = dIndex >= 0 ? [args[dIndex + 1]] : ctx.cwdProtected ? ["."] : [];
    } else if (cmd === "curl" || cmd === "wget") {
      targets = [];
      args.forEach((a, i) => {
        if (["-o", "--output", "-O", "--output-document", "-P", "--directory-prefix"].includes(a)) targets.push(args[i + 1]);
        else if (/^--output(?:-document)?=/.test(a)) targets.push(a.split("=")[1]);
      });
      if (cmd === "curl" && args.includes("-O") && ctx.cwdProtected) targets.push(".");
    } else targets = operands;
    for (const target of targets) if (protectedArg(target, ctx)) { reasons.push(`${cmd} targets ${target}`); break; }
    return reasons;
  }
  // Package-manager scripts.
  if (["pnpm", "npm", "yarn", "bun"].includes(cmd)) {
    let rest = args.filter((a) => a !== "--silent" && a !== "-s" && !/^--(?:filter|dir|prefix)/.test(a));
    if (["run", "run-script"].includes(rest[0])) rest = rest.slice(1);
    if (["exec", "dlx", "x"].includes(rest[0])) return classifyCommand(rest.slice(1).join(" "), ctx, depth + 1);
    const [name, ...extra] = rest;
    if (!name || ["install", "i", "add", "remove", "test", "outdated", "list", "ls", "why", "view", "info", "audit", "store", "config", "--version", "-v"].includes(name)) return reasons;
    return expandPackageScript(name, extra.filter((a) => a !== "--"), ctx, depth);
  }
  if (cmd === "npx") return classifyCommand(args.filter((a) => !isOption(a)).join(" "), ctx, depth + 1);
  // Interpreters: inline code or a script file.
  if (INTERPRETERS.test(cmd)) {
    const evalIndex = args.findIndex((a) => ["-e", "--eval", "-p", "--print", "-c"].includes(a));
    if (evalIndex >= 0) {
      const code = args[evalIndex + 1] ?? "";
      if (["bash", "sh", "zsh"].includes(cmd)) return classifyCommand(code, ctx, depth + 1);
      return inlineCodeReasons(code, cmd);
    }
    const scriptIndex = args.findIndex((a) => !isOption(a));
    if (scriptIndex < 0) return reasons;
    if (args[scriptIndex - 1] === "-m") return [`python -m ${args[scriptIndex]} (module not inspected)`].filter(() => args.some((a) => protectedArg(a, ctx)));
    return programReasons(args[scriptIndex], args.slice(scriptIndex + 1), ctx);
  }
  if (cmd === "eval") return classifyCommand(args.join(" "), ctx, depth + 1);
  // Direct execution of a repository script (./scripts/x.sh, scripts/x.mjs).
  if (/[/.]/.test(cmd0) && fs.existsSync(path.resolve(ctx.cwd, cmd0))) return programReasons(cmd0, args, ctx);
  return reasons;
}

/** Returns a list of human-readable reasons why `command` may mutate protected research data (empty = no finding). */
export function classifyCommand(command, ctx, depth = 0) {
  if (depth > 8 || !command) return [];
  const text = normaliseRoot(command, ctx.root);
  const reasons = [];
  // Heredoc bodies fed to an interpreter (`node <<'EOF' … EOF`, `python - <<EOF`) are inline code.
  const heredoc = /(?:^|[\s;&|])(node|python3?|bash|sh|zsh|perl|ruby)\b[^\n]*<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)\n\s*\2\s*(?:$|\n)/g;
  let stripped = text;
  for (const m of text.matchAll(heredoc)) {
    reasons.push(...(["bash", "sh", "zsh"].includes(m[1]) ? classifyCommand(m[3], ctx, depth + 1) : inlineCodeReasons(m[3], m[1])));
    stripped = stripped.replace(m[3], "");
  }
  // `cat > src/data/x <<EOF` style writes are caught by the redirection rule below (heredoc body removed first).
  for (const tokens of splitSegments(stripped)) reasons.push(...segmentReasons(tokens, ctx, depth));
  return [...new Set(reasons)];
}

export function createContext(root, cwd) {
  const resolvedCwd = cwd && fs.existsSync(cwd) ? cwd : root;
  return { root, cwd: resolvedCwd, cwdProtected: isProtectedRelative(toRelative(root, resolvedCwd)) };
}

/** Snapshot of the protected trees used by the PostToolUse detector: changed/untracked entries plus size+mtime. */
export function protectedTreeState(root) {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...PROTECTED_ROOTS], { cwd: root, encoding: "utf8", timeout: 20000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) return null;
  const state = {};
  for (const entry of result.stdout.split("\0").filter(Boolean)) {
    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    let stamp = "missing";
    try { const s = fs.statSync(path.join(root, file)); stamp = `${s.size}:${Math.round(s.mtimeMs)}`; } catch { /* deleted */ }
    state[file] = `${status}|${stamp}`;
  }
  return state;
}

export function diffStates(before, after) {
  const changed = [];
  for (const [file, value] of Object.entries(after)) if (before[file] !== value) changed.push(file);
  for (const file of Object.keys(before)) if (!(file in after)) changed.push(file);
  return changed.sort();
}
