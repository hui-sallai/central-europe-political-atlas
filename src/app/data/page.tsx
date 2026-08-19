import type { Metadata } from "next";
import { DataWorkspaceClient } from "@/components/DataWorkspaceClient";
import { StatusSummary } from "@/components/StatusSummary";
import { platformStatus } from "@/lib/platformStatus";

export const metadata: Metadata = {
  title: "研究数据工作台",
  description: "十国观测值、指标字典、来源字典、项目、区域数据和质量验收入口。",
};

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
            { label: "发布状态", value: "验证启用；引用与导出结构可用" },
          ]}
        />
      </div>
      <DataWorkspaceClient />
    </main>
  );
}
