export type AuthMode = "register" | "login" | "forgot" | "verify" | "reset";
export type AuthValues = { fullName?: string; email?: string; password?: string; confirmPassword?: string; acceptTerms?: boolean; token?: string };
export function validateAuthForm(mode: AuthMode, values: AuthValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (["register", "login", "forgot"].includes(mode) && (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254)) errors.email = "Nhập địa chỉ email hợp lệ.";
  if (mode === "register" && (!values.fullName || values.fullName.trim().length < 2 || values.fullName.trim().length > 120)) errors.fullName = "Họ tên cần 2–120 ký tự.";
  if (["register", "login", "reset"].includes(mode) && (!values.password || values.password.length > 128 || (mode !== "login" && (values.password.length < 12 || new Set(values.password).size < 4)))) errors.password = mode === "login" ? "Nhập mật khẩu." : "Dùng 12–128 ký tự và mật khẩu đủ đa dạng.";
  if (["register", "reset"].includes(mode) && values.confirmPassword !== values.password) errors.confirmPassword = "Mật khẩu xác nhận chưa trùng khớp.";
  if (mode === "register" && !values.acceptTerms) errors.acceptTerms = "Bạn cần đồng ý điều khoản để đăng ký.";
  if (["verify", "reset"].includes(mode) && values.token?.length !== 43) errors.token = "Mở liên kết hợp lệ từ email để tiếp tục.";
  return errors;
}
