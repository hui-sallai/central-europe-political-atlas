import { PoliticalBallotExplorer } from "@/components/PoliticalBallotExplorer";
import { politicalBallotElections } from "@/lib/politicalBallots";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "罗马尼亚议会选举", description: "按选举与选票范围查看官方结果、席位构成、投票率、当届规则与来源。", path: "/politics/romania/", locale: "zh-CN" });

export default function Page() {
  return <PoliticalBallotExplorer country="romania" locale="zh-CN" elections={politicalBallotElections("romania")}/>;
}
