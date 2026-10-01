import { pageMetadata } from "@/lib/seo";
import { NewsExplorer } from "@/components/NewsExplorer";
export const metadata = pageMetadata({ locale: "en", path: "/en/news/", title: "Political economy events", description: "Verified event records, research coding, original sources and descriptive event-window links." });
export default function EnglishEvents() {
  return <main className="page-shell"><header className="max-w-4xl border-b border-[var(--line)] pb-8"><p className="editorial-kicker">Political Economy Event Library</p><h1 className="mt-4 text-5xl font-semibold">Political economy events</h1><p className="mt-5 leading-8 text-[var(--muted)]">Official announcements and verifiable reporting are organised as research records connecting countries, topics, indicators and projects. Event coding is an index and interpretive aid, not a prediction or causal judgement.</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">Original event summaries, topics, actor names and source names remain in Chinese and are explicitly marked as untranslated. Search may require original Chinese terms. No political summary is automatically translated.</p></header><NewsExplorer /></main>;
}
