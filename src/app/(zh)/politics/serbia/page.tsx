import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { politicalSerbianComparisonCountries, politicalSerbianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "塞尔维亚议会选举", description: "塞尔维亚国民议会 2020、2022、2023 和 2026 年官方结果：各选举名单得票与席位、投票率及席位分配规则。", path: "/politics/serbia/", locale: "zh-CN" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="serbia" locale="zh-CN" title="塞尔维亚议会选举" /><PoliticalExplorerAlpha elections={politicalSerbianElectionViews()} comparisonCountries={politicalSerbianComparisonCountries()} contextInputs={politicalContextData("serbia")} /></main>; }
