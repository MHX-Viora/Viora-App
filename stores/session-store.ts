import type { Session, User } from "@/types/auth";
import { sessionStorage } from "@/stores/session-storage";
import { clearConversationListCache } from "@/stores/conversation-list-cache";
import { clearMessageCache } from "@/stores/message-cache";

const SESSION_KEY = "viora.session";

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
  clearConversationListCache();
  clearMessageCache();
  await sessionStorage.deleteItemAsync(SESSION_KEY);
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
  // Backend đang lưu refresh token bằng cookie, app không đọc được cookie này.
  return null;
};

export const setRefreshToken = async (_refreshToken: string): Promise<void> => {
  // Backend tự set refresh cookie sau login, nên app không cần lưu refresh token.
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
