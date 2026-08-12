import { ScenarioExplorer } from "@/components/ScenarioExplorer";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries, researchEvents } from "@/lib/researchData";
import { industrialDependencyReadiness, scenarioDefinitions } from "@/lib/scenarioFramework";

export default function ScenariosPage() {
  const availableCount = scenarioDefinitions.filter((item) => item.calculation_status === "available").length;

  return (
    <main className="page-shell">
      <p className="eyebrow">Scenario Simulation / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">政治经济情景模拟</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        v0.60 的独立情景框架保持不变。v0.70 接入直接能源价格和对德国出口依赖后，四项情景均可在有合格基线输入的国家重算；情景不是预测，不改写原始数据，也不表示未来事实。
      </p>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          ["情景数量", `${scenarioDefinitions.length} 个`],
          ["可直接重算", `${availableCount} 个`],
          ["明确暂不可算", `${scenarioDefinitions.length - availableCount} 个`],
          ["原始 observations", "保持不变"],
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
        events={researchEvents}
      />

      <section className="mt-6 card p-6">
        <p className="eyebrow">Reserved Interface / v0.80</p>
        <h2 className="mt-3 text-2xl font-semibold">China-linked Project Disruption</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">仅预留 Event → Project → Indicator 传导接口。当前项目时间序列、产能、年度流量和统一金额不足，因此情景状态为 unavailable，不生成冲击分数，也不修改原始 observation。</p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Industrial Dependency Readiness</p>
        <h2 className="mt-3 text-2xl font-semibold">产业依赖模型准入检查</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">V0.70 Ready</p>
            <p className="mt-2 text-lg font-semibold">V4 第一版已启用</p>
            <p className="mt-3 text-sm leading-6">{industrialDependencyReadiness.decision}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">已有候选输入</p>
            <p className="mt-2 font-mono text-xs leading-6 text-[var(--muted)]">{industrialDependencyReadiness.available_inputs.join(" / ")}</p>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-[var(--muted)]">
              {industrialDependencyReadiness.blockers.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
