import { ResponsiveContent } from "@/components/layout/responsive-content";
import { GroupMembersScreen } from "@/features/chat/group-members-screen";
import { layout } from "@/theme";

export default function GroupMembersRoute() {
  return (
    <ResponsiveContent maxWidth={layout.chatSettingsSubpageMaxWidth}>
      <GroupMembersScreen />
    </ResponsiveContent>
  );
}
