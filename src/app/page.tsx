import Link from "next/link";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { StatusSummary } from "@/components/StatusSummary";
import { platformStatus, platformStatusItems } from "@/lib/platformStatus";

const primaryEntries = [
  { href: "/map", label: "Explore Spatial Data", note: "进入单国地图、同层级跨国比较与区域数据追溯" },
  { href: "/countries", label: "国家档案", note: "进入十国概览与单国研究页" },
  { href: "/data", label: "数据工作台", note: "查询宏观、项目、来源与质量记录" },
  { href: "/news", label: "事件库", note: "查看政治经济事件编码与指标关联" },
  { href: "/models", label: "透明模型", note: "查看分数、输入追踪、权重与限制" },
  { href: "/scenarios", label: "情景模拟", note: "比较基线、冲击假设与模型变化" },
  { href: "/methodology", label: "方法论", note: "了解数据边界、来源等级与模型条件" },
] as const;

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <section className="home-first-screen">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div>
            <p className="eyebrow">Central Europe Political Atlas / {platformStatus.version}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
              中欧政治经济地图与研究数据平台
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              平台围绕十个中欧及邻近国家，组织国家档案、宏观数据、对华经贸项目、事件记录与区域地图资料。v0.90 把既有模型、情景、区域结构和证据连接为可追溯传导链，展示假设冲击如何改变合法模型输入；情景不是预测。
            </p>
          </div>
          <p className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
            Scenario coverage：四个独立情景按原模型公式重算。区域只显示 structural context；不生成综合未来风险、区域情景分数、预测或真实党派支持率图层。
          </p>
        </div>

        <div className="mt-5">
          <StatusSummary items={platformStatusItems} />
        </div>

        <nav className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-7" aria-label="主要研究入口">
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
      </section>
    </main>
  );
}
