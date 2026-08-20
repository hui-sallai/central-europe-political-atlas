import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceDir = path.join(root, "public", "research-data");
const outputFile = path.join(sourceDir, "research-data-v1.1.zip");

const groups = {
  data: ["observations.json", "observations.csv", "comparison_eligibility.json", "transmission_channels.json"],
  countries: ["countries.json", "countries.csv"],
  regions: ["regions.json", "regional_observations.json", "regional_comparison_eligibility.json", "regional_geometry_qa.json"],
  events: ["events.json", "events.csv"],
  projects: ["china_projects.json", "china_projects.csv", "china_exposure_candidates.json", "project_locations.json", "china_evidence_coverage_matrix.json"],
  models: ["model_cards.json", "model_outputs.json"],
  scenarios: ["scenario_definitions.json", "scenario_results.json", "scenario_sensitivity.json", "scenario_evidence_links.json"],
  dictionaries: ["indicators.json", "indicators.csv", "sources.json", "sources.csv", "region_indicator_dictionary.json", "region_sources.json"],
  qa: ["validation_registry.json", "golden_test_cases.json", "data_quality_checks.json", "regional_geometry_qa.json", "comparison_eligibility.json"],
  methodology: ["methodology_rules.json"],
  release: ["platform_metadata.json", "release_manifest.json"],
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"));
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

const entries = [];
for (const [directory, files] of Object.entries(groups)) {
  for (const fileName of files) {
    const file = path.join(sourceDir, fileName);
    if (fs.existsSync(file)) entries.push({ name: `${directory}/${fileName}`, data: fs.readFileSync(file) });
  }
}

const modelCardsFile = path.join(sourceDir, "model_cards.json");
if (fs.existsSync(modelCardsFile)) {
  const parsed = JSON.parse(fs.readFileSync(modelCardsFile, "utf8"));
  const records = parsed.records ?? parsed;
  entries.push({ name: "models/weights.json", data: JSON.stringify(records.map((item) => ({ model_id: item.model_id, weight_version: item.weight_version, inputs: item.inputs?.map((input) => ({ indicator_id: input.indicator_id, weight: input.weight })) ?? [] })), null, 2) });
  entries.push({ name: "models/formula_versions.json", data: JSON.stringify(records.map((item) => ({ model_id: item.model_id, model_version: item.model_version, formula_version: item.formula_version, calculation_logic: item.calculation_logic })), null, 2) });
}

entries.push({ name: "README.md", data: `# Central Europe Political Atlas research package v1.1\n\nThis package preserves public research data, dictionaries, QA records, model and scenario metadata, methodology and release provenance.\n\n- Missing and pending values are not zero.\n- Samples and placeholders do not enter formal analysis.\n- Model outputs are comparative research tools, not forecasts or objective risk truths.\n- Scenario results are conditional assumptions, not future facts.\n\nCanonical site: https://hy-central-europe-analysis.org/\n` });
entries.push({ name: "methodology/README.md", data: "Public methodology is available at /methodology/. Technical dictionaries and validation records in this archive are the authoritative downloadable companion to the interface.\n" });

fs.mkdirSync(sourceDir, { recursive: true });
fs.writeFileSync(outputFile, zipStore(entries));
console.log(`Research package created: ${path.relative(root, outputFile)} (${entries.length} entries)`);
