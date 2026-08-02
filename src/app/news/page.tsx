import { NewsExplorer } from "@/components/NewsExplorer";

export default function NewsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Event Library</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">事件库</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        事件库把经核验的新闻摘要转成可追溯的事件输入。当前保留来源、摘要和编码状态；未完成 actor、direction、intensity、confidence 等字段前，一律不进入模型。
      </p>
      <NewsExplorer />
    </main>
  );
}
