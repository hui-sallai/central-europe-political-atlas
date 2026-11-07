import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { HomeResearchMap, type HomeMapCountry } from "@/components/HomeResearchMap";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { FeaturedResearchSection, HomeCoverageSection, HomeMethodologySection } from "@/components/HomeResearchDiscovery";
import { getEventsForCountry, researchCountries, researchEvents } from "@/lib/researchData";
import { newsLibraryMetadata } from "@/lib/newsLibraryMetadata";
import { WorkspaceEntrySection } from "@/components/WorkspaceIndex";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";

export const metadata: Metadata = pageMetadata({ title: "中欧政治经济研究平台", description: "十国政治经济数据、区域事实地图、透明分析与事件研究入口。", path: "/" });

export default function Home() {
  const mapCountries: HomeMapCountry[] = researchCountries.map((country) => {
    const indicators = getBasicIndicators(country.slug).filter((indicator) => ["growth", "inflation", "unemployment", "gdpPerCapita"].includes(indicator.id));
    const latestEvent = getEventsForCountry(country.slug).find((event) => event.data_status === "verified") ?? null;
    return {
      slug: country.slug,
      nameZh: country.name_zh,
      nameEn: country.name,
      iso2: country.iso2,
      indicators: indicators.map((indicator) => ({ id: indicator.id, label: indicator.label, value: indicator.value, year: indicator.year })),
      latestEvent: latestEvent ? { id: latestEvent.id, date: latestEvent.date, title: latestEvent.title } : null,
    };
  });
  const verifiedEventCount = researchEvents.filter((event) => event.data_status === "verified").length;

  const latestSignals = researchEvents
    .filter((event) => event.data_status === "verified")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-10">
        <div>
          <p className="editorial-kicker">Central Europe Political Atlas · {PLATFORM_VERSION.split(" ")[0]}</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            用可追溯证据研究中欧政治经济
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)]">
            考察各国经济状况的差异，在历史背景下比较选举，并通过来源文件追踪政策与投资项目的实施。从已有案例或问题导向工作区出发，检查证据、方法与缺口，再导出可复现研究。
          </p>
        </div>
        <nav className="mt-5 flex flex-wrap gap-4 text-sm font-semibold" aria-label="开始研究"><a className="text-[var(--accent)] underline" href="#featured-research-title">查看研究案例</a><a className="text-[var(--accent)] underline" href="#question-first-title">选择研究问题</a><Link className="text-[var(--accent)] underline" href="/politics/">政治与选举</Link></nav>
      </header>

      <FeaturedResearchSection locale="zh-CN" />
      <WorkspaceEntrySection locale="zh-CN" />
      <HomeCoverageSection locale="zh-CN" />

      <HomeResearchMap countries={mapCountries} />

      <section className="editorial-section mt-10" aria-labelledby="latest-signals-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="editorial-kicker">Verified Event Archive</p><h2 id="latest-signals-title" className="mt-2 text-3xl font-semibold">近期已核验事件</h2><p className="mt-2 text-xs text-[var(--muted)]" data-latest-signals-meta>显示最近 <span className="metric-number">{latestSignals.length}</span> 条 · 共 <span className="metric-number">{verifiedEventCount}</span> 条已核验事件 · 最近事件日期 <time dateTime={newsLibraryMetadata.latestEventDate}>{newsLibraryMetadata.latestEventDate}</time> · 新闻批次截至 <time dateTime={newsLibraryMetadata.latestNewsBatch}>{newsLibraryMetadata.latestNewsBatch}</time> · 历史事件库记录更新 <time dateTime={newsLibraryMetadata.historicalStoreUpdatedAt}>{newsLibraryMetadata.historicalStoreUpdatedAt}</time></p></div><Link href="/news" className="text-sm font-semibold text-[var(--accent)]">打开事件库</Link></div>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]" data-home-news-check>这是注明日期的事件档案，不是实时新闻流。最近批次来源核验（登记检索日期）：<time dateTime={newsLibraryMetadata.latestBatchSourceCheckedAt}>{newsLibraryMetadata.latestBatchSourceCheckedAt}</time>；不表示此后持续更新。</p>
        <div className="latest-signals-grid mt-5">
          {latestSignals.map((event) => <article key={event.id}><p>{event.date} · {event.country_name}</p><h3><Link href={`/news?country=${event.country_slug}#${event.id}`}>{event.title}</Link></h3><span>{event.event_type} · {event.source_name}</span></article>)}
        </div>
      </section>

      <section className="mt-8 flex flex-wrap gap-4 text-sm" aria-label="支撑证据"><Link className="text-[var(--accent)] underline" href="/news/">浏览已核验事件库</Link><Link className="text-[var(--accent)] underline" href="/data/">检查观测、来源与研究导出</Link><Link className="text-[var(--accent)] underline" href="/countries/">全部国家档案</Link></section>
      <HomeMethodologySection locale="zh-CN" />
    </main>
  );
}
