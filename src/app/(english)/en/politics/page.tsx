import { PoliticalLanding } from "@/components/PoliticalLanding";
import { electionDirectory } from "@/lib/politicalElectionDirectory.server";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Politics and Elections", description: "Explore parliamentary elections by country, chamber and ballot. Inspect election dates, seats, turnout, electoral rules and official sources.", path: "/en/politics/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Parliamentary elections</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Politics and Elections</h1><PoliticalLanding countries={electionDirectory()}/></main>; }
