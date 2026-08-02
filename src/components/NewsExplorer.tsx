"use client";

import { useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { getNewsTopics, toEventRecord, weeklyNewsItems, type NewsTopic, type WeeklyNewsItem } from "@/lib/newsData";

type CountryFilter = "all" | string;
type TopicFilter = "all" | NewsTopic;

function EventCard({ item }: { item: WeeklyNewsItem }) {
  const event = toEventRecord(item);
  const isSample = item.dataStatus === "sample";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.weekOf}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.countryZh}</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.topic}</span>
        <DataStatusBadge status={isSample ? "sample" : "manual"} />
        <SourceStatusBadge status={isSample ? "sample" : "official"} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-semibold text-[var(--muted)]">
          {isSample ? "结构样例，不进入模型" : "人工摘要，待事件编码"}
        </span>
        {item.sourceUrl ? (
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            来源：{item.sourceLabel}
          </a>
        ) : <span className="text-[var(--muted)]">来源：{item.sourceLabel}</span>}
      </div>
      <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <summary className="cursor-pointer text-sm font-semibold">事件编码字段</summary>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(event).map(([field, value]) => (
            <div key={field} className="rounded-xl bg-white/75 px-3 py-2">
              <dt className="font-mono text-[10px] font-semibold text-[var(--muted)]">{field}</dt>
              <dd className="mt-1 break-words font-semibold">{value === null ? "待编码" : typeof value === "boolean" ? String(value) : value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

export function NewsExplorer() {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const topics = getNewsTopics();
  const filteredItems = useMemo(
    () => weeklyNewsItems.filter((item) => (countryFilter === "all" || item.countrySlug === countryFilter) && (topicFilter === "all" || item.topic === topicFilter)),
    [countryFilter, topicFilter],
  );
  const verifiedItems = filteredItems.filter((item) => item.dataStatus === "verified");
  const sampleItems = filteredItems.filter((item) => item.dataStatus === "sample");

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="card h-fit p-5 lg:sticky lg:top-6">
        <p className="eyebrow">Event Filters</p>
        <h2 className="mt-3 text-xl font-semibold">筛选</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">按国家和主题筛选新闻摘要；事件编码字段默认折叠。</p>
        <div className="mt-5">
          <p className="text-xs font-semibold text-[var(--muted)]">国家</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCountryFilter("all")} className={`rounded-full border px-3 py-1 text-sm ${countryFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>全部</button>
            {countries.map((country) => (
              <button key={country.slug} type="button" onClick={() => setCountryFilter(country.slug)} className={`rounded-full border px-3 py-1 text-sm ${countryFilter === country.slug ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                {country.nameZh}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-xs font-semibold text-[var(--muted)]">主题</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setTopicFilter("all")} className={`rounded-full border px-3 py-1 text-sm ${topicFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>全部</button>
            {topics.map((topic) => (
              <button key={topic} type="button" onClick={() => setTopicFilter(topic)} className={`rounded-full border px-3 py-1 text-sm ${topicFilter === topic ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>{topic}</button>
            ))}
          </div>
        </div>
      </aside>

      <div className="grid gap-5">
        <section className="card p-6">
          <p className="eyebrow">Verified Sources / Pending Coding</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">来源已核验，待事件编码</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">已核验来源的人工摘要仍不会自动进入模型；actor、direction、intensity 等字段需按规则完成编码。</p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{verifiedItems.length} 条</span>
          </div>
          <div className="mt-5 grid gap-4">{verifiedItems.map((item) => <EventCard key={item.id} item={item} />)}</div>
        </section>

        <details className="card p-6">
          <summary className="cursor-pointer text-xl font-semibold">结构样例区（{sampleItems.length} 条，不进入模型）</summary>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">样例仅用于检验事件库结构，不作为事实事件、训练输入或评分依据。</p>
          <div className="mt-5 grid gap-4">{sampleItems.map((item) => <EventCard key={item.id} item={item} />)}</div>
        </details>
      </div>
    </section>
  );
}
