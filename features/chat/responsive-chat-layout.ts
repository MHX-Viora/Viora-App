export type ResponsiveChatMode =
  | "list"
  | "detail"
  | "split-empty"
  | "split-detail"
  | "split-detail-settings";

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
  isLargeDesktop,
}: {
  hasConversation: boolean;
  isDesktopWeb: boolean;
  isLargeDesktop: boolean;
}): ResponsiveChatMode => {
  if (!isDesktopWeb) return hasConversation ? "detail" : "list";
  if (!hasConversation) return "split-empty";
  return isLargeDesktop ? "split-detail-settings" : "split-detail";
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
