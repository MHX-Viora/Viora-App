import Image from "../image.web";
import Link from "../navigation.web";
import { BASE_PATH } from "../lib/site";
import { useDeveloperSession } from "../session.web";
import { AccountMenu } from "./account-menu";
import { useEffect, useRef, useState } from "react";
import { LandingIcon } from "./landing-icon";

export function Brand() {
  return <Link href="/" className="brand" aria-label="ANKT Developer — Trang chủ">
    <Image src={`${BASE_PATH}/brand.png`} alt="" width={38} height={38} priority />
    <span>ANKT <span className="brand-divider">/</span> <span className="brand-label">Developer</span></span>
  </Link>;
}

function LandingHeader() {
  const session = useDeveloperSession();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <header ref={header} className="site-header landing-header"><div className="container header-inner">
    <Brand />
    <nav id="landing-navigation" className={`landing-navigation${open ? ' is-open' : ''}`} aria-label="Điều hướng chính" onClick={event => { if (event.target instanceof Element && event.target.closest('a')) setOpen(false); }}>
      <Link href="/docs">Tài liệu</Link><Link href="/docs#roadmap">SDK</Link><Link href="/docs/getting-started">Hướng dẫn</Link><a href="/">Cộng đồng</a>
      <div className="landing-mobile-actions">{session.account ? <Link href="/console">Điều khiển <LandingIcon name="arrow" /></Link> : !session.loading && !session.unavailable ? <><Link href="/login">Đăng nhập</Link><Link href="/register" className="button">Đăng ký</Link></> : <Link href="/console">Kiểm tra phiên đăng nhập</Link>}</div>
    </nav>
    <div className="header-actions">{session.account ? <AccountMenu account={session.account} /> : session.loading ? <span className="landing-session-status" role="status">Đang kiểm tra phiên…</span> : session.unavailable ? <Link href="/console">Kiểm tra phiên đăng nhập</Link> : <><Link href="/login">Đăng nhập</Link><Link className="button button-small" href="/register">Đăng ký</Link></>}</div>
    <button ref={toggle} type="button" className="landing-menu-toggle" aria-label={open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'} aria-expanded={open} aria-controls="landing-navigation" onClick={() => setOpen(!open)}><LandingIcon name={open ? 'close' : 'menu'} /></button>
  </div></header>;
}

export function Header({ landing = false }: { landing?: boolean }) {
  const session = useDeveloperSession();
  if (landing) return <LandingHeader />;
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <nav className="main-nav" aria-label="Điều hướng chính">
      <Link href="/docs">Tài liệu</Link><Link href="/docs/getting-started">Bắt đầu</Link>
    </nav>
    <div className="header-actions">{session.account ? <AccountMenu account={session.account} /> : session.loading ? <span role="status">Đang kiểm tra phiên…</span> : session.unavailable ? <Link href="/console">Kiểm tra phiên đăng nhập</Link> : <><Link href="/login">Đăng nhập</Link><Link className="button button-small" href="/register">Đăng ký <span aria-hidden="true">↗</span></Link></>}</div>
  </div></header>;
}

export function Footer({ landing = false }: { landing?: boolean }) {
  if (landing) return <footer className="site-footer landing-footer"><div className="container landing-footer-inner"><div><Brand /><p>Cùng xây dựng trải nghiệm tốt hơn cho cộng đồng ANKT.</p></div><nav aria-label="Điều hướng cuối trang"><Link href="/docs">Tài liệu</Link><Link href="/docs#roadmap">SDK</Link><Link href="/docs/getting-started">Hướng dẫn</Link><a href="/">Cộng đồng</a><Link href="/policies">Điều khoản</Link><Link href="/contact">Liên hệ</Link></nav></div><div className="container landing-copyright">© {new Date().getFullYear()} ANKT · Developer Platform</div></footer>;
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><div><Brand /><p>Cùng xây dựng những trải nghiệm<br />có ích cho cộng đồng ANKT.</p></div>
      <nav aria-label="Điều hướng cuối trang"><Link href="/docs">Tài liệu</Link><Link href="/docs/getting-started">Hướng dẫn tích hợp</Link><Link href="/policies">Chính sách</Link><Link href="/contact">Liên hệ</Link></nav>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} ANKT</span><span>Developer Platform · Giai đoạn nền tảng</span><a href="/">Về ANKT ↗</a></div>
  </div></footer>;
}
