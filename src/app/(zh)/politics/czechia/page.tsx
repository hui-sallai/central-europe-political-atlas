import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalCzechContinuity, politicalCzechElectionViews, politicalCzechIdentityLinks, politicalCzechComparisonCountries } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "捷克议会选举", description: "比较捷克众议院历届选举的官方名单票数、席位、投票率，以及各届适用的席位分配规则。", path: "/politics/czechia/" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="czechia" locale="zh-CN" title="捷克议会选举" /><PoliticalExplorerAlpha elections={politicalCzechElectionViews()} comparisonCountries={politicalCzechComparisonCountries()} contextInputs={politicalContextData("czechia")} identityLinks={politicalCzechIdentityLinks()} /><PoliticalContinuityPanel data={politicalCzechContinuity()} locale="zh-CN" /></main>; }
