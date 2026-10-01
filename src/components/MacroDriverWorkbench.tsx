"use client";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";

import { ResearchTimeSeriesChart } from "@/components/ResearchTimeSeriesChart";
import { useEffect, useMemo, useState } from "react";
import type { Country } from "@/types/Country";
import type { MacroDriverDefinition, MacroDriverRuntimeRow } from "@/types/MacroDriver";
import { monthlyHistoryFor, useMonthlyHistory } from "@/components/useMonthlyHistory";
import { formatNumber, formatWithUnit } from "@/lib/format";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl, sourceInstitution } from "@/lib/researchSnapshot";

const roleLabels: Record<string, string> = {
  domestic_policy_driver: "国内政策驱动",
  domestic_financial_condition: "国内金融条件",
  domestic_price_outcome: "国内价格结果",
  external_common_driver: "共同外部驱动",
  regional_common_driver: "区域共同驱动",
};

const transformationLabels: Record<string, string> = {
  level: "水平值",
  monthly_log_change: "月度对数变化",
  "12m_log_change": "12 个月对数变化",
  yoy_rate: "同比率",
  monthly_change_bp: "月度变化（基点）",
};

const identificationLabels: Record<string, string> = {
  observed_driver: "已观察驱动",
  shock_candidate: "冲击候选",
  external_innovation_proxy: "外部创新代理",
  identified_shock: "已识别冲击",
  blocked: "未满足识别条件",
};

function signed(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "不可计算";
  return `${value > 0 ? "+" : ""}${formatNumber(value, { maximumFractionDigits: 2 })}${suffix}`;
}

function shiftPeriod(period: string, lag: number) {
  const [year, month] = period.split("-").map(Number);
  const ordinal = year * 12 + month - 1 - lag;
  return `${Math.floor(ordinal / 12)}-${String((ordinal % 12) + 1).padStart(2, "0")}`;
}

function periodChange(rows: MacroDriverRuntimeRow[], lag: number) {
  const previousRow = rows.find((row) => row[4] === shiftPeriod(rows[0]?.[4] ?? "0000-01", lag));
  if (!rows.length || rows[0][5] === null || !previousRow || previousRow[5] === null) return null;
  const current = rows[0][5] as number;
  const previous = previousRow[5] as number;
  if (previous === 0) return null;
  return ((current / previous) - 1) * 100;
}

export function MacroDriverWorkbench({ countries, compact = false, initialCountry }: { countries: Country[]; compact?: boolean; initialCountry?: string }) {
  const locale = useLocale();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [records, setRecords] = useState<MacroDriverRuntimeRow[]>([]);
  const [dictionary, setDictionary] = useState<MacroDriverDefinition[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [driverId, setDriverId] = useState("policy_rate");
  const [area, setArea] = useState(initialCountry ?? "hungary");
  const [transformation, setTransformation] = useState("level");
  const [includeHistory, setIncludeHistory] = useState(true);
  const monthlyHistory = useMonthlyHistory(basePath);
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("driver")) setDriverId(params.get("driver")!);
      if (params.get("area")) setArea(params.get("area")!);
      if (params.get("transformation")) setTransformation(params.get("transformation")!);
      if (params.get("history") === "0") setIncludeHistory(false);
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${basePath}/research-data/macro_driver_runtime.json`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status)))),
      fetch(`${basePath}/research-data/macro_driver_dictionary.json`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status)))),
    ]).then(([runtime, definitions]: [{ records: MacroDriverRuntimeRow[] }, { records: MacroDriverDefinition[] }]) => {
      setRecords(runtime.records);
      setDictionary(definitions.records);
      setLoadState("ready");
    }).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLoadState("error");
    });
    return () => controller.abort();
  }, [basePath]);

  const definition = dictionary.find((item) => item.driver_id === driverId) ?? null;
  const areas = useMemo(() => {
    const values = new Map<string, string>();
    for (const row of records.filter((item) => item[1] === driverId)) {
      const key = row[2] ?? `scope:${row[3]}`;
      const country = countries.find((item) => item.slug === row[2]);
      values.set(key, country
        ? `${locale === "en" ? country.name : `${country.name_zh} / ${country.name}`}${driverId === "policy_rate" && row[21] ? " · 欧洲央行共同政策利率" : ""}`
        : `${row[3]}（共同范围）`);
    }
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [countries, driverId, records, locale]);
  const transformations = useMemo(() => [...new Set(records.filter((row) => row[1] === driverId).map((row) => row[7]))], [driverId, records]);

  const selectedArea = areas.some(([key]) => key === area) ? area : (areas[0]?.[0] ?? area);
  const selectedTransformation = transformations.includes(transformation) ? transformation : (transformations[0] ?? transformation);
  useEffect(() => {
    if (!urlReady || loadState !== "ready") return;
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries({ ...(compact ? { tab: "macro_drivers" } : {}), driver: driverId, area: selectedArea, transformation: selectedTransformation, history: includeHistory ? "1" : "0" })) url.searchParams.set(key, value);
    window.history.replaceState(null, "", url);
  }, [urlReady, loadState, compact, driverId, selectedArea, selectedTransformation, includeHistory]);

  const allRows = useMemo(() => records
    .filter((row) => row[1] === driverId)
    .filter((row) => (row[2] ?? `scope:${row[3]}`) === selectedArea)
    .filter((row) => row[7] === selectedTransformation)
    .sort((a, b) => b[4].localeCompare(a[4])), [driverId, records, selectedArea, selectedTransformation]);
  const rows = allRows.filter((row) => row[5] !== null);
  const chartPoints = [...allRows].reverse().map((row) => ({ x: row[4], y: row[5] }));
  // Phase H descriptive history exists only for level series; the frozen 2015+ rows above stay the model inputs.
  const historyPoints = selectedTransformation === "level" ? monthlyHistoryFor(monthlyHistory.data, driverId, selectedArea.replace(/^scope:/, "")) : [];
  const shownHistory = includeHistory ? historyPoints : [];
  const chartUnit = allRows[0]?.[6] ?? "";
  const latest = rows[0] ?? null;
  const mom = selectedTransformation === "level" ? periodChange(rows, 1) : null;
  const yoy = selectedTransformation === "level" ? periodChange(rows, 12) : null;
  const warmupCount = allRows.filter((row) => row[15] === "warmup").length;
  const gapCount = allRows.filter((row) => row[15] === "gap_blocked").length;
  const regimeCount = allRows.filter((row) => row[15] === "regime_blocked" || row[15] === "definition_blocked").length;
  const sharedSeries = Boolean(latest?.[21]);

  return (
    <LocalizedContent>{<section className={compact ? "mt-5" : "editorial-panel mt-6 p-5"} data-snapshot-scope="macro-drivers">
      {!compact ? <><p className="editorial-kicker">Macro Drivers · descriptive data layer</p><h2 className="mt-2 text-2xl font-semibold">宏观驱动工作台</h2><p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">浏览国内政策、金融条件、国内价格结果与共同外部驱动。这里不输出风险分数、因果效应、预测或冲击响应。</p></> : null}
      <div className="mt-5 grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-3">
        <label className="text-xs font-semibold text-[var(--muted)]">驱动指标<select className="field-control mt-2" value={driverId} onChange={(event) => setDriverId(event.target.value)}>{dictionary.map((item) => <option key={item.driver_id} value={item.driver_id}>{item.name_zh} / {item.name_en}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">国家 / 范围<select className="field-control mt-2" value={selectedArea} onChange={(event) => setArea(event.target.value)}>{areas.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">转换<select className="field-control mt-2" value={selectedTransformation} onChange={(event) => setTransformation(event.target.value)}>{transformations.map((item) => <option key={item} value={item}>{transformationLabels[item] ?? item}</option>)}</select></label>
      </div>
      {loadState === "loading" ? <p className="py-10 text-center text-sm text-[var(--muted)]">正在加载宏观驱动数据…</p> : null}
      {loadState === "error" ? <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">宏观驱动数据暂时无法加载。</p> : null}
      {loadState === "ready" ? <div className="mt-4"><ResearchSnapshotExport disabled={includeHistory && monthlyHistory.state === "loading"} chart create={() => ({
        title: `${definition?.name_zh ?? driverId} · ${selectedArea}`, view_type: "macro_drivers", page_path: window.location.pathname, shareable_view_url: currentSnapshotUrl(window.location.pathname), countries: [selectedArea], indicators: [driverId],
        filters: { driver: driverId, area: selectedArea, transformation: selectedTransformation, history: includeHistory, sort: "period_desc_formal_then_history" },
        limitations: [definition?.limitations ?? "", "共同序列保留适用范围与共享标记，不构成独立国家观测。"].filter(Boolean),
        rows: [
          ...allRows.map((row) => ({ id: row[0], country: row[2] ?? row[3], indicator: row[1], period: row[4], value: row[5], unit: row[6], layer: "formal_observation", status: row[15] ?? row[11], transformation: row[7], applicability_scope: row[19], shared_series: row[21], definition_version: row[12], availability_reason: row[16],
            source: { institution: sourceInstitution(row[9], row[10]), dataset: row[9], source_url: row[10], source_code: row[18], unit: row[6], definition: row[12], status: row[15] ?? "", source_layer: "formal_observation" } })),
          ...[...shownHistory].reverse().map((point) => ({ id: `hist:${driverId}:${selectedArea}:${point.period}`, country: selectedArea, indicator: driverId, period: point.period, value: point.value, unit: point.source.unit, layer: "historical_descriptive", status: point.status, transformation: "level",
            source: { institution: sourceInstitution(point.source.source, point.source.source_url), dataset: point.source.source, source_url: point.source.source_url, unit: point.source.unit, definition: point.source.definition, source_layer: "historical_descriptive" } })),
        ],
      })} /></div> : null}
      {loadState === "ready" && latest ? <>
        <dl className="mt-5 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {[["最新时期", latest[4]], ["最新值", formatWithUnit(latest[5], latest[6])], ["环比", selectedTransformation === "level" ? signed(mom, "%") : "当前转换已是变动值"], ["同比", selectedTransformation === "level" ? signed(yoy, "%") : "当前转换已是变动值"]].map(([label, value]) => <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 text-sm font-semibold">{value}</dd></div>)}
        </dl>
        {historyPoints.length ? <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" data-history-layer="macro"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={includeHistory} onChange={(event) => setIncludeHistory(event.target.checked)} /> 包含历史描述性数据（{historyPoints[0].period} – {historyPoints.at(-1)!.period}，{historyPoints.length} 个月）</label><span className="text-xs text-[var(--muted)]">历史段仅供描述研究，从定义一致的官方起点开始；正式模型样本仍为 2015 年起的冻结序列。</span></div> : selectedTransformation === "level" && monthlyHistory.state === "ready" ? <p className="mt-5 text-xs text-[var(--muted)]">该序列暂无安全的历史描述性回填（定义断点或制度切换需方法复核）。</p> : null}
        <div className="mt-5"><ResearchTimeSeriesChart title={`${definition?.name_zh ?? driverId}：${areas.find(([key]) => key === selectedArea)?.[1] ?? selectedArea} 月度序列（${transformationLabels[selectedTransformation] ?? selectedTransformation}）`} series={[{ id: "driver", label: `${definition?.name_zh ?? driverId} · ${areas.find(([key]) => key === selectedArea)?.[1] ?? selectedArea}（正式观测）`, color: "var(--accent)", points: chartPoints }, ...(shownHistory.length ? [{ id: "history", label: "历史描述性（2000 起，不进入模型）", color: "var(--chart-muted)", dash: "6 4", points: shownHistory.map((point) => ({ x: point.period, y: point.value })) }] : [])]} xKind="month" xLabel="月份" yLabel={`${chartUnit}${chartUnit ? " · " : ""}${transformationLabels[selectedTransformation] ?? selectedTransformation}`} latestMarker height={290} /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-semibold text-[var(--muted)]">定义与解释</p><p className="mt-2 text-sm leading-7">{definition?.economic_interpretation}</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{definition?.limitations}</p></div><div><p className="text-xs font-semibold text-[var(--muted)]">来源与识别状态</p><p className="mt-2 text-sm"><a href={latest[10]} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{latest[9]}</a></p><p className="mt-2 text-xs text-[var(--muted)]">角色：{roleLabels[latest[8]] ?? latest[8]} · 识别：{identificationLabels[latest[11]] ?? latest[11]} · {latest[13]}</p></div></div>
        <p className="mt-4 border-l-2 border-[var(--line)] pl-4 text-xs leading-6 text-[var(--muted)]">时间完整性：有效观测 {rows.length}；变换预热 {warmupCount}；源序列缺口阻断 {gapCount}；制度或定义切换排除 {regimeCount}。{warmupCount ? "预热期是计算窗口要求，不是原始数据缺失。" : ""}{sharedSeries ? ` 当前为共同序列（${latest[18]}），适用于多个国家但不是统计独立冲击。` : ""}</p>
        {driverId === "policy_rate" && selectedArea === "croatia" ? <p className="mt-3 border-l-2 border-[var(--accent)] pl-4 text-xs leading-6 text-[var(--muted)]">克罗地亚政策制度：2015–2022 为克罗地亚国家货币政策制度；2023 年起为 ECB 共同政策制度。2023-01 的跨制度月度变化被排除。</p> : null}
        {compact ? <div className="data-table-desktop data-table-viewport mt-5" tabIndex={0} role="region" aria-label="宏观驱动观测表（可滚动）"><table className="research-data-table w-full min-w-[1120px] text-left text-sm"><thead><tr>{["驱动指标", "国家 / 范围", "时期", "值", "单位", "角色", "来源", "识别状态", "时间 / 制度状态"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{allRows.map((row) => <tr key={row[0]}><td className="px-3 py-2 font-semibold">{definition?.name_zh ?? row[1]}<span className="mt-1 block font-mono text-[10px] font-normal text-[var(--muted)]">{row[1]} · {row[7]}</span></td><td className="px-3 py-2">{countries.find((item) => item.slug === row[2])?.name_zh ?? row[3]}{row[21] ? <span className="mt-1 block text-[10px] text-[var(--muted)]">共同序列，不构成独立国家冲击</span> : null}</td><td className="metric-number px-3 py-2">{row[4]}</td><td className="metric-number px-3 py-2 font-semibold">{row[5] === null ? "—" : row[5].toLocaleString("zh-CN", { maximumFractionDigits: 3 })}</td><td className="px-3 py-2">{row[6]}</td><td className="px-3 py-2">{roleLabels[row[8]] ?? row[8]}</td><td className="px-3 py-2"><a href={row[10]} target="_blank" rel="noreferrer" className="text-[var(--accent)]">{row[9]}</a></td><td className="px-3 py-2">{identificationLabels[row[11]] ?? row[11]}</td><td className="px-3 py-2">{row[15] === "warmup" ? "变换预热" : row[15] === "gap_blocked" ? "源序列缺口" : row[15] === "regime_blocked" ? "制度切换排除" : row[15] === "definition_blocked" ? "定义切换排除" : "连续 / 可用"}{row[16] ? <span className="mt-1 block text-[10px] text-[var(--muted)]">{row[16]}</span> : null}</td></tr>)}{[...shownHistory].reverse().map((point) => <tr key={`hist-${point.period}`} data-layer="history"><td className="px-3 py-2 font-semibold">{definition?.name_zh ?? driverId}<span className="mt-1 block font-mono text-[10px] font-normal text-[var(--muted)]">{driverId} · level</span></td><td className="px-3 py-2">{areas.find(([key]) => key === selectedArea)?.[1] ?? selectedArea}</td><td className="metric-number px-3 py-2">{point.period}</td><td className="metric-number px-3 py-2 font-semibold">{point.value.toLocaleString("zh-CN", { maximumFractionDigits: 3 })}</td><td className="px-3 py-2">{point.source.unit}</td><td className="px-3 py-2"><span className="inline-block rounded-full border border-dashed border-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">历史描述性</span></td><td className="px-3 py-2"><a href={point.source.source_url} target="_blank" rel="noreferrer" className="text-[var(--accent)]">{point.source.source}</a></td><td className="px-3 py-2">不进入模型</td><td className="px-3 py-2">定义一致起点 {point.source.definition_compatible_floor}</td></tr>)}</tbody></table></div> : null}
        {compact && allRows.length ? <div className="data-card-mobile mt-5 grid gap-3">{allRows.slice(0, 120).map((row) => <article key={row[0]} className="editorial-panel p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{definition?.name_zh ?? row[1]}</h3><p className="mt-1 text-xs text-[var(--muted)]">{row[4]} · {row[6]}</p></div><p className="metric-number font-semibold text-[var(--accent)]">{row[5] === null ? "—" : row[5].toLocaleString("zh-CN", { maximumFractionDigits: 3 })}</p></div><p className="mt-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">{countries.find((item) => item.slug === row[2])?.name_zh ?? row[3]} · {row[9]}</p></article>)}{allRows.length > 120 ? <p className="text-xs text-[var(--muted)]">移动端显示最近 120 条；完整 {allRows.length} 条请下载数据。</p> : null}</div> : null}
      </> : null}
    </section>}</LocalizedContent>
  );
}
