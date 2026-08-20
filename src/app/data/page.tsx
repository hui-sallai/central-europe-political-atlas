import type { Metadata } from "next";
import { DataExplorerV11 } from "@/components/DataExplorerV11";
import { researchCountries, researchIndicators, researchObservations } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "Data Explorer",
  description: "按国家、指标与年份浏览可追溯观测值并下载研究数据。",
};

export default function DataPage() {
  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">Data Explorer</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">研究数据浏览</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">按国家、指标和年份读取正式观测值、单位、来源与状态。字段字典、覆盖矩阵、传导输入和 QA 记录保留在高级下载层，不再占据公开页面主体。</p>
      </header>
      <DataExplorerV11 countries={researchCountries} indicators={researchIndicators} observations={researchObservations} />
    </main>
  );
}
