"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getResearchIndicator, getResearchProject, researchCountries, researchEvents } from "@/lib/researchData";
import { eventActors, eventAnalysisLevels } from "@/lib/eventAnalysisLinks";
import type { Event, EventType } from "@/types/researchData";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { NotebookCollect } from "./NotebookCollect";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { newsTranslations } from "@/lib/newsTranslations";
import { eventPresentation } from "@/lib/eventPresentation";
import { reviewedText } from "@/i18n/reviewedText";

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
  const locale = useLocale();
  const { title, summary } = eventPresentation(item, locale);
  const en = locale === "en";
  const levels = eventAnalysisLevels(item);
  const { actors, publisher } = eventActors(item);
  // Entries reflect content actually available for this event; statistical eligibility is decided in the workbench.
  const analysisHref = `${en ? "/en" : ""}/models?tab=run&skill=event_window_analysis&country=${item.country_slug}&event=${item.event_id}`;
  const entries = [
    levels.background === "available" ? { level: "background", label: en ? "Event background" : "查看事件背景" } : null,
    levels.indicators === "available" ? { level: "indicators", label: en ? "Economic connections" : "查看经济关联" } : null,
    levels.window_link === "available" ? { level: "window", label: en ? "Event-window analysis" : "查看事件窗口分析" } : null,
  ].filter((entry): entry is { level: string; label: string } => entry !== null);
  const topics = [...new Set([item.topic, ...item.affected_indicator.map((id) => getResearchIndicator(id)?.name_zh ?? id)])];
  return (
    <LocalizedContent><article id={item.id} className="scroll-mt-24 border-t border-[var(--line)] py-5 first:border-t-0">
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <div>
          <p className="metric-number text-xs text-[var(--muted)]">{item.date}</p>
          <p className="mt-2 text-sm font-semibold">{item.country_name}</p>
          <p className="mt-1 text-xs text-[var(--accent)]">{eventTypeLabels[item.event_type]}</p>
        </div>
        <div>
          <div lang={summary.lang} data-original-language="und" data-presentation-language={summary.lang}>
          {title.originalLabel ? <span lang="en" className="mb-2 block text-xs text-[var(--muted)]">{title.originalLabel}</span> : null}
          <h3 lang={title.lang} data-original-language={title.originalLabel ? title.lang : undefined} className="text-xl font-semibold leading-7">{title.text}</h3>
          {summary.originalLabel ? <span lang="en" className="mt-2 block text-xs text-[var(--muted)]">{summary.originalLabel}</span> : null}
          {summary.text.split("\n\n").map((paragraph, index) => <p key={index} className="mt-3 text-sm leading-7 text-[var(--muted)]">{paragraph}</p>)}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.data_status === "verified" && item.source_url ? <NotebookCollect create={() => ({ type: "event", title: item.title, url: `${PLATFORM_BASE_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : ""}/news/?country=${item.country_slug}&type=${item.event_type}&from=${item.date}&to=${item.date}#${item.id}`, canonical_ids: [item.id], countries: [item.country_slug], periods: [item.date], sources: [{ institution: item.source_name, dataset: item.source_name, url: item.source_url!, layer: "verified_event" }], layer: "verified_event", comparability: "event_context_not_a_comparable_numeric_observation", warnings: [item.model_note, "Verified event context, not an inferred causal effect."].filter(Boolean), metadata: { event_type: item.event_type, topic: item.topic, original_language: "zh-CN", status: item.data_status, entersModel: item.enters_model } })} /> : null}
            {topics.filter(Boolean).map((topic) => { const label = en ? reviewedText[topic] ?? topic : topic, original = /[\u3400-\u9fff]/.test(label); return <span key={topic} lang={original ? "zh-CN" : "en"} data-original-language={original ? "zh-CN" : undefined} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{label}</span>; })}
            {entries.map((entry, index) => (
              <Link key={entry.level} href={`${analysisHref}&section=${entry.level}`} data-event-entry={entry.level} className={index === 0 ? "rounded-full cta-dark px-3 py-1 text-xs font-semibold" : "rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent)]"}>
                {entry.label}
              </Link>
            ))}
            {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold text-[var(--accent)] hover:underline"><span lang="zh-CN" data-original-language="zh-CN">{item.source_name}</span> ↗</a> : <span lang="zh-CN" data-original-language="zh-CN" className="ml-auto text-xs text-[var(--muted)]">{item.source_name}</span>}
          </div>
          <details className="advanced-disclosure mt-4">
            <summary>研究字段</summary>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              {([
                [en ? "Event actors" : "事件主体", actors ? actors.map((actor) => (en ? actor.en : actor.zh)).join(en ? "; " : "；") : (en ? "Not separately coded" : "未单独编码"), Boolean(actors) && levels.mechanism !== "available"],
                [en ? "Source publisher" : "来源发布方", publisher, true],
                ["Direction", directionLabels[item.direction], false],
                ["Confidence", confidenceLabels[item.confidence], false],
                ["Affected indicators", item.affected_indicator.map((id) => getResearchIndicator(id)?.name_zh ?? id).join(" / ") || "待编码", false],
              ] as Array<[string, string, boolean]>).map(([label, value, original]) => <div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold leading-6">{original ? <span lang="zh-CN" data-original-language="zh-CN">{value}</span> : value}</dd></div>)}
            </dl>
            {item.related_project_ids.length ? <div className="mt-4 flex flex-wrap gap-2"><span className="text-xs font-semibold text-[var(--muted)]">相关项目</span>{item.related_project_ids.map((id) => <Link key={id} href={`/data?country=${item.country_slug}`} className="text-xs font-semibold text-[var(--accent)]"><span lang="zh-CN" data-original-language="zh-CN">{getResearchProject(id)?.name ?? id}</span></Link>)}</div> : null}
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">方向与置信度是研究编码，不是预测或因果判断。完整 raw record 可在 research data package 中下载。</p>
          </details>
        </div>
      </div>
    </article></LocalizedContent>
  );
}

const CSV_COLUMNS = ["id", "date", "country_slug", "country_name", "event_type", "topic", "title", "summary", "actor", "source_name", "source_url", "confidence", "coding_status"] as const;
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function NewsExplorer() {
  const locale = useLocale();
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
      .filter((item) => { if (!terms.length) return true; const translation = newsTranslations[item.id]; const haystack = [item.title, item.summary, translation?.title, translation?.summary, item.actor, item.source_name, item.topic, item.country_name].join(" ").toLowerCase(); return terms.every((term) => haystack.includes(term)); })
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
    <LocalizedContent><section className="mt-7 grid gap-8 lg:grid-cols-[230px_1fr]">
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
          <select className="field-control mt-2" value={topicFilter} onChange={(event) => reset(() => setTopicFilter(event.target.value))}><option value="all">全部主题</option>{topics.map((topic) => { const label = locale === "en" ? reviewedText[topic] ?? topic : topic, original = /[\u3400-\u9fff]/.test(label); return <option key={topic} value={topic} lang={original ? "zh-CN" : "en"} data-original-language={original ? "zh-CN" : undefined}>{label}</option>; })}</select>
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
        {urlReady && !verifiedItems.length ? <p className="py-10 text-center text-sm text-[var(--muted)]" role="status" data-event-archive-empty>当前发布档案中没有匹配的已核验事件。</p> : null}
        {sampleCount ? <details className="advanced-disclosure mt-8"><summary>结构样例记录（默认隐藏，不进入分析）</summary><p className="mt-3 text-sm leading-6 text-[var(--muted)]">结构样例只保留在原始数据导出中，不进入公开事件流、模型或情景分数。</p></details> : null}
      </div>
    </section></LocalizedContent>
  );
}
