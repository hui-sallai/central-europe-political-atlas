import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "src", "data", "models", "china-exposure-fdi-inputs.raw.csv");
const url = "https://sdmx.oecd.org/public/rest/data/OECD.DAF.INV,DSD_FDI@DF_FDI_POS_CTRY,/.LE_FA_F.USD_EXC.DI.NET_FDI.ALL.D.S1.CHN+W.IMC._T.A.CTRY_IND?startPeriod=2023&endPeriod=2024&dimensionAtObservation=AllDimensions";

const response = await fetch(url, { headers: { Accept: "text/csv", "User-Agent": "Central-Europe-Political-Atlas/0.81" } });
if (!response.ok) throw new Error(`OECD SDMX request failed: ${response.status}`);
await fs.writeFile(outputPath, await response.text(), "utf8");
console.log(`Saved OECD BMD4 source extract to ${outputPath}`);
