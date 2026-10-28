import {page, section, paragraph as p, note, link, steps} from './helpers';
import {productionMiniApp} from '../../lib/mini-app-production-guide';

const frontendEnv=`# Frontend Expo: public values embedded during build
EXPO_PUBLIC_API_URL=https://api.miniapp.example.com
EXPO_PUBLIC_ANKT_CLIENT_ID=YOUR_REGISTERED_APP_ID
EXPO_PUBLIC_ANKT_API_ORIGIN=${productionMiniApp.apiOrigin}
EXPO_PUBLIC_ANKT_HOST_ORIGIN=${productionMiniApp.hostOrigin}`;

const backendEnv=`# Backend only: map these values into your authentication adapter
ANKT_API_ORIGIN=${productionMiniApp.apiOrigin}
ANKT_MINI_APP_CLIENT_ID=YOUR_REGISTERED_APP_ID
ANKT_MINI_APP_CLIENT_SECRET=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
ANKT_MINI_APP_ENVIRONMENT=Production
MINI_APP_ORIGIN=https://miniapp.example.com`;

const dotnetEnv=`# Alternative: .NET adapter using the AnktMiniApp configuration section
AnktMiniApp__Enabled=true
AnktMiniApp__ClientId=YOUR_REGISTERED_APP_ID
AnktMiniApp__ClientSecret=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
AnktMiniApp__ApiOrigin=${productionMiniApp.apiOrigin}
AnktMiniApp__HostOrigin=${productionMiniApp.hostOrigin}
AnktMiniApp__MiniAppOrigin=https://miniapp.example.com
AnktMiniApp__Environment=Production`;

export const environmentPages = [
  page('environment-setup', 'Cấu hình env frontend và backend', 'Cấu hình production của đối tác, nơi đặt biến và cách ứng dụng sử dụng chúng.', 'Mini App', 7.5, [
    section('map', 'Phân biệt đúng ba địa chỉ', {type:'table',columns:['Biến/giá trị','Thuộc dịch vụ nào'],rows:[['Website origin: https://miniapp.example.com','Website HTTPS thật đã đăng ký trong Portal; thay bằng domain của bạn.'],['API đối tác: https://api.miniapp.example.com','Backend của bạn, nơi triển khai route đăng nhập và API nghiệp vụ. Có thể cùng origin website qua reverse proxy.'],['Host: '+productionMiniApp.hostOrigin,'Host ANKT production; không phải Website URL của đối tác.'],['API ANKT: '+productionMiniApp.apiOrigin,'SDK và backend đối tác gọi các endpoint ANKT tại đây.']]}),
    section('frontend', 'Frontend Expo / React Native Web', p('Đặt các biến public trong .env tại thư mục gốc frontend hoặc cấu hình môi trường job build. File .env.example chỉ là mẫu. Không tạo biến Client Secret trong frontend.'), {type:'code',language:'bash',code:frontendEnv}, p('API_URL là API của đối tác, còn ANKT_API_ORIGIN là API ANKT. Thay hai domain ví dụ bằng domain thật của bạn. Giữ các biến Google, push và cấu hình nghiệp vụ hiện có nếu ứng dụng đang dùng.'), {type:'code',language:'javascript',code:`// SDK JavaScript must already be loaded; Expo inlines these exact env accesses.
const ANKT = window.ANKTMiniApp.create({
  clientId: process.env.EXPO_PUBLIC_ANKT_CLIENT_ID,
  hostOrigin: process.env.EXPO_PUBLIC_ANKT_HOST_ORIGIN,
  apiOrigin: process.env.EXPO_PUBLIC_ANKT_API_ORIGIN,
});
const partnerApi = process.env.EXPO_PUBLIC_API_URL;
if (!partnerApi) throw new Error('PARTNER_API_NOT_CONFIGURED');
async function startMiniApp() {
  await ANKT.init();
  const {code} = await ANKT.auth.getLoginCode();
  const response = await fetch(partnerApi + '/api/auth/ankt/exchange', {
    method: 'POST', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code}),
  });
  if (!response.ok) throw new Error('PARTNER_LOGIN_FAILED');
  const session = await response.json();
  document.dispatchEvent(new CustomEvent('ankt:partner-login', {detail: session}));
}
startMiniApp().catch(error => document.dispatchEvent(new CustomEvent('ankt:login-error', {
  detail: {code: error.code || 'PARTNER_LOGIN_FAILED'},
})));`}, p('Frontend phải xử lý sự kiện để áp dụng phiên vào auth store/router. Ví dụ trên dùng response phiên trong bộ nhớ; nếu dùng cookie cross-origin, cấu hình credentials/CORS/CSRF/cookie theo hợp đồng backend của bạn. Không thêm credentials tùy ý để né lỗi. Với HTML tĩnh dùng cấu hình trực tiếp trong ví dụ SDK; trình duyệt không tự đọc .env. Vite dùng VITE_* và import.meta.env, không dùng nguyên cú pháp process.env của Expo.')),
    section('backend', 'Backend: secret và môi trường đã xác minh', p('Đặt biến ở backend service hoặc secret manager, không trong Nginx frontend/static assets. Đây là tên biến ví dụ; code adapter phải đọc chúng và truyền vào cấu hình. SDK không tự đọc biến server.'), {type:'code',language:'bash',code:backendEnv}, {type:'code',language:'javascript',code:`const config = {
  apiOrigin: process.env.ANKT_API_ORIGIN,
  clientId: process.env.ANKT_MINI_APP_CLIENT_ID,
  clientSecret: process.env.ANKT_MINI_APP_CLIENT_SECRET,
  environment: process.env.ANKT_MINI_APP_ENVIRONMENT,
};
const allowedWebsiteOrigin = process.env.MINI_APP_ORIGIN;
// Pass config to your server-side partner exchange/session adapter.
// Check request Origin against allowedWebsiteOrigin before accepting login codes.`}, note('Đăng ký credential trước', 'Dùng App ID được cấp và secret Production đã được đăng ký với ANKT. Placeholder không chạy được. Không tự đặt một secret tùy ý chỉ ở phía đối tác. Đăng ký credential cần đơn vị vận hành ANKT. Sau khi được cấu hình, chủ app chọn môi trường tại Tích hợp Auth Bridge rồi Hiện/Sao chép cạnh App ID. Portal không tự sinh secret; hash-only vẫn xác thực nhưng không thể khôi phục secret để sao chép.')),
    section('dotnet', 'Ví dụ backend .NET', p('Nếu backend của bạn dùng adapter AnktMiniApp và bind IConfiguration.GetSection("AnktMiniApp"), dùng các biến sau thay cho bộ tên Node ở trên. Dấu __ ánh xạ cấu trúc cấu hình .NET. Đây là mẫu adapter, không phải SDK tự sinh endpoint hay đọc cấu hình giúp mọi backend.'), {type:'code',language:'bash',code:dotnetEnv}, p('MiniAppOrigin phải là website origin thật, khớp Origin browser. HostOrigin là Host ANKT. API/CORS/WEB_APP_URL của backend phải chấp nhận đúng website; giữ database, JWT/session signing key và các cấu hình nghiệp vụ hiện có. Không sao chép khóa ký ANKT vào backend đối tác.')),
    section('sandbox', 'Khi kiểm thử Sandbox trên Portal production', p('Host và API ANKT vẫn là các domain production bên trên. Chỉ backend thử nghiệm đổi sang credential Sandbox và expected environment = Sandbox; cô lập tài khoản/phiên/dữ liệu thử nghiệm. Frontend không có biến chọn môi trường để thay thế xác minh của Host. Không đổi domain website đã đăng ký sang một subdomain giả. Backend Production phải từ chối Sandbox.')),
    section('deploy', 'Thứ tự áp dụng và xác nhận', steps('Đăng ký credential ở ANKT và cấu hình backend đối tác đúng App ID, secret, Website Origin, API ANKT và môi trường. Restart/redeploy backend để nạp env.', 'Cấu hình frontend tại nơi build thực tế. Biến shell/CI có thể ưu tiên hơn .env trên máy; không log hoặc commit secret.', 'Build lại frontend và deploy toàn bộ artifact vào đúng thư mục hosting/Nginx. Với Expo có thể dùng npx expo export --platform web --clear để tránh cache Metro.', 'Xem network response thực tế: URL SDK đúng version, Host/API ANKT đúng domain và request đăng nhập đi đến API đối tác đúng địa chỉ.', 'Kiểm thử code → backend exchange → phiên riêng → frontend/session store → API được bảo vệ. Mã HTTP 401 với code thử không hợp lệ không chứng minh đăng nhập thật thành công.')),
    section('checklist', 'Đối chiếu nhanh khi lỗi', {type:'table',columns:['Hiện tượng','Đối chiếu'],rows:[['SDK gọi sai API/Host','Env frontend ở job build và JavaScript thực đang phục vụ, không chỉ .env.example.'],['Backend 403 Origin','MiniAppOrigin / MINI_APP_ORIGIN phải đúng website origin; kiểm tra www/non-www và CORS/CSRF.'],['INVALID_CLIENT / PARTNER_LOGIN_NOT_CONFIGURED','Cùng App ID, secret đã đăng ký và môi trường tương ứng ở hai bên.'],['API ANKT 404','Reverse proxy/backend ANKT phải phục vụ /api/miniapp/auth/* tại domain API chính thức.'],['Bridge đã kết nối nhưng chưa vào tài khoản','Route backend đối tác đã triển khai, trả phiên đúng hợp đồng và frontend đã áp dụng phiên.']]} , link('Luồng backend và grant', 'auth-bridge'), link('SDK và ví dụ đầy đủ', 'sdk')),
  ], ['getting-started', 'auth-bridge', 'sdk', 'troubleshooting']),
];
