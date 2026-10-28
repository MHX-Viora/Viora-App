// Synthetic UI only: no account, credential, real token or backend request.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EmailVerification } from '../components/email-verification';
import '../developer.css';

const scenario = new URLSearchParams(location.search).get('scenario') || 'success';
const counts = { verify: 0, resend: 0 };
window.__verificationFixture = counts;
window.fetch = async (path) => {
  if (String(path).endsWith('auth/resend-verification')) {
    counts.resend++;
    return Response.json({ message: 'Nếu email phù hợp, bạn sẽ nhận được liên kết xác minh mới.' }, { status: 202 });
  }
  if (!String(path).endsWith('auth/verify-email')) throw new Error('Unexpected fixture route');
  const call = ++counts.verify;
  await new Promise(resolve => setTimeout(resolve, scenario === 'loading' ? 30000 : 600));
  if (scenario === 'expired') return Response.json({ error: { message: 'Liên kết không hợp lệ hoặc hết hạn.' } }, { status: 400 });
  if (scenario === 'retry' && call === 1) return Response.json({ error: { message: 'Fixture unavailable' } }, { status: 503 });
  return Response.json({ message: 'Địa chỉ email đã được xác minh.' });
};
createRoot(document.getElementById('root')).render(<StrictMode><div className="developer-site"><EmailVerification /></div></StrictMode>);
