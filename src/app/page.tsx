import Link from "next/link";
import type { Metadata } from "next";
import { modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries, researchEvents } from "@/lib/researchData";
import { platformRelease } from "@/lib/releaseMetadata";

export const metadata: Metadata = {
  title: "中欧政治经济研究平台",
  description: "十国政治经济数据、区域事实地图、透明分析与事件研究入口。",
};

const primaryEntries = [
  { href: "/countries", label: "Countries", zh: "国家研究", note: "十国经济、政治、项目、事件和模型入口" },
  { href: "/data", label: "Data", zh: "数据浏览", note: "按国家、指标和年份查询可追溯观测值" },
  { href: "/models", label: "Analysis", zh: "分析工作台", note: "Composite Indicators 与未来分析技能注册表" },
  { href: "/news", label: "Events", zh: "事件库", note: "政治经济事件、来源与研究关联" },
  { href: "/map", label: "Map", zh: "区域地图", note: "九国已验收区域事实和项目位置" },
  { href: "/methodology", label: "Research", zh: "方法与下载", note: "来源、验证、限制、引用和研究数据包" },
] as const;

export default function Home() {
  const verifiedEvents = researchEvents.filter((event) => event.data_status === "verified").length;
  const availableModelOutputs = modelOutputs.filter((output) => output.score !== null).length;

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
          <p>当前处于数据基础、透明复合指标与界面架构阶段。</p>
          <p>高级统计技能、预测层和风险地图尚未启用。</p>
        </aside>
      </section>

      <section className="grid gap-px overflow-hidden border-b border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4" aria-label="研究覆盖摘要">
        {[
          ["国家", String(researchCountries.length), "统一国家与观测值结构"],
          ["区域事实地图", `${platformRelease.regional_factual_map_countries} 国`, "通过公开展示闸门"],
          ["可用模型结果", String(availableModelOutputs), "透明规则输出，非预测"],
          ["经核验事件", String(verifiedEvents), "来源可追溯，默认不进入模型"],
        ].map(([label, value, note]) => (
          <article key={label} className="bg-[var(--surface)] px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
            <p className="metric-number mt-3 text-3xl font-semibold text-[var(--accent)]">{value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="editorial-kicker">Research Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold">选择研究入口</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">公开页面优先呈现研究任务；完整 schema、QA 和版本记录保留在下载包与方法论中。</p>
        </div>
        <nav className="analysis-category-grid mt-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="主要研究入口">
          {primaryEntries.map((entry, index) => (
            <Link key={entry.href} href={entry.href} className="group min-h-36 p-5 transition hover:bg-white">
              <span className="metric-number text-xs text-[var(--accent)]">0{index + 1}</span>
              <span className="mt-4 block text-xl font-semibold">{entry.label}</span>
              <span className="mt-1 block text-sm font-semibold text-[var(--muted)]">{entry.zh}</span>
              <span className="mt-3 block text-sm leading-6 text-[var(--muted)] group-hover:text-[var(--foreground)]">{entry.note}</span>
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
