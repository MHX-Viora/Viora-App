# Lỗi thao tác hồ sơ và thông báo kết bạn

## FE
- Nhắn tin, theo dõi/bỏ theo dõi, gửi/hủy lời mời: lỗi hiện qua AppToastHost trên web và native.
- Gửi lời mời luôn có phản hồi thành công, kể cả API không có message.
- Hủy lời mời/kết bạn dùng friendshipId khi API trả về; fallback userId tương thích BE cũ.
- Web hiển thị banner realtime cho FriendRequest=1, FriendAccepted=2, Follow=3; loại thông báo đã đọc và trùng trong 10 giây.
- Không gửi trùng banner tin nhắn; luồng thông báo chat hiện có vẫn xử lý Message=9.

## BE liên quan
- SocialRepository phát thông báo bằng NotificationService sau khi transaction commit và dispose; không phát khi rollback.
- Lỗi dispatch không làm API trả thất bại sau khi quan hệ đã lưu; thông báo vẫn có trong danh sách để tải lại.
- Hồ sơ trả thêm friendshipId; API tạo chat cho phép bạn bè Accepted dù người nhận tắt nhắn tin từ người lạ.
- CORS Web cho phép exact origin https://mxh.ankt.vn; vẫn yêu cầu configured origins trong Production và không dùng wildcard.

## Xác minh
- 29 kiểm thử FE (7 mới về hồ sơ/banner, 22 ví/tiền).
- TypeScript và lint.
- Chrome: màn hình hồ sơ thật + API giả, AppToastHost thật; tạo chat mở route đúng, bỏ theo dõi/gửi/hủy lời mời cập nhật và báo thành công; lỗi mạng hiện; banner lời mời nhận được hiện. Không có console error sau khi chuẩn hóa asset trong fixture Vite; có cảnh báo RN Web shadow/native animation vốn có.
- Fixture trình duyệt đã gỡ. Không thao tác quan hệ trên DB production.
- BE: 54 kiểm thử đạt, 1 PostgreSQL test bỏ qua khi chưa cấu hình DB kiểm thử.

## Production
- OPTIONS đến api.tvphapluat.com.vn từ https://mxh.ankt.vn đang trả 204 thiếu Access-Control-Allow-Origin (đã kiểm tra DELETE friends và POST friends/follow).
- Cần triển khai BE/FE. Nếu vẫn thiếu header, kiểm tra reverse proxy có tự trả OPTIONS hoặc bỏ header CORS; xem handoff profile-social-actions trong repo BE.
