// UI regression checks for v2.0 usability fixes: dark CTA contrast, research-table scrolling and sticky headers.
// Checks source and, when present, the static export in out/. Usage: node validate-ui-regressions.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };

// --- 1. CTA contrast: element defaults layered, one contrasting CTA class ---------------------------------
const css = read("src/app/globals.css");
const baseStart = css.indexOf("@layer base {");
check(baseStart >= 0, "element defaults must live in @layer base");
const outsideBase = css.slice(0, baseStart) + css.slice(css.indexOf("\n}\n", baseStart) + 3);
check(!/(^|\n)\s*a\s*\{[^}]*color\s*:/m.test(outsideBase), "no unlayered `a { color }` rule may override Tailwind utilities");
check(!/(^|\n)a,\s*\n/.test(outsideBase), "no unlayered anchor selector list outside the base layer");
const cta = /\.cta-dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
check(/background:\s*var\(--foreground\)/.test(cta) && /color:\s*#fff/.test(cta), ".cta-dark declares a dark background with white foreground");
check(/\.cta-dark:hover\s*\{[^}]*color:\s*#fff/.test(css) && /\.cta-dark:focus-visible\s*\{[^}]*outline:/.test(css), ".cta-dark keeps readable hover text and a focus-visible outline");
check(!/!important/.test(cta), "no !important on CTA colours");

const sourceFiles = [];
const walk = (dir) => { for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, entry.name); if (entry.isDirectory()) walk(rel); else if (/\.tsx$/.test(entry.name)) sourceFiles.push(rel); } };
walk("src");
let ctaCount = 0;
for (const file of sourceFiles) {
  const source = read(file);
  check(!/className="[^"]*bg-\[var\(--foreground\)\][^"]*text-white/.test(source), `${file}: dark CTA must use .cta-dark`);
  for (const match of source.matchAll(/<(a|Link|button)\b[^>]*className="[^"]*\bcta-dark\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)) {
    ctaCount += 1;
    const label = match[2].replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "X").trim();
    check(label.length > 0, `${file}: dark CTA has an empty visible label`);
  }
}
check(ctaCount >= 12, `expected at least 12 dark CTAs, found ${ctaCount}`);

// --- 2. Tables: vertical viewport, horizontal scroll, sticky header, keyboard access --------------------------
check(!/\.wide-table-scroll\s*\{[^}]*overflow-y\s*:\s*hidden/.test(css), ".wide-table-scroll must not clip vertical scrolling");
const viewport = /\.data-table-viewport\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
check(/overflow:\s*auto/.test(viewport) && /max-height:/.test(viewport), ".data-table-viewport scrolls both axes within a max height");
check(/\.data-table-viewport thead th\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/.test(css), "sticky table header in scroll viewports");
for (const [file, label] of [["src/components/DataExplorerV11.tsx", "高频月度观测表"], ["src/components/MacroDriverWorkbench.tsx", "宏观驱动观测表"]]) {
  const source = read(file);
  const tag = new RegExp(`<div className="[^"]*data-table-viewport[^"]*" tabIndex=\\{0\\} role="region" aria-label="${label}`);
  check(tag.test(source), `${file}: long table must sit in a focusable, labelled data-table-viewport`);
  check(!/wide-table-scroll[^"]*max-h-\[/.test(source) && !/wide-table-scroll[^"]*overflow-y-auto/.test(source), `${file}: no conflicting overflow utilities on wide-table-scroll`);
  check(/data-card-mobile/.test(source), `${file}: mobile card fallback present`);
}

// --- 4. Charts: axes, ticks, unit titles, gaps for missing values ------------------------------------------
{
  const require = createRequire(import.meta.url);
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...args) { return originalResolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, ...args); };
  for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText, filename);
  const { ResearchTimeSeriesChart } = require(path.join(root, "src/components/ResearchTimeSeriesChart.tsx"));
  const months = [];
  for (let year = 2015; year <= 2026; year += 1) for (let month = 1; month <= 12; month += 1) months.push(`${year}-${String(month).padStart(2, "0")}`);
  const points = months.map((x, index) => ({ x, y: index === 40 ? null : Math.sin(index / 9) * 3 + 1 }));
  const html = renderToStaticMarkup(React.createElement(ResearchTimeSeriesChart, { title: "测试序列", series: [{ id: "s", label: "序列", color: "#000", points }], xKind: "month", xLabel: "月份", yLabel: "% p.a. · 水平值", latestMarker: true }));
  const yTicks = (html.match(/data-tick="y"/g) ?? []).length;
  const xLabels = [...html.matchAll(/<g data-tick="x">.*?<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]);
  check(/data-axis="x"/.test(html) && /data-axis="y"/.test(html), "chart draws explicit x and y axes");
  check(yTicks >= 4 && yTicks <= 7, `chart has 4-6 round y ticks (found ${yTicks})`);
  check(xLabels.length >= 4 && xLabels.every((label) => /^\d{4}$/.test(label)), `monthly axis labels sensible year ticks, not only endpoints (${xLabels.join(",")})`);
  check(/data-axis-title="y"[^>]*>% p\.a\. · 水平值</.test(html) && /data-axis-title="x"[^>]*>月份</.test(html), "chart shows unit/measure and x-axis titles");
  check((html.match(/<polyline/g) ?? []).length === 2, "missing value breaks the line (no zero fill)");
  check(/data-latest-marker="true"/.test(html) && /<title[^>]*>测试序列<\/title>/.test(html), "latest marker and accessible title present");
  const stepHtml = renderToStaticMarkup(React.createElement(ResearchTimeSeriesChart, { title: "精度", series: [{ id: "p", label: "利率", color: "#000", points: [{ x: "2024-01", y: 13 }, { x: "2026-07", y: 5.75 }] }], xKind: "month", yLabel: "% p.a.", latestMarker: true }));
  check(/data-latest-marker="true"[\s\S]*?2026-07：5\.75</.test(stepHtml), "latest value label keeps observed precision (not tick-rounded)");
  for (const [file, xTitle] of [["src/components/MacroDriverWorkbench.tsx", "月份"], ["src/components/LocalProjectionWorkbench.tsx", "冲击后月数"], ["src/components/PanelLocalProjectionWorkbench.tsx", "冲击后月数"]]) {
    const source = read(file);
    check(source.includes("<ResearchTimeSeriesChart") && source.includes(`xLabel="${xTitle}"`) && /yLabel=\{/.test(source), `${file} uses the shared chart with x and y titles`);
  }
  // Phase J: Data Explorer historical usability.
  const explorer = read("src/components/DataExplorerV11.tsx");
  for (const [needle, message] of [["起始年份", "year-range start filter"], ["结束年份", "year-range end filter"], ["新 → 旧", "sort direction control"], ["仅显示每个指标的最新值", "latest-only toggle"], ['data-coverage-summary="indicator"', "single-indicator coverage summary"], ['data-coverage-summary="all"', "all-indicator coverage overview"], ['data-coverage-summary="high-frequency"', "high-frequency coverage summary"], ["data-layer={layer}", "formal vs historical layer badge"], ["annual_history_runtime.json", "history loaded at runtime, not inlined in page props"]]) check(explorer.includes(needle), `Data Explorer: ${message}`);
  check(!/from "@\/data\/historical|annual_descriptive_history/.test(explorer), "Data Explorer does not import the full history store into the page bundle");
  // Phase H: monthly history shown as a labelled, toggleable descriptive layer in both monthly views.
  const hook = read("src/components/useMonthlyHistory.ts");
  const macro = read("src/components/MacroDriverWorkbench.tsx");
  check(hook.includes("monthly_history_runtime.json") && !/monthly_descriptive_history/.test(hook + explorer + macro), "monthly history loaded from the runtime file, not the full store");
  for (const [name, src, attr] of [["Data Explorer HF view", explorer, 'data-history-layer="high-frequency"'], ["MacroDriverWorkbench", macro, 'data-history-layer="macro"']]) {
    check(src.includes("useMonthlyHistory(") && src.includes(attr), `${name}: history layer present`);
    check(/dash: "6 4"/.test(src) && src.includes("历史描述性"), `${name}: history distinguished by dash and label, not colour alone`);
    check(src.includes("includeHistory"), `${name}: history can be toggled off`);
    check(/series=\{\[\{ id: "(hf|driver)"/.test(src), `${name}: formal series first so the latest marker stays on the latest formal observation`);
  }
  check(/selectedTransformation === "level" \? monthlyHistoryFor/.test(macro), "macro history only attaches to level series (derived changes are not backfilled)");
  const { coverageOf } = require(path.join(root, "src/components/DataExplorerV11.tsx"));
  const cov = coverageOf([{ period: 2000, value: 1 }, { period: 2001, value: null }, { period: 2003, value: 0 }, { period: 2004, value: 2 }]);
  check(cov.earliest === 2000 && cov.latest === 2004 && JSON.stringify(cov.missing) === "[2001,2002]" && cov.available === 3, "coverage: null and absent years are missing; an official 0 counts as observed");
  const { LocalProjectionWorkbench } = require(path.join(root, "src/components/LocalProjectionWorkbench.tsx"));
  const lpHtml = renderToStaticMarkup(React.createElement(LocalProjectionWorkbench, {}));
  check(/data-axis="x"/.test(lpHtml) && /data-axis="y"/.test(lpHtml) && /data-zero-line="true"/.test(lpHtml), "LP chart renders axes and a zero line");
  check(/data-axis-title="y"[^>]*>(累计百分比变化（%）|百分点|百分比)/.test(lpHtml) && /data-axis-title="x"[^>]*>冲击后月数</.test(lpHtml), "LP chart shows unit and horizon titles");
  Module._resolveFilename = originalResolve;
}

// --- 3. Built output (when available) ----------------------------------------------------------------------
const outDir = path.join(root, "out");
if (fs.existsSync(path.join(outDir, "data", "index.html"))) {
  const html = fs.readFileSync(path.join(outDir, "data", "index.html"), "utf8");
  check(/class="[^"]*cta-dark[^"]*"[^>]*>[^<]*\S/.test(html), "built /data page renders a labelled dark CTA");
  const cssFiles = fs.readdirSync(path.join(outDir, "_next", "static", "chunks")).filter((f) => f.endsWith(".css"));
  const builtCss = cssFiles.map((f) => fs.readFileSync(path.join(outDir, "_next", "static", "chunks", f), "utf8")).join("\n");
  check(/@layer base\{[\s\S]*?a\{color:inherit/.test(builtCss), "built CSS keeps the anchor default inside @layer base");
  check(/\.data-table-viewport thead th\{[^}]*position:sticky/.test(builtCss), "built CSS contains the sticky table header");
}

console.log(JSON.stringify({ status: "pass", checks, dark_ctas: ctaCount }));
