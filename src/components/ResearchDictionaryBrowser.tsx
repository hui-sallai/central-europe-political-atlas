"use client";

import { useMemo, useState } from "react";
import { indicatorDictionaryRecords } from "@/lib/indicatorDictionary";
import { modelCards } from "@/lib/modelFramework";
import { regionIndicatorRecords } from "@/lib/regionIndicators";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { sourceDictionaryRows } from "@/lib/sourceDictionary";

export function ResearchDictionaryBrowser() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const indicators = useMemo(() => indicatorDictionaryRecords.filter((item) => !normalized || [item.indicatorId, item.nameZh, item.nameEn, item.category, item.unit].some((value) => String(value).toLowerCase().includes(normalized))), [normalized]);
  const sources = useMemo(() => sourceDictionaryRows.filter((item) => !normalized || [item.sourceId, item.nameZh, item.nameEn, item.sourceType, item.coverage].some((value) => value.toLowerCase().includes(normalized))), [normalized]);
  const spatialIds = new Set(regionIndicatorRecords.map((item) => item.region_indicator_id));

  return (
    <section className="card p-6">
      <p className="eyebrow">Research Dictionaries</p>
      <h2 className="mt-3 text-2xl font-semibold">指标与来源字典</h2>
      <label htmlFor="dictionary-search" className="mt-5 block text-sm font-semibold">搜索指标、ID、单位、来源或覆盖国家
        <input id="dictionary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal" placeholder="例如 inflation、财政、Eurostat" />
      </label>

      <div id="indicator-dictionary" className="mt-6 scroll-mt-24">
        <h3 className="text-lg font-semibold">Indicator Dictionary</h3>
        <div className="wide-table-scroll mt-3"><table className="research-data-table w-full min-w-[1180px] text-left text-xs"><thead><tr>{["Indicator", "Definition", "Unit", "Frequency", "Source preference", "Coverage", "Model usage", "Scenario usage", "Spatial availability"].map((item) => <th key={item} className="px-3 py-3">{item}</th>)}</tr></thead><tbody>{indicators.map((item) => {
          const modelUsage = modelCards.filter((card) => card.inputs.some((input) => input.indicator_id === item.indicatorId)).map((card) => card.model_id);
          const scenarioUsage = scenarioDefinitions.filter((scenario) => scenario.adjusted_indicator_id === item.indicatorId || scenario.direct_variables.includes(item.indicatorId)).map((scenario) => scenario.scenario_id);
          return <tr key={item.indicatorId}><td className="px-3 py-3"><strong>{item.nameZh}</strong><p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{item.indicatorId}</p></td><td className="min-w-72 px-3 py-3">{item.upwardMeaning}</td><td className="px-3 py-3">{item.unit}</td><td className="px-3 py-3">{item.frequency}</td><td className="min-w-64 px-3 py-3">{item.sourcePriority.join(" / ")}</td><td className="px-3 py-3">十国 / 按 QA</td><td className="px-3 py-3">{modelUsage.join(" / ") || item.modelUse}</td><td className="px-3 py-3">{scenarioUsage.join(" / ") || "未使用"}</td><td className="px-3 py-3">{spatialIds.has(item.indicatorId) ? "可用" : "国家级"}</td></tr>;
        })}</tbody></table></div>
        {!indicators.length ? <p className="mt-3 text-sm text-[var(--muted)]">没有匹配指标。</p> : null}
      </div>

      <div id="source-dictionary" className="mt-8 scroll-mt-24">
        <h3 className="text-lg font-semibold">Source Dictionary</h3>
        <div className="wide-table-scroll mt-3"><table className="research-data-table w-full min-w-[960px] text-left text-xs"><thead><tr>{["Source", "Reliability tier", "Dataset / coverage", "Countries", "Indicators", "Last reviewed"].map((item) => <th key={item} className="px-3 py-3">{item}</th>)}</tr></thead><tbody>{sources.map((item) => <tr key={item.sourceId}><td className="px-3 py-3"><a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{item.nameZh}</a><p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{item.sourceId}</p></td><td className="px-3 py-3">{item.reliabilityLevel}</td><td className="px-3 py-3">{item.sourceType}</td><td className="px-3 py-3">{item.coverage}</td><td className="min-w-64 px-3 py-3">{item.indicatorCoverage}</td><td className="px-3 py-3">{item.lastCheckedAt}</td></tr>)}</tbody></table></div>
        {!sources.length ? <p className="mt-3 text-sm text-[var(--muted)]">没有匹配来源。</p> : null}
      </div>
    </section>
  );
}
