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
  if (request === "react") return { ...React, useState: initial => [cursor < state.length ? state[cursor++] : initial, () => {}] };
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
  assert.match(html,/稳健性摘要（非评分）/);
  assert.match(html,/整条路径推断：研究结论/);
  assert.match(html,/本页不提供联合置信带/);
  assert.match(html,/不能合起来当作整条反应路径/);
  assert.match(html,/不提供整条路径的显著性检验/);
  assert.doesNotMatch(html,/拟合模型（描述性，研究版）/);
  assert.match(html,/这不是模型正确率/);
  assert.doesNotMatch(html,/同时置信带可用|全路径 max-t p=/);
  combinations++;
}
let modelCombinations = 0;
for (const outcome of ["hicp_price_level","industrial_production","unemployment","long_term_yield"]) for (const shock of ["MP","CBI"]) for (const difference of [false,true]) {
  state = [outcome,shock,95,difference,false,true];
  const html = render();
  assert.equal((html.match(/<polyline/g) ?? []).length,difference ? 2 : 4);
  assert.equal((html.match(/<polygon/g) ?? []).length,difference ? 1 : 2);
  assert.equal((html.match(/stroke-dasharray="2 4"/g) ?? []).length,difference ? 1 : 2);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
  assert.match(html,/拟合模型（描述性，研究版）/);
  assert.match(html,/点线为拟合模型的总体投影路径/);
  assert.match(html,/不是结构脉冲响应/);
  assert.match(html,/不用于推断/);
  assert.match(html,/最大逐期差距（以冻结标准误为单位）：欧元组 \d+\.\d{2}，非欧元组 \d+\.\d{2}，组间差异 \d+\.\d{2}/);
  if (outcome === "industrial_production") assert.match(html,/模型未能复现工业生产 MP 组间差异路径/); else assert.doesNotMatch(html,/模型未能复现/);
  assert.doesNotMatch(html,/同时置信带可用|全路径 max-t p=/);
  modelCombinations++;
}
console.log(`Panel LP UI structural validation passed: ${combinations} selector/view combinations, ${modelCombinations} model-overlay combinations and publication gate. Browser visual QA remains separate.`);
for (const outcome of ["hicp_price_level","industrial_production","unemployment","long_term_yield"]) for (const shock of ["MP","CBI"]) for (const view of ["composition","time_fe"]) {
  state = [outcome,shock,95,false,true,false,view];
  const html = render();
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
  assert.match(html,/组成与规格敏感性/);
  assert.match(html,view === "composition" ? /不是置信区间/ : /time-FE 次要规格差异/);
}
console.log("Panel diagnostics UI: 16 outcome/shock/advanced-view combinations passed.");
