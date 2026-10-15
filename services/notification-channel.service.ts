import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_SOUND_FILE } from "./notification-sound";

export const ensureNotificationSoundChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.HIGH,
    name: "Thông báo ANKT",
    sound: NOTIFICATION_SOUND_FILE,
    vibrationPattern: [0, 180],
  });
};

export const notificationSoundTrigger = () => Platform.OS === "android"
  ? { channelId: NOTIFICATION_CHANNEL_ID }
  : null;
