"use client";

import { useMemo, useState } from "react";
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

      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <article key={item.id} className="card p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.weekOf}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.topic}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.language}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">{item.dataStatus === "sample" ? "样例" : "已核验"}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--accent)]">{item.countryZh}</p>
            <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
            <p className="mt-4 text-xs text-[var(--muted)]">来源：{item.sourceLabel}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
