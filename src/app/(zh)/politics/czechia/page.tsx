import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalCzechContinuity, politicalCzechElectionViews, politicalCzechIdentityLinks, politicalCzechComparisonCountries } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "捷克议会选举", description: "捷克 2017、2021、2025 年众议院选举的官方名单票、席位、投票率及选举规则。", path: "/politics/czechia/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">捷克议会选举</h1><PoliticalExplorerAlpha elections={politicalCzechElectionViews()} comparisonCountries={politicalCzechComparisonCountries()} identityLinks={politicalCzechIdentityLinks()} /><PoliticalContinuityPanel data={politicalCzechContinuity()} locale="zh-CN" /></main>; }
