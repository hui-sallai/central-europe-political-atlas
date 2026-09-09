"use client";
import { useState } from "react";
import data from "@/data/panel-local-projections/panel_lp_results.json";
import readiness from "@/data/panel-local-projections/panel_lp_readiness_registry.json";

const names = { euro: "固定四国欧元组", non_euro: "固定四国非欧元组", difference: "欧元组 − 非欧元组" };
const colors = { euro: "#2563eb", non_euro: "#c2410c", difference: "#7c3aed" };
const outcomes: Record<string,string> = { hicp_price_level: "HICP 价格水平", industrial_production: "工业生产", unemployment: "失业率", long_term_yield: "长期国债收益率" };
export function PanelLocalProjectionWorkbench() {
  const [selected,setSelected] = useState("hicp_price_level");
  const [shock,setShock] = useState("MP");
  const [confidence,setConfidence] = useState<90|95>(95);
  const [difference,setDifference] = useState(false);
  const model = data.records.find(r => r.outcome_id === selected);
  const gate = readiness.records.find(r => r.outcome_id === selected);
  // Protect direct mounting as well as the canonical route.
  if (!gate?.publication_ready || !model) return <section className="mt-6 border p-6"><h2>Panel Local Projections 尚未发布</h2><p>离线数值验证通过不等于发布批准；完成全部发布门禁前不展示正式结果。</p></section>;
  const rows = model.records.filter(r => r.shock === shock);
  const series: (keyof typeof names)[] = difference ? ["difference"] : ["euro","non_euro"];
  const values = rows.flatMap(r => series.flatMap(s => r[`${s}_ci${confidence}`]));
  const lower = Math.min(0,...values), upper = Math.max(0,...values);
  const padding = Math.max(.01,(upper-lower)*.08);
  const x = (h:number) => 65+690*h/model.eligible_horizon;
  const y = (v:number) => 315-275*(v-lower+padding)/(upper-lower+2*padding);
  const unit = model.response_unit === "cumulative_percent" ? "累计百分比变化（%）" : "百分点";
  return <section className="mt-6 border-t border-[var(--line)] pt-6">
    <h2 className="text-2xl font-semibold">共同 ECB 冲击：固定两组动态响应</h2>
    <div className="mt-5 flex flex-wrap gap-5">
      <label>结果变量<select className="ml-2 border p-2" value={selected} onChange={e => setSelected(e.target.value)}>{Object.entries(outcomes).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <label>共同冲击<select className="ml-2 border p-2" value={shock} onChange={e => setShock(e.target.value)}><option value="MP">MP：纯紧缩 +25bp</option><option value="CBI">CBI：正向信息分量 +0.25</option></select></label>
      <label>点态置信水平<select className="ml-2 border p-2" value={confidence} onChange={e => setConfidence(Number(e.target.value) as 90|95)}><option value="90">90%</option><option value="95">95%</option></select></label>
    </div>
    <div role="group" aria-label="响应图视图" className="mt-5 flex gap-3">{[false,true].map(value => <button type="button" key={String(value)} aria-pressed={difference === value} onClick={() => setDifference(value)} className={`border px-4 py-2 ${difference === value ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)]"}`}>{value ? "组间差异" : "两组响应"}</button>)}</div>
    <figure className="mt-5 overflow-x-auto"><svg viewBox="0 0 800 370" className="min-w-[640px] w-full" role="img" aria-label={`${difference ? "组间差异" : "两组响应"}与 ${confidence}% 点态置信区间`}>
      <title>{`${difference ? "组间响应差异" : "固定两组响应"}：${confidence}% 点态区间`}</title>
      {[0,1,2,3,4].map(i => {const v=lower-padding+i*(upper-lower+2*padding)/4;return <g key={i}><line x1="65" x2="755" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12"/><text x="57" y={y(v)+4} textAnchor="end" fill="currentColor" fontSize="12">{v.toFixed(2)}</text></g>;})}
      <line x1="65" x2="755" y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="5 4"/>
      {series.map(s => <g key={s}><polygon fill={colors[s]} opacity=".14" points={[...rows.map(r => `${x(r.horizon)},${y(r[`${s}_ci${confidence}`][0])}`),...[...rows].reverse().map(r => `${x(r.horizon)},${y(r[`${s}_ci${confidence}`][1])}`)].join(" ")}/><polyline fill="none" stroke={colors[s]} strokeWidth="2.5" points={rows.map(r => `${x(r.horizon)},${y(r[`${s}_estimate`])}`).join(" ")}/></g>)}
      {rows.filter(r => r.horizon%6===0).map(r => <text key={r.horizon} x={x(r.horizon)} y="337" textAnchor="middle" fill="currentColor" fontSize="12">{r.horizon}</text>)}
      <text x="410" y="363" textAnchor="middle" fill="currentColor">冲击后月数</text><text x="65" y="24" fill="currentColor">{unit}</text>
    </svg><figcaption className="flex flex-wrap gap-4 text-sm">{series.map(s => <span key={s} style={{color:colors[s]}}>━ {names[s]}</span>)}<span>阴影为 {confidence}% 点态区间，虚线为零响应。</span></figcaption></figure>
    <p className="mt-5 text-sm leading-7">联合估计 MP 与 CBI，按月份聚类的 t-LAHR 推断。各期有效月份 {Math.min(...rows.map(r => r.effective_time_clusters))}–{Math.max(...rows.map(r => r.effective_time_clusters))}；面板行数 {Math.min(...rows.map(r => r.panel_rows))}–{Math.max(...rows.map(r => r.panel_rows))}。8 国不等于 8 次独立冲击；面板行数不是独立冲击观测数。</p>
    <p className="mt-3 text-sm leading-7">欧元组：奥地利、德国、斯洛伐克、斯洛文尼亚；非欧元组：捷克、匈牙利、波兰、罗马尼亚。不代表整个地区。克罗地亚因 2023 年制度断点排除，塞尔维亚因覆盖不足排除。仅点态推断；整条路径异质性检验、面板同时置信带、国家对国家正式检验及 IK 小样本修正均未启用。</p>
    <details className="mt-5"><summary>逐期数值与样本诊断</summary><div className="overflow-x-auto"><table className="research-data-table w-full text-left text-sm"><thead><tr>{["月数","欧元组","非欧元组","差异","差异 p 值","有效月份","行数","滞后数","样本"].map(v => <th className="p-2" key={v}>{v}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.horizon}><td className="p-2">{r.horizon}</td><td>{r.euro_estimate.toFixed(3)}</td><td>{r.non_euro_estimate.toFixed(3)}</td><td>{r.difference_estimate.toFixed(3)}</td><td>{r.difference_p_value.toFixed(4)}</td><td>{r.effective_time_clusters}</td><td>{r.panel_rows}</td><td>{r.p_h}</td><td className="whitespace-nowrap">{r.sample_start}–{r.sample_end}</td></tr>)}</tbody></table></div></details>
  </section>;
}
