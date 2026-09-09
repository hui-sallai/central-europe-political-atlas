import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, Module } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "../..");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const resolve = Module._resolveFilename, load = Module._load;
let state = [], cursor = 0, publicationReady = false;
Module._resolveFilename = function (request, ...args) { return resolve.call(this, request.startsWith("@/") ? path.join(root,"src",request.slice(2)) : request, ...args); };
Module._load = function (request, ...args) {
  if (request === "react") return { ...React, useState: () => [state[cursor++], () => {}] };
  const result = load.call(this, request, ...args);
  // Exercise the released branch only in memory: never change canonical readiness.
  if (request.endsWith("panel_lp_readiness_registry.json")) return { ...result, records: result.records.map(r => ({...r,publication_ready:publicationReady})) };
  return result;
};
require.extensions[".tsx"] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
const componentPath = path.join(root,"src/components/PanelLocalProjectionWorkbench.tsx");
function render() {
  cursor = 0;
  delete require.cache[componentPath];
  const { PanelLocalProjectionWorkbench } = require(componentPath);
  return renderToStaticMarkup(React.createElement(PanelLocalProjectionWorkbench));
}
state = ["hicp_price_level","MP",95,false];
assert.match(render(),/尚未发布/);
assert.doesNotMatch(render(),/<svg/);
publicationReady = true;
let combinations = 0;
for (const outcome of ["hicp_price_level","industrial_production","unemployment","long_term_yield"]) for (const shock of ["MP","CBI"]) for (const confidence of [90,95]) for (const difference of [false,true]) {
  state = [outcome,shock,confidence,difference];
  const html = render();
  assert.equal((html.match(/<polyline/g) ?? []).length,difference ? 1 : 2);
  assert.equal((html.match(/<polygon/g) ?? []).length,difference ? 1 : 2);
  assert.equal((html.match(/<tr>/g) ?? []).length,26);
  assert.ok(html.includes(`${confidence}% 点态`));
  assert.match(html,/stroke-dasharray="5 4"/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
  assert.match(html,/IK 小样本修正均未启用/);
  combinations++;
}
console.log(`Panel LP UI structural validation passed: ${combinations} selector/view combinations and publication gate. Browser visual QA remains separate.`);
