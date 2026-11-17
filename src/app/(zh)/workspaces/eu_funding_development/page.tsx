import { ThematicExplorer } from "@/components/ThematicExplorer";
import { thematicPageMetadata } from "@/components/ThematicEntryLinks";

const themeId = "eu_funding_development";
export const metadata = thematicPageMetadata(themeId, "zh-CN");

export default function Page() {
  return <ThematicExplorer themeId={themeId} locale="zh-CN" />;
}
