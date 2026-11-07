// Build-time display helpers that may read descriptive stores although they live outside src/app and src/components.
// Each entry is one exact file. It stays allowed only while every importer in src/ and scripts/ is a src/app page,
// so no model, scenario or index code can reach the stores through it.
import fs from "node:fs";
import path from "node:path";

export const DISPLAY_ONLY_READERS = [
  { file: "src/lib/refreshProvenance.server.ts", specifier: /["'](?:@\/lib\/|\.{1,2}\/(?:[\w.-]+\/)*)refreshProvenance\.server(?:\.ts)?["']/ },
];

export const displayOnlyPatterns = () => DISPLAY_ONLY_READERS.map((r) => new RegExp(`^${r.file.replaceAll(".", "\\.")}$`));

/** Returns one message per display-only reader that is missing or imported from outside src/app/. */
export function displayOnlyViolations(root) {
  const files = [];
  const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name).split(path.sep).join("/"); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx)$/.test(e.name)) files.push(rel); } };
  walk("src"); walk("scripts");
  const problems = [];
  for (const reader of DISPLAY_ONLY_READERS) {
    if (!fs.existsSync(path.join(root, reader.file))) { problems.push(`${reader.file}: display-only reader is missing`); continue; }
    const importers = files.filter((f) => f !== reader.file && reader.specifier.test(fs.readFileSync(path.join(root, f), "utf8")));
    const outside = importers.filter((f) => !f.startsWith("src/app/"));
    if (!importers.length) problems.push(`${reader.file}: no src/app importer; remove it from the display-only list`);
    if (outside.length) problems.push(`${reader.file}: imported outside src/app/: ${outside.join(", ")}`);
  }
  return problems;
}
