"use client";
import { useState } from "react";
import data from "@/data/panel-local-projections/panel_lp_results.json";
import readiness from "@/data/panel-local-projections/panel_lp_readiness_registry.json";
import { PanelCompositionDiagnostics } from "./PanelCompositionDiagnostics";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import composition from "@/data/panel-local-projections/panel_lp_composition_robustness_summary.json";
import specification from "@/data/panel-local-projections/panel_lp_time_fe_sensitivity_summary.json";
import modelComparison from "@/data/panel-local-projections/panel_lp_model_comparison.json";
import definitionRegistry from "@/data/high-frequency/high_frequency_definition_registry.json";

const names = { euro: "固定四国欧元组", non_euro: "固定四国非欧元组", difference: "欧元组 − 非欧元组" };
const colors = { euro: "#2563eb", non_euro: "#c2410c", difference: "#7c3aed" };
// Line style distinguishes the groups without relying on colour alone.
const dashes = { euro: undefined, non_euro: "8 4", difference: undefined };
const outcomes: Record<string,string> = { hicp_price_level: "HICP 价格水平", industrial_production: "工业生产", unemployment: "失业率", long_term_yield: "长期国债收益率" };
export function PanelLocalProjectionWorkbench() {
  const [selected,setSelected] = useState("hicp_price_level");
  const [shock,setShock] = useState("MP");
  const [confidence,setConfidence] = useState<90|95>(95);
  const [difference,setDifference] = useState(false);
  const [advanced,setAdvanced] = useState(false);
  const [showModel,setShowModel] = useState(false);
  const model = data.records.find(r => r.outcome_id === selected);
  const gate = readiness.records.find(r => r.outcome_id === selected);
  // Protect direct mounting as well as the canonical route.
  if (!gate?.publication_ready || !model) return <section className="mt-6 border p-6"><h2>Panel Local Projections 尚未发布</h2><p>离线数值验证通过不等于发布批准；完成全部发布门禁前不展示正式结果。</p></section>;
  const rows = model.records.filter(r => r.shock === shock);
  const compositionSummary = composition.records.find(r => r.outcome === selected && r.shock === shock);
  const specificationSummary = specification.records.find(r => r.outcome === selected && r.shock === shock);
  const series: (keyof typeof names)[] = difference ? ["difference"] : ["euro","non_euro"];
  const fitted = modelComparison.records.find(r => r.outcome_id === selected);
  const definitionIndicator = selected === "industrial_production" ? "industrial_production_index" : selected === "unemployment" ? "unemployment_rate_monthly" : selected === "long_term_yield" ? "long_term_government_yield" : null;
  const definitionNote = definitionIndicator ? definitionRegistry.records.find(r => r.indicator === definitionIndicator) : null;
  const modelRows = (fitted?.series ?? []).filter(r => r.shock === shock);
  const joint = modelComparison.joint_inference.evidence;
  const unit = model.response_unit === "cumulative_percent" ? "累计百分比变化（%）" : "百分点";
  return <section className="mt-6 border-t border-[var(--line)] pt-6">
    <h2 className="text-2xl font-semibold">共同 ECB 冲击：固定两组动态响应</h2>
    <div className="mt-5 flex flex-wrap gap-5">
      <label>结果变量<select className="ml-2 border p-2" value={selected} onChange={e => setSelected(e.target.value)}>{Object.entries(outcomes).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <label>共同冲击<select className="ml-2 border p-2" value={shock} onChange={e => setShock(e.target.value)}><option value="MP">MP：纯紧缩 +25bp</option><option value="CBI">CBI：正向信息分量 +0.25</option></select></label>
      <label>点态置信水平<select className="ml-2 border p-2" value={confidence} onChange={e => setConfidence(Number(e.target.value) as 90|95)}><option value="90">90%</option><option value="95">95%</option></select></label>
    </div>
    <div role="group" aria-label="响应图视图" className="mt-5 flex flex-wrap gap-3">{[false,true].map(value => <button type="button" key={String(value)} aria-pressed={difference === value} onClick={() => setDifference(value)} className={`border px-4 py-2 ${difference === value ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)]"}`}>{value ? "组间差异" : "两组响应"}</button>)}<button type="button" aria-pressed={showModel} onClick={() => setShowModel(!showModel)} className={`border px-4 py-2 ${showModel ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)]"}`}>叠加拟合模型路径（描述性）</button></div>
    <div className="mt-5"><ResearchTimeSeriesChart
      title={`${difference ? "组间响应差异" : "固定两组响应"}：${confidence}% 点态区间`}
      series={[
        ...series.map(s => ({ id: s, label: names[s], color: colors[s], dash: dashes[s], width: 2.5, points: rows.map(r => ({ x: r.horizon, y: r[`${s}_estimate`] })), band: rows.map(r => ({ x: r.horizon, lower: r[`${s}_ci${confidence}`][0], upper: r[`${s}_ci${confidence}`][1] })) })),
        ...(showModel && modelRows.length > 0 ? series.map(s => ({ id: `model-${s}`, label: `${names[s]}（拟合模型路径）`, color: colors[s], dash: "2 4", width: 2, points: modelRows.map(r => ({ x: r.horizon, y: r[`model_${s}`] })) })) : []),
      ]}
      xKind="number" xLabel="冲击后月数" xTickValues={[0, 6, 12, 18, 24].filter(h => h <= model.eligible_horizon)}
      yLabel={unit} zeroLine includeZero zeroDash="5 4" height={340}
    /><p className="mt-2 text-sm text-[var(--muted)]">阴影为 {confidence}% 点态区间，虚线为零响应。{difference ? "紫色实线为组间差异（欧元组 − 非欧元组）。" : "蓝色实线为欧元组，橙色长虚线为非欧元组。"}{showModel && <span>点线为拟合模型的总体投影路径（描述性，无区间）。</span>}</p></div>
    <p className="mt-5 text-sm leading-7">联合估计 MP 与 CBI，按月份聚类的 t-LAHR 推断。各期有效月份 {Math.min(...rows.map(r => r.effective_time_clusters))}–{Math.max(...rows.map(r => r.effective_time_clusters))}；面板行数 {Math.min(...rows.map(r => r.panel_rows))}–{Math.max(...rows.map(r => r.panel_rows))}。8 国不等于 8 次独立冲击；面板行数不是独立冲击观测数。</p>
    <p className="mt-3 text-sm leading-7">欧元组：奥地利、德国、斯洛伐克、斯洛文尼亚；非欧元组：捷克、匈牙利、波兰、罗马尼亚。不代表整个地区。克罗地亚因 2023 年制度断点排除，塞尔维亚因覆盖不足排除。仅点态推断；整条路径异质性检验、面板同时置信带、国家对国家正式检验及 IK 小样本修正均未启用。</p>
    {definitionNote && <aside aria-label="数据定义说明" className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-sm leading-7"><h3 className="font-semibold">数据定义说明</h3>{selected === "industrial_production" && <p>波兰工业生产序列在 2021 年从 LEU 统计单位切换到 KAU。官方资料认为部分 aggregate 可能存在轻微断点；当前 formal sample 保留，并将其视为非阻断方法学警示，不宣称完全可比。</p>}{selected === "unemployment" && <p>匈牙利月度失业率从 2023 年采用 state-space 估计方法；Eurostat 已将 2011–2022 历史数据回溯修订，当前 formal sample 按 latest-revised series 解释。</p>}{selected === "long_term_yield" && <p>斯洛文尼亚当前 Eurostat 2025 observations 带 estimated-value flag；这是质量标记，不是定义断点。</p>}</aside>}
    <aside aria-label="稳健性摘要" className="mt-4 border p-4 text-sm leading-7">
      <h3 className="font-semibold">稳健性摘要（非评分）</h3>
      {compositionSummary && <p>组间差异的组成诊断：逐一剔除国家后，95% 点态区间含零分类与基准的一致率为 {(100*compositionSummary.zero_classification_agreement_rate).toFixed(1)}%（{compositionSummary.valid_count} 条有效国家 × 预测期记录）。诊断范围不是置信区间。</p>}
      {specificationSummary && <p>组间差异的规格比较：基准与 time-FE 符号一致率为 {(100*specificationSummary.sign_agreement_rate).toFixed(1)}%，95% 点态区间含零分类一致率为 {(100*specificationSummary.zero_classification_agreement_rate).toFixed(1)}%。这不是模型正确率，也不是路径显著性检验。</p>}
      <p>发布边界：仅展示已验证的点态结果、诊断与描述性模型对照；整条路径的联合推断经研究后不提供（见下方研究结论）。不能从逐期 p 值挑选整条路径结论，也不能解释为欧元成员身份的因果效应。</p>
      <button type="button" aria-expanded={advanced} className="underline" onClick={() => setAdvanced(true)}>查看组成与规格敏感性详情</button>
    </aside>
    {showModel && fitted && <aside aria-label="拟合模型说明" className="mt-4 border p-4 text-sm leading-7">
      <h3 className="font-semibold">拟合模型（描述性，研究版）：{modelComparison.model.name}</h3>
      <p>{modelComparison.model.summary}</p>
      <p>{modelComparison.model.curve_definition}</p>
      <p>本结果的拟合诊断：伴随矩阵谱半径 {fitted.spectral_radius.toFixed(3)}（严格平稳）；两个不同起点收敛到同一最优（目标差 {fitted.start_objective_difference.toExponential(1)}）。路径拟合检查：按事先登记的“六条路径全部通过”规则记为未通过；按事后采用的族校准规则，校准最小 p = {fitted.path_fit_check.calibrated_min_p.toFixed(3)}，{fitted.path_fit_check.passes ? "通过" : "未通过"}。</p>
      <p>本冲击下模型路径与数据估计的最大逐期差距（以冻结标准误为单位）：欧元组 {fitted.gap_in_frozen_se_units[`${shock}:euro` as keyof typeof fitted.gap_in_frozen_se_units].max_abs_z.toFixed(2)}，非欧元组 {fitted.gap_in_frozen_se_units[`${shock}:non_euro` as keyof typeof fitted.gap_in_frozen_se_units].max_abs_z.toFixed(2)}，组间差异 {fitted.gap_in_frozen_se_units[`${shock}:difference` as keyof typeof fitted.gap_in_frozen_se_units].max_abs_z.toFixed(2)}。差距通常在长预测期最大；差距较大时应以数据估计为准。</p>
      {fitted.warning && <p className="font-semibold">{fitted.warning}</p>}
      <p>模型曲线没有置信区间，不用于推断；它只用于比较数据估计与一个统一的动态模型是否大体一致。模型残差厚尾明显（冲击创新超额峰度约 10），高斯准似然下参数仍可一致估计，但任何基于该模型的区间都未通过覆盖检验。</p>
    </aside>}
    <aside aria-label="整条路径推断的研究结论" className="mt-4 border p-4 text-sm leading-7">
      <h3 className="font-semibold">整条路径推断：研究结论</h3>
      <p>图中区间均为逐期（点态）区间，不能合起来当作整条反应路径（0–24 个月）的置信带。我们检验了构造联合置信带的方法：按现有标准误，高斯联合临界值约为 {joint.frozen_gaussian_joint_critical_range[0].toFixed(2)}–{joint.frozen_gaussian_joint_critical_range[1].toFixed(2)}，而在拟合模型下模拟所需的临界值约为 {joint.bootstrap_required_joint_critical_range[0].toFixed(2)}–{joint.bootstrap_required_joint_critical_range[1].toFixed(2)}；改进后的 bootstrap 联合带在模拟中的实际覆盖约 {(100*joint.best_bootstrap_joint_coverage).toFixed(1)}%（90% 区间 {(100*joint.best_bootstrap_joint_coverage_90ci[0]).toFixed(1)}–{(100*joint.best_bootstrap_joint_coverage_90ci[1]).toFixed(1)}%），低于名义 95%。因此本页不提供联合置信带，也不提供整条路径的显著性检验。</p>
    </aside>
    <details className="mt-5"><summary>逐期数值与样本诊断</summary><div className="overflow-x-auto"><table className="research-data-table w-full text-left text-sm"><thead><tr>{["月数","欧元组","非欧元组","差异","差异 p 值","有效月份","行数","滞后数","样本"].map(v => <th className="p-2" key={v}>{v}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.horizon}><td className="p-2">{r.horizon}</td><td>{r.euro_estimate.toFixed(3)}</td><td>{r.non_euro_estimate.toFixed(3)}</td><td>{r.difference_estimate.toFixed(3)}</td><td>{r.difference_p_value.toFixed(4)}</td><td>{r.effective_time_clusters}</td><td>{r.panel_rows}</td><td>{r.p_h}</td><td className="whitespace-nowrap">{r.sample_start}–{r.sample_end}</td></tr>)}</tbody></table></div></details>
    <button type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)} className="mt-5 border px-4 py-3">{advanced ? "收起" : "展开"}组成与规格敏感性</button>
    {advanced && <PanelCompositionDiagnostics outcome={selected} shock={shock} unit={unit}/>}
  </section>;
}
