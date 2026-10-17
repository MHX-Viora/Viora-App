# Viora

## ANKT Developer

Developer là một tính năng trong FE này, dùng chung Expo, React, dependencies và bản build. Chạy `npm run web`, rồi mở `http://localhost:8081/developers`; các trang đăng nhập, tài liệu và Console nằm ngay dưới đường dẫn này. Không có project con, iframe hoặc server Next.js.

- Routes: `app/developers/`; giao diện web và CSS được giới hạn phạm vi: `features/developer/`.
- Tài khoản Developer vẫn độc lập với tài khoản mạng xã hội ANKT. API phía server giữ cookie HttpOnly và không chuyển tiếp thông tin đăng nhập ANKT.
- Metro chạy API này cùng cổng khi phát triển; Vercel triển khai `api/developer.js` cùng FE bằng các rewrite trong `vercel.json`.
- Cấu hình server ở `.env.example`; không đưa `ANKT_BFF_SHARED_SECRET` vào biến `EXPO_PUBLIC_`. Production cần `DEVELOPER_SITE_ORIGIN`, `ANKT_API_BASE_URL` và khóa ký khớp BE.
- Kiểm tra: `npm run test:developer`, `npx tsc --noEmit`, `npm run build:web`.

Hướng dẫn cấu hình, kiểm thử và giới hạn: [Developer tích hợp](docs/handoffs/developer-integrated-fe.md).

Ứng dụng mạng xã hội mobile xây dựng bằng Expo Router và React Native.

## Chạy dự án

```bash
npm install
npm run start
```

`app/` chỉ chứa route. UI tái sử dụng nằm trong `components/`; screen, dữ liệu và type được nhóm theo tính năng trong `features/`.
