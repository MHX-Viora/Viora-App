export const revision = '2026-10-12';
export const pages = [
  {
    "slug": "",
    "path": "/developers",
    "title": "Phát triển Mini App cùng ANKT",
    "description": "ANKT Developers — Trung tâm dành cho nhà phát triển. Tìm hiểu cách chuẩn bị website đối tác, đăng nhập và tích hợp an toàn.",
    "keywords": "developer đối tác",
    "sections": [
      {
        "id": "bat-dau",
        "title": "Mini App trong Tiện ích ANKT",
        "paragraphs": [
          "Ứng dụng đối tác xuất hiện ngay dưới Ví trong trang Tiện ích. Người dùng tìm kiếm, chọn danh mục, ghim ứng dụng và mở dịch vụ. Console dùng tài khoản ANKT hiện có."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "lo-trinh",
        "title": "Lộ trình dành cho đối tác",
        "paragraphs": [
          "Lưu hồ sơ Developer, xác minh email và gửi duyệt. Tạo bản nháp ứng dụng, đăng ký HTTPS, xác minh domain, chạy kiểm tra kỹ thuật, gửi phiên bản xét duyệt và phát hành bản được duyệt."
        ],
        "items": [],
        "code": ""
      }
    ]
  },
  {
    "slug": "docs",
    "path": "/developers/docs",
    "title": "Tài liệu ANKT Developers",
    "description": "Hướng dẫn tiếng Việt về website đối tác, SSO, WebView, bảo mật và quy trình phát hành.",
    "keywords": "hướng dẫn tổng quan",
    "sections": [
      {
        "id": "tong-quan",
        "title": "Hướng dẫn nền tảng",
        "paragraphs": [
          "Website có thể dùng đăng nhập riêng hoặc ANKT SSO. Frontend hiển thị nội dung; backend đối tác xử lý callback OIDC và tạo phiên của website."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "pham-vi",
        "title": "Điều có thể làm ngay",
        "paragraphs": [
          "Dùng issuer/client ID đúng môi trường được cấp. Tài liệu và mã nguồn không xác nhận production đã được kích hoạt. Console và API báo trạng thái thực tế khi thao tác."
        ],
        "items": [],
        "code": ""
      }
    ]
  },
  {
    "slug": "getting-started",
    "path": "/developers/docs/getting-started",
    "title": "Bắt đầu tích hợp",
    "description": "Chuẩn bị website đối tác và hiểu các thành phần trước khi kết nối ANKT.",
    "sections": [
      {
        "id": "yeu-cau",
        "title": "Chuẩn bị website đối tác",
        "paragraphs": [
          "Website cần HTTPS công khai, giao diện mobile, thông tin hỗ trợ và URL chính sách bảo mật. Website vẫn hoạt động độc lập bằng React, Next.js, Vue hoặc framework của bạn."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "kien-truc",
        "title": "Phân chia trách nhiệm",
        "paragraphs": [
          "Confidential client giữ secret ở backend; public client không dùng secret và bắt buộc PKCE S256. Website đối tác có thể dùng database riêng của mình. Không cần database ANKT thứ hai."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "kiem-tra",
        "title": "Checklist trước khi kết nối",
        "paragraphs": [
          "Website cần HTTPS công khai, giao diện mobile, thông tin hỗ trợ và URL chính sách bảo mật. Website vẫn hoạt động độc lập bằng React, Next.js, Vue hoặc framework của bạn."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "register-developer",
    "path": "/developers/docs/register-developer",
    "title": "Đăng ký Developer",
    "description": "Chuẩn bị hồ sơ cá nhân hoặc doanh nghiệp và hiểu trạng thái xét duyệt.",
    "sections": [
      {
        "id": "ho-so",
        "title": "Hồ sơ Developer",
        "paragraphs": [
          "Mở /developers/register bằng tài khoản ANKT. Cá nhân cần tên, email, điện thoại và quốc gia. Doanh nghiệp bổ sung tên pháp lý, địa chỉ, người đại diện và website HTTPS."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "quy-trinh",
        "title": "Quy trình đăng ký",
        "paragraphs": [
          "Lưu nháp, gửi mã xác minh email, nhập mã còn hiệu lực rồi đồng ý điều khoản hiện hành và gửi duyệt. Trạng thái gồm Draft, PendingReview, Approved, NeedMoreInformation, Rejected, Suspended, Revoked. Hồ sơ chờ duyệt không thể sửa; bổ sung theo lý do được phản hồi."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "trang-thai",
        "title": "Trạng thái và hồ sơ bị từ chối",
        "paragraphs": [
          "Owner quản lý thành viên Admin, Developer, Analyst trong Console. Thông tin pháp lý không xuất hiện trong catalog công khai."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": "dang ky developer cá nhân doanh nghiệp"
  },
  {
    "slug": "create-mini-app",
    "path": "/developers/docs/create-mini-app",
    "title": "Tạo Mini App",
    "description": "Chuẩn bị Entry URL, domain, callback và phạm vi quyền của ứng dụng.",
    "sections": [
      {
        "id": "cau-hinh",
        "title": "Cấu hình Mini App",
        "paragraphs": [
          "Mở Console → Ứng dụng → Tạo Mini App. Điền tên, slug, mô tả, icon HTTPS, tối đa 8 ảnh giới thiệu, danh mục, Entry URL, email hỗ trợ và URL chính sách."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "cac-buoc",
        "title": "12 bước chuẩn bị và tạo ứng dụng",
        "paragraphs": [
          "Đăng ký từng host/origin chính xác. Tạo challenge rồi đặt nội dung vào https://YOUR_HOST/ankt-mini-app-verification.txt; bấm Kiểm tra domain. Không wildcard, private host hoặc chuyển hướng challenge."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "luu-y",
        "title": "Kiểm tra URL và quyền",
        "paragraphs": [
          "Independent dùng đăng nhập riêng. AnktSso dùng OIDC; callback khớp chính xác và origins bridge đã xác minh. Optional cho phép khách; Required yêu cầu backend website kiểm tra phiên trước chức năng được bảo vệ."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "sso",
    "path": "/developers/docs/sso",
    "title": "Đăng nhập SSO",
    "description": "Thiết kế đăng nhập OpenID Connect với backend đối tác, PKCE và phiên riêng.",
    "sections": [
      {
        "id": "mo-hinh",
        "title": "Đăng nhập OIDC",
        "paragraphs": [
          "Backend đối tác tạo transaction ngắn hạn chứa state, nonce và PKCE verifier ngẫu nhiên. Frontend gọi SDK với redirectUri, state, nonce, scopes, codeChallenge và codeChallengeMethod: S256."
        ],
        "items": [],
        "code": "ANKT_ISSUER=https://API_ISSUER\nANKT_CLIENT_ID=YOUR_CLIENT_ID\nANKT_CLIENT_SECRET=SERVER_ONLY_SECRET\nANKT_REDIRECT_URI=https://partner.example/auth/ankt/callback"
      },
      {
        "id": "bien-moi-truong",
        "title": "Ba biến cấu hình phía server",
        "paragraphs": [
          "ANKT kiểm tra phiên host, ứng dụng, scope và consent. Website nhận code tại callback, kiểm tra state rồi đổi tại /oauth/token. Xác minh ID token qua JWKS discovery: chữ ký, issuer, audience, expiry và nonce. Code chỉ dùng một lần."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "xac-minh",
        "title": "Kiểm tra bắt buộc",
        "paragraphs": [
          "Lưu danh tính theo issuer + sub riêng theo ứng dụng, không tự ghép theo email. Tạo cookie HttpOnly, Secure riêng cho website. Partner access token chỉ dùng resource /v1 được cấp, không dùng API nội bộ /api."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "phien",
        "title": "Tạo phiên đối tác",
        "paragraphs": [
          "Backend đối tác tạo transaction ngắn hạn chứa state, nonce và PKCE verifier ngẫu nhiên. Frontend gọi SDK với redirectUri, state, nonce, scopes, codeChallenge và codeChallengeMethod: S256."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "framework",
        "title": "React, Next.js, Vue, Node và ASP.NET",
        "paragraphs": [
          "ANKT kiểm tra phiên host, ứng dụng, scope và consent. Website nhận code tại callback, kiểm tra state rồi đổi tại /oauth/token. Xác minh ID token qua JWKS discovery: chữ ký, issuer, audience, expiry và nonce. Code chỉ dùng một lần."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": "PKCE nonce state OAuth OIDC"
  },
  {
    "slug": "sdk",
    "path": "/developers/docs/sdk",
    "title": "SDK và website đối tác",
    "description": "SDK JavaScript/TypeScript và BFF để tích hợp website đối tác với ANKT.",
    "sections": [
      {
        "id": "hien-trang",
        "title": "ANKT Mini App SDK",
        "paragraphs": [
          "Nạp /mini-app-sdk/ankt-mini-app.js từ issuer; declaration .d.ts đi kèm. Package TypeScript @ankt/mini-app-sdk 2.2.1 có trong mã nguồn ANKT, chưa publish npm registry. hostOrigin là HTTPS origin chính xác của ANKT; BFF paths thuộc backend website đối tác.",
          "API: initialize/getEnvironment, auth.login/getSession/logout, user.getBasicProfile, permissions.request, app.close, navigation.openExternal. Các tên SDK 2.2 cũ vẫn tương thích. Có ví dụ React và BFF Node/ASP.NET; secret và token chỉ ở backend."
        ],
        "items": [],
        "code": "ANKT.configure({\n  hostOrigin: 'https://mxh.ankt.vn',\n  bff: { sessionPath: '/auth/ankt/session', startPath: '/auth/ankt/start', profilePath: '/auth/ankt/profile', logoutPath: '/auth/ankt/logout' }\n});\nawait ANKT.ready();\nawait ANKT.auth.autoLogin();\nconst profile = await ANKT.user.getProfile();"
      },
      {
        "id": "setup",
        "title": "Setup website đối tác ngay hôm nay",
        "paragraphs": [
          "API gồm getPlatformInfo(), getAppInfo(), auth.login(), auth.autoLogin(), auth.logout(), auth.getSession(), auth.getPermissions(), user.getProfile(), requestPermission(), openExternalUrl(), closeMiniApp(). Auto login dùng transaction thật từ BFF; không chuyển token đăng nhập chính ANKT."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "bridge",
        "title": "Giao tiếp với host khi được hỗ trợ",
        "paragraphs": [
          "Bridge kiểm tra origin, source, app, session, nonce, request ID và timeout. Trong standalone, website dùng OIDC/BFF của chính nó; không giả lập bridge hoặc tự tạo token."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "webview",
    "path": "/developers/docs/webview",
    "title": "Website trong WebView",
    "description": "Chuẩn bị responsive, cookie, điều hướng và liên kết ngoài trên thiết bị di động.",
    "sections": [
      {
        "id": "giao-dien",
        "title": "Website trong WebView và trình duyệt",
        "paragraphs": [
          "Thiết kế responsive, nút đủ lớn, hỗ trợ bàn phím, loading và retry. Native WebView không gửi header Authorization ANKT tới Entry URL và không chia sẻ cookie ANKT."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "cookie",
        "title": "Cookie và phiên đăng nhập",
        "paragraphs": [
          "Web iframe dùng sandbox. CSP/X-Frame-Options hoặc cookie bên thứ ba có thể chặn nhúng: người dùng chọn Mở website đối tác để tiếp tục qua browser và phiên website riêng."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "dieu-huong",
        "title": "Điều hướng và liên kết ngoài",
        "paragraphs": [
          "Chỉ origins đã đăng ký/xác minh được gọi bridge. Điều hướng làm mất binding cũ. Link ngoài phạm vi ứng dụng cần xác nhận trước khi mở trình duyệt. Chặn HTTP, javascript:, file:, data: URL."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "checklist",
        "title": "Checklist thiết bị",
        "paragraphs": [
          "Thiết kế responsive, nút đủ lớn, hỗ trợ bàn phím, loading và retry. Native WebView không gửi header Authorization ANKT tới Entry URL và không chia sẻ cookie ANKT."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": "cookie mobile responsive"
  },
  {
    "slug": "account-linking",
    "path": "/developers/docs/account-linking",
    "title": "Liên kết tài khoản",
    "description": "Ghép định danh đã xác minh với tài khoản đối tác theo sự đồng ý của người dùng.",
    "sections": [
      {
        "id": "dinh-danh",
        "title": "Liên kết tài khoản chủ động",
        "paragraphs": [
          "Dùng khóa issuer + sub đã xác minh, có unique constraint. Email hoặc tên hiển thị không phải khóa để tự ghép tài khoản."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "lien-ket",
        "title": "Xác nhận trước khi ghép",
        "paragraphs": [
          "Người dùng xác thực tài khoản đối tác hiện tại và đồng ý liên kết danh tính ANKT. Dùng transaction ngắn hạn, CSRF token và xử lý xung đột rõ ràng."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "go-lien-ket",
        "title": "Gỡ liên kết và xung đột",
        "paragraphs": [
          "Cung cấp đăng xuất và gỡ liên kết. Khi quyền bị thu hồi, ứng dụng xử lý lỗi an toàn và không tự chuyển liên kết sang tài khoản khác."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "security",
    "path": "/developers/docs/security",
    "title": "Bảo mật tích hợp",
    "description": "Checklist HTTPS, CSRF, XSS, CORS, CSP và quản lý bí mật trên website đối tác.",
    "sections": [
      {
        "id": "secret",
        "title": "Bảo mật website đối tác",
        "paragraphs": [
          "Lưu secret, verifier và token trong backend/secret manager. Không đưa vào Git, log, URL hoặc client bundle. Xoay secret trong Console với bước xác nhận."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "web",
        "title": "CSRF, XSS, CORS và CSP",
        "paragraphs": [
          "Kiểm tra state, nonce, PKCE, chữ ký, issuer, audience và expiry. BFF mutation dùng CSRF token. Escape nội dung, CORS/CSP đúng origin, callback chính xác, cookie HttpOnly/Secure và chặn open redirect."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "van-hanh",
        "title": "Log và ứng phó sự cố",
        "paragraphs": [
          "Ghi correlation ID/loại lỗi, che dữ liệu cá nhân. Giới hạn tốc độ, dọn transaction hết hạn và kiểm tra token bị thu hồi. Không bỏ validation để chữa lỗi đăng nhập."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "publishing",
    "path": "/developers/docs/publishing",
    "title": "Kiểm thử và phát hành",
    "description": "Chuẩn bị hồ sơ duyệt, kiểm thử và kế hoạch hỗ trợ trước khi phát hành.",
    "sections": [
      {
        "id": "kiem-thu",
        "title": "Phiên bản và phát hành",
        "paragraphs": [
          "Lưu cấu hình, xác minh domain, chạy kiểm tra kỹ thuật rồi gửi phiên bản xét duyệt. Kết quả test gắn hash cấu hình; thay đổi cấu hình cần test lại."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "xet-duyet",
        "title": "Xét duyệt và thay đổi",
        "paragraphs": [
          "Admin duyệt snapshot phiên bản, có thể yêu cầu sửa hoặc từ chối kèm lý do. Bản Approved chưa tự phát hành; Developer có quyền quản lý chọn Phát hành đúng phiên bản được duyệt."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "sau-phat-hanh",
        "title": "Vận hành lâu dài",
        "paragraphs": [
          "Catalog dùng snapshot đã phát hành; sửa bản nháp không đổi bản đang chạy. Developer có thể ngừng phát hành; Admin có thể tạm khóa hoặc ẩn catalog."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "api",
    "path": "/developers/docs/api",
    "title": "API và hợp đồng tích hợp",
    "description": "Hiểu giới hạn hiện tại và cách sử dụng hợp đồng API công khai khi được phát hành.",
    "sections": [
      {
        "id": "trang-thai",
        "title": "Hợp đồng API",
        "paragraphs": [
          "OIDC issuer cung cấp /.well-known/openid-configuration, /oauth/authorize, /oauth/token, /oidc/userinfo, /oauth/revoke. Dùng discovery lấy JWKS URI. Chỉ Authorization Code + PKCE S256; public client không dùng secret."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "hop-dong",
        "title": "Điều cần có trước khi gọi API",
        "paragraphs": [
          "Partner token gọi /v1/me và /v1/apps/{appId}/permissions theo scope được cấp. Không dùng partner token gọi API host /api hoặc đổi với JWT mạng xã hội."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "client",
        "title": "Thiết kế client phía đối tác",
        "paragraphs": [
          "Host ANKT dùng GET /api/mini-apps/catalog với page, pageSize ≤ 60, search, categoryId và rail all/favorites/recent/featured/popular/new/recommended. PUT /api/mini-apps/{id}/favorite; PUT /api/mini-apps/favorites/order; DELETE /api/mini-apps/history sử dụng phiên ANKT."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  },
  {
    "slug": "faq",
    "path": "/developers/docs/faq",
    "title": "Câu hỏi thường gặp",
    "description": "Giải đáp về trạng thái nền tảng, database, website đối tác và đăng nhập.",
    "sections": [
      {
        "id": "kha-dung",
        "title": "Câu hỏi thường gặp",
        "paragraphs": [
          "Mini App nằm trong Tiện ích ngay dưới Ví, không có catalog/tab riêng. Developer Console nằm trong website ANKT và dùng tài khoản hiện có."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "database",
        "title": "Tôi cần tạo hai database ANKT không?",
        "paragraphs": [
          "Không cần hai database ANKT. AppDbContext và OpenIddict dùng cùng connection với lịch sử migration riêng. Website đối tác giữ database/phiên của mình nếu cần."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "website",
        "title": "Website hiện tại có cần viết lại không?",
        "paragraphs": [
          "Không chuyển token đăng nhập chính ANKT sang đối tác. Định danh bằng issuer + sub; không tự ghép email. Nếu iframe bị chặn, mở website đối tác. Khi callback lỗi, kiểm tra exact redirect URI, state, nonce và HTTPS."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "dang-nhap",
        "title": "Có được chuyển token ANKT sang đối tác không?",
        "paragraphs": [
          "Mini App nằm trong Tiện ích ngay dưới Ví, không có catalog/tab riêng. Developer Console nằm trong website ANKT và dùng tài khoản hiện có."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "email",
        "title": "Email giống nhau có tự ghép tài khoản không?",
        "paragraphs": [
          "Không cần hai database ANKT. AppDbContext và OpenIddict dùng cùng connection với lịch sử migration riêng. Website đối tác giữ database/phiên của mình nếu cần."
        ],
        "items": [],
        "code": ""
      },
      {
        "id": "loi",
        "title": "Vì sao cookie hoặc callback không hoạt động?",
        "paragraphs": [
          "Không chuyển token đăng nhập chính ANKT sang đối tác. Định danh bằng issuer + sub; không tự ghép email. Nếu iframe bị chặn, mở website đối tác. Khi callback lỗi, kiểm tra exact redirect URI, state, nonce và HTTPS."
        ],
        "items": [],
        "code": ""
      }
    ],
    "keywords": ""
  }
];
export const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export function searchDocs(query) {
  const tokens = fold(query.trim()).split(/\s+/).filter(Boolean);
  if (!tokens.length || /[<>]/.test(query)) return [];
  return pages.map(page => {
    const title = fold(page.title + ' ' + page.keywords);
    const body = fold(JSON.stringify(page.sections) + ' ' + page.description);
    const score = tokens.every(token => title.includes(token) || body.includes(token)) ? tokens.reduce((sum, token) => sum + (title.includes(token) ? 8 : 1), 0) : 0;
    return { ...page, score };
  }).filter(page => page.score).sort((a, b) => b.score - a.score);
}
