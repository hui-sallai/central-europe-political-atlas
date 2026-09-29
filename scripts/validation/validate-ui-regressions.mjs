// UI regression checks for v2.0 usability fixes: dark CTA contrast, research-table scrolling and sticky headers.
// Checks source and, when present, the static export in out/. Usage: node validate-ui-regressions.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
