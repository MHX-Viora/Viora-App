import { DocsShell } from "../components/docs-shell";
import { HealthStatus } from "../components/health-status";
import { pageMetadata } from "../lib/site";

export const metadata = pageMetadata("Hướng dẫn bắt đầu", "/docs/getting-started", "Các bước chuẩn bị ứng dụng, bảo mật và kiểm tra kết nối với nền tảng ANKT.");
export default function GettingStarted() {
  return <DocsShell title="Bắt đầu cùng ANKT" description="Những việc bạn có thể chuẩn bị hôm nay, trước khi quy trình tích hợp Mini App được mở.">
    <h2>1. Xác định trải nghiệm</h2><p>Mô tả dịch vụ, đối tượng người dùng và thao tác chính. Ưu tiên một hành trình ngắn, rõ ràng và hữu ích trên thiết bị di động.</p>
    <h2>2. Tạo tài khoản và chuẩn bị ứng dụng</h2><p>Đăng ký tài khoản Developer tại mục Đăng ký, xác minh email rồi đăng nhập để quản lý hồ sơ và bảo mật.</p><ul><li>Tên, mô tả và biểu tượng ứng dụng.</li><li>Thông tin đối tác, người phụ trách và kênh hỗ trợ.</li><li>Tên miền HTTPS do bạn quản lý.</li><li>Chính sách quyền riêng tư, điều khoản dịch vụ và quy trình hỗ trợ.</li></ul><p>Đây là danh sách chuẩn bị định hướng. Chưa có biểu mẫu hoặc API tạo ứng dụng trong giai đoạn này.</p>
    <h2>3. Lên kế hoạch bảo mật</h2><p>Xác định dữ liệu thực sự cần dùng, thời gian lưu trữ và quyền truy cập. Không thu thập mật khẩu ANKT qua ứng dụng của bạn. Cơ chế SSO và cấp quyền sẽ được công bố trong đặc tả sau.</p>
    <h2>4. Kiểm tra nền tảng</h2><p>API công khai <code>GET /api/developer/health</code> trả về trạng thái dịch vụ. Kiểm tra này không tạo tài khoản, xác thực người dùng hoặc cấp quyền tích hợp.</p><HealthStatus />
    <h2>5. Theo dõi lộ trình</h2><div className="notice"><strong>Các bước tiếp theo chưa mở</strong><p>Tạo ứng dụng → Cấu hình → Đăng nhập ANKT → Sandbox → Gửi duyệt → Phát hành. Hướng dẫn chi tiết sẽ được cập nhật khi từng tính năng sẵn sàng.</p></div>
  </DocsShell>;
}
