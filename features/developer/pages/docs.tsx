import Link from "../navigation.web";
import { DocsShell } from "../components/docs-shell";
import { pageMetadata } from "../lib/site";

export const metadata = pageMetadata("Tài liệu nền tảng", "/docs", "Tổng quan kiến trúc ANKT Developer Platform và phạm vi tính năng trong từng giai đoạn.");
export default function Docs() {
  return <DocsShell title="Tài liệu nền tảng" description="Hiểu hệ sinh thái, nắm rõ phạm vi hiện tại và chuẩn bị cho hành trình phát triển Mini App.">
    <h2>ANKT Developer Platform là gì?</h2><p>Đây là cổng thông tin dành cho đối tác và nhà phát triển muốn mang dịch vụ của mình vào hệ sinh thái ANKT thông qua Mini App.</p>
    <div className="notice"><strong>Giai đoạn 2 · Tài khoản Developer</strong><p>Hiện có đăng ký, xác minh email, đăng nhập, khôi phục mật khẩu và quản lý hồ sơ/phiên. SDK, SSO ANKT, tạo ứng dụng và API nghiệp vụ chưa được phát hành.</p></div>
    <h2>Kiến trúc chung</h2><p>Developer Portal có giao diện và quy trình build riêng, được phục vụ tại <code>/developers</code> trên domain ANKT. Portal sử dụng backend và database ANKT hiện có, với dữ liệu tài khoản Developer độc lập với tài khoản mạng xã hội.</p><p>Session Developer được quản lý bằng cookie bảo mật và có thể thu hồi từ Cài đặt. Endpoint health chỉ kiểm tra trạng thái dịch vụ, không truy cập dữ liệu người dùng.</p>
    <h2 id="roadmap">Lộ trình tính năng</h2><div className="table-wrap"><table><thead><tr><th scope="col">Khả năng</th><th scope="col">Trạng thái</th></tr></thead><tbody>
      {[ ["Trang hướng dẫn và tài liệu", "Hiện có"], ["Kiểm tra kết nối API", "Hiện có khi backend được cấu hình"], ["Tài khoản Developer & bảo mật", "Hiện có"], ["Developer Organizations", "Dự kiến"], ["Tạo ứng dụng & Credentials", "Dự kiến"], ["Xác minh tên miền", "Dự kiến"], ["SSO ANKT", "Chờ OAuth/OIDC Provider"], ["Sandbox", "Dự kiến"], ["Kiểm duyệt & phát hành", "Dự kiến"] ].map(([feature,status]) => <tr key={feature}><td>{feature}</td><td>{status}</td></tr>)}
    </tbody></table></div>
    <h2>Nguyên tắc tích hợp</h2><ul><li>Chỉ yêu cầu quyền cần thiết cho chức năng của ứng dụng.</li><li>Không đưa khóa bí mật vào frontend hoặc mã nguồn công khai.</li><li>Chuẩn bị chính sách quyền riêng tư và cách xử lý dữ liệu người dùng.</li><li>Chờ đặc tả API và cơ chế đăng nhập chính thức trước khi tích hợp nghiệp vụ.</li></ul>
    <Link href="/docs/getting-started" className="button">Đọc hướng dẫn bắt đầu →</Link>
  </DocsShell>;
}
