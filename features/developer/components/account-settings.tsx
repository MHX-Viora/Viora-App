"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "../navigation.web";
import { accountRequest } from "../lib/account-client";
import type { DeveloperAccount, DeveloperSession, LinkedIdentity } from "../lib/developer-types";
import { validateAuthForm } from "../lib/auth-validation";

export function AccountSettings({ account }: { account: DeveloperAccount }) {
  const router = useRouter(); const [pending, setPending] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [sessions, setSessions] = useState<DeveloperSession[]>([]); const [links, setLinks] = useState<LinkedIdentity[]>([]);
  const [loaded, setLoaded] = useState(false); const [confirmation, setConfirmation] = useState(false);
  async function load() {
    try { const [active, identities] = await Promise.all([accountRequest<DeveloperSession[]>("sessions"), accountRequest<LinkedIdentity[]>("linked-accounts")]); setSessions(active); setLinks(identities); setLoaded(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể tải dữ liệu tài khoản."); }
  }
  useEffect(() => { void load(); }, []);
  async function run(action: string, task: () => Promise<void>) {
    if (pending) return;
    setPending(action); setError(""); setMessage("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "Yêu cầu thất bại."); }
    finally { setPending(""); }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "").trim(); const avatarUrl = String(data.get("avatarUrl") ?? "").trim();
    if (fullName.length < 2 || fullName.length > 120 || (avatarUrl && !/^https:\/\//.test(avatarUrl))) { setError("Nhập họ tên 2–120 ký tự và URL ảnh HTTPS hợp lệ."); return; }
    await run("profile", async () => { await accountRequest("profile", "PATCH", { fullName, avatarUrl: avatarUrl || null }); setMessage("Đã lưu thông tin cá nhân."); router.refresh(); });
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const values = { currentPassword: String(data.get("currentPassword") ?? ""), password: String(data.get("password") ?? ""), confirmPassword: String(data.get("confirmPassword") ?? "") };
    const invalid = validateAuthForm("reset", { ...values, token: "x".repeat(43) });
    if (Object.keys(invalid).length || !values.currentPassword) { setError(Object.values(invalid)[0] ?? "Nhập mật khẩu hiện tại."); return; }
    await run("password", async () => { await accountRequest("auth/change-password", "POST", values); router.replace("/login"); router.refresh(); });
  }
  function logoutAll() { return run("logout", async () => { await accountRequest("auth/logout-all", "POST"); router.replace("/login"); router.refresh(); }); }
  function revoke(session: DeveloperSession) { return run(session.id, async () => { await accountRequest(`sessions/${session.id}`, "DELETE"); if (session.current) { router.replace("/login"); router.refresh(); } else { setMessage("Đã thu hồi phiên."); await load(); } }); }
  return <><p className="eyebrow">TÀI KHOẢN</p><h1>Cài đặt Developer</h1><p className="muted">Quản lý hồ sơ, bảo mật và các phiên đăng nhập của bạn.</p>
    {error && <p className="form-alert error" role="alert">{error}</p>}{message && <p className="form-alert success" role="status">{message}</p>}
    <section className="settings-section"><h2>Thông tin cá nhân</h2><form onSubmit={saveProfile}><fieldset disabled={!!pending}>
      <div className="profile-summary"><span className="avatar large">{account.avatarUrl ? <img src={account.avatarUrl} alt="Ảnh đại diện" referrerPolicy="no-referrer" /> : account.fullName[0]}</span><div><strong>{account.fullName}</strong><p className="verified-label">✓ Email đã xác minh</p></div></div>
      <div className="form-field"><label htmlFor="settings-name">Họ và tên</label><input id="settings-name" name="fullName" autoComplete="name" defaultValue={account.fullName} minLength={2} maxLength={120} required /></div>
      <div className="form-field"><label htmlFor="settings-email">Email</label><input id="settings-email" type="email" value={account.email} readOnly /><span className="field-help">Đổi email chưa được hỗ trợ trong giai đoạn này.</span></div>
      <div className="form-field"><label htmlFor="avatarUrl">URL ảnh đại diện HTTPS</label><input id="avatarUrl" name="avatarUrl" type="url" maxLength={2048} defaultValue={account.avatarUrl ?? ""} placeholder="https://…" /></div>
      <button className="button">{pending === "profile" ? "Đang lưu…" : "Lưu thay đổi"}</button>
    </fieldset></form></section>
    <section className="settings-section"><h2>Bảo mật</h2><p className="muted">Đổi mật khẩu sẽ đăng xuất toàn bộ thiết bị, gồm phiên hiện tại.</p>
      {account.hasPassword ? <form onSubmit={changePassword}><fieldset disabled={!!pending}><div className="form-field"><label htmlFor="currentPassword">Mật khẩu hiện tại</label><input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required /></div><div className="form-field"><label htmlFor="settings-password">Mật khẩu mới</label><input id="settings-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div><div className="form-field"><label htmlFor="settings-confirm">Xác nhận mật khẩu mới</label><input id="settings-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div><button className="button">{pending === "password" ? "Đang đổi mật khẩu…" : "Đổi mật khẩu và đăng xuất"}</button></fieldset></form> : <p>Thiết lập mật khẩu độc lập chưa khả dụng cho tài khoản chỉ liên kết.</p>}
    </section>
    <section className="settings-section"><h2>Phiên đăng nhập</h2>{!loaded ? <div role="status">Đang tải phiên… <button className="text-button" onClick={() => void load()}>Thử lại</button></div> : <ul className="sessions-list">{sessions.map(session => <li key={session.id}><div><strong>{session.current ? "Thiết bị hiện tại" : "Phiên đăng nhập"}</strong><p>{session.deviceInfo || "Không có thông tin thiết bị"}</p><small>Hết hạn: {new Date(session.expiresAt).toLocaleString("vi-VN")}</small></div><button className="text-button" disabled={!!pending} onClick={() => void revoke(session)}>{pending === session.id ? "Đang thu hồi…" : session.current ? "Đăng xuất" : "Thu hồi"}</button></li>)}</ul>}
      {!confirmation ? <button className="button button-secondary" onClick={() => setConfirmation(true)} disabled={!!pending}>Đăng xuất tất cả thiết bị</button> : <div className="notice"><p>Bạn sẽ cần đăng nhập lại trên tất cả thiết bị.</p><div className="actions"><button className="button" onClick={() => void logoutAll()} disabled={!!pending}>Xác nhận đăng xuất tất cả</button><button className="button button-secondary" onClick={() => setConfirmation(false)} disabled={!!pending}>Hủy</button></div></div>}
    </section>
    <section className="settings-section"><h2>Tài khoản liên kết</h2><p><strong>ANKT</strong> · {links.some(i => i.provider === "ankt") ? "Đã liên kết" : "Chưa liên kết"}</p><button className="button button-secondary" disabled>Liên kết tài khoản ANKT</button><p className="field-help">Đang chờ OAuth/OIDC Provider ANKT. Không chia sẻ mật khẩu hoặc access token ANKT với portal.</p>
      {links.map(identity => <form key={identity.id} onSubmit={event => { event.preventDefault(); const password = String(new FormData(event.currentTarget).get("unlinkPassword") ?? ""); void run("unlink", async () => { await accountRequest(`linked-accounts/${identity.id}`, "DELETE", { currentPassword: password }); router.replace("/login"); router.refresh(); }); }}><p>Nhà cung cấp: {identity.provider}</p><label htmlFor={`unlink-${identity.id}`}>Mật khẩu hiện tại để hủy liên kết</label><input id={`unlink-${identity.id}`} type="password" name="unlinkPassword" autoComplete="current-password" required maxLength={128} /><button className="text-button" disabled={!!pending || !account.hasPassword}>Hủy liên kết và đăng xuất</button>{!account.hasPassword && <p className="field-help">Không thể hủy phương thức đăng nhập cuối cùng.</p>}</form>)}
    </section></>;
}
