import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { politicalHungarianComparisonCountries, politicalHungarianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "匈牙利议会选举", description: "查看匈牙利国会选举改革前后的投票轮次、投票率、各类选票、最终席位分配与官方来源。", path: "/politics/hungary/" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="hungary" locale="zh-CN" title="匈牙利议会选举" /><PoliticalExplorerAlpha elections={politicalHungarianElectionViews()} comparisonCountries={politicalHungarianComparisonCountries()} contextInputs={politicalContextData("hungary")} /></main>; }
