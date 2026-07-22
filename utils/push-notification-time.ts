export const getCurrentNotificationData = (
  data: Record<string, unknown>,
): Record<string, unknown> => ({
  ...data,
  createdAt: new Date().toISOString(),
  sentTime: Date.now(),
  timestamp: Date.now(),
});
