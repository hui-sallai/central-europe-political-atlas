"use client";

import { useState } from "react";
import { compareSeries, isPublished, type CompareMode } from "@/lib/freshnessCore";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Observation } from "@/types/Observation";
import type { Indicator } from "@/types/Indicator";

const colors = ["#a6453c", "#246a87", "#64803c", "#8753a1", "#b06d20", "#287e71", "#b34579", "#555f9a", "#756047", "#53656b"];
export function AnnualComparisonWorkbench({ countries, indicators, observations }: { countries: { slug: string; name: string; name_zh: string }[]; indicators: Indicator[]; observations: Observation[] }) {
  const en = useLocale() === "en";
  const [selected, setSelected] = useState(countries.slice(0, 3).map(c => c.slug));
  const [indicatorId, setIndicatorId] = useState("real_gdp_growth");
  const [mode, setMode] = useState<CompareMode>("latest_common");
  const [year, setYear] = useState("");
  const indicator = indicators.find(i => i.id === indicatorId);
  const title = en ? indicator?.name : indicator?.name_zh;
  const series = Object.fromEntries(selected.map(slug => [slug, observations.filter(o => o.country_slug === slug && o.indicator === indicatorId).map(o => ({ ...o, comparable: o.comparability_status !== "definition_mismatch" && o.applicability_status !== "not_applicable" }))]));
  const years = [...new Set(Object.values(series).flatMap(s => s.map(p => p.year)))].sort((a, b) => b - a);
  const result = compareSeries(Object.fromEntries(Object.entries(series).map(([slug, points]) => [slug, year ? points.filter(p => p.year === Number(year)) : points])), mode);
  const units = [...new Set(Object.values(series).flatMap(s => s.filter(p => isPublished(p) && p.comparable).map(p => p.unit)))];
  const name = (slug: string) => { const c = countries.find(c => c.slug === slug); return (en ? c?.name : c?.name_zh) ?? slug; };
  return <section className="editorial-panel mt-6 p-5" aria-label={en ? "Historical annual comparison" : "年度历史比较"}>
    <h2 className="text-2xl font-semibold">{en ? "Explore annual comparisons" : "交互式年度历史比较"}</h2>
    <p className="mt-2 text-sm text-[var(--muted)]">{en ? "Annual observations only. Monthly 2026 data and frozen model snapshots are separate. Gaps are never filled or interpolated." : "只读取年度观测；2026 月度数据和冻结模型快照分别展示。缺失不补零、不插值。"}</p>
    <fieldset className="my-4 flex flex-wrap gap-3"><legend>{en ? "Countries" : "选择国家"}</legend>{countries.map(c => <label key={c.slug} className="text-sm"><input type="checkbox" checked={selected.includes(c.slug)} onChange={() => setSelected(s => s.includes(c.slug) ? s.filter(x => x !== c.slug) : [...s, c.slug])} /> {name(c.slug)}</label>)}</fieldset>
    <div className="grid gap-4 sm:grid-cols-3">
      <label>{en ? "Indicator" : "指标"}<select className="field-control mt-2" value={indicatorId} onChange={e => { setIndicatorId(e.target.value); setYear(""); }}>{indicators.map(i => <option key={i.id} value={i.id}>{en ? i.name : i.name_zh}</option>)}</select></label>
      <label>{en ? "Reference mode" : "年份口径"}<select className="field-control mt-2" value={mode} onChange={e => setMode(e.target.value as CompareMode)}><option value="latest_common">{en ? "Latest common year" : "最新共同年份"}</option><option value="latest_available">{en ? "Own latest published year" : "各国最新已发布年份"}</option></select></label>
      <label>{en ? "Historical year" : "历史年份"}<select className="field-control mt-2" value={year} onChange={e => setYear(e.target.value)}><option value="">{en ? "Automatic" : "按口径自动选择"}</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>
    </div>
    {result.periods_differ ? <p className="mt-4 text-sm text-[var(--warning)]">{en ? "Reference years differ: not a same-period comparison." : "参照年份不同：不属于同期比较。"}</p> : null}
    {result.units_differ ? <p role="alert">{en ? "Incompatible units: comparison withheld." : "单位不兼容：不展示并列数值。"}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selected.map(slug => {
      const cell = result.cells[slug];
      const requested = year ? series[slug].filter(p => p.year === Number(year)) : series[slug];
      const pending = requested.some(p => p.status === "pending");
      return <article className="rounded border border-[var(--line)] p-3" key={slug}><h3 className="font-semibold">{name(slug)}</h3><p className="metric-number mt-2">{cell.value === null ? "—" : cell.value.toLocaleString(en ? "en" : "zh-CN", { maximumFractionDigits: 3 })} {cell.unit ?? indicator?.unit}</p><p className="text-xs text-[var(--muted)]">{cell.year ?? (en ? "No comparable year" : "无可比年份")}</p>{cell.point ? <a className="text-xs underline" href={cell.point.source_url} target="_blank" rel="noreferrer">{cell.point.source_name}</a> : <p className="text-xs">{pending ? (en ? "Pending publication; no matched published observation" : "待发布；无匹配的已发布观测") : (en ? "Missing or no common comparable observation" : "缺失或无共同可比观测")}</p>}</article>;
    })}</div>
    {units.length === 1 ? <div className="mt-6"><ResearchTimeSeriesChart title={`${title} · ${en ? "Annual history" : "年度历史"}`} description={en ? "Published comparable annual observations. Gaps break the lines." : "可比的已发布年度观测；缺失处断线。"} xKind="number" xLabel={en ? "Year" : "年份"} yLabel={`${title} (${units[0]})`} formatX={v => String(Math.round(v))} series={selected.map((slug, index) => ({ id: slug, label: name(slug), color: colors[index % colors.length], dash: index % 2 ? "6 3" : undefined, markers: true, points: [...years].reverse().map(y => { const p = series[slug].find(p => p.year === y && isPublished(p) && p.comparable); return { x: y, y: p?.value ?? null }; }) }))} /><p className="mt-3 text-xs text-[var(--muted)]">{en ? "Sources" : "数据来源"}: {[...new Set(Object.values(series).flatMap(s => s.map(p => p.source_name)))].join(" · ")} · {years.at(-1) ?? "—"}–{years[0] ?? "—"}. {en ? "Descriptive observations, not causal estimates; no uncertainty intervals supplied." : "描述性观测，不是因果估计；数据未提供不确定性区间。"}</p></div> : <p className="mt-4">{en ? "Trend withheld: no single comparable unit." : "无单一可比单位，不绘制趋势。"}</p>}
  </section>;
}
