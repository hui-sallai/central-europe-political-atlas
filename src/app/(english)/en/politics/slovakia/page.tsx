import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { politicalSlovakComparisonCountries, politicalSlovakElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Slovak parliamentary election", description: "Official Slovak National Council list votes, seats, turnout and electoral rules for 2023.", path: "/en/politics/slovakia/", locale: "en" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="slovakia" locale="en" title="Slovak parliamentary election" /><PoliticalExplorerAlpha elections={politicalSlovakElectionViews()} comparisonCountries={politicalSlovakComparisonCountries()} contextInputs={politicalContextData("slovakia")} /></main>; }
