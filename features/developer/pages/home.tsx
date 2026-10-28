import { useEffect, useRef } from 'react';
import Link from '../navigation.web';
import { BASE_PATH, pageMetadata } from '../lib/site';
import { HealthStatus } from '../components/health-status';
import { LandingIcon, type LandingIconName } from '../components/landing-icon';
import { useDeveloperSession } from '../session.web';

export const metadata = pageMetadata('Xây dựng cùng ANKT', '/', 'Mang ý tưởng và dịch vụ của bạn vào hệ sinh thái ANKT. Khám phá Mini App, tạo tài khoản Developer và chuẩn bị tích hợp.');

const highlights: { icon: LandingIconName; title: string; copy: string }[] = [
  { icon: 'users', title: 'Kết nối cộng đồng', copy: 'người dùng trong ANKT' },
  { icon: 'grid', title: 'Hệ sinh thái', copy: 'đa dạng dịch vụ' },
  { icon: 'shield', title: 'Bảo mật & an toàn', copy: 'ngay từ khi xây dựng' },
  { icon: 'support', title: 'Hỗ trợ & tư vấn', copy: 'đồng hành cùng bạn' },
];
const benefits: { icon: LandingIconName; title: string; copy: string; tone: string }[] = [
  { icon: 'bolt', title: 'Tiếp cận cộng đồng', copy: 'Mở rộng điểm chạm cho dịch vụ của bạn trong hệ sinh thái ANKT.', tone: 'violet' },
  { icon: 'grid', title: 'Tập trung vào sản phẩm', copy: 'Thiết kế trải nghiệm gọn nhẹ, tập trung vào giá trị cốt lõi của sản phẩm.', tone: 'blue' },
  { icon: 'shield', title: 'Bảo mật & ổn định', copy: 'Chuẩn bị tiêu chuẩn bảo mật, quyền riêng tư và tích hợp ngay từ đầu.', tone: 'blue' },
  { icon: 'chart', title: 'Cơ hội phát triển', copy: 'Đưa dịch vụ vào một không gian mới, với lộ trình tích hợp rõ ràng.', tone: 'cyan' },
];
const steps: { icon: LandingIconName; title: string; copy: string; status: string; href: string }[] = [
  { icon: 'bulb', title: 'Tìm hiểu nền tảng', copy: 'Đọc hướng dẫn và tài liệu để nắm quy định, tính năng tích hợp.', status: 'Bắt đầu tại đây', href: '/docs' },
  { icon: 'file', title: 'Tạo tài khoản Developer', copy: 'Đăng ký, xác minh email và cấu hình Mini App trên Developer Portal.', status: 'Đã sẵn sàng', href: '/register' },
  { icon: 'code', title: 'Tích hợp & thử nghiệm', copy: 'Chuẩn bị cho SDK, đăng nhập ANKT và thử nghiệm trong môi trường Sandbox.', status: 'Trong lộ trình', href: '/docs#roadmap' },
  { icon: 'send', title: 'Gửi duyệt & phát hành', copy: 'Tìm hiểu định hướng hoàn thiện hồ sơ, xét duyệt và phát hành Mini App.', status: 'Trong lộ trình', href: '/docs#roadmap' },
];
const questions = [
  ['Tôi có thể tạo Mini App chưa?', 'Có. Sau khi đăng ký và xác minh email Developer, bạn có thể tạo Mini App, quản lý thông tin tích hợp, thông tin xác thực, callback và xác minh domain. Việc tạo Mini App chưa đồng nghĩa với được phát hành trong ANKT.'],
  ['Có cần tài khoản để đọc tài liệu không?', 'Không. Bạn có thể đọc tài liệu, hướng dẫn bắt đầu và lộ trình nền tảng mà không cần đăng nhập. Tài khoản Developer dùng để quản lý Mini App và cấu hình tích hợp.'],
  ['Đăng nhập ANKT và Sandbox hoạt động thế nào?', 'Mini App dùng Auth Bridge để tự động nhận tài khoản thật trong ANKT hoặc tài khoản test trong Developer Sandbox. Xác minh domain, tải SDK từ tab Tích hợp, đổi mã tại backend của bạn để tạo phiên riêng và kiểm tra toàn bộ luồng trước khi gửi xét duyệt.'],
  ['Phạm vi sử dụng chung hệ thống ANKT ra sao?', 'Developer Portal nằm tại /developers và dùng backend, database chung của ANKT. Tài khoản và phiên đăng nhập Developer độc lập với tài khoản mạng xã hội. Kiểm tra kết nối API bên dưới chỉ phản ánh kết nối dịch vụ.'],
];

export default function Home() {
  const session = useDeveloperSession();
  const root = useRef<HTMLDivElement>(null);
  const startHref = session.account || session.loading || session.unavailable ? '/console' : '/register';
  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    element.querySelectorAll('[data-landing-reveal]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="landing-content">
    <section className="landing-hero" aria-labelledby="landing-title"><div className="container landing-hero-inner">
      <div className="landing-hero-copy"><p className="landing-eyebrow">ANKT MINI APP DEVELOPER PLATFORM</p>
        <h1 id="landing-title">Ý tưởng của bạn.<br />Trải nghiệm mới<br /><span>cùng ANKT.</span></h1>
        <p className="landing-description">Đưa dịch vụ, sản phẩm và ý tưởng của bạn đến gần hơn với cộng đồng ANKT. Bắt đầu hành trình tích hợp an toàn, linh hoạt và cùng phát triển.</p>
        <div className="landing-actions"><Link href={startHref} className="button">Bắt đầu tích hợp <LandingIcon name="arrow" /></Link><Link href="/docs/getting-started" className="button button-secondary"><LandingIcon name="book" />Đọc tài liệu</Link></div>
        <ul className="landing-assurances"><li><LandingIcon name="check" />Cấu hình Mini App</li><li><LandingIcon name="check" />Auth Bridge</li><li><LandingIcon name="check" />Hỗ trợ tận tâm</li></ul>
      </div>
      <figure className="landing-hero-art"><img src={`${BASE_PATH}/landing/mini-app-hero.webp`} srcSet={`${BASE_PATH}/landing/mini-app-hero-small.webp 640w, ${BASE_PATH}/landing/mini-app-hero.webp 1200w`} sizes="(max-width: 767px) 100vw, 54vw" width="1200" height="900" alt="Minh họa điện thoại ANKT với các Mini App và biểu tượng dịch vụ 3D." fetchPriority="high" /><figcaption>Minh họa trải nghiệm Mini App</figcaption></figure>
    </div></section>

    <section className="landing-highlight-strip" aria-label="Cùng phát triển trên ANKT"><div className="container landing-highlights">{highlights.map(item => <div key={item.title} className="landing-highlight"><span className="landing-icon-box"><LandingIcon name={item.icon} /></span><p><strong>{item.title}</strong><span>{item.copy}</span></p></div>)}</div></section>

    <section className="landing-ecosystem" aria-labelledby="mini-app-title"><div className="container">
      <div className="landing-intro" data-landing-reveal><div><p className="landing-eyebrow">VÌ SAO NÊN PHÁT TRIỂN TRÊN ANKT</p><h2 id="mini-app-title">Dịch vụ của bạn,<br />ngay trong ANKT.</h2><p>Mini App là trải nghiệm ứng dụng gọn nhẹ, được định hướng hoạt động bên trong ANKT.</p><p>Người dùng có thể tiếp cận dịch vụ trong một hệ sinh thái quen thuộc, nhà phát triển tập trung vào giá trị cốt lõi của sản phẩm, với lộ trình tích hợp và tiêu chuẩn phát hành rõ ràng.</p><Link href="/docs" className="landing-text-link">Tìm hiểu về Mini App <LandingIcon name="arrow" /></Link></div>
        <img className="landing-ecosystem-art" src={`${BASE_PATH}/landing/ecosystem.webp`} width="960" height="720" loading="lazy" decoding="async" alt="Logo A ở trung tâm hệ sinh thái các dịch vụ mua sắm, trò chơi, công việc và âm nhạc." />
      </div>
      <div className="landing-benefits" data-landing-reveal>{benefits.map(item => <article key={item.title}><span className={`landing-icon-box tone-${item.tone}`}><LandingIcon name={item.icon} /></span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
    </div></section>

    <section className="container landing-journey-section" aria-labelledby="journey-title" data-landing-reveal><div className="landing-section-heading"><div><p className="landing-eyebrow">TỪ Ý TƯỞNG ĐẾN PHÁT HÀNH</p><h2 id="journey-title">Quy trình 4 bước đơn giản.</h2></div><p>Bắt đầu chỉ với vài bước.<br />Từng bước chuẩn bị cho hành trình phát triển.</p></div>
      <ol className="landing-journey">{steps.map((step, index) => <li key={step.title}><span className="landing-step-icon"><LandingIcon name={step.icon} /></span><span className="landing-step-number">0{index + 1}</span><h3><Link href={index === 1 && session.account ? '/console' : step.href}>{step.title}</Link></h3><p>{step.copy}</p><span className={`landing-step-status${index < 2 ? ' is-available' : ''}`}>{step.status}</span></li>)}</ol>
    </section>

    <section className="container landing-docs-wrap" aria-labelledby="docs-cta-title" data-landing-reveal><div className="landing-docs-banner"><div className="landing-docs-copy"><p className="landing-eyebrow">BẮT ĐẦU TỪ ĐÂY</p><h2 id="docs-cta-title">Hiểu nền tảng.<br />Chuẩn bị cho bước tiếp theo.</h2><p>Khám phá tài liệu, lộ trình SDK và hướng dẫn chi tiết để bắt đầu phát triển Mini App trên ANKT.</p><Link href="/docs/getting-started" className="button landing-white-button">Xem hướng dẫn bắt đầu <LandingIcon name="arrow" /></Link></div><img src={`${BASE_PATH}/landing/developer-docs.webp`} width="960" height="720" loading="lazy" decoding="async" alt="Minh họa sách tài liệu kỹ thuật mở với các biểu tượng SDK, mã nguồn và hướng dẫn." /></div></section>

    <section className="container landing-faq" aria-labelledby="faq-title" data-landing-reveal><div><p className="landing-eyebrow">CÂU HỎI THƯỜNG GẶP</p><h2 id="faq-title">Bạn cần biết.</h2><p>Tìm câu trả lời trước<br />khi bắt đầu xây dựng.</p></div><div className="landing-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><div className="landing-faq-answer"><p>{answer}</p></div></details>)}</div></section>
    <div className="container landing-health"><HealthStatus /></div>
  </div>;
}
