import type {
  NotificationItemModel,
  NotificationPayload,
  NotificationReference,
  NotificationReferenceType,
  NotificationSender,
  NotificationsPage,
} from "@/types/notification";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const isReferenceType = (value: number): value is NotificationReferenceType =>
  value >= 0 && value <= 5;

const mapSender = (value: unknown): NotificationSender | null => {
  if (!isRecord(value)) return null;

  return {
    avatarUrl: toString(value.avatarUrl),
    displayName: toString(value.displayName, "Viora"),
    id: toString(value.id),
    isVerified: value.isVerified === true,
  };
};

const mapReference = (value: unknown): NotificationReference | null => {
  if (!isRecord(value)) return null;

  const type = toNumber(value.type, -1);
  if (!isReferenceType(type)) return null;

  return {
    id: toString(value.id),
    type,
  };
};

const mapFlatReference = (value: Record<string, unknown>): NotificationReference | null => {
  const id = toString(value.referenceId);
  const type = toNumber(value.referenceType, -1);

  if (!id || !isReferenceType(type)) return null;

  return { id, type };
};

export const mapNotification = (value: unknown): NotificationItemModel => {
  if (!isRecord(value)) {
    throw new Error("Phản hồi thông báo không hợp lệ.");
  }

  return {
    content: toString(value.content),
    createdAt: toString(value.createdAt),
    id: toString(value.id, toString(value.notificationId)),
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : null,
    isRead: value.isRead === true || value.read === true,
    reference: mapReference(value.reference) ?? mapFlatReference(value),
    sender: mapSender(value.sender),
    title: toString(value.title, "Thông báo"),
    type: toNumber(value.type, toNumber(value.notificationType)),
  };
};

export const mapNotificationsPage = (value: unknown): NotificationsPage => {
  const page = isRecord(value) && isRecord(value.data) ? value.data : value;

  if (!isRecord(page)) {
    throw new Error("Phản hồi danh sách thông báo không hợp lệ.");
  }

  const items = Array.isArray(page.items)
    ? page.items
    : Array.isArray(page.notifications)
      ? page.notifications
      : Array.isArray(page.data)
        ? page.data
        : null;

  if (!items) {
    throw new Error("Phản hồi danh sách thông báo không hợp lệ.");
  }

  return {
    items: items.map(mapNotification),
    page: toNumber(page.page, 1),
    pageSize: toNumber(page.pageSize, 20),
    totalItems: toNumber(page.totalItems, items.length),
    totalPages: toNumber(page.totalPages, 1),
    unreadCount: toNumber(page.unreadCount),
  };
};

export const mapRealtimeNotification = (
  payload: NotificationPayload,
): NotificationItemModel => ({
  content: payload.content ?? "",
  createdAt: payload.createdAt,
  id: payload.notificationId,
  imageUrl: payload.imageUrl,
  isRead: false,
  reference:
    payload.referenceId && payload.referenceType !== null
      ? {
          id: payload.referenceId,
          type: payload.referenceType,
        }
      : null,
  sender: null,
  title: payload.title,
  type: payload.notificationType,
});
