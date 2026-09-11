# Plan: Thanh công cụ và tìm kiếm của tab Báo

1. Bổ sung test mô tả header bài báo, hai sort mode, API contract và công thức xu hướng.
2. Mở rộng `GET /api/feed` bằng enum sort tùy chọn; sắp xếp ở database trước `Skip/Take`.
3. Phân nhánh `PostComposer`: Cộng đồng giữ đăng bài thường; Báo có tìm kiếm, tạo báo theo quyền và hai chip sort.
4. Truyền sort qua danh sách và tìm kiếm; chặn race condition bằng request id.
5. Chạy test lát cắt, type-check, lint, backend build/test và toàn bộ frontend suite.

Rủi ro chính: kết quả cũ ghi đè sau khi đổi sort và thứ tự khác nhau giữa các trang; giảm thiểu bằng request id ở client và sort server-side ổn định trước phân trang.
