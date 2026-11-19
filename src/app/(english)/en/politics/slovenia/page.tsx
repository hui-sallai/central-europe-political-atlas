import { PoliticalBallotExplorer } from "@/components/PoliticalBallotExplorer";
import { politicalBallotElections } from "@/lib/politicalBallots";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Slovenian National Assembly elections", description: "Official results by election and ballot, with seat composition, turnout, historical rules and sources.", path: "/en/politics/slovenia/", locale: "en" });

export default function Page() {
  return <PoliticalBallotExplorer country="slovenia" locale="en" elections={politicalBallotElections("slovenia")}/>;
}
