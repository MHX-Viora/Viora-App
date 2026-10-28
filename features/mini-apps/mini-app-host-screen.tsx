import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { miniAppCatalog } from '@/services/mini-app.service';
import { miniAppCatalogCache } from './lib/catalog-cache';
import { MiniAppHostController, miniAppsEnabled } from './lib/host-controller';
import MiniAppHost from './adapters/host';
import { spacing, useTheme } from '@/theme';

const statuses: Record<string, string> = {
  starting: 'Đang xác minh Mini App…', 'launch.granted': 'Đang mở phiên Mini App…',
  'host.running': 'Đang tải website. Chưa xác nhận kết nối SDK.',
  'website.loaded': 'Website đã tải. Chưa xác nhận kết nối SDK.',
  'bridge.connected': 'Đã kết nối SDK · Production',
  'bridge.disconnected': 'Trang đang tải lại. Chờ xác nhận kết nối SDK.',
  'bridge.unavailable': 'Chưa xác nhận kết nối SDK. Website có thể chặn nhúng hoặc chưa tích hợp SDK.',
  'host.paused': 'Đã tạm dừng Mini App.', 'host.resumed': 'Đã xác minh lại phiên Mini App.',
  'launch.failed': 'Không thể mở Mini App. Kiểm tra kết nối rồi thử lại.',
  'host.error': 'Không thể xác minh phiên Mini App. Vui lòng mở lại.',
  'host.closed': 'Đã đóng Mini App.', 'host.close_unconfirmed': 'Đã dừng hiển thị. Phiên sẽ tự hết hạn nếu chưa xác nhận đóng.',
};
export function MiniAppHostScreen({ appId }: { appId: string }) {
  const { theme } = useTheme(), colors = theme.colors;
  const [controller] = useState(() => new MiniAppHostController(appId, miniAppCatalog, id => miniAppCatalogCache.invalidate(id)));
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const [logoFailed, setLogoFailed] = useState(false);
  const closeControl = useRef<View>(null);
  const supported = miniAppsEnabled && (Platform.OS === 'web' ||
    (['android', 'ios'].includes(Platform.OS) && process.env.EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED === 'true'));
  useEffect(() => { if (Platform.OS === 'web') closeControl.current?.focus(); }, []);
  useFocusEffect(useCallback(() => {
    if (supported) void controller.open();
    return controller.close;
  }, [controller, supported]));
  const close = () => { controller.close(); if (router.canGoBack()) router.back(); else router.replace('/(tabs)/utilities'); };
  const iconButton = (label: string, icon: 'arrow-back' | 'headset-outline', action: () => void, ref?: Ref<View>) => <Pressable
    accessibilityRole="button" accessibilityLabel={label} ref={ref} hitSlop={4} onPress={action}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
    <Ionicons name={icon} size={20} color={colors.text} />
  </Pressable>;
  const button = (label: string, action: () => void, disabled = false, ref?: Ref<View>) => <Pressable accessibilityRole="button" ref={ref}
    accessibilityState={{ disabled }} disabled={disabled} onPress={action}
    style={({ pressed }) => [styles.button, { backgroundColor: colors.primarySoft, opacity: disabled ? 0.5 : pressed ? 0.65 : 1 }]}>
    <Text style={{ color: colors.primary, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
    <View testID="mini-app-toolbar" style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
      {iconButton('Quay về ANKT', 'arrow-back', close, closeControl)}
      {state.detail?.app.logoUrl && !logoFailed ? <Image accessibilityIgnoresInvertColors source={{ uri: state.detail.app.logoUrl }}
        style={styles.logo} resizeMode="contain" onError={() => setLogoFailed(true)} /> : null}
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: colors.text }]}>{state.detail?.app.name ?? 'Mini App'}</Text>
      {iconButton('Hỗ trợ Mini App', 'headset-outline', () => router.push('/support'))}
    </View>
    {(!supported || state.phase !== 'running') && <View accessibilityLiveRegion="polite" style={styles.status}>
      <Text style={[styles.statusText, { color: colors.textMuted }]}>{supported ? statuses[state.status] ?? statuses.starting : 'Mini App chưa khả dụng trên thiết bị này.'}</Text>
      {supported && (state.phase === 'loading' || state.phase === 'idle') ? <ActivityIndicator accessibilityLabel="Đang mở Mini App" color={colors.primary} /> : null}
    </View>}
    {supported && state.phase === 'running' ? <View style={styles.content}>
      <MiniAppHost key={state.attempt} appId={appId} attempt={state.attempt} onStatus={controller.hostStatus} />
    </View> : null}
    {supported && (state.phase === 'failed' || state.phase === 'closed') ? <View style={styles.retry}>{button('Thử lại', () => { void controller.open(); })}</View> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { height: 40, flexShrink: 0, alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 4, borderBottomWidth: 1 },
  title: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontWeight: '600' }, logo: { width: 22, height: 22, borderRadius: 6 },
  iconButton: { width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  status: { paddingHorizontal: spacing.md, paddingVertical: 4, gap: 6, flexDirection: 'row', alignItems: 'center' },
  statusText: { flex: 1, fontSize: 11, lineHeight: 16 }, content: { flex: 1, minHeight: 320 }, retry: { padding: spacing.lg, alignItems: 'center' },
});
