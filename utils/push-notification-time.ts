export const getCurrentNotificationData = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const notificationData: Record<string, unknown> = {
    ...data,
    createdAt: new Date().toISOString(),
  };

  // These generic keys can be interpreted as the notification's system time.
  // Milliseconds treated as another unit produce dates thousands of years away.
  delete notificationData.sentTime;
  delete notificationData.timestamp;

  return notificationData;
};
