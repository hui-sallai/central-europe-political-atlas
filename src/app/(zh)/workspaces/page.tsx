import {FeaturedResearchSection,HomeCoverageSection,HomeMethodologySection} from "@/components/HomeResearchDiscovery";
import { WorkspaceIndex } from "@/components/WorkspaceIndex";
import { workspaceMessages } from "@/content/workspaceMessages";
import { pageMetadata } from "@/lib/seo";
const m = workspaceMessages["zh-CN"];
export const metadata = pageMetadata({ title: m.title, description: m.intro, path: "/workspaces/" });
export default function Page() { return <WorkspaceIndex locale="zh-CN"><FeaturedResearchSection locale="zh-CN"/><HomeCoverageSection locale="zh-CN"/><HomeMethodologySection locale="zh-CN"/></WorkspaceIndex>; }
