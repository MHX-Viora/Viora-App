import type { router } from "expo-router";

import type { NotificationItemModel } from "@/types/notification";

type AppRouter = typeof router;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getFriendNotificationTab = (notification: NotificationItemModel) => {
  const text = normalizeText(`${notification.title} ${notification.content}`);

  if (
    text.includes("loi moi ket ban") ||
    text.includes("yeu cau ket ban") ||
    text.includes("friendrequest")
  ) {
    return "requests";
  }

  if (
    text.includes("chap nhan ket ban") ||
    text.includes("chap nhan loi moi") ||
    text.includes("da ket ban") ||
    text.includes("friendaccepted")
  ) {
    return "friends";
  }

  return null;
};

const isReelNotification = (notification: NotificationItemModel) => {
  const text = normalizeText(`${notification.title} ${notification.content}`);
  return (
    text.includes("reel") ||
    text.includes("video") ||
    text.includes("short")
  );
};

export const navigateNotification = (
  notification: NotificationItemModel,
  appRouter: AppRouter,
) => {
  const friendTab = getFriendNotificationTab(notification);
  if (friendTab) {
    appRouter.push({ pathname: "/friends", params: { initialTab: friendTab } });
    return;
  }

  const reference = notification.reference;
  if (!reference) return;

  if (reference.type === 0) {
    appRouter.push({ pathname: "/users/[userId]", params: { userId: reference.id } });
    return;
  }

  if (reference.type === 5) {
    appRouter.push("/complete-profile");
    return;
  }

  if (reference.type === 3 || reference.type === 4) {
    appRouter.push({
      pathname: "/chat/[conversationId]",
      params: {
        conversationId: reference.id,
        scrollToMessageId: reference.id,
      },
    });
    return;
  }

  if (isReelNotification(notification)) {
    appRouter.push({
      pathname: "/reel/[reelId]",
      params: { reelId: reference.id },
    });
    return;
  }

  appRouter.push({
    pathname: "/post/[postId]",
    params: { postId: reference.id },
  });
};
