import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { politicalHungarianComparisonCountries, politicalHungarianElectionViews } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Hungarian parliamentary elections", description: "Explore Hungarian parliamentary elections across the 2010 and post-reform systems, with round-specific turnout, ballot results, final seats and official sources.", path: "/en/politics/hungary/", locale: "en" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="hungary" locale="en" title="Hungarian parliamentary elections" /><PoliticalExplorerAlpha elections={politicalHungarianElectionViews()} comparisonCountries={politicalHungarianComparisonCountries()} contextInputs={politicalContextData("hungary")} /></main>; }
