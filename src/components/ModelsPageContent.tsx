import Link from "next/link";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { Suspense } from "react";
import { AnalysisWorkbench } from "@/components/AnalysisWorkbench";
import { CountryComparisonMatrix, type ComparisonMatrixData, type MatrixCell, type MatrixColumnMeta } from "@/components/CountryComparisonMatrix";
import { ModelComparisonBoard } from "@/components/ModelComparisonBoard";
import { ModelsPageTabs } from "@/components/ModelsPageTabs";
import { buildIndicatorComparisonColumn } from "@/lib/indicatorComparison";
import { buildModelComparison, type ModelComparisonResult } from "@/lib/modelComparisonGate";
import { modelCards, modelOutputs } from "@/lib/modelFramework";
import { eventMechanismRecords } from "@/lib/eventMechanismResearch.server";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries, researchEvents, researchIndicators, researchObservations } from "@/lib/researchData";
import { NationalComparisonWorkspace } from "./NationalComparisonWorkspace";
import { monthlyComparisonData } from "@/lib/monthlyComparisonData.server";
import { KickerVersion } from "@/components/KickerVersion";


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

export function ModelsPageContent() {
  const comparisons = modelCards.map((card) => buildModelComparison(card, researchCountries));
  const matrixData = buildMatrixData(comparisons);

  return <LocalizedContent labels={{"选择研究方法，查看其问题、已准入输入、结果与限制。也可直接比较国家经济观测。正式 VAR 动态响应与 IRF 仍禁止发布；受限方法不会因页面改版而开放。":"Choose a research method to inspect its question, admitted inputs, results and limitations, or compare national economic observations. Formal VAR dynamic responses and IRFs remain blocked; this interface does not open restricted methods.","自行选择指标、2–10 个国家与时期。同口径比较只使用共同实际观测；不兼容定义可明确选择描述性并列。模型结果及其独立限制保留在下方研究详情。":"Choose an indicator, 2–10 countries and a period. Harmonized comparisons use actual common observations; explicitly select descriptive side-by-side for incompatible definitions. Existing model results and their separate restrictions remain in research details below."}}>{(
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">分析工作台 / <KickerVersion version={platformStatus.version} /></p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">分析工作台</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">选择研究方法，查看其问题、已准入输入、结果与限制。也可直接比较国家经济观测。正式 VAR 动态响应与 IRF 仍禁止发布；受限方法不会因页面改版而开放。</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/scenarios" className="rounded-lg cta-dark px-4 py-2 text-sm font-semibold">运行情景分析</Link><Link href="/methodology#models" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">查看方法说明</Link></div>
      </header>
      <Suspense fallback={<p className="mt-8 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载分析工作台…</p>}>
        <ModelsPageTabs
          runAnalysis={<AnalysisWorkbench countries={researchCountries} cards={modelCards} outputs={modelOutputs} events={researchEvents} mechanisms={eventMechanismRecords()} />}
          compareCountries={
          <section aria-labelledby="cross-country-comparison-title">
            <header className="max-w-4xl border-b border-[var(--line)] pb-6">
              <p className="editorial-kicker">指标与综合指数比较</p>
              <h2 id="cross-country-comparison-title" className="mt-3 text-3xl font-semibold">指标与综合指数比较</h2>
              <p className="mt-4 text-base leading-8 text-[var(--muted)]">自行选择指标、2–10 个国家与时期。同口径比较只使用共同实际观测；不兼容定义可明确选择描述性并列。模型结果及其独立限制保留在下方研究详情。</p>
            </header>
            <NationalComparisonWorkspace countries={researchCountries} indicators={researchIndicators} observations={researchObservations} payload={monthlyComparisonData()}/>
            <details className="mt-6"><summary className="cursor-pointer font-semibold">已发布模型结果的比较与方法限制</summary><ModelComparisonBoard comparisons={comparisons}/><CountryComparisonMatrix data={matrixData}/></details>
          </section>
          }
        />
      </Suspense>
    </main>
  )}</LocalizedContent>;
}
