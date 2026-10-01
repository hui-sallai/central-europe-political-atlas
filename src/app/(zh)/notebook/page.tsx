import { ResearchNotebookPage } from "@/components/ResearchNotebookPage";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "研究笔记", description: "当前浏览器本地的证据收集与个人研究备注。", path: "/notebook/" });
export default function Page() { return <ResearchNotebookPage />; }
