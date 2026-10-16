export class SsoBootstrapError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "SsoBootstrapError"; }
}

export const isSsoTransaction = (value: string): boolean => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);

type Configuration = {
  issuer: string; transaction: string;
  loadSession: () => Promise<{ accessToken: string } | null>;
  refreshSession: (oldAccessToken: string) => Promise<string>;
  fetcher?: typeof fetch; timeoutMs?: number; signal?: AbortSignal;
};

export async function completeFirstPartySso(config: Configuration): Promise<string> {
  let issuer: URL;
  try {
    issuer = new URL(config.issuer);
    if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash || !isSsoTransaction(config.transaction)) throw new Error();
  } catch { throw new SsoBootstrapError("SSO_CONFIG_INVALID", "Cấu hình đăng nhập ANKT không hợp lệ."); }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const stopped = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new SsoBootstrapError("SSO_TIMEOUT", "Đăng nhập mất quá nhiều thời gian. Hãy thử lại.")); }, config.timeoutMs ?? 10000);
    cancel = () => { controller.abort(); reject(new SsoBootstrapError("SSO_CANCELLED", "Đã hủy đăng nhập.")); };
    if (config.signal?.aborted) cancel(); else config.signal?.addEventListener("abort", cancel, { once: true });
  });
  const operation = async () => {
    const session = await config.loadSession();
    if (!session?.accessToken) throw new SsoBootstrapError("ANKT_LOGIN_REQUIRED", "Vui lòng đăng nhập ANKT để tiếp tục.");
    const send = (token: string) => (config.fetcher ?? fetch)(new URL("/sso/bootstrap", issuer), {
      method: "POST", credentials: "omit", redirect: "error", signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transactionId: config.transaction }),
    });
    let response = await send(session.accessToken);
    if (response.status === 401) {
      let token: string;
      try { token = await config.refreshSession(session.accessToken); }
      catch { throw new SsoBootstrapError("ANKT_LOGIN_REQUIRED", "Phiên ANKT đã hết hạn. Vui lòng đăng nhập lại."); }
      response = await send(token);
    }
    if (response.status === 401) throw new SsoBootstrapError("ANKT_LOGIN_REQUIRED", "Phiên ANKT đã hết hạn. Vui lòng đăng nhập lại.");
    if (!response.ok) throw new SsoBootstrapError("SSO_UNAVAILABLE", response.status === 429 ? "Bạn thử quá nhiều lần. Vui lòng chờ một phút." : "Yêu cầu đăng nhập không còn hiệu lực. Hãy mở lại Mini App.");
    let url: URL;
    try {
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("completionUrl" in payload) || typeof payload.completionUrl !== "string") throw new Error();
      url = new URL(payload.completionUrl);
      if (url.origin !== issuer.origin || url.pathname !== "/sso/complete" || url.username || url.password || url.hash ||
        [...url.searchParams.keys()].length !== 1 || url.searchParams.get("transaction") !== config.transaction) throw new Error();
    } catch { throw new SsoBootstrapError("SSO_RESPONSE_INVALID", "Phản hồi đăng nhập không hợp lệ."); }
    return url.href;
  };
  try { return await Promise.race([operation(), stopped]); }
  finally { clearTimeout(timer); if (cancel) config.signal?.removeEventListener("abort", cancel); }
}
