import Link from "next/link";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { StatusSummary } from "@/components/StatusSummary";
import { platformStatus, platformStatusItems } from "@/lib/platformStatus";

const primaryEntries = [
  { href: "/map", label: "地图工作台", note: "查看国家空间入口与区域数据状态" },
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
              平台围绕十个中欧及邻近国家，组织国家档案、宏观数据、对华经贸项目、事件记录与区域地图资料。v0.70 为 V4 接入产业与冲击传导数据，并启用第一版产业依赖指数；结果用于比较与解释，不是预测结论。
            </p>
          </div>
          <p className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
            v0.50 的居民、财政与外部三个基础模型保持不变。v0.70 新增产业依赖 Model Card，并用直接能源价格和对德出口依赖解锁两项 V4 情景；不使用机器学习，不生成选举预测。
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
