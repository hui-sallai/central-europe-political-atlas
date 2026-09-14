"use client";
import { useState } from "react";
import summary from "@/data/panel-local-projections/panel_lp_composition_robustness_summary.json";
import timeFe from "@/data/panel-local-projections/panel_lp_time_fe_sensitivity_summary.json";
import influence from "@/data/panel-local-projections/panel_lp_country_influence.json";
import ui from "@/data/panel-local-projections/panel_lp_composition_ui_data.json";

const countryNames: Record<string,string> = {AT:"奥地利",DE:"德国",SK:"斯洛伐克",SI:"斯洛文尼亚",CZ:"捷克",HU:"匈牙利",PL:"波兰",RO:"罗马尼亚"};
const rate = (v:number) => `${(v*100).toFixed(1)}%`;
export function PanelCompositionDiagnostics({outcome,shock,unit}:{outcome:string;shock:string;unit:string}) {
  const [view,setView] = useState("composition");
  const group = summary.records.find(r => r.outcome === outcome && r.shock === shock)!;
  const sensitivity = timeFe.records.find(r => r.outcome === outcome && r.shock === shock)!;
  const envelope = ui.records.find(r => r.outcome === outcome && r.shock === shock)!;
  const values = view === "composition" ? envelope.records.flatMap(r => [r.minimum,r.maximum,r.baseline]) : sensitivity.records.flatMap(r => [r.baseline_difference,r.time_fe_difference]);
  const low = Math.min(0,...values), high = Math.max(0,...values), pad = Math.max(.01,(high-low)*.1);
  const x = (h:number) => 65+h*690/24;
  const y = (v:number) => 310-(v-low+pad)*260/(high-low+2*pad);
  return <section aria-label="组成与规格敏感性" className="mt-5 border p-4">
    <h3 className="text-xl font-semibold">组成与规格敏感性</h3>
    <p className="mt-3 text-sm">以下为固定研究组成的诊断，不替换正式八国 country-FE 基准；不表示某国的因果贡献。</p>
    <div role="group" aria-label="敏感性视图" className="mt-4 flex flex-wrap gap-3">{[["composition","组成诊断"],["time_fe","time-FE 规格比较"]].map(([id,label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`border p-3 ${view === id ? "bg-[var(--accent)] text-white" : ""}`}>{label}</button>)}</div>
    {view === "composition" ? <>
      <p className="mt-4">最大绝对变化对应：{countryNames[group.most_influential_country]}；变化 {group.maximum_absolute_change.toFixed(3)} {unit}（h={group.horizon_of_maximum_change}）。</p>
      <p className="mt-2">符号一致率 {rate(group.sign_agreement_rate)}；95% 点态区间含零分类一致率 {rate(group.zero_classification_agreement_rate)}。分母为 {group.valid_count} 条有效剔除国家 × 预测期记录；无效 {group.invalid_count} 条。</p>
      <p className="mt-2 text-sm">删除欧元组国家后为 3 对 4；删除非欧元组国家后为 4 对 3。保持正式基准各预测期月份日历；八国不是八次独立冲击。</p>
    </> : <>
      <p className="mt-4">路径相关系数 {sensitivity.path_correlation.toFixed(3)}；符号一致率 {rate(sensitivity.sign_agreement_rate)}；含零分类一致率 {rate(sensitivity.zero_classification_agreement_rate)}。</p>
      <p className="mt-2 text-sm">time-FE 仅为异质性差异敏感性规格，不自动选择正确模型。下图两条线均为组间差异，不是两组各自响应。</p>
    </>}
    <figure className="mt-4 overflow-x-auto"><svg viewBox="0 0 800 360" role="img" aria-label={view === "composition" ? "基准差异与 LOCO 诊断范围，不是置信区间" : "基准差异与 time-FE 规格差异"} className="w-full min-w-[640px]">
      <title>{view === "composition" ? "LOCO diagnostic range — not a confidence interval" : "Baseline versus time-FE heterogeneity sensitivity"}</title>
      {[0,1,2,3,4].map(i => {const v=low-pad+i*(high-low+2*pad)/4;return <g key={i}><line x1="65" x2="755" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12"/><text x="57" y={y(v)+4} textAnchor="end" fill="currentColor" fontSize="12">{v.toFixed(2)}</text></g>;})}
      <line x1="65" x2="755" y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="5 4"/>
      {view === "composition" ? <>
        <polygon fill="#64748b" opacity=".2" points={[...envelope.records.map(r => `${x(r.horizon)},${y(r.minimum)}`),...[...envelope.records].reverse().map(r => `${x(r.horizon)},${y(r.maximum)}`)].join(" ")}/>
        <polyline fill="none" stroke="#7c3aed" strokeWidth="2.5" points={envelope.records.map(r => `${x(r.horizon)},${y(r.baseline)}`).join(" ")}/>
      </> : ["baseline_difference","time_fe_difference"].map((key,i) => <polyline key={key} fill="none" stroke={i ? "#c2410c" : "#7c3aed"} strokeDasharray={i ? "6 3" : undefined} strokeWidth="2.5" points={sensitivity.records.map(r => `${x(r.horizon)},${y(r[key as "baseline_difference" | "time_fe_difference"])}`).join(" ")}/>)}
      {[0,6,12,18,24].map(h => <text key={h} x={x(h)} y="334" textAnchor="middle" fill="currentColor">{h}</text>)}
      <text x="65" y="25" fill="currentColor">{unit}</text><text x="410" y="357" textAnchor="middle" fill="currentColor">冲击后月数</text>
    </svg><figcaption className="text-sm">紫色实线：正式八国基准差异。{view === "composition" ? "灰色带：LOCO diagnostic range（诊断范围），不是置信区间，不是 jackknife 标准误。" : "橙色虚线：time-FE 次要规格差异。相关系数不是路径显著性检验。"}</figcaption></figure>
    {view === "composition" ? <>
      <div className="mt-4 overflow-x-auto"><table className="research-data-table w-full text-left text-sm"><caption>分预测期窗口诊断</caption><thead><tr>{["月份","最大变化","中位变化","第90百分位","符号一致率","含零分类一致率"].map(k => <th key={k}>{k}</th>)}</tr></thead><tbody>{group.windows.map(r => <tr key={r.horizon_start}><td>{r.horizon_start}–{r.horizon_end}</td><td>{r.maximum_absolute_change.toFixed(3)}</td><td>{r.median_absolute_change.toFixed(3)}</td><td>{r.p90_absolute_change.toFixed(3)}</td><td>{rate(r.sign_agreement_rate)}</td><td>{rate(r.zero_classification_agreement_rate)}</td></tr>)}</tbody></table></div>
      <details className="mt-4"><summary>各国组成影响与逐期诊断范围</summary><ul>{influence.records.filter(r => r.outcome === outcome && r.shock === shock).map(r => <li key={r.country}>{countryNames[r.country]}（{r.group === "euro" ? "欧元组" : "非欧元组"}）：最大变化 {r.maximum_difference_shift.toFixed(3)}，h={r.horizon_of_max_shift}；符号反转 {r.sign_reversal_count} 期；含零分类改变 {r.pointwise_classification_change_count} 期。</li>)}</ul><div className="overflow-x-auto"><table className="research-data-table w-full text-left text-sm"><thead><tr><th>h</th><th>LOCO 最小值</th><th>LOCO 最大值</th></tr></thead><tbody>{envelope.records.map(r => <tr key={r.horizon}><td>{r.horizon}</td><td>{r.minimum.toFixed(3)}</td><td>{r.maximum.toFixed(3)}</td></tr>)}</tbody></table></div></details>
    </> : <div className="mt-4 overflow-x-auto"><table className="research-data-table w-full text-left text-sm"><thead><tr>{["h","基准差异","time-FE 差异","基准95%点态区间","time-FE 95%点态区间","规格敏感性"].map(k => <th key={k}>{k}</th>)}</tr></thead><tbody>{sensitivity.records.map(r => <tr key={r.horizon}><td>{r.horizon}</td><td>{r.baseline_difference.toFixed(3)}</td><td>{r.time_fe_difference.toFixed(3)}</td><td>{r.baseline_ci95.map(v => v.toFixed(3)).join("，")}</td><td>{r.time_fe_ci95.map(v => v.toFixed(3)).join("，")}</td><td>{r.classification_same ? "含零分类一致" : !r.baseline_ci95_contains_zero && r.time_fe_ci95_contains_zero ? "规格敏感：该预测期组间差异对 time-FE sensitivity 不稳健。" : "规格敏感：95% 点态含零分类不一致。"}</td></tr>)}</tbody></table></div>}
    <p className="mt-4 text-sm">仅逐预测期点态解释。Panel path inference、IK 和国家对国家正式检验保持 registry_only；不生成稳健性评分。</p>
  </section>;
}
