"use client";

import { useEffect, useState } from "react";
import { ResearchTimeSeriesChart } from "@/components/ResearchTimeSeriesChart";
import { sorsSeriesLabels, useSerbiaSors } from "@/components/useSerbiaSors";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl } from "@/lib/researchSnapshot";

// Serbia-only monthly / quarterly official statistics (SORS). Shown separately from the frozen 2015+ HF series: none of
// these series enter any model, and the national CPI is never presented as HICP.
const quarterToMonth = (period: string) => period.replace(/-Q(\d)$/, (_, q: string) => `-${String(Number(q) * 3).padStart(2, "0")}`);

export function SerbiaSorsMonthlyPanel({ basePath }: { basePath: string }) {
  const sors = useSerbiaSors(basePath, true);
  const monthly = (sors.series ?? []).filter((item) => item.store === "monthly");
  const [key, setKey] = useState("industrial_production_index");
  useEffect(() => {
    const timer = window.setTimeout(() => { const requested = new URLSearchParams(window.location.search).get("sors_series"); if (requested) setKey(requested); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const selected = monthly.find((item) => item.key === key) ?? monthly[0];
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set("sors_series", selected.key);
    window.history.replaceState(null, "", url);
  }, [selected]);
  if (sors.state === "error") return <p className="mt-6 text-xs text-[var(--muted)]">塞尔维亚官方统计暂不可用。</p>;
  if (!selected) return <p className="mt-6 text-xs text-[var(--muted)]">正在加载塞尔维亚官方统计…</p>;
  const observed = selected.points.filter((point) => point[1] !== null);
  const quarterly = /-Q\d$/.test(selected.points[0]?.[0] ?? "");
  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6" data-sors-layer="monthly" data-snapshot-scope="sors-monthly">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="editorial-kicker">塞尔维亚官方统计（SORS）</p>
          <h3 className="mt-1 text-lg font-semibold">月度 / 季度描述性序列</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">来源：塞尔维亚共和国统计局（SORS）开放数据。仅作塞尔维亚描述，不进入 VAR、LP 或面板模型；国家 CPI 不等同于 HICP，上方 HICP 仍来自 Eurostat。</p>
        </div>
        <label className="text-xs font-semibold text-[var(--muted)]">序列
          <select className="field-control mt-2" value={selected.key} onChange={(event) => setKey(event.target.value)}>{monthly.map((item) => <option key={item.key} value={item.key}>{sorsSeriesLabels[item.key] ?? item.label}</option>)}</select>
        </label>
      </div>
      <div className="mt-4"><ResearchSnapshotExport chart disabled={!sors.snapshotReady} create={() => ({
        title: `塞尔维亚 · ${selected.label}`, view_type: "serbia_sors", page_path: "/data/", shareable_view_url: currentSnapshotUrl("/data/", { tab: "high_frequency", country: "serbia", sors_series: selected.key }), countries: ["serbia"], indicators: [selected.display_indicator], filters: { country: "serbia", sors_series: selected.key, sort: "period_desc", frequency: quarterly ? "quarterly" : "monthly" }, comparability_status: selected.cross_country_comparable ? "registered_comparable_within_segments" : "serbia_only_not_cross_country_comparable",
        limitations: ["SORS 原始单位与标准化单位分别保留；CPI 不等同于 HICP；断点状态不跨段拼接。", ...(quarterly ? ["CSV 保留原始季度标签；图形横轴将季度映射到季末月份，不是月度观测。"] : [])],
        rows: [...selected.points].reverse().map((point) => ({ id: `sors:${selected.key}:${point[0]}`, country: "serbia", indicator: selected.display_indicator, period: point[0], value: point[1], unit: selected.unit ?? "", original_value: point[2], original_unit: selected.original_unit, layer: "serbia_sors_descriptive", status: selected.status_legend[point[3]] ?? point[3], comparable_within_segment: point[4] === 1, cross_country_comparable: point[5] === 1, source: { institution: "Statistical Office of the Republic of Serbia (SORS/RZS)", dataset: selected.dataset, source_url: selected.source_url, source_code: selected.original_code, retrieved_at: selected.retrieved_at, unit: selected.unit ?? "", original_unit: selected.original_unit ?? "", status: selected.mapping_status, source_layer: "serbia_sors_descriptive" } })),
      })} /></div>
      {!sors.snapshotReady ? <p className="mt-2 text-xs text-[var(--muted)]">原始来源代码暂不可用，研究快照导出已停用；当前描述性数据仍可查看。</p> : null}
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ResearchTimeSeriesChart title={`塞尔维亚 · ${sorsSeriesLabels[selected.key] ?? selected.label}`} series={[{ id: "sors", label: "SORS 官方序列", color: "var(--chart-sors)", points: selected.points.map((point) => ({ x: quarterToMonth(point[0]), y: point[1] })) }]} xKind="month" xLabel={quarterly ? "季度（按季末月份绘制）" : "月份"} yLabel={selected.unit ?? ""} latestMarker legend={false} height={260} />
        <dl className="editorial-panel grid content-start gap-3 p-4 text-sm">
          <div><dt className="text-xs text-[var(--muted)]">覆盖范围</dt><dd className="metric-number font-semibold">{observed[0]?.[0] ?? "—"} → {observed.at(-1)?.[0] ?? "—"}</dd></div>
          <div><dt className="text-xs text-[var(--muted)]">观测数</dt><dd className="metric-number font-semibold">{observed.length}</dd></div>
          <div><dt className="text-xs text-[var(--muted)]">跨国可比</dt><dd className="font-semibold" data-cross-country={String(selected.cross_country_comparable)}>{selected.cross_country_comparable ? "是" : "否（仅作塞尔维亚描述）"}</dd></div>
          <div><dt className="text-xs text-[var(--muted)]">模型角色</dt><dd className="font-semibold">{selected.model_role === "formal_model_compatible_candidate" ? "候选（未授权进入任何模型）" : "仅描述"}</dd></div>
          <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] hover:underline">SORS 数据集 {selected.dataset}</a>
        </dl>
      </div>
      <div className="data-table-viewport mt-4" tabIndex={0} role="region" aria-label="塞尔维亚官方月度观测表（可滚动）">
        <table className="research-data-table w-full min-w-[560px] text-left text-sm">
          <thead><tr>{["时期", "数值", "单位", "SORS 状态"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
          <tbody>{[...selected.points].reverse().map((point) => <tr key={point[0]}><td className="metric-number px-3 py-2">{point[0]}</td><td className="metric-number px-3 py-2 font-semibold">{point[1] === null ? "—" : point[1].toLocaleString("zh-CN", { maximumFractionDigits: 3 })}</td><td className="px-3 py-2">{selected.unit}</td><td className="px-3 py-2">{selected.status_legend[point[3]] ?? point[3]}{point[4] ? "" : " · 序列断点前"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
