import { ResponsiveContent } from "@/components/layout/responsive-content";
import { ConversationSearchScreen } from "@/features/chat/conversation-search-screen";
import { layout } from "@/theme";

export default function ConversationSearchRoute() {
  return (
    <ResponsiveContent maxWidth={layout.chatSettingsSubpageMaxWidth}>
      <ConversationSearchScreen />
    </ResponsiveContent>
  );
}
