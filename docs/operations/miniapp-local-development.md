# Nội bộ ANKT: kiểm thử Mini App khi phát triển nền tảng

Tài liệu cho kỹ sư ANKT đang hoàn thiện Host/Portal/Backend. **Không dùng làm quick
start cho developer đối tác.** Hướng dẫn chuẩn ở
[tích hợp production](../miniapp-sdk-integration.vi.md) và Portal production
`https://mxh.ankt.vn/developers`.

## Khi nào mới cần cấu hình này?

Chỉ khi người phát triển ANKT tự chạy Portal/Host, ví dụ `http://localhost:8081`.
Developer đối tác bình thường tải SDK đã phát hành, giữ Host
`https://mxh.ankt.vn` và triển khai website HTTPS của mình.

## Cấu hình thử nghiệm tạm thời

- Dùng SDK 0.4.0 và Mini App HTTPS trên domain đã xác minh. API ANKT vẫn là HTTPS.
- Trong bản frontend thử nghiệm của Mini App, đặt `hostOrigin` bằng exact origin
  của Portal nội bộ. Ví dụ `http://localhost:8081`, không chứa path/dấu `/` cuối.
- Chỉ các Host loopback chính xác localhost, 127.0.0.1 hoặc [::1] được phép HTTP,
  chỉ cho phiên Sandbox. Không suy ra trust từ query string, referrer hoặc message.
- Cấu hình CSP thử nghiệm cho phép exact origin đó. Không nới CSP/origin Production.
- Backend đối tác nhận đúng Origin website thực; Host origin và Website origin là
  hai giá trị khác nhau. Credential server/environment vẫn cần khớp grant Sandbox.
- Không đổi MiniAppAuth__AllowedHostOrigin trên ANKT backend từ production HTTPS
  sang HTTP chỉ để kiểm thử Portal local. Giữ những policy hiện có.

```javascript
// CHỈ bản thử nghiệm do kỹ sư nền tảng kiểm soát.
const ANKT = window.ANKTMiniApp.create({
  clientId: 'YOUR_REGISTERED_APP_ID',
  hostOrigin: 'http://localhost:8081',
  apiOrigin: 'https://api.mxh.ankt.vn',
});
```

Mã sao chép ở tab Tích hợp luôn dùng production, kể cả khi xem tab từ Portal local.
Kỹ sư chủ động thay Host trong bản thử nghiệm của mình; đây không phải cấu hình
phải hướng dẫn developer sao chép.

Với Expo, giá trị EXPO_PUBLIC_* được nhúng khi export. `.env.example` chỉ là mẫu;
biến shell có thể ưu tiên hơn `.env`. Đổi env trên VPS rồi restart Nginx không thay
bundle. Đối chiếu Host trong bundle và thư mục Nginx phục vụ; nếu cần dùng
`npx expo export --platform web --clear`. Không đưa Client Secret vào EXPO_PUBLIC.

## Kiểm tra và kết thúc thử nghiệm

1. Kiểm tra Bridge/profile, code, partner exchange và session/router riêng, không
   chỉ Connected. Endpoint backend ví dụ /api/auth/ankt/exchange thuộc đối tác.
2. Tách credential/dữ liệu/phiên Sandbox; không chấp nhận Sandbox trên backend Production.
3. Kiểm tra account replacement, refresh, expiry/revocation và retry có giới hạn.
4. Khi quay lại bản production, build lại với Host https://mxh.ankt.vn và gỡ quyền
   nhúng loopback. Không sửa default SDK thành Host local.

Build SDK nội bộ: `npm --prefix packages/miniapp-sdk run build`; kiểm thử bằng
`npm --prefix packages/miniapp-sdk test`. Artifact có phiên bản là bất biến.
Không dùng nội dung file .env hoặc credential thật làm dữ liệu ví dụ/tài liệu.
