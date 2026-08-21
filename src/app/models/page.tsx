import Link from "next/link";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/AnalysisWorkbench";
import { CountryComparisonMatrix, type MatrixRow } from "@/components/CountryComparisonMatrix";
import { ModelComparisonBoard } from "@/components/ModelComparisonBoard";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { getLatestObservation, getResearchIndicator, researchCountries } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "分析工作台",
  description: "运行透明综合指标与年度面板估计，查看十国横向对比矩阵，并了解网络、时间序列和事件分析的数据闸门。",
};

const matrixIndicatorIds = ["real_gdp_growth", "hicp_inflation", "unemployment_rate", "gdp_per_capita_eur"] as const;

export default function ModelsPage() {
  const comparisonRows: MatrixRow[] = researchCountries.map((country) => ({
    slug: country.slug,
    name_zh: country.name_zh,
    name: country.name,
    indicators: matrixIndicatorIds.map((indicatorId) => {
      const observation = getLatestObservation(country.slug, indicatorId);
      return {
        id: indicatorId,
        label: getResearchIndicator(indicatorId)?.name_zh ?? indicatorId,
        value: observation?.value ?? null,
        unit: observation?.unit ?? "",
        year: observation?.year ?? null,
      };
    }),
    models: modelCards.map((card) => {
      const output = modelOutputs.find((item) => item.country_slug === country.slug && item.model_id === card.model_id);
      return {
        model_id: card.model_id,
        label: card.name_zh,
        score: output?.score ?? null,
        availability: output?.availability ?? "insufficient",
      };
    }),
  }));

  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">Analysis Workbench / {platformStatus.version}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">分析工作台</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">在同一入口运行透明综合指标与 2015–2025 年度面板估计，并在十国横向对比中直接比较模型得分与核心观测。Network 仍在建设双边数据；VAR 与 Bayesian 因频率不足保持 blocked。</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/scenarios" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">Scenario presets</Link><Link href="/methodology#models" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Research methods</Link></div>
      </header>
      <AnalysisWorkbench countries={researchCountries} cards={modelCards} outputs={modelOutputs} />
      <section className="mt-14" aria-labelledby="cross-country-comparison-title">
        <header className="max-w-4xl border-b border-[var(--line)] pb-6">
          <p className="editorial-kicker">Cross-country comparison</p>
          <h2 id="cross-country-comparison-title" className="mt-3 text-3xl font-semibold">十国横向对比</h2>
          <p className="mt-4 text-base leading-8 text-[var(--muted)]">把同一模型下的十国结果并排比较，或用矩阵同时浏览国家 × 指标。所有数字直接来自已通过准入的观测和透明模型，解释边界保持不变。</p>
        </header>
        <ModelComparisonBoard cards={modelCards} outputs={modelOutputs} />
        <CountryComparisonMatrix rows={comparisonRows} />
      </section>
    </main>
  );
}
