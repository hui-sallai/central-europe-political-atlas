import { PoliticalLanding } from "@/components/PoliticalLanding";
import { politicalComparisonCountries, politicalElectionViews } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "政治制度与选举", description: "德国、捷克、波兰、斯洛伐克与匈牙利的已核验议会选举与制度说明。", path: "/politics/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">议会选举研究</p><h1 className="mt-4 mb-6 text-4xl font-semibold">政治制度与选举</h1><PoliticalLanding countries={[{slug:"germany",name:{en:"Germany","zh-CN":"德国"},elections:politicalElectionViews()},...politicalComparisonCountries()]}/></main>; }
