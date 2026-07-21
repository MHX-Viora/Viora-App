const claimedMessages = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;

export const claimChatNotification = (messageId: string) => {
  if (!messageId.trim()) return true;

  const now = Date.now();
  const lastClaimedAt = claimedMessages.get(messageId) ?? 0;
  claimedMessages.set(messageId, now);

  for (const [id, claimedAt] of claimedMessages) {
    if (now - claimedAt > DEDUPE_WINDOW_MS) claimedMessages.delete(id);
  }

  return now - lastClaimedAt >= DEDUPE_WINDOW_MS;
};
