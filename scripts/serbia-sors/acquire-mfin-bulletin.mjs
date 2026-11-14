// Data-refresh acquisition for unit "serbia-mfin" (owner decision D, 2026-11-15). Never fetches: www.mfin.gov.rs is
// registered for manual reading only, so the bulletin PDF is read once by hand and kept in local-evidence/ (never
// committed). This wrapper checks the PDF's SHA-256, transcribes Table 1 with extract-mfin-bulletin.py and builds the
// descriptive store with build-mfin-public-finance.mjs.
//
// Usage (inside a data-refresh stage): node scripts/serbia-sors/acquire-mfin-bulletin.mjs --offline
//   MFIN_BULLETIN_PDF=<absolute path to the locally kept bulletin PDF> (required)
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const EXPECTED_PDF_SHA256 = "d479abc36289b47924444f7ca04a0011c50efb0af590a52cddd1ce9dbf16e0c0";
const pdf = process.env.MFIN_BULLETIN_PDF;
if (!process.argv.includes("--offline")) { console.error("serbia-mfin has no network acquisition (manual reading only); run with --offline"); process.exit(1); }
if (!pdf || !fs.existsSync(pdf)) { console.error("MFIN_BULLETIN_PDF must point to the locally kept bulletin PDF"); process.exit(1); }
const sha = crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex");
if (sha !== EXPECTED_PDF_SHA256) { console.error(`bulletin sha256 ${sha} differs from the approved reading ${EXPECTED_PDF_SHA256}`); process.exit(1); }

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run("python3", ["-I", "scripts/serbia-sors/extract-mfin-bulletin.py", pdf, "src/data/serbia/raw/mfin_bilten_2026_08_table1.extract.json"]);
run(process.execPath, ["scripts/serbia-sors/build-mfin-public-finance.mjs"]);
