import { notFound } from "next/navigation";
import { researchWorkspaces } from "@/content/researchWorkspaces";
import { ResearchWorkspace } from "@/components/ResearchWorkspace";
import { buildWorkspaceEvidence } from "@/components/workspaceEvidence";
import { pageMetadata } from "@/lib/seo";
export const dynamicParams = false;
export function generateStaticParams() { return researchWorkspaces.map(({ id }) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const workspace = researchWorkspaces.find(row => row.id === id); if (!workspace) notFound();
  return pageMetadata({ title: workspace.title["zh-CN"], description: workspace.introduction["zh-CN"], path: `/workspaces/${id}/` });
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const workspace = researchWorkspaces.find(row => row.id === id); if (!workspace) notFound();
  return <ResearchWorkspace payload={buildWorkspaceEvidence(workspace, "zh-CN")} locale="zh-CN" />;
}
