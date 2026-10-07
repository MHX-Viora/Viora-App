# Rocket Orbital Cinematic V7

## 1. Hai skill UI/UX

Áp dụng `ui-ux-pro-max` và `ui-styling` trong Codex. Tìm kiếm guideline motion xác nhận reduced motion, spatial continuity và tránh chuyển động cạnh tranh. Skill thứ nhất quyết định hierarchy tên người gửi, vùng an toàn và điều khiển không bị khóa. Skill thứ hai quyết định dark glass, viền champagne, ánh sáng white/gold chủ đạo, cyan/magenta phụ và bố cục Canvas có chiều sâu. Giữ stack Expo/React Native; không cài Tailwind/Radix hoặc WebGL mới.

## 2. Các file thay đổi

- Scene mới: `features/live/premium-gift-rocket-scene.tsx`.
- Timeline/geometry: `rocket-orbital-model.ts` và test.
- Môi trường: `rocket-orbital-environment.web.tsx`, `rocket-orbital-environment.tsx`.
- Hero/card: `rocket-orbital-hero.tsx`, `rocket-sender-hero.tsx`; tái sử dụng `premium-gift-rocket-art.tsx`.
- Queue/combo: `premium-gift-effect-model.ts`, `premium-gift-effect-manager.ts`, `premium-gift-effect-layer.tsx`, `live-gift-overlay.tsx` và các test tương ứng.
- Timeline/cue: `premium-gift-cinematic.ts`, `premium-gift-rocket-model.ts`, `premium-gift-rocket-cues.ts`, `use-rocket-sound-cues.ts`.
- Preview/checks: `scripts/rocket-preview.tsx`, `scripts/test.mjs`, spec `docs/specs/rocket-orbital-cinematic-v7.md`.

## 3. Animation cũ

V6 chạy trong khoảng 6 giây, ghép flight theo đường chéo, các cổng năng lượng, particle và finale pháo hoa. Dòng “LAUNCHED A ROCKET” cùng recognition card nhỏ là một phần scene. Quantity mở rộng thành nhiều flight riêng. Các module V6 vẫn nằm trong source để tránh xóa code/preview cũ ngoài phạm vi; scene production không import chúng nữa.

## 4. Tám phase mới

| Thời gian | Cảnh |
|---|---|
| 0–0,8s | Energy line, avatar, tên người gửi, dòng tiếng Việt, quantity |
| 0,8–1,8s | Live tối nhẹ, mây thấp, engine khởi động |
| 1,8–3,0s | Phóng tăng tốc; camera bám theo hero |
| 3,0–4,2s | Ba tầng mây tách ra, flash trắng ngắn |
| 4,2–5,5s | Bầu trời đổi màu liên tục; đường cong Trái Đất hiện dần |
| 5,5–7,0s | Zoom out, sao/nebula/hành tinh có parallax |
| 7,0–8,0s | Vệt sao kéo dài, Rocket thu nhỏ lao sâu, chớp sao cục bộ |
| 8,0–8,5s | Sao lưu lại ngắn rồi môi trường/card fade về Live |

## 5. Illusion 3D

SVG Rocket có gradient kim loại, mũi đồng, cửa sổ xanh và highlight dọc thân. Perspective 800 kết hợp rotateX/Y/Z, banking nhẹ và thay đổi scale. Các lớp exhaust cong có core trắng/vàng, gold, cyan và magenta; chiều dài/biên biến thiên nhỏ. Không dùng emoji làm hero.

## 6. Cloud transition

Web cache sprite mây gồm nhiều thể tích radial có phần đỉnh ấm và bóng xanh. Ba mặt phẳng dùng tốc độ khác nhau, đẩy sang hai bên ở cloud break. Một flash trắng kéo dài 300ms nối cảnh; reduced motion bỏ flash. Native dùng 18 volume SVG trong ba mặt phẳng với opacity/transform chạy native driver.

## 7. Earth/atmosphere

Earth là texture Canvas procedural cache: biển, vùng đất, ánh đèn và mây, được đặt trên hình cầu lớn ở dưới stage. Viền xanh nhiều lớp mô tả khí quyển. Palette bầu trời nội suy liên tục từ xanh sáng đến navy/đen; không đổi màu bằng cut. Native có spherical gradient, silhouette và atmosphere arc; không dùng emoji Earth.

## 8. Deep space

Ba lớp sao xa/vừa/gần, nebula/spiral dust cached, hành tinh có vành và ba asteroid nhỏ ở nền. Mọi thành phần nền có tốc độ drift khác nhau; Rocket giữ quyền ưu tiên thị giác. Không dùng wallpaper tĩnh phủ toàn cảnh.

## 9. Camera tracking

Rocket từ vùng dưới lên quanh 48–51% chiều cao trong launch/cloud/atmosphere, trong khi mây và sao chạy xuống dưới. Earth giảm bán kính hiển thị khi zoom out, hero giảm scale. Shake 2,5px chỉ diễn ra khoảng 300ms lúc phóng. Bỏ virtual camera cũ riêng cho Rocket để tránh hai hệ transform cùng áp dụng lên sender card.

## 10. Warp Exit

Rocket lao về tâm perspective và scale về 0, sao gần biến thành streak. Chớp sao nhỏ xuất hiện tại điểm đến 7,86–8,15s; không có explosion toàn màn hình. Nền/card dissolve hết tại 8,5s. Video bên dưới không bị unmount hoặc pause.

## 11. Sender card

Tên lớn, font weight 800, gold sáng; caption “ĐÃ PHÓNG TÊN LỬA” nhỏ hơn; quantity rõ và bounce khi combo đổi. Avatar có hai vòng vàng và energy satellite. Reveal chia line → avatar → name → caption → quantity trong 800ms. Card nằm theo stage, có bố cục riêng khi chiều cao thấp. Banner Rocket cũ được ẩn khi sender hero mới đang chạy, tránh hai announcement cạnh tranh. Không thêm badge VIP chưa được hệ thống xác nhận.

## 12. Combo/queue

Rocket có một cinematic cho cả quantity của một giao dịch. Cùng sender/gift gửi tiếp khi flight đang active sẽ cập nhật quantity ngay, không đổi id/start/end, không reset progress. Waiting groups giữ combo window 2,5s. Mỗi event vẫn có tổng quantity/started/completed riêng; duplicate delivery không tăng số lượng. Visual engine intensity clamp tối đa 1,225. Rocket dùng stage riêng; sender khác đợi và các loại quà khác tiếp tục theo queue sau flight. Pause/resume/clear vẫn bảo toàn accounting và dọn timer.

## 13. Mobile và reduced motion

Native không dùng Canvas DOM: SVG bounded, ba path sao, ba cloud planes và warp path. Web low quality dùng 48 sao, 15 cloud sprites, 12 exhaust particles, DPR 1. Reduced motion chỉ sender, hero đứng yên, light trail nhẹ và fade; không shake/parallax/warp/sound cue. Native SVG fallback được kiểm tra trong browser preview; chưa chạy trên thiết bị iOS/Android thật.

## 14. Kiểm tra và performance

TypeScript, lint, **536 frontend tests** và Expo web production export đều qua. Browser preview kiểm tra desktop ngang, desktop dọc, tablet, mobile dọc và mobile ngang; không thấy tràn ngang. Kiểm tra cả Canvas và native SVG fallback, reduced motion, combo, điều khiển host, hủy animation và console. Sau Cancel không còn Canvas hoặc active/waiting effect.

Mẫu đo 120 RAF ở pha deep-space trên máy hiện tại: trung bình 7,64ms, p95 13,8ms. Đây là mẫu cục bộ trong preview, không phải chứng nhận FPS trên mọi thiết bị. Có một RAF coalesced theo progress, không set React state theo frame; cache sprite được tạo một lần mỗi kích thước/quality. Cleanup remove progress listener, visibility/AppState listener, cancel RAF và giải phóng canvas. Không sửa Agora, host/audience video hoặc network lifecycle.

Sound chỉ là interface có tám cue (activation/ignition/launch/cloud/atmosphere/charge/warp/shimmer), im lặng nếu chưa gắn callback; không tham chiếu file âm thanh không tồn tại. Các kiểm thử cũ được điều chỉnh để giữ stagger test của Firework và kiểm tra accounting mới của Rocket, thay vì yêu cầu một cinematic cho từng đơn vị combo.

## 15. Asset designer

Không thiếu asset bắt buộc để chạy: Rocket SVG và môi trường đều procedural. Nếu muốn đạt chất liệu ảnh cinematic sát reference hơn, có thể thay Earth texture bằng bản đồ night-side/cloud texture, thêm nebula/planet artwork chất lượng cao và bộ sound cue có giấy phép. Các lớp môi trường/hero/cue đã được tách để thay asset mà không đổi queue hoặc Agora.
