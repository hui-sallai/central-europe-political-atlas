"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CitationActions } from "@/components/CitationActions";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { PLATFORM_BASE_URL, PLATFORM_VERSION } from "@/lib/releaseMetadata";
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
  const isSample = item.data_status === "sample";
  const codingFields = {
    event_id: item.id,
    date: item.date,
    country_code: item.country,
    region_code: item.region_code,
    actor: item.actor,
    event_type: item.event_type,
    direction: item.direction,
    intensity: item.intensity,
    affected_indicator: item.affected_indicator,
    affected_model: item.affected_model,
    related_project_ids: item.related_project_ids,
    duration: item.duration,
    confidence: item.confidence,
    source_status: item.source_status,
    enters_model: item.enters_model,
    coding_status: item.coding_status,
    model_note: item.model_note,
  };

  return (
    <article id={item.id} className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono">{item.event_id}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.date}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.country_name}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{eventTypeLabels[item.event_type]}</span>
        <DataStatusBadge status={item.data_status} />
        <SourceStatusBadge status={item.source_status} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["actor", item.actor],
          ["affected_model", item.affected_model.join(" / ") || "未关联"],
          ["confidence", confidenceLabels[item.confidence]],
          ["enters_model", String(item.enters_model)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
            <dt className="font-mono text-[10px] font-semibold text-[var(--muted)]">{label}</dt>
            <dd className="mt-1 break-words font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold text-[var(--muted)]">
          {isSample ? "结构样例，不进入模型" : item.coding_status === "coded" ? "结构化编码已记录，不进入模型" : "人工摘要，待事件编码"}
        </span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold text-[var(--muted)]">方向：{directionLabels[item.direction]}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold text-[var(--muted)]">强度：{item.intensity ?? "待编码"}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold text-[var(--muted)]">置信度：{confidenceLabels[item.confidence]}</span>
        {item.source_url ? (
          <a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            来源：{item.source_name}
          </a>
        ) : <span className="text-[var(--muted)]">来源：{item.source_name}</span>}
      </div>
      <div className="mt-3"><CitationActions compact plainText={`Central Europe Political Atlas, ${PLATFORM_VERSION}, event ${item.event_id}, ${item.date}, ${item.title}. Source: ${item.source_name}. Platform record: ${PLATFORM_BASE_URL}news/#${item.id}`} /></div>
      <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Affected Indicators</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.affected_indicator.length > 0 ? item.affected_indicator.map((indicatorId) => (
            <span key={indicatorId} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]" title={indicatorId}>
              {getResearchIndicator(indicatorId)?.name_zh ?? indicatorId}
            </span>
          )) : <span className="text-xs text-[var(--muted)]">待编码</span>}
        </div>
      </div>
      {item.related_project_ids.length > 0 ? (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Related Projects</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.related_project_ids.map((projectId) => (
              <Link key={projectId} href={`/data?country=${item.country_slug}&mode=projects#project-${projectId}`} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold hover:text-[var(--accent)]" title={projectId}>
                {getResearchProject(projectId)?.name ?? projectId}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Event → Project → Indicator 仅记录研究关联，不生成风险判断或模型分数。</p>
        </div>
      ) : null}
      <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <summary className="cursor-pointer text-sm font-semibold">事件编码与未来模型候选关联</summary>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(codingFields).map(([field, value]) => (
            <div key={field} className="rounded-xl bg-white/75 px-3 py-2">
              <dt className="font-mono text-[10px] font-semibold text-[var(--muted)]">{field}</dt>
              <dd className="mt-1 break-words font-semibold">
                {value === null
                  ? "待编码"
                  : Array.isArray(value)
                    ? value.join(" / ") || "未关联"
                    : typeof value === "boolean"
                      ? String(value)
                      : value}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

export function NewsExplorer() {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");

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
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete(kind);
    else url.searchParams.set(kind, value);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  const eventTypes = Object.keys(eventTypeLabels) as EventType[];
  const filteredItems = useMemo(
    () => researchEvents.filter((item) => (countryFilter === "all" || item.country_slug === countryFilter) && (eventTypeFilter === "all" || item.event_type === eventTypeFilter)),
    [countryFilter, eventTypeFilter],
  );
  const verifiedItems = filteredItems
    .filter((item) => item.data_status === "verified")
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date));
  const sampleItems = filteredItems.filter((item) => item.data_status === "sample");
  const verifiedCount = researchEvents.filter((item) => item.data_status === "verified").length;
  const weeklyVerifiedCount = researchEvents.filter((item) => item.data_status === "verified" && item.date >= "2026-08-13" && item.date <= "2026-08-20").length;
  const associatedIndicatorCount = new Set(researchEvents.flatMap((item) => item.affected_indicator)).size;

  return (
    <>
      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          ["本周十国事件", `${weeklyVerifiedCount} 条`],
          ["全部经核验事件", `${verifiedCount} 条`],
          ["事件分类", `${eventTypes.length} 类`],
          ["已关联指标", `${associatedIndicatorCount} 项`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="card h-fit p-5 lg:sticky lg:top-6">
        <p className="eyebrow">Event Filters</p>
        <h2 className="mt-3 text-xl font-semibold">筛选</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">按国家和事件类型筛选摘要；详细编码字段默认折叠。</p>
        <div className="mt-5">
          <p className="text-xs font-semibold text-[var(--muted)]">国家</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => updateFilter("country", "all")} className={`rounded-full border px-3 py-1 text-sm ${countryFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>全部</button>
            {researchCountries.map((country) => (
              <button key={country.slug} type="button" onClick={() => updateFilter("country", country.slug)} className={`rounded-full border px-3 py-1 text-sm ${countryFilter === country.slug ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>{country.name_zh}</button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-xs font-semibold text-[var(--muted)]">事件类型</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => updateFilter("type", "all")} className={`rounded-full border px-3 py-1 text-sm ${eventTypeFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>全部</button>
            {eventTypes.map((eventType) => (
              <button key={eventType} type="button" onClick={() => updateFilter("type", eventType)} className={`rounded-full border px-3 py-1 text-sm ${eventTypeFilter === eventType ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>{eventTypeLabels[eventType]}</button>
            ))}
          </div>
        </div>
      </aside>

      <div className="grid gap-5">
        <section className="card p-6">
          <p className="eyebrow">Political Economy Event Library</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">十国正式事件记录</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">事件可关联 projects、indicators 与未来模型候选，但当前不计算分数；所有记录保持 enters_model=false。</p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{verifiedItems.length} 条</span>
          </div>
          <div className="mt-5 grid gap-4">
            {verifiedItems.length > 0 ? verifiedItems.map((item) => <EventCard key={item.id} item={item} />) : <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">当前筛选条件下没有正式事件。</p>}
          </div>
        </section>
        <details className="card p-6">
          <summary className="cursor-pointer text-xl font-semibold">结构样例区（{sampleItems.length} 条，不进入模型）</summary>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">样例仅用于检验事件库结构，不作为事实事件、训练输入或评分依据。</p>
          <div className="mt-5 grid gap-4">{sampleItems.map((item) => <EventCard key={item.id} item={item} />)}</div>
        </details>
      </div>
      </section>
    </>
  );
}
