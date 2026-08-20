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
      <header className="max-w-4xl border-b border-[var(--line)] pb-8">
        <p className="editorial-kicker">Political Economy Event Library / {platformStatus.version}</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">政治经济事件库</h1>
        <p className="mt-5 text-base leading-8 text-[var(--muted)]">将官方公告与可核验新闻整理成政治经济事件，连接国家、主题、指标和项目。事件编码用于研究索引与解释，不等于预测或因果判断。</p>
      </header>
      <NewsExplorer />
    </main>
  );
}
