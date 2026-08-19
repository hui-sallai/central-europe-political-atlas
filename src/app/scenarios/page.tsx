import type { Metadata } from "next";
import { ScenarioExplorer } from "@/components/ScenarioExplorer";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { chinaProjectDisruptionDecision, scenarioEvidenceLinks, scenarioRegionalContexts } from "@/lib/scenarioResearch";

export const metadata: Metadata = {
  title: "条件式情景分析",
  description: "四项条件式政治经济情景的基线、冲击、模型变化、证据与限制。",
};

export default function ScenariosPage() {
  const availableCount = scenarioDefinitions.filter((item) => item.calculation_status === "available").length;

  return (
    <main className="page-shell">
      <p className="eyebrow">Scenario Simulation / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">政治经济情景模拟</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        四个既有情景在固定基线与公开冲击假设下重算模型输入。结果保留公式、权重、来源和复现记录；它们是“如果……那么……”分析，不是预测、概率或综合未来风险。
      </p>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          ["情景数量", `${scenarioDefinitions.length} 个`],
          ["可直接重算", `${availableCount} 个`],
          ["明确暂不可算", `${scenarioDefinitions.length - availableCount} 个`],
          ["分析链", "Shock → Evidence"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p>
          </article>
        ))}
      </section>

      <ScenarioExplorer
        countries={researchCountries}
        definitions={scenarioDefinitions}
        cards={modelCards}
        outputs={modelOutputs}
        regionalContexts={scenarioRegionalContexts}
        evidenceLinks={scenarioEvidenceLinks}
      />

      <section className="mt-6 card p-6">
        <p className="eyebrow">China-linked Project Disruption Decision</p>
        <h2 className="mt-3 text-2xl font-semibold">China-linked Project Disruption</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{chinaProjectDisruptionDecision.reason}</p>
        <p className="mt-3 font-mono text-xs leading-6 text-[var(--muted)]">eligible context projects: {chinaProjectDisruptionDecision.eligible_project_ids.length} / score_enabled=false</p>
      </section>
    </main>
  );
}
