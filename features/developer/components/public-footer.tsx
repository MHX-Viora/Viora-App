import React from 'react';
import { DeveloperBrandMark, DeveloperFooterLinks } from './site-identity';

// Shared by the Expo portal and prerendered docs without a router dependency.
export function DeveloperPublicFooter() {
  return <footer className="site-footer developer-public-footer">
    <div className="footer-container footer-inner">
      <div><a href="/developers" className="footer-brand" aria-label="ANKT Developer — Trang chủ"><DeveloperBrandMark /></a>
        <p>Cùng xây dựng trải nghiệm tốt hơn cho cộng đồng ANKT.</p></div>
      <nav aria-label="Điều hướng cuối trang"><DeveloperFooterLinks /></nav>
    </div>
    <div className="footer-container footer-copyright">© {new Date().getFullYear()} ANKT · Developer Platform</div>
  </footer>;
}
