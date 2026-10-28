import {useEffect, useState} from 'react';
import {accountRequest} from '../lib/account-client';
import type {MiniApp} from '../lib/mini-app-client';
import type {DomainVerification} from '../lib/mini-app-integration';
import {productionIntegrationHtml, productionMiniApp} from '../lib/mini-app-production-guide';
import {MiniAppClientSecret} from './mini-app-client-secret';

export function MiniAppBridgeIntegration({appId}: {appId: string}) {
  const [connection, setConnection] = useState<{app: MiniApp; domain: DomainVerification} | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [retry, setRetry] = useState(0);
  const [sdk,setSdk]=useState<{version:string;url:string;bytes:number;releasedAt:string}|null>(null);
  const [sdkError,setSdkError]=useState('');
  useEffect(()=>{
    const abort=new AbortController();setSdk(null);setSdkError('');
    void (async()=>{
      const response=await fetch('/sdk/manifest.json',{cache:'no-store',signal:abort.signal});
      if(!response.ok)throw Error();const value=await response.json();
      if(!/^\d+\.\d+\.\d+$/.test(value.version)||value.url!==`/sdk/ankt-miniapp.v${value.version}.min.js`||!Number.isInteger(value.bytes)||value.bytes<1||value.bytes>1048576||!/^[a-f0-9]{64}$/.test(value.sha256)||typeof value.releasedAt!=='string')throw Error();
      const artifact=await fetch(value.url,{signal:abort.signal});
      if(!artifact.ok||!/(?:application|text)\/javascript/.test(artifact.headers.get('content-type')??''))throw Error();
      const bytes=await artifact.arrayBuffer();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
      if(bytes.byteLength!==value.bytes||hash!==value.sha256)throw Error();
      if(abort.signal.aborted)return;
      setSdk(value);
    })().catch(()=>{if(!abort.signal.aborted)setSdkError('Không tải được SDK phát hành. Thử lại hoặc liên hệ hỗ trợ tích hợp ANKT.');});
    return()=>abort.abort();
  },[retry]);
  useEffect(() => {
    let active = true; setConnection(null); setError('');
    void Promise.all([accountRequest<MiniApp>(`mini-apps/${appId}`), accountRequest<DomainVerification>(`mini-apps/${appId}/domain-verification`)])
      .then(([app, domain]) => { if (active) setConnection({app, domain}); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được thông tin kết nối.'); });
    return () => {active = false;};
  }, [appId, retry]);
  let origin = '';
  try { origin = new URL(connection?.app.websiteUrl ?? '').origin; } catch { /* No URL in draft. */ }
  const sample = productionIntegrationHtml(appId, sdk?.version ?? productionMiniApp.sdkVersion);
  return <section className="mini-section"><h2>Tích hợp Auth Bridge</h2>
    <div className="notice"><strong>Đăng nhập tự động khi mở từ ANKT</strong><p>Mini App nhận tài khoản thật từ ANKT và tài khoản test từ Developer Sandbox. Không cần trang đăng nhập, Redirect URI hoặc Client Secret trong frontend.</p></div>
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}
    {!connection && !error && <p role="status">Đang tải thông tin kết nối…</p>}
    <dl className="mini-facts"><dt>Client ID</dt><dd><code>{appId}</code> <button className="button button-secondary" onClick={() => void navigator.clipboard.writeText(appId).then(() => setMessage('Đã sao chép Client ID.')).catch(() => setError('Không thể sao chép tự động. Chọn Client ID để sao chép thủ công.'))}>Copy Client ID</button></dd>
      <dt>Client Secret</dt><dd><MiniAppClientSecret key={appId} appId={appId}/></dd>
      <dt>Launch URL</dt><dd>{connection?.app.websiteUrl || 'Chưa cấu hình'}</dd><dt>Allowed Origins</dt><dd>{origin || 'Chưa cấu hình'}</dd>
      <dt>Xác minh domain</dt><dd>{connection?.domain.status === 'Verified' ? 'Đã xác minh' : 'Chưa xác minh'}</dd>
      <dt>Auth Bridge</dt><dd>{connection?.domain.status === 'Verified' ? 'Đã cấu hình · mở Sandbox để xác nhận handshake' : 'Cần lưu website và xác minh domain'}</dd></dl>
    <button className="button button-secondary" onClick={() => setRetry(value => value + 1)}>Tải lại thông tin kết nối</button>
    <h3>ANKT Mini App JavaScript SDK</h3>
    <div className="notice"><strong>Mã tích hợp production</strong><p>Host tin cậy là <code>https://mxh.ankt.vn</code>, kể cả khi Portal đang được mở ở địa chỉ khác. Developer không cần source code hoặc server ANKT riêng. Dùng Website URL HTTPS đã đăng ký của bạn.</p></div>
    <p>Một file JavaScript dùng chung cho Expo Web, Android WebView và iOS WKWebView. Tải file và lưu dưới tên <code>ankt-miniapp.js</code> cạnh website của bạn. Khi nâng cấp SDK, cập nhật cả file và tham số phiên bản trong URL script để trình duyệt tải bản mới.</p>
    {sdkError&&<p role="alert" className="form-error">{sdkError}</p>}
    {!sdk&&!sdkError&&<p role="status">Đang kiểm tra file SDK…</p>}
    {sdk&&<><p>Phiên bản {sdk.version} · {sdk.bytes.toLocaleString('vi-VN')} byte · Phát hành {sdk.releasedAt}</p>
      <a className="button" href={sdk.url} download="ankt-miniapp.js">Tải SDK JavaScript</a></>}
    <button className="button button-secondary" aria-label="Sao chép mã tích hợp production" disabled={!sdk} onClick={()=>void navigator.clipboard.writeText(sample).then(()=>setMessage('Đã sao chép mã tích hợp.')).catch(()=>setError('Không thể sao chép tự động.'))}>Sao chép mã tích hợp</button>
    <p><a href="/developers/docs/environment-setup">Hướng dẫn setup env frontend và backend đối tác</a> · Phải cấu hình tại nơi build frontend và service backend, không chỉ sửa file mẫu.</p>
    <h3>Đăng nhập tự động</h3><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><code>{sample}</code></pre>
    <p>SDK 0.4.0 bổ sung <code>auth.getLoginCode()</code>. Backend của bạn cần triển khai <code>POST /api/auth/ankt/exchange</code>: dùng Client ID và Client Secret phía server để đổi mã tại <code>POST /api/miniapp/auth/partner/exchange</code>, tìm hoặc tạo tài khoản và cấp phiên riêng. Credential Sandbox và Production được đăng ký riêng qua đơn vị vận hành ANKT; giá trị hiển thị ngay dưới Client ID và có nút Copy Client Secret. Portal không tự sinh secret; dùng secret để cấu hình backend đối tác.</p>
    <p>Ứng dụng phải xử lý <code>ankt:partner-login</code>: nhận phiên backend vào auth/session store, thực hiện onboarding nếu cần rồi mở giao diện chính. Sự kiện trong ví dụ không tự cập nhật router hoặc đăng nhập ứng dụng. “Đã kết nối ANKT” chỉ xác nhận Bridge; đăng nhập đối tác hoàn tất sau khi backend của bạn cấp phiên. Kiểm tra grant tại <code>POST /api/miniapp/auth/partner/session</code> trước khi dùng lại phiên đối tác.</p>
    <p>Cho phép nhúng bằng CSP <code>frame-ancestors https://mxh.ankt.vn</code>. Trang mở độc lập trả HOST_UNAVAILABLE. Token Mini App lưu trong bộ nhớ; không nhận JWT ANKT chính.</p>
    <p>Trạng thái handshake thực tế hiển thị trong Sandbox: Chưa kết nối, Đang kết nối, Đã kết nối, Lỗi kết nối. INVALID_ORIGIN yêu cầu kiểm tra domain; SESSION_EXPIRED yêu cầu khởi tạo lại phiên.</p>
    <p>Liên kết tài khoản theo (miniAppId, environment, user.id); sessionId là grant để kiểm tra phiên. Cô lập dữ liệu thử nghiệm khỏi Production. getUserInfo chỉ đọc profile, không tạo phiên ứng dụng.</p>
  </section>;
}
