import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
// Saved before implementation from the deployed English edition, commit 0ba4462.
const baseline = { total: 1311284, home: 193923, englishHome: 191974, data: 259430, models: 422365 };
const files = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file.endsWith(".js")) files.push(file); } }
walk("out/_next/static/chunks");
const gzip = file => zlib.gzipSync(fs.readFileSync(file)).length;
function initial(route) {
  const html = fs.readFileSync(`out/${route}index.html`, "utf8");
  return [...new Set([...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map(match => `out${match[1]}`))].reduce((sum, file) => sum + gzip(file), 0);
}
const current = { total: files.reduce((sum, file) => sum + gzip(file), 0), home: initial(""), englishHome: initial("en/"), data: initial("data/"), models: initial("models/") };
const workspaces = Object.fromEntries(["", "inflation_monetary_policy/", "trade_external_exposure/", "fiscal_macro_conditions/", "regional_development/"].map(id => [id || "index", initial(`en/workspaces/${id}`)]));
console.log(JSON.stringify({ baseline_commit: "0ba4462f88a94cbd56b85bd8879939ab151c55f3", estimate: "gzip each unique JS chunk independently; not a load-time benchmark", baseline, current, delta: Object.fromEntries(Object.keys(current).map(key => [key, current[key] - baseline[key]])), workspaces }, null, 2));
