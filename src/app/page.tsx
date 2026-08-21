import Link from "next/link";
import type { Metadata } from "next";
import { HomeResearchMap, type HomeMapCountry } from "@/components/HomeResearchMap";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { platformStatus } from "@/lib/platformStatus";
import { getEventsForCountry, researchCountries, researchEvents } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "中欧政治经济研究平台",
  description: "十国政治经济数据、区域事实地图、透明分析与事件研究入口。",
};

const primaryEntries = [
  { href: "/countries", label: "Countries", zh: "国家研究" },
  { href: "/data", label: "Data", zh: "数据浏览" },
  { href: "/models", label: "Analysis", zh: "分析工作台" },
  { href: "/scenarios", label: "Scenarios", zh: "条件情景" },
  { href: "/news", label: "Events", zh: "事件库" },
  { href: "/map", label: "Map", zh: "区域地图" },
  { href: "/methodology", label: "Research", zh: "方法与下载" },
] as const;

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
  const latestSignals = researchEvents
    .filter((event) => event.data_status === "verified")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <main className="page-shell">
      <section className="grid gap-10 border-b border-[var(--line)] pb-10 lg:grid-cols-[1.45fr_0.55fr] lg:items-end">
        <div>
          <p className="editorial-kicker">Central Europe Political Economy Analysis</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            从国家事实到区域证据的中欧研究工作台
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)]">
            面向德国、波兰、匈牙利、罗马尼亚、捷克、斯洛伐克、斯洛文尼亚、塞尔维亚、奥地利与克罗地亚，连接经济观测、政治事件、区域地图、对华项目和透明分析。
          </p>
        </div>
        <aside className="status-line text-sm leading-7 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">{platformStatus.version}</p>
          <p>当前处于高频政治经济、事件分析与产品语言系统阶段。</p>
          <p>贸易网络、月度高频数据与事件窗口分析已激活；预测层和风险地图未启用。</p>
        </aside>
      </section>

      <HomeResearchMap countries={mapCountries} />

      <section className="editorial-section mt-10" aria-labelledby="latest-signals-title">
        <div className="flex items-end justify-between gap-4"><div><p className="editorial-kicker">Latest Signals</p><h2 id="latest-signals-title" className="mt-2 text-3xl font-semibold">近期已核验事件</h2></div><Link href="/news" className="text-sm font-semibold text-[var(--accent)]">打开事件库</Link></div>
        <div className="latest-signals-grid mt-5">
          {latestSignals.map((event) => <article key={event.id}><p>{event.date} · {event.country_name}</p><h3><Link href={`/news?country=${event.country_slug}#${event.id}`}>{event.title}</Link></h3><span>{event.event_type} · {event.source_name}</span></article>)}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="editorial-kicker">Research Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold">选择研究入口</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">公开页面优先呈现研究任务；完整 schema、QA 和版本记录保留在下载包与方法论中。</p>
        </div>
        <nav className="compact-research-workflow mt-5" aria-label="主要研究入口">
          {primaryEntries.map((entry, index) => (
            <Link key={entry.href} href={entry.href}>
              <span className="metric-number">0{index + 1}</span>
              <span><strong>{entry.label}</strong><small>{entry.zh}</small></span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="editorial-section mt-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="editorial-kicker">Research Boundary</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">所有结果必须能回到 observation、来源和方法规则。缺失数据不补零，事件不自动改变分数，复合指标不解释为客观风险真值。</p>
        </div>
        <Link href="/methodology" className="rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-white">阅读方法与限制</Link>
      </section>
    </main>
  );
}
