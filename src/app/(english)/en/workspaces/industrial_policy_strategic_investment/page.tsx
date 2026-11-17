import { ThematicExplorer } from "@/components/ThematicExplorer";
import { thematicPageMetadata } from "@/components/ThematicEntryLinks";

const themeId = "industrial_policy_strategic_investment";
export const metadata = thematicPageMetadata(themeId, "en");

export default function Page() {
  return <ThematicExplorer themeId={themeId} locale="en" />;
}
