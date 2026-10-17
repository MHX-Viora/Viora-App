import Link from "../navigation.web";
import type { ReactNode } from "react";

export function DocsShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="container"><header className="page-heading"><nav className="breadcrumb" aria-label="Đường dẫn"><Link href="/">Developer</Link><span aria-hidden="true">/</span><Link href="/docs">Tài liệu</Link></nav><h1>{title}</h1><p>{description}</p></header>
    <div className="doc-layout"><nav className="doc-nav" aria-label="Tài liệu"><Link href="/docs">Tổng quan</Link><Link href="/docs/getting-started">Hướng dẫn bắt đầu</Link><Link href="/docs#roadmap">Lộ trình tính năng</Link><Link href="/contact">Hỗ trợ</Link></nav><article className="prose">{children}</article></div>
  </div>;
}
