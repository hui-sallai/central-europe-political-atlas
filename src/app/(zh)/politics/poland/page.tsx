import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalPolishComparisonCountries, politicalPolishContinuity, politicalPolishElectionViews, politicalPolishIdentityLinks } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "波兰议会选举", description: "波兰 2011、2015、2019、2023 年众议院选举的官方名单票、席位、投票率及选举规则。", path: "/politics/poland/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">波兰议会选举</h1><PoliticalExplorerAlpha elections={politicalPolishElectionViews()} comparisonCountries={politicalPolishComparisonCountries()} contextInputs={politicalContextData("poland")} identityLinks={politicalPolishIdentityLinks()} /><PoliticalContinuityPanel data={politicalPolishContinuity()} locale="zh-CN" country="poland" /></main>; }
