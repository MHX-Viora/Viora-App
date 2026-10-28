# ANKT — Expo / React Native

## Developer tích hợp Mini App

Hướng dẫn chuẩn dùng ANKT production tại https://mxh.ankt.vn/developers. Đối tác
đăng ký website HTTPS, tải SDK đã phát hành, cấu hình backend và kiểm thử trên Portal;
không cần clone repository, build SDK hoặc tự chạy ANKT.

- [Hướng dẫn production tiếng Việt](docs/miniapp-sdk-integration.vi.md)
- [SDK 0.4.1 và hợp đồng đăng nhập backend](packages/miniapp-sdk/README.md)
- Tài liệu công khai: https://mxh.ankt.vn/developers/docs

## Kỹ sư phát triển ANKT

Developer Portal là tính năng trong cùng frontend Expo, phục vụ dưới /developers.
Lệnh npm run web và địa chỉ loopback chỉ là quy trình kỹ sư nền tảng kiểm thử,
không phải yêu cầu setup cho developer đối tác. Xem
[hướng dẫn nội bộ](docs/operations/miniapp-local-development.md).

Tài liệu dùng nguồn features/developer/docs/content và reference. Chạy
npm run docs:check, npm run test:docs và npm run docs:build để kiểm tra/xuất artifact.
SDK được build/kiểm thử từ packages/miniapp-sdk; không sửa bytes đã phát hành cùng version.
Production BFF dùng cấu hình server riêng theo .env.example; không đưa secret vào EXPO_PUBLIC.
Các handoff lịch sử mô tả từng giai đoạn, không thay thế hướng dẫn production hiện hành.

Ứng dụng mạng xã hội mobile xây dựng bằng Expo Router và React Native.

## Chạy dự án

```bash
npm install
npm run start
```

`app/` chỉ chứa route. UI tái sử dụng nằm trong `components/`; screen, dữ liệu và type được nhóm theo tính năng trong `features/`.
