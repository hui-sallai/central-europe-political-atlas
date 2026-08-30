"use client";

import { useEffect, useMemo, useState } from "react";
import type { Country } from "@/types/Country";
import type { MacroDriverDefinition, MacroDriverRuntimeRow } from "@/types/MacroDriver";

const roleLabels: Record<string, string> = {
  domestic_policy_driver: "国内政策驱动",
  domestic_financial_condition: "国内金融条件",
  domestic_price_outcome: "国内价格结果",
  external_common_driver: "共同外部驱动",
  regional_common_driver: "区域共同驱动",
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
  return `${value > 0 ? "+" : ""}${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}${suffix}`;
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

export function MacroDriverWorkbench({ countries, compact = false }: { countries: Country[]; compact?: boolean }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [records, setRecords] = useState<MacroDriverRuntimeRow[]>([]);
  const [dictionary, setDictionary] = useState<MacroDriverDefinition[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [driverId, setDriverId] = useState("policy_rate");
  const [area, setArea] = useState("hungary");
  const [transformation, setTransformation] = useState("level");

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
        ? `${country.name_zh} / ${country.name}${driverId === "policy_rate" && row[21] ? " · 欧洲央行共同政策利率" : ""}`
        : `${row[3]}（共同范围）`);
    }
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [countries, driverId, records]);
  const transformations = useMemo(() => [...new Set(records.filter((row) => row[1] === driverId).map((row) => row[7]))], [driverId, records]);

  const selectedArea = areas.some(([key]) => key === area) ? area : (areas[0]?.[0] ?? area);
  const selectedTransformation = transformations.includes(transformation) ? transformation : (transformations[0] ?? transformation);

  const allRows = useMemo(() => records
    .filter((row) => row[1] === driverId)
    .filter((row) => (row[2] ?? `scope:${row[3]}`) === selectedArea)
    .filter((row) => row[7] === selectedTransformation)
    .sort((a, b) => b[4].localeCompare(a[4])), [driverId, records, selectedArea, selectedTransformation]);
  const rows = allRows.filter((row) => row[5] !== null);
  const chartRows = [...rows].reverse().slice(-120);
  const values = chartRows.map((row) => row[5] as number);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;
  const points = chartRows.map((row, index) => `${20 + (index / Math.max(1, chartRows.length - 1)) * 660},${150 - (((row[5] as number) - min) / range) * 120}`).join(" ");
  const latest = rows[0] ?? null;
  const mom = selectedTransformation === "level" ? periodChange(rows, 1) : null;
  const yoy = selectedTransformation === "level" ? periodChange(rows, 12) : null;
  const warmupCount = allRows.filter((row) => row[15] === "warmup").length;
  const gapCount = allRows.filter((row) => row[15] === "gap_blocked").length;
  const regimeCount = allRows.filter((row) => row[15] === "regime_blocked" || row[15] === "definition_blocked").length;
  const sharedSeries = Boolean(latest?.[21]);

  return (
    <section className={compact ? "mt-5" : "editorial-panel mt-6 p-5"}>
      {!compact ? <><p className="editorial-kicker">Macro Drivers · descriptive data layer</p><h2 className="mt-2 text-2xl font-semibold">宏观驱动工作台</h2><p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]">浏览国内政策、金融条件、国内价格结果与共同外部驱动。这里不输出风险分数、因果效应、预测或冲击响应。</p></> : null}
      <div className="mt-5 grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-3">
        <label className="text-xs font-semibold text-[var(--muted)]">驱动指标<select className="field-control mt-2" value={driverId} onChange={(event) => setDriverId(event.target.value)}>{dictionary.map((item) => <option key={item.driver_id} value={item.driver_id}>{item.name_zh} / {item.name_en}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">国家 / 范围<select className="field-control mt-2" value={selectedArea} onChange={(event) => setArea(event.target.value)}>{areas.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">转换<select className="field-control mt-2" value={selectedTransformation} onChange={(event) => setTransformation(event.target.value)}>{transformations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      {loadState === "loading" ? <p className="py-10 text-center text-sm text-[var(--muted)]">正在加载宏观驱动数据…</p> : null}
      {loadState === "error" ? <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">宏观驱动数据暂时无法加载。</p> : null}
      {loadState === "ready" && latest ? <>
        <dl className="mt-5 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {[["最新时期", latest[4]], ["最新值", `${latest[5]?.toLocaleString("zh-CN", { maximumFractionDigits: 3 })} ${latest[6]}`], ["环比", selectedTransformation === "level" ? signed(mom, "%") : "当前转换已是变动值"], ["同比", selectedTransformation === "level" ? signed(yoy, "%") : "当前转换已是变动值"]].map(([label, value]) => <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 text-sm font-semibold">{value}</dd></div>)}
        </dl>
        <svg viewBox="0 0 700 180" className="mt-5 w-full" role="img" aria-label={`${definition?.name_zh ?? driverId}月度序列`}><line x1="20" y1="150" x2="680" y2="150" stroke="var(--line)"/><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2"/><text x="20" y="170" fontSize="10" fill="var(--muted)">{chartRows[0]?.[4]}</text><text x="680" y="170" textAnchor="end" fontSize="10" fill="var(--muted)">{chartRows.at(-1)?.[4]}</text><text x="20" y="15" fontSize="10" fill="var(--muted)">{max.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</text><text x="20" y="145" fontSize="10" fill="var(--muted)">{min.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</text></svg>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-semibold text-[var(--muted)]">定义与解释</p><p className="mt-2 text-sm leading-7">{definition?.economic_interpretation}</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{definition?.limitations}</p></div><div><p className="text-xs font-semibold text-[var(--muted)]">来源与识别状态</p><p className="mt-2 text-sm"><a href={latest[10]} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{latest[9]}</a></p><p className="mt-2 text-xs text-[var(--muted)]">角色：{roleLabels[latest[8]] ?? latest[8]} · 识别：{identificationLabels[latest[11]] ?? latest[11]} · {latest[13]}</p></div></div>
        <p className="mt-4 border-l-2 border-[var(--line)] pl-4 text-xs leading-6 text-[var(--muted)]">时间完整性：有效观测 {rows.length}；变换预热 {warmupCount}；源序列缺口阻断 {gapCount}；制度或定义切换排除 {regimeCount}。{warmupCount ? "预热期是计算窗口要求，不是原始数据缺失。" : ""}{sharedSeries ? ` 当前为共同序列（${latest[18]}），适用于多个国家但不是统计独立冲击。` : ""}</p>
        {driverId === "policy_rate" && selectedArea === "croatia" ? <p className="mt-3 border-l-2 border-[var(--accent)] pl-4 text-xs leading-6 text-[var(--muted)]">克罗地亚政策制度：2015–2022 为克罗地亚国家货币政策制度；2023 年起为 ECB 共同政策制度。2023-01 的跨制度月度变化被排除。</p> : null}
        {compact ? <div className="data-table-desktop wide-table-scroll mt-5 max-h-[520px] overflow-y-auto"><table className="research-data-table w-full min-w-[1120px] text-left text-sm"><thead><tr>{["驱动指标", "国家 / 范围", "时期", "值", "单位", "角色", "来源", "识别状态", "时间 / 制度状态"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{allRows.map((row) => <tr key={row[0]}><td className="px-3 py-2 font-semibold">{definition?.name_zh ?? row[1]}<span className="mt-1 block font-mono text-[10px] font-normal text-[var(--muted)]">{row[1]} · {row[7]}</span></td><td className="px-3 py-2">{countries.find((item) => item.slug === row[2])?.name_zh ?? row[3]}{row[21] ? <span className="mt-1 block text-[10px] text-[var(--muted)]">共同序列，不构成独立国家冲击</span> : null}</td><td className="metric-number px-3 py-2">{row[4]}</td><td className="metric-number px-3 py-2 font-semibold">{row[5] === null ? "—" : row[5].toLocaleString("zh-CN", { maximumFractionDigits: 3 })}</td><td className="px-3 py-2">{row[6]}</td><td className="px-3 py-2">{roleLabels[row[8]] ?? row[8]}</td><td className="px-3 py-2"><a href={row[10]} target="_blank" rel="noreferrer" className="text-[var(--accent)]">{row[9]}</a></td><td className="px-3 py-2">{identificationLabels[row[11]] ?? row[11]}</td><td className="px-3 py-2">{row[15] === "warmup" ? "变换预热" : row[15] === "gap_blocked" ? "源序列缺口" : row[15] === "regime_blocked" ? "制度切换排除" : row[15] === "definition_blocked" ? "定义切换排除" : "连续 / 可用"}{row[16] ? <span className="mt-1 block text-[10px] text-[var(--muted)]">{row[16]}</span> : null}</td></tr>)}</tbody></table></div> : null}
      </> : null}
    </section>
  );
}
