# Làm mới giao diện xác thực và khởi động

## Mục tiêu

Đồng bộ trang đăng nhập, đăng ký và trạng thái chờ mở ứng dụng với ngôn ngữ giao diện tối, kính trong, cyan–tím đang dùng trong khu vực cộng đồng.

## Phạm vi

- Giữ nguyên trường nhập, nút, kiểm tra dữ liệu và luồng điều hướng hiện tại.
- Dùng chung nền trang trí và nhận diện Viora cho đăng nhập/đăng ký.
- Hiện màn hình chờ đến khi kiểm tra phiên đăng nhập ban đầu hoàn tất.
- Không thêm thư viện, API hoặc độ trễ giả.

## Kiểm tra

- Nội dung đọc rõ trên nền tối và điều khiển vẫn có nhãn hỗ trợ tiếp cận.
- Không lóe màn hình sai trước khi chuyển đến trang phù hợp với phiên đăng nhập.
- Lint và TypeScript không có lỗi.
