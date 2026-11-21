import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalCzechContinuity, politicalCzechElectionViews, politicalCzechIdentityLinks, politicalCzechComparisonCountries } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Czech parliamentary elections", description: "Compare Czech Chamber of Deputies elections across time using official list votes, seat totals, turnout and the allocation rules for each election.", path: "/en/politics/czechia/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Czech parliamentary elections</h1><PoliticalExplorerAlpha elections={politicalCzechElectionViews()} comparisonCountries={politicalCzechComparisonCountries()} contextInputs={politicalContextData("czechia")} identityLinks={politicalCzechIdentityLinks()} /><PoliticalContinuityPanel data={politicalCzechContinuity()} locale="en" /></main>; }
