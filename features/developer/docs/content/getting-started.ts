import {page, section, paragraph as p, steps, link, note} from './helpers';
import {productionMiniApp} from '../../lib/mini-app-production-guide';

export const startPages = [
  page('', 'ANKT Developer Documentation', 'Tích hợp website HTTPS, đăng nhập và phát hành Mini App trên ANKT production.', 'Bắt đầu', 0, [
    section('quick-start', 'Website của bạn trong ANKT', p('Đăng ký website, nhận danh tính đã xác minh từ ANKT và tạo phiên đăng nhập trong hệ thống của bạn. Hướng dẫn dành cho developer tích hợp với ANKT đang vận hành; không yêu cầu source code hoặc môi trường phát triển ANKT.'), link('Bắt đầu tích hợp', 'getting-started'), link('SDK và ví dụ', 'sdk'), link('Developer Console', '/developers/console')),
  ], ['introduction', 'getting-started']),
  page('getting-started', 'Bắt đầu tích hợp', 'Từ website đang hoạt động đến Mini App đăng nhập được trên ANKT production.', 'Bắt đầu', 2, [
    section('production', 'Địa chỉ và mô hình triển khai', p(`Developer Portal: ${productionMiniApp.portalUrl}. Host ANKT: ${productionMiniApp.hostOrigin}. API ANKT hiện tại: ${productionMiniApp.apiOrigin}. Website và backend Mini App là dịch vụ do bạn triển khai trên domain HTTPS của mình.`), note('Sandbox trên nền tảng production', 'Sandbox là chế độ kiểm thử của Developer Portal với tài khoản test đã xác minh. Không cần tạo thêm subdomain chỉ vì dùng Sandbox. Dữ liệu/credential thử nghiệm cần được cô lập; backend Production chỉ chấp nhận credential và môi trường Production.')),
    section('steps', 'Các bước thực hiện', steps(
      'Đăng ký tài khoản Developer trên Portal production, xác minh email và đăng nhập.',
      'Tạo Mini App. Lưu Website URL HTTPS thật, logo, mô tả, email hỗ trợ và các URL chính sách. App ID là Client ID công khai.',
      'Tải file xác minh từ Cấu hình tích hợp, đặt đúng tên/nội dung tại website rồi nhấn Xác minh.',
      `Vào Tích hợp Auth Bridge, tải SDK JavaScript ${productionMiniApp.sdkVersion}, tự host cùng website và dùng URL script có phiên bản. Developer không cần tự build SDK.`,
      'Đăng ký credential backend với ANKT cho đúng App ID và môi trường. Chỉ lưu Client Secret ở backend; Portal hiện không có nút tự cấp secret.',
      'Frontend gọi init rồi auth.getLoginCode(). Gửi code bằng POST tới /api/auth/ankt/exchange do backend của bạn triển khai.',
      'Backend đổi code bằng credential server tại /api/miniapp/auth/partner/exchange, kiểm tra app/môi trường/hạn, tìm hoặc tạo liên kết tài khoản và cấp phiên riêng.',
      'Frontend nhận phiên riêng vào session store/router hiện có. Nếu dùng ví dụ sao chép, xử lý sự kiện ankt:partner-login; sự kiện không tự đăng nhập giao diện.',
      'Mở Sandbox từ Portal production. Kiểm tra cả Bridge lẫn phiên backend Mini App; ứng dụng có thể yêu cầu chọn vai trò/hoàn thiện hồ sơ.',
      'Tạo phiên bản, gửi xét duyệt và phát hành. Kiểm thử bằng người dùng ANKT thật với credential Production trước khi mở rộng.'
    )),
    section('done', 'Khi nào tích hợp hoàn tất?', p('Đã kết nối ANKT chỉ xác nhận SDK/Bridge. Hoàn tất khi backend Mini App cấp phiên cho đúng tài khoản, frontend sử dụng phiên đó và API nghiệp vụ kiểm tra grant ANKT còn hiệu lực. Mở lại, hết hạn hoặc đổi tài khoản phải xác minh phiên trước khi hiển thị dữ liệu.'), link('Luồng xác thực và backend', 'auth-bridge'), link('SDK hiện tại', 'sdk')),
    section('environment', 'Cấu hình frontend và backend', p('Trước khi build/deploy, thiết lập env public cho frontend và credential server cho backend theo framework của bạn. SDK không tự đọc .env; adapter và bootstrap phải truyền các giá trị vào cấu hình.'), link('Setup env đối tác: frontend và backend', 'environment-setup')),
  ], ['create-mini-app', 'domain-verification', 'auth-bridge', 'environment-setup', 'sdk', 'sandbox']),
  page('integration-paths', 'Tích hợp Mini App', 'Một SDK cho Web iframe, Android WebView và iOS WKWebView.', 'Bắt đầu', 3, [
    section('auth-bridge', 'Luồng tích hợp', p('Dùng SDK hiện hành để xác thực Bridge và lấy code đăng nhập cho backend. Backend của bạn quản lý liên kết tài khoản và phiên ứng dụng; không chấp nhận userId do trình duyệt tự gửi làm bằng chứng đăng nhập.')),
    section('standalone', 'Website mở độc lập', p('Gọi SDK khi không có Host sẽ nhận HOST_UNAVAILABLE. Website độc lập có thể giữ luồng đăng nhập riêng hiện có; chỉ bật luồng Mini App khi mở trong ANKT. Không đổi Host sang địa chỉ giả hoặc bỏ kiểm tra origin.')),
  ], ['sdk', 'bridge', 'auth-bridge']),
  page('developer-account', 'Tài khoản Developer', 'Đăng ký, xác minh email và quản lý phiên trên Portal production.', 'Bắt đầu', 4, [
    section('session', 'Tài khoản và bảo mật', p('Tài khoản Developer dùng để quản lý Mini App, không phải credential backend hoặc tài khoản người dùng Mini App. Cookie Developer không được gửi sang website đối tác. Sandbox không yêu cầu nhập mật khẩu tài khoản test.')),
  ], ['create-mini-app']),
  page('create-mini-app', 'Tạo Mini App', 'Đăng ký website HTTPS và thông tin ứng dụng.', 'Mini App', 5, [
    section('registry', 'Đăng ký ứng dụng', steps('Trong Mini App của tôi, chọn Tạo Mini App.', 'Lưu tên, danh mục, logo, mô tả, Website URL, email hỗ trợ và các URL chính sách.', 'Giữ App ID làm Client ID công khai. Thay placeholder trong ví dụ bằng ID được cấp.', 'Xác minh domain. Thay Website URL/domain cần cập nhật cấu hình và xác minh lại trước khi kiểm thử.')),
  ], ['domain-verification', 'sdk', 'auth-bridge']),
];
