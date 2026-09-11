# Handoff: Cross-platform incoming calls

## 1. Architecture Call trước khi sửa

- REST `/api/calls` lưu `CallSession`, kiểm tra participant và chuyển trạng thái.
- `/hubs/realtime` phát incoming/accepted/terminal events qua SignalR `Clients.User`, vốn hỗ trợ nhiều connection cho một user.
- `/hubs/calls` chuyển tiếp WebRTC readiness, SDP và ICE sau khi xác thực participant/trạng thái.
- App native đã có incoming-call/FCM/WebRTC. Web dùng cùng contract nhưng thiếu persistence, background/closed-tab delivery và một số terminal/reconnect cleanup.

## 2. Vì sao Web trước đây không nhận đầy đủ

- Web bị dừng shared SignalR khi tab chuyển background.
- Web push adapter là no-op; không đăng ký FCM token hay service worker.
- Pending incoming call trên Web chỉ nằm trong biến memory nên refresh làm mất call.
- `IncomingCall` chưa persist payload/nested caller và chưa tạo title/browser notification.
- Backend chỉ push khi user hoàn toàn offline; một connection online làm các device suspended khác không được push.
- Accept chưa atomically tranh chấp với mọi terminal transition; Web call chưa xử lý đủ terminal/reconnect lifecycle.

## 3. Files đã sửa

Frontend:

- `.env.example`
- `app/_layout.tsx`
- `app/incoming-call/[callId].tsx`
- `components/calls/incoming-call-host.tsx`
- `features/calls/call-waiting.ts`
- `features/calls/voice-call-screen.web.tsx`
- `services/call.service.ts`
- `services/incoming-call-notification.service.web.ts`
- `services/pending-incoming-call.service.ts`
- `services/push-notification.service.ts`
- `services/push-notification.service.web.ts`
- `services/realtime.service.ts`
- `public/firebase-messaging-sw.js`
- Call tests, test runner, spec, plan và handoff tương ứng.

Backend:

- `Viora.Application/Calls/CallContracts.cs`
- `Viora.Application/Calls/CallHandlers.cs`
- `Viora.Infrastructure/Persistence/Repositories/CallRepository.cs`
- `Viora.Infrastructure/Realtime/FirebasePushNotificationSender.cs`
- `viora-BE/Controllers/CallsController.cs`
- `viora-BE/Program.cs`
- `Viora.Application.Tests/Calls/*`

## 4. Realtime files cố tình không sửa

- Backend `RealtimeHub`, `CallHub`, `ConnectionRegistry`, `SignalRRealtimeService`.
- Chat handlers/contracts, friendship, presence, notification, post/reaction và group-chat realtime.
- Frontend chat/message/conversation/unread/typing/presence modules.
- Không rename event hoặc đổi payload realtime ngoài Call.

## 5. Call events

- Shared realtime: `IncomingCall`, `CallAccepted`, `CallAnsweredElsewhere`, `CallRejected`, `CallCancelled`, `CallEnded`, `CallMissed`, `CallTimeout`.
- Call hub methods/events: `AcceptCall`/`CallAccepted`, `Offer`/`ReceiveOffer`, `Answer`/`ReceiveAnswer`, `IceCandidate`/`ReceiveIceCandidate`, `ReconnectCall`.

## 6. Luồng cross-platform

- App → App: giữ nguyên native flow hiện có.
- App → Web: REST create → `IncomingCall`/FCM → global Web overlay → atomic REST accept → CallHub offer/answer/ICE.
- Web → App: Web tạo call bằng REST; App tiếp tục nhận SignalR/FCM và dùng contract CallHub hiện có.
- Web → Web: receiver accept bằng REST; caller gửi SDP offer, receiver trả SDP answer; hai phía trao đổi ICE và media browser.

## 7. Web behavior

- Active: SignalR → global overlay ở mọi route; ringtone best-effort.
- Background tab: SignalR vẫn chạy; overlay được giữ, title đổi và browser notification hiện nếu đã cấp quyền.
- PWA đang mở: giống Web standalone.
- Closed tab/PWA: FCM Web Push → service worker → notification; click mở `/incoming-call/{callId}`, sau đó GET server xác nhận call còn `Calling` trước khi hiển thị. Push không auto-accept/mở media.

## 8. Multi-device

- `Clients.User` fan-out tới mọi SignalR connection; incoming push gửi tới các active device token để không bỏ sót device suspended.
- Mọi `Calling → Accepted/Rejected/Cancelled/Missed` và `Accepted → Ended` dùng conditional database update theo current status.
- Request thua race nhận `InvalidState`; không được phát terminal event sai hoặc ghi đè winner.

## 9. AnsweredElsewhere

- Accept request gửi `X-ANKT-Realtime-Connection-Id`.
- Backend phát `CallAnsweredElsewhere` cho receiver connections và push devices, kèm winning connection ID.
- Winning connection bỏ qua event; các connection/device còn lại dừng ringtone, xóa pending UI/state và không mở WebRTC.

## 10. WebRTC / ICE

- SDP/ICE chỉ đi qua authorized `/hubs/calls`; hub lấy user từ JWT và kiểm tra participant/status.
- Web xử lý queue ICE, lỗi ICE không tạo unhandled rejection, cleanup peer/local tracks và đóng late-created peer sau unmount.
- SignalR reconnect dùng contract `ReconnectCall` hiện có để renegotiate.
- Mặc định: `stun:stun.l.google.com:19302`.
- TURN lấy từ backend config `Calls:Turn:Url`, `Calls:Turn:Username`, `Calls:Turn:Credential`; không có credential trong frontend.

## 11. Regression verification

- Shared realtime connection/listener architecture không đổi; chỉ thêm Call handlers cạnh listener hiện có.
- Full frontend suite bao phủ chat/message/unread/navigation/notification và Call: PASS.
- Backend Call authorization/delivery/race tests: PASS.
- `git diff --check`: không có whitespace error; chỉ có cảnh báo LF/CRLF của working tree Windows.

## 12. Build/test results

- Frontend tests: **227/227 PASS**.
- TypeScript: **PASS** (`npx tsc --noEmit`).
- Lint: **PASS** (`npm run lint`).
- Web production export: **PASS**; `firebase-messaging-sw.js` có trong `dist`.
- Production-bundle smoke: root, JS bundle, favicon và service worker trả HTTP 200; Chrome headless tải root/JS thành công.
- Backend tests: **56/56 PASS**.
- Backend build: **PASS**, 0 warning, 0 error.

## 13. Production/deployment requirements

- **Requires production deployment/config update.** Production backend giờ fail closed nếu thiếu `Cors:AllowedOrigins`.
- Cấu hình exact origins, ví dụ `Cors__AllowedOrigins__0=https://app.example.com` và `Cors__AllowedOrigins__1=https://admin.example.com`. Không dùng wildcard; chỉ localhost trong Development fallback.
- Frontend cần `EXPO_PUBLIC_API_URL` và Firebase Web: `EXPO_PUBLIC_FIREBASE_WEB_API_KEY`, `...AUTH_DOMAIN`, `...PROJECT_ID`, `...APP_ID`, `...MESSAGING_SENDER_ID`, `...VAPID_KEY`.
- Backend cần Firebase Admin configuration hiện có; deploy `firebase-messaging-sw.js` ở web root qua HTTPS.
- Nếu cần NAT traversal production, cấu hình `Calls__Turn__Url`, `Calls__Turn__Username`, `Calls__Turn__Credential`; task không provision TURN.
- Browser vẫn yêu cầu user cấp notification/microphone/camera; autoplay ringtone có thể bị chặn. Tab đã đóng chỉ nhận được khi Web Push đã đăng ký. Không thể auto-accept hoặc tự mở media.
- Cần chạy manual staging matrix App↔App, App↔Web, Web↔Web, background/locked và multi-device với credential/device thật trước rollout.
- Security follow-up ngoài phạm vi Call: repository đang có credential infrastructure hard-code từ trước trong backend `appsettings.json`; phải rotate và chuyển sang secret manager/environment trước production.
