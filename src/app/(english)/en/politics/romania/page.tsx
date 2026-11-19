import { PoliticalBallotExplorer } from "@/components/PoliticalBallotExplorer";
import { politicalBallotElections } from "@/lib/politicalBallots";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Romanian parliamentary elections", description: "Official results by election and ballot, with seat composition, turnout, historical rules and sources.", path: "/en/politics/romania/", locale: "en" });

export default function Page() {
  return <PoliticalBallotExplorer country="romania" locale="en" elections={politicalBallotElections("romania")}/>;
}
