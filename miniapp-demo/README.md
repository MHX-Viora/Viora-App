# Demo SDK 0.4.1 — đọc hồ sơ qua Bridge

Demo này xác nhận kết nối SDK, môi trường, hồ sơ và phiên Bridge. **Không triển khai
backend ứng dụng và không tạo phiên đăng nhập đối tác.** Connected chỉ chứng minh
Bridge/profile, không phải hoàn tất tích hợp nghiệp vụ.

Developer tải SDK từ Portal production https://mxh.ankt.vn/developers, tự host file
cùng website HTTPS đã đăng ký/xác minh và mở website từ Host/Sandbox của Portal.
Demo mặc định dùng Host production https://mxh.ankt.vn; không yêu cầu ANKT local.
Nhập Client ID thật của ứng dụng đã đăng ký cho chính website đang chạy demo.

Để đăng nhập ứng dụng của bạn, triển khai luồng auth.getLoginCode → backend đối tác
→ /api/miniapp/auth/partner/exchange → phiên riêng → auth store/router. Hướng dẫn:
[tích hợp production](../docs/miniapp-sdk-integration.vi.md) và
[SDK reference](https://mxh.ankt.vn/developers/docs/sdk).

Script serve.mjs chỉ dành cho kỹ sư kiểm tra asset/lỗi Host độc lập; chạy demo bằng
server local không phải quy trình tích hợp production và không giả lập đăng nhập.
