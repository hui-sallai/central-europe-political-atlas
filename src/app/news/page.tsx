import type { Metadata } from "next";
import { NewsExplorer } from "@/components/NewsExplorer";
import { platformStatus } from "@/lib/platformStatus";

export const metadata: Metadata = {
  title: "政治经济事件库",
  description: "经核验事件、编码字段、相关指标、项目和情景解释链。",
};

export default function NewsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Political Economy Event Library / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">政治经济事件库</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        将经核验的新闻与官方公告转成可追溯事件记录，并连接现有指标与项目。事件编码不是预测；未完成编码、低置信度或结构样例记录一律保持 enters_model=false。
      </p>
      <NewsExplorer />
    </main>
  );
}
