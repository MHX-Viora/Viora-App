"use client";
import Link, { usePathname, useRouter } from "../navigation.web";
import { useEffect, useState } from "react";
import { accountRequest, AccountApiError } from "../lib/account-client";
import type { DeveloperAccount } from "../lib/developer-types";

export function AccountMenu({ account }: { account: DeveloperAccount }) {
  const consoleView = /\/console(?:\/|$)/.test(usePathname());
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function logout() {
    setPending(true); setError("");
    try { await accountRequest("auth/logout", "POST"); router.replace("/login"); router.refresh(); }
    catch (e) {
      if (e instanceof AccountApiError && e.status === 401) { router.replace("/login"); router.refresh(); return; }
      setError(e instanceof Error ? e.message : "Không thể đăng xuất.");
    }
    finally { setPending(false); }
  }
  return <div className="signed-in-actions"><Link className="button button-small" href={consoleView ? "/docs" : "/console"}>{consoleView ? "Xem hướng dẫn ↗" : "Điều khiển ↗"}</Link>
    <details className="account-menu"><summary aria-label="Mở menu tài khoản"><span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" /> : account.fullName.slice(0, 1).toUpperCase()}</span></summary>
      <div className="account-dropdown"><strong>{account.fullName}</strong><span>{account.email}</span><Link href="/console/settings">Cài đặt tài khoản</Link><button onClick={() => void logout()} disabled={pending}>{pending ? "Đang đăng xuất…" : "Đăng xuất"}</button>{error && <p role="alert">{error}</p>}</div>
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
