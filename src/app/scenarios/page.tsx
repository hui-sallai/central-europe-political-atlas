import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioPresetWorkbench } from "@/components/ScenarioPresetWorkbench";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { scenarioEvidenceLinks, scenarioRegionalContexts } from "@/lib/scenarioResearch";

export const metadata: Metadata = {
  title: "情景预设",
  description: "在透明分析方法上运行条件式冲击预设，并比较基线、结果、传导与证据。",
};

export default function ScenariosPage() {
  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8"><p className="editorial-kicker">Scenario Presets / {platformStatus.version}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">条件式情景预设</h1><p className="mt-5 text-base leading-8 text-[var(--muted)]">Scenario 是分析方法上的参数预设，不是独立模型。每次运行同时显示基线、冲击、结果、传导链和证据，并明确保留“不是预测”的解释边界。</p><Link href="/models" className="mt-5 inline-flex rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">返回 Analysis Workbench</Link></header>
      <ScenarioPresetWorkbench
        countries={researchCountries}
        definitions={scenarioDefinitions}
        cards={modelCards}
        outputs={modelOutputs}
        regionalContexts={scenarioRegionalContexts}
        evidence={scenarioEvidenceLinks}
      />
    </main>
  );
}
