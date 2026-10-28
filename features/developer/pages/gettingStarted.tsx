import { DocsShell } from '../components/docs-shell';
import { pageMetadata } from '../lib/site';
import Link from '../navigation.web';
export const metadata = pageMetadata('Hướng dẫn bắt đầu', '/docs/getting-started', 'Tích hợp website HTTPS, SDK và backend Mini App trên ANKT production.');
export default function GettingStarted() {
  return <DocsShell title="Bắt đầu tích hợp Mini App" description="Sử dụng nền tảng ANKT production và website HTTPS của bạn.">
    <h2>1. Đăng ký và xác minh website</h2><p>Đăng ký Developer tại https://mxh.ankt.vn/developers, tạo Mini App, lưu Website URL thật và xác minh domain theo file được cấp.</p>
    <h2>2. Tải SDK hiện hành</h2><p>Tải SDK 0.4.1 trong Tích hợp Auth Bridge. Host production là https://mxh.ankt.vn. Developer không cần source code hoặc server ANKT riêng.</p>
    <h2>3. Đăng nhập backend của bạn</h2><p>Frontend gọi auth.getLoginCode; backend đổi mã bằng credential server đã đăng ký, liên kết tài khoản và cấp phiên riêng. Frontend nhận phiên vào auth store/router. Đã kết nối hồ sơ chưa đồng nghĩa đăng nhập ứng dụng.</p>
    <h2>4. Kiểm thử và phát hành</h2><p>Mở Sandbox trong Portal production với credential/dữ liệu thử nghiệm được cô lập; kiểm thử đầy đủ phiên ứng dụng. Sau xét duyệt và phát hành, backend Production dùng credential Production và kiểm tra môi trường đã xác minh.</p>
    <Link href="/docs/sdk" className="button">SDK và ví dụ production →</Link>
  </DocsShell>;
}
