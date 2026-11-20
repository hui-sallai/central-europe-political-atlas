import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalHungarianComparisonCountries, politicalHungarianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "匈牙利议会选举", description: "查看匈牙利国会选举改革前后的投票轮次、投票率、各类选票、最终席位分配与官方来源。", path: "/politics/hungary/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">匈牙利议会选举</h1><PoliticalExplorerAlpha elections={politicalHungarianElectionViews()} comparisonCountries={politicalHungarianComparisonCountries()} contextInputs={politicalContextData("hungary")} /></main>; }
