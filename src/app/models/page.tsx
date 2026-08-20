import Link from "next/link";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/AnalysisWorkbench";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "分析工作台",
  description: "运行透明综合指标，并登记未来计量、时间序列、事件、网络与贝叶斯分析能力。",
};

export default function ModelsPage() {
  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">Analysis Workbench / {platformStatus.version}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">分析工作台</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">在同一入口运行现有透明综合指标，并查看结果、驱动、方法和输入数据。Panel、VAR、Event Study、Network 与 Bayesian 方法只登记接口，不生成尚无数据支持的估计。</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/scenarios" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">Scenario presets</Link><Link href="/methodology#models" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Research methods</Link></div>
      </header>
      <AnalysisWorkbench countries={researchCountries} cards={modelCards} outputs={modelOutputs} />
    </main>
  );
}
