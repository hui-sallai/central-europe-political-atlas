import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalElectionViews } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "政治制度与选举", description: "德国2002—2025年联邦议会选举的官方第二票、席位、投票率及制度说明。", path: "/politics/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">政治制度与选举</h1><PoliticalExplorerAlpha elections={politicalElectionViews()} /></main>; }
