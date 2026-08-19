import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "out");
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const requiredRoutes = ["", "map", "countries", "data", "news", "models", "scenarios", "methodology", ...["poland", "hungary", "czechia", "slovakia", "germany", "austria", "romania", "slovenia", "croatia", "serbia"].map((country) => `countries/${country}`)];
const requiredExports = ["platform_metadata.json", "release_manifest.json", "validation_registry.json", "golden_test_cases.json", "observations.json", "sources.json", "indicators.json"];
const failures = [];

for (const route of requiredRoutes) {
  const file = path.join(out, route, "index.html");
  if (!fs.existsSync(file)) failures.push(`missing route: /${route}`);
}

for (const fileName of requiredExports) {
  const file = path.join(out, "research-data", fileName);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) failures.push(`missing export: ${fileName}`);
}

const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "_next") walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(fullPath);
  }
}
walk(out);

const internalTargets = new Set(requiredRoutes.map((route) => `/${route}${route ? "/" : ""}`));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`missing title: ${path.relative(out, file)}`);
  for (const match of html.matchAll(/href="([^"#?]+)[^\"]*"/g)) {
    const href = match[1];
    if (!href.startsWith("/") || href.startsWith("/_next/") || href.startsWith("/research-data/")) continue;
    const withoutBasePath = configuredBasePath && href.startsWith(configuredBasePath) ? href.slice(configuredBasePath.length) || "/" : href;
    if (withoutBasePath.startsWith("/_next/") || withoutBasePath.startsWith("/research-data/")) continue;
    const normalized = withoutBasePath.endsWith("/") ? withoutBasePath : `${withoutBasePath}/`;
    if (!internalTargets.has(normalized)) failures.push(`broken internal link ${href} in ${path.relative(out, file)}`);
  }
}

const metadata = JSON.parse(fs.readFileSync(path.join(out, "research-data", "platform_metadata.json"), "utf8"));
if (metadata.version !== "v0.95 Research Release Candidate") failures.push(`unexpected platform version: ${metadata.version}`);

if (failures.length) {
  console.error(`Release QA failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release QA passed: ${requiredRoutes.length} routes, ${requiredExports.length} research exports, ${htmlFiles.length} HTML pages.`);
