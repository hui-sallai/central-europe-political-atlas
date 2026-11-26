// Reconstruct the admitted SerbiaSorsMonthlyPanel producer input from the published runtime.
// The fixed date is an assembly test parameter. It is not a receipt for a historical capture.
import fs from "node:fs";
import path from "node:path";
import { createRequire, Module } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith("@/") ? path.resolve("src", id.slice(2)) : id, ...args);
};
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
}).outputText, file);
const {buildSnapshot} = require("../../src/lib/researchSnapshot.ts");
const {buildZip} = require("../../src/lib/clientZip.ts");

export const SORS_FIXTURE_TIME = "2026-11-26T12:00:00.000Z";
const read = file => JSON.parse(fs.readFileSync(new URL("../../" + file, import.meta.url), "utf8"));
export function buildSorsSnapshotExample(key = "cpi_index_2006", generatedAt = SORS_FIXTURE_TIME) {
  const runtime = read("public/research-data/serbia_sors_runtime.json");
  const history = read("public/research-data/serbia/serbia_descriptive_history_monthly.json");
  const selected = runtime.series.find(s => s.store === "monthly" && s.key === key);
  const archived = history.series_sources.find(s => s.series === key);
  if (!selected || !archived?.original_code) throw new Error("Fixture needs an admitted runtime series and archived SORS query.");
  const quarterly = /-Q\d$/.test(selected.points[0][0]);
  const origin = "https://hy-central-europe-analysis.org/data/";
  const query = new URLSearchParams({tab:"high_frequency", country:"serbia", sors_series:key});
  const input = {
    locale:"zh-CN", title:"塞尔维亚 · " + selected.label, view_type:"serbia_sors", page_path:"/data/",
    shareable_view_url:origin + "?" + query.toString(), countries:["serbia"], indicators:[selected.display_indicator],
    filters:{country:"serbia", sors_series:key, sort:"period_desc", frequency:quarterly ? "quarterly" : "monthly"},
    comparability_status:selected.cross_country_comparable ? "registered_comparable_within_segments" : "serbia_only_not_cross_country_comparable",
    limitations:["SORS 原始单位与标准化单位分别保留；CPI 不等同于 HICP；断点状态不跨段拼接。",
      ...(quarterly ? ["CSV 保留原始季度标签；图形横轴将季度映射到季末月份，不是月度观测。"] : [])],
    rows:[...selected.points].reverse().map(([period, normalized, original, flag, within, cross]) => ({
      id:"sors:" + key + ":" + period, country:"serbia", indicator:selected.display_indicator, period, value:normalized,
      unit:selected.unit ?? "", original_value:original, original_unit:selected.original_unit, layer:"serbia_sors_descriptive",
      status:selected.status_legend[flag] ?? flag, comparable_within_segment:within === 1, cross_country_comparable:cross === 1,
      source:{institution:"Statistical Office of the Republic of Serbia (SORS/RZS)", dataset:selected.dataset, source_url:selected.source_url,
        source_code:JSON.stringify(archived.original_code), retrieved_at:archived.retrieved_at, unit:selected.unit ?? "",
        original_unit:selected.original_unit ?? "", status:selected.mapping_status, source_layer:"serbia_sors_descriptive"},
    })),
  };
  const snapshot = buildSnapshot(input, generatedAt);
  return {...snapshot, input, bytes:buildZip(snapshot.files, snapshot.generatedAt)};
}
