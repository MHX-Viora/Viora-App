# Spec: Tiện ích và panel cài đặt trò chuyện

## Objective

- Giữ nguyên sáu chức năng chat hiện có nhưng trình bày thành lưới icon tròn nhiều màu.
- Khi mở một phòng chat trên desktop rộng, luôn hiển thị cài đặt trò chuyện ở cột phải.
- Mobile và desktop hẹp giữ luồng điều hướng hiện tại.

## Commands

- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Project Structure

- `features/chat/chat-screen.tsx`: composer và hành động tiện ích.
- `features/chat/responsive-chat-screen.tsx`: bố cục list, phòng chat và cài đặt.
- `features/chat/responsive-chat-layout.ts`: quyết định chế độ responsive thuần.
- `features/chat/*.test.mjs`: kiểm thử hồi quy.

## Code Style

- Dùng token màu và spacing hiện có.
- Dùng `Pressable` với nhãn accessibility.
- Không thay đổi handler, API hoặc quyền thiết bị hiện có.

## Testing Strategy

- Kiểm thử layout thuần cho desktop rộng, desktop hẹp và mobile.
- Kiểm tra nguồn để bảo đảm sáu handler cũ vẫn được nối vào menu mới.
- Chạy toàn bộ test, TypeScript, lint và web export.

## Boundaries

- Always: giữ nguyên nghiệp vụ gửi file/media/ghi âm/vị trí/sticker.
- Ask first: thêm chức năng mới như bình chọn hoặc tách riêng bộ chọn video.
- Never: thay đổi API chat, quyền truy cập hoặc dữ liệu tin nhắn.

## Success Criteria

- Menu tiện ích là lưới icon tròn nhiều màu, nhãn nằm dưới icon.
- Desktop rộng mở phòng chat thành ba cột: danh sách, phòng chat, cài đặt.
- Mobile và desktop hẹp hoạt động như trước.
