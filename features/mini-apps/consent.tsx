import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import type { Permission } from './types';
export function RuntimeConsent({ permissions, onChoose }: { permissions: Permission[] | null; onChoose: (accepted: boolean) => void }) {
  const { theme } = useTheme(); const c = theme.colors;
  return <Modal visible={!!permissions} transparent animationType="fade" onRequestClose={() => onChoose(false)}>
    <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 }}><View accessibilityViewIsModal style={{ backgroundColor: c.card, borderRadius: 16, padding: 24, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>Ứng dụng yêu cầu quyền</Text>
      <ScrollView style={{ maxHeight: 300 }}>{permissions?.map(p => <View key={p.code} style={{ marginBottom: 12 }}><Text style={{ color: c.text, fontWeight: '600' }}>{p.name}{p.isSensitive ? ' · Quyền nhạy cảm' : ''}</Text><Text style={{ color: c.textMuted }}>{p.description}</Text></View>)}</ScrollView>
      <Pressable accessibilityRole="button" onPress={() => onChoose(true)} style={{ backgroundColor: c.primary, padding: 14, borderRadius: 10 }}><Text style={{ color: c.primaryContrast, textAlign: 'center' }}>Cho phép</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => onChoose(false)} style={{ padding: 14 }}><Text style={{ color: c.text, textAlign: 'center' }}>Từ chối</Text></Pressable>
    </View></View>
  </Modal>;
}

export function ExternalConsent({ url, onChoose }: { url: string; onChoose: (accepted: boolean) => void }) {
  const { theme } = useTheme(); const c = theme.colors;
  return url ? <View accessibilityViewIsModal style={{ backgroundColor: c.card, padding: 20, gap: 12 }}><Text style={{ color: c.text }}>Mở website bên ngoài: {new URL(url).hostname}?</Text><Pressable accessibilityRole="button" onPress={() => onChoose(true)} style={{ padding: 12 }}><Text style={{ color: c.primary }}>Mở trình duyệt</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onChoose(false)} style={{ padding: 12 }}><Text style={{ color: c.text }}>Hủy</Text></Pressable></View> : null;
}
