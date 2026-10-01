import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ScenarioPresetWorkbench } from "@/components/ScenarioPresetWorkbench";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { scenarioEvidenceLinks, scenarioRegionalContexts } from "@/lib/scenarioResearch";
import { KickerVersion } from "@/components/KickerVersion";

export const metadata: Metadata = pageMetadata({ title: "Scenario presets", description: "Conditional parameter presets with baseline comparisons, transmission assumptions and contextual evidence. Not forecasts.", path: "/en/scenarios/", locale: "en" });

export default function ScenariosPage() {
  return <main className="page-shell">
    <header className="max-w-4xl border-b border-[var(--line)] pb-8">
      <p className="editorial-kicker">Scenario Presets / <KickerVersion version={platformStatus.version} /></p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">Conditional scenario presets</h1>
      <p className="mt-5 text-base leading-8 text-[var(--muted)]">A scenario is a parameter preset for an analysis method, not an independent model. Each run shows a baseline, assumed shock, conditional result, transmission chain and contextual evidence. These comparisons are not forecasts and do not alter original observations.</p>
      <Link href="/en/models/" className="mt-5 inline-flex rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Return to Analysis Workbench</Link>
    </header>
    <ScenarioPresetWorkbench countries={researchCountries} definitions={scenarioDefinitions} cards={modelCards} outputs={modelOutputs} regionalContexts={scenarioRegionalContexts} evidence={scenarioEvidenceLinks} />
  </main>;
}
