"use client";
import Link, { useRouter } from "../navigation.web";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountRequest } from "../lib/account-client";
import { validateAuthForm, type AuthMode } from "../lib/auth-validation";
import { LandingIcon } from './landing-icon';
import './auth-form.css';

const titles: Record<AuthMode, [string, string]> = {
  register: ["Tạo tài khoản Developer", "Một tài khoản độc lập để phát triển cùng ANKT."],
  login: ["Chào mừng trở lại.", "Đăng nhập bằng tài khoản ANKT Developer của bạn."],
  forgot: ["Quên mật khẩu?", "Chúng tôi sẽ gửi hướng dẫn nếu email phù hợp với tài khoản Developer."],
  verify: ["Xác minh email", "Mở liên kết trong email, sau đó xác nhận để kích hoạt tài khoản Developer."],
  reset: ["Đặt lại mật khẩu", "Chọn mật khẩu mới. Các phiên đăng nhập cũ sẽ được thu hồi."],
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter(); const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState(""); const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false); const [showPassword, setShowPassword] = useState(false); const [token, setToken] = useState("");
  const [completed, setCompleted] = useState(false); const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (mode !== "verify" && mode !== "reset") return;
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (value) { setToken(value); window.history.replaceState(window.history.state, "", window.location.pathname); }
  }, [mode]);
  useEffect(() => { if (!cooldown) return; const id = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(id); }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget);
    const values = { fullName: String(data.get("fullName") ?? ""), email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? ""), confirmPassword: String(data.get("confirmPassword") ?? ""), acceptTerms: data.get("acceptTerms") === "on", rememberMe: data.get("rememberMe") === "on", token };
    const invalid = validateAuthForm(mode, values); setErrors(invalid); setFailure(""); setMessage("");
    if (Object.keys(invalid).length) {
      for (const field of Array.from(form.current?.elements ?? [])) {
        if (field instanceof HTMLInputElement && invalid[field.name]) { field.focus(); break; }
      }
      return;
    }
    setPending(true);
    try {
      const path = { register: "auth/register", login: "auth/login", forgot: "auth/forgot-password", verify: "auth/verify-email", reset: "auth/reset-password" }[mode];
      const body = mode === "verify" ? { token } : mode === "reset" ? { token, password: values.password, confirmPassword: values.confirmPassword } : values;
      const result = await accountRequest<{ message?: string }>(path, "POST", body);
      if (mode === "login") { router.replace("/console"); router.refresh(); return; }
      setMessage(result.message ?? "Yêu cầu đã được xử lý.");
      if (mode === "verify" || mode === "reset") setCompleted(true);
      if (mode === "forgot" || mode === "register") setCooldown(60);
      for (const field of ["password", "confirmPassword"]) { const input = form.current?.elements.namedItem(field); if (input instanceof HTMLInputElement) input.value = ""; }
    } catch (e) { setFailure(e instanceof Error ? e.message : "Không thể xử lý yêu cầu. Vui lòng thử lại."); }
    finally { setPending(false); }
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || cooldown) return;
    const address = String(new FormData(event.currentTarget).get("resendEmail") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setFailure("Nhập email hợp lệ để gửi lại."); return; }
    setPending(true); setFailure("");
    try { const result = await accountRequest<{ message: string }>("auth/resend-verification", "POST", { email: address }); setMessage(result.message); setCooldown(60); }
    catch (e) { setFailure(e instanceof Error ? e.message : "Không thể gửi email."); }
    finally { setPending(false); }
  }
  const fieldError = (name: string) => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>;
  const action = { register: "Đăng ký", login: "Đăng nhập", forgot: "Gửi hướng dẫn", verify: "Xác nhận email", reset: "Đổi mật khẩu" }[mode];
  const refined = mode === 'login' || mode === 'register';
  return <section className={`auth-page container${refined ? ' auth-refined' : ''}`}><div className="auth-context">
      {refined && <span className="auth-symbol"><LandingIcon name="code" /></span>}
      <p className="eyebrow">ANKT / DEVELOPER ACCOUNTS</p><h1>{titles[mode][0]}</h1><p>{titles[mode][1]}</p>
      {refined && <ul className="auth-benefits"><li><LandingIcon name="grid" /><span>Tạo và quản lý Mini App</span></li><li><LandingIcon name="code" /><span>Tích hợp SDK và ANKT Login</span></li><li><LandingIcon name="book" /><span>Hướng dẫn từng bước cho Developer</span></li></ul>}
      <Link className="inline-link" href="/docs/getting-started">Khám phá hướng dẫn tích hợp ↗</Link><div className="auth-note"><strong>Không gian riêng cho nhà phát triển.</strong><p>Tài khoản Developer tách biệt với tài khoản mạng xã hội ANKT. Quản lý Mini App, cấu hình tích hợp và xác minh domain trong Developer Console.</p></div></div>
    <div className="auth-panel">{refined && <div className="auth-panel-heading"><h2>{mode === 'login' ? 'Đăng nhập Developer' : 'Đăng ký Developer'}</h2><p>{mode === 'login' ? 'Tiếp tục xây dựng Mini App của bạn.' : 'Điền thông tin để tạo tài khoản của bạn.'}</p></div>}{failure && <p className="form-alert error" role="alert">{failure}</p>}{message && <div className="form-alert success" role="status"><p>{message}</p>{mode === "register" && <Link className="inline-link" href="/verify-email">Mở trang xác minh / gửi lại email →</Link>}</div>}
      {!completed && <form ref={form} onSubmit={submit} noValidate aria-label={titles[mode][0]}><fieldset disabled={pending}>
        {mode === "register" && <div className="form-field"><label htmlFor="fullName">Họ và tên</label><input id="fullName" name="fullName" autoComplete="name" maxLength={120} required aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} />{fieldError("fullName")}</div>}
        {["register", "login", "forgot"].includes(mode) && <div className="form-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{fieldError("email")}</div>}
        {["register", "login", "reset"].includes(mode) && <><div className="form-field"><label htmlFor="password">{mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}</label><div className="password-input"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} maxLength={128} required aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ẩn" : "Hiện"}</button></div>{fieldError("password")}{mode !== "login" && <span className="field-help">12–128 ký tự. Ưu tiên cụm mật khẩu dài, dễ nhớ.</span>}</div></>}
        {["register", "reset"].includes(mode) && <div className="form-field"><label htmlFor="confirmPassword">Xác nhận mật khẩu</label><input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={128} required aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} />{fieldError("confirmPassword")}</div>}
        {mode === "register" && <div className="form-field"><label className="check-label"><input type="checkbox" name="acceptTerms" required aria-invalid={!!errors.acceptTerms} /> <span>Tôi đồng ý <Link href="/policies">điều khoản dành cho Developer</Link>.</span></label>{fieldError("acceptTerms")}</div>}
        {mode === "login" && <div className="form-options"><label className="check-label"><input name="rememberMe" type="checkbox" /> Ghi nhớ phiên</label><Link href="/forgot-password">Quên mật khẩu?</Link></div>}
        {errors.token && <p className="field-error">{errors.token}</p>}
        <button className="button form-submit" type="submit" disabled={pending || cooldown > 0 || ((mode === "verify" || mode === "reset") && !token)}>{pending ? "Đang xử lý…" : cooldown ? `Có thể gửi lại sau ${cooldown}s` : action}</button>
      </fieldset></form>}
      {completed && <Link className="button form-submit" href="/login">Đăng nhập →</Link>}
      {mode === "verify" && !completed && <form className="resend-form" onSubmit={resend}><h2>Chưa nhận được email?</h2><label htmlFor="resendEmail">Email đăng ký</label><input id="resendEmail" name="resendEmail" type="email" autoComplete="email" maxLength={254} required disabled={pending} /><button className="text-button" disabled={pending || cooldown > 0}>{cooldown ? `Gửi lại sau ${cooldown}s` : "Gửi lại email xác minh"}</button></form>}
      {["login", "register"].includes(mode) && <><div className="form-divider">hoặc</div><button className="button button-secondary form-submit" disabled aria-describedby="ankt-unavailable">Tiếp tục bằng ANKT</button><p id="ankt-unavailable" className="field-help">Đăng nhập bằng ANKT hiện chưa khả dụng. Vui lòng sử dụng email và mật khẩu.</p><p className="auth-switch">{mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}<Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Đăng ký" : "Đăng nhập"}</Link></p>{mode === "login" && <Link className="inline-link" href="/verify-email">Gửi lại email xác minh →</Link>}</>}
    </div></section>;
}
