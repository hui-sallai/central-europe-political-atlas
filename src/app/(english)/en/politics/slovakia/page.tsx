import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalSlovakComparisonCountries, politicalSlovakElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Slovak parliamentary election", description: "Official Slovak National Council list votes, seats, turnout and electoral rules for 2023.", path: "/en/politics/slovakia/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Slovak parliamentary election</h1><PoliticalExplorerAlpha elections={politicalSlovakElectionViews()} comparisonCountries={politicalSlovakComparisonCountries()} contextInputs={politicalContextData("slovakia")} /></main>; }
