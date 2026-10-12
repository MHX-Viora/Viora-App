import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { miniAppsApi, platformRequest } from '../mini-apps/api';
import type { Category, Permission } from '../mini-apps/types';
import { AppForm, blankApp } from './app-form';
import { ConsoleButton, ConsoleShell, ConsoleText, Field } from './console-ui';
import { developerApi } from './platform-api';
import type { AppVersion, HybridApp, HybridConfig, VerifiedDomain } from './mini-app';
import type { TechnicalTest } from './developer-platform';

export default function DeveloperAppScreen() {
  const params = useLocalSearchParams<{ id: string }>(); const id = typeof params.id === 'string' ? params.id : ''; const isNew = id === 'new';
  const [app, setApp] = useState<HybridApp>(); const [form, setForm] = useState<HybridConfig>(blankApp); const [categories, setCategories] = useState<Category[]>([]); const [permissions, setPermissions] = useState<Permission[]>([]);
  const [domains, setDomains] = useState<VerifiedDomain[]>([]); const [versions, setVersions] = useState<AppVersion[]>([]); const [host, setHost] = useState(''); const [password, setPassword] = useState('');
  const [secret, setSecret] = useState(''); const [createdId, setCreatedId] = useState(''); const [test, setTest] = useState<TechnicalTest>(); const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setBusy(true); setError('');
    void (async () => {
      const [c, p] = await Promise.all([miniAppsApi.categories(), platformRequest<Permission[]>('/api/developer/mini-apps/permissions')]); if (!active) return; setCategories(c); setPermissions(p);
      if (!isNew) {
        const [a, d, v] = await Promise.all([developerApi.app(id), developerApi.domains(id), developerApi.versions(id)]); if (!active) return;
        setApp(a); setDomains(d); setVersions(v);
        setForm({ ...blankApp, ...a, permissions: a.permissions.map(permission => permission.code), allowedOrigins: a.allowedOrigins ?? [], callbackUrls: a.callbackUrls ?? [], authenticationMode: a.authenticationMode ?? 'Independent', clientAuthenticationMethod: a.clientAuthenticationMethod ?? 'None', version: a.publishedVersion ?? 0 });
      }
    })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; };
  }, [id, isNew, refresh]);
  const action = async (fn: () => Promise<void>, reload = true) => { setBusy(true); setError(''); try { await fn(); if (reload) setRefresh(n => n + 1); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu.'); } finally { setPassword(''); setBusy(false); } };
  const proof = async (operation: string) => (await developerApi.reauth(password, operation, id)).proof;
  const save = async () => {
    const clean = { ...form, allowedDomains: form.allowedDomains.map(x => x.trim()).filter(Boolean), allowedOrigins: form.allowedOrigins.map(x => x.trim()).filter(Boolean), callbackUrls: form.callbackUrls.map(x => x.trim()).filter(Boolean) };
    if (isNew) { const created = await developerApi.create(clean); if (clean.clientAuthenticationMethod !== 'None' && created.clientSecret) { setSecret(created.clientSecret); setCreatedId(created.id); } else router.replace(`/developers/console/apps/${created.id}` as Href); }
    else {
      const domainChanged = !!app && (app.webUrl !== form.webUrl || JSON.stringify(app.allowedDomains) !== JSON.stringify(clean.allowedDomains) || JSON.stringify(app.callbackUrls) !== JSON.stringify(clean.callbackUrls) || JSON.stringify(app.allowedOrigins) !== JSON.stringify(clean.allowedOrigins));
      await developerApi.update(id, clean, domainChanged ? await proof('ChangeDomain') : undefined);
    }
  };
  return <ConsoleShell title={isNew ? 'Tạo Mini App' : app?.name ?? 'Quản lý Mini App'} error={error} busy={busy}>
    {app && <ConsoleText>{app.reviewState} · {app.publicationStatus} · Phiên bản đang chạy: {app.publishedVersion}{'\n'}Client ID: {app.clientId}</ConsoleText>}
    <AppForm value={form} onChange={setForm} categories={categories} permissions={permissions} disabled={busy || !!createdId || !!app?.pendingVersion} />
    {!isNew && <Field label="Mật khẩu xác nhận đổi domain / xoay secret" value={password} onChange={setPassword} secret />}
    <ConsoleButton label="Lưu bản nháp" primary disabled={busy || !!createdId || !!app?.pendingVersion} onPress={() => void action(save, !isNew)} />
    {secret && <View style={{ gap: 8 }}><ConsoleText>Secret mới (chỉ hiển thị lần này). Lưu vào biến môi trường backend đối tác:{'\n'}{secret}</ConsoleText><ConsoleButton label="Đã lưu secret, ẩn khỏi màn hình" onPress={() => { setSecret(''); if (createdId) router.replace(`/developers/console/apps/${createdId}` as Href); }} /></View>}
    {!isNew && <>
      <ConsoleText>Xác minh domain</ConsoleText>
      {domains.map(domain => <View key={domain.id} style={{ gap: 8 }}><ConsoleText>{domain.host} · {domain.verifiedAt ? 'Đã xác minh' : 'Chưa xác minh'}{'\n'}Đặt file HTTPS tại /ankt-mini-app-verification.txt với nội dung:{'\n'}{domain.challengeToken}</ConsoleText><ConsoleButton label="Kiểm tra domain" disabled={busy} onPress={() => void action(async () => { await developerApi.verifyDomain(id, domain.id); })} /></View>)}
      <Field label="Host cần xác minh" value={host} onChange={setHost} /><ConsoleButton label="Thêm domain xác minh" disabled={busy || !host || !password} onPress={() => void action(async () => { await developerApi.addDomain(id, host.trim(), await proof('ChangeDomain')); setHost(''); })} />
      <ConsoleButton label="Chạy kiểm tra kỹ thuật" disabled={busy} onPress={() => void action(async () => setTest(await developerApi.test(id)), false)} />
      {test?.checks.map(check => <ConsoleText key={check.code}>{check.passed ? '✓' : '✗'} {check.message}</ConsoleText>)}
      <ConsoleButton label="Gửi phiên bản xét duyệt" disabled={busy || !!app?.pendingVersion} onPress={() => void action(async () => { await developerApi.submit(id); })} />
      {versions.map(version => <View key={version.id} style={{ gap: 8 }}><ConsoleText>Phiên bản {version.version} · {version.reviewState ?? version.status} · {version.reason}</ConsoleText>{version.reviewState === 'Approved' && version.version !== app?.publishedVersion && <ConsoleButton label={`Phát hành phiên bản ${version.version}`} disabled={busy} onPress={() => void action(async () => { await developerApi.publish(id, version.version); })} />}</View>)}
      {app?.status === 'Active' && <ConsoleButton label="Ngừng phát hành" disabled={busy} onPress={() => void action(async () => { await developerApi.unpublish(id); })} />}
      {form.clientAuthenticationMethod !== 'None' && <ConsoleButton label="Xoay secret (vô hiệu secret cũ)" disabled={busy || !password} onPress={() => void action(async () => { const result = await developerApi.rotate(id, await proof('RotateSecret')); setSecret(result.clientSecret ?? ''); }, false)} />}
    </>}
  </ConsoleShell>;
}
