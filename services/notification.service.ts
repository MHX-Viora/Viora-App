import { mapNotificationsPage } from "@/features/notifications/notification.mapper";
import { authenticatedFetch } from "@/services/authenticated-fetch";
import type { NotificationsPage, NotificationsQuery } from "@/types/notification";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const parseResponseText = (text: string): unknown => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;
  if (isRecord(data) && typeof data.message === "string") return data.message;
  if (isRecord(data) && typeof data.title === "string") return data.title;
  return fallback;
};

export const getNotifications = async (
  query: NotificationsQuery,
): Promise<NotificationsPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  if (query.isRead !== undefined) params.set("isRead", String(query.isRead));
  if (query.type !== undefined) params.set("type", String(query.type));

  const response = await authenticatedFetch(
    `${BASE_URL}/api/notifications?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tải thông báo."));
  }

  return mapNotificationsPage(data);
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/notifications/${id}/read`,
    { method: "PUT" },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể đánh dấu đã đọc."));
  }
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/notifications/read-all`,
    { method: "PUT" },
  );
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể đánh dấu tất cả đã đọc."));
  }
};
