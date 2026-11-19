import { PoliticalBallotExplorer } from "@/components/PoliticalBallotExplorer";
import { politicalBallotElections } from "@/lib/politicalBallots";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "奥地利国民议会选举", description: "按选举与选票范围查看官方结果、席位构成、投票率、当届规则与来源。", path: "/politics/austria/", locale: "zh-CN" });

export default function Page() {
  return <PoliticalBallotExplorer country="austria" locale="zh-CN" elections={politicalBallotElections("austria")}/>;
}
