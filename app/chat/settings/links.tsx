import { ResponsiveContent } from "@/components/layout/responsive-content";
import { ConversationLinksScreen } from "@/features/chat/conversation-links-screen";
import { layout } from "@/theme";

export default function ConversationLinksRoute() {
  return (
    <ResponsiveContent maxWidth={layout.chatSettingsSubpageMaxWidth}>
      <ConversationLinksScreen />
    </ResponsiveContent>
  );
}
