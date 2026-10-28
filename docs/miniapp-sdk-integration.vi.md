# Tích hợp Mini App với ANKT production

Hướng dẫn dành cho developer đưa website đang hoạt động vào ANKT. Bạn quản lý
website/backend của mình; không cần source code, workspace hoặc server ANKT riêng.

## 1. Các dịch vụ và địa chỉ

| Thành phần | Cấu hình |
| --- | --- |
| Developer Portal | `https://mxh.ankt.vn/developers` |
| Host ANKT production | `https://mxh.ankt.vn` |
| API ANKT mà SDK hiện dùng | `https://api.mxh.ankt.vn` |
| Website Mini App | Domain HTTPS thật bạn đăng ký trong Portal |
| Backend Mini App | Backend của bạn; không phải API ANKT |

Địa chỉ API trên là dịch vụ đang triển khai mà SDK mặc định sử dụng. Developer
không cần chạy backend ANKT. Website origin gồm scheme, hostname và port, không
chứa path hoặc dấu `/` cuối. Backend của bạn phải chấp nhận chính xác website origin.

Sandbox là chế độ kiểm thử trên Portal production, không yêu cầu tạo domain có tên
`sandbox`. Có thể triển khai dịch vụ thử nghiệm riêng khi cần cô lập dữ liệu; đó là
lựa chọn vận hành, không phải domain mặc định của mọi developer.

## 2. Đăng ký ứng dụng và xác minh domain

1. Đăng ký tài khoản Developer, xác minh email, đăng nhập Portal production.
2. Tạo Mini App; lưu tên, logo, danh mục, mô tả, email hỗ trợ, Website URL HTTPS,
   Privacy Policy và Terms of Service. App ID được cấp là Client ID công khai.
3. Trong Cấu hình tích hợp, tải file xác minh và đặt đúng tên/nội dung tại URL
   được cấp. Kiểm tra HTTPS trả đúng text trực tiếp, không redirect, đăng nhập hoặc
   `index.html` do cấu hình SPA fallback.
4. Nhấn Xác minh. Domain/Website URL cần khớp cả lúc chạy Sandbox và lúc phát hành.
5. Đăng ký credential backend với ANKT cho App ID và môi trường tương ứng. Credential
   do đơn vị vận hành ANKT cấu hình. Chủ app chọn môi trường rồi Hiện/Sao chép cạnh
   App ID trong Tích hợp Auth Bridge khi secret đã được cấu hình; Portal không tự sinh secret.

Client ID có thể xuất hiện trong frontend. Client Secret chỉ được lưu trong backend
hoặc secret manager. Secret Sandbox/Production khác nhau; không dùng secret Sandbox
để đăng nhập người dùng thật. Không đặt secret trong biến `EXPO_PUBLIC_*`.

## 2.1. Setup env frontend đối tác

Với Expo/React Native Web, đặt trong `.env` ở thư mục gốc frontend hoặc env của job
build. Thay domain API ví dụ bằng backend thật của bạn, giữ các biến nghiệp vụ hiện có:

```dotenv
EXPO_PUBLIC_API_URL=https://api.miniapp.example.com
EXPO_PUBLIC_ANKT_CLIENT_ID=YOUR_REGISTERED_APP_ID
EXPO_PUBLIC_ANKT_API_ORIGIN=https://api.mxh.ankt.vn
EXPO_PUBLIC_ANKT_HOST_ORIGIN=https://mxh.ankt.vn
```

SDK không tự đọc `.env`. Code frontend phải truyền các giá trị vào SDK và dùng đúng
API đối tác khi gửi code:

```javascript
const ANKT = window.ANKTMiniApp.create({
  clientId: process.env.EXPO_PUBLIC_ANKT_CLIENT_ID,
  hostOrigin: process.env.EXPO_PUBLIC_ANKT_HOST_ORIGIN,
  apiOrigin: process.env.EXPO_PUBLIC_ANKT_API_ORIGIN,
});
const partnerApi = process.env.EXPO_PUBLIC_API_URL;
// Trong hàm start(), gửi code tới partnerApi + '/api/auth/ankt/exchange'.
```

Đây là cú pháp Expo; HTML tĩnh dùng cấu hình trực tiếp trong ví dụ phần 3, Vite dùng
`VITE_*` và `import.meta.env`. Browser không tự có `process.env`. Không đặt Client
Secret trong bất kỳ biến frontend/public nào.

## 2.2. Setup env backend đối tác

Đặt tại backend service hoặc secret manager, không trong static frontend/Nginx.
Adapter backend cần đọc các biến này; tên sau là mẫu cấu hình độc lập framework:

```dotenv
ANKT_API_ORIGIN=https://api.mxh.ankt.vn
ANKT_MINI_APP_CLIENT_ID=YOUR_REGISTERED_APP_ID
ANKT_MINI_APP_CLIENT_SECRET=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
ANKT_MINI_APP_ENVIRONMENT=Production
MINI_APP_ORIGIN=https://miniapp.example.com
```

Nếu backend .NET của bạn dùng adapter bind section `AnktMiniApp`, dùng bộ tương ứng:

```dotenv
AnktMiniApp__Enabled=true
AnktMiniApp__ClientId=YOUR_REGISTERED_APP_ID
AnktMiniApp__ClientSecret=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
AnktMiniApp__ApiOrigin=https://api.mxh.ankt.vn
AnktMiniApp__HostOrigin=https://mxh.ankt.vn
AnktMiniApp__MiniAppOrigin=https://miniapp.example.com
AnktMiniApp__Environment=Production
```

`MiniAppOrigin`/`MINI_APP_ORIGIN` phải là origin website thật đã đăng ký, khác Host
ANKT. CORS/CSRF phải chấp nhận chính xác website này nếu API ở domain khác. Giữ
database, JWT/session signing key và env nghiệp vụ của backend bạn; không dùng khóa
ký ANKT. Placeholder secret phải được thay bằng credential Production đã đăng ký
với ANKT, không tự đặt một giá trị chỉ ở phía đối tác. Chủ app có thể lấy giá trị
đã được cấp tại Tích hợp Auth Bridge → Client Secret → chọn môi trường → Hiện/Sao chép.

Sandbox trên Portal vẫn dùng Host/API ANKT production. Riêng backend thử nghiệm dùng
credential Sandbox, expected environment `Sandbox` và dữ liệu/phiên được cô lập.
Không thêm biến frontend chọn môi trường để thay thế xác minh của Host.

Sau khi đổi env: restart/redeploy backend; build và deploy lại toàn bộ frontend.
File `.env.example` chỉ là mẫu, shell/CI có thể ưu tiên hơn `.env`. Xem hướng dẫn
đầy đủ [setup env đối tác](https://mxh.ankt.vn/developers/docs/environment-setup).

## 3. Tải SDK và tích hợp frontend

Trong tab **Tích hợp Auth Bridge**, tải SDK JavaScript **0.4.1**, lưu thành
`ankt-miniapp.js` cùng website. SDK dùng chung cho Web iframe, Android WebView và
iOS WKWebView. Không cần cài npm hoặc build SDK từ mã nguồn ANKT.

Artifact: `/sdk/ankt-miniapp.v0.4.1.min.js`. Manifest `/sdk/manifest.json` chứa
version, tên file, kích thước và SHA-256. Khi nâng cấp, thay file và tham số version
trong URL script để tránh dùng lại SDK đã cache.

```html
<script src="./ankt-miniapp.js?v=0.4.1"></script>
<script>
const ANKT = window.ANKTMiniApp.create({
  clientId: 'YOUR_REGISTERED_APP_ID',
  hostOrigin: 'https://mxh.ankt.vn',
  apiOrigin: 'https://api.mxh.ankt.vn',
});

async function start() {
  await ANKT.init();
  const {code} = await ANKT.auth.getLoginCode();
  const response = await fetch('/api/auth/ankt/exchange', {
    method: 'POST', credentials: 'same-origin', redirect: 'error',
    cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code}),
  });
  if (!response.ok) throw new Error('PARTNER_LOGIN_FAILED');
  const session = await response.json();
  document.dispatchEvent(new CustomEvent('ankt:partner-login', {detail: session}));
}
start().catch(error => document.dispatchEvent(new CustomEvent('ankt:login-error', {
  detail: {code: error.code || 'PARTNER_LOGIN_FAILED'},
})));
window.addEventListener('pagehide', () => ANKT.dispose());
</script>
```

**Bạn phải triển khai `/api/auth/ankt/exchange` ở backend của mình.** Đây là tên route
ví dụ, không phải endpoint được ANKT tự thêm vào website. Nếu API ở domain/route
khác, sửa URL fetch và cấu hình exact-origin CORS/CSRF phù hợp.

**Bạn phải xử lý `ankt:partner-login` trong ứng dụng.** Nhận payload theo hợp đồng
backend của bạn vào auth/session store như lần đăng nhập thông thường, rồi thực hiện
onboarding/chọn vai trò nếu cần và mở màn hình chính. Sự kiện do ví dụ frontend phát
ra, không phải SDK tự cập nhật router hoặc đăng nhập UI. Chỉ sao chép đoạn mã mà không
nối vào auth store sẽ chưa hoàn tất đăng nhập ứng dụng.

Khi có `ankt:login-error`, hiển thị lỗi và nút Thử lại. Không hiện hồ sơ/token/code
chẩn đoán thường trực sau đăng nhập. Website mở độc lập có thể giữ đăng nhập riêng;
SDK không có Host sẽ trả `HOST_UNAVAILABLE` nếu được gọi.

## 4. Phân biệt Bridge với đăng nhập backend

| Bước | Ai thực hiện | Kết quả |
| --- | --- | --- |
| `init()` | SDK ↔ Host ↔ ANKT API | Bridge và token Mini App đã xác minh |
| `getUserInfo()` | SDK ↔ ANKT API | Hồ sơ ANKT, không phải phiên backend của bạn |
| `getLoginCode()` | SDK ↔ ANKT API | Code mới, dùng một lần, hạn 60 giây |
| Backend exchange | Backend bạn ↔ ANKT API | Danh tính và grant đã xác minh |
| Tạo/nhận phiên ứng dụng | Backend và frontend của bạn | Đăng nhập nghiệp vụ hoàn tất |

Mã PKCE của Bridge và code từ `getLoginCode()` là hai loại khác nhau. Không tự gọi
endpoint cấp launch hoặc đổi mã PKCE để thay cho API partner.

## 5. Backend đổi mã và liên kết tài khoản

Nhận JSON `{code}` ở route đăng nhập của bạn, kiểm tra Origin/CSRF, kích thước request
và rate limit. Chỉ backend gọi trực tiếp endpoint ANKT sau:

```http
POST /api/miniapp/auth/partner/exchange HTTP/1.1
Host: api.mxh.ankt.vn
Authorization: Basic BASE64_OF_CLIENT_ID_AND_SERVER_SECRET
Content-Type: application/json

{"code":"ONE_USE_CODE_FROM_SDK"}
```

Không có `Origin` header trong request server-to-server này. Không chuyển tiếp
Authorization, Origin hoặc cookie của browser; không đưa code/secret vào URL/log.
API partner từ chối request browser bằng `SERVER_ONLY`.

Phản hồi thành công có cấu trúc sau (giá trị chỉ minh họa):

```json
{
  "user": {"id": "ankt-user-id", "displayName": "Người dùng ANKT", "gender": "Male"},
  "miniAppId": "YOUR_REGISTERED_APP_ID",
  "environment": "Production",
  "sessionId": "11111111-1111-4111-8111-111111111111",
  "expiresAt": "2026-10-27T12:15:00Z"
}
```

`avatarUrl`/`coverUrl` có thể vắng khi không có ảnh. Backend kiểm tra:

- `miniAppId` khớp Client ID, `environment` khớp môi trường backend và `expiresAt`
  còn hiệu lực; Production phải yêu cầu chính xác `Production`.
- Liên kết bằng `(miniAppId, environment, user.id)` có unique constraint. Dùng
  transaction/upsert để xử lý đăng nhập đồng thời. Không tự gộp tài khoản theo tên/email.
- Tìm/tạo tài khoản hoặc yêu cầu hoàn thiện nghiệp vụ theo quy tắc của ứng dụng.
- Cấp token/session riêng với hạn không vượt grant ANKT, lưu metadata định danh/grant
  phía server. Trả response đăng nhập theo hợp đồng ứng dụng cho frontend.

ANKT không tự tạo tài khoản trong database đối tác, không cấp quyền Admin/vai trò
nghiệp vụ và không thay thế các bước onboarding của ứng dụng.

## 6. Kiểm tra grant, hết hạn và mở lại

Trước khi dùng phiên cho API được bảo vệ hoặc khôi phục phiên, backend gọi:

```http
POST /api/miniapp/auth/partner/session HTTP/1.1
Host: api.mxh.ankt.vn
Authorization: Basic BASE64_OF_CLIENT_ID_AND_SERVER_SECRET
Content-Type: application/json

{"sessionId":"PREVIOUSLY_VERIFIED_GRANT_UUID"}
```

Phản hồi cùng schema với exchange. So sánh app, môi trường, user, grant và hạn với
phiên đã lưu. Grant hết hạn/thu hồi hoặc credential không hợp lệ phải từ chối truy cập.

Token profile có hạn 5 phút. Grant đối tác không vượt phiên Bridge cha, tối đa 15 phút;
gia hạn profile token không tự kéo dài phiên ứng dụng. Khi mở lại/refresh/đổi tài khoản,
xác nhận danh tính Host hiện tại trước khi hiển thị giao diện từ cache. Khi cần đăng
nhập lại, lấy code mới; không retry cùng code khi response bị mất vì code có thể đã
tiêu thụ. Giới hạn retry/gia hạn để tránh vòng lặp.

`auth.logout()` kết thúc token Mini App; ứng dụng cũng cần xóa/thu hồi phiên riêng.
`dispose()` chỉ dọn trạng thái/listeners/requests, không thay thế đăng xuất server.

## 7. HTTPS, iframe và cache

- Cho phép Host nhúng bằng CSP `frame-ancestors https://mxh.ankt.vn`. Gộp directive
  vào CSP hiện có, không xóa các chính sách bảo mật khác.
- Không để `X-Frame-Options: DENY/SAMEORIGIN` chặn trang được nhúng.
- Nếu có `connect-src`, thêm API ANKT HTTPS và backend ứng dụng của bạn. Không dùng
  wildcard để tránh lỗi origin.
- Dùng URL có version/hash cho SDK/bundle; HTML cần revalidate. Kiểm tra chính HTML,
  bundle và SDK mà Nginx/CDN phục vụ, không chỉ source code trên server.
- Với Expo hoặc framework build tĩnh, env frontend được nhúng lúc build. Đổi env
  hoặc reload Nginx không thay JavaScript đã export. Build lại với env đúng; khi cần
  xóa cache Metro, dùng `npx expo export --platform web --clear`. Deploy đủ artifact
  vào đúng thư mục Nginx đang phục vụ.

## 8. Sandbox trên Portal và phát hành Production

1. Mở Sandbox từ Portal production sau khi đã xác minh domain. Host vẫn là
   `https://mxh.ankt.vn`; không thay bằng server ANKT tự chạy.
2. Dùng credential Sandbox ở dịch vụ thử nghiệm được cô lập. SDK nhận tài khoản test
   `ankt_sandbox_test` từ ANKT, không nhập mật khẩu test.
3. Xác minh đủ: Bridge → code → backend exchange → session → frontend/router → API
   được bảo vệ. `Connected` hoặc ảnh hồ sơ không chứng minh đăng nhập ứng dụng thành công.
4. Kiểm thử mở lại, account mới/cũ, chọn vai trò, hết hạn/thu hồi, đổi tài khoản,
   mất mạng/Thử lại và Web/Android/iOS thật.
5. Khi gửi xét duyệt/phát hành, dùng bản website/backend Production đã deploy,
   credential Production và kiểm tra `environment === 'Production'` ở backend.
6. Xác nhận người dùng thật từ danh mục ANKT vào đúng tài khoản. Giữ dữ liệu/phiên
   thử nghiệm tách biệt. Backend Production không được chấp nhận danh tính Sandbox.

## 9. Chẩn đoán nhanh

| Hiện tượng | Kiểm tra |
| --- | --- |
| Đã kết nối nhưng UI chưa đăng nhập | Backend route đã được triển khai và frontend đã áp dụng session vào auth store/router chưa? |
| `getLoginCode is not a function` | File SDK thực tải xuống phải là 0.4.1, đổi version URL khi nâng cấp. |
| `PARTNER_LOGIN_NOT_CONFIGURED` | Đăng ký credential backend đúng App ID/môi trường với vận hành ANKT. |
| `INVALID_ORIGIN` hoặc backend 403 | So sánh Website URL, www/non-www, Origin backend, CSP và Host production. |
| `SERVER_ONLY` | Không gọi endpoint partner từ browser hoặc chuyển tiếp Origin vào server request. |
| `INVALID_LOGIN_CODE` | Code sai/hết hạn/đã dùng; lấy code mới trên lần Thử lại. |
| `INVALID_CLIENT` | Client ID và credential đúng môi trường ở cả hai phía. |
| `SESSION_EXPIRED` | Xác thực lại từ Host còn đăng nhập; từ chối phiên backend cũ. |
| `HOST_UNAVAILABLE` | Mở từ ANKT hoặc Sandbox của Portal, kiểm tra Host và transport. |
| Sửa env mà không đổi hành vi | Kiểm tra env lúc build, hash bundle, cache HTML và root Nginx thực tế. |

Tài liệu API/SDK hiện hành trên Portal: `/developers/docs/api-reference` và
`/developers/docs/sdk`. Hướng dẫn ANKT tự chạy để phát triển nền tảng là tài liệu
nội bộ riêng tại `docs/operations/miniapp-local-development.md`, không phải setup
chuẩn cho developer tích hợp.
