export const sdkReference = [
  {
    "id": "init",
    "name": "ANKT.init",
    "signature": "init(): Promise<void>",
    "parameters": "Không có tham số.",
    "returns": "Hoàn tất xác thực Bridge. Không tạo phiên trong backend ứng dụng đối tác.",
    "permission": "Host tin cậy, Website URL đã xác minh và phiên còn hiệu lực.",
    "errors": "HOST_UNAVAILABLE, INVALID_ORIGIN, INVALID_CLIENT, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "await ANKT.init();"
  },
  {
    "id": "session",
    "name": "ANKT.auth.getSession",
    "signature": "getSession(): Promise<MiniAppAuthSession>",
    "parameters": "Không có tham số.",
    "returns": "sessionId, environment (Sandbox|Production), expiresAt (Unix milliseconds) và scope profile.",
    "permission": "Host tin cậy, Website URL đã xác minh và phiên còn hiệu lực.",
    "errors": "HOST_UNAVAILABLE, INVALID_ORIGIN, INVALID_CLIENT, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "const session = await ANKT.auth.getSession();"
  },
  {
    "id": "user-info",
    "name": "ANKT.auth.getUserInfo",
    "signature": "getUserInfo(): Promise<MiniAppUserInfo>",
    "parameters": "Không có tham số.",
    "returns": "id, username, displayName, avatarUrl/coverUrl có thể null, gender, isSandbox, fullName có thể null. Chỉ là hồ sơ ANKT đã xác minh.",
    "permission": "Host tin cậy, Website URL đã xác minh và phiên còn hiệu lực.",
    "errors": "HOST_UNAVAILABLE, INVALID_ORIGIN, INVALID_CLIENT, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "const user = await ANKT.auth.getUserInfo();"
  },
  {
    "id": "login-code",
    "name": "ANKT.auth.getLoginCode",
    "signature": "getLoginCode(): Promise<MiniAppLoginCode>",
    "parameters": "Không có tham số.",
    "returns": "{code: string, expiresIn: 60}. Mỗi lần gọi cấp mã mới, chỉ dùng một lần; gửi ngay tới backend của bạn. Không cache, log hoặc đặt vào URL.",
    "permission": "Credential backend phải được ANKT đăng ký đúng app/môi trường; SDK dùng token Mini App đã xác minh.",
    "errors": "HOST_UNAVAILABLE, SESSION_EXPIRED, PARTNER_LOGIN_NOT_CONFIGURED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "const {code} = await ANKT.auth.getLoginCode();"
  },
  {
    "id": "token",
    "name": "ANKT.auth.getAccessToken",
    "signature": "getAccessToken(): Promise<string>",
    "parameters": "Không có tham số.",
    "returns": "Token opaque giới hạn cho Mini App, không phải JWT ANKT chính hoặc token nghiệp vụ của backend bạn. Ưu tiên dùng API SDK thay vì tự quản lý token.",
    "permission": "Host tin cậy, Website URL đã xác minh và phiên còn hiệu lực.",
    "errors": "HOST_UNAVAILABLE, INVALID_ORIGIN, INVALID_CLIENT, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "const token = await ANKT.auth.getAccessToken();"
  },
  {
    "id": "logout",
    "name": "ANKT.auth.logout",
    "signature": "logout(): Promise<void>",
    "parameters": "Không có tham số.",
    "returns": "Thu hồi token Mini App hiện tại; không tự đăng xuất ANKT chính hoặc session backend đối tác. Backend phải kiểm tra grant và frontend xóa phiên riêng.",
    "permission": "Host tin cậy, Website URL đã xác minh và phiên còn hiệu lực.",
    "errors": "HOST_UNAVAILABLE, INVALID_ORIGIN, INVALID_CLIENT, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "await ANKT.auth.logout();"
  },
  {
    "id": "dispose",
    "name": "ANKT.dispose",
    "signature": "dispose(): void",
    "parameters": "Không có tham số.",
    "returns": "Xóa trạng thái/token trong bộ nhớ, gỡ listeners và hủy request. Không thay thế logout server-side.",
    "permission": "Dùng khi unmount/pagehide.",
    "errors": "Không ném lỗi do khởi tạo lại hoặc dispose nhiều lần.",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "ANKT.dispose();"
  },
  {
    "id": "environment",
    "name": "ANKT.app.getEnvironment",
    "signature": "getEnvironment(): 'sandbox' | 'production' | null",
    "parameters": "Không có tham số.",
    "returns": "Trả null trước xác thực hoặc sau hết hạn; sau xác thực trả môi trường đã được Host xác minh.",
    "permission": "Không dùng kết quả frontend thay cho kiểm tra môi trường ở backend.",
    "errors": "Không ném lỗi.",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "const environment = ANKT.app.getEnvironment();"
  },
  {
    "id": "close",
    "name": "ANKT.app.close",
    "signature": "close(): Promise<void>",
    "parameters": "Không có tham số.",
    "returns": "Thu hồi token Mini App, yêu cầu Host đóng và dispose SDK.",
    "permission": "Phiên Mini App hiện tại.",
    "errors": "HOST_UNAVAILABLE, SESSION_EXPIRED, AUTH_EXCHANGE_FAILED",
    "support": "API hiện hành SDK 0.4.1 · Web iframe, Android và iOS WebView.",
    "example": "await ANKT.app.close();"
  }
];
