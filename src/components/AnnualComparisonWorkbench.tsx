"use client";

import { useEffect, useMemo, useState } from "react";
import { compareSeries, isPublished, type CompareMode } from "@/lib/freshnessCore";
import { annualPoints, annualDifference, annualCsv, defaultAnnualSession,restoreAnnualSession,annualSessionUrl,annualSessionEvidence,type AnnualSession, type AnnualHistory } from "@/lib/annualComparison";
import { NotebookCollect } from "./NotebookCollect";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeNumber } from "@/i18n/config";
import { englishText } from "@/i18n/reviewedText";
import type { Observation } from "@/types/Observation";
import type { Indicator } from "@/types/Indicator";

const colors = ["#a6453c", "#246a87", "#64803c", "#8753a1", "#b06d20", "#287e71", "#b34579", "#555f9a", "#756047", "#53656b"];
export function AnnualComparisonWorkbench({ countries, indicators, observations }: { countries: { slug: string; name: string; name_zh: string }[]; indicators: Indicator[]; observations: Observation[] }) {
  const en = useLocale() === "en";
  const [session,setSession]=useState(()=>defaultAnnualSession(countries.map(c=>c.slug))),[restored,setRestored]=useState(false),[copy,setCopy]=useState("");
  const {countries:selected,indicator:indicatorId,mode,year,range,from:start,to:end}=session;
  const update=(patch:Partial<AnnualSession>)=>{const keys=Object.keys(patch).map(k=>["from","to","range"].includes(k)?"range":k);setSession(s=>({...s,...patch,issues:s.issues.filter(i=>!keys.includes(i))}));setCopy("");};
  const setSelected=(fn:(s:string[])=>string[])=>setSession(s=>({...s,countries:fn(s.countries),issues:s.issues.filter(i=>i!=="countries")}));
  const setIndicatorId=(indicator:string)=>update({indicator}),setMode=(mode:CompareMode)=>update({mode}),setYear=(year:string)=>update({year}),setRange=(range:string)=>update({range}),setStart=(from:number)=>update({from}),setEnd=(to:number)=>update({to});
  const [history, setHistory] = useState<AnnualHistory | null>(null);
  const [historyState, setHistoryState] = useState("loading");
  useEffect(() => {
    const read=()=>{setSession(restoreAnnualSession(new URLSearchParams(window.location.search),countries.map(c=>c.slug),indicators.map(i=>i.id)));setRestored(true);setCopy("");};
    const timer=window.setTimeout(read,0);window.addEventListener("popstate",read);return()=>{window.clearTimeout(timer);window.removeEventListener("popstate",read);};
  }, [countries,indicators]);
  useEffect(()=>{if(!restored)return;const next=new URL(annualSessionUrl(session,en?"en":"zh-CN")),current=new URL(window.location.href);next.pathname=current.pathname;next.hash=current.hash;if(current.search!==next.search)window.history.replaceState(null,"",next.pathname+next.search+next.hash);},[session,restored,en]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/research-data/annual_history_runtime.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error("history"); return r.json(); }).then((data: AnnualHistory) => { setHistory(data); setHistoryState("ready"); }).catch(() => { if (!controller.signal.aborted) setHistoryState("error"); });
    return () => controller.abort();
  }, []);
  const indicator = indicators.find(i => i.id === indicatorId);
  const title = en ? indicator?.name : indicator?.name_zh;
  const points = useMemo(() => annualPoints(observations, history), [observations, history]);
  const series = Object.fromEntries(selected.map(slug => [slug, points.filter(o => o.country_slug === slug && o.indicator === indicatorId)]));
  const years = [...new Set(Object.values(series).flatMap(s => s.map(p => p.year)))].sort((a, b) => b - a);
  const units = [...new Set(Object.values(series).flatMap(s => s.filter(p => isPublished(p) && p.comparable).map(p => p.unit)))];
  const last = years[0] ?? 2025;
  const first = range === "custom" ? start : range === "all" ? (years.at(-1) ?? last) : range === "latest" ? last : last - Number(range) + 1;
  const until = range === "custom" ? end : last;
  const validRange=!session.issues.includes("range")&&Number.isInteger(first)&&Number.isInteger(until)&&first>=1000&&until<=9999&&first<=until&&until-first<200;
  const plotYears = validRange ? Array.from({ length: until - first + 1 }, (_, i) => first + i) : [];
  const exportPoints = validRange?Object.values(series).flat().filter(p => p.year >= first && p.year <= until):[];
  const result=compareSeries(Object.fromEntries(Object.entries(series).map(([slug,rows])=>[slug,year?rows.filter(p=>p.year===Number(year)):range==="custom"?(validRange?rows.filter(p=>p.year>=first&&p.year<=until):[]):rows])),mode);
  function exportCsv() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", annualCsv(exportPoints)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `annual-comparison-${indicatorId}-${first}-${until}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const unitLabel = (unit: string) => en ? englishText(unit) : unit;
  const statusLabel = (status: string) => ({ official: en ? "Official" : "官方", verified: en ? "Verified" : "已核验", pending: en ? "Pending publication" : "待发布", calculated: en ? "Calculated" : "计算值", derived: en ? "Derived" : "派生值", provisional: en ? "Provisional" : "暂定值", estimated: en ? "Estimated" : "估算值" })[status] ?? (en ? "Other published status" : "其他已发布状态");
  const number = (value: number) => localeNumber(value, en ? "en" : "zh-CN", { maximumFractionDigits: 3 });
  const name = (slug: string) => { const c = countries.find(c => c.slug === slug); return (en ? c?.name : c?.name_zh) ?? slug; };
  const collectible=restored&&!session.issues.length&&selected.length>=2&&selected.length<=5&&validRange&&units.length===1&&exportPoints.some(p=>p.comparable&&isPublished(p));
  async function share(){try{await navigator.clipboard.writeText(annualSessionUrl(session,en?"en":"zh-CN"));setCopy(en?"Research link copied.":"研究链接已复制。");}catch{setCopy(en?"Copy failed; use the research link below.":"复制失败，请使用下方研究链接。");}}
  return <section className="editorial-panel mt-6 p-5" aria-label={en ? "Historical annual comparison" : "年度历史比较"}>
    <h2 className="text-2xl font-semibold">{en ? "Explore annual comparisons" : "交互式年度历史比较"}</h2>
    <p className="mt-2 text-sm text-[var(--muted)]">{en ? "Annual observations only. Monthly 2026 data and frozen model snapshots are separate. Gaps are never filled or interpolated." : "只读取年度观测；2026 月度数据和冻结模型快照分别展示。缺失不补零、不插值。"}</p>
    <p className="mt-2 text-sm">{en?"Macroeconomic context is a separate published-data layer, not a combined trade dataset or evidence that trade exposure caused economic changes. Links reopen current data, not frozen revisions.":"宏观经济背景是独立的已发布数据层，不是合并贸易数据集，也不能据此认为贸易暴露导致经济变化。链接重开当前数据，不冻结历史修订。"}</p>
    {session.issues.length?<p role="status" data-macro-url-warning>{en?"Invalid URL parameters; check the selections. Unavailable reference years are not replaced: ":"链接参数无效，请检查所选配置；不可用参照年份不自动替换："}{session.issues.map(i=>({countries:en?"countries":"国家",indicator:en?"indicator":"指标",mode:en?"reference mode":"年份口径",year:en?"reference year":"参照年份",range:en?"historical period":"历史期间"})[i]).join("、")}</p>:null}
    {restored?<div className="mt-3 flex flex-wrap items-center gap-3" data-macro-session><button type="button" onClick={()=>void share()} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">{en?"Copy macro research link":"复制宏观研究链接"}</button><a href={annualSessionUrl(session,en?"en":"zh-CN")} className="text-sm underline" data-macro-link>{en?"Open macro research link":"打开宏观研究链接"}</a><NotebookCollect disabled={!collectible} label={en?"Collect macro research view":"收藏宏观研究视图"} create={()=>annualSessionEvidence(session,exportPoints,en?"en":"zh-CN",first,until,Object.fromEntries(countries.map(c=>[c.slug,name(c.slug)])),title??indicatorId)}/><span role="status" data-macro-share-status>{copy}</span></div>:null}
    <fieldset className="my-4 flex flex-wrap gap-3"><legend>{en ? "Countries (2–5)" : "选择国家（2–5 国）"}</legend>{countries.map(c => <label key={c.slug} className="text-sm"><input type="checkbox" checked={selected.includes(c.slug)} disabled={selected.includes(c.slug) ? selected.length <= 2 : selected.length >= 5} onChange={() => setSelected(s => s.includes(c.slug) ? s.filter(x => x !== c.slug) : [...s, c.slug])} /> {name(c.slug)}</label>)}</fieldset>
    <div className="grid gap-4 sm:grid-cols-3">
      <label>{en ? "Indicator" : "指标"}<select className="field-control mt-2" value={indicatorId} onChange={e => setIndicatorId(e.target.value)}>{!indicator?<option value={indicatorId} disabled>{en?"Unavailable indicator":"不可用指标"}: {indicatorId}</option>:null}{indicators.map(i => <option key={i.id} value={i.id}>{en ? i.name : i.name_zh}</option>)}</select></label>
      <label>{en ? "Reference mode" : "年份口径"}<select className="field-control mt-2" value={mode} onChange={e => setMode(e.target.value as CompareMode)}><option value="latest_common">{en ? "Latest common year" : "最新共同年份"}</option><option value="latest_available">{en ? "Own latest published year" : "各国最新已发布年份"}</option></select></label>
      <label>{en ? "Historical year" : "历史年份"}<select className="field-control mt-2" value={year} onChange={e => setYear(e.target.value)}><option value="">{en ? "Automatic" : "按口径自动选择"}</option>{year&&!years.includes(Number(year))?<option value={year}>{year} · {en?"unavailable":"不可用"}</option>:null}{years.map(y => <option key={y}>{y}</option>)}</select></label>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><label>{en ? "Trend and export period" : "趋势与导出范围"}<select className="field-control mt-2" value={range} onChange={e => setRange(e.target.value)}>{[["latest", en ? "Latest year" : "最新年份"], ["5", en ? "Last 5 calendar years" : "最近 5 个日历年"], ["10", en ? "Last 10 calendar years" : "最近 10 个日历年"], ["all", en ? "All available history" : "全部可用历史"], ["custom", en ? "Custom" : "自定义"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{range === "custom" ? <><label>{en ? "From year" : "起始年"}<input className="field-control mt-2" type="number" min={1000} max={9999} value={start} onChange={e => setStart(Number(e.target.value))} /></label><label>{en ? "To year" : "结束年"}<input className="field-control mt-2" type="number" min={1000} max={9999} value={end} onChange={e => setEnd(Number(e.target.value))} /></label></> : null}</div>
    <p className="mt-3 text-xs text-[var(--muted)]">{historyState === "loading" ? (en ? "Loading descriptive history…" : "正在读取描述性历史…") : historyState === "error" ? (en ? "Historical backfill unavailable; snapshot observations remain usable." : "历史补充读取失败；快照仍可使用。") : (en ? "Descriptive backfill only; snapshot rows, including pending rows, take precedence." : "历史补充仅用于描述；快照优先，待发布记录也不会被覆盖。")}</p>
    <button className="mt-3 rounded border border-[var(--line)] px-4 py-2 text-sm" disabled={!exportPoints.length} onClick={exportCsv}>{en ? "Export actual observations (CSV)" : "导出实际观测（CSV）"}</button>
    <p className="mt-2 text-xs">{en ? "Export follows the trend period, not the headline year. Pending values stay blank; absent years are not invented." : "导出采用趋势范围，不采用标题卡年份；待发布保留空值，不生成缺失年份。"}</p>
    <p className="mt-2 text-xs" data-macro-reference>{year?(en?`Requested reference year: ${year}; unavailable observations are not replaced.`:`请求参照年份：${year}；不可用观测不自动替换。`):range==="custom"?(en?"Automatic reference years are checked within the requested historical period, independently of trade data.":"自动参照年份在请求的历史期间内核验，独立于贸易数据。"):en?"Automatic reference mode uses published annual observations.":"自动年份口径使用已发布年度观测。"}</p>
    {!validRange ? <p role="alert">{en ? "Enter a valid period of at most 200 calendar years; start must not exceed end." : "请输入最多200个日历年的有效期间，起始年不能晚于结束年。"}</p> : null}
    {result.periods_differ ? <p className="mt-4 text-sm text-[var(--warning)]">{en ? "Reference years differ: not a same-period comparison." : "参照年份不同：不属于同期比较。"}</p> : null}
    {result.units_differ ? <p role="alert">{en ? "Incompatible units: comparison withheld." : "单位不兼容：不展示并列数值。"}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selected.map(slug => {
      const cell = result.cells[slug];
      const requested = year ? series[slug].filter(p => p.year === Number(year)) : series[slug];
      const difference = annualDifference(result.cells[selected[0]]?.point ?? null, cell.point);
      const historyRows = series[slug].filter(p => p.year >= first && p.year <= until && isPublished(p) && p.comparable);
      const pending = !requested.some(isPublished)&&requested.some(p => p.status === "pending"),mismatch=requested.some(p=>!p.comparable);
      return <article className="rounded border border-[var(--line)] p-3" key={slug}><h3 className="font-semibold">{name(slug)}</h3><p className="metric-number mt-2">{cell.value === null ? "—" : number(cell.value)} {unitLabel(cell.unit ?? indicator?.unit ?? "")}</p><p className="text-xs text-[var(--muted)]">{cell.year ?? (en ? "No comparable year" : "无可比年份")}</p>{cell.point ? <><p className="text-xs">{statusLabel(cell.point.status ?? "")} · {cell.point.layer === "descriptive annual history" ? (en ? "Descriptive history" : "描述性历史") : (en ? "Published snapshot" : "已发布快照")}</p><a className="text-xs underline" href={cell.point.source_url} target="_blank" rel="noreferrer">{cell.point.source_name}</a></> : <p className="text-xs">{mismatch?(en?"Definition or applicability mismatch; comparison unavailable.":"定义或适用性不匹配，无法比较。"):pending ? (en ? "Pending publication; no matched published observation" : "待发布；无匹配的已发布观测") : (en ? "Missing or no common comparable observation" : "缺失或无共同可比观测")}</p>}{slug !== selected[0] ? <p className="mt-3 text-xs">{en ? "Difference from" : "差值参照"} {name(selected[0])}: {difference ? `${number(difference.absolute)} ${cell.unit === "%" || cell.unit === "% GDP" ? (en ? "percentage points" : "个百分点") : unitLabel(cell.unit ?? "")}${difference.relative === null ? "" : ` (${number(difference.relative)}%)`}` : (en ? "Withheld: different year, unit or definition." : "不计算：年份、单位或定义不可比。")}</p> : <p className="mt-3 text-xs">{en ? "Difference reference country" : "差值参照国家"}</p>}<p className="mt-2 text-xs text-[var(--muted)]">{en ? "Published history within selected range" : "选定范围内已发布历史"}: {historyRows.length} / {plotYears.length} {en ? "years" : "年"}{historyRows.length ? ` · ${Math.min(...historyRows.map(p => p.year))}–${Math.max(...historyRows.map(p => p.year))}` : ""}</p></article>;
    })}</div>
    {units.length === 1 && validRange ? <div className="mt-6"><ResearchTimeSeriesChart title={`${title} · ${en ? "Annual history" : "年度历史"}`} description={en ? "Published comparable annual observations. Gaps break the lines. Tap or focus a point for source details." : "可比的已发布年度观测；缺失处断线。点击或聚焦观测点查看来源。"} xKind="number" xLabel={en ? "Year" : "年份"} yLabel={`${title} (${unitLabel(units[0])})`} interactive containerRole="group" xTickValues={plotYears.filter((_, i) => i % Math.max(1, Math.ceil(plotYears.length / 7)) === 0 || i === plotYears.length - 1)} formatX={v => String(v)} series={selected.map((slug, index) => ({ id: slug, label: name(slug), color: colors[index % colors.length], dash: index % 2 ? "6 3" : undefined, markers: true, points: plotYears.map(y => { const p = series[slug].find(p => p.year === y && isPublished(p) && p.comparable); return { x: y, y: p?.value ?? null, detail: p ? `${unitLabel(p.unit)} · ${p.source_name} · ${statusLabel(p.status ?? "")}` : undefined }; }) }))} /><p className="mt-3 text-xs text-[var(--muted)]">{en ? "Sources" : "数据来源"}: {[...new Set(Object.values(series).flatMap(s => s.map(p => p.source_name)))].join(" · ")} · {first}–{until}. {en ? "Descriptive observations, not causal estimates; no uncertainty intervals supplied." : "描述性观测，不是因果估计；数据未提供不确定性区间。"}</p></div> : <p className="mt-4">{en ? "Trend withheld: no single comparable unit or valid period." : "缺少单一可比单位或有效期间，不绘制趋势。"}</p>}
  </section>;
}
