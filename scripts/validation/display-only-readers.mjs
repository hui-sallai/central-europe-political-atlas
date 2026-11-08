// Build-time display helpers that may read descriptive stores although they live outside src/app and src/components.
// Each entry pins one reviewed file and the exact Data Explorer pages that import it.
// Models, scenarios, barrels and other routes cannot use this exception.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

export const DISPLAY_ONLY_READERS = [
  {
    file: "src/lib/refreshProvenance.server.ts",
    sha256: "e7d36d44285c26d44925553de09038e7cf3a838bfe23582244748c194b203bae",
    importers: ["src/app/(zh)/data/page.tsx", "src/app/(english)/en/data/page.tsx"],
  },
];

export const displayOnlyPatterns = () => DISPLAY_ONLY_READERS.map((r) => new RegExp(`^${r.file.replaceAll(".", "\\.")}$`));

/** Pin the reviewed helper and its two Data Explorer consumers; no other app route is admitted. */
export function displayOnlyViolations(root) {
  const files = [];
  const walk = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name).split(path.sep).join("/"); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx)$/.test(e.name)) files.push(rel); } };
  walk("src"); walk("scripts");
  const problems = [];
  const configPath = path.join(root, "tsconfig.json");
  let options = { moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: root, paths: { "@/*": ["src/*"] } };
  if (fs.existsSync(configPath)) {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) problems.push("display-only gate: cannot read tsconfig.json");
    else {
      const converted = ts.convertCompilerOptionsFromJson(config.config.compilerOptions ?? {}, root);
      if (converted.errors.length) problems.push("display-only gate: invalid compiler options");
      options = { ...options, ...converted.options };
    }
  }
  const cache = ts.createModuleResolutionCache(root, file => file, options);
  for (const reader of DISPLAY_ONLY_READERS) {
    const helper = path.join(root, reader.file);
    if (!fs.existsSync(helper) || !fs.lstatSync(helper).isFile()) { problems.push(`${reader.file}: display-only reader is missing or is not a regular file`); continue; }
    if (createHash("sha256").update(fs.readFileSync(helper)).digest("hex") !== reader.sha256) problems.push(`${reader.file}: reviewed display-only helper hash changed`);
    const importers = [];
    for (const file of files.filter((f) => f !== reader.file)) {
      for (const ref of ts.preProcessFile(fs.readFileSync(path.join(root, file), "utf8"), true, true).importedFiles) {
        const resolved = ts.resolveModuleName(ref.fileName, path.join(root, file), options, ts.sys, cache).resolvedModule;
        if (resolved && path.relative(root, resolved.resolvedFileName).split(path.sep).join("/") === reader.file) importers.push(file);
        else if (ref.fileName.includes("refreshProvenance.server")) problems.push(`${file}: unresolved or moved display-only import ${ref.fileName}`);
      }
    }
    if (!importers.length) problems.push(`${reader.file}: no Data Explorer importer; remove it from the display-only list`);
    const outside = [...new Set(importers)].filter((file) => !file.startsWith("src/app/") || !reader.importers.includes(file));
    if (outside.length) problems.push(`${reader.file}: unauthorised importer: ${outside.join(", ")}`);
  }
  return problems;
}
