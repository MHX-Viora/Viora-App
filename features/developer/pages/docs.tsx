import Link from '../navigation.web';
import { DocsShell } from '../components/docs-shell';
import { pageMetadata } from '../lib/site';
export const metadata = pageMetadata('Tài liệu Mini App', '/docs', 'Hướng dẫn tích hợp Mini App trên ANKT production.');
export default function Docs() {
  return <DocsShell title="Tài liệu Mini App ANKT" description="Đăng ký website HTTPS, tích hợp SDK và xác thực backend ứng dụng.">
    <h2>Nền tảng production</h2><p>Developer Portal và Host chạy tại https://mxh.ankt.vn. Website/backend Mini App do bạn triển khai trên domain đã đăng ký và xác minh. Không yêu cầu developer tự chạy ANKT.</p>
    <h2>Hai bước xác thực</h2><p>SDK 0.4.1 xác thực Bridge và cấp code qua auth.getLoginCode. Backend của bạn đổi code với ANKT bằng credential server, liên kết tài khoản và cấp phiên riêng; frontend phải áp dụng phiên vào auth store/router.</p>
    <h2>Quy trình</h2><p>Tạo Mini App → Xác minh domain → Tải SDK → Cấu hình backend → Sandbox trên Portal → Xét duyệt → Phát hành. Credential backend được đăng ký qua đơn vị vận hành ANKT, không đặt trong frontend.</p>
    <Link href="/docs/getting-started" className="button">Đọc hướng dẫn bắt đầu →</Link>
  </DocsShell>;
}
