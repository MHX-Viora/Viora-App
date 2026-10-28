import React from 'react';
import { renderToString } from 'react-dom/server';
import type { DocPage } from './content-schema';
import { documentUrl } from './content-schema';
import { DocsPage, DocsNotFound } from '../docs-page';

export function renderNotFoundDocument(options: { script: string; stylesheet: string }) {
  return '<!doctype html>' + renderToString(<html lang="vi"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Không tìm thấy tài liệu | ANKT Developer</title><meta name="robots" content="noindex,nofollow" />
    <link rel="stylesheet" href={options.stylesheet} /><script type="module" src={options.script} /></head>
    <body className="docs-document"><div id="docs-root" data-slug="__not-found__"><DocsNotFound /></div></body></html>);
}

export function publicOrigin(value: string) {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw Error('Invalid public origin');
  return url.origin;
}
export function renderDocument(page: DocPage, options: { origin: string; script: string; stylesheet: string }) {
  const canonical = publicOrigin(options.origin) + documentUrl(page.slug);
  const title = `${page.title} | ANKT Developer`;
  return '<!doctype html>' + renderToString(<html lang="vi"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title><meta name="description" content={page.description} /><meta name="robots" content="index,follow" />
    <link rel="canonical" href={canonical} /><meta property="og:type" content="article" /><meta property="og:title" content={title} /><meta property="og:description" content={page.description} /><meta property="og:url" content={canonical} />
    <link rel="icon" href="/developers/brand.png" />
    <meta name="twitter:card" content="summary" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={page.description} />
    <link rel="stylesheet" href={options.stylesheet} /><script type="module" src={options.script} /></head>
    <body className="docs-document"><div id="docs-root" data-slug={page.slug}><DocsPage page={page} /></div></body></html>);
}
