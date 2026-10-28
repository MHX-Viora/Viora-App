import React, { useEffect, useRef, useState } from 'react';
import type { DocPage } from '../lib/content-schema';
import { searchDocuments, highlightText } from '../lib/search';
export function SearchDialog({ pages }: { pages: readonly DocPage[] }) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const results = searchDocuments(pages, query);
  function open() { const active = document.activeElement as HTMLElement; previousFocus.current = active?.tabIndex >= 0 ? active : trigger.current; dialog.current?.showModal(); input.current?.focus(); }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (dialog.current?.open) dialog.current.close(); else open(); } };
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  return <><button ref={trigger} className="docs-search-trigger" type="button" onClick={open}><span>Tìm tài liệu…</span><kbd>Ctrl K</kbd></button>
    <dialog ref={dialog} className="docs-search-dialog" aria-labelledby="docs-search-title" onClose={() => previousFocus.current?.focus()}>
      <header><h2 id="docs-search-title">Tìm trong tài liệu</h2><button type="button" aria-label="Đóng tìm kiếm" onClick={() => dialog.current?.close()}>Đóng</button></header>
      <label htmlFor="docs-search-input">Từ khóa</label><input ref={input} id="docs-search-input" type="search" maxLength={128} value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Ví dụ: xác minh tên miền" aria-controls="docs-search-results" onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); dialog.current?.querySelector<HTMLAnchorElement>('li a')?.focus(); } }} />
      <p role="status" className="docs-search-status">{query.trim() ? results.length ? `${results.length} kết quả` : 'Không tìm thấy tài liệu. Thử từ khóa khác.' : 'Tìm theo tiêu đề, đề mục hoặc nội dung.'}</p>
      <ul id="docs-search-results" onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        const links = Array.from(event.currentTarget.querySelectorAll('a')), index = links.indexOf(document.activeElement as HTMLAnchorElement);
        event.preventDefault(); const next = index + (event.key === 'ArrowDown' ? 1 : -1); if (next < 0) input.current?.focus(); else links[Math.min(next, links.length - 1)]?.focus();
      }}>{results.map(result => <li key={result.slug}><a href={result.href}><strong>{highlightText(result.title, query).map((part, i) => part.match ? <mark key={i}>{part.text}</mark> : part.text)}</strong>
        {result.heading && <small>{result.heading}</small>}<p>{highlightText(result.excerpt, query).map((part, i) => part.match ? <mark key={i}>{part.text}</mark> : part.text)}</p></a></li>)}</ul>
    </dialog></>;
}
