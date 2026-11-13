import {FeaturedResearchSection,HomeCoverageSection,HomeMethodologySection} from "@/components/HomeResearchDiscovery";
import { WorkspaceIndex } from "@/components/WorkspaceIndex";
import { workspaceMessages } from "@/content/workspaceMessages";
import { pageMetadata } from "@/lib/seo";
const m = workspaceMessages.en;
export const metadata = pageMetadata({ title: m.title, description: m.intro, path: "/en/workspaces/", locale: "en" });
export default function Page() { return <WorkspaceIndex locale="en"><FeaturedResearchSection locale="en"/><HomeCoverageSection locale="en"/><HomeMethodologySection locale="en"/></WorkspaceIndex>; }
