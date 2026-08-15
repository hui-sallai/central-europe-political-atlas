import { Suspense } from "react";
import { DataCountryExplorer } from "@/components/DataCountryExplorer";
import { CrossCountryParitySummary } from "@/components/CrossCountryParitySummary";
import { ChinaExposureCoverageMatrix } from "@/components/ChinaExposureCoverageMatrix";
import { ModelObservationUsage } from "@/components/ModelObservationUsage";
import { RegionalCoverageMatrix } from "@/components/RegionalCoverageMatrix";
import { StatusSummary } from "@/components/StatusSummary";
import { TransmissionDataSummary } from "@/components/TransmissionDataSummary";
import { platformStatus } from "@/lib/platformStatus";
import { chinaEvidenceCoverageMatrix, chinaExposureCoverageAudit, chinaExposureRankingGate, chinaSectorLinkageMatrix, chinaTradeHistoricalSeries } from "@/lib/chinaExposureModel";

export default function DataOverviewPage() {
  return (
    <main className="page-shell data-page-shell">
      <p className="eyebrow">Data Workspace / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">数据工作台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        先选择国家，再查看基础宏观数据、十国统一扩展指标、对华经贸项目与来源。区域结构、字典、质量验收和导出记录保留在“结构与字典”中，默认不展开。
      </p>
      <div className="mt-5">
        <StatusSummary
          columns="three"
          items={[
            { label: "默认视图", value: "国家选择 + 宏观经济数据" },
            { label: "研究数据层", value: "17 个逻辑层保留，按需展开" },
            { label: "空间研究", value: "v0.88 支持年份、同层级比较、事实排名与 Data → Map" },
          ]}
        />
      </div>
      <Suspense fallback={<div className="mt-5 card p-6 text-sm text-[var(--muted)]">正在读取模型输入追踪…</div>}>
        <ModelObservationUsage />
      </Suspense>
      <TransmissionDataSummary />
      <CrossCountryParitySummary />
      <ChinaExposureCoverageMatrix matrix={chinaEvidenceCoverageMatrix} audit={chinaExposureCoverageAudit} history={chinaTradeHistoricalSeries} sectors={chinaSectorLinkageMatrix} rankingGate={chinaExposureRankingGate} />
      <RegionalCoverageMatrix />
      <DataCountryExplorer />
    </main>
  );
}
