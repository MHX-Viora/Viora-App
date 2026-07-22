import type { Conversation } from "@/types/chat";

type MessagePermissions = {
  canSendMessage: boolean;
  onlyAdminCanSend: boolean;
} | null;

type UseChatPermissionsParams = {
  conversationDetails: Conversation | null;
  isBlocked: boolean;
  messagePermissions: MessagePermissions;
  paramsConversationType?: string;
  paramsRole?: string;
};

export function useChatPermissions({
  conversationDetails,
  isBlocked,
  messagePermissions,
  paramsConversationType,
  paramsRole,
}: UseChatPermissionsParams) {
  const conversationType =
    conversationDetails?.conversationType ?? paramsConversationType ?? "Private";
  const routeRole = Number.parseInt(paramsRole ?? "0", 10);
  const currentUserRole =
    conversationDetails?.role ?? (Number.isNaN(routeRole) ? 0 : routeRole);
  const canAddMembers = conversationType === "Group";
  const hasGroupMessagePermission =
    conversationType !== "Group" || messagePermissions !== null;
  const canSendInConversation =
    conversationType === "Group"
      ? messagePermissions?.canSendMessage === true
      : messagePermissions?.canSendMessage ?? true;
  const shouldRenderComposer =
    isBlocked ||
    (conversationType === "Group" ? hasGroupMessagePermission : true);
  const showAdminOnlyMessage =
    conversationType === "Group" &&
    messagePermissions?.onlyAdminCanSend === true &&
    !canSendInConversation &&
    !isBlocked;

  return {
    canAddMembers,
    canSendInConversation,
    conversationType,
    currentUserRole,
    shouldRenderComposer,
    showAdminOnlyMessage,
  };
}
