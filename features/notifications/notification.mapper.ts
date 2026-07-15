import type {
  NotificationItemModel,
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

export const mapNotification = (value: unknown): NotificationItemModel => {
  if (!isRecord(value)) {
    throw new Error("Phản hồi thông báo không hợp lệ.");
  }

  return {
    content: toString(value.content),
    createdAt: toString(value.createdAt),
    id: toString(value.id),
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : null,
    isRead: value.isRead === true,
    reference: mapReference(value.reference),
    sender: mapSender(value.sender),
    title: toString(value.title, "Thông báo"),
    type: toNumber(value.type),
  };
};

export const mapNotificationsPage = (value: unknown): NotificationsPage => {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Phản hồi danh sách thông báo không hợp lệ.");
  }

  return {
    items: value.items.map(mapNotification),
    page: toNumber(value.page, 1),
    pageSize: toNumber(value.pageSize, 20),
    totalItems: toNumber(value.totalItems),
    totalPages: toNumber(value.totalPages, 1),
    unreadCount: toNumber(value.unreadCount),
  };
};
