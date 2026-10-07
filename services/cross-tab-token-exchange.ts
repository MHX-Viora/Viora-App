type SharedSession = {
  sessionId?: string;
  user: { id: string } | null;
  accessToken: string;
};

type TokenChannel = {
  postMessage(message: unknown): void;
  onmessage: BroadcastChannel["onmessage"];
};

type TokenMessage = {
  type: "request" | "response";
  requestId: string;
  sessionId: string;
  userId: string;
  rejectedToken: string;
  accessToken?: string;
  refreshToken?: string;
};

type SharedTokens = { accessToken: string; refreshToken?: string };

export function createCrossTabTokenExchange(
  channel: TokenChannel,
  readSession: () => Promise<SharedSession | null>,
  isUsable: (session: SharedSession) => boolean,
  timeoutMs = 300,
  readRefreshToken?: () => Promise<string | null>,
) {
  const pending = new Map<string, { resolve: (tokens: SharedTokens | null) => void; timeout: ReturnType<typeof setTimeout>; session: SharedSession; rejectedToken: string }>();
  let nextRequestId = 0;

  channel.onmessage = (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const message = data as Partial<TokenMessage>;
    const { requestId, sessionId, userId, rejectedToken } = message;
    if (typeof requestId !== "string" || typeof sessionId !== "string" || typeof userId !== "string") return;

    if (message.type === "request" && typeof rejectedToken === "string") {
      void Promise.all([readSession(), readRefreshToken?.() ?? Promise.resolve(null)]).then(([session, refreshToken]) => {
        const user = session?.user;
        if (!session?.sessionId || !user || session.sessionId !== sessionId ||
          user.id !== userId || session.accessToken === rejectedToken ||
          !isUsable(session)) return;
        channel.postMessage({
          type: "response",
          requestId,
          sessionId: session.sessionId,
          userId: user.id,
          rejectedToken,
          accessToken: session.accessToken,
          refreshToken: refreshToken ?? undefined,
        } satisfies TokenMessage);
      }).catch(() => undefined);
      return;
    }

    if (message.type !== "response" || typeof message.accessToken !== "string") return;
    const waiting = pending.get(requestId);
    if (!waiting || waiting.session.sessionId !== sessionId ||
      waiting.session.user?.id !== userId || waiting.rejectedToken !== rejectedToken ||
      message.accessToken === waiting.rejectedToken ||
      !isUsable({ ...waiting.session, accessToken: message.accessToken })) return;
    clearTimeout(waiting.timeout);
    pending.delete(requestId);
    waiting.resolve({
      accessToken: message.accessToken,
      refreshToken: typeof message.refreshToken === "string" ? message.refreshToken : undefined,
    });
  };

  return {
    request(session: SharedSession, rejectedToken: string): Promise<SharedTokens | null> {
      const sessionId = session.sessionId;
      const userId = session.user?.id;
      if (!sessionId || !userId) return Promise.resolve(null);
      const requestId = `${Date.now()}-${++nextRequestId}-${Math.random()}`;
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          resolve(null);
        }, timeoutMs);
        pending.set(requestId, { resolve, timeout, session, rejectedToken });
        try {
          channel.postMessage({
            type: "request",
            requestId,
            sessionId,
            userId,
            rejectedToken,
          } satisfies TokenMessage);
        } catch {
          clearTimeout(timeout);
          pending.delete(requestId);
          resolve(null);
        }
      });
    },
    close() {
      channel.onmessage = null;
      pending.forEach((waiting) => { clearTimeout(waiting.timeout); waiting.resolve(null); });
      pending.clear();
    },
  };
}
