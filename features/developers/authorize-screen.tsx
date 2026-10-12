import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { platformRequest } from '../mini-apps/api';
import type { Permission } from '../mini-apps/types';
import { ConsoleButton, ConsoleShell, ConsoleText } from './console-ui';
import { clearOAuthRequest, readOAuthRequest } from './oauth-request.mjs';
type Decision = { appId: string; name: string; requiresConsent: boolean; permissions: Permission[]; authorizeUrl?: string };
export default function AuthorizeScreen() {
  const [decision, setDecision] = useState<Decision>(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const prepare = async () => { const request = readOAuthRequest(); if (!request) throw new Error('Giao dịch đăng nhập đã hết hạn. Hãy quay lại website đối tác và đăng nhập lại.'); const result = await platformRequest<Decision>('/api/open-api/authorize', 'POST', request); setDecision(result); return result; };
  useEffect(() => { void prepare().catch(e => setError(e.message)); }, []);
  const approve = async () => { setBusy(true); setError(''); try {
    if (decision?.requiresConsent) await platformRequest(`/api/mini-apps/${decision.appId}/consent`, 'POST', { permissions: decision.permissions.map(p => p.code), granted: true });
    const result = await prepare(); if (!result.authorizeUrl) throw new Error('Không thể cấp quyền đăng nhập.');
    const target = new URL(result.authorizeUrl); const api = new URL(process.env.EXPO_PUBLIC_OPEN_API_ISSUER || process.env.EXPO_PUBLIC_API_URL || '');
    if (target.origin !== api.origin || target.pathname !== '/oauth/authorize') throw new Error('Địa chỉ xác thực không hợp lệ.');
    clearOAuthRequest(); if (Platform.OS === 'web') window.location.assign(target.href); else await Linking.openURL(target.href);
  } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đăng nhập.'); } finally { setBusy(false); } };
  const deny = () => { const request = readOAuthRequest(); clearOAuthRequest(); if (!decision || !request) return; const target = new URL(request.redirectUri); target.searchParams.set('error', 'access_denied'); target.searchParams.set('state', request.state); if (Platform.OS === 'web') window.location.assign(target.href); else void Linking.openURL(target.href); };
  return <ConsoleShell title="Đăng nhập website bằng ANKT" error={error} busy={busy}>
    {decision && <><ConsoleText>{decision.name} yêu cầu kết nối với tài khoản ANKT của bạn.</ConsoleText>{decision.permissions.map(p => <ConsoleText key={p.code}>{p.name}{p.isSensitive ? ' · Nhạy cảm' : ''}: {p.description}</ConsoleText>)}<ConsoleButton label="Tiếp tục đăng nhập" disabled={busy} primary onPress={() => void approve()} /><ConsoleButton label="Từ chối" disabled={busy} onPress={deny} /></>}
  </ConsoleShell>;
}
