import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "out");
const base = JSON.parse(fs.readFileSync(path.join(root, "src/data/release.json"), "utf8")).canonical_url.replace(/\/$/, "");
const countries = JSON.parse(fs.readFileSync(path.join(root, "src/data/countries/countries.json"), "utf8")).records.map(country => country.slug);
const workspaceIds = ["inflation_monetary_policy", "trade_external_exposure", "fiscal_macro_conditions", "regional_development"];
const routes = ["/", "/countries/", "/data/", "/map/", "/models/", "/scenarios/", "/methodology/", "/legal/", "/privacy/", "/news/", "/workspaces/", ...workspaceIds.map(id => `/workspaces/${id}/`), ...countries.map(slug => `/countries/${slug}/`)];
const failures = [];
let checks = 0;
const check = (condition, message) => { checks++; if (!condition) failures.push(message); };
const englishRoute = route => `/en${route}`;
const fileFor = route => path.join(out, route.replace(/^\//, ""), "index.html");
// Typed dictionary parity also checked independently of TypeScript assignability.
const source = fs.readFileSync(path.join(root, "src/i18n/messages.ts"), "utf8");
const ast = ts.createSourceFile("messages.ts", source, ts.ScriptTarget.Latest, true);
const keys = {};
function walk(node) {
  if (ts.isVariableDeclaration(node) && node.initializer && ["zh", "en"].includes(node.name.getText(ast))) {
    let initializer = node.initializer;
    while (ts.isAsExpression(initializer)) initializer = initializer.expression;
    assert.ok(ts.isObjectLiteralExpression(initializer));
    keys[node.name.getText(ast)] = initializer.properties.map(property => property.name?.getText(ast)).sort();
  }
  ts.forEachChild(node, walk);
}
walk(ast);
check(JSON.stringify(keys.zh) === JSON.stringify(keys.en), "Dictionary keys differ between zh-CN and en");
for (const route of routes) for (const locale of ["zh-CN", "en"]) {
  const localRoute = locale === "en" ? englishRoute(route) : route;
  const file = fileFor(localRoute);
  check(fs.existsSync(file), `Missing static route: ${localRoute}`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  check(html.includes(`<html lang="${locale}"`), `${localRoute}: static html lang`);
  check(html.includes(`<link rel="canonical" href="${base}${localRoute}"`), `${localRoute}: canonical`);
  for (const [language, target] of [["zh-CN", route], ["en", englishRoute(route)], ["x-default", route]]) {
    check(html.includes(`hrefLang="${language}" href="${base}${target}"`), `${localRoute}: ${language} alternate`);
  }
  if (locale === "en") {
    const body = html.split(/<body[^>]*>/)[1]?.split("</body>")[0] ?? "";
    const text = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "")
      .replace(/<div[^>]*data-original-language="zh-CN"[^>]*>[\s\S]*?<\/div>/g, "")
      .replace(/<span[^>]*data-original-language="zh-CN"[^>]*>[\s\S]*?<\/span>/g, "")
      .replace(/<option[^>]*data-original-language="zh-CN"[^>]*>[\s\S]*?<\/option>/g, "")
      .replace(/>中文<\/a>/g, "></a>").replace(/<[^>]+>/g, "");
    check(!/[\u3400-\u9fff]/u.test(text), `${localRoute}: untranslated core Chinese text`);
    const anchors = [...body.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
    for (const href of anchors.filter(href => href.startsWith("/en/"))) {
      const target = href.split(/[?#]/, 1)[0];
      check(fs.existsSync(fileFor(target)), `${localRoute}: broken English link ${href}`);
    }
  }
}
console.log(JSON.stringify({ status: failures.length ? "fail" : "pass", checks, expected_pairs: routes.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
