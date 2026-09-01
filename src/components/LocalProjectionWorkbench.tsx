"use client";

import { useMemo, useState } from "react";
import results from "@/data/local-projections/lp_results.json";
import validation from "@/data/local-projections/lp_validation_summary.json";

type ShockComponent = "mp" | "cbi";
type Confidence = "90" | "95";
type HorizonRow = (typeof results.records)[number]["horizons"][number];

const countryNames: Record<string, string> = {
  austria: "奥地利 / Austria", germany: "德国 / Germany", slovakia: "斯洛伐克 / Slovakia", slovenia: "斯洛文尼亚 / Slovenia",
  czechia: "捷克 / Czechia", hungary: "匈牙利 / Hungary", poland: "波兰 / Poland", romania: "罗马尼亚 / Romania", serbia: "塞尔维亚 / Serbia",
};
const outcomeNames: Record<string, string> = {
  hicp_price_level: "HICP 价格水平", industrial_production: "工业生产", unemployment: "失业率", long_term_yield: "长期国债收益率",
  bilateral_fx: "本币兑欧元汇率", domestic_policy_rate: "国内政策利率",
};
const responseValue = (row: HorizonRow, component: ShockComponent) => component === "mp" ? row.mp_response_25bp : row.cbi_response_normalized_025;
const intervalValue = (row: HorizonRow, component: ShockComponent, confidence: Confidence) => component === "mp" ? confidence === "95" ? row.ci95_mp : row.ci90_mp : confidence === "95" ? row.ci95_cbi : row.ci90_cbi;

function downloadCsv(rows: HorizonRow[], component: ShockComponent, modelId: string, responseUnit: string) {
  const lines = ["model_id,horizon,component,estimate,standard_error,lower_90,upper_90,lower_95,upper_95,effective_n,shock_normalization,response_unit"];
  for (const row of rows) { const ci90 = intervalValue(row, component, "90"); const ci95 = intervalValue(row, component, "95"); const standardError = component === "mp" ? row.standard_error_mp : row.standard_error_cbi; lines.push([modelId, row.horizon, component, responseValue(row, component), standardError, ci90[0], ci90[1], ci95[0], ci95[1], row.effective_n, 0.25, responseUnit].join(",")); }
  const url = URL.createObjectURL(new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${modelId.replaceAll(":", "-")}-${component}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export function LocalProjectionWorkbench() {
  const active = results.records;
  const countries = [...new Set(active.map((row) => row.country))];
  const [country, setCountry] = useState(countries.includes("poland") ? "poland" : countries[0]);
  const availableOutcomes = active.filter((row) => row.country === country).map((row) => row.outcome_id);
  const [outcome, setOutcome] = useState("hicp_price_level");
  const [component, setComponent] = useState<ShockComponent>("mp");
  const [confidence, setConfidence] = useState<Confidence>("95");
  const [chartHorizon, setChartHorizon] = useState(24);
  const validOutcome = availableOutcomes.includes(outcome) ? outcome : availableOutcomes[0];
  const model = active.find((row) => row.country === country && row.outcome_id === validOutcome)!;
  const rows = model.horizons.filter((row) => row.horizon <= Math.min(chartHorizon, model.maximum_horizon));
  const chart = useMemo(() => {
    const width = 760, height = 280, left = 50, right = 18, top = 18, bottom = 36;
    const values = rows.flatMap((row) => [...intervalValue(row, component, confidence), responseValue(row, component)]);
    const extent = Math.max(0.01, ...values.map((value) => Math.abs(value))) * 1.08;
    const x = (h: number) => left + (h / Math.max(1, rows.at(-1)?.horizon ?? 1)) * (width - left - right);
    const y = (value: number) => top + ((extent - value) / (2 * extent)) * (height - top - bottom);
    const upper = rows.map((row) => `${x(row.horizon)},${y(intervalValue(row, component, confidence)[1])}`).join(" ");
    const lower = rows.toReversed().map((row) => `${x(row.horizon)},${y(intervalValue(row, component, confidence)[0])}`).join(" ");
    const line = rows.map((row) => `${x(row.horizon)},${y(responseValue(row, component))}`).join(" ");
    return { width, height, left, right, bottom, x, y, extent, band: `${upper} ${lower}`, line };
  }, [rows, component, confidence]);

  return (
    <section className="editorial-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="editorial-kicker">Local Projections / v1.7</p><h2 className="mt-2 text-2xl font-semibold">本地投影：ECB 冲击与跨境传导</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">单国、单结果的联合 MP/CBI lag-augmented Local Projection。只展示通过识别、样本、估计器和推断门禁的组合；h=0 是同一日历月反应，不是瞬时反应。</p></div>
        <span className="rounded-full border border-[var(--success)] px-3 py-1 text-xs font-semibold text-[var(--success)]">{validation.status} · {validation.causal_lp_ready_count} 个组合</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-[var(--muted)]">国家<select className="field-control mt-2" value={country} onChange={(event) => { const next = event.target.value; setCountry(next); const first = active.find((row) => row.country === next)?.outcome_id; if (first && !active.some((row) => row.country === next && row.outcome_id === outcome)) setOutcome(first); }}>{countries.map((item) => <option key={item} value={item}>{countryNames[item] ?? item}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">结果变量<select className="field-control mt-2" value={validOutcome} onChange={(event) => setOutcome(event.target.value)}>{availableOutcomes.map((item) => <option key={item} value={item}>{outcomeNames[item] ?? item}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">冲击分量<select className="field-control mt-2" value={component} onChange={(event) => setComponent(event.target.value as ShockComponent)}><option value="mp">纯货币政策 MP（0.25 归一化）</option><option value="cbi">央行信息 CBI（0.25 归一化）</option></select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">点态置信区间<select className="field-control mt-2" value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}><option value="95">95%</option><option value="90">90%</option></select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">图表 horizon<select className="field-control mt-2" value={chartHorizon} onChange={(event) => setChartHorizon(Number(event.target.value))}>{[6, 12, 18, 24].filter((h) => h <= model.maximum_horizon).map((h) => <option key={h} value={h}>h=0…{h}</option>)}</select></label>
      </div>
      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="min-w-[680px]" role="img" aria-label={`${countryNames[country]} ${outcomeNames[validOutcome]} 本地投影响应与点态置信区间`}>
          <line x1={chart.left} x2={chart.width - chart.right} y1={chart.y(0)} y2={chart.y(0)} stroke="var(--foreground)" strokeWidth="1" />
          <polygon points={chart.band} fill="var(--accent)" opacity="0.15" />
          <polyline points={chart.line} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          {rows.map((row) => <circle key={row.horizon} cx={chart.x(row.horizon)} cy={chart.y(responseValue(row, component))} r="2.5" fill="var(--accent)" />)}
          {[0, 6, 12, 18, 24].filter((h) => h <= (rows.at(-1)?.horizon ?? 0)).map((h) => <g key={h}><line x1={chart.x(h)} x2={chart.x(h)} y1={chart.height - chart.bottom} y2={chart.height - chart.bottom + 5} stroke="var(--muted)" /><text x={chart.x(h)} y={chart.height - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{h}</text></g>)}
          <text x={chart.left - 8} y={chart.y(chart.extent) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{chart.extent.toFixed(2)}</text><text x={chart.left - 8} y={chart.y(0) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">0</text><text x={chart.left - 8} y={chart.y(-chart.extent) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{(-chart.extent).toFixed(2)}</text>
        </svg>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]"><p>{model.country_shock_interpretation} · p={model.horizons[0].lag_order}, augmented order={model.horizons[0].lag_augmented_order} · N={model.horizons[0].effective_n}</p><button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold text-[var(--foreground)]" onClick={() => downloadCsv(rows, component, model.model_id, model.response_unit)}>下载当前响应表 CSV</button></div>
      <details className="advanced-disclosure mt-5"><summary>估计边界与可复现信息</summary><p className="mt-3 text-sm leading-7 text-[var(--muted)]">MP 与 CBI 同时进入回归；AIC 在共同预估样本上只选择一次 p∈1…6。主推断为 EHW/HC1 与正态临界值，不使用任意 HAC；区间是逐 horizon 点态区间，不是 simultaneous band。CBI 仅按 0.25 数值归一化，不能称为“25bp 紧缩”。非欧元国家结果解释为外部 ECB spillover。图中是注册的 JK 识别假设与 LP 规格下的估计动态响应，不是无条件历史效应。</p><p className="mt-2 font-mono text-xs text-[var(--muted)]">{model.model_id} · sample {model.sample_start}…{model.sample_end} ({model.effective_n} months) · max h={model.maximum_horizon} · engine {model.engine_version} · reference {model.lp_reference_repository}@{model.lp_reference_commit.slice(0, 12)}</p></details>
    </section>
  );
}
