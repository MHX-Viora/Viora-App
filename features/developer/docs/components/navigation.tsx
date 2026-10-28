import React, { useEffect, useRef, useState } from 'react';
import type { DocPage } from '../lib/content-schema';
import { documentUrl } from '../lib/content-schema';
export function Sidebar({ pages, slug }: { pages: readonly DocPage[]; slug: string }) {
  const groups = [...new Set(pages.map(page => page.group))];
  return <nav aria-label="Tài liệu">{groups.map(group => <details open key={group}><summary>{group}</summary>{pages.filter(page => page.group === group).map(page => <a key={page.slug} href={documentUrl(page.slug)} aria-current={page.slug === slug ? 'page' : undefined}>{page.title}</a>)}</details>)}</nav>;
}
export function MobileNavigation({ pages, slug }: { pages: readonly DocPage[]; slug: string }) {
  const dialog = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null);
  return <><button ref={button} type="button" className="docs-menu-trigger" onClick={() => dialog.current?.showModal()}>Menu tài liệu</button>
    <dialog ref={dialog} className="docs-navigation-dialog" aria-label="Điều hướng tài liệu" onClose={() => button.current?.focus()}>
      <button type="button" className="docs-dialog-close" onClick={() => dialog.current?.close()}>Đóng menu</button><Sidebar pages={pages} slug={slug} />
    </dialog></>;
}
export function TableOfContents({ page }: { page: DocPage }) {
  const [active, setActive] = useState('');
  useEffect(() => {
    let frame = 0;
    const scrollRoot = document.querySelector('.developer-docs-screen') ?? window;
    const measure = () => {
      frame = 0;
      const threshold = (document.querySelector('.developer-public-header')?.getBoundingClientRect().bottom ?? 100) + 48;
      let current = page.sections[0]?.id ?? '';
      for (const section of page.sections) if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= threshold) current = section.id;
      const viewport = scrollRoot instanceof Element ? scrollRoot : document.scrollingElement;
      if (viewport && viewport.scrollTop > 0 && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 2)
        current = page.sections.at(-1)?.id ?? current;
      setActive(current);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    scrollRoot.addEventListener('scroll', scroll, { passive: true }); measure();
    return () => { scrollRoot.removeEventListener('scroll', scroll); if (frame) cancelAnimationFrame(frame); };
  }, [page]);
  return <nav aria-label="Trên trang này"><strong>Trên trang này</strong>{page.sections.map(section => <a key={section.id} className={section.level === 3 ? 'docs-toc-sub' : undefined} href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>{section.title}</a>)}</nav>;
}
