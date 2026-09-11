export const isMessageFromCurrentUser = (
  senderId: string | null | undefined,
  currentUserId: string | null | undefined,
) =>
  Boolean(
    senderId &&
      currentUserId &&
      senderId.toLowerCase() === currentUserId.toLowerCase(),
  );
