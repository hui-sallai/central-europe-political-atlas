"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getResearchIndicator, getResearchProject, researchCountries, researchEvents } from "@/lib/researchData";
import { eventWindowEligibility, suggestedOutcomes } from "@/lib/eventWindowEngine";
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
            {eventWindowEligibility(item).eligible ? (
              <Link
                href={`/models?tab=run&skill=event_analysis&country=${item.country_slug}&event=${item.event_id}&outcome=${suggestedOutcomes(item.event_type)[0]}`}
                className="rounded-full cta-dark px-3 py-1 text-xs font-semibold"
              >
                分析此事件
              </Link>
            ) : null}
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
            {item.related_project_ids.length ? <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-semibold text-[var(--muted)]">相关项目</span>{item.related_project_ids.map((id) => <Link key={id} href={`/data?country=${item.country_slug}`} className="text-xs font-semibold text-[var(--accent)]">{getResearchProject(id)?.name ?? id}</Link>)}</div> : null}
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">方向与置信度是研究编码，不是预测或因果判断。完整 raw record 可在 research data package 中下载。</p>
          </details>
        </div>
      </div>
    </article>
  );
}

const CSV_COLUMNS = ["id", "date", "country_slug", "country_name", "event_type", "topic", "title", "summary", "actor", "source_name", "source_url", "confidence", "coding_status"] as const;
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function NewsExplorer() {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [urlReady, setUrlReady] = useState(false);
  const topics = useMemo(() => [...new Set(researchEvents.filter((item) => item.data_status === "verified").map((item) => item.topic).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN")) as string[], []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const country = params.get("country");
      const type = params.get("type") as EventType | null;
      const topic = params.get("topic");
      const isDate = (value: string | null) => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (country && researchCountries.some((item) => item.slug === country)) setCountryFilter(country);
      if (type && Object.prototype.hasOwnProperty.call(eventTypeLabels, type)) setEventTypeFilter(type);
      if (topic && topics.includes(topic)) setTopicFilter(topic);
      if (params.get("q")) setQuery(params.get("q") ?? "");
      if (isDate(params.get("from"))) setDateFrom(params.get("from") ?? "");
      if (isDate(params.get("to"))) setDateTo(params.get("to") ?? "");
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [topics]);

  // Filters are mirrored into the URL (keeping any #event anchor) so a filtered view can be shared.
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (countryFilter !== "all") params.set("country", countryFilter);
    if (eventTypeFilter !== "all") params.set("type", eventTypeFilter);
    if (topicFilter !== "all") params.set("topic", topicFilter);
    if (query.trim()) params.set("q", query.trim());
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", next);
  }, [urlReady, countryFilter, eventTypeFilter, topicFilter, query, dateFrom, dateTo]);

  const eventTypes = Object.keys(eventTypeLabels) as EventType[];
  const verifiedItems = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return researchEvents
      .filter((item) => item.data_status === "verified")
      .filter((item) => countryFilter === "all" || item.country_slug === countryFilter)
      .filter((item) => eventTypeFilter === "all" || item.event_type === eventTypeFilter)
      .filter((item) => topicFilter === "all" || item.topic === topicFilter)
      .filter((item) => (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo))
      .filter((item) => { if (!terms.length) return true; const haystack = [item.title, item.summary, item.actor, item.source_name, item.topic, item.country_name].join(" ").toLowerCase(); return terms.every((term) => haystack.includes(term)); })
      .sort((a, b) => b.date.localeCompare(a.date) || a.event_id.localeCompare(b.event_id));
  }, [countryFilter, eventTypeFilter, topicFilter, query, dateFrom, dateTo]);
  const sampleCount = researchEvents.filter((item) => item.data_status === "sample").length;
  const filtered = countryFilter !== "all" || eventTypeFilter !== "all" || topicFilter !== "all" || Boolean(query.trim()) || Boolean(dateFrom) || Boolean(dateTo);
  const reset = (apply: () => void) => { apply(); setVisibleCount(30); };

  function exportCsv() {
    const rows = verifiedItems.map((item) => CSV_COLUMNS.map((column) => csvCell((item as unknown as Record<string, unknown>)[column])).join(","));
    const url = URL.createObjectURL(new Blob([`﻿${[CSV_COLUMNS.join(","), ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `events-${countryFilter}-${eventTypeFilter}-${topicFilter}${dateFrom ? `-from-${dateFrom}` : ""}${dateTo ? `-to-${dateTo}` : ""}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-7 grid gap-8 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit border-t border-[var(--line)] pt-5 lg:sticky lg:top-20">
        <p className="editorial-kicker">Filters</p>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">关键词
          <input className="field-control mt-2" type="search" value={query} onChange={(event) => reset(() => setQuery(event.target.value))} placeholder="标题、摘要、主体或来源" />
        </label>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">Country
          <select className="field-control mt-2" value={countryFilter} onChange={(event) => reset(() => setCountryFilter(event.target.value))}><option value="all">全部国家</option>{researchCountries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh}</option>)}</select>
        </label>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">Event type
          <select className="field-control mt-2" value={eventTypeFilter} onChange={(event) => reset(() => setEventTypeFilter(event.target.value as EventTypeFilter))}><option value="all">全部类型</option>{eventTypes.map((type) => <option key={type} value={type}>{eventTypeLabels[type]}</option>)}</select>
        </label>
        <label className="mt-4 block text-xs font-semibold text-[var(--muted)]">主题
          <select className="field-control mt-2" value={topicFilter} onChange={(event) => reset(() => setTopicFilter(event.target.value))}><option value="all">全部主题</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[var(--muted)]">起始日期
            <input className="field-control mt-2" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => reset(() => setDateFrom(event.target.value))} />
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">结束日期
            <input className="field-control mt-2" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => reset(() => setDateTo(event.target.value))} />
          </label>
        </div>
        {filtered ? <button type="button" className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline" onClick={() => reset(() => { setCountryFilter("all"); setEventTypeFilter("all"); setTopicFilter("all"); setQuery(""); setDateFrom(""); setDateTo(""); })}>清除全部筛选</button> : null}
        <dl className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
          <div className="flex justify-between py-3"><dt className="text-[var(--muted)]">当前结果</dt><dd className="metric-number font-semibold" data-news-count>{verifiedItems.length}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-[var(--muted)]">结构样例</dt><dd className="metric-number font-semibold">{sampleCount}</dd></div>
        </dl>
        <button type="button" onClick={exportCsv} disabled={!verifiedItems.length} className="mt-5 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">导出当前结果（CSV）</button>
        <a href="/research-data/events.json" className="mt-3 block text-sm font-semibold text-[var(--accent)]">下载全部事件数据（JSON）</a>
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
