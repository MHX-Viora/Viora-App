import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { DeveloperBrandMark } from './site-identity';

// Router/session independent so the same header can also be prerendered in docs.
export function DeveloperPublicHeader({ actions }: { actions: ReactNode }) {
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
  return <header ref={header} className="site-header landing-header developer-public-header"><div className="container header-inner">
    <a href="/developers" className="brand" aria-label="ANKT Developer — Trang chủ"><DeveloperBrandMark /></a>
    <nav id="developer-public-navigation" className={`landing-navigation${open ? ' is-open' : ''}`} aria-label="Điều hướng chính" onClick={event => { if (event.target instanceof Element && event.target.closest('a')) setOpen(false); }}>
      <a href="/developers/docs">Tài liệu</a><a href="/developers/docs/sdk">SDK</a><a href="/developers/docs/getting-started">Hướng dẫn</a><a href="/">Cộng đồng</a>
    </nav>
    <div id="developer-public-actions" className={`header-actions${open ? ' is-open' : ''}`}>{actions}</div>
    <button ref={toggle} type="button" className="landing-menu-toggle" aria-label={open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'} aria-expanded={open} aria-controls="developer-public-navigation developer-public-actions" onClick={() => setOpen(!open)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
    </button>
  </div></header>;
}
