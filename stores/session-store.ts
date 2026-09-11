import type { AccessTokenResponse, Session, User } from "@/types/auth";
import { sessionStorage } from "@/stores/session-storage";
import { refreshTokenStorage } from "@/stores/refresh-token-storage";
import { clearConversationListCache } from "@/stores/conversation-list-cache";
import { clearMessageCache } from "@/stores/message-cache";
import { clearStickerCache } from "@/stores/sticker-cache";
import { chatLocalRepository } from "@/data/chat-local/chat-local-repository";
import { clearAfterLocalMutations } from "@/data/chat-local/chat-local-write-coordinator";

const SESSION_KEY = "viora.session";
const invalidationListeners = new Set<() => void>();

// Kiểm tra dữ liệu đọc từ storage có đúng shape session tối thiểu không.
const isSession = (value: unknown): value is Session => {
  if (typeof value !== "object" || value === null) return false;

  const session = value as Partial<Session>;
  return (
    typeof session.accessToken === "string" &&
    (session.user === null ||
      (typeof session.user === "object" && session.user !== null))
  );
};

export const getSession = async (): Promise<Session | null> => {
  const storedSession = await sessionStorage.getItemAsync(SESSION_KEY);
  if (!storedSession) return null;

  // Storage chỉ lưu string, nên phải JSON.parse trước khi dùng.
  try {
    const session = JSON.parse(storedSession);
    return isSession(session) ? session : null;
  } catch {
    return null;
  }
};

export const saveSession = async (session: Session): Promise<void> => {
  await sessionStorage.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = async (): Promise<void> => {
  const session = await getSession();
  await Promise.all([
    sessionStorage.deleteItemAsync(SESSION_KEY),
    refreshTokenStorage.deleteAsync(),
  ]);
  clearConversationListCache();
  clearMessageCache();
  await clearStickerCache();
  if (session?.user?.id) {
    await clearAfterLocalMutations(async () => {
      await chatLocalRepository.initialize();
      await chatLocalRepository.clearOwner(session.user!.id);
    })
      .catch((error: unknown) => {
        if (__DEV__) console.info("[CHAT CACHE] logout cleanup failed", error);
      });
  }
  invalidationListeners.forEach((listener) => listener());
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.accessToken ?? null;
};

export const setAccessToken = async (accessToken: string): Promise<void> => {
  const session = await getSession();
  if (!session) throw new Error("Không tìm thấy phiên đăng nhập.");

  // Khi refresh token, chỉ thay accessToken, giữ nguyên user hiện tại.
  await saveSession({ ...session, accessToken });
};

export const getRefreshToken = async (): Promise<string | null> => {
  return refreshTokenStorage.getAsync();
};

export const setRefreshToken = async (refreshToken: string): Promise<void> => {
  await refreshTokenStorage.setAsync(refreshToken);
};

export const setAuthTokens = async (
  tokens: AccessTokenResponse,
): Promise<void> => {
  const session = await getSession();
  if (!session) throw new Error("Không tìm thấy phiên đăng nhập.");

  if (tokens.refreshToken) {
    await setRefreshToken(tokens.refreshToken);
  }
  await saveSession({
    ...session,
    accessToken: tokens.accessToken,
    accessTokenExpiresAt:
      tokens.accessTokenExpiresAt ?? session.accessTokenExpiresAt,
    refreshTokenExpiresAt:
      tokens.refreshTokenExpiresAt ?? session.refreshTokenExpiresAt,
    sessionId: tokens.sessionId ?? session.sessionId,
  });
};

export const subscribeSessionInvalidation = (listener: () => void) => {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user ?? null;
};

export const updateUser = async (user: User): Promise<void> => {
  const session = await getSession();
  if (!session) throw new Error("Không tìm thấy phiên đăng nhập.");

  // Sau khi tạo hồ sơ, thay user null bằng user backend trả về.
  await saveSession({ ...session, user });
};
