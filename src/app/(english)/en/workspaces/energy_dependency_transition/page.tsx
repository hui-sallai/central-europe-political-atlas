import { ThematicExplorer } from "@/components/ThematicExplorer";
import { thematicPageMetadata } from "@/components/ThematicEntryLinks";

const themeId = "energy_dependency_transition";
export const metadata = thematicPageMetadata(themeId, "en");

export default function Page() {
  return <ThematicExplorer themeId={themeId} locale="en" />;
}
