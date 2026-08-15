import { ScenarioExplorer } from "@/components/ScenarioExplorer";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { chinaProjectDisruptionDecision, scenarioEvidenceLinks, scenarioRegionalContexts } from "@/lib/scenarioResearch";

export default function ScenariosPage() {
  const availableCount = scenarioDefinitions.filter((item) => item.calculation_status === "available").length;

  return (
    <main className="page-shell">
      <p className="eyebrow">Scenario Simulation / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">政治经济情景模拟</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        v0.91 保持四个既有情景及原模型公式不变，并增加确定性、参数边界、零冲击、单调性、隔离与复现验证。页面仍只做条件式比较，不改写原始数据，不输出概率预测或综合未来风险。
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
