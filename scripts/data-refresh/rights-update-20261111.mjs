// Owner-approved 2026-11-11 ("批准更新 SORS 权利登记"): record the hand-read SORS Terms of Use in the source rights
// registry (src-sors raw_redistribution not_cleared → cleared_with_conditions), regenerate the recovery inventory that
// copies the rights fields, and append ONE ledger entry recording the change. No observation store changes.
// Usage: node scripts/data-refresh/rights-update-20261111.mjs   (refuses to run twice)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LEDGER_PATH, verifyLedger } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
export const RUN_ID = "rights-update-20261111";
export const REGISTRY = "docs/legal-security/source_rights_registry.json";
export const INVENTORY = "src/data/data-coverage/historical_recovery_inventory.json";
export const PUBLIC_INVENTORY = "public/research-data/historical_recovery_inventory.json";
export const TERMS_URL = "https://www.stat.gov.rs/en-us/copyright/";
// Exact field changes for src-sors. Everything else in the registry stays byte-identical.
export const CHANGES = {
  terms_url: TERMS_URL,
  raw_redistribution: "cleared_with_conditions",
  evidence_reference: `${TERMS_URL} (SORS Terms of Use, read by hand 2026-11-11; no automated collection, no publisher contact); src/data/serbia/serbia_official_data_source_audit.json terms_of_use_summary`,
  reviewed_at: "2026-11-11",
  review_status: "verified",
  terms_notes: "The Terms of Use permit distributing and sharing SORS files and data for commercial and non-commercial purposes provided changes are clearly indicated and SORS is cited as the source. The published SORS extracts are record subsets of official responses: values are unchanged, the selection is disclosed (source URL, response hash, response and extract record counts) and SORS is cited. No archived copy of the terms page is stored (evidence_sha256 null).",
};

export function updatedRegistryText(text) {
  const reg = JSON.parse(text);
  const s = reg.sources.find((x) => x.source_id === "src-sors");
  if (!s) throw new Error("src-sors missing");
  const before = Object.fromEntries(Object.keys(CHANGES).map((k) => [k, s[k] ?? null]));
  Object.assign(s, CHANGES);
  return { text: JSON.stringify(reg, null, 2) + (text.endsWith("\n") ? "\n" : ""), before };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ledgerFile = path.join(root, LEDGER_PATH);
  const lines = fs.readFileSync(ledgerFile, "utf8").split("\n").filter(Boolean);
  if (lines.some((l) => JSON.parse(l).run_id === RUN_ID)) { console.error(`${RUN_ID} is already in the ledger`); process.exit(1); }
  const chain = verifyLedger(ledgerFile);
  if (!chain.ok) { console.error(`refusing: ${chain.error}`); process.exit(1); }
  const regPath = path.join(root, REGISTRY), invPath = path.join(root, INVENTORY), pubPath = path.join(root, PUBLIC_INVENTORY);
  const regBefore = fs.readFileSync(regPath), invBefore = fs.readFileSync(invPath);
  if (sha(invBefore) !== sha(fs.readFileSync(pubPath))) { console.error("public inventory differs from canonical"); process.exit(1); }
  const { text, before } = updatedRegistryText(regBefore.toString("utf8"));
  fs.writeFileSync(regPath, text);
  const { buildInventory, writeInventory } = await import("../data-coverage/recovery-inventory.mjs");
  writeInventory(buildInventory());
  fs.copyFileSync(invPath, pubPath);
  const invAfter = fs.readFileSync(invPath);
  const inv = JSON.parse(invAfter);
  const affected = inv.series.filter((s) => s.rights?.source_id === "src-sors").length;
  const body = {
    rights_update: {
      registry: REGISTRY, source_id: "src-sors", previous_sha256: sha(regBefore), new_sha256: sha(fs.readFileSync(regPath)),
      fields: Object.keys(CHANGES).map((field) => ({ field, before: before[field], after: CHANGES[field] })),
      evidence: { terms_url: TERMS_URL, read_at: "2026-11-11", method: "read by hand in a browser; no automated collection, no contact with the publisher", archived_copy: null },
    },
    inventory_regeneration: { file: INVENTORY, public_copy: PUBLIC_INVENTORY, previous_sha256: sha(invBefore), new_sha256: sha(invAfter), series_with_sors_rights: affected, change: "rights fields copied from the registry for src-sors series; no periods, statuses or values changed" },
  };
  const entry = {
    schema_version: "data-refresh-rights-update-v1", tool_version: "rights-update-v1", run_id: RUN_ID, mode: "rights-update",
    recorded_at: new Date().toISOString(), plan_sha256: sha(JSON.stringify(body)), plan_basis: "sha256 of the rights_update and inventory_regeneration fields",
    repository_head_at_plan: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    owner_acceptance_of_stop_conditions: "Owner approved 2026-11-11 (\"批准更新 SORS 权利登记\"): update src-sors raw_redistribution to cleared_with_conditions from the hand-read SORS Terms of Use and regenerate the recovery inventory; observation stores unchanged.",
    formal_model_impact: "none", ...body, previous_entry_sha256: sha(lines.at(-1)),
  };
  fs.appendFileSync(ledgerFile, JSON.stringify(entry) + "\n");
  const check = verifyLedger(ledgerFile);
  if (!check.ok) { fs.writeFileSync(ledgerFile, lines.join("\n") + "\n"); fs.writeFileSync(regPath, regBefore); fs.writeFileSync(invPath, invBefore); fs.writeFileSync(pubPath, invBefore); console.error(`chain broken (${check.error}); reverted`); process.exit(1); }
  console.log(JSON.stringify({ appended: RUN_ID, plan_sha256: entry.plan_sha256, affected, inventory: sha(invAfter), ledger: sha(fs.readFileSync(ledgerFile)), chain: check }, null, 1));
}
