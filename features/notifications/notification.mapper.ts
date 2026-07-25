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

const normalizeCreatedAt = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;

    const text = String(value).trim();
    if (!text) continue;

    const numericValue = Number(text);
    const timestamp =
      Number.isFinite(numericValue) && /^\d+$/.test(text)
        ? new Date(text.length <= 10 ? numericValue * 1000 : numericValue).getTime()
        : new Date(text).getTime();

    if (!Number.isFinite(timestamp)) continue;

    const now = Date.now();
    const maxFutureDriftMs = 5 * 60 * 1000;
    if (timestamp > now + maxFutureDriftMs) {
      return new Date(now).toISOString();
    }

    return new Date(timestamp).toISOString();
  }

  return new Date().toISOString();
};

const isReferenceType = (value: number): value is NotificationReferenceType =>
  value >= 0 && value <= 5;

const mapSender = (value: unknown): NotificationSender | null => {
  if (!isRecord(value)) return null;

  const displayName = toString(
    value.displayName,
    toString(value.name, toString(value.fullName)),
  );
  const avatarUrl = toString(
    value.avatarUrl,
    toString(value.avatar, toString(value.imageUrl)),
  );
  const id = toString(value.id, toString(value.userId));
  if (!displayName && !avatarUrl && !id) return null;

  return {
    avatarUrl,
    displayName: displayName || "Ban quản trị Viora",
    id,
    isVerified: value.isVerified === true,
  };
};

const mapFlatSender = (
  value: Record<string, unknown>,
): NotificationSender | null => {
  const displayName = toString(
    value.senderDisplayName,
    toString(
      value.senderName,
      toString(value.adminName, toString(value.createdByName)),
    ),
  );
  const avatarUrl = toString(
    value.senderAvatarUrl,
    toString(
      value.senderAvatar,
      toString(value.adminAvatarUrl, toString(value.createdByAvatarUrl)),
    ),
  );
  const id = toString(
    value.senderId,
    toString(value.adminId, toString(value.createdById)),
  );
  if (!displayName && !avatarUrl && !id) return null;

  return {
    avatarUrl,
    displayName: displayName || "Ban quản trị Viora",
    id,
    isVerified:
      value.senderIsVerified === true || value.adminIsVerified === true,
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

  const nestedSender =
    value.sender ?? value.admin ?? value.createdBy ?? value.author;

  return {
    content: toString(value.content),
    createdAt: normalizeCreatedAt(
      value.createdAt,
      value.created_at,
      value.sentTime,
      value.timestamp,
    ),
    id: toString(value.id, toString(value.notificationId)),
    imageUrl:
      toString(
        value.imageUrl,
        toString(
          value.image,
          toString(value.thumbnailUrl, toString(value.bannerUrl)),
        ),
      ) || null,
    isRead: value.isRead === true || value.read === true,
    reference: mapReference(value.reference) ?? mapFlatReference(value),
    sender: mapSender(nestedSender) ?? mapFlatSender(value),
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
): NotificationItemModel => {
  const value = payload as NotificationPayload & Record<string, unknown>;
  const nestedSender =
    value.sender ?? value.admin ?? value.createdBy ?? value.author;

  return {
    content: payload.content ?? "",
    createdAt: normalizeCreatedAt(payload.createdAt),
    id: payload.notificationId,
    imageUrl:
      toString(
        value.imageUrl,
        toString(
          value.image,
          toString(value.thumbnailUrl, toString(value.bannerUrl)),
        ),
      ) || null,
    isRead: false,
    reference:
      payload.referenceId && payload.referenceType !== null
        ? {
            id: payload.referenceId,
            type: payload.referenceType,
          }
        : null,
    sender: mapSender(nestedSender) ?? mapFlatSender(value),
    title: payload.title,
    type: payload.notificationType,
  };
};
