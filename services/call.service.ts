import { authenticatedFetch } from "@/services/authenticated-fetch";
import { CallType, type CallSession, type IceServer } from "@/types/call";

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

const getErrorMessage = (data: unknown, fallback: string) => {
  if (isRecord(data)) {
    const detail = asString(data.detail);
    const message = asString(data.message);
    const title = asString(data.title);
    return detail || message || title || fallback;
  }
  return typeof data === "string" && data.trim() ? data : fallback;
};

const mapCallSession = (value: unknown): CallSession => {
  if (!isRecord(value)) throw new Error("Backend trả về cuộc gọi không hợp lệ.");
  const caller = isRecord(value.caller) ? value.caller : {};
  const receiver = isRecord(value.receiver) ? value.receiver : {};
  return {
    answeredAt: asString(value.answeredAt) || null,
    caller: {
      avatarUrl: asString(caller.avatarUrl) || null,
      displayName: asString(caller.displayName, "Người gọi"),
      id: asString(caller.id),
    },
    conversationId: asString(value.conversationId),
    duration: value.duration === null || value.duration === undefined ? null : asNumber(value.duration),
    endedAt: asString(value.endedAt) || null,
    id: asString(value.id),
    receiver: {
      avatarUrl: asString(receiver.avatarUrl) || null,
      displayName: asString(receiver.displayName, "Người nhận"),
      id: asString(receiver.id),
    },
    callType: asNumber(value.callType, CallType.Audio),
    startedAt: asString(value.startedAt),
    status: asNumber(value.status),
  };
};

const postCallAction = async (callId: string, action: "accept" | "reject" | "cancel" | "end") => {
  const response = await authenticatedFetch(`${BASE_URL}/api/calls/${callId}/${action}`, {
    method: "POST",
  });
  const data = parseResponseText(await response.text());
  if (!response.ok) throw new Error(getErrorMessage(data, "Không thể cập nhật cuộc gọi."));
  return mapCallSession(data);
};

export const createVoiceCall = async (conversationId: string, callType = CallType.Audio): Promise<string> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/calls`, {
    body: JSON.stringify({ callType, conversationId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = parseResponseText(await response.text());
  if (!response.ok) throw new Error(getErrorMessage(data, "Không thể bắt đầu cuộc gọi."));
  if (isRecord(data) && typeof data.callId === "string") return data.callId;
  throw new Error("Backend tra ve callId khong hop le.");
};

export const acceptVoiceCall = (callId: string) => postCallAction(callId, "accept");
export const rejectVoiceCall = (callId: string) => postCallAction(callId, "reject");
export const cancelVoiceCall = (callId: string) => postCallAction(callId, "cancel");
export const endVoiceCall = (callId: string) => postCallAction(callId, "end");

export const getVoiceCall = async (callId: string) => {
  const response = await authenticatedFetch(`${BASE_URL}/api/calls/${callId}`);
  const data = parseResponseText(await response.text());
  if (!response.ok) throw new Error(getErrorMessage(data, "Không thể tải cuộc gọi."));
  return mapCallSession(data);
};

export const getIceServers = async (): Promise<IceServer[]> => {
  const response = await authenticatedFetch(`${BASE_URL}/api/calls/ice`);
  const data = parseResponseText(await response.text());
  if (!response.ok) throw new Error(getErrorMessage(data, "Không thể tải cấu hình ICE."));
  const servers = isRecord(data) && Array.isArray(data.iceServers) ? data.iceServers : [];
  return servers
    .filter(isRecord)
    .map((server) => {
      const username = asString(server.username);
      const credential = asString(server.credential);
      return {
        ...(credential ? { credential } : {}),
        urls: Array.isArray(server.urls) ? server.urls.filter((url): url is string => typeof url === "string") : [],
        ...(username ? { username } : {}),
      };
    })
    .filter((server) => server.urls.length > 0);
};
