# Spec: Bố cục và cuộn trang bài viết dài

## Objective

Trên desktop, màn tạo, chỉnh sửa và đọc bài viết dài phải có cột nội dung nhỏ, dễ đọc và căn giữa. Màn tạo/chỉnh sửa phải cuộn dọc được khi nội dung vượt chiều cao màn hình. Mobile tiếp tục dùng toàn chiều rộng khả dụng.

## Tech Stack

- Expo Router, React Native và React Native Web
- `react-native-draggable-flatlist` cho danh sách block có thể sắp xếp
- Token bố cục trong `theme/layout.ts`

## Commands

- Test lát cắt: `node --test features/article/article-editor-layout.test.mjs features/article/article-reader-layout.test.mjs`
- Type check: `npx tsc --noEmit`
- Full test: `npm test`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Project Structure

- `features/article/`: màn soạn thảo, màn đọc và kiểm thử bố cục
- `components/article/`: hiển thị từng block bài viết
- `components/layout/`: helper responsive dùng chung
- `theme/`: token kích thước giao diện

## Code Style

```tsx
const contentLayout = getResponsiveContentLayout({
  isDesktopWeb,
  maxWidth: layout.articleMaxWidth,
});
```

Ưu tiên token và helper responsive hiện có; không thêm CSS riêng cho web nếu React Native style đáp ứng được.

## Testing Strategy

- Kiểm thử nguồn xác nhận cả editor và reader dùng cùng token chiều rộng responsive.
- Kiểm thử editor xác nhận danh sách có giới hạn chiều cao, bật cuộn dọc và giữ khoảng đệm khỏi toolbar cố định.
- Chạy TypeScript, toàn bộ test, lint và Expo web export.

## Boundaries

- Always: giữ nguyên luồng tạo/cập nhật bài, preview, kéo thả block và mobile full-width.
- Ask first: đổi API bài viết, thêm dependency hoặc thay đổi mô hình dữ liệu.
- Never: sửa PostCard, Reels hoặc backend trong thay đổi này.

## Success Criteria

- Desktop editor và reader dùng cột nội dung tối đa `760px`, căn giữa.
- Media trong bài tối đa `720px`, không vượt cột bài viết.
- Cùng một editor hỗ trợ cuộn dọc cho cả chế độ tạo và chỉnh sửa; wrapper của `DraggableFlatList` phải nhận chiều cao flex hữu hạn.
- Toolbar dưới không che block cuối; mobile vẫn rộng `100%`.

## Open Questions

Không có. Giả định “nhỏ lại chút” tương ứng với cột đọc phổ biến `760px` trên desktop.
