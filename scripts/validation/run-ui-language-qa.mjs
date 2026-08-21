// UI language QA (v1.3 §80-81, release blocker): scans user-facing components for
// English interaction words that must not appear outside the central uiLabels registry.
// Whitelisted: brand, standard method names, statistical abbreviations, dataset/source
// names and technical identifiers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scanDirs = [path.join(root, "src", "components"), path.join(root, "src", "app")];
const registryFile = path.join(root, "src", "lib", "uiLabels.ts");

// Exact forbidden UI strings (case-sensitive, matched as JSX text or label content).
const forbidden = [
  "Run analysis", "Run Analysis", "Run panel analysis", "Run preset",
  "Download current view", "Download full observations", "Download raw events", "Download research package", "Research data package",
  "Export result", "Export comparison", "Export result", "Export JSON",
  "Compare with", "Compare Countries", "Cross-country comparison",
  "Coefficient estimates", "Explanatory variables", "Fixed effects", "SE method",
  "Scenario presets", "Research methods", "Analysis Workbench",
  "Analysis skill", "Top partners", "Historical trend", "Trade concentration",
  "Open country", "Open full map", "View methodology", "View model", "Run scenario", "View events", "View map",
  "Composite diagnostics", "Input completeness", "Year alignment", "Validation gate", "Missing variables",
  "Advanced model metadata and limitations", "Expected rows", "Missing rows", "Inference method",
  "Clusters", "Degrees of freedom", "Related projects",
];

// Files/paths allowed to contain these strings (registry itself, tests).
const allowedFiles = new Set([registryFile]);

const failures = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(tsx|ts)$/.test(entry.name) && !allowedFiles.has(absolute)) scanFile(absolute);
  }
}

function scanFile(file) {
  const content = fs.readFileSync(file, "utf8");
  for (const phrase of forbidden) {
    const asJsxText = new RegExp(`>${phrase}<`);
    const asLabel = new RegExp(`"${phrase}"`);
    if (asJsxText.test(content) || asLabel.test(content)) {
      failures.push(`${path.relative(root, file)}: forbidden UI string "${phrase}"`);
    }
  }
}

for (const dir of scanDirs) walk(dir);

if (failures.length) {
  console.error(`UI language QA failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`UI language QA passed: components and pages scanned, no forbidden English interaction strings.`);
