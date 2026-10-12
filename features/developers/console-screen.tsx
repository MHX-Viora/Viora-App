import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConsoleButton, ConsoleShell, ConsoleText, Field } from './console-ui';
import { developerApi } from './platform-api';
import type { AppAnalytics, DeveloperProfile, HybridApp, TeamMember } from './mini-app';

export default function DeveloperConsoleScreen({ mode = 'overview' }: { mode?: 'overview' | 'apps' | 'credentials' | 'analytics' }) {
  const [profile, setProfile] = useState<DeveloperProfile>(); const [apps, setApps] = useState<HybridApp[]>([]); const [team, setTeam] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<Record<string, AppAnalytics>>({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(true);
  const [accountId, setAccountId] = useState(''); const [role, setRole] = useState('Developer'); const [password, setPassword] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setBusy(true); setError('');
    void (async () => {
      const p = await developerApi.profile(); if (!active) return; setProfile(p);
      if (p.status !== 'Active') return;
      const items = await developerApi.apps(); if (!active) return; setApps(items);
      if (mode === 'overview' && p.membershipRole === 'Owner') { const members = await developerApi.team(); if (active) setTeam(members); }
      if (mode === 'analytics') { const results = await Promise.all(items.map(async app => [app.id, await developerApi.analytics(app.id)] as const)); if (active) setStats(Object.fromEntries(results)); }
    })().catch(e => { if (active) setError(e.status === 404 ? 'Bạn chưa đăng ký Developer. Mở Hồ sơ để bắt đầu.' : e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [mode, refresh]);
  const action = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn(); setRefresh(n => n + 1); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu.'); } finally { setPassword(''); setBusy(false); } };
  const navigate = (path: string) => router.push(path as Href);
  return <ConsoleShell title={mode === 'analytics' ? 'Thống kê ứng dụng' : mode === 'credentials' ? 'Cấu hình tích hợp' : mode === 'apps' ? 'Ứng dụng của tôi' : 'Developer Console'} error={error} busy={busy}>
    <ConsoleButton label="Tải lại" disabled={busy} onPress={() => setRefresh(n => n + 1)} />
    {profile && <ConsoleText>{profile.name} · {profile.registrationStatus} · {profile.membershipRole}</ConsoleText>}
    {profile?.status === 'Active' ? <>
      <ConsoleText>{apps.length} ứng dụng · {apps.filter(a => a.status === 'Active').length} đang hoạt động · {apps.filter(a => !!a.pendingVersion).length} đang xét duyệt</ConsoleText>
      {['Owner', 'Admin', 'Developer'].includes(profile.membershipRole ?? '') && <ConsoleButton label="Tạo Mini App" primary onPress={() => navigate('/developers/console/apps/new')} />}
      {!apps.length && !busy && <ConsoleText>Chưa có ứng dụng. Tạo bản nháp rồi xác minh domain, kiểm tra kỹ thuật và gửi xét duyệt.</ConsoleText>}
      {apps.map(app => <View key={app.id} style={{ gap: 8, paddingVertical: 12 }}>
        <ConsoleButton label={`${app.name} · ${app.publicationStatus ?? app.status}`} onPress={() => navigate(`/developers/console/apps/${app.id}`)} />
        {mode === 'credentials' && <ConsoleText>Client ID: {app.clientId}{'\n'}Callback: {(app.callbackUrls ?? []).join(', ')}{'\n'}Secret được tạo hoặc xoay trong màn quản lý ứng dụng; chỉ lưu tại backend đối tác.</ConsoleText>}
        {mode === 'analytics' && stats[app.id] && <><ConsoleText>{stats[app.id].successfulLaunches} lượt mở thành công · {stats[app.id].failedLaunches} thất bại · {stats[app.id].uniqueUsers} người dùng duy nhất</ConsoleText>{stats[app.id].daily.map(day => <ConsoleText key={day.date}>{day.date}: {day.launches} lượt mở, {day.failures} lỗi</ConsoleText>)}</>}
      </View>)}
      {mode === 'overview' && profile.membershipRole === 'Owner' && <>
        <ConsoleText>Thành viên tổ chức</ConsoleText><Field label="Mật khẩu xác nhận thao tác thành viên" secret value={password} onChange={setPassword} />
        {team.map(member => <View key={member.id} style={{ gap: 8 }}><ConsoleText>{member.accountId} · {member.role}</ConsoleText>{member.role !== 'Owner' && <><ConsoleButton disabled={busy || !password} label={`Đổi thành ${role}`} onPress={() => void action(async () => { const proof = await developerApi.reauth(password, 'ManageTeam'); await developerApi.role(member.id, role, proof.proof); })} /><ConsoleButton disabled={busy || !password} label="Xóa thành viên" onPress={() => void action(async () => { const proof = await developerApi.reauth(password, 'ManageTeam'); await developerApi.removeMember(member.id, proof.proof); })} /></>}</View>)}
        <Field label="Account ID thành viên" value={accountId} onChange={setAccountId} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Admin', 'Developer', 'Analyst'].map(value => <ConsoleButton key={value} label={value} primary={role === value} onPress={() => setRole(value)} />)}</View>
        <ConsoleButton disabled={busy || !password || !accountId} label="Thêm thành viên" onPress={() => void action(async () => { const proof = await developerApi.reauth(password, 'ManageTeam'); await developerApi.addMember(accountId.trim(), role, proof.proof); setAccountId(''); })} />
      </>}
    </> : profile && <><ConsoleText>Hồ sơ cần được duyệt trước khi quản lý ứng dụng.</ConsoleText><ConsoleButton label="Mở hồ sơ Developer" onPress={() => navigate('/developers/register')} /></>}
  </ConsoleShell>;
}
