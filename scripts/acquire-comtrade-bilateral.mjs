// Fetches bilateral merchandise trade (TOTAL goods, exports + imports) for the ten
// platform reporters from the UN Comtrade public preview API (no API key required).
// One call = one reporter × one year × one flow × all partners (preview API limit:
// a single period per call, 500 records max). Results are cached under
// .tmp-comtrade/raw/ so the script is resumable after rate-limit interruptions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.join(root, ".tmp-comtrade", "raw");
fs.mkdirSync(rawDir, { recursive: true });

const REPORTERS = [
  ["germany", 276], ["poland", 616], ["hungary", 348], ["romania", 642], ["czechia", 203],
  ["slovakia", 703], ["slovenia", 705], ["serbia", 688], ["austria", 40], ["croatia", 191],
];
const YEARS = Array.from({ length: 11 }, (_, index) => 2015 + index);
const FLOWS = ["X", "M"];
const SLEEP_MS = 1300;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOne(slug, reporterCode, year, flow) {
  const file = path.join(rawDir, `${slug}-${year}-${flow}.json`);
  if (fs.existsSync(file)) return "cached";
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporterCode}&period=${year}&flowCode=${flow}&cmdCode=TOTAL&motCode=0&customsCode=C00&partner2Code=0&includeDesc=true`;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status === 429 || response.status >= 500) {
        const wait = SLEEP_MS * (attempt + 2) * 5;
        console.log(`  rate/5xx ${response.status} for ${slug} ${year} ${flow}; waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { throw new Error(`non-JSON response: ${text.slice(0, 120)}`); }
      if (payload.error) {
        // e.g. data not yet available for the year
        fs.writeFileSync(file, JSON.stringify({ error: payload.error, refYear: year, flowCode: flow }));
        return "empty";
      }
      if (!Array.isArray(payload.data)) throw new Error(`unexpected payload: ${text.slice(0, 120)}`);
      fs.writeFileSync(file, JSON.stringify(payload));
      return `ok(${payload.count})`;
    } catch (error) {
      console.log(`  error ${slug} ${year} ${flow} attempt ${attempt + 1}: ${String(error).slice(0, 120)}`);
      await sleep(SLEEP_MS * (attempt + 2) * 5);
    }
  }
  throw new Error(`failed permanently: ${slug} ${year} ${flow}`);
}

const main = async () => {
  let done = 0;
  const total = REPORTERS.length * YEARS.length * FLOWS.length;
  for (const [slug, code] of REPORTERS) {
    for (const flow of FLOWS) {
      for (const year of YEARS) {
        const result = await fetchOne(slug, code, year, flow);
        done += 1;
        if (result !== "cached") console.log(`[${done}/${total}] ${slug} ${year} ${flow}: ${result}`);
        await sleep(SLEEP_MS);
      }
    }
  }
  console.log(`Acquisition complete: ${done}/${total} calls resolved.`);
};

main().catch((error) => { console.error(error); process.exit(1); });
