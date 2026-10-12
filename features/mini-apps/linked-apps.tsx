import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { platformRequest } from './api';
type LinkedApp = { id: string; name: string; status: string; available: boolean; permissions: string[] };
export function LinkedApps({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme(); const c = theme.colors; const [items, setItems] = useState<LinkedApp[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(true); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setBusy(true); void platformRequest<{ items: LinkedApp[] }>('/api/mini-apps/linked').then(data => { if (active) setItems(data.items); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [refresh]);
  const revoke = async (id: string) => { setBusy(true); setError(''); try { await platformRequest(`/api/mini-apps/${id}/consent`, 'DELETE'); setRefresh(n => n + 1); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể thu hồi quyền.'); setBusy(false); } };
  return <Modal visible animationType="slide" onRequestClose={onClose}><View style={{ flex: 1, backgroundColor: c.background, padding: 24, gap: 16 }}><Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>Ứng dụng đã kết nối</Text><Pressable accessibilityRole="button" onPress={onClose}><Text style={{ color: c.primary }}>Đóng</Text></Pressable>
    {busy && <Text style={{ color: c.textMuted }}>Đang tải…</Text>}{!!error && <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>}
    <ScrollView>{!busy && !items.length && <Text style={{ color: c.textMuted }}>Bạn chưa cấp quyền cho ứng dụng nào.</Text>}{items.map(app => <View key={app.id} style={{ paddingVertical: 16, gap: 10 }}><Text style={{ color: c.text, fontWeight: '700' }}>{app.name} · {app.available ? 'Hoạt động' : app.status}</Text><Text style={{ color: c.textMuted }}>{app.permissions.join(', ')}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void revoke(app.id)} style={{ padding: 12, backgroundColor: c.dangerSoft, borderRadius: 10 }}><Text style={{ color: c.danger }}>Thu hồi toàn bộ quyền</Text></Pressable></View>)}</ScrollView>
  </View></Modal>;
}
