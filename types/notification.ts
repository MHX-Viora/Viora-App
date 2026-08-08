export type NotificationSender = {
  id: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
};

export type NotificationReferenceType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type NotificationReference = {
  id: string;
  type: NotificationReferenceType;
};

export type NotificationItemModel = {
  id: string;
  type: number;
  title: string;
  content: string;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
  sender: NotificationSender | null;
  reference: NotificationReference | null;
};

export type NotificationsPage = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  unreadCount: number;
  items: NotificationItemModel[];
};

export type NotificationsQuery = {
  page: number;
  pageSize: number;
  isRead?: boolean;
  type?: number;
};

export type NotificationPayload = {
  notificationId: string;
  notificationType: number;
  referenceId: string | null;
  referenceType: NotificationReferenceType | null;
  title: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
};
