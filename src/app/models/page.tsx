import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/AnalysisWorkbench";
import { CountryComparisonMatrix, type ComparisonMatrixData, type MatrixCell, type MatrixColumnMeta } from "@/components/CountryComparisonMatrix";
import { ModelComparisonBoard } from "@/components/ModelComparisonBoard";
import { ModelsPageTabs } from "@/components/ModelsPageTabs";
import { buildIndicatorComparisonColumn } from "@/lib/indicatorComparison";
import { buildModelComparison, type ModelComparisonResult } from "@/lib/modelComparisonGate";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries, researchEvents } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "分析工作台",
  description: "运行透明综合指标与年度面板估计，或在同年、同单位、同定义的十国横向对比中比较模型得分与核心观测。",
};

const matrixIndicatorIds = ["real_gdp_growth", "hicp_inflation", "unemployment_rate", "gdp_per_capita_eur"] as const;

function buildMatrixData(comparisons: ModelComparisonResult[]): ComparisonMatrixData {
  const indicatorColumns = matrixIndicatorIds.map((indicatorId) => buildIndicatorComparisonColumn(indicatorId, researchCountries));

  const columns: MatrixColumnMeta[] = [
    ...indicatorColumns.map((column) => ({
      id: column.indicator_id,
      label: column.label,
      kind: "indicator" as const,
      unit: column.unit,
      comparison_year: column.comparison_year,
      eligible_country_count: column.eligible_country_count,
      total_countries: column.total_countries,
      heat_enabled: column.heat_enabled,
      unavailability_note: column.unavailability_note,
    })),
    ...comparisons.map((comparison) => ({
      id: comparison.gate.model_id,
      label: comparison.gate.model_name_zh,
      kind: "model" as const,
      unit: "score",
      comparison_year: comparison.gate.comparison_year,
      eligible_country_count: comparison.gate.eligible_country_count,
      total_countries: comparison.gate.total_countries,
      heat_enabled: comparison.gate.comparison_year !== null && comparison.gate.eligible_country_count >= 2,
      unavailability_note: comparison.gate.comparison_year === null ? "comparison unavailable：该模型没有可比的共同年份。" : null,
    })),
  ];

  const rows = researchCountries.map((country) => {
    const cells: Record<string, MatrixCell> = {};
    for (const column of indicatorColumns) {
      cells[column.indicator_id] = column.values[country.slug] ?? { value: null, year: column.comparison_year, comparable: false };
    }
    for (const comparison of comparisons) {
      const output = comparison.eligible.find((item) => item.country_slug === country.slug);
      cells[comparison.gate.model_id] = {
        value: output?.score ?? null,
        year: comparison.gate.comparison_year,
        comparable: Boolean(output && output.score !== null),
      };
    }
    return { slug: country.slug, name_zh: country.name_zh, name: country.name, cells };
  });

  return { columns, rows };
}

export default function ModelsPage() {
  const comparisons = modelCards.map((card) => buildModelComparison(card, researchCountries));
  const matrixData = buildMatrixData(comparisons);

  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">分析工作台 / {platformStatus.version}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">分析工作台</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">在同一入口运行透明综合指标、年度面板估计、贸易网络分析与事件窗口分析，或切换到十国横向对比——正式比较只在同一版本、同一单位、同一输入年份下进行。VAR 与 Bayesian 因频率不足暂不可用。</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/scenarios" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">运行情景分析</Link><Link href="/methodology#models" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">查看方法说明</Link></div>
      </header>
      <Suspense fallback={<p className="mt-8 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载分析工作台…</p>}>
        <ModelsPageTabs
          runAnalysis={<AnalysisWorkbench countries={researchCountries} cards={modelCards} outputs={modelOutputs} events={researchEvents} />}
          compareCountries={
          <section aria-labelledby="cross-country-comparison-title">
            <header className="max-w-4xl border-b border-[var(--line)] pb-6">
              <p className="editorial-kicker">十国横向对比</p>
              <h2 id="cross-country-comparison-title" className="mt-3 text-3xl font-semibold">十国横向对比</h2>
              <p className="mt-4 text-base leading-8 text-[var(--muted)]">把同一模型、同一版本、同一输入年份下的十国结果并排比较，或用矩阵同时浏览国家 × 指标。不同年份的结果不会进入同一排名；未通过比较门控的国家单独列出并说明原因。</p>
            </header>
            <ModelComparisonBoard comparisons={comparisons} />
            <CountryComparisonMatrix data={matrixData} />
          </section>
          }
        />
      </Suspense>
    </main>
  );
}
