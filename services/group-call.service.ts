import { authenticatedFetch } from "@/services/authenticated-fetch";
import {
  CallType,
  type GroupCallJoin,
  type GroupCallSession,
} from "@/types/call";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const request = async (path: string, init?: RequestInit) => {
  const response = await authenticatedFetch(`${BASE_URL}${path}`, init);
  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  if (!response.ok) {
    const detail = isRecord(data)
      ? text(data.detail) || text(data.message) || text(data.title)
      : "";
    const traceId = isRecord(data) ? text(data.traceId) : "";
    const diagnostic = [
      `HTTP ${response.status}`,
      traceId ? `traceId: ${traceId}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `${detail || "Không thể xử lý cuộc gọi nhóm."} (${diagnostic})`,
    );
  }
  return data;
};

const mapCall = (value: unknown): GroupCallSession => {
  if (!isRecord(value) || !isRecord(value.startedBy)) {
    throw new Error("Phản hồi cuộc gọi nhóm không hợp lệ.");
  }
  return {
    callType: number(value.callType),
    conversationId: text(value.conversationId),
    duration: value.duration == null ? null : number(value.duration),
    endedAt: text(value.endedAt) || null,
    id: text(value.id),
    startedAt: text(value.startedAt),
    startedBy: {
      avatarUrl: text(value.startedBy.avatarUrl) || null,
      displayName: text(value.startedBy.displayName) || "Thành viên",
      id: text(value.startedBy.id),
    },
    status: number(value.status),
  };
};

const mapJoin = (value: unknown): GroupCallJoin => {
  if (!isRecord(value)) throw new Error("Thông tin tham gia không hợp lệ.");
  const liveKitUrl = text(value.liveKitUrl);
  const token = text(value.token);
  if (!liveKitUrl.startsWith("wss://") || !token) {
    throw new Error("Máy chủ gọi nhóm chưa được cấu hình.");
  }
  return { call: mapCall(value.call), liveKitUrl, token };
};

export const startGroupCall = async (
  conversationId: string,
  callType: CallType,
) =>
  mapJoin(
    await request("/api/group-calls", {
      body: JSON.stringify({ callType, conversationId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

export const joinGroupCall = async (callId: string) =>
  mapJoin(await request(`/api/group-calls/${callId}/join`, { method: "POST" }));

export const endGroupCall = async (callId: string) =>
  mapCall(await request(`/api/group-calls/${callId}/end`, { method: "POST" }));

export const getActiveGroupCall = async (conversationId: string) =>
  mapCall(await request(`/api/group-calls/conversations/${conversationId}/active`));
