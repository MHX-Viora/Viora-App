import { useEffect, useState, type ReactNode } from "react";
import { router, usePathname, type Href } from "expo-router";
import { useIsFocused } from '@react-navigation/native';
import Head from "expo-router/head";
import { DeveloperSessionProvider, useDeveloperSession } from "./session.web";
import Link from "./navigation.web";
import { Header, Footer } from "./components/site-shell";
import { AuthForm } from "./components/auth-form";
import { AccountSettings } from "./components/account-settings";
import { SessionKeepAlive } from "./components/account-menu";
import Home, { metadata as homeMeta } from "./pages/home";
import Docs, { metadata as docsMeta } from "./pages/docs";
import GettingStarted, { metadata as startMeta } from "./pages/gettingStarted";
import Contact, { metadata as contactMeta } from "./pages/contact";
import Policies, { metadata as policiesMeta } from "./pages/policies";
import Register, { metadata as registerMeta } from "./pages/register";
import Forgot, { metadata as forgotMeta } from "./pages/forgot";
import Verify, { metadata as verifyMeta } from "./pages/verify";
import Reset, { metadata as resetMeta } from "./pages/reset";
import { MiniAppDashboard, MiniAppsProvider, useCreateMiniApp } from "./components/mini-apps";
import { MiniAppDetail } from "./components/mini-app-detail";
import { pageMetadata } from "./lib/site";
import "./developer.css";
import "./mini-app.css";
import "./landing.css";

const publicPages = {
  "": [Home, homeMeta], "/docs": [Docs, docsMeta], "/docs/getting-started": [GettingStarted, startMeta],
  "/contact": [Contact, contactMeta], "/policies": [Policies, policiesMeta], "/register": [Register, registerMeta],
  "/forgot-password": [Forgot, forgotMeta], "/verify-email": [Verify, verifyMeta], "/reset-password": [Reset, resetMeta],
} as const;

function ConsoleNavigation() {
  const create = useCreateMiniApp(); const [open, setOpen] = useState(false);
  return <><button className="button button-secondary mini-menu-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>☰ Menu Console</button>
    <aside className={`console-sidebar${open ? ' mini-sidebar-open' : ''}`}><p className="eyebrow">DEVELOPER CONSOLE</p><nav aria-label="Developer Console"><Link href="/console" onClick={() => setOpen(false)}>Tổng quan</Link><button type="button" onClick={() => { setOpen(false); create(); }}>Tạo Mini App</button><Link href="/console/settings" onClick={() => setOpen(false)}>Cài đặt</Link><Link href="/docs">Xem hướng dẫn ↗</Link></nav></aside>
    {open && <button className="mini-drawer-backdrop" aria-label="Đóng menu Console" onClick={() => setOpen(false)} />}</>;
}
function ConsoleGuard({ children }: { children: ReactNode }) {
  const session = useDeveloperSession();
  useEffect(() => {
    if (!session.loading && !session.unavailable && !session.account) router.replace("/developers/login" as Href);
  }, [session.account, session.loading, session.unavailable]);
  if (session.loading) return <div className="container error-page" role="status">Đang kiểm tra phiên đăng nhập…</div>;
  if (session.unavailable) return <div className="container error-page"><h1>Chưa kiểm tra được phiên đăng nhập.</h1><p>Vui lòng thử lại khi dịch vụ tài khoản có kết nối.</p><button className="button" onClick={() => void session.refresh()}>Thử lại</button></div>;
  if (!session.account) return null;
  return <MiniAppsProvider><div className="container console-layout"><SessionKeepAlive /><ConsoleNavigation /><div className="console-content">{children}</div></div></MiniAppsProvider>;
}
function Settings() { const { account } = useDeveloperSession(); return account ? <AccountSettings account={account} /> : null; }
function Login() {
  const session = useDeveloperSession();
  useEffect(() => { if (session.account && !session.loading) router.replace("/developers/console" as Href); }, [session.account, session.loading]);
  if (session.loading || session.account) return <div className="container error-page" role="status">Đang kiểm tra phiên đăng nhập…</div>;
  return <AuthForm mode="login" />;
}
function Content() {
  const path = usePathname().replace(/^\/developers/, "").replace(/\/$/, "");
  const page = publicPages[path as keyof typeof publicPages];
  let metadata = page?.[1] ?? pageMetadata("Không tìm thấy trang", path, "Trang Developer không tồn tại.", false);
  let content: ReactNode;
  if (page) { const Page = page[0]; content = <Page />; }
  else if (path === "/login") { metadata = pageMetadata("Đăng nhập", path, "Đăng nhập tài khoản Developer.", false); content = <Login />; }
  else if (["/console", "/console/settings", "/console/apps"].includes(path) || /^\/console\/apps\/app_[A-Za-z0-9_-]{43}$/.test(path)) {
    metadata = pageMetadata(path === "/console/settings" ? "Cài đặt Developer" : "Developer Console", path, "Quản lý Mini App và tài khoản Developer.", false);
    content = <ConsoleGuard>{path === "/console/settings" ? <Settings /> : path.startsWith('/console/apps/app_') ? <MiniAppDetail key={path} appId={path.split('/').at(-1)!} /> : <MiniAppDashboard />}</ConsoleGuard>;
  } else content = <div className="container error-page"><h1>Không tìm thấy trang.</h1><Link className="button" href="/">Về trang Developer</Link></div>;
  useEffect(() => { document.querySelector('.developer-site')?.scrollTo(0, 0); }, [path]);
  return <div className={`developer-site${path === '' ? ' developer-landing' : ''}`}><Head><title>{metadata.title}</title><meta name="description" content={metadata.description} /><meta name="robots" content={metadata.index ? "index,follow" : "noindex,nofollow"} /><link rel="canonical" href={metadata.canonical} /></Head><a className="skip-link" href="#developer-main">Bỏ qua điều hướng</a><Header landing={path === ''} /><main id="developer-main">{content}</main><Footer landing={path === ''} /></div>;
}
export default function DeveloperScreen() {
  // Expo retains screens in its stack. Unfocused screens must release credentials and account UI state.
  const focused = useIsFocused();
  return focused ? <DeveloperSessionProvider><Content /></DeveloperSessionProvider> : null;
}
