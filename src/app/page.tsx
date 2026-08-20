import Link from "next/link";
import type { Metadata } from "next";
import { CitationActions } from "@/components/CitationActions";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { platformStatus } from "@/lib/platformStatus";
import { platformApaCitation, platformBibtexCitation, platformCitation, platformRelease } from "@/lib/releaseMetadata";

export const metadata: Metadata = {
  title: "中欧政治经济研究平台",
  description: "十国政治经济数据、区域事实地图、透明规则模型与条件式情景分析入口。",
};

const primaryEntries = [
  { href: "/countries", label: "Explore Countries", note: "十国档案、数据完整度与研究摘要" },
  { href: "/map", label: "Explore Map", note: "九国区域事实、历史变化与项目位置" },
  { href: "/data", label: "Explore Data", note: "观测值、指标、来源和质量记录" },
  { href: "/models", label: "Explore Models", note: "透明分数、权重、输入与限制" },
  { href: "/scenarios", label: "Run Scenarios", note: "基线、冲击假设与条件式变化" },
] as const;

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <section className="home-first-screen">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <p className="eyebrow">Central Europe Political Atlas / {platformStatus.version}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
              中欧政治经济地图与研究数据平台
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              Political economy data, spatial comparison and transparent scenario analysis across ten Central European countries. 这里不是普通地图站，而是一套可追溯数据、规则模型与条件式研究工具。
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">Research Boundary</p>
            <p className="mt-2">提供事实比较、透明规则模型和条件式情景分析。</p>
            <p className="mt-2">不提供选举预测、投资建议、概率预测或因果影响估计。</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Countries", platformRelease.countries],
            ["Regional factual maps", platformRelease.regional_factual_map_countries],
            ["Transparent models", platformRelease.transparent_models],
            ["Scenarios", platformRelease.scenarios],
            ["Validation", platformRelease.validation_status],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p></div>)}
        </div>

        <nav className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="主要研究入口">
          {primaryEntries.map((entry) => (
            <Link key={entry.href} href={entry.href} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]">
              <span className="font-semibold text-[var(--foreground)]">{entry.label}</span>
              <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{entry.note}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-5">
          <InteractiveMapExplorer variant="home" />
        </div>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Cite This Platform</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">版本、方法、验证与导出记录均固定在当前正式研究版本；不创建虚构 DOI。</p>
          </div>
          <CitationActions plainText={platformCitation()} apaText={platformApaCitation()} bibtexText={platformBibtexCitation()} compact />
        </section>
      </section>
    </main>
  );
}
