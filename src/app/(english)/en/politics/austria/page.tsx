import { PoliticalBallotExplorer } from "@/components/PoliticalBallotExplorer";
import { politicalBallotElections } from "@/lib/politicalBallots";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Austria’s Nationalrat elections", description: "Official results by election and ballot, with seat composition, turnout, historical rules and sources.", path: "/en/politics/austria/", locale: "en" });

export default function Page() {
  return <PoliticalBallotExplorer country="austria" locale="en" elections={politicalBallotElections("austria")}/>;
}
