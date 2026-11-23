import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalCzechContinuity, politicalCzechElectionViews, politicalCzechIdentityLinks, politicalCzechComparisonCountries } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Czech parliamentary elections", description: "Compare Czech Chamber of Deputies elections across time using official list votes, seat totals, turnout and the allocation rules for each election.", path: "/en/politics/czechia/", locale: "en" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="czechia" locale="en" title="Czech parliamentary elections" /><PoliticalExplorerAlpha elections={politicalCzechElectionViews()} comparisonCountries={politicalCzechComparisonCountries()} contextInputs={politicalContextData("czechia")} identityLinks={politicalCzechIdentityLinks()} /><PoliticalContinuityPanel data={politicalCzechContinuity()} locale="en" /></main>; }
