import {
  mapConversation,
  mapConversationsPage,
  mapGroupPreview,
  mapMessage,
  mapMessagesPage,
  mapSearchResultsPage,
  mapSharedAttachmentsPage,
  mapSharedLinksPage,
} from "@/features/chat/chat.mapper";
import { authenticatedFetch } from "@/services/authenticated-fetch";
import { getAccessToken } from "@/stores/session-store";
import type { CreateGroupInput } from "@/types/chat-group";
import type {
  ChatMessage,
  ChatGroupMember,
  ChatGroupMembersPage,
  ChatGroupPreview,
  ChatSearchResultsPage,
  ChatSharedAttachmentsPage,
  ChatSharedLinksPage,
  Conversation,
  ConversationsPage,
  ChatUnreadSummary,
  JoinGroupResult,
  MessagesPage,
  SendMessageAttachment,
} from "@/types/chat";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const parseResponseText = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if (typeof data === "object" && data !== null && "title" in data) {
    const title = (data as { title?: unknown }).title;
    if (typeof title === "string") return title;
  }
  return fallback;
};

export class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

const throwChatApiError = (
  response: Response,
  data: unknown,
  fallback: string,
): never => {
  throw new ChatApiError(getErrorMessage(data, fallback), response.status);
};

const getPrivateConversationErrorMessage = (
  status: number,
  data: unknown,
) => {
  if (status === 400) return "Không thể tạo cuộc trò chuyện.";
  if (status === 403) {
    return getErrorMessage(data, "Không thể tạo cuộc trò chuyện.");
  }
  if (status === 404) return "Không tìm thấy người dùng.";
  if (status >= 500) return "Đã xảy ra lỗi, vui lòng thử lại.";
  return getErrorMessage(data, "Không thể tạo cuộc trò chuyện.");
};

const mapGroupMember = (value: unknown): ChatGroupMember | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.userId);
  if (!id) return null;

  return {
    avatarUrl: asString(value.avatarUrl ?? value.avatar, "") || null,
    displayName: asString(value.displayName ?? value.name ?? value.fullName, "Người dùng"),
    id,
    isOnline: value.isOnline === true,
    isVerified: value.isVerified === true,
    joinedAt: asString(value.joinedAt),
    role: asNumber(value.role),
  };
};

const getPageItems = (data: unknown) => {
  if (!isRecord(data)) return [];
  if (Array.isArray(data.items)) return data.items;
  if (isRecord(data.data) && Array.isArray(data.data.items))
    return data.data.items;
  if (Array.isArray(data.data)) return data.data;
  if (isRecord(data.result) && Array.isArray(data.result.items))
    return data.result.items;
  if (Array.isArray(data.results)) return data.results;
  return [];
};

const mapGroupMembersPage = (data: unknown): ChatGroupMembersPage => ({
  items: getPageItems(data)
    .map(mapGroupMember)
    .filter((item): item is ChatGroupMember => item !== null),
  page: isRecord(data)
    ? asNumber(data.page ?? (isRecord(data.data) ? data.data.page : undefined), 1)
    : 1,
  totalPages: isRecord(data)
    ? asNumber(
        data.totalPages ??
          data.totalPage ??
          (isRecord(data.data) ? data.data.totalPages ?? data.data.totalPage : undefined),
        1,
      )
    : 1,
});

export const getConversations = async (query: {
  page: number;
  pageSize: number;
  keyword?: string;
}): Promise<ConversationsPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());

  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể tải cuộc trò chuyện.");
  return mapConversationsPage(data);
};

export const getChatUnreadSummary = async (): Promise<ChatUnreadSummary> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/unread-summary`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throwChatApiError(
      response,
      data,
      "KhÃ´ng thá»ƒ táº£i sá»‘ tin nháº¯n chÆ°a Ä‘á»c.",
    );
  }

  const payload = isRecord(data) && isRecord(data.data) ? data.data : data;
  return {
    totalUnreadCount: isRecord(payload)
      ? asNumber(payload.totalUnreadCount ?? payload.unreadCount)
      : 0,
  };
};

export const getConversationMessages = async (
  conversationId: string,
  query: { page: number; pageSize: number },
): Promise<MessagesPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/messages?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể tải tin nhắn.");
  return mapMessagesPage(data);
};

export const getConversation = async (
  conversationId: string,
): Promise<Conversation> => {
  const url = `${BASE_URL}/api/chat/conversations/${conversationId}`;
  const response = await authenticatedFetch(
    url,
    { headers: { Accept: "text/plain" } },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể tải cuộc trò chuyện.");
  const conversation = mapConversation(data);
  if (!conversation)
    throw new Error("Backend trả về cuộc trò chuyện không hợp lệ.");
  return conversation;
};

export const getGroupDetails = async (
  conversationId: string,
): Promise<Conversation> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tải thông tin nhóm."));
  }
  const conversation = mapConversation({
    ...(isRecord(data) ? data : {}),
    conversationType: "Group",
    id: isRecord(data) ? (data.id ?? conversationId) : conversationId,
  });
  if (!conversation) {
    throw new Error("Backend trả về thông tin nhóm không hợp lệ.");
  }
  return conversation;
};

export const getGroupMembers = async (
  conversationId: string,
  query: { keyword?: string; page: number; pageSize: number },
): Promise<ChatGroupMembersPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());

  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/members?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tải thành viên nhóm."));
  }

  return mapGroupMembersPage(data);
};

export const getGroupPreview = async (
  groupIdOrInviteCode: string,
  mode: "groupId" | "inviteCode" = "groupId",
): Promise<ChatGroupPreview> => {
  const encodedId = encodeURIComponent(groupIdOrInviteCode);
  const previewUrl =
    mode === "inviteCode"
      ? `${BASE_URL}/api/chat/groups/preview?inviteCode=${encodedId}`
      : `${BASE_URL}/api/chat/groups/preview/${encodedId}`;
  const response = await authenticatedFetch(
    previewUrl,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throwChatApiError(response, data, "Không thể tải thông tin nhóm.");
  }

  const preview = mapGroupPreview(data, groupIdOrInviteCode);
  if (!preview) {
    throw new Error("Backend trả về thông tin nhóm không hợp lệ.");
  }
  return preview;
};

export const joinGroup = async (
  inviteCode: string,
): Promise<JoinGroupResult> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/join`,
    {
      body: JSON.stringify({ inviteCode }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throwChatApiError(response, data, "Không thể tham gia nhóm.");
  }

  const payload = isRecord(data) ? data : {};
  const statusText = asString(payload.status).toLowerCase();
  const isPending =
    response.status === 202 ||
    payload.isPending === true ||
    payload.requiresApproval === true ||
    payload.needApproval === true ||
    statusText.includes("pending") ||
    statusText.includes("request");

  return {
    conversationId: asString(payload.conversationId ?? payload.id),
    status: isPending ? "pending" : "joined",
  };
};

export const createPrivateConversation = async (
  userId: string,
): Promise<string> => {
  try {
    const response = await authenticatedFetch(
      `${BASE_URL}/api/chat/conversations/private`,
      {
        body: JSON.stringify({ userId }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    const data = parseResponseText(await response.text());
    if (!response.ok) {
      throw new Error(getPrivateConversationErrorMessage(response.status, data));
    }
    if (
      typeof data === "object" &&
      data !== null &&
      "conversationId" in data &&
      typeof (data as { conversationId?: unknown }).conversationId === "string"
    ) {
      return (data as { conversationId: string }).conversationId;
    }
    throw new Error("Không thể tạo cuộc trò chuyện.");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Không có kết nối mạng.");
    }
    throw error;
  }
};

const appendGroupAvatar = (formData: FormData, avatarUri?: string) => {
  if (!avatarUri) return;
  const extension = avatarUri.split(".").pop()?.split("?")[0] || "jpg";
  formData.append("avatar", {
    name: `group-avatar.${extension}`,
    type: extension.toLowerCase() === "png" ? "image/png" : "image/jpeg",
    uri: avatarUri,
  } as unknown as Blob);
};

export const createGroupConversation = async (
  input: CreateGroupInput,
): Promise<Conversation> => {
  const formData = new FormData();
  formData.append("name", input.name);
  appendGroupAvatar(formData, input.avatarUri);
  input.memberIds.forEach((memberId) => {
    formData.append("memberIds[]", memberId);
  });

  const response = await authenticatedFetch(`${BASE_URL}/api/chat/groups`, {
    body: formData,
    method: "POST",
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể tạo nhóm chat."));
  }

  const payload =
    isRecord(data) && isRecord(data.conversation) ? data.conversation : data;
  const conversation = mapConversation(payload);
  if (!conversation) {
    throw new Error("Backend trả về nhóm chat không hợp lệ.");
  }

  return conversation;
};

export const markConversationRead = async (
  conversationId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/read`,
    { method: "POST" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể đánh dấu đã đọc.");
};

export const setConversationPinned = async (
  conversationId: string,
  isPinned: boolean,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/pin`,
    {
      body: JSON.stringify({ isPinned }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể cập nhật ghim trò chuyện."));
};

export const setConversationMuted = async (
  conversationId: string,
  isMuted: boolean,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/mute`,
    {
      body: JSON.stringify({ isMuted }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể cập nhật thông báo trò chuyện."));
};

export const setConversationBlocked = async (
  conversationId: string,
  isBlocked: boolean,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/block`,
    {
      body: JSON.stringify({ isBlocked }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể cập nhật chặn người dùng."));
};

export const updateGroupName = async (
  conversationId: string,
  name: string,
): Promise<{ conversationId: string; name: string; updatedAt?: string }> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/name`,
    {
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể đổi tên nhóm."));
  }

  const payload = isRecord(data) ? data : {};
  return {
    conversationId: asString(payload.conversationId, conversationId),
    name: asString(payload.name, name),
    updatedAt: asString(payload.updatedAt, "") || undefined,
  };
};

export const updateGroupAvatar = async (
  conversationId: string,
  avatarUri: string,
): Promise<{ avatarUrl: string | null; conversationId: string; updatedAt?: string }> => {
  const formData = new FormData();
  appendGroupAvatar(formData, avatarUri);

  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/avatar`,
    {
      body: formData,
      method: "PUT",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể đổi ảnh nhóm."));
  }

  const payload = isRecord(data) ? data : {};
  return {
    avatarUrl: asString(payload.avatarUrl, "") || null,
    conversationId: asString(payload.conversationId, conversationId),
    updatedAt: asString(payload.updatedAt, "") || undefined,
  };
};

export const leaveConversation = async (
  conversationId: string,
): Promise<{ action?: string; conversationId: string; updatedAt?: string }> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/leave`,
    { method: "POST" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new ChatApiError(
      getErrorMessage(data, "Không thể rời nhóm."),
      response.status,
    );
  }
  const payload = isRecord(data) ? data : {};
  return {
    action: asString(payload.action, "") || undefined,
    conversationId: asString(payload.conversationId, conversationId),
    updatedAt: asString(payload.updatedAt, "") || undefined,
  };
};

export const addGroupMembers = async (
  conversationId: string,
  memberIds: string[],
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/members`,
    {
      body: JSON.stringify({ memberIds }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Khong the them thanh vien."));
  }
};

export const updateGroupPermission = async (
  conversationId: string,
  canSendMessage: number,
): Promise<{ canSendMessage: number; conversationId: string; updatedAt?: string }> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/permission`,
    {
      body: JSON.stringify({ canSendMessage }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể cập nhật quyền gửi tin nhắn."));
  }

  const payload = isRecord(data) ? data : {};
  return {
    canSendMessage: asNumber(payload.canSendMessage, canSendMessage),
    conversationId: asString(payload.conversationId, conversationId),
    updatedAt: asString(payload.updatedAt, "") || undefined,
  };
};

export const promoteGroupAdmin = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/members/${userId}/admin`,
    { method: "PUT" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể lên Admin."));
  }
};

export const demoteGroupAdmin = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/members/${userId}/admin`,
    { method: "DELETE" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể hạ Admin."));
  }
};

export const removeGroupMember = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/members/${userId}`,
    { method: "DELETE" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể xóa thành viên."));
  }
};

export const transferGroupOwner = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}/owner`,
    {
      body: JSON.stringify({ userId }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể chuyển quyền quản lý."));
  }
};

export const deleteGroupConversation = async (
  conversationId: string,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/groups/${conversationId}`,
    { method: "DELETE" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Không thể giải tán nhóm."));
  }
};

export const getConversationAttachments = async (
  conversationId: string,
  query: { type?: number; page: number; pageSize: number },
): Promise<ChatSharedAttachmentsPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (typeof query.type === "number") params.set("type", String(query.type));
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/attachments?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể tải tệp đã chia sẻ."));
  return mapSharedAttachmentsPage(data);
};

export const getConversationLinks = async (
  conversationId: string,
  query: { page: number; pageSize: number },
): Promise<ChatSharedLinksPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  const url = `${BASE_URL}/api/chat/conversations/${conversationId}/links?${params.toString()}`;
  const response = await authenticatedFetch(
    url,
    { headers: { Accept: "text/plain" } },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) throw new Error("Không thể tải liên kết đã chia sẻ.");
  return mapSharedLinksPage(data);
};

export const searchConversationMessages = async (
  conversationId: string,
  query: { keyword: string; page: number; pageSize: number },
): Promise<ChatSearchResultsPage> => {
  const params = new URLSearchParams({
    keyword: query.keyword,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/search?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể tìm kiếm tin nhắn."));
  return mapSearchResultsPage(data);
};

export const recallChatMessage = async (
  messageId: string,
): Promise<{
  conversationId: string;
  deletedAt: string;
  deletedBy: string;
  messageId: string;
}> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/messages/${messageId}/recall`,
    { method: "POST" },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể thu hồi tin nhắn.");

  if (typeof data !== "object" || data === null) {
    throw new Error("Backend trả về dữ liệu thu hồi không hợp lệ.");
  }
  const result = data as Record<string, unknown>;
  return {
    conversationId:
      typeof result.conversationId === "string" ? result.conversationId : "",
    deletedAt: typeof result.deletedAt === "string" ? result.deletedAt : "",
    deletedBy: typeof result.deletedBy === "string" ? result.deletedBy : "",
    messageId: typeof result.messageId === "string" ? result.messageId : messageId,
  };
};

const getMessageType = (
  content: string,
  attachments: SendMessageAttachment[],
) => {
  if (attachments.length === 0) return 0;
  const firstAttachment = attachments[0];
  if (firstAttachment.kind === "image") return 1;
  if (firstAttachment.kind === "video") return 2;
  if (firstAttachment.kind === "audio") return 4;
  if (firstAttachment.kind === "file") return 3;
  return content.trim() ? 0 : 3;
};

type UploadedChatAttachment = {
  duration?: number;
  fileName: string;
  fileSize?: number;
  fileUrl: string;
  mimeType: string;
  thumbnailUrl?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const getUploadItems = (data: unknown) => {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.attachments)) return data.attachments;
  return [data];
};

const mapUploadedAttachment = (
  value: unknown,
  fallback: SendMessageAttachment,
): UploadedChatAttachment | null => {
  if (!isRecord(value)) return null;
  const fileUrl = asString(value.fileUrl ?? value.url ?? value.mediaUrl);
  if (!fileUrl) return null;

  return {
    duration: asNumber(value.duration, fallback.duration ?? 0),
    fileName: asString(value.fileName ?? value.name, fallback.name),
    fileSize: asNumber(value.fileSize ?? value.size, fallback.size ?? 0),
    fileUrl,
    mimeType: asString(value.mimeType ?? value.type, fallback.type),
    thumbnailUrl: asString(value.thumbnailUrl, "") || null,
  };
};

const appendUploadFile = (
  formData: FormData,
  attachment: SendMessageAttachment,
) => {
  formData.append("files", {
    name: attachment.name,
    type: attachment.type || "application/octet-stream",
    uri: attachment.uri,
  } as unknown as Blob);
};

const uploadChatAttachments = async (
  attachments: SendMessageAttachment[],
): Promise<UploadedChatAttachment[]> => {
  if (attachments.length === 0) return [];

  const formData = new FormData();
  attachments.forEach((attachment) => appendUploadFile(formData, attachment));

  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/api/chat/attachments/upload`, {
    body: formData,
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    method: "POST",
  });
  const data = parseResponseText(await response.text());

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "Không thể upload tệp đính kèm chat."),
    );
  }

  const uploaded = getUploadItems(data)
    .map((item, index) => mapUploadedAttachment(item, attachments[index]))
    .filter((item): item is UploadedChatAttachment => item !== null);

  if (uploaded.length !== attachments.length) {
    throw new Error("Backend trả về dữ liệu upload tệp không hợp lệ.");
  }

  return uploaded;
};

export const sendChatMessage = async (input: {
  conversationId: string;
  content: string;
  replyToMessageId?: string;
  mentionUserIds?: string[];
  attachments: SendMessageAttachment[];
}): Promise<ChatMessage> => {
  const uploadedAttachments = await uploadChatAttachments(input.attachments);
  const body = {
    attachments: uploadedAttachments.map((attachment) => ({
      duration: attachment.duration ?? 0,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize ?? 0,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      thumbnailUrl: attachment.thumbnailUrl ?? null,
    })),
    content: input.content,
    conversationId: input.conversationId,
    messageType: getMessageType(input.content, input.attachments),
    replyMessageId: input.replyToMessageId,
    mentionUserIds: input.mentionUserIds,
  };

  const response = await authenticatedFetch(`${BASE_URL}/api/chat/messages`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throwChatApiError(response, data, "Không thể gửi tin nhắn.");
  const message = mapMessage(data);
  if (!message) throw new Error("Backend trả về tin nhắn không hợp lệ.");
  return message;
};

export const forwardChatMessage = async (
  messageId: string,
  conversationIds: string[],
): Promise<void> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/messages/${messageId}/forward`,
    {
      body: JSON.stringify({ conversationIds }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const data = parseResponseText(await response.text());
  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "Không thể chuyển tiếp tin nhắn."),
    );
  }
};
