import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { PoliticalCountryHeader } from "@/components/PoliticalCountryHeader";
import { PoliticalContinuityPanel } from "@/components/PoliticalContinuityPanel";
import { politicalPolishComparisonCountries, politicalPolishContinuity, politicalPolishElectionViews, politicalPolishIdentityLinks } from "@/lib/politicalData";
import { politicalContextData } from "@/lib/politicalContextData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Polish parliamentary elections", description: "Official Polish Sejm list votes, seats, turnout and electoral rules for 2011, 2015, 2019 and 2023.", path: "/en/politics/poland/", locale: "en" });
export default function Page() { return <main className="page-shell"><PoliticalCountryHeader country="poland" locale="en" title="Polish parliamentary elections" /><PoliticalExplorerAlpha elections={politicalPolishElectionViews()} comparisonCountries={politicalPolishComparisonCountries()} contextInputs={politicalContextData("poland")} identityLinks={politicalPolishIdentityLinks()} /><PoliticalContinuityPanel data={politicalPolishContinuity()} locale="en" country="poland" /></main>; }
