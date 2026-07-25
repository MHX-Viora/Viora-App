# Trạng thái chờ khi đăng bài viết

## Mục tiêu

Ngăn người dùng tương tác hoặc gửi lặp trong thời gian API đang tạo bài viết.

## Yêu cầu

- Hiện lớp chờ “Đang đăng bài viết” khi yêu cầu đang xử lý.
- Khóa đóng modal, nhập nội dung, chọn quyền xem, tệp đính kèm và nút đăng.
- Không thay đổi dữ liệu hay quy trình đăng bài hiện tại.
- Khi lỗi, lớp chờ biến mất và các điều khiển hoạt động lại.
- Khi thành công, modal tiếp tục đóng theo luồng hiện có.

## Tiêu chí hoàn thành

- Một lần nhấn chỉ tạo một yêu cầu đăng.
- Không thể đóng hoặc chỉnh sửa modal trong lúc đăng.
- Trạng thái chờ có nhãn hỗ trợ khả năng tiếp cận.
