export type ResponsiveChatMode =
  | "list"
  | "detail"
  | "split-empty"
  | "split-detail";

export type ResponsiveConversationSettingsMode =
  | "settings"
  | "split-settings"
  | "room-settings";

export const getResponsiveConversationSettingsMode = ({
  isDesktopWeb,
  isLargeDesktop,
}: {
  isDesktopWeb: boolean;
  isLargeDesktop: boolean;
}): ResponsiveConversationSettingsMode => {
  if (!isDesktopWeb) return "settings";
  return isLargeDesktop ? "room-settings" : "split-settings";
};

export const getDesktopConversationMenuTop = ({
  anchorY,
  viewportHeight,
}: {
  anchorY: number;
  viewportHeight: number;
}) => {
  const minimumTop = 80;
  const menuHeight = 320;
  const viewportGap = 16;
  const preferredTop = Number.isFinite(anchorY) ? anchorY - 32 : minimumTop;
  const maximumTop = Math.max(
    minimumTop,
    viewportHeight - menuHeight - viewportGap,
  );

  return Math.min(Math.max(preferredTop, minimumTop), maximumTop);
};

export const getResponsiveChatMode = ({
  hasConversation,
  isDesktopWeb,
}: {
  hasConversation: boolean;
  isDesktopWeb: boolean;
}): ResponsiveChatMode => {
  if (!isDesktopWeb) return hasConversation ? "detail" : "list";
  return hasConversation ? "split-detail" : "split-empty";
};

export const shouldAutoOpenConversationRoute = ({
  allowRequestedAutoOpen,
  openedConversationId,
  requestedConversationId,
}: {
  allowRequestedAutoOpen: boolean;
  openedConversationId: string;
  requestedConversationId: string;
}) =>
  allowRequestedAutoOpen &&
  Boolean(requestedConversationId) &&
  openedConversationId !== requestedConversationId;
