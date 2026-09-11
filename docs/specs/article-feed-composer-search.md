# Spec: Thanh công cụ và tìm kiếm của tab Báo

## Objective

Tách thanh công cụ của tab Cộng đồng và tab Báo. Tab Báo hiển thị tìm kiếm, hành động tạo bài báo cho tài khoản đủ quyền và đúng hai chế độ sắp xếp `Xu hướng`/`Mới nhất`; tab Cộng đồng không còn lối tắt đăng báo.

## Tech stack and commands

- Expo 54, React Native 0.81, TypeScript.
- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npx expo lint components/feed/post-composer.tsx components/feed/feed-search-modal.tsx features/feed/feed-screen.tsx`

## Project structure and style

- `components/feed/`: thanh công cụ, tìm kiếm và thẻ kết quả.
- `features/feed/`: điều phối tab, điều hướng và callback.
- Dùng `useTheme()`, token `spacing`, `Pressable` có nhãn trợ năng; không thêm dependency.

## Testing strategy

Kiểm thử source-level bảo vệ việc phân nhánh giao diện, filter `postType`, nội dung tìm kiếm và điều hướng; chạy toàn bộ suite để kiểm tra hồi quy.

## Boundaries

- Always: giữ nguyên đăng bài cộng đồng, quyền `canCreateArticle`, CRUD bài báo, phân trang và tương tác hiện có.
- API: mở rộng `GET /api/feed` bằng `sort` tùy chọn, không đổi hành vi mặc định của client cũ.
- Never: lọc một trang kết quả ở client rồi coi là kết quả tìm kiếm đầy đủ.

## Success criteria

- Tab Cộng đồng không hiện nút đăng báo.
- Tab Báo không hiện composer bài cộng đồng; nhà báo thấy `Tạo bài báo` và mọi người thấy `Tìm bài báo, chủ đề, tác giả...`.
- Chỉ có hai chip `Xu hướng` và `Mới nhất`; mặc định là `Xu hướng`.
- `Xu hướng` tính ở server theo `(ViewCount + ShareCount * 10) / POWER(HoursSincePublished + 2, 1.3)`; `Mới nhất` theo `CreatedAt DESC`.
- Tìm kiếm tab Báo gửi đồng thời `postType=2` và sort đang chọn, tìm theo tiêu đề/tác giả và mở được bài báo.
- Phản hồi cũ không ghi đè kết quả khi đổi tab, sort hoặc từ khóa nhanh.

## Open questions

Không có. Màn tìm kiếm hiện có được dùng như trang toàn màn hình trên mobile và dialog trên desktop.
