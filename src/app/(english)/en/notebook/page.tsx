import { ResearchNotebookPage } from "@/components/ResearchNotebookPage";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Research Notebook", description: "Browser-local evidence collection and personal research notes.", path: "/en/notebook/", locale: "en" });
export default function Page() { return <ResearchNotebookPage />; }
