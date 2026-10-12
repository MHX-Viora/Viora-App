import { useEffect, useRef } from 'react';
import { pages } from './content.mjs';
import { renderBody } from './render.mjs';
import { initializeDocs } from './client.mjs';
import './docs.css';

export function DeveloperDocument({ slug = '' }: { slug?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const page = pages.find(item => item.slug === slug);
  useEffect(() => {
    if (!page) return;
    document.title = `${page.title} | ANKT Developers`;
    return initializeDocs(ref.current?.querySelector('.dev-docs') ?? null);
  }, [page]);
  if (!page) return <main><h1>Không tìm thấy hướng dẫn</h1><a href="/developers/docs">Về tài liệu</a></main>;
  return <div ref={ref} style={{ height: '100%', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: renderBody(slug) }} />;
}
