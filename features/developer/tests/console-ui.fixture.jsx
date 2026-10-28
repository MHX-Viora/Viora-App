// Synthetic browser fixture only. Production components still use their real APIs.
import { createRoot } from 'react-dom/client';
import { MiniAppsProvider, MiniAppDashboard } from '../components/mini-apps';
import { MiniAppDetail } from '../components/mini-app-detail';
import { ReviewNotifications } from '../components/review-notifications';
import { AccountSettings } from '../components/account-settings';
import { AccountMenu } from '../components/account-menu';
import { DeveloperPublicHeader } from '../components/public-header';
import { ConsoleLayout } from '../components/console-layout';
import '../developer.css';
import '../mini-app.css';
import '../components/mini-app-review.css';
import '../components/public-header.css';
import '../components/console.css';

const scenario = new URLSearchParams(location.search).get('scenario') || 'empty';
const date = '2026-10-20T08:00:00Z';
const appId = 'app_' + 'a'.repeat(43);
const account = { id: 'fixture-developer', fullName: 'Nguyễn Minh An', email: 'developer@example.test', avatarUrl: null, hasPassword: true, emailVerifiedAt: date, status: 'Active' };
const sample = { appId, name: 'Cộng đồng ANKT', category: 'utilities', logoUrl: null, status: 'Draft', createdAt: date, updatedAt: date,
  appVersion:'11111111-1111-4111-8111-111111111111', websiteUrl: 'https://partner.example/app', supportEmail: null, shortDescription: null, description: null, privacyPolicyUrl: null, termsOfServiceUrl: null };
const apps = [sample, { ...sample, appId: 'app_' + 'b'.repeat(43), name: 'Học tập mỗi ngày', status: 'PendingReview' }, { ...sample, appId: 'app_' + 'c'.repeat(43), name: 'Tiện ích cho cộng đồng', status: 'Approved' }];
const calls = window.__consoleFixture = { create: 0, writes: 0, read: 0, paths: [] };
window.fetch = async (input, init = {}) => {
  const url = new URL(String(input), location.origin), path = url.pathname.split('/api/account/')[1], method = init.method || 'GET';
  calls.paths.push(path);
  if (!path) throw new Error('Unexpected fixture URL');
  if (method !== 'GET') calls.writes++; else calls.read++;
  if (path.startsWith('mini-apps?')) throw new Error('Query parsing belongs to URL, not pathname');
  if (path === 'mini-apps' && method === 'GET') {
    if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 30000));
    if (scenario === 'error') return Response.json({ error: { message: 'Không thể tải Mini App. Vui lòng thử lại.' } }, { status: 503 });
    const items = scenario === 'populated' ? apps : [];
    return Response.json({ items, total: items.length });
  }
  if (path === 'mini-apps' && method === 'POST') { calls.create++; const body = JSON.parse(init.body); return Response.json({ ...sample, name: body.name, category: body.category }, { status: 201 }); }
  if (path === 'auth/logout') return new Response(null, { status: 204 });
  if (path === 'sessions' || path === 'linked-accounts') return Response.json([]);
  if (path.startsWith('review-notifications')) return Response.json({ items: [], total: 0, page: 1, pageSize: 20, unreadCount: 0 });
  if (path.endsWith('/activity')) return Response.json([]);
  if(scenario==='domain-verification'){
    const fileName='ankt-verify-c178ef036a7e41d986ef90acf122c185.txt';
    if(path.endsWith('/integration'))return Response.json({websiteUrl:sample.websiteUrl,supportEmail:'',shortDescription:'',description:'',privacyPolicyUrl:'',termsOfServiceUrl:''});
    if(path.endsWith('/domain-verification'))return Response.json({hostname:'partner.example',status:'Failed',fileName,verificationUrl:'https://partner.example/'+fileName,verifiedAt:null,lastCheckedAt:date,expiresAt:date,errorCode:'INVALID_CONTENT_TYPE',message:'Định dạng phản hồi không hợp lệ hoặc nội dung bị nén.'});
    if(path.endsWith('/readiness'))return Response.json({configurationReady:false,readyForSandbox:false,readyForReview:false,sandboxAvailable:false,reviewAvailable:false,checkedAt:date,checks:[]});
  }
  if (path.endsWith('/domain-verification')) return Response.json({hostname:'partner.example',status:'Verified',fileName:null,verificationUrl:null,verifiedAt:date,lastCheckedAt:date,expiresAt:null,errorCode:null,message:null});
  if (path === 'mini-apps/' + appId) return Response.json(sample);
  return Response.json({ error: { message: 'This endpoint is outside the synthetic console fixture.' } }, { status: 400 });
};
const path = location.pathname;
let content = <MiniAppDashboard overview={path === '/developers/console'} />;
if (path.endsWith('/notifications')) content = <ReviewNotifications />;
else if (path.endsWith('/settings')) content = <AccountSettings account={account} />;
else if (path.includes('/apps/app_')) content = <MiniAppDetail appId={appId} />;
createRoot(document.getElementById('root')).render(<div className="developer-site developer-console"><DeveloperPublicHeader actions={<AccountMenu account={account} />} /><main><MiniAppsProvider><ConsoleLayout>{content}</ConsoleLayout></MiniAppsProvider></main></div>);
