import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalCzechContinuity, politicalCzechElectionViews, politicalCzechIdentityLinks, politicalGermanComparisonCountry } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Czech parliamentary elections", description: "Official Czech Chamber of Deputies list votes, seats, turnout and electoral rules for 2017, 2021 and 2025.", path: "/en/politics/czechia/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Czech parliamentary elections</h1><PoliticalExplorerAlpha elections={politicalCzechElectionViews()} comparisonCountries={politicalGermanComparisonCountry()} identityLinks={politicalCzechIdentityLinks()} /><PoliticalContinuityPanel data={politicalCzechContinuity()} locale="en" /></main>; }
