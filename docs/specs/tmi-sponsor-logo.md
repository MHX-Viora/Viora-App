# Spec: Logo bảo trợ TMI

## Objective

Mọi vị trí hiển thị dòng “Phát triển và bảo trợ bởi TMI” phải có logo CNS do người dùng cung cấp nằm ngay phía trên, căn giữa và không làm thay đổi chức năng màn hình.

## Tech Stack

- React Native / React Native Web
- `expo-image` cho ảnh tĩnh

## Commands

- Test mục tiêu: `node components/common/tmi-sponsor.test.mjs`
- Type check: `npx tsc --noEmit`
- Full test: `npm test`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Project Structure

- `assets/images/`: logo nguồn được sao chép vào dự án
- `components/common/`: component bảo trợ dùng chung và test
- `features/auth/`, `components/profile/`: các nơi sử dụng

## Code Style

```tsx
<TmiSponsor />
```

Không lặp lại đường dẫn ảnh, kích thước hay dòng chữ ở từng màn.

## Testing Strategy

- Test xác nhận asset tồn tại và component chứa logo cùng dòng bảo trợ.
- Test xác nhận hai vị trí hiện tại dùng component chung và không còn tự render dòng chữ.
- Chạy TypeScript, toàn bộ test, lint và web export.

## Boundaries

- Always: giữ logo trên chữ, căn giữa, hỗ trợ accessibility.
- Ask first: thay nội dung dòng bảo trợ hoặc xử lý lại ảnh nguồn.
- Never: chỉnh sửa nội dung ảnh người dùng cung cấp hay thay đổi hành vi đăng nhập/cài đặt.

## Success Criteria

- Cả màn đăng nhập và bảng cài đặt hiển thị logo phía trên dòng bảo trợ.
- Logo dùng asset nội bộ và co theo `contain`.
- Chỉ component chung chứa dòng chữ chính xác.

## Open Questions

Không có. Logo hiển thị gọn ở chiều rộng 64px để phù hợp cả panel desktop và mobile.
