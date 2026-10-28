import Link from "../navigation.web";
import { DeveloperBrandMark } from './site-identity';
import { useDeveloperSession } from "../session.web";
import { AccountMenu } from "./account-menu";
import { DeveloperPublicHeader } from './public-header';

export function Brand() {
  return <Link href="/" className="brand" aria-label="ANKT Developer — Trang chủ">
    <DeveloperBrandMark />
  </Link>;
}

export function Header() {
  const session = useDeveloperSession();
  return <DeveloperPublicHeader actions={session.account ? <AccountMenu account={session.account} /> : session.loading ? <span className="landing-session-status" role="status">Đang kiểm tra phiên…</span> : session.unavailable ? <Link href="/console">Kiểm tra phiên đăng nhập</Link> : <><Link href="/login">Đăng nhập</Link><Link className="button button-small" href="/register">Đăng ký</Link></>} />;
}

export { DeveloperPublicFooter as Footer } from './public-footer';
