import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { miniAppsApi } from './api';
import { MiniAppRuntime } from './runtime';
import type { AppDetail, Launch } from './types';

export function MiniAppDetail({ id, favorite, onClose, onChanged }: { id: string; favorite: boolean; onClose: () => void; onChanged: () => void }) {
  const { theme } = useTheme(); const c = theme.colors; const [app, setApp] = useState<AppDetail>(); const [error, setError] = useState('');
  const [pinned, setPinned] = useState(favorite); const [busy, setBusy] = useState(false); const [launch, setLaunch] = useState<Launch>(); const [report, setReport] = useState<string>(); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setError(''); void miniAppsApi.detail(id).then(data => { if (active) setApp(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id, refresh]);
  useEffect(() => () => { if (launch) void miniAppsApi.close(id, launch).catch(() => {}); }, [id, launch]);
  const action = async (run: () => Promise<void>) => { setBusy(true); setError(''); try { await run(); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu.'); } finally { setBusy(false); } };
  const button = (label: string, run: () => void, primary = false) => <Pressable accessibilityRole="button" disabled={busy} onPress={run} style={{ backgroundColor: primary ? c.primary : c.secondaryBackground, borderRadius: 10, padding: 14 }}><Text style={{ color: primary ? c.primaryContrast : c.text, textAlign: 'center', fontWeight: '600' }}>{label}</Text></Pressable>;
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      {button('Đóng', onClose)}
      {!app && !error && <ActivityIndicator color={c.primary} />}
      {!!error && <><Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>{!app && button('Thử lại', () => setRefresh(n => n + 1))}</>}
      {app && <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>{app.iconUrl ? <Image source={{ uri: app.iconUrl }} style={{ width: 64, height: 64, borderRadius: 16 }} /> : <Ionicons name="apps-outline" color={c.primary} size={48} />}<View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: c.text, fontSize: 24, fontWeight: '700' }}>{app.name}</Text><Text style={{ color: c.textMuted }}>{app.developer} · {app.category ?? 'Tiện ích'}</Text></View></View>
        <Text style={{ color: c.text, lineHeight: 24 }}>{app.description || 'Developer chưa bổ sung mô tả.'}</Text>
        {app.coverUrl && <Image source={{ uri: app.coverUrl }} resizeMode="contain" style={{ width: '100%', height: 200, borderRadius: 12 }} />}
        <Text style={{ color: c.textMuted }}>Phiên bản {app.publishedVersion} · Website: {new URL(app.webUrl).hostname}</Text>
        {app.publishedAt && <Text style={{ color: c.textMuted }}>Phát hành {new Date(app.publishedAt).toLocaleDateString('vi-VN')}</Text>}
        {!!app.screenshots?.length && <ScrollView horizontal>{app.screenshots.map(url => <Image key={url} source={{ uri: url }} resizeMode="contain" style={{ width: 180, height: 280, marginRight: 12 }} />)}</ScrollView>}
        {app.privacyPolicyUrl && button('Chính sách bảo mật', () => { void Linking.openURL(app.privacyPolicyUrl!); })}
        {app.termsUrl && button('Điều khoản của đối tác', () => { void Linking.openURL(app.termsUrl!); })}
        {app.permissions.length > 0 && <View style={{ gap: 8 }}><Text style={{ color: c.text, fontWeight: '700' }}>Quyền ứng dụng có thể yêu cầu</Text>{app.permissions.map(p => <Text key={p.code} style={{ color: c.textMuted }}>{p.name}{p.isSensitive ? ' · Nhạy cảm' : ''}</Text>)}</View>}
        {button(busy ? 'Đang xử lý…' : 'Mở ứng dụng', () => void action(async () => { setLaunch(await miniAppsApi.launch(id)); onChanged(); }), true)}
        {button(pinned ? 'Bỏ ghim' : 'Ghim vào yêu thích', () => void action(async () => { await miniAppsApi.favorite(id, !pinned); setPinned(!pinned); onChanged(); }))}
        {button('Báo cáo ứng dụng', () => setReport(''))}
        {report !== undefined && <View style={{ gap: 12 }}><TextInput accessibilityLabel="Nội dung báo cáo" multiline maxLength={1000} value={report} onChangeText={setReport} placeholder="Mô tả vấn đề bạn gặp" placeholderTextColor={c.placeholder} style={{ color: c.text, backgroundColor: c.input, padding: 12, minHeight: 90, borderRadius: 10 }} />{button('Gửi báo cáo', () => void action(async () => { if (report.trim().length < 10) throw new Error('Vui lòng mô tả vấn đề ít nhất 10 ký tự.'); await miniAppsApi.report(id, report.trim()); setReport(undefined); }))}</View>}
      </>}
    </ScrollView>
    {app && launch && <MiniAppRuntime app={app} launch={launch} onClose={() => setLaunch(undefined)} />}
  </SafeAreaView></Modal>;
}
