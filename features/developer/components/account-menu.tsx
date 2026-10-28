"use client";
import Link, { usePathname, useRouter } from "../navigation.web";
import { useEffect, useRef, useState } from "react";
import { accountRequest, AccountApiError } from "../lib/account-client";
import type { DeveloperAccount } from "../lib/developer-types";
import { LandingIcon } from './landing-icon';

export function AccountMenu({ account }: { account: DeveloperAccount }) {
  const consoleView = /\/console(?:\/|$)/.test(usePathname());
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  async function logout() {
    setPending(true); setError("");
    try { await accountRequest("auth/logout", "POST"); router.replace("/login"); router.refresh(); }
    catch (e) {
      if (e instanceof AccountApiError && e.status === 401) { router.replace("/login"); router.refresh(); return; }
      setError(e instanceof Error ? e.message : "Không thể đăng xuất.");
    }
    finally { setPending(false); }
  }
  return <div className="signed-in-actions">{!consoleView && <Link className="button button-small" href="/console">Điều khiển ↗</Link>}
    <details ref={menu} className="account-menu"><summary aria-label="Mở menu tài khoản"><span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" /> : account.fullName.slice(0, 1).toUpperCase()}</span><span className="account-identity" title={`${account.fullName} · ${account.email}`}><strong>{account.fullName}</strong><span>{account.email}</span></span><LandingIcon name="chevron" /></summary>
      <div className="account-dropdown"><strong>{account.fullName}</strong><span>{account.email}</span><Link href="/console/settings" onClick={() => { if (menu.current) menu.current.open = false; }}>Thông tin & bảo mật tài khoản</Link><button onClick={() => void logout()} disabled={pending}>{pending ? "Đang đăng xuất…" : "Đăng xuất"}</button>{error && <p role="alert">{error}</p>}</div>
    </details></div>;
}

export function SessionKeepAlive() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void accountRequest("auth/refresh", "POST").catch(e => {
      if (e instanceof AccountApiError && e.status === 401) { router.replace("/login"); router.refresh(); }
    }); };
    const interval = setInterval(refresh, 60 * 60 * 1000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [router]);
  return null;
}
