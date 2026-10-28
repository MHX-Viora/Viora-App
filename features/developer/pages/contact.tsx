import { DocsShell } from "../components/docs-shell";
import { pageMetadata } from "../lib/site";
export const metadata = pageMetadata("Liên hệ", "/contact", "Hướng dẫn liên hệ ANKT trong giai đoạn xây dựng Developer Platform.");
export default function Contact() { return <DocsShell title="Liên hệ ANKT" description="Kênh hỗ trợ dành cho tài khoản Developer."><h2>Cần hỗ trợ?</h2><p>Trong ứng dụng ANKT, mở Trang cá nhân → Cài đặt và hoạt động → Hỗ trợ để liên hệ qua kênh hiện có.</p><h2>Hỗ trợ tích hợp Developer</h2><p>Sử dụng kênh hỗ trợ hiện có để yêu cầu hỗ trợ tích hợp hoặc đăng ký credential backend đúng App ID/môi trường. Portal hiện chưa có biểu mẫu tự cấp secret; không gửi secret qua mã frontend hoặc ảnh chụp.</p><a className="button" href="/">Mở ANKT ↗</a></DocsShell>; }
