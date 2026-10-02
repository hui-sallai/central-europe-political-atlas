import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const archiveRoot = "docs/political-data/raw/germany";
export const historicalUrl = "https://www.bundeswahlleiterin.de/dam/jcr/24d8e745-920d-431a-893a-12805bc7ef40/btw_ab49_datenbank_ergebnisse.csv";
export const allFinalResultsUrl = "https://www.bundeswahlleiterin.de/dam/jcr/ce2d2b6a-f211-4355-8eea-355c98cd4e47/btw_kerg.zip";
export const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// Acquisition never writes canonical stores. Each retrieval is an immutable evidence object.
async function acquire() {
  const zip = process.argv.includes("--final-archive");
  const url = zip ? allFinalResultsUrl : historicalUrl;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`Official download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString("utf8");
  if (!zip && (!text.includes("Datenlizenz Deutschland – Namensnennung – Version 2.0") || !text.includes("Merkmal/Partei;Jahr der Wahl"))) throw Error("Actual CSV licence/schema not confirmed; stop before normalization");
  if (zip && bytes.subarray(0,2).toString() !== "PK") throw Error("Official ZIP signature missing");
  const hash = sha256(bytes), retrieved = new Date().toISOString();
  const relative = `${archiveRoot}/${retrieved.replaceAll(/[:.]/g, "-")}_${hash.slice(0,16)}`;
  fs.mkdirSync(path.join(root, relative), { recursive: true });
  const filename = zip ? "final-results.zip" : "results.csv";
  fs.writeFileSync(path.join(root, relative, filename), bytes, { flag: "wx" });
  const metadata = {
    source_id: zip ? "src-de-bwl-final-archive" : "src-de-bwl-historical-results", source_url: url,
    retrieved_at: retrieved, source_publication_status: "official_historical_compilation_final_results",
    source_updated_at: response.headers.get("last-modified"), source_etag: response.headers.get("etag"),
    sha256: hash, bytes: bytes.length, file_format: zip ? "ZIP of final official constituency-result CSV files" : "CSV UTF-8 BOM; semicolon; quoted multiline fields",
    raw_path: `${relative}/${filename}`, election_years_in_production_scope: [2002,2005,2009,2013,2017,2021,2025],
    parser_version: "germany-historical-csv-v1",
    licence: { name: zip ? "Publisher attribution reuse terms (product exceptions pending inspection)" : "dl-de/by-2-0", url: zip ? "https://www.bundeswahlleiterin.de/info/impressum.html" : "https://www.govdata.de/dl-de/by-2-0", status: zip ? "license_review_required" : "verified_open_licence", reviewed_at: retrieved,
      basis: zip ? "Official results page links this ZIP. General publisher terms allow result-data reuse with attribution; inspect actual product headers for exceptions before canonical writes." : "Licence explicitly embedded in the actual downloaded CSV header; publisher download-product reuse clause also reviewed.",
      publisher_terms_url: "https://www.bundeswahlleiterin.de/info/impressum.html",
      attribution: "Die Bundeswahlleiterin, Wiesbaden; dl-de/by-2-0; original dataset URL. Atlas extracts national second-vote records and calculates only separately labelled derived shares." },
    canonical_write_authorized: false,
    note: "Raw historical file includes years and regional/first-vote fields outside the approved production slice. These must not enter canonical production stores or the alpha national series."
  };
  fs.writeFileSync(path.join(root, relative, "metadata.json"), JSON.stringify(metadata,null,2)+"\n", { flag: "wx" });
  console.log(JSON.stringify({status:"archived",raw_path:metadata.raw_path,sha256:hash,bytes:bytes.length,licence:metadata.licence.name}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await acquire();
