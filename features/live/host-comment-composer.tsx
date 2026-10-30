import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAppToast } from '@/components/common/app-toast';
import { liveCommentErrorMessage } from '@/services/live-realtime.service';
import { BASIC_EMOJIS } from './live-basic-emojis';
import { hostColors } from './live-host-ui';

export function HostCommentComposer({ enabled, compact, onSend, style, draft, onDraftChange: setDraft }: {
  enabled: boolean; compact: boolean; onSend(text: string): Promise<unknown>; style?: StyleProp<ViewStyle>;
  draft: string; onDraftChange: Dispatch<SetStateAction<string>>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const insets = useSafeAreaInsets();
  useEffect(() => { if (!enabled) setOpen(false); }, [enabled]);
  const send = async () => {
    const text = draft.trim();
    if (!enabled || !text || sending.current) return;
    sending.current = true; setPending(true);
    try { await onSend(text); setDraft(value => value === draft ? '' : value); setOpen(false); }
    catch (error) { showAppToast({ title: 'Không gửi được bình luận', message: liveCommentErrorMessage(error), type: 'error' }); }
    finally { sending.current = false; setPending(false); }
  };
  const picker = <View accessibilityLabel="Bộ emoji cơ bản" style={[styles.picker, compact && { paddingBottom: Math.max(insets.bottom, 12) }]}>
    <View style={styles.heading}><Text style={styles.title}>Emoji cơ bản</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng emoji" onPress={() => setOpen(false)} style={styles.action}><Ionicons color={hostColors.text} name="close" size={22} /></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}><View style={styles.grid}>{BASIC_EMOJIS.map(emoji => <Pressable accessibilityRole="button" accessibilityLabel={`Thêm ${emoji} vào bình luận`} disabled={!enabled || pending} key={emoji} onPress={() => setDraft(value => value + emoji)} style={({ pressed }) => [styles.emoji, pressed && styles.pressed]}><Text style={styles.emojiText}>{emoji}</Text></Pressable>)}</View></ScrollView>
  </View>;
  return <>
    <View style={styles.container}>
    <View style={style}>
      <TextInput accessibilityLabel="Bình luận với tư cách chủ Live" editable={enabled && !pending} onChangeText={setDraft} onSubmitEditing={() => void send()} placeholder={enabled ? 'Nhập bình luận...' : 'Bình luận đang tắt'} placeholderTextColor={hostColors.muted} style={styles.input} value={draft} />
      <Pressable accessibilityRole="button" accessibilityLabel="Mở emoji" accessibilityState={{ expanded: open, disabled: !enabled || pending }} disabled={!enabled || pending} onPress={() => { Keyboard.dismiss(); setOpen(value => !value); }} style={styles.action}><Ionicons color={open ? hostColors.cyan : hostColors.muted} name="happy-outline" size={22} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Gửi bình luận" disabled={!enabled || !draft.trim() || pending} onPress={() => void send()} style={styles.action}><Ionicons color={enabled && draft.trim() && !pending ? hostColors.cyan : hostColors.muted} name="send" size={20} /></Pressable>
    </View>
    {!compact && open ? <View style={styles.popover}>{picker}</View> : null}
    </View>
    {compact ? <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}><View style={styles.modal}><Pressable accessibilityRole="button" accessibilityLabel="Đóng bảng emoji" onPress={() => setOpen(false)} style={styles.backdrop} />{picker}</View></Modal> : null}
  </>;
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  popover: { position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 30 },
  input: { color: hostColors.text, flex: 1, minWidth: 0, fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 },
  action: { alignItems: 'center', justifyContent: 'center', width: 40, minHeight: 44 },
  picker: { backgroundColor: hostColors.surface, borderTopColor: hostColors.border, borderTopWidth: 1, padding: 8 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: hostColors.text, fontSize: 14, fontWeight: '800' },
  scroll: { maxHeight: 264 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  emoji: { alignItems: 'center', justifyContent: 'center', height: 44, width: 44, borderRadius: 8 },
  emojiText: { fontSize: 26, lineHeight: 34 },
  pressed: { backgroundColor: 'rgba(255,255,255,.12)' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.52)' },
});
