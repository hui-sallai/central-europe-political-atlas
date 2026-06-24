"use client";

import { useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { getNewsTopics, weeklyNewsItems, type NewsTopic } from "@/lib/newsData";

type CountryFilter = "all" | string;
type TopicFilter = "all" | NewsTopic;

export function NewsExplorer() {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const topics = getNewsTopics();

  const filteredItems = useMemo(
    () =>
      weeklyNewsItems.filter((item) => {
        const matchesCountry = countryFilter === "all" || item.countrySlug === countryFilter;
        const matchesTopic = topicFilter === "all" || item.topic === topicFilter;
        return matchesCountry && matchesTopic;
      }),
    [countryFilter, topicFilter],
  );
  const formalItems = filteredItems.filter((item) => item.dataStatus !== "sample");
  const sampleItems = filteredItems.filter((item) => item.dataStatus === "sample");

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card p-5">
        <p className="eyebrow">Filters</p>
        <h2 className="mt-3 text-xl font-semibold">筛选</h2>

        <div className="mt-5">
          <p className="text-xs font-semibold text-[var(--muted)]">国家</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCountryFilter("all")}
              className={`rounded-full border px-3 py-1 text-sm ${countryFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}
            >
              全部
            </button>
            {countries.map((country) => (
              <button
                key={country.slug}
                type="button"
                onClick={() => setCountryFilter(country.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${countryFilter === country.slug ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}
              >
                {country.nameZh}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-[var(--muted)]">主题</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTopicFilter("all")}
              className={`rounded-full border px-3 py-1 text-sm ${topicFilter === "all" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}
            >
              全部
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setTopicFilter(topic)}
                className={`rounded-full border px-3 py-1 text-sm ${topicFilter === topic ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="grid gap-5">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Formal News</p>
              <h2 className="mt-2 text-xl font-semibold">正式新闻区</h2>
            </div>
            <DataStatusBadge status={formalItems.length > 0 ? "manual" : "pending"} />
          </div>
          {formalItems.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {formalItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.weekOf}</span>
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.topic}</span>
                    <DataStatusBadge status="manual" />
                    <SourceStatusBadge status={item.sourceUrl ? "official" : "pending"} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--accent)]">{item.countryZh}</p>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[var(--muted)]">人工摘要，暂不进入模型</span>
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                        来源：{item.sourceLabel}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
              暂无已接入的正式新闻。后续只在完成来源链接与人工审核后进入此区。
            </p>
          )}
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Structural Samples</p>
              <h2 className="mt-2 text-xl font-semibold">结构样例区</h2>
            </div>
            <DataStatusBadge status="sample" />
          </div>
          <div className="mt-4 grid gap-4">
        {sampleItems.map((item) => (
          <article key={item.id} className="card p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.weekOf}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.topic}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.language}</span>
              <DataStatusBadge status={item.dataStatus === "sample" ? "sample" : "manual"} />
              <SourceStatusBadge status="sample" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--accent)]">{item.countryZh}</p>
            <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
            {item.dataStatus === "sample" ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                结构样例，不进入模型。该条只用于验证新闻周报版式，不作为事实新闻或训练/评分输入。
              </p>
            ) : null}
            <p className="mt-4 text-xs text-[var(--muted)]">来源：{item.sourceLabel}</p>
          </article>
        ))}
          </div>
        </section>
      </div>
    </section>
  );
}
