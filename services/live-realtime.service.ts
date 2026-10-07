import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

import { getRealtimeAccessToken } from "@/services/authenticated-fetch";

export type LiveRealtimeComment = {
  id: string; liveId: string; userId: string; name: string; avatarUrl: string | null;
  text: string; createdAt: string;
};
export type LiveRealtimeSnapshot = { viewerCount: number; reactionCount: number; comments: LiveRealtimeComment[]; pinnedComment: LiveRealtimeComment | null };
export type LiveRealtimeGift = { id: string; transactionId?: string; liveId: string; senderUserId: string; senderName: string; senderAvatarUrl?: string | null; giftId: string; giftName: string; imageUrl: string; quantity: number; totalAmount: number; effectType?: number; effectTier?: number; effectDurationMs?: number };

const REACTION_BATCH_DELAY_MS = 250;
const MAX_REACTIONS_PER_BATCH = 20;

const toSafeCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function normalizeLiveRealtimeSnapshot(snapshot: Partial<LiveRealtimeSnapshot> | null | undefined): LiveRealtimeSnapshot {
  return {
    viewerCount: toSafeCount(snapshot?.viewerCount),
    reactionCount: toSafeCount(snapshot?.reactionCount),
    comments: Array.isArray(snapshot?.comments) ? snapshot.comments : [],
    pinnedComment: snapshot?.pinnedComment ?? null,
  };
}

export function liveCommentErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (text.includes("quá nhanh")) return "Bạn đang gửi bình luận quá nhanh.";
  if (text.includes("muted")) return "Bạn đã bị tắt quyền bình luận trong Live này.";
  if (text.includes("Comments unavailable")) return "Bình luận hiện không khả dụng.";
  return "Kiểm tra kết nối và thử lại.";
}

export async function connectLiveRoom(liveId: string, handlers: {
  onSnapshot: (snapshot: LiveRealtimeSnapshot) => void;
  onComment: (comment: LiveRealtimeComment) => void;
  onCommentDeleted: (commentId: string) => void;
  onPinnedComment: (comment: LiveRealtimeComment | null) => void;
  onViewerCount: (count: number) => void;
  onReaction: (count: number) => void;
  onGift: (gift: LiveRealtimeGift) => void;
  onEnded: () => void;
  onDisconnected?: () => void;
}) {
  const connection = new HubConnectionBuilder()
    .withUrl(`${process.env.EXPO_PUBLIC_API_URL ?? ""}/hubs/realtime`, { accessTokenFactory: getRealtimeAccessToken })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.None)
    .build();
  let closed = false;
  let ended = false;
  let rejoinTimer: ReturnType<typeof setTimeout> | null = null;
  let reactionTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingReactionCount = 0;
  let reactionFlushPromise: Promise<void> | null = null;
  const endRoom = () => {
    if (closed || ended) return;
    ended = true;
    pendingReactionCount = 0;
    if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
    if (rejoinTimer) { clearTimeout(rejoinTimer); rejoinTimer = null; }
    handlers.onEnded();
  };
  const scheduleReactionFlush = () => {
    if (closed || ended || reactionTimer || reactionFlushPromise) return;
    reactionTimer = setTimeout(() => {
      reactionTimer = null;
      void flushReactions().catch(() => undefined);
    }, REACTION_BATCH_DELAY_MS);
  };
  const flushReactions = (): Promise<void> => {
    if (reactionFlushPromise) return reactionFlushPromise;
    if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
    reactionFlushPromise = (async () => {
      while (pendingReactionCount > 0 && !ended) {
        const count = Math.min(pendingReactionCount, MAX_REACTIONS_PER_BATCH);
        pendingReactionCount -= count;
        try { await connection.invoke("ReactToLive", liveId, count); }
        catch (error) { if (!ended && !closed) pendingReactionCount += count; throw error; }
      }
    })().finally(() => {
      reactionFlushPromise = null;
      if (pendingReactionCount > 0 && !closed) scheduleReactionFlush();
    });
    return reactionFlushPromise;
  };
  const rejoin = async () => {
    if (closed || ended) return;
    try { handlers.onSnapshot(normalizeLiveRealtimeSnapshot(await connection.invoke<LiveRealtimeSnapshot>("JoinLive", liveId))); }
    catch (error) {
      if (closed) return;
      // Join refusal may also mean a privacy/block change; REST confirms the terminal status.
      if (error instanceof Error && error.message.includes("Live unavailable")) { handlers.onDisconnected?.(); return; }
      rejoinTimer = setTimeout(() => { void rejoin(); }, 5000);
    }
  };
  connection.on("LiveComment", (comment: LiveRealtimeComment) => { if (comment.liveId === liveId) handlers.onComment(comment); });
  connection.on("LiveCommentDeleted", (payload: { liveId: string; commentId: string }) => { if (payload.liveId === liveId) handlers.onCommentDeleted(payload.commentId); });
  connection.on("LiveCommentPinned", (payload: { liveId: string; comment: LiveRealtimeComment | null }) => { if (payload.liveId === liveId) handlers.onPinnedComment(payload.comment ?? null); });
  connection.on("LiveViewerCount", (payload: { liveId: string; count: number }) => { if (payload.liveId === liveId) handlers.onViewerCount(toSafeCount(payload.count)); });
  connection.on("LiveReaction", (payload: { liveId: string; count: number }) => { if (payload.liveId === liveId) handlers.onReaction(toSafeCount(payload.count)); });
  connection.on("LiveEnded", (payload: { id: string }) => { if (payload.id === liveId) endRoom(); });
  connection.on("LiveGift", (payload: LiveRealtimeGift) => { if (payload.liveId === liveId) handlers.onGift(payload); });
  connection.onreconnected(() => { void rejoin(); });
  connection.onclose(() => { if (!closed) handlers.onDisconnected?.(); });
  await connection.start();
  try { handlers.onSnapshot(normalizeLiveRealtimeSnapshot(await connection.invoke<LiveRealtimeSnapshot>("JoinLive", liveId))); }
  catch (error) { await connection.stop(); throw error; }
  return {
    sendComment: (text: string) => connection.invoke("SendLiveComment", liveId, text),
    deleteComment: (commentId: string) => connection.invoke("DeleteLiveComment", liveId, commentId),
    setPinnedComment: (commentId: string | null) => connection.invoke("SetLivePinnedComment", liveId, commentId),
    muteUser: (userId: string) => connection.invoke("MuteLiveUser", liveId, userId),
    reportComment: (commentId: string, reason: number) => connection.invoke("ReportLiveComment", liveId, commentId, reason),
    react: (count: number) => {
      if (closed || ended) return Promise.resolve();
      pendingReactionCount += Math.max(0, Math.floor(count));
      if (pendingReactionCount >= MAX_REACTIONS_PER_BATCH) void flushReactions().catch(() => undefined);
      else scheduleReactionFlush();
      return Promise.resolve();
    },
    async close() {
      if (closed) return;
      if (rejoinTimer) clearTimeout(rejoinTimer);
      if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
      await flushReactions().catch(() => undefined);
      closed = true;
      await connection.invoke("LeaveLive", liveId).catch(() => undefined);
      await connection.stop();
    },
  };
}
