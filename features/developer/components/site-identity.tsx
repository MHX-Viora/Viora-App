import React from 'react';
import { BASE_PATH } from '../lib/site';

// Pure identity/footer primitives shared by Expo portal and static docs. They
// import no router or account provider, so public prerender stays independent.
export function DeveloperBrandMark({ documentation = false }: { documentation?: boolean }) {
  return <><img src={`${BASE_PATH}/brand.png`} alt="" width={documentation ? 32 : 38} height={documentation ? 32 : 38} loading="eager" />
    <span>ANKT <span className={documentation ? 'docs-brand-divider' : 'brand-divider'}>/</span> <span className="brand-label">Developer</span></span></>;
}
export function DeveloperFooterLinks() {
  return <><a href={`${BASE_PATH}/docs`}>Tài liệu</a><a href={`${BASE_PATH}/docs/sdk`}>SDK</a><a href={`${BASE_PATH}/docs/getting-started`}>Hướng dẫn</a><a href="/">Cộng đồng</a><a href={`${BASE_PATH}/policies`}>Điều khoản</a><a href={`${BASE_PATH}/contact`}>Liên hệ</a></>;
}
