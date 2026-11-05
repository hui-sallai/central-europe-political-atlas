import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalHungarianComparisonCountries, politicalHungarianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "匈牙利议会选举", description: "匈牙利 2022、2026 年国会选举的官方政党名单票、民族名单票、全国名单席位、投票率及选举规则。", path: "/politics/hungary/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">匈牙利议会选举</h1><PoliticalExplorerAlpha elections={politicalHungarianElectionViews()} comparisonCountries={politicalHungarianComparisonCountries()} contextInputs={politicalContextData("hungary")} /></main>; }
