// Browser push is intentionally not registered here. In-app notifications
// continue to arrive through the existing API and SignalR connection.
export const registerPushNotifications = async (): Promise<null> => null;
export const setupNotificationHandling = () => undefined;

export const setupNotificationResponseHandling = () => undefined;

export const setupPushTokenRefreshHandling = () => undefined;

export const unregisterCurrentDevicePushToken = async (): Promise<void> =>
  undefined;
