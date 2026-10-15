import { CHAT_SOUND_CHANNEL_ID } from "./notification-sound";
import { playNotificationSound } from "./notification-sound.service";
export const CHAT_NOTIFICATION_CHANNEL_ID = CHAT_SOUND_CHANNEL_ID;
export const showRichChatNotification = async (
  input: Record<string, unknown>,
): Promise<void> => playNotificationSound(typeof input.messageId === "string" ? input.messageId : undefined);
