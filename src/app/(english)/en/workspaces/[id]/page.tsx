import { notFound } from "next/navigation";
import { researchWorkspaces } from "@/content/researchWorkspaces";
import { ResearchWorkspace } from "@/components/ResearchWorkspace";
import { buildWorkspaceEvidence } from "@/components/workspaceEvidence";
import { pageMetadata } from "@/lib/seo";
export const dynamicParams = false;
export function generateStaticParams() { return researchWorkspaces.map(({ id }) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const workspace = researchWorkspaces.find(row => row.id === id); if (!workspace) notFound();
  return pageMetadata({ title: workspace.title.en, description: workspace.introduction.en, path: `/en/workspaces/${id}/`, locale: "en" });
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const workspace = researchWorkspaces.find(row => row.id === id); if (!workspace) notFound();
  return <ResearchWorkspace payload={buildWorkspaceEvidence(workspace, "en")} locale="en" />;
}
