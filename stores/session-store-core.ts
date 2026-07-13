import type { Session, StorageAdapter, User } from "@/types/auth";

const SESSION_KEY = "viora.session";

const isSession = (value: unknown): value is Session => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Session>;
  return (
    typeof candidate.accessToken === "string" &&
    (candidate.user === null || (typeof candidate.user === "object" && candidate.user !== null))
  );
};

export function createSessionStore(storage: StorageAdapter) {
  // Đọc chuỗi JSON đã lưu và trả null nếu phiên bị thiếu hoặc hỏng.
  const getSession = async (): Promise<Session | null> => {
    const stored = await storage.getItemAsync(SESSION_KEY);
    if (!stored) return null;
    try {
      const parsed: unknown = JSON.parse(stored);
      return isSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  return {
    clearSession: () => storage.deleteItemAsync(SESSION_KEY),
    getSession,
    // Token và user được lưu chung để khôi phục đúng trạng thái đăng nhập.
    saveSession: (session: Session) => storage.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    async updateAccessToken(accessToken: string) {
      const session = await getSession();
      if (!session) throw new Error("Không tìm thấy phiên đăng nhập.");
      await storage.setItemAsync(SESSION_KEY, JSON.stringify({ ...session, accessToken }));
    },
    async updateUser(user: User) {
      // Sau khi tạo hồ sơ, giữ nguyên token và chỉ thay user null bằng user mới.
      const session = await getSession();
      if (!session) throw new Error("Không tìm thấy phiên đăng nhập.");
      await storage.setItemAsync(SESSION_KEY, JSON.stringify({ ...session, user }));
    },
  };
}
