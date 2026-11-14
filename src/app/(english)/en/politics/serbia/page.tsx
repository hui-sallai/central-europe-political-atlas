import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalSerbianComparisonCountries, politicalSerbianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Serbian parliamentary elections", description: "Official Serbian National Assembly results for 2020 and 2026: votes and seats per electoral list, turnout and the seat-allocation rules.", path: "/en/politics/serbia/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Serbian parliamentary elections</h1><PoliticalExplorerAlpha elections={politicalSerbianElectionViews()} comparisonCountries={politicalSerbianComparisonCountries()} contextInputs={politicalContextData("serbia")} /></main>; }
