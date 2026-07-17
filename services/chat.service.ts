import {
  mapConversation,
  mapConversationsPage,
  mapMessage,
  mapMessagesPage,
  mapSearchResultsPage,
  mapSharedAttachmentsPage,
  mapSharedLinksPage,
} from "@/features/chat/chat.mapper";
import { authenticatedFetch } from "@/services/authenticated-fetch";
import { getAccessToken } from "@/stores/session-store";
import type {
  ChatMessage,
  ChatSearchResultsPage,
  ChatSharedAttachmentsPage,
  ChatSharedLinksPage,
  Conversation,
  ConversationsPage,
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
    throw new Error(getErrorMessage(data, "Khong tim thay cuoc tro chuyen."));
  return mapConversationsPage(data);
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
    throw new Error(getErrorMessage(data, "Khong the tai tin nhan."));
  return mapMessagesPage(data);
};

export const getConversation = async (
  conversationId: string,
): Promise<Conversation> => {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Không thể tải cuộc trò chuyện."));
  const conversation = mapConversation(data);
  if (!conversation)
    throw new Error("Backend trả về cuộc trò chuyện không hợp lệ.");
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
    throw new Error(getErrorMessage(data, "Khong the danh dau da doc."));
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
    throw new Error(getErrorMessage(data, "Khong the cap nhat ghim tro chuyen."));
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
    throw new Error(getErrorMessage(data, "Khong the cap nhat thong bao tro chuyen."));
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
    throw new Error(getErrorMessage(data, "Khong the cap nhat chan nguoi dung."));
};

export const getConversationAttachments = async (
  conversationId: string,
  query: { type: number; page: number; pageSize: number },
): Promise<ChatSharedAttachmentsPage> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    type: String(query.type),
  });
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/attachments?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Khong the tai tep da chia se."));
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
  const response = await authenticatedFetch(
    `${BASE_URL}/api/chat/conversations/${conversationId}/links?${params.toString()}`,
  );
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Khong the tai lien ket da chia se."));
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
    throw new Error(getErrorMessage(data, "Khong the tim kiem tin nhan."));
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
    throw new Error(getErrorMessage(data, "Khong the thu hoi tin nhan."));

  if (typeof data !== "object" || data === null) {
    throw new Error("Backend tra ve du lieu thu hoi khong hop le.");
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

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
      getErrorMessage(data, "Khong the upload tep dinh kem chat."),
    );
  }

  const uploaded = getUploadItems(data)
    .map((item, index) => mapUploadedAttachment(item, attachments[index]))
    .filter((item): item is UploadedChatAttachment => item !== null);

  if (uploaded.length !== attachments.length) {
    throw new Error("Backend tra ve du lieu upload tep khong hop le.");
  }

  return uploaded;
};

export const sendChatMessage = async (input: {
  conversationId: string;
  content: string;
  replyToMessageId?: string;
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
  };

  const response = await authenticatedFetch(`${BASE_URL}/api/chat/messages`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = parseResponseText(await response.text());
  if (!response.ok)
    throw new Error(getErrorMessage(data, "Khong the gui tin nhan."));
  const message = mapMessage(data);
  if (!message) throw new Error("Backend tra ve tin nhan khong hop le.");
  return message;
};




