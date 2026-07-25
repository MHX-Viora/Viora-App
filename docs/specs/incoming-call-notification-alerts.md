# Âm thanh và rung cho thông báo cuộc gọi

## Mục tiêu

Thông báo cuộc gọi đến phải phát âm thanh và rung mà không làm các thông báo khác trở nên quá ồn.

## Phạm vi

- Android dùng channel riêng `incoming-calls`, mức ưu tiên tối đa.
- Channel bật âm thanh mặc định, đèn và mẫu rung.
- Thông báo cuộc gọi dùng category riêng, giữ trên màn hình và có hai hành động
  `Từ chối` / `Trả lời`.
- `Từ chối` gọi API từ chối cuộc gọi; `Trả lời` mở đúng luồng nhận cuộc gọi hiện có.
- Mẫu rung được đặt trên cả channel và nội dung thông báo để vẫn rung khi âm thanh
  không phát được.
- Cuộc gọi data-only ở foreground/background được hiển thị bằng channel này.
- iOS dùng âm thanh mặc định; rung tuân theo cài đặt thông báo của hệ thống.
- Không thay đổi logic kết nối cuộc gọi hiện có.

## Kiểm tra

- TypeScript và lint thành công.
- Android resources build thành công.
- Thông báo thường vẫn dùng channel `default`.
