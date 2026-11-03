import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalSlovakComparisonCountries, politicalSlovakElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "斯洛伐克议会选举", description: "斯洛伐克 2023 年国民议会选举的官方名单票、席位、投票率及选举规则。", path: "/politics/slovakia/" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">斯洛伐克议会选举</h1><PoliticalExplorerAlpha elections={politicalSlovakElectionViews()} comparisonCountries={politicalSlovakComparisonCountries()} contextInputs={politicalContextData("slovakia")} /></main>; }
