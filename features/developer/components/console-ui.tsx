import { useId, type ReactNode } from 'react';
import Link from '../navigation.web';
import { LandingIcon } from './landing-icon';

export function ConsoleBreadcrumb({ current, parent }: { current: string; parent?: { label: string; href: string } }) {
  return <nav className="console-breadcrumb" aria-label="Đường dẫn"><Link href="/console">Developer Console</Link><LandingIcon name="chevron" />{parent && <><Link href={parent.href}>{parent.label}</Link><LandingIcon name="chevron" /></>}<span aria-current="page">{current}</span></nav>;
}
export function ConsolePageHeader({ title, description, action, id }: { title: string; description: string; action?: ReactNode; id?: string }) {
  return <><ConsoleBreadcrumb current={title} /><header className="console-page-heading"><div><h1 id={id}>{title}</h1><p>{description}</p></div>{action}</header></>;
}
export function CreateAppButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="button console-create-button" onClick={onClick}><span aria-hidden="true">+</span> Tạo Mini App</button>;
}

export function MiniAppEmptyArt() {
  const id = useId().replace(/:/g, '');
  return <svg className="console-empty-art" viewBox="0 0 420 200" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-window`} x1="210" y1="47" x2="210" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="#E2F1FF" /></linearGradient><linearGradient id={`${id}-blue`} x1="105" y1="95" x2="137" y2="132" gradientUnits="userSpaceOnUse"><stop stopColor="#54B7FF" /><stop offset="1" stopColor="#0866D9" /></linearGradient><filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#126FC4" floodOpacity=".13" /></filter></defs>
    <ellipse cx="210" cy="94" rx="130" ry="83" fill="#EAF5FF" /><ellipse cx="209" cy="181" rx="79" ry="5" fill="#DFEDFA" />
    <g fill="#A8D6F3"><circle cx="139" cy="22" r="3" /><circle cx="255" cy="17" r="3" /><circle cx="286" cy="31" r="2" /><circle cx="94" cy="58" r="2" /></g>
    <g fill="#0879EF"><path d="m72 82 4 4-4 4-4-4 4-4ZM351 102l4 4-4 4-4-4 4-4Z" /></g>
    <g filter={`url(#${id}-shadow)`}><rect x="139" y="44" width="146" height="112" rx="12" fill={`url(#${id}-window)`} stroke="#DBEAF6" /><path d="M139 66h146" stroke="#DCEAF5" /><circle cx="153" cy="55" r="3.5" fill="#FC727E" /><circle cx="165" cy="55" r="3.5" fill="#F7C85A" /><circle cx="177" cy="55" r="3.5" fill="#46CE9E" /><path d="m198 94-13 12 13 12m28-24 13 12-13 12m-12-28-7 33" stroke="#0879EF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
    <g filter={`url(#${id}-shadow)`}><rect x="83" y="94" width="40" height="46" rx="10" fill={`url(#${id}-blue)`} /><rect x="96" y="103" width="14" height="26" rx="2" stroke="white" strokeWidth="2" /><path d="M101 125h4" stroke="white" strokeLinecap="round" /></g>
    <g filter={`url(#${id}-shadow)`}><rect x="291" y="33" width="42" height="43" rx="11" fill="#36C98C" /><path d="m310 43 4 0 1 4 4-1 2 3-3 3 3 3-2 3-4-1-1 4h-4l-1-4-4 1-2-3 3-3-3-3 2-3 4 1 1-4Z" fill="white" /><circle cx="312" cy="52" r="4" fill="#36C98C" /></g>
    <rect x="304" y="120" width="39" height="38" rx="10" fill="#D0F0FF" /><path d="M315 144a5 5 0 0 1-1-10 8 8 0 0 1 15-1 6 6 0 0 1 1 11h-15Z" fill="#31B4EF" />
  </svg>;
}

export function MiniAppEmptyState({ create }: { create: () => void }) {
  return <section className="console-empty-state" aria-labelledby="mini-empty-heading"><div className="console-empty-content"><MiniAppEmptyArt /><h2 id="mini-empty-heading">Bạn chưa có Mini App nào.</h2><p>Tạo Mini App đầu tiên để nhận App ID, cấu hình tích hợp và bắt đầu xây dựng trải nghiệm cho cộng đồng người dùng ANKT.</p><CreateAppButton onClick={create} /></div>
    <div className="console-empty-benefits"><div><span className="console-benefit-icon"><LandingIcon name="bolt" /></span><p><strong>Tích hợp nhanh chóng</strong><span>SDK và tài liệu chi tiết</span></p></div><div><span className="console-benefit-icon"><LandingIcon name="shield" /></span><p><strong>Bảo mật và ổn định</strong><span>Cấu hình tích hợp an toàn</span></p></div><div><span className="console-benefit-icon"><LandingIcon name="users" /></span><p><strong>Kết nối cộng đồng</strong><span>Phát triển cùng nền tảng ANKT</span></p></div></div>
  </section>;
}
