"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from '../navigation.web';
import { AccountApiError, accountRequest } from '../lib/account-client';
import { createEmailVerification, verificationToken } from '../lib/email-verification';
import { LandingIcon } from './landing-icon';
import './email-verification.css';

type VerificationState = 'checking' | 'success' | 'invalid' | 'missing' | 'error';
const copy: Record<VerificationState, [string, string]> = {
  checking: ['Đang xác minh email', 'Vui lòng đợi trong giây lát, chúng tôi đang xác minh địa chỉ email của bạn…'],
  success: ['Xác minh email thành công', 'Email của bạn đã được xác minh. Bạn có thể đăng nhập và bắt đầu xây dựng cùng ANKT Developer.'],
  invalid: ['Liên kết không còn hiệu lực', 'Liên kết có thể đã hết hạn hoặc đã được sử dụng. Nếu bạn đã xác minh, hãy đăng nhập; nếu chưa, hãy yêu cầu email mới.'],
  missing: ['Xác minh địa chỉ email', 'Mở liên kết xác minh trong email ANKT đã gửi cho bạn. Bạn cũng có thể yêu cầu gửi lại email bên dưới.'],
  error: ['Chưa thể xác minh email', 'Kết nối đang gặp gián đoạn. Vui lòng kiểm tra mạng và thử lại. Nếu đã xác minh trước đó, bạn có thể đăng nhập.'],
};

function Envelope({ verified }: { verified: boolean }) {
  return <svg className="verification-illustration" viewBox="0 0 180 150" fill="none" aria-hidden="true" focusable="false">
    <circle cx="90" cy="75" r="65" fill="#EFF6FF" />
    <path d="M24 43h6m-3-3v6M147 32h6m-3-3v6M156 73h4m-2-2v4" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
    <path d="m43 76 47-37 47 37v46H43V76Z" fill="#93C5FD" />
    <rect x="59" y="49" width="62" height="63" rx="5" fill="white" stroke="#DBEAFE" strokeWidth="2" />
    <path d="M70 64h40M70 74h40M70 84h25" stroke="#CBDDF4" strokeWidth="3" strokeLinecap="round" />
    <path d="m43 76 47 32 47-32v44a6 6 0 0 1-6 6H49a6 6 0 0 1-6-6V76Z" fill="#60A5FA" />
    <path d="m45 124 39-30a10 10 0 0 1 12 0l39 30" fill="#BFDBFE" />
    <circle cx="127" cy="110" r="19" fill="#0866FF" stroke="white" strokeWidth="4" />
    {verified ? <path d="m119 110 5 5 10-11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      : <><rect x="121" y="108" width="12" height="9" rx="2" stroke="white" strokeWidth="1.8" /><path d="M124 108v-3a3 3 0 0 1 6 0v3" stroke="white" strokeWidth="1.8" /></>}
  </svg>;
}

export function EmailVerification() {
  const controller = useRef<ReturnType<typeof createEmailVerification> | null>(null);
  const initialized = useRef(false);
  const [state, setState] = useState<VerificationState>('checking');
  const [attempt, setAttempt] = useState(0);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const token = verificationToken(window.location.hash);
      if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      if (token) controller.current = createEmailVerification(token, accountRequest);
    }
    if (!controller.current) { setState('missing'); return; }
    let active = true;
    setState('checking');
    controller.current.verify().then(() => { if (active) setState('success'); }, error => {
      if (active) setState(error instanceof AccountApiError && error.status === 400 ? 'invalid' : 'error');
    });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    // A second email link opened into this same tab can be a hash-only navigation.
    // Consume that fragment too, without keeping a token in browser history.
    function newLink() {
      if (!window.location.hash) return;
      const token = verificationToken(window.location.hash);
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      controller.current = token ? createEmailVerification(token, accountRequest) : null;
      setAttempt(value => value + 1);
    }
    window.addEventListener('hashchange', newLink);
    return () => window.removeEventListener('hashchange', newLink);
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resending || cooldown) return;
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setResending(true); setNotice(''); setResendError('');
    try {
      const result = await accountRequest<{ message: string }>('auth/resend-verification', 'POST', { email });
      setNotice(result.message || 'Nếu email phù hợp với tài khoản chưa xác minh, chúng tôi sẽ gửi liên kết mới.');
      setCooldown(60);
    } catch { setResendError('Chưa gửi được email. Vui lòng kiểm tra kết nối và thử lại.'); }
    finally { setResending(false); }
  }

  return <section className="email-verification-page" aria-labelledby="verification-title">
    <div className="verification-card">
      <Envelope verified={state === 'success'} />
      <div className="verification-status" role="status" aria-live="polite" aria-atomic="true" aria-busy={state === 'checking'}>
        <h1 id="verification-title">{copy[state][0]}</h1>
        <p>{copy[state][1]}</p>
        {state === 'checking' && <span className="verification-spinner" aria-hidden="true" />}
      </div>
      {state === 'success' && <Link className="verification-button" href="/login">Đăng nhập Developer <LandingIcon name="arrow" /></Link>}
      {state === 'error' && <button className="verification-button" onClick={() => { controller.current?.retry(); setAttempt(value => value + 1); }}>Thử xác minh lại</button>}
      {(state === 'invalid' || state === 'missing') && <form className="verification-resend" onSubmit={resend}>
        <label htmlFor="verification-email">Email đăng ký</label>
        <input id="verification-email" name="email" type="email" autoComplete="email" placeholder="ban@example.com" maxLength={254} required disabled={resending} />
        <button className="verification-button" disabled={resending || cooldown > 0}>{resending ? 'Đang gửi email…' : cooldown ? `Gửi lại sau ${cooldown}s` : 'Gửi lại email xác minh'}</button>
        {notice && <p className="verification-notice" role="status">{notice}</p>}
        {resendError && <p className="verification-error" role="alert">{resendError}</p>}
      </form>}
      <div className="verification-security"><span><LandingIcon name="shield" /></span><div><strong>Bảo mật tài khoản</strong><p>Liên kết xác minh chỉ sử dụng một lần và có thời hạn. Vui lòng không chia sẻ liên kết này với người khác.</p></div></div>
      {state !== 'checking' && <Link className="verification-back" href={state === 'success' ? '/' : '/login'}>{state === 'success' ? 'Về trang chủ Developer' : 'Quay lại đăng nhập'}</Link>}
    </div>
  </section>;
}
