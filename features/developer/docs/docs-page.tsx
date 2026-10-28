import React, { useEffect, useState } from 'react';
import type { DocBlock, DocPage } from './lib/content-schema';
import { documentUrl } from './lib/content-schema';
import { CodeExample } from './components/code-example';
import { Sidebar, MobileNavigation, TableOfContents } from './components/navigation';
import { SearchDialog } from './components/search-dialog';
import { AccountControls } from './components/account-controls';
import { pages } from './lib/manifest';
import { DeveloperPublicFooter } from '../components/public-footer';
import { DeveloperPublicHeader } from '../components/public-header';

export function DocsNotFound() {
  return <div className="ankt-docs" data-theme="light">
    <DeveloperPublicHeader actions={<AccountControls />} />
    <main className="docs-main docs-not-found"><h1>Không tìm thấy tài liệu</h1><p>Kiểm tra đường dẫn hoặc tìm trong danh mục tài liệu.</p><a href="/developers/docs">Về tài liệu ANKT Developer</a></main>
    <DeveloperPublicFooter />
  </div>;
}

export function ContentBlock({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'paragraph': return <p>{block.text}</p>;
    case 'list': return block.ordered ? <ol>{block.items.map(item => <li key={item}>{item}</li>)}</ol> : <ul>{block.items.map(item => <li key={item}>{item}</li>)}</ul>;
    case 'callout': return <aside className={`docs-callout ${block.tone ?? 'info'}`}><strong>{block.title}</strong><p>{block.text}</p></aside>;
    case 'code': return <CodeExample {...block} />;
    case 'table': return <div className="docs-table" tabIndex={0} role="region" aria-label="Bảng có thể cuộn"><table><thead><tr>{block.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case 'link': return <p><a href={block.href}>{block.text} <span aria-hidden="true">→</span></a></p>;
  }
}
export function DocsPage({ page }: { page: DocPage }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const position = pages.findIndex(candidate => candidate.slug === page.slug), previous = pages[position - 1], next = pages[position + 1];
  return <div className="ankt-docs" data-theme="light" data-hydrated={hydrated}><a className="docs-skip" href="#docs-main">Bỏ qua điều hướng</a>
    <DeveloperPublicHeader actions={<AccountControls />} />
    <div className="docs-tools"><a href={documentUrl('api-reference')}>API Reference</a><SearchDialog pages={pages} /></div>
    <div className="docs-mobile-tools"><MobileNavigation pages={pages} slug={page.slug} /><details><summary>Trên trang này</summary><TableOfContents page={page} /></details></div>
    <div className="docs-layout"><aside className="docs-sidebar"><Sidebar pages={pages} slug={page.slug} /></aside>
      <main id="docs-main" className="docs-main"><nav className="docs-breadcrumb" aria-label="Đường dẫn"><a href={documentUrl()}>Tài liệu</a><span aria-hidden="true">/</span><span>{page.group}</span></nav>
        <article><header className="docs-title"><p className="docs-eyebrow">ANKT DEVELOPER DOCUMENTATION</p><h1>{page.title}</h1><p>{page.description}</p><small>Cập nhật {page.updatedAt} · Tài liệu revision {page.revision}</small></header>
          {page.sections.map(section => <section key={section.id} id={section.id}>{section.level === 3 ? <h3>{section.title}</h3> : <h2>{section.title}</h2>}{section.blocks.map((block, index) => <ContentBlock block={block} key={index} />)}</section>)}
        </article><nav className="docs-page-links" aria-label="Trang trước và tiếp theo">
          {previous && <a className="docs-page-previous" rel="prev" href={documentUrl(previous.slug)}>
            <span className="docs-page-arrow" aria-hidden="true">←</span>
            <span className="docs-page-copy"><span className="docs-page-label">Trang trước</span><strong>{previous.title}</strong></span>
          </a>}
          {next && <a className="docs-page-next" rel="next" href={documentUrl(next.slug)}>
            <span className="docs-page-copy"><span className="docs-page-label">Tiếp theo</span><strong>{next.title}</strong></span>
            <span className="docs-page-arrow" aria-hidden="true">→</span>
          </a>}
        </nav>
        {page.related.length > 0 && <nav className="docs-related" aria-label="Bài liên quan"><strong>Đọc thêm</strong>{page.related.map(slug => <a key={slug} href={documentUrl(slug)}>{pages.find(candidate => candidate.slug === slug)?.title}</a>)}</nav>}
      </main><aside className="docs-toc"><TableOfContents page={page} /></aside>
    </div><DeveloperPublicFooter />
  </div>;
}
