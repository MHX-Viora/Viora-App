import React, { useEffect, useState } from 'react';
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let saved: string | null = null; try { saved = localStorage.getItem('ankt-docs-theme'); } catch {}
    setDark(saved === 'dark' || saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => { document.querySelector<HTMLElement>('.ankt-docs')?.setAttribute('data-theme', dark ? 'dark' : 'light'); }, [dark]);
  function toggle() { const next = !dark; setDark(next); try { localStorage.setItem('ankt-docs-theme', next ? 'dark' : 'light'); } catch {} }
  return <button className="docs-theme-toggle" type="button" onClick={toggle} aria-pressed={dark} aria-label="Giao diện tối">{dark ? 'Sáng' : 'Tối'}</button>;
}
