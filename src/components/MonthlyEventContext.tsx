"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { monthlyEventDates, monthlyEventLinks } from "@/lib/monthlyEventContext";

export function MonthlyEventContext({ selected, countries, from, to, enabled }: {
  selected: string[]; countries: { slug: string; name: string; name_zh: string }[]; from: string; to: string; enabled: boolean;
}) {
  const en = useLocale() === "en";
  const dates = monthlyEventDates(from, to);
  const links = enabled ? monthlyEventLinks(selected, countries.map(country => country.slug), from, to, en) : [];
  return <section className="mt-5 rounded-lg border border-[var(--line)] p-4" aria-label={en ? "Verified event context" : "已核验事件背景"} data-monthly-event-context>
    <h4 className="font-semibold">{en ? "Explore Verified Events in This Period" : "查看同期已核验事件"}</h4>
    <p className="mt-2 text-sm" data-monthly-event-period>{en ? "Selected calendar period: " : "所选日历期间："}{dates ? `${dates.from} – ${dates.to}` : "—"}</p>
    <p className="mt-2 text-sm text-[var(--muted)]">{en ? "Chronological context only. These links do not show that an event explains an economic observation. Each country opens a separate filtered view of the existing verified Event Library; no indicator-specific event association is inferred." : "仅提供时间背景；这些链接不表示事件可以解释某项经济观测。每个国家打开现有已核验事件库的独立筛选视图，不自动推断事件与指标的关联。"}</p>
    <nav className="mt-3 flex flex-wrap gap-3" aria-label={en ? "Country-specific verified event links" : "按国家查看已核验事件"}>
      {links.map(link => { const country = countries.find(country => country.slug === link.country)!; return <a key={link.country} className="rounded-full border border-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:underline" href={link.href} data-monthly-event-country={link.country}>{en ? country.name : country.name_zh} · {en ? "Verified events" : "已核验事件"}</a>; })}
    </nav>
    {!links.length ? <p className="mt-2 text-sm" role="status">{en ? "Select a valid monthly comparison period and 2–5 countries to open event context." : "请选择有效的月度比较期间和2–5个国家，再查看事件背景。"}</p> : null}
    <p className="mt-3 text-xs text-[var(--muted)]">{en ? "Archive coverage varies by country and month. An empty archive search is not evidence that no relevant events occurred. Links reopen the currently published archive, not a frozen historical archive. Event records and monthly comparisons remain separate Notebook evidence types." : "档案覆盖因国家和月份而异；检索无结果不代表当时没有相关事件。链接重开当前发布档案，而非冻结的历史档案。事件记录与月度比较仍是独立的Notebook证据类型。"}</p>
  </section>;
}
