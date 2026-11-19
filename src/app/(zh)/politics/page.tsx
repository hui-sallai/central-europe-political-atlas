import { PoliticalLanding } from "@/components/PoliticalLanding";
import { electionDirectory } from "@/lib/politicalElectionDirectory.server";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "政治制度与选举", description: "按国家、议院与选票范围查阅议会选举，查看选举日期、席位、投票率、当届选举规则与官方来源。", path: "/politics/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">议会选举研究</p><h1 className="mt-4 mb-6 text-4xl font-semibold">政治制度与选举</h1><PoliticalLanding countries={electionDirectory()}/></main>; }
