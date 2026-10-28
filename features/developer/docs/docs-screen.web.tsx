import React, { useEffect, useRef } from 'react';
import Head from 'expo-router/head';
import { DocsPage, DocsNotFound } from './docs-page';
import { findPage } from './lib/manifest';
import { pageMetadata } from '../lib/site';
import './docs.css';
import '../components/public-header.css';
import '../components/public-footer.css';
export function DocumentationScreen({ slug }: { slug: string }) {
  const scrollRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let hash = window.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch { /* Malformed anchors must not break the page. */ }
    if (hash) document.getElementById(hash)?.scrollIntoView();
    else scrollRoot.current?.scrollTo(0, 0);
  }, [slug]);
  const page = findPage(slug);
  if (!page) return <div ref={scrollRoot} className="developer-docs-screen"><Head><title>Không tìm thấy tài liệu | ANKT Developer</title><meta name="robots" content="noindex,nofollow" /></Head><DocsNotFound /></div>;
  const metadata = pageMetadata(page.title, `/docs${slug ? '/' + slug : ''}`, page.description);
  return <div ref={scrollRoot} className="developer-docs-screen"><Head><title>{metadata.title}</title><meta name="description" content={metadata.description} /><link rel="canonical" href={metadata.canonical} /><meta name="robots" content="index,follow" /></Head><DocsPage page={page} /></div>;
}
