import { DataLayerOverview } from "@/components/DataLayerOverview";
import { DataCountryExplorer } from "@/components/DataCountryExplorer";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";

export default function DataOverviewPage() {
  return (
    <main className="page-shell data-page-shell">
      <p className="eyebrow">Data Workspace</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">数据工作台</h1>
      <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
        数据页改为按国家单独查看。先选择国家，再查看该国宏观经济、官方来源、地图图层、对华经贸样本、新闻记录和资料入口。
      </p>
      <div className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--muted)]">
        当前阶段：v0.9 beta / regions + region_boundaries 区域层准备 / 模型层未启用
      </div>

      <section className="mt-6">
        <DataLayerOverview title="数据工作台层级总览" />
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/45 p-4 text-sm leading-7 text-[var(--muted)]">
        <div className="mb-2 flex flex-wrap gap-2">
          <DataStatusBadge status="pending" />
          <SourceStatusBadge status="manual" />
        </div>
        对华经贸项目目前只保留研究入口和人工整理字段，贸易额、企业、地区和年份仍待量化；本页把每个国家作为独立数据档案维护。
      </section>

      <DataCountryExplorer />
    </main>
  );
}
