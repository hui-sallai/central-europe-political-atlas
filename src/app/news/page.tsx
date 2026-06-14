import { NewsExplorer } from "@/components/NewsExplorer";

export default function NewsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Weekly Brief</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">国家级新闻周报</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        新闻模块只保存标题、来源链接、主题标签、语言和中文摘要，不保存新闻全文。民调、选举与区域数据不做每周更新。
      </p>
      <NewsExplorer />
    </main>
  );
}
