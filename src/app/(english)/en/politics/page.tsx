import PoliticalExplorerAlpha from "@/components/PoliticalExplorerAlpha";
import { politicalElectionViews } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Politics and Elections", description: "Official German Bundestag second votes, seats, turnout and electoral-system disclosures for 2002–2025.", path: "/en/politics/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Political Explorer Alpha</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Politics and Elections</h1><PoliticalExplorerAlpha elections={politicalElectionViews()} /></main>; }
