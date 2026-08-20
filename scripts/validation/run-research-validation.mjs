import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const researchDataDir = path.join(projectRoot, "public", "research-data");
const immutableInputs = [
  "src/data/observations/observations.json",
  "src/lib/crossCountryParityData.ts",
  "src/lib/transmissionData.ts",
];

function hashFiles(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) hash.update(fs.readFileSync(path.join(projectRoot, file)));
  return hash.digest("hex");
}

const canonicalHashBefore = hashFiles(immutableInputs);

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { validationRegistry, validationSummary, goldenTestCases } = require("../../src/lib/researchValidation.ts");
const { scenarioExportLayers } = require("../../src/lib/scenarioResearch.ts");
const canonicalHashAfter = hashFiles(immutableInputs);

const errors = [];
const stable = (value) => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
  : item);
if (canonicalHashBefore !== canonicalHashAfter) errors.push("Canonical model inputs changed while validation executed.");
if (validationSummary.blocking_failures > 0) {
  errors.push(`${validationSummary.blocking_failures} blocking validation failure(s) detected.`);
}
if (goldenTestCases.some((item) => item.status === "failed")) errors.push("One or more golden test cases changed.");

const exportIds = [
  "scenario_definitions",
  "scenario_results",
  "transmission_channels",
  "scenario_evidence_links",
  "scenario_sensitivity",
  "backtest_registry",
  "validation_registry",
  "golden_test_cases",
];

for (const exportId of exportIds) {
  const jsonPath = path.join(researchDataDir, `${exportId}.json`);
  const csvPath = path.join(researchDataDir, `${exportId}.csv`);
  if (!fs.existsSync(jsonPath) || !fs.existsSync(csvPath)) {
    errors.push(`${exportId} JSON/CSV export is missing.`);
    continue;
  }
  try {
    const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (!Array.isArray(payload.records)) errors.push(`${exportId}.json does not contain a records array.`);
    const expected = exportId === "validation_registry"
      ? validationRegistry.length
      : exportId === "golden_test_cases"
        ? goldenTestCases.length
        : scenarioExportLayers[exportId]?.length;
    if (expected !== undefined && payload.records.length !== expected) {
      errors.push(`${exportId} record count differs: export=${payload.records.length}, runtime=${expected}.`);
    }
    const runtimeRecords = exportId === "validation_registry"
      ? validationRegistry
      : exportId === "golden_test_cases"
        ? goldenTestCases
        : scenarioExportLayers[exportId];
    if (runtimeRecords && stable(payload.records) !== stable(runtimeRecords)) {
      errors.push(`${exportId} exported records differ from runtime records.`);
    }
  } catch (error) {
    errors.push(`${exportId}.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (fs.statSync(csvPath).size === 0) errors.push(`${exportId}.csv is empty.`);
}

const terminologyPayload = ["scenario_definitions.json", "scenario_results.json", "model_outputs.json"]
  .map((file) => fs.readFileSync(path.join(researchDataDir, file), "utf8"))
  .join("\n")
  .toLowerCase();
for (const phrase of ["forecast export share", "expected trade loss", "china risk", "poverty score", "sovereign default risk"]) {
  if (terminologyPayload.includes(phrase)) errors.push(`Misleading result terminology found: ${phrase}.`);
}

console.log(`Research validation: total=${validationSummary.total}; numeric_passed=${validationSummary.numeric_passed}; passed_gates=${validationSummary.passed_gates}; partial=${validationSummary.partial}; failed=${validationSummary.failed}; blocking=${validationSummary.blocking_failures}.`);
console.log(`Expected-unavailable golden gates: ${validationSummary.expected_unavailable_cases}.`);
console.log(`Golden cases: ${validationSummary.golden_cases - validationSummary.golden_failures}/${validationSummary.golden_cases} passed.`);
console.log(`Canonical immutability: ${canonicalHashBefore === canonicalHashAfter ? "passed" : "failed"}.`);

if (errors.length) {
  for (const error of errors) console.error(`VALIDATION ERROR: ${error}`);
  process.exit(1);
}
