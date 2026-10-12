import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { platformRequest } from '../mini-apps/api';
import { ConsoleButton, ConsoleText } from './console-ui';

type Integration = {
  enabled: boolean; eligible: boolean; issuer: string | null; discoveryUrl: string | null; hostOrigin: string | null;
  clientId: string; approvedScopes: string[]; approvedCallbackUrls: string[]; accountLinks: number;
  usage: { requests: number; successful: number; unauthorized: number; forbidden: number; rateLimited: number; truncated: boolean };
  ssoReadiness?: { autoLoginEnabled: boolean; callbackDomainsVerified: boolean; pkceSupported: boolean; consentRequirements: string };
};
export function IntegrationPanel({ id }: { id: string }) {
  const [data, setData] = useState<Integration>(); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setData(undefined); setError('');
    void platformRequest<Integration>(`/api/developer/mini-apps/${encodeURIComponent(id)}/open-api`)
      .then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, refresh]);
  return <View style={{ gap: 10 }}>
    {!data && !error && <ConsoleText>Đang tải cấu hình tích hợp…</ConsoleText>}
    {!!error && <><ConsoleText>{error}</ConsoleText><ConsoleButton label="Thử lại cấu hình tích hợp" onPress={() => setRefresh(n => n + 1)} /></>}
    {data && <>
      <ConsoleText>{!data.enabled ? 'Open API chưa được operator bật.' : data.eligible ? 'Ứng dụng đủ điều kiện dùng SSO.' : 'Ứng dụng chưa đủ điều kiện SSO: kiểm tra chế độ đăng nhập và phiên bản đã phát hành.'}</ConsoleText>
      {data.enabled && <ConsoleText>Issuer: {data.issuer}{'\n'}Discovery: {data.discoveryUrl}{'\n'}SDK: {data.issuer?.replace(/\/$/, '')}/mini-app-sdk/ankt-mini-app.js{'\n'}Host origin: {data.hostOrigin}</ConsoleText>}
      <ConsoleText>Scope đã duyệt: {data.approvedScopes.join(' ') || 'Chưa có'}{'\n'}Callback đã duyệt: {data.approvedCallbackUrls.join('\n') || 'Chưa có'}</ConsoleText>
      {data.enabled && <ConsoleText>{`ANKT_OIDC_ISSUER=${data.issuer}\nANKT_HOST_ORIGIN=${data.hostOrigin}\nANKT_CLIENT_ID=${data.clientId}\nANKT_CLIENT_SECRET=<chỉ cấu hình secret trên backend; bỏ với public client>\nANKT_REDIRECT_URI=${data.approvedCallbackUrls[0] || '<callback HTTPS cần duyệt>'}`}</ConsoleText>}
      {data.ssoReadiness && <ConsoleText>Auto Login: {data.ssoReadiness.autoLoginEnabled ? 'Đã bật trong bản phát hành' : 'Chưa bật'} · Domain callback: {data.ssoReadiness.callbackDomainsVerified ? 'Đã xác minh' : 'Chưa đầy đủ'} · PKCE: {data.ssoReadiness.pkceSupported ? 'S256' : 'Chưa sẵn sàng'}{'\n'}{data.ssoReadiness.consentRequirements}</ConsoleText>}
      <ConsoleText>7 ngày: {data.usage.requests} yêu cầu · {data.usage.successful} thành công · {data.usage.unauthorized} lỗi 401 · {data.usage.forbidden} lỗi 403 · {data.usage.rateLimited} lỗi 429{data.usage.truncated ? ' (thống kê giới hạn 10.000 bản ghi)' : ''}{'\n'}{data.accountLinks} định danh đã liên kết.</ConsoleText>
      <ConsoleText>Dùng BFF cùng origin website, discovery và code + PKCE S256. Secret, verifier và token chỉ ở backend; người dùng đồng ý trước khi chia sẻ quyền mới. Xem Hướng dẫn → SDK để setup React/Node/ASP.NET.</ConsoleText>
    </>}
  </View>;
}
