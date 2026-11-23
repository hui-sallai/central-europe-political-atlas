import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { politicalSerbianComparisonCountries, politicalSerbianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Serbian parliamentary elections", description: "Official Serbian National Assembly results for 2020, 2022, 2023 and 2026: votes and seats per electoral list, turnout and the seat-allocation rules.", path: "/en/politics/serbia/", locale: "en" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="serbia" locale="en" title="Serbian parliamentary elections" /><PoliticalExplorerAlpha elections={politicalSerbianElectionViews()} comparisonCountries={politicalSerbianComparisonCountries()} contextInputs={politicalContextData("serbia")} /></main>; }
