"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getResearchIndicator, getResearchProject, researchCountries, researchEvents } from "@/lib/researchData";
import type { Event, EventType } from "@/types/researchData";

type CountryFilter = "all" | string;
type EventTypeFilter = "all" | EventType;

const eventTypeLabels: Record<EventType, string> = {
  fiscal: "财政",
  EU_funds: "欧盟资金",
  macro: "宏观经济",
  energy: "能源",
  industrial_policy: "产业政策",
  FDI: "外商直接投资",
  China: "对华关系",
  election: "选举",
  regional: "区域合作",
};

const directionLabels: Record<Event["direction"], string> = {
  positive: "正向",
  negative: "负向",
  mixed: "混合",
  neutral: "中性",
  pending: "待编码",
};

const confidenceLabels: Record<Event["confidence"], string> = {
  high: "高",
  medium: "中",
  low: "低",
  pending: "待编码",
};

function EventCard({ item }: { item: Event }) {
  const topics = [...new Set([item.topic, ...item.affected_indicator.map((id) => getResearchIndicator(id)?.name_zh ?? id)])];
  return (
    <article id={item.id} className="scroll-mt-24 border-t border-[var(--line)] py-5 first:border-t-0">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <div>
          <p className="metric-number text-xs text-[var(--muted)]">{item.date}</p>
          <p className="mt-2 text-sm font-semibold">{item.country_name}</p>
          <p className="mt-1 text-xs text-[var(--accent)]">{eventTypeLabels[item.event_type]}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-7">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {topics.filter(Boolean).map((topic) => <span key={topic} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{topic}</span>)}
            {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold text-[var(--accent)] hover:underline">{item.source_name} ↗</a> : <span className="ml-auto text-xs text-[var(--muted)]">{item.source_name}</span>}
          </div>
          <details className="advanced-disclosure mt-4">
            <summary>研究字段</summary>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Actor", item.actor],
                ["Direction", directionLabels[item.direction]],
                ["Confidence", confidenceLabels[item.confidence]],
                ["Affected indicators", item.affected_indicator.map((id) => getResearchIndicator(id)?.name_zh ?? id).join(" / ") || "待编码"],
              ].map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold leading-6">{value}</dd></div>)}
            </dl>
            {item.related_project_ids.length ? <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Related projects</span>{item.related_project_ids.map((id) => <Link key={id} href={`/data?country=${item.country_slug}`} className="text-xs font-semibold text-[var(--accent)]">{getResearchProject(id)?.name ?? id}</Link>)}</div> : null}
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">方向与置信度是研究编码，不是预测或因果判断。完整 raw record 可在 research data package 中下载。</p>
          </details>
        </div>
      </div>
    </article>
  );
}

export function NewsExplorer() {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const country = params.get("country");
      const type = params.get("type") as EventType | null;
      if (country && researchCountries.some((item) => item.slug === country)) setCountryFilter(country);
      if (type && Object.prototype.hasOwnProperty.call(eventTypeLabels, type)) setEventTypeFilter(type);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateFilter(kind: "country" | "type", value: string) {
    if (kind === "country") setCountryFilter(value);
    else setEventTypeFilter(value as EventTypeFilter);
    setVisibleCount(30);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete(kind);
    else url.searchParams.set(kind, value);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const eventTypes = Object.keys(eventTypeLabels) as EventType[];
  const verifiedItems = useMemo(() => researchEvents
    .filter((item) => item.data_status === "verified")
    .filter((item) => countryFilter === "all" || item.country_slug === countryFilter)
    .filter((item) => eventTypeFilter === "all" || item.event_type === eventTypeFilter)
    .sort((a, b) => b.date.localeCompare(a.date)), [countryFilter, eventTypeFilter]);
  const sampleCount = researchEvents.filter((item) => item.data_status === "sample").length;

  return (
    <section className="mt-7 grid gap-8 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit border-t border-[var(--line)] pt-5 lg:sticky lg:top-20">
        <p className="editorial-kicker">Filters</p>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">Country
          <select className="field-control mt-2" value={countryFilter} onChange={(event) => updateFilter("country", event.target.value)}><option value="all">全部国家</option>{researchCountries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh}</option>)}</select>
        </label>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">Event type
          <select className="field-control mt-2" value={eventTypeFilter} onChange={(event) => updateFilter("type", event.target.value)}><option value="all">全部类型</option>{eventTypes.map((type) => <option key={type} value={type}>{eventTypeLabels[type]}</option>)}</select>
        </label>
        <dl className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
          <div className="flex justify-between py-3"><dt className="text-[var(--muted)]">当前结果</dt><dd className="metric-number font-semibold">{verifiedItems.length}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-[var(--muted)]">结构样例</dt><dd className="metric-number font-semibold">{sampleCount}</dd></div>
        </dl>
        <a href="/research-data/events.json" className="mt-5 inline-flex text-sm font-semibold text-[var(--accent)]">Download raw events</a>
      </aside>

      <div>
        <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4"><div><p className="editorial-kicker">Event Records</p><h2 className="mt-2 text-2xl font-semibold">正式事件</h2></div><p className="text-xs text-[var(--muted)]">按日期倒序</p></div>
        <div>{verifiedItems.slice(0, visibleCount).map((item) => <EventCard key={item.id} item={item} />)}</div>
        {visibleCount < verifiedItems.length ? <button type="button" className="mt-5 w-full border-y border-[var(--line)] py-3 text-sm font-semibold text-[var(--accent)]" onClick={() => setVisibleCount((count) => count + 30)}>加载更多事件</button> : null}
        {!verifiedItems.length ? <p className="py-10 text-center text-sm text-[var(--muted)]">当前筛选条件没有正式事件。</p> : null}
        {sampleCount ? <details className="advanced-disclosure mt-8"><summary>结构样例记录（默认隐藏，不进入分析）</summary><p className="mt-3 text-sm leading-6 text-[var(--muted)]">结构样例只保留在原始数据导出中，不进入公开事件流、模型或情景分数。</p></details> : null}
      </div>
    </section>
  );
}
