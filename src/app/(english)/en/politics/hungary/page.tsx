import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalHungarianComparisonCountries, politicalHungarianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Hungarian parliamentary elections", description: "Official Hungarian National Assembly party-list and nationality-list votes, national list seats, turnout and electoral rules for 2022 and 2026.", path: "/en/politics/hungary/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Hungarian parliamentary elections</h1><PoliticalExplorerAlpha elections={politicalHungarianElectionViews()} comparisonCountries={politicalHungarianComparisonCountries()} contextInputs={politicalContextData("hungary")} /></main>; }
