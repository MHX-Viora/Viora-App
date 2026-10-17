import type { ReactNode } from 'react';

const paths = {
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  support: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v1a3 3 0 0 1-3 3h-4" /><rect x="2" y="11" width="5" height="7" rx="2" /><rect x="17" y="11" width="5" height="7" rx="2" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
  chart: <><path d="M4 20h17M6 16v-5m6 5V7m6 9V3" /></>,
  bulb: <><path d="M8 17c0-4-3-4-3-8a7 7 0 0 1 14 0c0 4-3 4-3 8H8Zm1 4h6m-5-4v-5m4 5v-5" /></>,
  file: <><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5" /></>,
  code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>;

export type LandingIconName = keyof typeof paths;
export function LandingIcon({ name, className = '' }: { name: LandingIconName; className?: string }) {
  return <svg className={`landing-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
