import { ResponsiveContent } from "@/components/layout/responsive-content";
import { ConversationAttachmentsScreen } from "@/features/chat/conversation-attachments-screen";
import { layout } from "@/theme";

export default function ConversationAttachmentsRoute() {
  return (
    <ResponsiveContent maxWidth={layout.chatSettingsSubpageMaxWidth}>
      <ConversationAttachmentsScreen />
    </ResponsiveContent>
  );
}
