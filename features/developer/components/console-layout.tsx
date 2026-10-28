import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link, { usePathname } from '../navigation.web';
import { consoleActiveItem } from '../lib/console-navigation';
import { useCreateMiniApp } from './mini-apps';
import { LandingIcon } from './landing-icon';

function ConsoleItems({ close }: { close: () => void }) {
  const active = consoleActiveItem(usePathname());
  const create = useCreateMiniApp();
  return <nav aria-label="Developer Console">
    <Link href="/console" aria-current={active === 'overview' ? 'page' : undefined} onClick={close}><LandingIcon name="home" /><span>Tổng quan</span></Link>
    <button type="button" onClick={() => { close(); create(); }}><LandingIcon name="plusCircle" /><span>Tạo Mini App</span></button>
    <Link href="/console/apps" aria-current={active === 'apps' ? 'page' : undefined} onClick={close}><LandingIcon name="grid" /><span>Mini App của tôi</span></Link>
    <Link href="/console/notifications" aria-current={active === 'notifications' ? 'page' : undefined} onClick={close}><LandingIcon name="clipboard" /><span>Thông báo xét duyệt</span></Link>
  </nav>;
}

export function ConsoleLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && !drawer.current?.open) drawer.current?.showModal();
    if (!open && drawer.current?.open) drawer.current.close();
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width:1024px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, []);
  const close = () => setOpen(false);
  return <div className="console-layout">
    <aside className="console-sidebar"><p className="console-nav-label">DEVELOPER CONSOLE</p><ConsoleItems close={close} /></aside>
    <div className="console-content">
      <button ref={toggle} className="console-mobile-toggle" type="button" aria-controls="console-drawer" aria-expanded={open} onClick={() => setOpen(true)}><LandingIcon name="menu" /> Menu Console</button>
      {children}
    </div>
    <dialog ref={drawer} id="console-drawer" className="console-drawer" aria-label="Menu Developer Console" onClose={() => { setOpen(false); toggle.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="console-drawer-heading"><p className="console-nav-label">DEVELOPER CONSOLE</p><button type="button" className="mini-icon-button" aria-label="Đóng menu Console" onClick={close}><LandingIcon name="close" /></button></div>
      <ConsoleItems close={close} />
    </dialog>
  </div>;
}
