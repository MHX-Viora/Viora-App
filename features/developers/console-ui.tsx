import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
export function ConsoleShell({ title, children, error, busy }: { title: string; children: ReactNode; error?: string; busy?: boolean }) {
  const { theme } = useTheme(); const c = theme.colors;
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16, width: '100%', maxWidth: 920, alignSelf: 'center' }}>
    <ScrollView horizontal><View style={{ flexDirection: 'row', gap: 16 }}>{[['/developers', 'Hướng dẫn'], ['/developers/register', 'Hồ sơ'], ['/developers/console', 'Tổng quan'], ['/developers/console/apps', 'Ứng dụng'], ['/developers/console/credentials', 'Tích hợp'], ['/developers/console/analytics', 'Thống kê']].map(([path, text]) => <Pressable key={path} accessibilityRole="link" onPress={() => router.push(path as Href)} style={{ paddingVertical: 12 }}><Text style={{ color: c.primary }}>{text}</Text></Pressable>)}</View></ScrollView>
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: 26, fontWeight: '700' }}>{title}</Text>
    {busy && <Text accessibilityRole="text" style={{ color: c.textMuted }}>Đang xử lý…</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text>}
    {children}
  </ScrollView></SafeAreaView>;
}
export function Field({ label, value, onChange, secret = false, multiline = false, editable = true }: { label: string; value: string; onChange: (value: string) => void; secret?: boolean; multiline?: boolean; editable?: boolean }) {
  const { theme } = useTheme(); const c = theme.colors;
  return <View style={{ gap: 6 }}><Text style={{ color: c.text, fontWeight: '600' }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={editable} autoCapitalize="none" autoCorrect={false} secureTextEntry={secret} multiline={multiline} style={{ color: c.text, backgroundColor: c.input, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: multiline ? 96 : 46 }} /></View>;
}
export function ConsoleButton({ label, onPress, disabled = false, primary = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  const { theme } = useTheme(); const c = theme.colors;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ padding: 14, borderRadius: 10, backgroundColor: primary ? c.primary : c.secondaryBackground, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: primary ? c.primaryContrast : c.text, textAlign: 'center', fontWeight: '600' }}>{label}</Text></Pressable>;
}
export function ConsoleText({ children }: { children: ReactNode }) { const { theme } = useTheme(); return <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 22 }}>{children}</Text>; }
